import { z } from "zod";
import { procedure, router } from "@/lib/trpc";
import { db } from "@/db/connection";
import { pricingTiersTable, productsTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { CONFIG } from "@/lib/checkout/config";

if (!process.env.STRIPE_SECRET_KEY) {
  throw Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover"
});

export const paymentRouter = router({
  createPaymentIntent: procedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            productId: z.number(),
            quantity: z.number().min(1)
          })
        ),
        shippingMethod: z.enum(["standard", "express", "pickup"]),
        warranties: z.record(z.string(), z.boolean()),
        appliedCoupon: z.string().nullable()
      })
    )
    .mutation(async ({ input }) => {
      const { items, shippingMethod, warranties, appliedCoupon } = input;

      if (items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create a payment for an empty cart."
        });
      }

      const productIds = items.map((item) => item.productId);

      // Fetch all relevant product prices from the database in one go
      const productPrices = await db
        .select({
          productId: productsTable.id,
          price: pricingTiersTable.price_per_unit
        })
        .from(productsTable)
        .leftJoin(
          pricingTiersTable,
          eq(productsTable.id, pricingTiersTable.product_id)
        )
        .where(
          and(
            inArray(productsTable.id, productIds),
            // For now, we assume the simplest pricing tier.
            // A real app would need to handle quantity-based tiers.
            eq(pricingTiersTable.min_quantity, 1)
          )
        );

      // Server-side calculation of the total
      const subtotal = items.reduce((acc, item) => {
        const dbProduct = productPrices.find(
          (p) => p.productId === item.productId
        );
        if (!dbProduct?.price) {
          // This should ideally not happen if the client sends valid data
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Product with ID ${item.productId} not found or has no price.`
          });
        }
        return acc + parseFloat(dbProduct.price) * item.quantity;
      }, 0);

      const warrantyCost = Object.entries(warranties).reduce(
        (sum, [itemId, active]) => {
          if (!active) return sum;
          const item = items.find((i) => i.id === itemId);
          if (!item) return sum;

          const dbProduct = productPrices.find(
            (p) => p.productId === item.productId
          );
          const price = parseFloat(dbProduct?.price ?? "0");
          return sum + price * CONFIG.WARRANTY_RATE * (item?.quantity ?? 1);
        },
        0
      );

      const shippingCost = CONFIG.SHIPPING_RATES[shippingMethod];
      const preDiscountTotal = subtotal + warrantyCost + shippingCost;
      const tax = preDiscountTotal * CONFIG.TAX_RATE;
      const discount = appliedCoupon ? CONFIG.COUPONS[appliedCoupon] || 0 : 0;
      const total = preDiscountTotal + tax - discount;

      // Stripe expects the amount in the smallest currency unit (e.g., cents)
      const amountInCents = Math.round(total * 100);

      if (amountInCents <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total amount must be positive."
        });
      }

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: "eur", // Or make this dynamic
          automatic_payment_methods: {
            enabled: true
          }
        });

        return {
          clientSecret: paymentIntent.client_secret
        };
      } catch (error) {
        console.error("Stripe Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payment intent."
        });
      }
    })
});
