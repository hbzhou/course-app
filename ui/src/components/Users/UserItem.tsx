import React from "react";
import { Button } from "@/common/Button";
import { ManagedUser } from "@/types/managed-user";
import { Edit, Trash2, Mail, User } from "lucide-react";

interface UserItemProps extends ManagedUser {
  onEdit: (user: ManagedUser) => void;
  onRemove: (user: ManagedUser) => void;
  isRemoving?: boolean;
}

const UserItem: React.FC<UserItemProps> = ({
  id,
  username,
  email,
  roles,
  onEdit,
  onRemove,
  isRemoving = false,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{username}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>{email}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {role.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit({ id, username, email, roles })}
          disabled={isRemoving}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove({ id, username, email, roles })}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {isRemoving ? "Removing" : "Remove"}
        </Button>
      </div>
    </div>
  );
};

export default UserItem;
