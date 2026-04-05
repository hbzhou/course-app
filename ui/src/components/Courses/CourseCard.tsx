import { useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/common/Card";
import { Course } from "@/types/course";
import { Clock, Calendar, Users, ArrowRight } from "lucide-react";

const CourseCard = ({ id, title, description, duration, creationDate, authors, tags }: Course) => {
  const navigate = useNavigate();

  return (
    <Card className="hover-lift group flex flex-col h-full overflow-hidden border transition-colors-fast hover:border-primary/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl group-hover:text-primary transition-colors-fast line-clamp-2">{title}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">Authors:</span>
          <span className="truncate">{authors.map((author) => author.name).join(", ")}</span>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white transition-colors-fast hover:opacity-90"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="pt-2 space-y-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Duration:</span>
            <span>{duration} hours</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Created:</span>
            <span>{creationDate}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button
          onClick={() => navigate(`/courses/${id}`)}
          className="w-full gap-2 transition-colors-fast"
          variant="default"
        >
          View Course
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
