import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import type { ApiError } from "@/types/apiError.types";
import { ErrorStatus } from "@/types/errorStatus.enum";
import { categoryFormSchema } from "@/features/categories/schemas/category.schema";
import type { CategoryDto, CategoryFormValues } from "@/features/categories/types/category.types";
import { categoryIcons } from "@/features/categories/constants/categoryIcons";
import { categoryColors } from "@/features/categories/constants/categoryColors";
import { categoryTypeOptions } from "@/features/categories/constants/categoryTypes";
import { useCreateCategory } from "@/features/categories/hooks/mutations/useCreateCategory";
import { useUpdateCategory } from "@/features/categories/hooks/mutations/useUpdateCategory";
import { IconPicker } from "@/features/categories/components/IconPicker";
import { ColorPicker } from "@/features/categories/components/ColorPicker";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";

const typeTone = { Expense: "bg-destructive-subtle text-destructive", Income: "bg-success-subtle text-success" };

const emptyValues: CategoryFormValues = {
  name: "",
  categoryType: "Expense",
  icon: categoryIcons[0].name,
  color: categoryColors[0].value,
};

interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited; null/undefined means "add". */
  category?: CategoryDto | null;
}

export function CategoryFormSheet({ open, onOpenChange, category }: CategoryFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <CategoryForm category={category} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({ category, onDone }: { category?: CategoryDto | null; onDone: () => void }) {
  const isEdit = !!category;
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? { name: category.name, categoryType: category.categoryType, icon: category.icon, color: category.color }
      : emptyValues,
  });

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? "Category updated." : "Category added.");
        onDone();
      },
      onError: (error: unknown) => {
        const apiError = error as ApiError;
        if (apiError.status === ErrorStatus.Duplicate) setError("name", { message: apiError.message });
      },
    };
    if (isEdit) updateMutation.mutate({ id: category.id, ...values }, options);
    else createMutation.mutate(values, options);
  });

  const apiError = mutation.error as ApiError | null;
  const formError = apiError && apiError.status !== ErrorStatus.Duplicate ? apiError.message : null;
  const [icon, color, name] = useWatch({ control, name: ["icon", "color", "name"] });

  return (
    <>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit category" : "Add category"}</SheetTitle>
          <SheetDescription>Categories group your income and spending.</SheetDescription>
        </SheetHeader>

        <form id="category-form" onSubmit={onSubmit} noValidate className="grid flex-1 content-start gap-5 overflow-y-auto px-4 pb-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CategoryIcon icon={icon} color={color} className="size-9" />
            <span className="truncate text-sm font-medium text-foreground">{name.trim() || "New category"}</span>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              className="h-9"
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "category-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="category-name-error" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Type</span>
            <Controller
              control={control}
              name="categoryType"
              render={({ field }) => (
                <SegmentedControl label="Type" value={field.value} options={[...categoryTypeOptions]} activeClassNames={typeTone} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid gap-1.5">
            <span id="category-icon-label" className="text-sm font-medium">Icon</span>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <IconPicker labelId="category-icon-label" value={field.value} color={color} onChange={field.onChange} />
              )}
            />
          </div>

          <div className="grid gap-1.5">
            <span id="category-color-label" className="text-sm font-medium">Color</span>
            <Controller
              control={control}
              name="color"
              render={({ field }) => <ColorPicker labelId="category-color-label" value={field.value} onChange={field.onChange} />}
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>

        <SheetFooter className="flex-row justify-end border-t border-border">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
    </>
  );
}
