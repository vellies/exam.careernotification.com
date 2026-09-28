"use client";

import { useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { useThemeContainer } from "@/components/layout/theme-container";
import { VoiceButton } from "@/components/ui/voice-input";

export type SearchableOption = { value: string; label: string };

/**
 * Dropdown you can type (or speak) into to filter its options.
 * `value` is the selected option's value, or "" for nothing selected.
 */
export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Search…",
  clearable = true,
  required,
  disabled,
  id,
  className,
}: {
  options: SearchableOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Show an ✕ that resets the value to "". */
  clearable?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** Classes for the input box, e.g. its height. */
  className?: string;
}) {
  const container = useThemeContainer();
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  // Controlled so voice input can fill the search text and open the list.
  const [inputValue, setInputValue] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);

  // Keep the text in step when the value changes from outside (URL, form reset).
  const [prevLabel, setPrevLabel] = useState(selected?.label);
  if (prevLabel !== selected?.label) {
    setPrevLabel(selected?.label);
    setInputValue(selected?.label ?? "");
  }

  const showClear = clearable && selected && !disabled;

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(next: SearchableOption | null) => onValueChange(next?.value ?? "")}
      itemToStringLabel={(o) => o?.label ?? ""}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      required={required}
    >
      <div className="relative w-full">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Combobox.Input
          id={id}
          ref={inputRef}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-lg border border-input bg-transparent pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            showClear ? "pr-22" : "pr-15",
            className,
          )}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {/* A spoken search replaces the text and opens the filtered list. */}
          <VoiceButton
            disabled={disabled}
            onResult={(text) => {
              setInputValue(text);
              setOpen(true);
              inputRef.current?.focus();
            }}
          />
          {showClear ? (
            <Combobox.Clear
              aria-label="Clear"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Combobox.Clear>
          ) : null}
          <Combobox.Trigger
            aria-label="Open"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <ChevronDownIcon className="size-4" />
          </Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal container={container ?? undefined}>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="max-h-72 w-max max-w-[min(24rem,calc(100vw-2rem))] min-w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground empty:hidden">
              No matches.
            </Combobox.Empty>
            <Combobox.List>
              {(item: SearchableOption) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="relative flex cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="truncate" title={item.label}>
                    {item.label}
                  </span>
                  <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
