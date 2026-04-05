import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import CourseCard from "./CourseCard";
import SearchBar from "./SearchBar";
import { useCourses } from "@/hooks/useCourses";
import { useAuthors } from "@/hooks/useAuthors";
import { Course } from "@/types/course";
import { CourseGridSkeleton } from "@/common/Skeleton";
import { AlertCircle, Plus } from "lucide-react";

const Courses = () => {
  const [keyword, setKeyword] = useState<string>("");
  const navigate = useNavigate();
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useCourses();
  const { isLoading: authorsLoading } = useAuthors();

  const handleSearch = (keyword: string) => {
    setKeyword(keyword);
  };

  const filteredCourses = courses.filter((course: Course) => course.title.toLowerCase().indexOf(keyword.toLowerCase()) > -1);

  if (coursesLoading || authorsLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
          <p className="text-muted-foreground">Exploring available courses</p>
        </div>
        <CourseGridSkeleton count={6} />
      </main>
    );
  }

  if (coursesError) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 animate-slideUp">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive">Error loading courses</h3>
              <p className="text-sm text-destructive/90 mt-1">{coursesError.message}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
            <p className="text-muted-foreground">{filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} available</p>
          </div>
          <Button onClick={() => navigate("/courses/add")} className="gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add New Course
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <SearchBar handleSearch={handleSearch} />
      </div>

      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: Course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12 text-center animate-slideUp">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              {keyword ? "Try adjusting your search criteria" : "Get started by creating your first course"}
            </p>
            {!keyword && (
              <Button onClick={() => navigate("/courses/add")} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Course
              </Button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default Courses;
