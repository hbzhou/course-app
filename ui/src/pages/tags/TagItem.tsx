import { memo } from "react";
import { Button } from "@/common/Button";
import { Tag } from "@/types/tag";
import { Edit, Trash2 } from "lucide-react";

interface TagItemProps extends Tag {
  onEdit: (tag: Tag) => void;
  onRemove: (tag: Tag) => void;
  isRemoving?: boolean;
  canEdit?: boolean;
}

const TagItem = ({ id, name, color, onEdit, onRemove, isRemoving = false, canEdit = true }: TagItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-lift group transition-colors-fast">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className="h-5 w-5 rounded-full flex-shrink-0 border-2 border-white shadow-sm transition-transform group-hover:scale-110 block"
          style={{ backgroundColor: color }}
          title={color}
        />
        <div className="min-w-0">
          <span className="font-medium text-sm group-hover:text-primary transition-colors-fast block truncate">{name}</span>
        <span className="text-xs text-muted-foreground font-mono">{color}</span>
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-2 ml-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit({ id, name, color })}
            className="gap-1.5 transition-colors-fast"
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove({ id, name, color })}
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

export default memo(TagItem);
