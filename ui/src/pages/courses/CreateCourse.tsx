import { SubmitHandler, useForm, Controller } from "react-hook-form";
import Select from "react-select";
import { Button } from "@/common/Button";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/Card";
import { Textarea } from "@/common/Textarea";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthors } from "@/hooks/useAuthors";
import { useTags } from "@/hooks/useTags";
import { useCreateCourse } from "@/hooks/useCourses";
import { Author } from "@/types/author";
import { Tag } from "@/types/tag";

type CreateCourseFormValues = {
  title: string;
  description: string;
  duration: number;
  authors: number[];
  tags: number[];
};

const CreateCourse = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateCourseFormValues>({
    defaultValues: {
      authors: [],
      tags: [],
    },
  });
  const navigator = useNavigate();
  const { data: authors = [] } = useAuthors();
  const { data: tags = [] } = useTags();
  const createCourseMutation = useCreateCourse();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit: SubmitHandler<CreateCourseFormValues> = async (data) => {
    try {
      setErrorMessage(null);
      const creationDate = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
      const courseData = {
        ...data,
        creationDate,
        authors: data.authors.map((authorId) => {
          const author = authors.find((a: Author) => a.id === authorId);
          return author || { id: authorId, name: '' };
        }),
        tags: data.tags.map((tagId) => {
          const tag = tags.find((t: Tag) => t.id === tagId);
          return tag || { id: tagId, name: "", color: "" };
        }),
        
      };
      await createCourseMutation.mutateAsync(courseData);
      navigator("/courses");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create course");
    }
  };

  const authorOptions = authors.map((author: Author) => {
    return { value: author.id, label: author.name };
  });

  const tagOptions = tags.map((tag: Tag) => ({
    value: tag.id,
    label: tag.name,
    color: tag.color,
  }));

  return (
    <main className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create New Course</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
                {errorMessage}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                placeholder="Enter course title"
                {...register("title", { required: true })}
              />
              {errors.title && <span className="text-sm text-destructive">This field is required</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="Enter duration in hours"
                {...register("duration", { required: true, valueAsNumber: true })}
              />
              {errors.duration && <span className="text-sm text-destructive">This field is required</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="authors">Authors</Label>
              <Controller
                control={control}
                name="authors"
                rules={{ required: true }}
                render={({ field: { onChange, value, ref } }) => (
                  <Select
                    ref={ref}
                    value={authorOptions.filter((c: { value: number; label: string }) => value.includes(c.value))}
                    onChange={(val) => onChange(val.map((c: { value: number; label: string }) => c.value))}
                    options={authorOptions}
                    isMulti
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                )}
              />
              {errors.authors && <span className="text-sm text-destructive">Please select at least one author</span>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Controller
                control={control}
                defaultValue={[]}
                name="tags"
                render={({ field: { onChange, value, ref } }) => (
                  <Select
                    ref={ref}
                    value={tagOptions.filter((t) => (value as unknown as number[])?.includes(t.value))}
                    onChange={(val) => onChange(val.map((t) => t.value))}
                    options={tagOptions}
                    isMulti
                    className="react-select-container"
                    classNamePrefix="react-select"
                    formatOptionLabel={(opt) => (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </div>
                    )}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Enter course description"
                {...register("description", { required: true })}
              />
              {errors.description && <span className="text-sm text-destructive">This field is required</span>}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator("/courses")}
                disabled={createCourseMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCourseMutation.isPending}>
                {createCourseMutation.isPending ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default CreateCourse;
