import { useEffect, useRef, useState, type DragEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import type { ApiError } from "@/types/apiError.types";
import { transactionKeys } from "@/features/transactions";
import { downloadErrors, downloadTemplate } from "@/features/imports/api/imports.api";
import { useImports } from "@/features/imports/hooks/queries/useImports";
import { useUploadImport } from "@/features/imports/hooks/mutations/useUploadImport";
import { useDownloadFile } from "@/features/imports/hooks/mutations/useDownloadFile";
import type { ImportBatch, ImportStatus } from "@/features/imports/types/import.types";

const statusStyle: Record<ImportStatus, string> = {
  Queued: "bg-secondary text-secondary-foreground",
  Processing: "bg-accent text-accent-foreground",
  Succeeded: "bg-success-subtle text-success",
  Failed: "bg-destructive-subtle text-destructive",
};

const errorsFileName = (b: ImportBatch) => b.fileName.replace(/\.xlsx$/i, "") + "-errors.xlsx";

export function ImportPage() {
  const queryClient = useQueryClient();
  const { data: batches = [], isLoading, isError } = useImports();
  const upload = useUploadImport();
  const download = useDownloadFile();
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Announce jobs that finish while this page is open.
  const seen = useRef(new Map<string, ImportStatus>());
  useEffect(() => {
    for (const batch of batches) {
      const before = seen.current.get(batch.id);
      if (before && before !== batch.status) {
        if (batch.status === "Succeeded") {
          toast.success(`Imported ${batch.importedCount ?? 0} transactions from ${batch.fileName}.`);
          void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
        } else if (batch.status === "Failed") {
          toast.error(`${batch.fileName}: ${batch.message ?? "Import failed."}`);
        }
      }
      seen.current.set(batch.id, batch.status);
    }
  }, [batches, queryClient]);

  const send = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Upload the .xlsx template.");
      return;
    }
    upload.mutate(file, {
      onSuccess: (batch) => {
        seen.current.set(batch.id, batch.status);
        toast.info(`${file.name} queued for import.`);
      },
      onError: (error) => {
        const apiError = error as unknown as ApiError;
        toast.error(apiError.errors?.file?.[0] ?? apiError.message);
      },
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    send(e.dataTransfer.files[0]);
  };

  const save = (fetch: () => Promise<Blob>, fileName: string) =>
    download.mutate({ fetch, fileName }, { onError: (error) => toast.error((error as unknown as ApiError).message) });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">Bulk import</h1>
          <p className="text-sm text-muted-foreground">Add many transactions at once from the Excel template.</p>
        </div>
        <Button variant="outline" disabled={download.isPending} onClick={() => save(downloadTemplate, "ledger-import-template.xlsx")}>
          <Download /> Download template
        </Button>
      </div>

      <label
        htmlFor="import-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-card px-6 py-10 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-accent/40",
          dragging && "border-primary bg-accent/40",
        )}
      >
        {upload.isPending ? <FileSpreadsheet className="size-8 animate-pulse text-primary" aria-hidden="true" /> : <Upload className="size-8 text-muted-foreground" aria-hidden="true" />}
        <span className="text-sm font-medium text-foreground">{upload.isPending ? "Uploading…" : "Drop the filled template here, or click to choose a file"}</span>
        <span className="text-xs text-muted-foreground">.xlsx, up to 5 MB and 5,000 rows. If any row has a problem, nothing is imported and you get the file back with those rows marked red.</span>
        <input
          ref={fileInput}
          id="import-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={upload.isPending}
          onChange={(e) => send(e.target.files?.[0])}
        />
      </label>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-foreground">Import history</h2>
      <div className="min-h-0 overflow-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Uploaded</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-sm text-destructive">
                  Couldn&apos;t load import history.
                </TableCell>
              </TableRow>
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : "No imports yet."}
                </TableCell>
              </TableRow>
            ) : (
              batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap">{format(parseISO(b.createdAtUtc), "d MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="max-w-56 truncate" title={b.fileName}>
                    {b.fileName}
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", statusStyle[b.status])}>{b.status}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.rowCount ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.message ?? (b.status === "Queued" || b.status === "Processing" ? "Working on it…" : "")}</TableCell>
                  <TableCell className="text-right">
                    {b.hasErrorFile && (
                      <Button variant="outline" size="sm" disabled={download.isPending} onClick={() => save(() => downloadErrors(b.id), errorsFileName(b))}>
                        <Download /> Download errors
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
