import * as React from "react"
import { Paperclip, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/ui/button"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface AttachmentsProps {
  value: File[]
  onChange: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  "aria-invalid"?: boolean
  className?: string
}

function Attachments({
  value,
  onChange,
  accept,
  multiple = true,
  disabled,
  "aria-invalid": ariaInvalid,
  className,
}: AttachmentsProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onChange(multiple ? [...value, ...Array.from(files)] : [files[0]])
  }

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-invalid={ariaInvalid}
        data-slot="attachments-dropzone"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragOver(false)
          if (!disabled) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors outline-none",
          isDragOver ? "border-ring bg-accent/50" : "border-input",
          ariaInvalid && "border-destructive",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-foreground">
          <span className="font-medium">Click to upload</span> or drag and drop
        </p>
        {accept && (
          <p className="text-xs text-muted-foreground">
            {accept.split(",").join(", ")}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {value.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-foreground">
                {file.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${file.name}`}
                onClick={() => removeFile(index)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { Attachments }
