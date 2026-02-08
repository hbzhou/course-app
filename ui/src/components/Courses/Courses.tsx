import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/common/Button";
import CourseCard from "./CourseCard";
import SearchBar from "./SearchBar";
import { useCourses } from "@/hooks/useCourses";
import { useAuthors } from "@/hooks/useAuthors";
import { Course } from "@/types/course";

const Courses: React.FC = () => {
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
      <main className="container mx-auto p-6">
        <div className="text-center py-12 text-muted-foreground">
          Loading courses...
        </div>
      </main>
    );
  }

  if (coursesError) {
    return (
      <main className="container mx-auto p-6">
        <div className="text-center py-12 text-destructive">
          Error loading courses: {coursesError.message}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <SearchBar handleSearch={handleSearch} />
        <Button onClick={() => navigate("/courses/add")}>
          Add New Course
        </Button>
      </div>
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course: Course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No courses found
        </div>
      )}
    </main>
  );
};

export default Courses;
