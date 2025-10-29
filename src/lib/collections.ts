import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import {
  selectTodoSchema,
  selectProjectSchema,
  selectUsersSchema,
  selectCompanySchema,
  selectCategorySchema,
  selectProductSchema,
  selectPricingTierSchema,
  selectAssetSchema,
  selectCustomFieldDefinitionSchema,
  selectCustomFieldValueSchema,
  selectCartSchema,
  selectCartItemSchema,
  selectCartCollaboratorSchema,
  selectCartFolderSchema,
  selectCartItemTagSchema,
  selectCartTagSchema
} from "@/db/schema";
import { trpc } from "@/lib/trpc-client";

/**
 * Helper function to create full API URLs
 * @param path - The API path
 * @returns Full URL as a string
 */
const createApiUrl = (path: string) => {
  return new URL(
    path,
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173"
  ).toString();
};

export const usersCollection = createCollection(
  electricCollectionOptions({
    id: "users",
    shapeOptions: {
      url: createApiUrl("/api/users"),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectUsersSchema,
    getKey: (item) => item.id
  })
);

export const companiesCollection = createCollection(
  electricCollectionOptions({
    id: "companies",
    shapeOptions: {
      url: createApiUrl("/api/companies"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCompanySchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Categories Collection ---
export const categoriesCollection = createCollection(
  electricCollectionOptions({
    id: "categories",
    shapeOptions: {
      url: createApiUrl("/api/categories"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCategorySchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Products Collection ---
export const productsCollection = createCollection(
  electricCollectionOptions({
    id: "products",
    shapeOptions: {
      url: createApiUrl("/api/products"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectProductSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Pricing Tiers Collection ---
export const pricingTiersCollection = createCollection(
  electricCollectionOptions({
    id: "pricing_tiers",
    shapeOptions: { url: createApiUrl("/api/pricing-tiers") },
    schema: selectPricingTierSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Assets Collection ---
export const assetsCollection = createCollection(
  electricCollectionOptions({
    id: "assets",
    shapeOptions: {
      url: createApiUrl("/api/assets"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectAssetSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Custom Field Definitions Collection ---
export const customFieldDefinitionsCollection = createCollection(
  electricCollectionOptions({
    id: "custom_field_definitions",
    shapeOptions: { url: createApiUrl("/api/custom-field-definitions") },
    schema: selectCustomFieldDefinitionSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

// --- Custom Field Values Collection ---
export const customFieldValuesCollection = createCollection(
  electricCollectionOptions({
    id: "custom_field_values",
    shapeOptions: { url: createApiUrl("/api/custom-field-values") },
    schema: selectCustomFieldValueSchema,
    getKey: (item) => item.id
    // ... onInsert, onUpdate, onDelete
  })
);

export const projectCollection = createCollection(
  electricCollectionOptions({
    id: "projects",
    shapeOptions: {
      url: createApiUrl("/api/projects"),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectProjectSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newProject } = transaction.mutations[0];
      const result = await trpc.projects.create.mutate({
        name: newProject.name,
        description: newProject.description,
        owner_id: newProject.owner_id,
        shared_user_ids: newProject.shared_user_ids
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedProject } = transaction.mutations[0];
      const result = await trpc.projects.update.mutate({
        id: updatedProject.id,
        data: {
          name: updatedProject.name,
          description: updatedProject.description,
          shared_user_ids: updatedProject.shared_user_ids
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedProject } = transaction.mutations[0];
      const result = await trpc.projects.delete.mutate({
        id: deletedProject.id
      });

      return { txid: result.txid };
    }
  })
);

// --- Carts Collection ---
export const cartsCollection = createCollection(
  electricCollectionOptions({
    id: "carts",
    shapeOptions: {
      url: createApiUrl("/api/carts"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newCart } = transaction.mutations[0];
      const result = await trpc.carts.create.mutate({
        name: newCart.name,
        owner_user_id: newCart.owner_user_id,
        guest_session_id: newCart.guest_session_id,
        is_default: newCart.is_default
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedCart } = transaction.mutations[0];
      const result = await trpc.carts.update.mutate({
        id: updatedCart.id,
        data: {
          name: updatedCart.name,
          owner_user_id: updatedCart.owner_user_id,
          guest_session_id: updatedCart.guest_session_id,
          is_default: updatedCart.is_default
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedCart } = transaction.mutations[0];
      const result = await trpc.carts.delete.mutate({ id: deletedCart.id });

      return { txid: result.txid };
    }
  })
);

// --- Cart Items Collection ---
export const cartItemsCollection = createCollection(
  electricCollectionOptions({
    id: "cart_items",
    shapeOptions: {
      url: createApiUrl("/api/cart-items"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartItemSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newItem } = transaction.mutations[0];
      const result = await trpc.cartItems.create.mutate({
        cart_id: newItem.cart_id,
        product_id: newItem.product_id,
        quantity: newItem.quantity,
        price_snapshot: newItem.price_snapshot,
        currency: newItem.currency,
        notes: newItem.notes
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedItem } = transaction.mutations[0];
      const result = await trpc.cartItems.update.mutate({
        id: updatedItem.id,
        data: {
          quantity: updatedItem.quantity,
          notes: updatedItem.notes
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedItem } = transaction.mutations[0];
      const result = await trpc.cartItems.delete.mutate({ id: deletedItem.id });

      return { txid: result.txid };
    }
  })
);

// --- Cart Collaborators Collection ---
export const cartCollaboratorsCollection = createCollection(
  electricCollectionOptions({
    id: "cart_collaborators",
    shapeOptions: {
      url: createApiUrl("/api/cart-collaborators"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartCollaboratorSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.create.mutate({
        cart_id: newCollab.cart_id,
        user_id: newCollab.user_id,
        role: newCollab.role
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.update.mutate({
        id: updatedCollab.id,
        data: {
          role: updatedCollab.role
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedCollab } = transaction.mutations[0];
      const result = await trpc.cartCollaborators.delete.mutate({
        id: deletedCollab.id
      });

      return { txid: result.txid };
    }
  })
);

// --- Cart Folders Collection ---
export const cartFoldersCollection = createCollection(
  electricCollectionOptions({
    id: "cart_folders",
    shapeOptions: {
      url: createApiUrl("/api/cart-folders"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartFolderSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newFolder } = transaction.mutations[0];
      const result = await trpc.cartFolders.create.mutate({
        cart_id: newFolder.cart_id,
        name: newFolder.name,
        sort_order: newFolder.sort_order
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedFolder } = transaction.mutations[0];
      const result = await trpc.cartFolders.update.mutate({
        id: updatedFolder.id,
        data: {
          // Only include mutable fields
          name: updatedFolder.name,
          sort_order: updatedFolder.sort_order
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedFolder } = transaction.mutations[0];
      const result = await trpc.cartFolders.delete.mutate({
        id: deletedFolder.id
      });

      return { txid: result.txid };
    }
  })
);

// --- Cart Tags Collection (Tag Definitions) ---
export const cartTagsCollection = createCollection(
  electricCollectionOptions({
    id: "cart_tags",
    shapeOptions: {
      url: createApiUrl("/api/cart-tags"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartTagSchema,
    getKey: (item) => item.id,

    onInsert: async ({ transaction }) => {
      const { modified: newTag } = transaction.mutations[0];

      const result = await trpc.cartTags.create.mutate({
        cart_id: newTag.cart_id,
        name: newTag.name,
        color: newTag.color
      });

      return { txid: result.txid };
    },

    onUpdate: async ({ transaction }) => {
      const { original, modified } = transaction.mutations[0];

      const result = await trpc.cartTags.update.mutate({
        cart_id: original.cart_id, // TODO: wrong, should take id
        name: modified.name,
        color: modified.color
      });

      return { txid: result.txid };
    },

    onDelete: async ({ transaction }) => {
      const { original: deletedTag } = transaction.mutations[0];

      const result = await trpc.cartItemTags.delete.mutate({
        id: deletedTag.id
      });

      return { txid: result.txid };
    }
  })
);

// --- Cart Item Tags Join Collection ---
export const cartItemTagsCollection = createCollection(
  electricCollectionOptions({
    id: "cart_item_tags",
    shapeOptions: {
      url: createApiUrl("/api/cart-item-tags"),
      parser: { timestamptz: (date: string) => new Date(date) }
    },
    schema: selectCartItemTagSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newItemTag } = transaction.mutations[0];
      const result = await trpc.cartItemTags.create.mutate({
        cart_item_id: newItemTag.cart_item_id,
        cart_tag_id: newItemTag.cart_tag_id
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedItemTag } = transaction.mutations[0];
      const result = await trpc.cartItemTags.delete.mutate({
        id: deletedItemTag.id
      });

      return { txid: result.txid };
    }
  })
);

export const todoCollection = createCollection(
  electricCollectionOptions({
    id: "todos",
    shapeOptions: {
      url: createApiUrl("/api/todos"),
      parser: {
        // Parse timestamp columns into JavaScript Date objects
        timestamptz: (date: string) => {
          return new Date(date);
        }
      }
    },
    schema: selectTodoSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTodo } = transaction.mutations[0];
      const result = await trpc.todos.create.mutate({
        user_id: newTodo.user_id,
        text: newTodo.text,
        completed: newTodo.completed,
        project_id: newTodo.project_id,
        user_ids: newTodo.user_ids
      });

      return { txid: result.txid };
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedTodo } = transaction.mutations[0];
      const result = await trpc.todos.update.mutate({
        id: updatedTodo.id,
        data: {
          text: updatedTodo.text,
          completed: updatedTodo.completed
        }
      });

      return { txid: result.txid };
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedTodo } = transaction.mutations[0];
      const result = await trpc.todos.delete.mutate({
        id: deletedTodo.id
      });

      return { txid: result.txid };
    }
  })
);
