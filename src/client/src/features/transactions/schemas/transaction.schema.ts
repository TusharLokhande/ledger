import { z } from "zod";
import { getCurrencyDecimals } from "@/lib/currency";

export const transactionTypeSchema = z.enum(["Expense", "Income", "Transfer"]);

/** Form values; ids are "" when not chosen. Amounts are major units (rupees, not paise). */
export const transactionFormSchema = z
  .object({
    transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    transactionType: transactionTypeSchema,
    amount: z.number({ message: "Enter an amount." }).positive("Amount must be greater than 0.").max(999_999_999_999, "Amount is too large."),
    accountId: z.string().min(1, "Choose an account."),
    toAccountId: z.string(),
    categoryId: z.string(),
    note: z.string().trim().max(500, "Note must be 500 characters or fewer."),
  })
  .superRefine((v, ctx) => {
    const decimals = getCurrencyDecimals();
    if (Number.isFinite(v.amount) && Number(v.amount.toFixed(decimals)) !== v.amount) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: decimals === 0 ? "Your currency doesn't use decimals." : `Use at most ${decimals} decimal places.`,
      });
    }
    if (v.transactionType === "Transfer") {
      if (!v.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose the account the money goes to." });
      else if (v.toAccountId === v.accountId)
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "From and to accounts must be different." });
    } else if (!v.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category." });
    }
  });
