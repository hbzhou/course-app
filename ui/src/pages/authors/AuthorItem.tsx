import { memo } from "react";
import { Button } from "@/common/Button";
import { Author } from "@/types/author";
import { Edit, Trash2 } from "lucide-react";

interface AuthorItemProps extends Author {
  onEdit: (author: Author) => void;
  onRemove: (author: Author) => void;
  isRemoving?: boolean;
  canEdit?: boolean;
}

const AuthorItem = ({ id, name, onEdit, onRemove, isRemoving = false, canEdit = true }: AuthorItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-lift group transition-colors-fast">
      <div className="font-semibold text-sm group-hover:text-primary transition-colors-fast flex-1 truncate">{name}</div>
      {canEdit && (
        <div className="flex gap-2 ml-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit({ id, name })}
            className="gap-1.5 transition-colors-fast"
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove({ id, name })}
            disabled={isRemoving}
            className="gap-1.5 transition-colors-fast"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isRemoving ? "Removing" : "Remove"}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default memo(AuthorItem);
