import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/common/Input";
import { Label } from "@/common/Label";
import { Role } from "@/types/managed-user";
import Select from "react-select";

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must contain at least 3 characters")
    .max(50, "Username must not exceed 50 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .min(5, "Email must contain at least 5 characters"),
  password: z
    .string()
    .min(6, "Password must contain at least 6 characters")
    .optional()
    .or(z.literal("")),
  roles: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .min(1, "At least one role must be selected"),
});

export type AddUserFormValues = z.infer<typeof userSchema>;

interface AddUserProps {
  onSubmit: (values: AddUserFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitError?: string | null;
  initialValues?: Partial<AddUserFormValues>;
  availableRoles: Role[];
  mode: "add" | "edit";
}

export type AddUserHandle = {
  submit: () => void;
  reset: () => void;
};

const AddUser = forwardRef<AddUserHandle, AddUserProps>(
  ({ onSubmit, isSubmitting = false, submitError = null, initialValues, availableRoles, mode }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      control,
      formState: { errors },
    } = useForm<AddUserFormValues>({
      resolver: zodResolver(userSchema),
      defaultValues: {
        username: initialValues?.username ?? "",
        email: initialValues?.email ?? "",
        password: "",
        roles: initialValues?.roles ?? [],
      },
    });

    useEffect(() => {
      reset({
        username: initialValues?.username ?? "",
        email: initialValues?.email ?? "",
        password: "",
        roles: initialValues?.roles ?? [],
      });
    }, [initialValues, reset]);

    useImperativeHandle(
      ref,
      () => ({
        submit: () => handleSubmit(onSubmit)(),
        reset: () =>
          reset({
            username: initialValues?.username ?? "",
            email: initialValues?.email ?? "",
            password: "",
            roles: initialValues?.roles ?? [],
          }),
      }),
      [handleSubmit, onSubmit, reset, initialValues]
    );

    const roleOptions = availableRoles.map((role) => ({
      value: role.id,
      label: role.name,
    }));

    return (
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="user-username">Username</Label>
          <Input
            id="user-username"
            placeholder="Enter username"
            autoComplete="off"
            aria-invalid={Boolean(errors.username)}
            disabled={isSubmitting}
            {...register("username")}
          />
          {errors.username && (
            <p className="text-sm text-destructive" role="alert">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="Enter email address"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-password">
            Password {mode === "edit" && "(Leave blank to keep current)"}
          </Label>
          <Input
            id="user-password"
            type="password"
            placeholder={mode === "add" ? "Enter password" : "Enter new password (optional)"}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-roles">Roles</Label>
          <Controller
            name="roles"
            control={control}
            render={({ field }) => (
              <Select
                inputId="user-roles"
                isMulti
                options={roleOptions}
                value={roleOptions.filter((opt) =>
                  field.value?.some((role) => role.id === opt.value)
                )}
                onChange={(selected) => {
                  const selectedRoles = selected.map((opt) => ({
                    id: opt.value,
                    name: opt.label,
                  }));
                  field.onChange(selectedRoles);
                }}
                isDisabled={isSubmitting}
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select roles..."
              />
            )}
          />
          {errors.roles && (
            <p className="text-sm text-destructive" role="alert">
              {errors.roles.message}
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

AddUser.displayName = "AddUser";

export default AddUser;
