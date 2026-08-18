import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

type ComboboxProps = {
  id?: string
  name?: string
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function Combobox({
  id,
  name,
  options,
  value,
  onValueChange,
  placeholder = "Seleccioná una opción",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Sin resultados",
  disabled = false,
  required = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [open])

  const filteredOptions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es")
    if (!normalizedQuery) return options
    return options.filter((option) =>
      option.toLocaleLowerCase("es").includes(normalizedQuery)
    )
  }, [options, query])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        id={id}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (disabled) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            setOpen((current) => !current)
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
      >
        <span
          className={cn("truncate text-left", !value && "text-muted-foreground")}
        >
          {value || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              aria-label="Quitar selección"
              onClick={(event) => {
                event.stopPropagation()
                onValueChange("")
              }}
              className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </div>

      {/* Hidden control so the field still participates in native form validation/submission. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onValueChange(option)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    option === value && "bg-accent/60"
                  )}
                >
                  {option}
                  {option === value && <Check className="size-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
