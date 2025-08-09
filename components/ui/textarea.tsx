import * as React from "react"

import { cn } from "@/lib/utils"

type TextareaProps = React.ComponentProps<"textarea"> & {
  autoResize?: boolean
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return
  if (typeof ref === "function") {
    ref(value)
  } else {
    try {
      ;(ref as React.MutableRefObject<T>).current = value
    } catch {}
  }
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoResize = true, onInput, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    const adjustHeight = React.useCallback(() => {
      const el = innerRef.current
      if (!el || !autoResize) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }, [autoResize])

    React.useLayoutEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const handleInput: React.FormEventHandler<HTMLTextAreaElement> = (e) => {
      if (autoResize) adjustHeight()
      onInput?.(e)
    }

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
      if (autoResize) adjustHeight()
      onChange?.(e)
    }

    return (
      <textarea
        ref={(el) => {
          innerRef.current = el
          setRef(ref, el)
        }}
        data-slot="textarea"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 min-h-[90px] rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "resize-none",
          className
        )}
        onInput={handleInput}
        onChange={handleChange}
        value={value}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
