import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/flutterwave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hash = process.env["FLUTTERWAVE_SECRET_HASH"];
        if (!hash) return new Response("Gateway not configured", { status: 503 });

        const given = request.headers.get("verif-hash") ?? "";
        if (given !== hash) return new Response("Invalid signature", { status: 401 });

        const raw = await request.text();
        const event = JSON.parse(raw) as {
          event?: string;
          data?: { tx_ref?: string; status?: string };
        };
        const reference = event.data?.tx_ref;
        if (!reference) return new Response("ignored");

        try {
          const { settlePayment } = await import("@/lib/payments.server");
          await settlePayment(reference);
        } catch (error) {
          console.error("[flutterwave] settle failed", error);
          return new Response("Settlement failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
