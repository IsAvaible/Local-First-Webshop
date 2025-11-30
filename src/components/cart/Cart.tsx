import * as React from "react";
import {
  DndContext,
  useDroppable,
  type DragEndEvent,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  pointerWithin
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  GlobeIcon,
  LinkIcon,
  CheckIcon
} from "lucide-react";

import {
  type EnrichedCartNode,
  type EnrichedCartFolder,
  useCart
} from "@/contexts/useCartContext.ts";
import { TagManager } from "./TagManager";
import { CartItemComponent } from "./CartItem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { CartRole } from "@/db/schema";
import { authClient } from "@/lib/auth-client";

// ------------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------------

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const findActiveNode = (
  nodes: EnrichedCartNode[] | undefined,
  id: string
): EnrichedCartNode | null => {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === "folder") {
      const found = findActiveNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findNodeContext = (
  nodes: EnrichedCartNode[],
  targetId: string,
  parentId: string | null = null
): {
  siblings: EnrichedCartNode[];
  index: number;
  parentId: string | null;
} | null => {
  const index = nodes.findIndex((n) => n.id === targetId);
  if (index !== -1) return { siblings: nodes, index, parentId };

  for (const node of nodes) {
    if (node.type === "folder" && node.children) {
      const result = findNodeContext(node.children, targetId, node.id);
      if (result) return result;
    }
  }
  return null;
};

// ------------------------------------------------------------------
// SUB-COMPONENTS
// ------------------------------------------------------------------

const RoleSelect = ({
  value,
  onChange,
  onRemove,
  disabled
}: {
  value: CartRole;
  onChange: (v: CartRole) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) => (
  <Select
    value={value}
    onValueChange={(v) => onChange(v as CartRole)}
    disabled={disabled}
  >
    <SelectTrigger className="h-8 w-[110px] border-none bg-transparent font-medium text-gray-600 shadow-none hover:bg-gray-100 focus:ring-0">
      <SelectValue />
    </SelectTrigger>
    <SelectContent align="end">
      <SelectItem value="viewer">Viewer</SelectItem>
      <SelectItem value="contributor">Contributor</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
      {!disabled && onRemove && <Separator className="my-1" />}
      {!disabled && onRemove && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Remove access
        </div>
      )}
    </SelectContent>
  </Select>
);

const UserAvatar = ({
  name,
  src,
  className
}: {
  name: string;
  src?: string | null;
  className?: string;
}) => (
  <Avatar className={cn("h-8 w-8 border-2 border-white", className)}>
    <AvatarImage src={src ?? undefined} alt={name} />
    <AvatarFallback>{getInitials(name)}</AvatarFallback>
  </Avatar>
);

const RootDroppable = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { setNodeRef } = useDroppable({
    id: "root-droppable",
    data: { type: "root" }
  });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

const CartFolderComponent = ({
  folder,
  disabled
}: {
  folder: EnrichedCartFolder;
  disabled?: boolean;
}) => {
  // Destructure updateFolder from context
  const { removeItem, updateFolder } = useCart();

  // Local state for editing
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempName, setTempName] = React.useState(folder.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const droppableId = `folder-droppable-${folder.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: "folder", acceptDrop: true, folderId: folder.id },
    disabled: disabled
  });

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync state if external folder name changes
  React.useEffect(() => {
    if (!isEditing) {
      setTempName(folder.name);
    }
  }, [folder.name, isEditing]);

  const handleSave = () => {
    if (tempName.trim() && tempName !== folder.name) {
      updateFolder(folder.id, tempName);
    } else {
      setTempName(folder.name); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " ") {
      e.stopPropagation();
      return;
    }
    if (e.key === "Enter") {
      e.stopPropagation();
      handleSave();
    }
    if (e.key === "Escape") {
      setTempName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-gray-50 p-4 shadow-sm transition-colors",
        isOver ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : ""
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-1 items-center overflow-hidden font-semibold text-gray-700">
          <FolderIcon className="mr-2 h-5 w-5 shrink-0" />

          {isEditing && !disabled ? (
            <Input
              ref={inputRef}
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              // Stop propagation to prevent dnd-kit from interpreting
              // the click/focus as a drag start event on the parent SortableNode
              onPointerDown={(e) => e.stopPropagation()}
              className="m-1 h-6"
            />
          ) : (
            <span
              onClick={(e) => {
                if (!disabled) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              className={cn(
                "truncate rounded px-1 py-0.5 transition-colors",
                !disabled && "cursor-text hover:bg-gray-200/50"
              )}
              title="Click to rename"
            >
              {folder.name}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => removeItem(folder.id)}
        >
          <TrashIcon />
        </Button>
      </div>
      <div className="flex min-h-[3rem] flex-col gap-2">
        <SortableContext
          items={folder.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {folder.children.length === 0 && !isOver && (
            <p className="rounded border-2 border-dashed py-2 text-center text-xs text-gray-400">
              {disabled ? "Empty folder" : "Drop items here"}
            </p>
          )}
          {folder.children.map((child) => (
            <SortableNode
              key={child.id}
              node={child}
              disabled={disabled}
              className={
                child.type === "item" ? "origin-top-left scale-90" : ""
              }
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

const SortableNode = ({
  node,
  className,
  disabled
}: {
  node: EnrichedCartNode;
  disabled?: boolean;
} & React.ComponentProps<"div">) => {
  // Disable dragging if disabled prop is true
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: node.id,
    data: { type: node.type, node },
    disabled: disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const commonProps = {
    ref: setNodeRef,
    style,
    ...attributes,
    ...listeners,
    className: cn("touch-none", className)
  };

  if (node.type === "folder")
    return (
      <div {...commonProps}>
        <CartFolderComponent folder={node} disabled={disabled} />
      </div>
    );
  return (
    <div {...commonProps}>
      {/* Assuming CartItemComponent accepts disabled to stop quantity changes, etc */}
      {/* If it doesn't accept disabled, you might need to wrap it in a pointer-events-none div or similar */}
      <CartItemComponent item={node} disabled={disabled} />
    </div>
  );
};

// ------------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------------

export function Cart({ className }: React.ComponentProps<"div">) {
  const {
    rootNodes,
    isLoading,
    createFolder,
    moveNode,
    carts,
    activeCartId,
    setActiveCartId,
    createCart,
    addCollaborator,
    canManageUsers,
    canManageItems,
    collaborators,
    updateCollaboratorRole,
    removeCollaborator
  } = useCart();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [newCartName, setNewCartName] = React.useState("");
  const [isCreateCartOpen, setIsCreateCartOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  // Share State
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<CartRole>("viewer");
  const [copyLinkText, setCopyLinkText] = React.useState("Copy link");

  const activeCartName =
    carts.find((c) => c.id === activeCartId)?.name ?? "Shopping Cart";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // Extra safety check
    if (!canManageItems) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Extra safety check
    if (!canManageItems) return;

    const { active, over } = event;
    setActiveId(null);
    if (!over || !rootNodes) return;
    const activeNodeId = active.id as string;
    const overId = over.id as string;

    if (overId === "root-droppable") {
      moveNode(activeNodeId, null, rootNodes.length);
      return;
    }

    if (overId.startsWith("folder-droppable-")) {
      const targetFolderId = overId.replace("folder-droppable-", "");
      const folderContext = findNodeContext(rootNodes, targetFolderId);
      if (folderContext) {
        const targetFolder = folderContext.siblings[folderContext.index];
        if (targetFolder.type === "folder") {
          moveNode(
            activeNodeId,
            targetFolderId,
            targetFolder.children?.length || 0
          );
        }
      }
      return;
    }

    if (activeNodeId !== overId) {
      const overContext = findNodeContext(rootNodes, overId);
      if (overContext) {
        const { parentId, index: overIndex } = overContext;
        const activeContext = findNodeContext(rootNodes, activeNodeId);
        let newIndex = overIndex;
        if (
          activeContext?.parentId === parentId &&
          activeContext.index < overIndex
        ) {
          newIndex = overIndex;
        }
        moveNode(activeNodeId, parentId, newIndex);
      }
    }
  };

  const handleInvite = async () => {
    if (inviteEmail.trim()) {
      try {
        await addCollaborator(inviteEmail, inviteRole);
        setInviteEmail("");
      } catch (e) {
        console.error("Failed to invite", e);
      }
    }
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopyLinkText("Copied!");
    setTimeout(() => setCopyLinkText("Copy link"), 2000);
  };

  const activeNode = activeId ? findActiveNode(rootNodes, activeId) : null;
  const rootIds = rootNodes?.map((node) => node.id) ?? [];

  if (isLoading) {
    return (
      <div className={cn("flex h-full w-80 flex-col p-4", className)}>
        Loading...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className={cn("flex h-full w-80 flex-col", className)}>
        {/* HEADER SECTION */}
        <div className="flex flex-col gap-3 border-b p-4">
          {/* Top Row: Title, Avatars, Share */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Cart</h2>

            <div className="flex items-center gap-3">
              {/* Face Pile */}
              <div className="flex -space-x-2 overflow-hidden">
                {collaborators.slice(0, 3).map((user) => (
                  <UserAvatar
                    key={user.id}
                    name={user.name}
                    src={user.avatarUrl}
                  />
                ))}
                {collaborators.length > 3 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[10px] font-medium text-gray-600">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>

              {/* Share Dialog */}
              <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <LinkIcon />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share "{activeCartName}"</DialogTitle>
                  </DialogHeader>

                  {/* Invite Section (Only for admins) */}
                  {canManageUsers && (
                    <div className="flex gap-2 py-4">
                      <Input
                        placeholder="Add people via email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 rounded-md bg-gray-50 focus:bg-white"
                      />
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as CartRole)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="contributor">
                            Contributor
                          </SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => void handleInvite()}
                        disabled={!inviteEmail}
                      >
                        Send
                      </Button>
                    </div>
                  )}

                  {/* Users List Section */}
                  <div className="flex flex-col gap-4">
                    <div className="flex max-h-[200px] flex-col gap-4 overflow-y-auto pr-1">
                      <Label className="text-xs font-semibold text-gray-500">
                        People with access
                      </Label>
                      {collaborators.map((user) => {
                        const isMe = user.id === currentUserId;
                        const isEditable = canManageUsers && !isMe;

                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={user.name}
                                src={user.avatarUrl}
                                className="h-9 w-9"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm leading-none font-medium">
                                  {user.name}{" "}
                                  {isMe && (
                                    <span className="text-gray-400">(you)</span>
                                  )}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {user.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center">
                              {!isEditable ? (
                                <span className="text-muted-foreground px-3 text-sm capitalize">
                                  {user.role === "admin" ? "Owner" : user.role}
                                </span>
                              ) : (
                                <RoleSelect
                                  value={user.role}
                                  onChange={(newRole) =>
                                    void updateCollaboratorRole(
                                      user.id,
                                      newRole
                                    )
                                  }
                                  onRemove={() =>
                                    void removeCollaborator(user.id)
                                  }
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Separator />

                    {/* General Access / Link Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                          <GlobeIcon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            General access
                          </span>
                          <span className="text-muted-foreground text-xs">
                            Restricted to added users
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={handleCopyLink}
                      >
                        {copyLinkText === "Copied!" ? (
                          <CheckIcon className="h-3 w-3" />
                        ) : (
                          <LinkIcon className="h-3 w-3" />
                        )}
                        {copyLinkText}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Cart Selection Row */}
          <div className="flex gap-2">
            <Select
              value={activeCartId ?? undefined}
              onValueChange={setActiveCartId}
            >
              <SelectTrigger className="flex-1 bg-gray-50">
                <SelectValue placeholder="Select Cart" />
              </SelectTrigger>
              <SelectContent>
                {carts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isCreateCartOpen} onOpenChange={setIsCreateCartOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="bg-gray-50">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Cart</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="name">Cart Name</Label>
                  <Input
                    id="name"
                    value={newCartName}
                    onChange={(e) => setNewCartName(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (newCartName.trim()) {
                        createCart(newCartName);
                        setNewCartName("");
                        setIsCreateCartOpen(false);
                      }
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* CART BODY */}
        <RootDroppable className="flex max-h-[65dvh] flex-1 flex-col gap-y-4 overflow-x-clip overflow-y-auto px-1 py-4">
          {!rootNodes || rootNodes.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center">
              Your cart is empty.
            </p>
          ) : (
            <SortableContext
              items={rootIds}
              strategy={verticalListSortingStrategy}
            >
              {rootNodes.map((node) => (
                <SortableNode
                  key={node.id}
                  node={node}
                  disabled={!canManageItems}
                />
              ))}
            </SortableContext>
          )}
        </RootDroppable>

        {/* FOOTER */}
        <div className="border-t bg-gray-50/50 p-4">
          <div className="flex gap-2">
            <Button
              onClick={() => createFolder("New Folder")}
              variant="outline"
              className="flex-1"
              disabled={!canManageItems}
            >
              <PlusIcon className="mr-2 h-4 w-4" /> Add Folder
            </Button>
            <TagManager disabled={!canManageItems} />
          </div>
          <Button className="mt-4 w-full" disabled={!canManageItems}>
            Checkout
          </Button>
        </div>
      </div>

      <DragOverlay>
        {activeNode ? (
          <div className="cursor-grabbing opacity-90">
            {activeNode.type === "folder" ? (
              <CartFolderComponent
                folder={activeNode}
                disabled={!canManageItems}
              />
            ) : (
              <CartItemComponent item={activeNode} />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
