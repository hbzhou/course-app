import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { Course } from "@/types/course";
import { Author } from "@/types/author";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/Card";
import { Button } from "@/common/Button";
import { Clock, Calendar, Users, ArrowLeft } from "lucide-react";

const CourseInfo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: courses = [], isLoading, error } = useCourses();
  const course = courses.find((course: Course) => course.id === id);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading course...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading course: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Course not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/courses")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{course.title}</CardTitle>
          <CardDescription className="text-base mt-4">{course.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Duration</p>
                  <p className="text-muted-foreground">{course.duration} hours</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Created</p>
                  <p className="text-muted-foreground">{course.creationDate}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-2">Authors</p>
                <div className="flex flex-wrap gap-2">
                  {course.authors.map((author: Author) => (
                    <span
                      key={author.id}
                      className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                    >
                      {author.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">Course ID:</span> {course.id}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseInfo;
