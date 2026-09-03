import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClientProposal = {
  id: string;
  status: string;
  cover_letter: string;
  bid_amount: number | null;
  currency: string;
  delivery_days: number | null;
  created_at: string;
  escrow_id: string | null;
  opportunity_id: string;
  opportunity_title: string;
  talent_id: string;
  talent_name: string;
  talent_headline: string | null;
  talent_country: string | null;
};

/** Proposals submitted to the signed-in client's own postings. */
export const listClientProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientProposal[]> => {
    const { supabase, userId } = context;

    const { data: opportunities, error: oppError } = await supabase
      .from("opportunities")
      .select("id,title")
      .eq("client_id", userId);
    if (oppError) throw new Error(oppError.message);
    if (!opportunities?.length) return [];

    const titles = new Map(opportunities.map((o) => [o.id, o.title]));

    const { data: proposals, error } = await supabase
      .from("proposals")
      .select("id,status,cover_letter,bid_amount,currency,delivery_days,created_at,escrow_id,opportunity_id,talent_id")
      .in("opportunity_id", [...titles.keys()])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!proposals?.length) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: talents } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,headline,country")
      .in("id", [...new Set(proposals.map((p) => p.talent_id))]);
    const talentMap = new Map((talents ?? []).map((t) => [t.id, t]));

    return proposals.map((p) => {
      const talent = talentMap.get(p.talent_id);
      return {
        ...p,
        opportunity_title: titles.get(p.opportunity_id) ?? "Opportunity",
        talent_name: talent?.full_name || "Afrixa talent",
        talent_headline: talent?.headline ?? null,
        talent_country: talent?.country ?? null,
      };
    });
  });

// Hiring is funded through a real payment gateway — see `fundHire` in
// src/lib/payments.functions.ts. Escrows are never created without a
// confirmed payment or a wallet debit.

/** Client declines a proposal. */
export const declineProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ proposalId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("proposals")
      .update({ status: "declined" })
      .eq("id", data.proposalId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Escrow lifecycle: talent starts and delivers, client releases. */
export const advanceEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ escrowId: z.string().uuid(), action: z.enum(["start", "deliver", "release"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: escrow, error } = await supabase
      .from("escrows")
      .select("id,status,amount,currency,title,client_id,talent_id,opportunity_id")
      .eq("id", data.escrowId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!escrow) throw new Error("Escrow not found");

    const isTalent = escrow.talent_id === userId;
    const isClient = escrow.client_id === userId;
    if (!isTalent && !isClient) throw new Error("Forbidden");

    const now = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "start") {
      if (!isTalent) throw new Error("Only the talent can start work");
      if (escrow.status !== "funded") throw new Error("Escrow is not ready to start");
      await supabaseAdmin.from("escrows").update({ status: "in_progress", started_at: now }).eq("id", escrow.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: escrow.client_id!,
        type: "escrow",
        title: "Work started",
        body: escrow.title,
        link: "/wallet",
      });
      return { status: "in_progress" };
    }

    if (data.action === "deliver") {
      if (!isTalent) throw new Error("Only the talent can deliver");
      if (!["funded", "in_progress"].includes(escrow.status)) throw new Error("Escrow cannot be delivered");
      await supabaseAdmin.from("escrows").update({ status: "delivered", delivered_at: now }).eq("id", escrow.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: escrow.client_id!,
        type: "escrow",
        title: "Work delivered — review and release",
        body: escrow.title,
        link: "/wallet",
      });
      return { status: "delivered" };
    }

    if (!isClient) throw new Error("Only the client can release funds");
    if (escrow.status === "released") throw new Error("Escrow already released");
    if (escrow.status !== "delivered") throw new Error("Release is available after delivery");

    const amount = Number(escrow.amount);
    await supabaseAdmin.from("escrows").update({ status: "released", released_at: now }).eq("id", escrow.id);
    if (escrow.opportunity_id) {
      await supabaseAdmin
        .from("opportunities")
        .update({ status: "completed" })
        .eq("id", escrow.opportunity_id);
    }
    await supabaseAdmin.from("transactions").insert({
      user_id: escrow.talent_id!,
      type: "credit",
      amount,
      currency: escrow.currency,
      description: `Escrow released — ${escrow.title}`,
    });

    // Released escrow money lands in the talent's withdrawable wallet balance.
    const { data: talentProfile } = await supabaseAdmin
      .from("profiles")
      .select("total_earned,wallet_balance")
      .eq("id", escrow.talent_id!)
      .maybeSingle();
    await supabaseAdmin
      .from("profiles")
      .update({
        total_earned: Number(talentProfile?.total_earned ?? 0) + amount,
        wallet_balance: Number(talentProfile?.wallet_balance ?? 0) + amount,
      })
      .eq("id", escrow.talent_id!);

    await supabaseAdmin.from("notifications").insert({
      user_id: escrow.talent_id!,
      type: "escrow",
      title: "Funds released",
      body: `${escrow.currency} ${amount.toLocaleString()} — ${escrow.title}`,
      link: "/wallet",
    });

    return { status: "released" };
  });

export type TalentApplication = {
  id: string;
  status: string;
  bid_amount: number | null;
  currency: string;
  delivery_days: number | null;
  created_at: string;
  opportunity_id: string;
  opportunity_title: string;
  opportunity_company: string;
  escrow_id: string | null;
  escrow_status: string | null;
};

/** Applications the signed-in talent has sent, with escrow stage when hired. */
export const listTalentApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TalentApplication[]> => {
    const { supabase, userId } = context;

    const { data: proposals, error } = await supabase
      .from("proposals")
      .select("id,status,bid_amount,currency,delivery_days,created_at,opportunity_id,escrow_id")
      .eq("talent_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!proposals?.length) return [];

    const { data: opportunities } = await supabase
      .from("opportunities")
      .select("id,title,company")
      .in("id", [...new Set(proposals.map((p) => p.opportunity_id))]);
    const oppMap = new Map((opportunities ?? []).map((o) => [o.id, o]));

    const escrowIds = proposals.map((p) => p.escrow_id).filter((id): id is string => Boolean(id));
    const escrowMap = new Map<string, string>();
    if (escrowIds.length) {
      const { data: escrows } = await supabase.from("escrows").select("id,status").in("id", escrowIds);
      for (const escrow of escrows ?? []) escrowMap.set(escrow.id, escrow.status);
    }

    return proposals.map((p) => ({
      ...p,
      opportunity_title: oppMap.get(p.opportunity_id)?.title ?? "Opportunity",
      opportunity_company: oppMap.get(p.opportunity_id)?.company ?? "Afrixa client",
      escrow_status: p.escrow_id ? (escrowMap.get(p.escrow_id) ?? null) : null,
    }));
  });
