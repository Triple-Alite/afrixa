/**
 * Server-only payment gateway helpers for Paystack and Flutterwave.
 * Never import this from client-reachable modules; load it inside handlers.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type Provider = "paystack" | "flutterwave";

/** Gateways charge in the smallest unit (kobo/cents) for Paystack. */
const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

export function providerLabel(provider: Provider) {
  return provider === "paystack" ? "Paystack" : "Flutterwave";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured. Add the gateway key in project secrets.`);
  return value;
}

export function newReference(prefix: string) {
  return `afx_${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

async function readError(response: Response, provider: Provider) {
  const body = await response.text();
  console.error(`[${provider}] request failed [${response.status}]: ${body}`);
  return new Error(`${providerLabel(provider)} request failed [${response.status}]: ${body}`);
}

/** Creates a hosted checkout session and returns the URL the client must open. */
export async function initializeCheckout(input: {
  provider: Provider;
  reference: string;
  amount: number;
  currency: string;
  email: string;
  callbackUrl: string;
  description: string;
}): Promise<string> {
  const { provider, reference, amount, currency, email, callbackUrl, description } = input;

  if (provider === "paystack") {
    const multiplier = ZERO_DECIMAL.has(currency) ? 1 : 100;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * multiplier),
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: { description },
      }),
    });
    if (!response.ok) throw await readError(response, provider);
    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!payload.status || !payload.data?.authorization_url) {
      throw new Error(`Paystack could not start the payment: ${payload.message ?? "unknown error"}`);
    }
    return payload.data.authorization_url;
  }

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency,
      redirect_url: callbackUrl,
      customer: { email },
      customizations: { title: "Afrixa escrow", description },
    }),
  });
  if (!response.ok) throw await readError(response, provider);
  const payload = (await response.json()) as { status?: string; message?: string; data?: { link?: string } };
  if (payload.status !== "success" || !payload.data?.link) {
    throw new Error(`Flutterwave could not start the payment: ${payload.message ?? "unknown error"}`);
  }
  return payload.data.link;
}

export type VerifiedPayment = {
  reference: string;
  status: "success" | "failed" | "pending";
  amount: number;
  currency: string;
};

/** Server-side confirmation with the gateway — the only trusted source of payment status. */
export async function verifyPayment(provider: Provider, reference: string): Promise<VerifiedPayment> {
  if (provider === "paystack") {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${requireEnv("PAYSTACK_SECRET_KEY")}` },
    });
    if (!response.ok) throw await readError(response, provider);
    const payload = (await response.json()) as {
      data?: { status?: string; amount?: number; currency?: string; reference?: string };
    };
    const currency = payload.data?.currency ?? "NGN";
    const divisor = ZERO_DECIMAL.has(currency) ? 1 : 100;
    return {
      reference: payload.data?.reference ?? reference,
      status:
        payload.data?.status === "success" ? "success" : payload.data?.status === "failed" ? "failed" : "pending",
      amount: Number(payload.data?.amount ?? 0) / divisor,
      currency,
    };
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${requireEnv("FLUTTERWAVE_SECRET_KEY")}` } },
  );
  if (!response.ok) throw await readError(response, provider);
  const payload = (await response.json()) as {
    data?: { status?: string; amount?: number; currency?: string; tx_ref?: string };
  };
  const status = payload.data?.status;
  return {
    reference: payload.data?.tx_ref ?? reference,
    status: status === "successful" ? "success" : status === "failed" ? "failed" : "pending",
    amount: Number(payload.data?.amount ?? 0),
    currency: payload.data?.currency ?? "NGN",
  };
}

type PaymentRow = {
  id: string;
  user_id: string;
  purpose: string;
  status: string;
  amount: number;
  currency: string;
  proposal_id: string | null;
  provider: string;
};

/**
 * Idempotently settles a payment: tops up a wallet, or funds the escrow for a
 * hire. Safe to call from both the webhook and the browser callback.
 */
export async function settlePayment(reference: string): Promise<{ status: string; escrowId?: string }> {
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id,user_id,purpose,status,amount,currency,proposal_id,provider")
    .eq("reference", reference)
    .maybeSingle<PaymentRow>();
  if (!payment) throw new Error("Unknown payment reference");
  if (payment.status === "paid") return { status: "paid" };

  const verified = await verifyPayment(payment.provider as Provider, reference);
  if (verified.status !== "success") {
    if (verified.status === "failed") {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    }
    return { status: verified.status };
  }

  if (payment.purpose === "topup") {
    await creditWallet(payment.user_id, verified.amount);
    await supabaseAdmin.from("transactions").insert({
      user_id: payment.user_id,
      type: "credit",
      amount: verified.amount,
      currency: verified.currency,
      description: "Wallet top-up",
    });
    await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", payment.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: payment.user_id,
      type: "payment",
      title: "Wallet topped up",
      body: `${verified.currency} ${verified.amount.toLocaleString()} added to your balance`,
      link: "/wallet",
    });
    return { status: "paid" };
  }

  if (!payment.proposal_id) throw new Error("Payment is not linked to a hire");
  const escrowId = await fundEscrowForProposal({
    proposalId: payment.proposal_id,
    clientId: payment.user_id,
    amount: verified.amount,
    currency: verified.currency,
    fundingSource: "card",
    paymentId: payment.id,
  });
  await supabaseAdmin.from("payments").update({ status: "paid", escrow_id: escrowId }).eq("id", payment.id);
  return { status: "paid", escrowId };
}

export async function creditWallet(userId: string, amount: number) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .maybeSingle();
  await supabaseAdmin
    .from("profiles")
    .update({ wallet_balance: Number(profile?.wallet_balance ?? 0) + amount })
    .eq("id", userId);
}

export async function debitWallet(userId: string, amount: number) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .maybeSingle();
  const balance = Number(profile?.wallet_balance ?? 0);
  if (balance < amount) throw new Error("Insufficient wallet balance");
  await supabaseAdmin
    .from("profiles")
    .update({ wallet_balance: balance - amount })
    .eq("id", userId);
}

/** Creates the funded escrow, accepts the proposal and declines the rest. */
export async function fundEscrowForProposal(input: {
  proposalId: string;
  clientId: string;
  amount: number;
  currency: string;
  fundingSource: "card" | "wallet";
  paymentId?: string;
}): Promise<string> {
  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("id,talent_id,opportunity_id,escrow_id,status")
    .eq("id", input.proposalId)
    .maybeSingle();
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.escrow_id) return proposal.escrow_id;

  const { data: opportunity } = await supabaseAdmin
    .from("opportunities")
    .select("id,title,company,client_id")
    .eq("id", proposal.opportunity_id)
    .maybeSingle();
  if (!opportunity || opportunity.client_id !== input.clientId) throw new Error("Forbidden");

  const now = new Date().toISOString();
  const { data: escrow, error } = await supabaseAdmin
    .from("escrows")
    .insert({
      opportunity_id: opportunity.id,
      proposal_id: proposal.id,
      client_id: input.clientId,
      talent_id: proposal.talent_id,
      title: opportunity.title,
      company: opportunity.company,
      amount: input.amount,
      currency: input.currency,
      status: "funded",
      funded_at: now,
      funding_source: input.fundingSource,
      payment_id: input.paymentId ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("proposals").update({ status: "accepted", escrow_id: escrow.id }).eq("id", proposal.id);
  await supabaseAdmin.from("opportunities").update({ status: "in_progress" }).eq("id", opportunity.id);
  await supabaseAdmin
    .from("proposals")
    .update({ status: "declined" })
    .eq("opportunity_id", opportunity.id)
    .neq("id", proposal.id)
    .eq("status", "submitted");

  await supabaseAdmin.from("transactions").insert({
    user_id: input.clientId,
    type: "debit",
    amount: input.amount,
    currency: input.currency,
    description: `Escrow funded — ${opportunity.title}`,
  });

  await supabaseAdmin.from("notifications").insert([
    {
      user_id: proposal.talent_id,
      type: "hired",
      title: "You have been hired",
      body: `${opportunity.title} — payment is held in escrow`,
      link: "/wallet",
    },
    {
      user_id: input.clientId,
      type: "payment",
      title: "Escrow funded",
      body: `${input.currency} ${input.amount.toLocaleString()} — ${opportunity.title}`,
      link: "/wallet",
    },
  ]);

  return escrow.id;
}
