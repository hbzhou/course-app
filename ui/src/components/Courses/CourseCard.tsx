import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/common/Card";
import { Course } from "@/types/course";
import { Clock, Calendar, Users } from "lucide-react";

const CourseCard: React.FC<Course> = ({ id, title, description, duration, creationDate, authors, tags }) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="line-clamp-3">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium">Authors:</span>
          <span>{authors.map((author)=> author.name).join(", ")}</span>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-medium">Duration:</span>
          <span>{duration} hours</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">Created:</span>
          <span>{creationDate}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => navigate(`/courses/${id}`)}>
          View Course
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CourseCard;
