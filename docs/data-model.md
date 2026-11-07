# Data Model

Source of truth: `src/server/Domain/Entity/*.cs` and `src/server/Domain/Enums/*.cs`.
Client types and Zod schemas mirror these shapes — update both when one changes.

> **Status:** all entities are mapped (`Infrastructure/Persistence/Configurations`), migrations
> `InitialCreate` and `Masters`. Anything still marked _TBD_ is decided when that feature is built.

## Conventions

- Entity classes are **plural** (`Accounts`, `Transactions`) and live in `Domain/Entity/`.
- Every entity derives from `BaseEntity`:

| Column         | Type       | Notes                                 |
|----------------|------------|---------------------------------------|
| `Id`           | `Guid`     | PK, generated in code (`Guid.NewGuid()`) |
| `Active`       | `bool`     | soft-delete flag, default `true`      |
| `CreatedBy`    | `Guid?`    | user id, not a FK                     |
| `CreatedAtUtc` | `DateTime` | required, default `DateTime.UtcNow`   |
| `UpdatedBy`    | `Guid?`    | user id, not a FK                     |
| `UpdatedAtUtc` | `DateTime?`|                                       |

- **Multi-tenancy is per user:** every entity except `Users` has a required `UserId` FK.
  Every query must be scoped to `ICurrentUserService.UserId`.
- Money is `decimal` (precision _TBD_). Calendar dates are `DateOnly`; timestamps are UTC `DateTime`.
- Enums are `short`-backed and serialized as strings over the API (`JsonStringEnumConverter`).

## Relationships

```
Users 1─* Accounts
Users 1─* Categories   (flat — no subcategories)
Users 1─* ImportBatches
Users 1─* Budgets  *─1 Categories
Users 1─* Transactions
            ├─*1 Accounts        (AccountId, required)
            ├─*1 Accounts        (DestinationAccountId, optional — transfers)
            ├─*1 Categories      (CategoryId, null for transfers)
            └─*1 ImportBatches   (ImportBatchId, optional — rows inserted by an import)
```

## Entities

### Users
| Column         | Type     | Notes |
|----------------|----------|-------|
| `Email`        | `string` | required, max 256, stored lower-cased; unique index |
| `Name`         | `string?` | max 100; display name, required at registration (null for older accounts) |
| `PasswordHash` | `string` | required |
| `CurrencyCode` | `string` | required, 3 letters (ISO 4217), DB default `'INR'`; the one currency for all of this user's amounts |

### RefreshTokens (`refresh_tokens`)
| Column              | Type        | Notes |
|---------------------|-------------|-------|
| `UserId`            | `Guid`      | FK → Users, cascade delete |
| `TokenHash`         | `string`    | SHA-256 hex of the raw token (64); unique index |
| `ExpiresAtUtc`      | `DateTime`  | |
| `RevokedAtUtc`      | `DateTime?` | set on rotation or logout |
| `ReplacedByTokenId` | `Guid?`     | informational, not a FK |

### Accounts
| Column        | Type      | Notes |
|---------------|-----------|-------|
| `UserId`      | `Guid`    | FK → Users |
| `Name`        | `string`  | required |
| `AccountType` | `AccountType` | `Bank` / `Cash` / `CreditCard` / `Investment` / `EmergencyFund` |
| `Institution` | `string?` | max 100; blank stored as null |
| `OpeningBalance` | `decimal?` | (18,4); money already in the account before tracking. Kept only for `EmergencyFund` (null otherwise); added to Home's emergency-fund total |

Unique index `(UserId, Name)`; the service also rejects case-insensitive duplicates (archived included).
Archive = `Active = false`. Hard delete is allowed only while no transaction references the account
(either side of a transfer); otherwise the API rejects it and the user archives instead.

### Categories
| Column             | Type           | Notes |
|--------------------|----------------|-------|
| `UserId`           | `Guid`         | FK → Users |
| `CategoryType`     | `CategoryType` | `Income` / `Expense` |
| `Name`             | `string`       | required, max 100 |
| `Icon`             | `string`       | required, max 50; Lucide icon name in kebab-case (curated list lives in the client) |
| `Color`            | `string`       | required, `#rrggbb` |

Unique index `(UserId, CategoryType, Name)`; the service also rejects case-insensitive duplicates
(archived included). Archive = `Active = false`. Hard delete is allowed only while no transaction or
budget references the category; otherwise the API rejects it and the user archives instead.

### ImportBatches (`import_batches`)
One uploaded Excel file and its background job.

| Column           | Type           | Notes |
|------------------|----------------|-------|
| `UserId`         | `Guid`         | FK → Users |
| `FileName`       | `string`       | required, max 255; the name the owner uploaded |
| `Status`         | `ImportStatus` | `Queued` → `Processing` → `Succeeded` / `Failed` |
| `SourceBlobName` | `string`       | blob in container `imports`: `{userId}/{batchId}/source.xlsx` |
| `ErrorBlobName`  | `string?`      | `{userId}/{batchId}/errors.xlsx`, set when rows failed validation |
| `RowCount`       | `int?`         | non-empty data rows |
| `ImportedCount`  | `int?`         | rows inserted (all of them, or none) |
| `ErrorCount`     | `int?`         | rows with problems |
| `Message`        | `string?`      | max 500; shown in the import history |
| `CompletedAtUtc` | `DateTime?`    | |

### Budgets
| Column        | Type       | Notes |
|---------------|------------|-------|
| `UserId`      | `Guid`     | FK → Users |
| `CategoryId`  | `Guid`     | FK → Categories |
| `Amount`      | `decimal`  | |
| `PeriodStart` | `DateOnly` | |
| `PeriodEnd`   | `DateOnly` | |

### Transactions
| Column                 | Type              | Notes |
|------------------------|-------------------|-------|
| `UserId`               | `Guid`            | FK → Users |
| `AccountId`            | `Guid`            | FK → Accounts (source account) |
| `DestinationAccountId` | `Guid?`           | FK → Accounts; used by `Transfer` |
| `CategoryId`           | `Guid?`           | FK → Categories (restrict); required for Income/Expense (matching type), null for Transfer |
| `TransactionType`      | `TransactionType` | `Income` / `Expense` / `Transfer` |
| `Amount`               | `decimal(18,4)`   | always > 0 (the type gives the direction); at most the user's currency's decimals |
| `TransactionDate`      | `DateOnly`        | indexed with `UserId` |
| `Note`                 | `string?`         | max 500 |
| `ImportBatchId`        | `Guid?`           | FK → ImportBatches (set null); set for imported rows |

`DestinationAccountId` is set exactly when the type is `Transfer` (≠ `AccountId`). Transfers are
excluded from income/expense totals. Transactions are hard-deleted (nothing references them).

## Enums

| Enum              | Values |
|-------------------|--------|
| `AccountType`     | `Bank = 1`, `Cash = 2`, `CreditCard = 3`, `Investment = 4`, `EmergencyFund = 5` |
| `CategoryType`    | `Income = 1`, `Expense = 2` |
| `ImportStatus`    | `Queued = 1`, `Processing = 2`, `Succeeded = 3`, `Failed = 4` |
| `TransactionType` | `Income = 1`, `Expense = 2`, `Transfer = 3` |

## Open questions (decide when writing configurations)

- `Budgets.Amount` precision (still 18,2) — align with transactions (18,4) when budgets are built.
- Amounts travel as decimal major units; the client converts with `toMinorUnits` only for display.
