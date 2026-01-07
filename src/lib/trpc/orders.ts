import { router, authedProcedure, generateTxId } from "@/lib/trpc";
import { z } from "zod";
import { and, eq, inArray, or } from "drizzle-orm";
import {
  ordersTable,
  orderItemsTable,
  productsTable,
  pricingTiersTable,
  userAddressesTable
} from "@/db/schema";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import Big from "big.js";
import { calculateOrderTotals } from "../utils/calcTotals";

if (!process.env.STRIPE_SECRET_KEY) {
  throw Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const ordersRouter = router({
  upsert: authedProcedure
    .input(
      z.object({
        existingOrderId: z.uuid().optional(),
        cartId: z.uuid().optional(),
        items: z.array(
          z.object({
            id: z.string(),
            productId: z.number(),
            quantity: z.number().min(1)
          })
        ),
        shippingMethod: z.enum(["standard", "express", "pickup"]),
        warranties: z.record(z.string(), z.boolean()),
        appliedCoupon: z.string().nullable(),
        addressId: z.uuid().nullable(),
        billingAddressId: z.uuid().nullable()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx);

        const {
          items,
          shippingMethod,
          warranties,
          appliedCoupon,
          addressId,
          billingAddressId
        } = input;

        if (items.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot create a payment for an empty cart."
          });
        }

        const productIds = items.map((item) => item.productId);

        // Fetch Pricing Product Names
        const allProductData = await ctx.db
          .select({
            productId: productsTable.id,
            name: productsTable.name,
            price: pricingTiersTable.price_per_unit,
            minQuantity: pricingTiersTable.min_quantity
          })
          .from(productsTable)
          .innerJoin(
            pricingTiersTable,
            eq(productsTable.id, pricingTiersTable.product_id)
          )
          .where(inArray(productsTable.id, productIds));

        // Map inputs to the correct price based on quantity
        const lineItems = items.map((item) => {
          const productTiers = allProductData.filter(
            (p) => p.productId === item.productId
          );

          if (productTiers.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Product with ID ${item.productId} not found or has no pricing.`
            });
          }

          const productName = productTiers[0].name;

          // Find the most specific matching tier
          const matchedTier = productTiers
            .sort((a, b) => b.minQuantity - a.minQuantity)
            .find((tier) => item.quantity >= tier.minQuantity);

          if (!matchedTier) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Quantity ${item.quantity} is too low for product ${productName} (${item.productId}).`
            });
          }

          const unitPrice = new Big(matchedTier.price);

          return {
            productId: item.productId,
            productName: productName,
            quantity: item.quantity,
            unitPrice: unitPrice,
            totalLinePrice: unitPrice.times(item.quantity),

            priceForHelper: matchedTier.price,
            hasWarranty: warranties[item.id] ?? false
          };
        });

        // Global Totals
        const totals = calculateOrderTotals(
          lineItems.map((li) => ({
            price: li.priceForHelper,
            quantity: li.quantity,
            hasWarranty: li.hasWarranty
          })),
          shippingMethod,
          appliedCoupon
        );

        // Stripe expects the amount in the smallest currency unit (cents)
        const amountInCents = Number(totals.total.times(100).toFixed(0));
        const CURRENCY_CODE = "EUR"; // Define constant TODO

        return await ctx.db.transaction(async (tx) => {
          // Fetch Addresses for Snapshotting
          const address = addressId
            ? await tx.query.userAddressesTable.findFirst({
                where: and(
                  or(
                    eq(userAddressesTable.id, addressId),
                    eq(userAddressesTable.is_default_delivery, true)
                  ),
                  eq(userAddressesTable.user_id, ctx.session.user.id)
                )
              })
            : null;

          const billingAddress = billingAddressId
            ? await tx.query.userAddressesTable.findFirst({
                where: and(
                  or(
                    eq(userAddressesTable.id, billingAddressId),
                    eq(userAddressesTable.is_default_billing, true)
                  ),
                  eq(userAddressesTable.user_id, ctx.session.user.id)
                )
              })
            : address;

          // Determine Mode
          const activeOrderId = input.existingOrderId;
          const activeCartId = input.cartId;
          let existingOrder = null;

          // Try to find by explicit Order ID first
          if (activeOrderId) {
            existingOrder = await tx.query.ordersTable.findFirst({
              where: and(
                eq(ordersTable.id, activeOrderId),
                eq(ordersTable.user_id, ctx.session.user.id),
                eq(ordersTable.status, "pending")
              )
            });
          }

          // Fallback: If no ID provided (or ID not found), look for an existing pending order by Cart ID
          if (!existingOrder && activeCartId) {
            existingOrder = await tx.query.ordersTable.findFirst({
              where: and(
                eq(ordersTable.cart_id, activeCartId),
                eq(ordersTable.user_id, ctx.session.user.id),
                eq(ordersTable.status, "pending")
              )
            });
          }

          let clientSecret = "";
          let finalOrderId = "";

          // ---------------------------------------------------------
          // SCENARIO 1: UPDATE EXISTING
          // ---------------------------------------------------------
          if (existingOrder) {
            finalOrderId = existingOrder.id;

            // Update Order Record
            await tx
              .update(ordersTable)
              .set({
                subtotal: totals.formatted.subtotal,
                tax_total: totals.formatted.tax,
                shipping_total: totals.formatted.shippingCost,
                discount_total: totals.formatted.discount,
                grand_total: totals.formatted.total,
                shipping_address_snapshot: address ?? {},
                billing_address_snapshot: billingAddress ?? {},
                shipping_carrier: input.shippingMethod,
                updated_at: new Date(),
                cart_id: activeCartId
              })
              .where(eq(ordersTable.id, finalOrderId));

            // Overwrite Order Items (Delete all -> Insert new)
            await tx
              .delete(orderItemsTable)
              .where(eq(orderItemsTable.order_id, finalOrderId));

            await tx.insert(orderItemsTable).values(
              lineItems.map((li) => ({
                order_id: finalOrderId,
                product_id: li.productId,
                product_name_snapshot: li.productName,
                quantity: li.quantity,
                price_per_unit: li.unitPrice.toFixed(2),
                total_price: li.totalLinePrice.toFixed(2)
              }))
            );

            // Update Stripe Intent
            try {
              const updatedIntent = await stripe.paymentIntents.update(
                existingOrder.transaction_id,
                {
                  amount: amountInCents,
                  metadata: {
                    order_id: finalOrderId,
                    coupon: input.appliedCoupon ?? "none"
                  }
                }
              );
              clientSecret = updatedIntent.client_secret!;
            } catch {
              // Handle the case where the intent might be succeeded already
              // or invalid, forcing a new order flow could be an option here
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to update Stripe payment."
              });
            }
          }

          // ---------------------------------------------------------
          // SCENARIO 2: CREATE NEW
          // ---------------------------------------------------------
          else {
            const orderNumber = `ORD-${Date.now()}`;
            const tempTransactionId = `tmp_${orderNumber}_${crypto.randomUUID()}`;

            // Insert Order using Helper Results
            const [newOrder] = await tx
              .insert(ordersTable)
              .values({
                order_number: orderNumber,
                user_id: ctx.session.user.id,
                status: "pending",
                payment_status: "unpaid",
                subtotal: totals.formatted.subtotal,
                tax_total: totals.formatted.tax,
                shipping_total: totals.formatted.shippingCost,
                discount_total: totals.formatted.discount,
                grand_total: totals.formatted.total,
                currency_code: CURRENCY_CODE,
                shipping_address_snapshot: address ?? {},
                billing_address_snapshot: billingAddress ?? {},
                shipping_carrier: input.shippingMethod,
                transaction_id: tempTransactionId,
                cart_id: activeCartId
              })
              .returning();

            finalOrderId = newOrder.id;

            // Insert Items
            await tx.insert(orderItemsTable).values(
              lineItems.map((li) => ({
                order_id: finalOrderId,
                product_id: li.productId,
                product_name_snapshot: li.productName,
                quantity: li.quantity,
                price_per_unit: li.unitPrice.toFixed(2),
                total_price: li.totalLinePrice.toFixed(2)
              }))
            );

            // Create Stripe Intent
            try {
              const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: CURRENCY_CODE.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                metadata: {
                  order_id: finalOrderId,
                  coupon: input.appliedCoupon ?? "none"
                }
              });

              // Update Order with Stripe ID
              await tx
                .update(ordersTable)
                .set({
                  transaction_id: paymentIntent.id,
                  stripe_client_secret: paymentIntent.client_secret
                })
                .where(eq(ordersTable.id, finalOrderId));

              clientSecret = paymentIntent.client_secret!;
            } catch {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Stripe initialization failed"
              });
            }
          }

          return {
            clientSecret,
            orderId: finalOrderId,
            breakdown: totals.formatted,
            txid
          };
        });
      });
      return result;
    })
});
