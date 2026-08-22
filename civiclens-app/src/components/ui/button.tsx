import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'ghost' | 'default' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', asChild, variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    const variants = {
      default: "bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-200",
      ghost: "text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10",
      outline: "border border-white/20 text-white hover:bg-white/10 dark:text-white dark:hover:bg-white/10"
    }
    const sizes = {
      sm: "px-3 py-1.5 text-[11px]",
      md: "px-4 py-2 text-xs",
      lg: "px-6 py-3 text-sm",
      icon: "h-8 w-8"
    }
    const combinedClassName = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`

    if (asChild && React.isValidElement(props.children)) {
      const child = props.children as React.ReactElement<any>
      return React.cloneElement(child, {
        className: `${child.props.className || ''} ${combinedClassName}`
      })
    }

    return <button ref={ref} className={combinedClassName} {...props} />
  }
)
Button.displayName = "Button"
