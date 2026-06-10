import { useState, useEffect, useRef, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Search, CheckCircle2, Circle, PenLine, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ViewType } from '@/types'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

interface SearchResult {
  type: 'task' | 'review'
  id: string
  title: string
  subtitle?: string
  matchField: string
  view: ViewType
}

export function GlobalSearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const tasks = useAppStore((s) => s.tasks)
  const reviews = useAppStore((s) => s.reviews)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const clearActiveTags = useAppStore((s) => s.clearActiveTags)
  const setHighlightedTaskId = useAppStore((s) => s.setHighlightedTaskId)
  const setReviewFocusDate = useAppStore((s) => s.setReviewFocusDate)

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const taskResults: SearchResult[] = tasks
      .filter((t) => !t.archived)
      .filter((t) => {
        if (t.title.toLowerCase().includes(q)) return true
        if (t.description?.toLowerCase().includes(q)) return true
        if (t.subTasks.some((st) => st.title.toLowerCase().includes(q))) return true
        return false
      })
      .map((t) => {
        let matchField = '标题'
        if (t.description?.toLowerCase().includes(q)) matchField = '描述'
        if (t.subTasks.some((st) => st.title.toLowerCase().includes(q))) matchField = '子任务'
        return {
          type: 'task' as const,
          id: t.id,
          title: t.title,
          subtitle: t.dueDate
            ? format(new Date(t.dueDate), 'M月d日', { locale: zhCN })
            : undefined,
          matchField,
          view: 'tasks' as ViewType,
        }
      })

    const reviewResults: SearchResult[] = reviews
      .filter((r) => r.content.toLowerCase().includes(q))
      .map((r) => ({
        type: 'review' as const,
        id: r.date,
        title: format(new Date(r.date), 'yyyy年M月d日 EEEE', { locale: zhCN }),
        subtitle: r.content.slice(0, 60) + (r.content.length > 60 ? '...' : ''),
        matchField: '回顾',
        view: 'review' as ViewType,
      }))

    return [...taskResults, ...reviewResults]
  }, [query, tasks, reviews])

  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      setSelectedIndex(results.length - 1)
    }
  }, [results, selectedIndex])

  const handleSelect = (result: SearchResult) => {
    clearActiveTags()
    setSearchQuery('')
    if (result.type === 'task') {
      setHighlightedTaskId(result.id)
      setTimeout(() => {
        const el = document.getElementById(`task-${result.id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        setTimeout(() => setHighlightedTaskId(null), 2500)
      }, 100)
    } else if (result.type === 'review') {
      setReviewFocusDate(result.id)
      setTimeout(() => {
        const el = document.getElementById(`review-${result.id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        setTimeout(() => setReviewFocusDate(null), 2500)
      }, 100)
    }
    setCurrentView(result.view)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="搜索任务、描述、子任务、回顾..."
            className="flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none"
          />
          <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
            Esc
          </kbd>
        </div>

        {query.trim() && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                没有找到相关结果
              </div>
            ) : (
              results.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    idx === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                  )}
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    result.type === 'task' ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    {result.type === 'task' ? (
                      result.subtitle ? <CheckCircle2 size={16} /> : <Circle size={16} />
                    ) : (
                      <PenLine size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{result.title}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                        {result.matchField}
                      </span>
                    </div>
                    {result.subtitle && (
                      <p className="mt-0.5 text-xs text-gray-400 truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className={cn(
                    'shrink-0 text-[10px] font-medium',
                    result.type === 'task' ? 'text-primary-500' : 'text-amber-500'
                  )}>
                    {result.type === 'task' ? '任务' : '回顾'}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            <p>输入关键词搜索任务和回顾</p>
            <p className="mt-1 text-xs text-gray-300">支持搜索标题、描述、子任务和回顾内容</p>
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↑↓</kbd> 导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↵</kbd> 打开
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">Esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
