import { format } from "date-fns";
import { Controller, useForm, useWatch, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select } from "@/ui/select";
import { Textarea } from "@/ui/textarea";
import { DatePicker } from "@/components/DatePicker";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import { getCurrencyDecimals } from "@/lib/currency";
import type { ApiError } from "@/types/apiError.types";
import { ErrorStatus } from "@/types/errorStatus.enum";
import { CategoryIcon, useCategoryOptions } from "@/features/categories";
import { useAccountOptions } from "@/features/accounts";
import { transactionFormSchema } from "@/features/transactions/schemas/transaction.schema";
import { transactionTypeOptions } from "@/features/transactions/constants/transactionTypes";
import type { SaveTransactionRequest, TransactionDto, TransactionFormValues } from "@/features/transactions/types/transaction.types";
import { useCreateTransaction } from "@/features/transactions/hooks/mutations/useCreateTransaction";
import { useUpdateTransaction } from "@/features/transactions/hooks/mutations/useUpdateTransaction";

/** Selected type colours: expense red, income green, transfer Ocean Blue. */
const typeTone = { Expense: "bg-destructive-subtle text-destructive", Income: "bg-success-subtle text-success", Transfer: "bg-accent text-accent-foreground" };

interface Option {
  value: string;
  label: string;
  icon?: string;
  color?: string;
}

const today = () => format(new Date(), "yyyy-MM-dd");
const portal = { menuPortalTarget: typeof document !== "undefined" ? document.body : null } as const;

function toRequest(v: TransactionFormValues): SaveTransactionRequest {
  const transfer = v.transactionType === "Transfer";
  return {
    transactionDate: v.transactionDate,
    transactionType: v.transactionType,
    amount: v.amount,
    accountId: v.accountId,
    toAccountId: transfer ? v.toAccountId : null,
    categoryId: transfer ? null : v.categoryId,
    note: v.note.trim() || null,
  };
}

/** Puts server validation errors (keyed by camelCase field) onto the matching inputs. */
function applyServerErrors(error: unknown, setError: UseFormSetError<TransactionFormValues>): boolean {
  const apiError = error as ApiError;
  if (apiError.status !== ErrorStatus.ValidationError || !apiError.errors) return false;
  for (const [field, messages] of Object.entries(apiError.errors))
    setError(field as keyof TransactionFormValues, { message: messages[0] });
  return true;
}

interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited; null means "add". */
  transaction: TransactionDto | null;
}

export function TransactionFormSheet({ open, onOpenChange, transaction }: TransactionFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <TransactionForm transaction={transaction} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

function TransactionForm({ transaction, onDone }: { transaction: TransactionDto | null; onDone: () => void }) {
  const isEdit = !!transaction;
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const mutation = isEdit ? updateMutation : createMutation;
  const { data: accounts = [] } = useAccountOptions();
  const { data: categories = [] } = useCategoryOptions();
  const decimals = getCurrencyDecimals();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction
      ? {
          transactionDate: transaction.transactionDate,
          transactionType: transaction.transactionType,
          amount: transaction.amount,
          accountId: transaction.accountId,
          toAccountId: transaction.toAccountId ?? "",
          categoryId: transaction.categoryId ?? "",
          note: transaction.note ?? "",
        }
      : { transactionDate: today(), transactionType: "Expense", amount: Number.NaN, accountId: "", toAccountId: "", categoryId: "", note: "" },
  });
  const type = useWatch({ control, name: "transactionType" });
  const isTransfer = type === "Transfer";

  // Archived accounts/categories aren't offered, but an existing transaction keeps showing its own.
  const accountOptions: Option[] = accounts.map((a) => ({ value: a.id, label: a.name }));
  if (transaction && !accounts.some((a) => a.id === transaction.accountId))
    accountOptions.push({ value: transaction.accountId, label: transaction.accountName });
  if (transaction?.toAccountId && !accounts.some((a) => a.id === transaction.toAccountId))
    accountOptions.push({ value: transaction.toAccountId, label: transaction.toAccountName ?? "" });

  const categoryOptions: Option[] = categories
    .filter((c) => c.categoryType === (type === "Income" ? "Income" : "Expense"))
    .map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color }));
  if (transaction?.categoryId && transaction.transactionType === type && !categories.some((c) => c.id === transaction.categoryId))
    categoryOptions.push({ value: transaction.categoryId, label: transaction.categoryName ?? "", icon: transaction.categoryIcon ?? "", color: transaction.categoryColor ?? "#57534e" });

  const save = (addAnother: boolean) =>
    handleSubmit((values) => {
      const onError = (error: unknown) => {
        if (!applyServerErrors(error, setError)) toast.error((error as ApiError).message);
      };
      if (isEdit) {
        updateMutation.mutate(
          { id: transaction.id, ...toRequest(values) },
          { onSuccess: () => (toast.success("Transaction updated."), onDone()), onError },
        );
        return;
      }
      createMutation.mutate(toRequest(values), {
        onSuccess: () => {
          toast.success("Transaction added.");
          if (!addAnother) return onDone();
          // Keep what repeats across a run of entries; clear what changes each time.
          reset({ ...values, amount: Number.NaN, categoryId: "", note: "" });
          setTimeout(() => setFocus("amount"));
        },
        onError,
      });
    });

  return (
    <>
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit transaction" : "Add transaction"}</SheetTitle>
        <SheetDescription>{isTransfer ? "Move money between your accounts." : "Money in or out of an account."}</SheetDescription>
      </SheetHeader>

      <form id="transaction-form" onSubmit={save(false)} noValidate className="grid flex-1 content-start gap-5 overflow-y-auto px-4 pb-4">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Type</span>
          <Controller
            control={control}
            name="transactionType"
            render={({ field }) => (
              <SegmentedControl
                label="Type"
                value={field.value}
                options={[...transactionTypeOptions]}
                activeClassNames={typeTone}
                onChange={(next) => {
                  // The category list is per type; a hidden stale pick would be sent and rejected.
                  if (next !== field.value) setValue("categoryId", "");
                  field.onChange(next);
                }}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="transaction-date">Date</Label>
            <Controller
              control={control}
              name="transactionDate"
              render={({ field }) => (
                <DatePicker id="transaction-date" value={field.value || null} onChange={(v) => field.onChange(v ?? "")} aria-invalid={!!errors.transactionDate} />
              )}
            />
            <FieldError id="transaction-date" message={errors.transactionDate?.message} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="transaction-amount">Amount</Label>
            <Input
              id="transaction-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step={decimals === 0 ? 1 : 10 ** -decimals}
              className="h-9 tabular-nums"
              autoFocus
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "transaction-amount-error" : undefined}
              {...register("amount", { valueAsNumber: true })}
            />
            <FieldError id="transaction-amount" message={errors.amount?.message} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="transaction-account">{isTransfer ? "From account" : "Account"}</Label>
          <Controller
            control={control}
            name="accountId"
            render={({ field }) => (
              <Select<Option>
                inputId="transaction-account"
                options={accountOptions}
                value={accountOptions.find((o) => o.value === field.value) ?? null}
                onChange={(o) => field.onChange(o?.value ?? "")}
                aria-invalid={!!errors.accountId}
                placeholder="Choose an account"
                {...portal}
              />
            )}
          />
          <FieldError id="transaction-account" message={errors.accountId?.message} />
        </div>

        {isTransfer ? (
          <div className="grid gap-1.5">
            <Label htmlFor="transaction-to-account">To account</Label>
            <Controller
              control={control}
              name="toAccountId"
              render={({ field }) => (
                <Select<Option>
                  inputId="transaction-to-account"
                  options={accountOptions}
                  value={accountOptions.find((o) => o.value === field.value) ?? null}
                  onChange={(o) => field.onChange(o?.value ?? "")}
                  aria-invalid={!!errors.toAccountId}
                  placeholder="Choose an account"
                  {...portal}
                />
              )}
            />
            <FieldError id="transaction-to-account" message={errors.toAccountId?.message} />
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="transaction-category">Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select<Option>
                  inputId="transaction-category"
                  options={categoryOptions}
                  value={categoryOptions.find((o) => o.value === field.value) ?? null}
                  onChange={(o) => field.onChange(o?.value ?? "")}
                  aria-invalid={!!errors.categoryId}
                  placeholder={type === "Income" ? "Choose an income category" : "Choose an expense category"}
                  noOptionsMessage={() => `No ${type.toLowerCase()} categories — add one under Masters → Categories.`}
                  formatOptionLabel={(o) => (
                    <span className="flex items-center gap-2">
                      <CategoryIcon icon={o.icon ?? ""} color={o.color ?? "#57534e"} className="size-5 rounded-md [&_svg]:size-3" />
                      {o.label}
                    </span>
                  )}
                  {...portal}
                />
              )}
            />
            <FieldError id="transaction-category" message={errors.categoryId?.message} />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="transaction-note">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea id="transaction-note" rows={2} aria-invalid={!!errors.note} {...register("note")} />
          <FieldError id="transaction-note" message={errors.note?.message} />
        </div>
      </form>

      <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        {!isEdit && (
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={save(true)}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit" form="transaction-form" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={`${id}-error`} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}
