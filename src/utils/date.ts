import {
  format,
  isToday,
  isTomorrow,
  isPast,
  startOfDay,
  isSameDay,
  differenceInCalendarDays,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd'): string {
  return format(new Date(date), pattern, { locale: zhCN })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'yyyy-MM-dd HH:mm')
}

export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return '今天'
  if (isTomorrow(date)) return '明天'
  const diff = differenceInCalendarDays(date, new Date())
  if (diff > 0 && diff < 7) return format(date, 'EEEE', { locale: zhCN })
  return format(date, 'M月d日', { locale: zhCN })
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false
  return isPast(startOfDay(new Date(dateStr))) && !isToday(new Date(dateStr))
}

export function isSameDate(date1: string | Date, date2: string | Date): boolean {
  return isSameDay(new Date(date1), new Date(date2))
}

export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
