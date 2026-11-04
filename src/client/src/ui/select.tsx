import ReactSelect, {
  type GroupBase,
  type Props as ReactSelectProps,
} from "react-select"

import { cn } from "@/lib/utils"

export type SelectProps<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = ReactSelectProps<Option, IsMulti, Group> & {
  "aria-invalid"?: boolean
}

function Select<
  Option = unknown,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps<Option, IsMulti, Group>) {
  return (
    <ReactSelect<Option, IsMulti, Group>
      unstyled
      classNames={{
        control: ({ isFocused }) =>
          cn(
            "flex min-h-9 w-full items-center rounded-lg border px-2.5 py-0.5 text-base transition-colors md:text-sm", isFocused ? "bg-field-focus" : "bg-field",
            ariaInvalid
              ? "border-destructive"
              : isFocused
                ? "border-ring"
                : "border-input",
            isFocused && (ariaInvalid ? "ring-3 ring-destructive/20" : "ring-3 ring-ring/50"),
          ),
        placeholder: () => "text-muted-foreground",
        input: () => "text-foreground",
        singleValue: () => "text-foreground",
        valueContainer: () => "gap-1 py-0.5",
        indicatorsContainer: () => "gap-1",
        indicatorSeparator: () => "my-1.5 w-px bg-border",
        dropdownIndicator: () => "p-1 text-muted-foreground",
        clearIndicator: () => "p-1 text-muted-foreground hover:text-foreground",
        menu: () =>
          "mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
        menuList: () => "p-1",
        menuPortal: () => "z-50",
        option: ({ isFocused, isSelected }) =>
          cn(
            "cursor-pointer rounded-md px-2.5 py-1.5 text-sm",
            isSelected
              ? "bg-primary text-primary-foreground"
              : isFocused
                ? "bg-accent text-accent-foreground"
                : "text-foreground",
          ),
        noOptionsMessage: () => "px-2.5 py-2 text-sm text-muted-foreground",
        loadingMessage: () => "px-2.5 py-2 text-sm text-muted-foreground",
        multiValue: () =>
          "flex items-center gap-1 rounded-md bg-secondary py-0.5 pr-1 pl-2",
        multiValueLabel: () => "text-sm text-secondary-foreground",
        multiValueRemove: () =>
          "rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive",
        groupHeading: () =>
          "px-2.5 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase",
      }}
      {...props}
      // react-select removes its live-region text on blur. Inside a Radix Dialog/Sheet, a DOM removal
      // while focus sits on <body> (between blur and the next focus) makes the focus trap pull focus
      // back to the container, breaking Tab. Moving focus to the destination first avoids that.
      onBlur={(e) => {
        ;(e.relatedTarget as HTMLElement | null)?.focus()
        props.onBlur?.(e)
      }}
      // react-select puts an inline z-index: 1 on the portal, which beats the z-50 class above
      // and lets sticky/elevated content cover a menu portaled to <body>.
      styles={{
        ...props.styles,
        menuPortal: (base, state) => ({
          ...(props.styles?.menuPortal?.(base, state) ?? base),
          zIndex: 50,
          // A modal Radix Dialog/Sheet sets pointer-events: none on <body>; the portaled menu would
          // inherit it and clicks would fall through to whatever is underneath.
          pointerEvents: "auto",
        }),
      }}
    />
  )
}

export { Select }
