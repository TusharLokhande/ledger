import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import type { ApiError } from "@/types/apiError.types";
import { ErrorStatus } from "@/types/errorStatus.enum";
import { accountFormSchema } from "@/features/accounts/schemas/account.schema";
import type { AccountDto, AccountFormValues } from "@/features/accounts/types/account.types";
import { AccountTypePicker } from "@/features/accounts/components/AccountTypePicker";
import { useCreateAccount } from "@/features/accounts/hooks/mutations/useCreateAccount";
import { useUpdateAccount } from "@/features/accounts/hooks/mutations/useUpdateAccount";

const emptyValues: AccountFormValues = { name: "", accountType: "Bank", institution: "", openingBalance: Number.NaN };

interface AccountFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited; null/undefined means "add". */
  account?: AccountDto | null;
}

export function AccountFormSheet({ open, onOpenChange, account }: AccountFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <AccountForm account={account} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function AccountForm({ account, onDone }: { account?: AccountDto | null; onDone: () => void }) {
  const isEdit = !!account;
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: account
      ? { name: account.name, accountType: account.accountType, institution: account.institution ?? "", openingBalance: account.openingBalance ?? Number.NaN }
      : emptyValues,
  });

  const isFund = useWatch({ control, name: "accountType" }) === "EmergencyFund";

  const onSubmit = handleSubmit((form) => {
    // Only an emergency fund keeps an opening balance; blank or another type sends 0, which the server stores as none.
    const values = { ...form, openingBalance: isFund && !Number.isNaN(form.openingBalance) ? form.openingBalance : 0 };
    const options = {
      onSuccess: () => {
        toast.success(isEdit ? "Account updated." : "Account added.");
        onDone();
      },
      onError: (error: unknown) => {
        const apiError = error as ApiError;
        if (apiError.status === ErrorStatus.Duplicate) setError("name", { message: apiError.message });
      },
    };
    if (isEdit) updateMutation.mutate({ id: account.id, ...values }, options);
    else createMutation.mutate(values, options);
  });

  const apiError = mutation.error as ApiError | null;
  const formError = apiError && apiError.status !== ErrorStatus.Duplicate ? apiError.message : null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit account" : "Add account"}</SheetTitle>
        <SheetDescription>Where your money is kept or owed.</SheetDescription>
      </SheetHeader>

      <form id="account-form" onSubmit={onSubmit} noValidate className="grid flex-1 content-start gap-5 overflow-y-auto px-4 pb-4">
        <div className="grid gap-1.5">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            className="h-9"
            autoFocus
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "account-name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="account-name-error" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Type</span>
          <Controller
            control={control}
            name="accountType"
            render={({ field }) => (
              <AccountTypePicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {isFund && (
          <div className="grid gap-1.5">
            <Label htmlFor="account-opening">
              Already saved <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="account-opening"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              className="h-9 tabular-nums"
              placeholder="0"
              aria-invalid={!!errors.openingBalance}
              aria-describedby={errors.openingBalance ? "account-opening-error" : "account-opening-hint"}
              {...register("openingBalance", { valueAsNumber: true })}
            />
            {errors.openingBalance ? (
              <p id="account-opening-error" className="text-xs text-destructive">
                {errors.openingBalance.message}
              </p>
            ) : (
              <p id="account-opening-hint" className="text-xs text-muted-foreground">
                What was in this fund before you started tracking. Counts toward your total saved on Home.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="account-institution">
            Institution <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="account-institution"
            className="h-9"
            placeholder="e.g. HDFC Bank"
            aria-invalid={!!errors.institution}
            aria-describedby={errors.institution ? "account-institution-error" : undefined}
            {...register("institution")}
          />
          {errors.institution && (
            <p id="account-institution-error" className="text-xs text-destructive">
              {errors.institution.message}
            </p>
          )}
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
        <Button type="submit" form="account-form" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </>
  );
}
