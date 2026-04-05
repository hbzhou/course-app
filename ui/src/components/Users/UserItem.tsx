import { Button } from "@/common/Button";
import { ManagedUser } from "@/types/managed-user";
import { Edit, Trash2, Mail, User } from "lucide-react";

interface UserItemProps extends ManagedUser {
  onEdit: (user: ManagedUser) => void;
  onRemove: (user: ManagedUser) => void;
  isRemoving?: boolean;
}

const UserItem = ({ id, username, email, roles, onEdit, onRemove, isRemoving = false }: UserItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-lift group transition-colors-fast">
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors-fast">{username}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {roles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20"
            >
              {role.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2 ml-3 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit({ id, username, email, roles })}
          disabled={isRemoving}
          className="gap-1.5 transition-colors-fast"
        >
          <Edit className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove({ id, username, email, roles })}
          disabled={isRemoving}
          className="gap-1.5 transition-colors-fast"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isRemoving ? "Removing" : "Remove"}</span>
        </Button>
      </div>
    </div>
  );
};

export default UserItem;
