import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MilestoneStatus =
  | "planned"
  | "funded"
  | "in_progress"
  | "submitted"
  | "approved"
  | "paid"
  | "cancelled";

export type Milestone = {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  position: number;
  status: string;
  deliverable_note: string | null;
  deliverable_url: string | null;
  funded_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type ContractSummary = {
  id: string;
  title: string;
  description: string | null;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  client_id: string;
  talent_id: string;
  opportunity_id: string | null;
  proposal_id: string | null;
  counterparty_name: string;
  counterparty_headline: string | null;
  role: "client" | "talent";
  milestones: Milestone[];
  funded_total: number;
  paid_total: number;
};

const MILESTONE_ROWS =
  "id,contract_id,title,description,amount,currency,due_date,position,status,deliverable_note,deliverable_url,funded_at,started_at,submitted_at,approved_at,created_at";

function num(value: unknown) {
  return Number(value ?? 0);
}

/** Contracts where the signed-in user is the client or the hired talent. */
export const listMyContracts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContractSummary[]> => {
    const { supabase, userId } = context;

    const { data: contracts, error } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!contracts?.length) return [];

    const { data: milestones, error: msError } = await supabase
      .from("milestones")
      .select(MILESTONE_ROWS)
      .in(
        "contract_id",
        contracts.map((c) => c.id),
      )
      .order("position", { ascending: true });
    if (msError) throw new Error(msError.message);

    const otherIds = [
      ...new Set(contracts.map((c) => (c.client_id === userId ? c.talent_id : c.client_id))),
    ];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: people } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,headline")
      .in("id", otherIds);
    const peopleMap = new Map((people ?? []).map((p) => [p.id, p]));

    return contracts.map((contract) => {
      const rows = (milestones ?? [])
        .filter((m) => m.contract_id === contract.id)
        .map((m) => ({ ...m, amount: num(m.amount) })) as Milestone[];
      const otherId = contract.client_id === userId ? contract.talent_id : contract.client_id;
      const person = peopleMap.get(otherId);
      return {
        id: contract.id,
        title: contract.title,
        description: contract.description,
        total_amount: num(contract.total_amount),
        currency: contract.currency,
        status: contract.status,
        created_at: contract.created_at,
        client_id: contract.client_id,
        talent_id: contract.talent_id,
        opportunity_id: contract.opportunity_id,
        proposal_id: contract.proposal_id,
        counterparty_name: person?.full_name || "Afrixa member",
        counterparty_headline: person?.headline ?? null,
        role: contract.client_id === userId ? "client" : "talent",
        milestones: rows,
        funded_total: rows
          .filter((m) => ["funded", "in_progress", "submitted", "approved", "paid"].includes(m.status))
          .reduce((sum, m) => sum + m.amount, 0),
        paid_total: rows.filter((m) => m.status === "paid").reduce((sum, m) => sum + m.amount, 0),
      };
    });
  });

/** Client creates a contract with the talent from an accepted proposal. */
export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        proposalId: z.string().uuid(),
        title: z.string().trim().min(3).max(140),
        description: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("id,talent_id,opportunity_id,bid_amount,currency,escrow_id,status")
      .eq("id", data.proposalId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proposal) throw new Error("Proposal not found");

    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("id,client_id,title")
      .eq("id", proposal.opportunity_id)
      .maybeSingle();
    if (!opportunity || opportunity.client_id !== userId) throw new Error("Forbidden");

    const { data: existing } = await supabase
      .from("contracts")
      .select("id")
      .eq("proposal_id", proposal.id)
      .maybeSingle();
    if (existing) return { id: existing.id, existing: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: insertError } = await supabaseAdmin
      .from("contracts")
      .insert({
        client_id: userId,
        talent_id: proposal.talent_id,
        opportunity_id: proposal.opportunity_id,
        proposal_id: proposal.id,
        escrow_id: proposal.escrow_id,
        title: data.title,
        description: data.description ?? null,
        total_amount: num(proposal.bid_amount),
        currency: proposal.currency,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: proposal.talent_id,
      type: "contract",
      title: "New contract created",
      body: data.title,
      link: "/contracts",
    });

    return { id: created.id, existing: false };
  });

/** Client adds a milestone to their own contract. */
export const addMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contractId: z.string().uuid(),
        title: z.string().trim().min(2).max(140),
        description: z.string().trim().max(2000).optional(),
        amount: z.number().positive().max(10_000_000),
        dueDate: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: contract } = await supabase
      .from("contracts")
      .select("id,client_id,talent_id,currency,status")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract || contract.client_id !== userId) throw new Error("Forbidden");
    if (contract.status !== "active") throw new Error("Contract is closed");

    const { count } = await supabase
      .from("milestones")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contract.id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("milestones").insert({
      contract_id: contract.id,
      title: data.title,
      description: data.description ?? null,
      amount: data.amount,
      currency: contract.currency,
      due_date: data.dueDate || null,
      position: (count ?? 0) + 1,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: contract.talent_id,
      type: "contract",
      title: "Milestone added",
      body: data.title,
      link: "/contracts",
    });

    return { ok: true };
  });

/**
 * Milestone lifecycle. Funding debits the client's wallet, approval credits the
 * talent's wallet — both run with elevated rights because wallet balances are
 * protected from direct client writes.
 */
export const advanceMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        milestoneId: z.string().uuid(),
        action: z.enum(["fund", "start", "submit", "approve", "cancel"]),
        note: z.string().trim().max(1000).optional(),
        url: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: milestone, error } = await supabase
      .from("milestones")
      .select("id,contract_id,title,amount,currency,status")
      .eq("id", data.milestoneId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!milestone) throw new Error("Milestone not found");

    const { data: contract } = await supabase
      .from("contracts")
      .select("id,client_id,talent_id,title,currency")
      .eq("id", milestone.contract_id)
      .maybeSingle();
    if (!contract) throw new Error("Contract not found");

    const isClient = contract.client_id === userId;
    const isTalent = contract.talent_id === userId;
    if (!isClient && !isTalent) throw new Error("Forbidden");

    const amount = num(milestone.amount);
    const now = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { creditWallet, debitWallet } = await import("@/lib/payments.server");

    if (data.action === "fund") {
      if (!isClient) throw new Error("Only the client can fund a milestone");
      if (milestone.status !== "planned") throw new Error("Milestone is already funded");
      await debitWallet(contract.client_id, amount);
      await supabaseAdmin.from("transactions").insert({
        user_id: contract.client_id,
        type: "debit",
        amount,
        currency: milestone.currency,
        description: `Milestone funded — ${milestone.title}`,
      });
      await supabaseAdmin
        .from("milestones")
        .update({ status: "funded", funded_at: now })
        .eq("id", milestone.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: contract.talent_id,
        type: "contract",
        title: "Milestone funded — you can start",
        body: `${milestone.currency} ${amount.toLocaleString()} — ${milestone.title}`,
        link: "/contracts",
      });
      return { status: "funded" };
    }

    if (data.action === "start") {
      if (!isTalent) throw new Error("Only the freelancer can start work");
      if (milestone.status !== "funded") throw new Error("Milestone must be funded first");
      await supabaseAdmin
        .from("milestones")
        .update({ status: "in_progress", started_at: now })
        .eq("id", milestone.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: contract.client_id,
        type: "contract",
        title: "Work started on a milestone",
        body: milestone.title,
        link: "/contracts",
      });
      return { status: "in_progress" };
    }

    if (data.action === "submit") {
      if (!isTalent) throw new Error("Only the freelancer can submit work");
      if (!["funded", "in_progress"].includes(milestone.status))
        throw new Error("Milestone must be funded before submitting");
      await supabaseAdmin
        .from("milestones")
        .update({
          status: "submitted",
          submitted_at: now,
          deliverable_note: data.note ?? null,
          deliverable_url: data.url || null,
        })
        .eq("id", milestone.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: contract.client_id,
        type: "contract",
        title: "Milestone submitted — review and approve",
        body: milestone.title,
        link: "/contracts",
      });
      return { status: "submitted" };
    }

    if (data.action === "cancel") {
      if (!isClient) throw new Error("Only the client can cancel a milestone");
      if (milestone.status === "paid") throw new Error("Paid milestones cannot be cancelled");
      if (["funded", "in_progress", "submitted"].includes(milestone.status)) {
        await creditWallet(contract.client_id, amount);
        await supabaseAdmin.from("transactions").insert({
          user_id: contract.client_id,
          type: "credit",
          amount,
          currency: milestone.currency,
          description: `Milestone refunded — ${milestone.title}`,
        });
      }
      await supabaseAdmin.from("milestones").update({ status: "cancelled" }).eq("id", milestone.id);
      await supabaseAdmin.from("notifications").insert({
        user_id: contract.talent_id,
        type: "contract",
        title: "Milestone cancelled",
        body: milestone.title,
        link: "/contracts",
      });
      return { status: "cancelled" };
    }

    if (!isClient) throw new Error("Only the client can approve work");
    if (milestone.status !== "submitted") throw new Error("Approve after the work is submitted");

    await supabaseAdmin
      .from("milestones")
      .update({ status: "paid", approved_at: now })
      .eq("id", milestone.id);

    await creditWallet(contract.talent_id, amount);
    const { data: talentProfile } = await supabaseAdmin
      .from("profiles")
      .select("total_earned")
      .eq("id", contract.talent_id)
      .maybeSingle();
    await supabaseAdmin
      .from("profiles")
      .update({ total_earned: num(talentProfile?.total_earned) + amount })
      .eq("id", contract.talent_id);

    await supabaseAdmin.from("transactions").insert({
      user_id: contract.talent_id,
      type: "credit",
      amount,
      currency: milestone.currency,
      description: `Milestone approved — ${milestone.title}`,
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: contract.talent_id,
      type: "contract",
      title: "Milestone approved — funds released",
      body: `${milestone.currency} ${amount.toLocaleString()} — ${milestone.title}`,
      link: "/wallet",
    });

    // Close the contract once every live milestone is paid.
    const { data: remaining } = await supabaseAdmin
      .from("milestones")
      .select("id,status")
      .eq("contract_id", contract.id);
    const live = (remaining ?? []).filter((m) => m.status !== "cancelled");
    if (live.length > 0 && live.every((m) => m.status === "paid")) {
      await supabaseAdmin.from("contracts").update({ status: "completed" }).eq("id", contract.id);
    }

    return { status: "paid" };
  });
