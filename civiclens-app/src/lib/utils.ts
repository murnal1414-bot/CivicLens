import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn - merge Tailwind class names safely, resolving conflicts.
 * Compatible with shadcn/ui component patterns.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
