import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/webhooks/paystack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Gateway not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const given = Buffer.from(signature);
        const want = Buffer.from(expected);
        if (given.length !== want.length || !timingSafeEqual(given, want)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(raw) as { event?: string; data?: { reference?: string } };
        const reference = event.data?.reference;
        if (event.event !== "charge.success" || !reference) return new Response("ignored");

        try {
          const { settlePayment } = await import("@/lib/payments.server");
          await settlePayment(reference);
        } catch (error) {
          console.error("[paystack] settle failed", error);
          return new Response("Settlement failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
