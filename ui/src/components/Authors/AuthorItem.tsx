import React from "react";
import { Button } from "@/common/Button";
import { Author } from "@/types/author";
import { Edit, Trash2 } from "lucide-react";

interface AuthorItemProps extends Author {
  onEdit: (author: Author) => void;
  onRemove: (author: Author) => void;
  isRemoving?: boolean;
}

const AuthorItem: React.FC<AuthorItemProps> = ({
  name,
  id,
  onEdit,
  onRemove,
  isRemoving = false,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="font-medium">{name}</div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit({ id, name })}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove({ id, name })}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {isRemoving ? "Removing" : "Remove"}
        </Button>
      </div>
    </div>
  );
};

export default AuthorItem;
