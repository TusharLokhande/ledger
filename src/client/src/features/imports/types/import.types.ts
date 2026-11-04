/** Mirrors backend ImportStatus. */
export type ImportStatus = "Queued" | "Processing" | "Succeeded" | "Failed";

/** Mirrors backend ImportBatchDto. */
export interface ImportBatch {
  id: string;
  fileName: string;
  status: ImportStatus;
  rowCount: number | null;
  importedCount: number | null;
  errorCount: number | null;
  message: string | null;
  createdAtUtc: string;
  completedAtUtc: string | null;
  hasErrorFile: boolean;
}
