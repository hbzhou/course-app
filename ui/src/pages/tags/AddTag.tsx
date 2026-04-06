import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";

const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #3b82f6)"),
});

export type AddTagFormValues = z.infer<typeof tagSchema>;

interface AddTagProps {
  onSubmit: (values: AddTagFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialValues?: Partial<AddTagFormValues>;
}

export type AddTagHandle = {
  submit: () => void;
  reset: () => void;
};

const AddTag = forwardRef<AddTagHandle, AddTagProps>(
  ({ onSubmit, isSubmitting = false, submitError = null, initialValues }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      watch,
      formState: { errors },
    } = useForm<AddTagFormValues>({
      resolver: zodResolver(tagSchema),
      defaultValues: {
        name: initialValues?.name ?? "",
        color: initialValues?.color ?? "#3b82f6",
      },
    });

    useEffect(() => {
      reset({
        name: initialValues?.name ?? "",
        color: initialValues?.color ?? "#3b82f6",
      });
    }, [initialValues?.name, initialValues?.color, reset]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () => handleSubmit(onSubmit)(),
        reset: () =>
          reset({
            name: initialValues?.name ?? "",
            color: initialValues?.color ?? "#3b82f6",
          }),
      }),
      [handleSubmit, onSubmit, reset, initialValues?.name, initialValues?.color]
    );

    const colorValue = watch("color");

    return (
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="tag-name">Tag Name</Label>
          <Input
            id="tag-name"
            placeholder="Enter tag name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            disabled={isSubmitting}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tag-color">Color</Label>
          <div className="flex items-center gap-3">
            <input
              id="tag-color"
              type="color"
              aria-invalid={Boolean(errors.color)}
              disabled={isSubmitting}
              className="h-10 w-14 rounded-md border border-input cursor-pointer p-1 bg-background"
              {...register("color")}
            />
            <Input
              placeholder="#3b82f6"
              value={colorValue}
              readOnly
              className="w-32 font-mono text-sm"
              tabIndex={-1}
            />
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: colorValue }}
            >
              Preview
            </span>
          </div>
          {errors.color && (
            <p className="text-sm text-destructive" role="alert">
              {errors.color.message}
            </p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}
      </form>
    );
  }
);

AddTag.displayName = "AddTag";

export default AddTag;
