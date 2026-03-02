import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/connection.ts";
import {
  productsTable,
  categoriesTable,
  companiesTable,
  assetsTable,
  pricingTiersTable,
  customFieldDefinitionsTable,
  customFieldValuesTable,
  wishlistTable,
  type CustomFieldValue,
  type Company
} from "@/db/schema.ts";
import Product from "@/components/Product.tsx";
import { authClient } from "@/lib/auth-client";
import { v4 as uuidv4 } from "uuid";

const getProductPageData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.number() }))
  .handler(async ({ data }) => {
    const { productId } = data;

    const productRows = await db
      .select({
        product: productsTable,
        category: categoriesTable,
        company: companiesTable
      })
      .from(productsTable)
      .leftJoin(
        categoriesTable,
        eq(productsTable.category_id, categoriesTable.id)
      )
      .leftJoin(companiesTable, eq(productsTable.company_id, companiesTable.id))
      .where(eq(productsTable.id, productId));

    const productData = productRows[0] || {};

    const assetsData = await db
      .select()
      .from(assetsTable)
      .where(eq(assetsTable.product_id, productId));

    const pricingTiersData = await db
      .select()
      .from(pricingTiersTable)
      .where(eq(pricingTiersTable.product_id, productId))
      .orderBy(desc(pricingTiersTable.min_quantity));

    // Fetch custom field values and their definitions for this product
    const customFieldRows = await db
      .select({
        cfv: customFieldValuesTable,
        cfd: customFieldDefinitionsTable
      })
      .from(customFieldValuesTable)
      .innerJoin(
        customFieldDefinitionsTable,
        eq(
          customFieldValuesTable.field_definition_id,
          customFieldDefinitionsTable.id
        )
      )
      .where(eq(customFieldValuesTable.product_id, productId));

    const customFieldData = customFieldRows.map(({ cfv, cfd }) => ({
      ...(cfv as CustomFieldValue),
      ...cfd
    }));

    return {
      product: productData.product,
      category: productData.category,
      company: productData.company as Company,
      assets: assetsData,
      pricingTiers: pricingTiersData,
      customFields: customFieldData
    };
  });

const getProductWishlist = createServerFn({ method: "GET" })
  .inputValidator(z.object({ productId: z.number(), userId: z.string() }))
  .handler(async ({ data }) => {
    return db
      .select()
      .from(wishlistTable)
      .where(
        and(
          eq(wishlistTable.product_id, data.productId),
          eq(wishlistTable.user_id, data.userId)
        )
      );
  });

const addWishlistItem = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      user_id: z.string(),
      product_id: z.number(),
      price_snapshot: z.string()
    })
  )
  .handler(async ({ data }) => {
    await db.insert(wishlistTable).values({
      ...data,
      created_at: new Date()
    });
    return { success: true };
  });

const removeWishlistItem = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data: { id } }) => {
    await db.delete(wishlistTable).where(eq(wishlistTable.id, id));
    return { success: true };
  });

export const Route = createFileRoute("/products/$productId")({
  ssr: true,
  params: {
    parse: (params) => ({ productId: parseInt(params.productId, 10) })
  },
  component: ProductPageComponent,
  loader: async ({ params: { productId } }) =>
    getProductPageData({ data: { productId } })
});

function ProductPageComponent() {
  const { productId } = Route.useParams();
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();

  const { product, category, company, assets, pricingTiers, customFields } =
    Route.useLoaderData();

  const { data: wishlistData, isLoading: isWishlistLoading } = useQuery({
    queryKey: ["wishlist", productId, session?.user?.id],
    queryFn: () =>
      getProductWishlist({ data: { productId, userId: session!.user.id } }),
    enabled: !!session?.user?.id
  });

  const addMutation = useMutation({
    mutationFn: (data: Parameters<typeof addWishlistItem>[0]["data"]) =>
      addWishlistItem({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["wishlist", productId, session?.user?.id]
      });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWishlistItem({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["wishlist", productId, session?.user?.id]
      });
    }
  });

  const isLoading = isWishlistLoading;

  const wishlistItem = wishlistData?.[0];
  const isInWishlist = !!wishlistItem;

  const handleToggleWishlist = () => {
    if (!session || !product || !pricingTiers.length) return;

    if (isInWishlist) {
      removeMutation.mutate(wishlistItem.id);
    } else {
      addMutation.mutate({
        id: uuidv4(),
        user_id: session.user.id,
        product_id: product.id,
        price_snapshot: pricingTiers[0].price_per_unit.toString()
      });
    }
  };

  return (
    <Product
      loading={isLoading}
      product={product}
      category={category ?? undefined}
      company={company}
      assets={assets}
      pricingTiers={pricingTiers}
      customFields={customFields}
      isInWishlist={isInWishlist}
      onToggleWishlist={handleToggleWishlist}
    />
  );
}
