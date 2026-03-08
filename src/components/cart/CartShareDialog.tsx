import { authClient } from "@/lib/auth-client";
import { useCart } from "@/contexts/useCartContext.ts";
import * as React from "react";
import type { CartRole } from "@/db/schema.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, GlobeIcon, LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { UserAvatar } from "@/components/cart/Cart.tsx";
import { toast } from "sonner";

interface CartShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoleSelect = ({
  value,
  onChange,
  onRemove,
  disabled,
  ariaLabel
}: {
  value: CartRole;
  onChange: (v: CartRole) => void;
  onRemove?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) => (
  <Select
    value={value}
    onValueChange={(v) => onChange(v as CartRole)}
    disabled={disabled}
  >
    <SelectTrigger
      className="h-8 w-[110px] border-none bg-transparent font-medium text-gray-600 shadow-none hover:bg-gray-100 focus:ring-0"
      aria-label={ariaLabel ?? "Select role"}
    >
      <SelectValue />
    </SelectTrigger>
    <SelectContent align="end">
      <SelectItem value="viewer">Viewer</SelectItem>
      <SelectItem value="contributor">Contributor</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
      {!disabled && onRemove && <Separator className="my-1" />}
      {!disabled && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-full cursor-pointer px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
        >
          Remove access
        </button>
      )}
    </SelectContent>
  </Select>
);

export function CartShareDialog({ open, onOpenChange }: CartShareDialogProps) {
  const {
    activeCart,
    addCollaborator,
    canManageUsers,
    collaborators,
    updateCollaboratorRole,
    removeCollaborator
  } = useCart();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  // Share State
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<CartRole>("viewer");
  const [copyLinkText, setCopyLinkText] = React.useState("Copy link");

  const activeCartName = activeCart?.name ?? "Current Cart";

  const handleInvite = async () => {
    if (inviteEmail.trim()) {
      try {
        await addCollaborator(inviteEmail.trim(), inviteRole);
        setInviteEmail("");
      } catch (e) {
        console.error("Failed to invite", e);
        toast("Failed to invite collaborator");
      }
    }
  };

  const handleCopyLink = () => {
    toast("This feature is not implemented yet. \t\\(°Ω°)/");
    setCopyLinkText("Copied!");
    setTimeout(() => setCopyLinkText("Copy link"), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <LinkIcon aria-hidden="true" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{activeCartName}"</DialogTitle>
          <DialogDescription className="sr-only">
            Manage who has access to this cart. Invite new collaborators or
            change existing permissions.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Section (Only for admins) */}
        {canManageUsers && (
          <div className="flex gap-2 py-4">
            <Input
              aria-label="Email address to invite"
              placeholder="Add people via email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-md bg-gray-50 focus:bg-white"
            />
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as CartRole)}
            >
              <SelectTrigger
                className="w-[100px]"
                aria-label="Role for new collaborator"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => void handleInvite()} disabled={!inviteEmail}>
              Send
            </Button>
          </div>
        )}

        {/* Users List Section */}
        <div className="flex flex-col gap-4">
          <div className="flex max-h-[200px] flex-col gap-4 overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold text-gray-500">
              People with access
            </h3>
            {collaborators.map((user) => {
              const isMe = user.user_id === currentUserId;
              const isEditable = canManageUsers && !isMe;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                  aria-labelledby={`user-name-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={user.name}
                      src={user.avatarUrl}
                      className="h-9 w-9"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col">
                      <span
                        id={`user-name-${user.id}`}
                        className="text-sm leading-none font-medium"
                      >
                        {user.name}
                        {isMe && (
                          <span className="font font-normal text-gray-600">
                            {" "}
                            (you)
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        <span className="sr-only">Email: </span>
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
                        ariaLabel={`Change role for ${user.name}`}
                        value={user.role}
                        onChange={(newRole) =>
                          void updateCollaboratorRole(user.id, newRole)
                        }
                        onRemove={() => void removeCollaborator(user.id)}
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
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                aria-hidden="true"
              >
                <GlobeIcon className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">General access</span>
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
                <CheckIcon className="h-3 w-3" aria-hidden="true" />
              ) : (
                <LinkIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {copyLinkText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
