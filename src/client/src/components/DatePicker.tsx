import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/ui/button"
import { Calendar } from "@/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover"

const VALUE_FORMAT = "yyyy-MM-dd"
const DISPLAY_FORMAT = "d MMM yyyy"

const CURRENT_YEAR = new Date().getFullYear()

export interface DatePickerProps {
  id?: string
  /** ISO date string ("yyyy-MM-dd"), or null when empty. */
  value: string | null
  onChange: (value: string | null) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  "aria-invalid"?: boolean
  className?: string
  /** Earliest year selectable in the month/year dropdowns. Defaults to 100 years back. */
  fromYear?: number
  /** Latest year selectable in the month/year dropdowns. Defaults to 20 years out. */
  toYear?: number
}

function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled,
  "aria-invalid": ariaInvalid,
  className,
  fromYear = CURRENT_YEAR - 100,
  toYear = CURRENT_YEAR + 20,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const parsed = value ? parse(value, VALUE_FORMAT, new Date()) : undefined
  const selected = parsed && isValid(parsed) ? parsed : undefined

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          data-slot="date-picker-trigger"
          className={cn(
            "h-9 w-full justify-start gap-2 border-input bg-field px-2.5 font-normal hover:bg-field-focus dark:bg-field dark:hover:bg-field-focus",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{selected ? format(selected, DISPLAY_FORMAT) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0, 1)}
          endMonth={new Date(toYear, 11, 31)}
          onSelect={(date) => {
            onChange(date ? format(date, VALUE_FORMAT) : null)
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
