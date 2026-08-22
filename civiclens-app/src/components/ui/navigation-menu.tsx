import * as React from "react"
import { Link } from "react-router-dom"

export function NavigationMenu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <nav className={`relative ${className}`}>{children}</nav>
}

export function NavigationMenuList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <ul className={`flex flex-row items-center list-none m-0 p-0 ${className}`}>{children}</ul>
}

export function NavigationMenuItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <li className={`relative ${className}`}>{children}</li>
}

export function NavigationMenuLink({
  children,
  href,
  className = ""
}: {
  children: React.ReactNode
  href?: string
  className?: string
}) {
  const isExternal = href?.startsWith('http') || href?.startsWith('#')
  if (isExternal) {
    return (
      <a href={href} className={`block select-none rounded-md text-xs leading-none no-underline outline-none transition-colors ${className}`}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href || '/'} className={`block select-none rounded-md text-xs leading-none no-underline outline-none transition-colors ${className}`}>
      {children}
    </Link>
  )
}
