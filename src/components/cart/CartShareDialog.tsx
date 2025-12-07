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
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckIcon, GlobeIcon, LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { UserAvatar } from "@/components/cart/Cart.tsx";

interface CartShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                        {isMe && <span className="text-gray-400">(you)</span>}
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
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
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
  );
}
