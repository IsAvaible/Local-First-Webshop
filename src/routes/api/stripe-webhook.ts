import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db/connection";
import { ordersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import Big from "big.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const handleWebhook = async ({ request }: { request: Request }) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Configuration or Signature missing", { status: 400 });
  }

  // Get Raw Body
  const payload = await request.text();
  let event: Stripe.Event;

  // Verify Signature
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response("Webhook signature verification failed.", {
      status: 400
    });
  }

  // Switch Event Type
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook logic", error);

    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    console.error("Missing order_id in metadata");
    return;
  }

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, paymentIntent.metadata.order_id));

    if (!order) {
      console.error(`Order not found for PI: ${paymentIntent.id}`);
      // We don't throw here to avoid repeated webhook attempts
      return;
    }

    // Currency Security Check
    if (
      order.currency_code.toLowerCase() !== paymentIntent.currency.toLowerCase()
    ) {
      console.error(
        `CURRENCY MISMATCH: Order ${order.currency_code} vs Payment ${paymentIntent.currency}`
      );
      await tx
        .update(ordersTable)
        .set({
          payment_status: "requires_manual_review",
          payment_failed_reason: `currency_mismatch - expected ${order.currency_code}, got ${paymentIntent.currency}`
        })
        .where(eq(ordersTable.id, order.id));
      return;
    }

    // Amount Security Check
    const orderTotalCents = new Big(order.grand_total)
      .times(100)
      .round(0)
      .toNumber();

    if (paymentIntent.amount !== orderTotalCents) {
      console.error(
        `AMOUNT MISMATCH: Order ${order.id} expected ${orderTotalCents} but got ${paymentIntent.amount}`
      );
      await tx
        .update(ordersTable)
        .set({
          payment_status: "requires_manual_review",
          payment_failed_reason: `amount_mismatch - expected ${orderTotalCents}, got ${paymentIntent.amount}`
        })
        .where(eq(ordersTable.id, order.id));
      return;
    }

    // Idempotency Check
    const validStatuses = ["pending", "awaiting_payment"];
    if (validStatuses.includes(order.status)) {
      await tx
        .update(ordersTable)
        .set({
          status: "processing",
          payment_status: "paid",
          paid_at: new Date(),
          updated_at: new Date(),
          payment_method:
            typeof paymentIntent.payment_method === "string"
              ? paymentIntent.payment_method
              : paymentIntent.payment_method?.id
        })
        .where(eq(ordersTable.id, order.id));

      console.log(`Order ${order.id} marked as paid.`);
    }
  });
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const [order] = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(eq(ordersTable.id, paymentIntent.metadata.order_id));

  if (!order) {
    console.error(`Order not found for PI: ${paymentIntent.id}`);
    return;
  }

  await db
    .update(ordersTable)
    .set({
      payment_status: "failed",
      updated_at: new Date(),
      payment_failed_reason: paymentIntent.last_payment_error?.message
    })
    .where(eq(ordersTable.id, order.id));

  console.log(`FAILURE: Order ${order.id} marked as failed.`);
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: handleWebhook
    }
  }
});
