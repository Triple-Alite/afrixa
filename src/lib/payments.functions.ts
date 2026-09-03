import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const providerSchema = z.enum(["paystack", "flutterwave"]);

function originFrom(request: Request) {
  const header = request.headers.get("origin");
  if (header) return header;
  return new URL(request.url).origin;
}

export type WalletSummary = { balance: number; currency: string };

/** Current escrow wallet balance for the signed-in user. */
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletSummary> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    return { balance: Number(data?.wallet_balance ?? 0), currency: "NGN" };
  });

/**
 * Starts a hosted checkout at the chosen gateway to top up the wallet.
 * Returns the URL the browser must open; the webhook credits the balance.
 */
export const startWalletTopUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider: providerSchema,
        amount: z.number().positive().max(50_000_000),
        currency: z.string().trim().min(3).max(4).default("NGN"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { initializeCheckout, newReference } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Your account has no email address for checkout");

    const reference = newReference("top");
    const callbackUrl = `${originFrom(getRequest())}/payment-callback?provider=${data.provider}&reference=${reference}`;

    const authorizationUrl = await initializeCheckout({
      provider: data.provider,
      reference,
      amount: data.amount,
      currency: data.currency,
      email,
      callbackUrl,
      description: "Afrixa wallet top-up",
    });

    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      provider: data.provider,
      reference,
      purpose: "topup",
      amount: data.amount,
      currency: data.currency,
      status: "pending",
      authorization_url: authorizationUrl,
    });
    if (error) throw new Error(error.message);

    return { authorizationUrl, reference };
  });

/**
 * Client hires a talent. `card` opens gateway checkout; `wallet` funds the
 * escrow immediately from the existing balance.
 */
export const fundHire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        proposalId: z.string().uuid(),
        method: z.enum(["card", "wallet"]),
        provider: providerSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("id,talent_id,opportunity_id,bid_amount,currency,status,escrow_id")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.escrow_id) throw new Error("This proposal is already funded");

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id,title,client_id,currency,budget_max,budget_min,price_from")
      .eq("id", proposal.opportunity_id)
      .maybeSingle();
    if (!opportunity || opportunity.client_id !== userId) throw new Error("Forbidden");

    const amount =
      Number(proposal.bid_amount ?? 0) ||
      Number(opportunity.budget_max ?? opportunity.budget_min ?? opportunity.price_from ?? 0);
    if (!amount) throw new Error("This hire has no amount to fund");
    const currency = proposal.currency || opportunity.currency || "NGN";

    if (data.method === "wallet") {
      const { debitWallet, fundEscrowForProposal } = await import("./payments.server");
      await debitWallet(userId, amount);
      const escrowId = await fundEscrowForProposal({
        proposalId: proposal.id,
        clientId: userId,
        amount,
        currency,
        fundingSource: "wallet",
      });
      return { method: "wallet" as const, escrowId, amount, currency };
    }

    const provider = data.provider;
    if (!provider) throw new Error("Choose a payment gateway");

    const { initializeCheckout, newReference } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("Your account has no email address for checkout");

    const reference = newReference("esc");
    const callbackUrl = `${originFrom(getRequest())}/payment-callback?provider=${provider}&reference=${reference}`;

    const authorizationUrl = await initializeCheckout({
      provider,
      reference,
      amount,
      currency,
      email,
      callbackUrl,
      description: `Escrow for ${opportunity.title}`,
    });

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      provider,
      reference,
      purpose: "escrow",
      amount,
      currency,
      status: "pending",
      proposal_id: proposal.id,
      authorization_url: authorizationUrl,
    });
    if (insertError) throw new Error(insertError.message);

    return { method: "card" as const, authorizationUrl, reference, amount, currency };
  });

/**
 * Called when the gateway redirects the buyer back. Confirms with the gateway
 * and settles the payment; webhooks do the same work so this is idempotent.
 */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(6).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id,user_id,purpose,amount,currency")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!payment || payment.user_id !== context.userId) throw new Error("Payment not found");

    const { settlePayment } = await import("./payments.server");
    const result = await settlePayment(data.reference);
    return {
      status: result.status,
      purpose: payment.purpose,
      amount: Number(payment.amount),
      currency: payment.currency,
      ...(result.escrowId ? { escrowId: result.escrowId } : {}),
    };
  });
