import { Button } from "@/common/Button";
import { Tag } from "@/types/tag";
import { Edit, Trash2 } from "lucide-react";

interface TagItemProps extends Tag {
  onEdit: (tag: Tag) => void;
  onRemove: (tag: Tag) => void;
  isRemoving?: boolean;
}

const TagItem = ({
  id,
  name,
  color,
  onEdit,
  onRemove,
  isRemoving = false,
}: TagItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-4 w-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium">{name}</span>
        <span className="text-xs text-muted-foreground font-mono">{color}</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit({ id, name, color })}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove({ id, name, color })}
          disabled={isRemoving}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {isRemoving ? "Removing" : "Remove"}
        </Button>
      </div>
    </div>
  );
};

export default TagItem;
