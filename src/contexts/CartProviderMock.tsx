import { type CartContextType } from "@/contexts/useCartContext.ts";
// Create mock context
export const mockContext: CartContextType = {
  activeCartId: null,
  cartRole: "viewer",
  carts: [],
  collaborators: [],
  connectivityStatus: "disconnected",
  onlineUsers: [],
  snapshots: [],
  cartId: `mock-cart-id`,
  rootNodes: [],
  enrichedFlatItems: [],
  tags: [],
  // Read-only overrides
  canManageItems: false,
  canManageUsers: false,
  isLoading: false,
  isSynced: true, // Snapshots are static, so they are "synced"
  // Disable all mutations with no-ops
  /* eslint-disable @typescript-eslint/no-empty-function */
  deleteCart: async () => {},
  getItemNotesYText: () => undefined,
  toggleItemSelection: () => {},
  updateCartName: async () => {},
  addItem: () => undefined,
  removeItem: () => {},
  updateItemQuantity: () => {},
  updateItemNotes: () => {},
  moveNode: () => {},
  createFolder: () => {},
  updateFolder: () => {},
  createTag: () => {},
  updateTag: () => {},
  deleteTag: () => {},
  addTagToItem: () => {},
  removeTagFromItem: () => {},
  addCollaborator: async () => {},
  updateCollaboratorRole: async () => {},
  removeCollaborator: async () => {},
  setActiveCartId: async () => {},
  createCart: () => {}
};
