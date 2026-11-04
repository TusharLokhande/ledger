import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadImport } from "@/features/imports/api/imports.api";
import { importKeys } from "@/features/imports/hooks/queries/importKeys";

export function useUploadImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadImport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: importKeys.all }),
  });
}
