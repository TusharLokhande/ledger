import { useMutation } from "@tanstack/react-query";

/** Runs a blob-returning API call and saves the result under `fileName`. */
export function useDownloadFile() {
  return useMutation({
    mutationFn: async ({ fetch, fileName }: { fetch: () => Promise<Blob>; fileName: string }) => {
      const url = URL.createObjectURL(await fetch());
      const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
      // Firefox/Safari only start the download for an attached link, and need the URL alive briefly.
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
}
