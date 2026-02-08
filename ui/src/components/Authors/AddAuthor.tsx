import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";

const authorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
});

export type AddAuthorFormValues = z.infer<typeof authorSchema>;

interface AddAuthorProps {
  onSubmit: (values: AddAuthorFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialValues?: Partial<AddAuthorFormValues>;
}

export type AddAuthorHandle = {
  submit: () => void;
  reset: () => void;
};

const AddAuthor = forwardRef<AddAuthorHandle, AddAuthorProps>(
  ({ onSubmit, isSubmitting = false, submitError = null, initialValues }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors },
    } = useForm<AddAuthorFormValues>({
      resolver: zodResolver(authorSchema),
      defaultValues: { name: initialValues?.name ?? "" },
    });

    useEffect(() => {
      reset({ name: initialValues?.name ?? "" });
    }, [initialValues?.name, reset]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () => handleSubmit(onSubmit)(),
        reset: () => reset({ name: initialValues?.name ?? "" }),
      }),
      [handleSubmit, onSubmit, reset, initialValues?.name]
    );

    return (
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="author-name">Author Name</Label>
          <Input
            id="author-name"
            placeholder="Enter author name"
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
        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}
      </form>
    );
  }
);

AddAuthor.displayName = "AddAuthor";

export default AddAuthor;
