import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import { useEffect } from "react";
import { z } from "zod";

import { AppShell, ScreenHeader } from "@/components/afrixa/AppShell";
import { confirmPayment } from "@/lib/payments.functions";
import { money } from "@/lib/afrixa";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  reference: z.string().optional(),
  tx_ref: z.string().optional(),
  provider: z.enum(["paystack", "flutterwave"]).optional(),
});

export const Route = createFileRoute("/_authenticated/payment-callback")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Payment status — Afrixa" },
      { name: "description", content: "Confirming your Afrixa escrow payment with the payment gateway." },
      { property: "og:title", content: "Payment status — Afrixa" },
      { property: "og:description", content: "Afrixa confirms every escrow payment directly with the gateway." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentCallbackPage,
});

function PaymentCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const confirm = useServerFn(confirmPayment);
  const reference = search.reference ?? search.tx_ref;

  const mutation = useMutation({
    mutationFn: (ref: string) => confirm({ data: { reference: ref } }),
  });

  useEffect(() => {
    if (reference) mutation.mutate(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  const result = mutation.data;
  const paid = result?.status === "paid";
  const pending = mutation.isPending || result?.status === "pending";

  return (
    <AppShell>
      <ScreenHeader title="Payment" subtitle="Gateway confirmation" />
      <main className="px-4">
        <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          {!reference ? (
            <>
              <WarningCircle size={40} className="mx-auto text-destructive" />
              <h1 className="mt-3 text-lg font-semibold">Missing payment reference</h1>
              <p className="mt-1 text-sm text-muted-foreground">Open your wallet to review recent activity.</p>
            </>
          ) : pending ? (
            <>
              <Clock size={40} className="mx-auto text-primary" />
              <h1 className="mt-3 text-lg font-semibold">Confirming your payment…</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We are verifying this transaction directly with the gateway.
              </p>
            </>
          ) : paid ? (
            <>
              <CheckCircle size={40} weight="fill" className="mx-auto text-secondary" />
              <h1 className="mt-3 text-lg font-semibold">
                {result.purpose === "topup" ? "Wallet topped up" : "Escrow funded"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {money(result.amount, result.currency)}{" "}
                {result.purpose === "topup"
                  ? "is now available in your wallet."
                  : "is held in escrow until you release it."}
              </p>
            </>
          ) : (
            <>
              <WarningCircle size={40} className="mx-auto text-destructive" />
              <h1 className="mt-3 text-lg font-semibold">Payment not completed</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mutation.error instanceof Error ? mutation.error.message : "The gateway did not confirm this payment."}
              </p>
            </>
          )}

          <div className="mt-6 space-y-2">
            <Button className="h-11 w-full" onClick={() => navigate({ to: "/wallet" })}>
              Go to wallet
            </Button>
            <Link
              to="/home"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium"
            >
              Back home
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
