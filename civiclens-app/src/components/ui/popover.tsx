import * as React from "react"

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverTrigger must be used within Popover")

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    context.setOpen(prev => !prev)
  }

  React.useEffect(() => {
    if (!context.open) return
    const handleClose = () => context.setOpen(false)
    document.addEventListener("click", handleClose)
    return () => document.removeEventListener("click", handleClose)
  }, [context.open])

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, {
      "aria-expanded": context.open,
      onClick: (e: React.MouseEvent) => {
        if (child.props.onClick) child.props.onClick(e)
        handleClick(e)
      }
    })
  }

  return (
    <button aria-expanded={context.open} onClick={handleClick}>
      {children}
    </button>
  )
}

export function PopoverContent({
  children,
  className = "",
  align = "start"
}: {
  children: React.ReactNode
  className?: string
  align?: "start" | "end" | "center"
}) {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverContent must be used within Popover")

  if (!context.open) return null

  const alignments = {
    start: "left-0",
    end: "right-0",
    center: "left-1/2 -translate-x-1/2"
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 mt-2 rounded-lg border border-white/10 bg-black/95 p-2 shadow-lg backdrop-blur-md ${alignments[align]} ${className}`}
    >
      {children}
    </div>
  )
}
