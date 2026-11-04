import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { CurrencySelect } from "@/components/CurrencySelect";
import { useAuthStore } from "@/store/authStore";
import type { ApiError } from "@/types/apiError.types";
import { updateCurrencySchema } from "@/features/settings/schemas/settings.schema";
import type { UpdateCurrencyRequest } from "@/features/settings/types/settings.types";
import { useUpdateCurrency } from "@/features/settings/hooks/mutations/useUpdateCurrency";

export function SettingsPage() {
  const currentCode = useAuthStore((s) => s.user?.currencyCode ?? "INR");
  const updateMutation = useUpdateCurrency();
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateCurrencyRequest>({
    resolver: zodResolver(updateCurrencySchema),
    values: { currencyCode: currentCode },
  });

  const onSubmit = handleSubmit((values) =>
    updateMutation.mutate(values, {
      onSuccess: (user) => {
        reset({ currencyCode: user.currencyCode });
        toast.success(`Currency changed to ${user.currencyCode}.`);
      },
    }),
  );
  const serverError = (updateMutation.error as ApiError | null)?.message;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="font-heading text-xl font-semibold text-foreground">Settings</h1>

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-1.5">
          <Label htmlFor="currencyCode">Currency</Label>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <CurrencySelect
                id="currencyCode"
                value={field.value}
                onChange={field.onChange}
                aria-invalid={!!errors.currencyCode}
                aria-describedby="currencyCode-help"
              />
            )}
          />
          <p id="currencyCode-help" className={errors.currencyCode ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {errors.currencyCode?.message ?? "Changing currency only changes how amounts are labelled. Nothing is converted."}
          </p>
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <div>
          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
