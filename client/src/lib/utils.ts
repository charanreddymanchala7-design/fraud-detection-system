import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RiskLevel, TransactionStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'text-green-600 bg-green-100'
    case 'medium':
      return 'text-amber-600 bg-amber-100'
    case 'high':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getRiskBorderColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'border-green-500'
    case 'medium':
      return 'border-amber-500'
    case 'high':
      return 'border-red-500'
    default:
      return 'border-gray-500'
  }
}

export function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100'
    case 'blocked':
      return 'text-red-600 bg-red-100'
    case 'review':
      return 'text-amber-600 bg-amber-100'
    case 'pending':
      return 'text-gray-600 bg-gray-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getRiskScoreColor(score: number): string {
  if (score < 30) return 'text-green-600'
  if (score < 70) return 'text-amber-600'
  return 'text-red-600'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
