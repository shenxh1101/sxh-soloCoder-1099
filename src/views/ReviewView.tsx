import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { TagBadge } from '@/components/ui/TagBadge'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  subWeeks,
  addWeeks,
  isWithinInterval,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { getTodayStr } from '@/utils/date'
import {
  BarChart3,
  CheckCircle2,
  Target,
  TrendingUp,
  Calendar,
  Smile,
  Meh,
  Frown,
  Laugh,
  PenLine,
  Save,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  ArrowLeft,
  Download,
  Copy,
  TrendingDown,
  Minus,
  Eye,
  X,
} from 'lucide-react'
import type { DailyReview, Task, FocusSession } from '@/types'
import { cn } from '@/utils/cn'

const TREND_WEEKS = 4

interface WeekInfo {
  label: string
  start: Date
  end: Date
}

function getWeekInfo(offset: number): WeekInfo {
  const base = subWeeks(new Date(), offset)
  const start = startOfWeek(base, { weekStartsOn: 1 })
  const end = endOfWeek(base, { weekStartsOn: 1 })
  const label = offset === 0 ? '本周' : `${format(start, 'M/d')}-${format(end, 'M/d')}`
  return { label, start, end }
}

export function ReviewView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewMood, setReviewMood] = useState<DailyReview['mood']>(undefined)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [drillTagId, setDrillTagId] = useState<string | null>(null)
  const [showTrend, setShowTrend] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  const tasks = useAppStore((s) => s.tasks)
  const tags = useAppStore((s) => s.tags)
  const focusSessions = useAppStore((s) => s.focusSessions)
  const reviews = useAppStore((s) => s.reviews)
  const addReview = useAppStore((s) => s.addReview)
  const reviewFocusDate = useAppStore((s) => s.reviewFocusDate)
  const showToast = useAppStore((s) => s.showToast)
  const setReviewFocusDate = useAppStore((s) => s.setReviewFocusDate)

  const todayReview = reviews.find((r) => r.date === getTodayStr())

  useEffect(() => {
    if (todayReview) {
      setReviewContent(todayReview.content)
      setReviewMood(todayReview.mood)
    }
  }, [todayReview])

  useEffect(() => {
    if (reviewFocusDate) {
      const t = setTimeout(() => setReviewFocusDate(null), 2500)
      return () => clearTimeout(t)
    }
  }, [reviewFocusDate, setReviewFocusDate])

  const currentWeek = useMemo(() => getWeekInfo(weekOffset), [weekOffset])

  const dateRange = useMemo(() => ({
    start: currentWeek.start,
    end: currentWeek.end,
  }), [currentWeek])

  const days = useMemo(() => eachDayOfInterval(dateRange), [dateRange])

  const periodFocus = useMemo(
    () =>
      focusSessions.filter(
        (s) =>
          s.type === 'focus' &&
          s.completed &&
          new Date(s.endTime) >= dateRange.start &&
          new Date(s.endTime) <= dateRange.end
      ),
    [focusSessions, dateRange]
  )

  const periodTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.completed && t.completedAt) {
          const d = new Date(t.completedAt)
          return d >= dateRange.start && d <= dateRange.end
        }
        if (t.dueDate) {
          const d = new Date(t.dueDate)
          return d >= dateRange.start && d <= dateRange.end
        }
        return false
      }),
    [tasks, dateRange]
  )

  const periodReviews = useMemo(
    () =>
      reviews.filter(
        (r) => new Date(r.date) >= dateRange.start && new Date(r.date) <= dateRange.end
      ),
    [reviews, dateRange]
  )

  const weeklyTrends = useMemo(() => {
    const weeks: {
      label: string
      start: Date
      end: Date
      tagStats: { tagId: string; tagName: string; color: string; completed: number; focusMinutes: number; tasks: Task[]; sessions: FocusSession[] }[]
    }[] = []

    for (let i = TREND_WEEKS - 1; i >= 0; i--) {
      const wi = getWeekInfo(i + weekOffset)
      const weekStart = wi.start
      const weekEnd = wi.end
      const label = wi.label

      const weekSessions = focusSessions.filter(
        (s) =>
          s.type === 'focus' &&
          s.completed &&
          new Date(s.endTime) >= weekStart &&
          new Date(s.endTime) <= weekEnd
      )
      const weekCompleted = tasks.filter(
        (t) =>
          t.completed &&
          t.completedAt &&
          isWithinInterval(new Date(t.completedAt), { start: weekStart, end: weekEnd })
      )

      const tagStats = tags.map((tag) => {
        const tagTasks = weekCompleted.filter((t) => t.tagIds.includes(tag.id))
        const tagSessions = weekSessions.filter((s) => {
          const task = tasks.find((t) => t.id === s.taskId)
          return task?.tagIds.includes(tag.id)
        })
        const completed = tagTasks.length
        const focusMinutes = tagSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
        return {
          tagId: tag.id,
          tagName: tag.name,
          color: tag.color,
          completed,
          focusMinutes,
          tasks: tagTasks,
          sessions: tagSessions,
        }
      })

      const uncategorizedSessions = weekSessions.filter((s) => {
        if (!s.taskId) return true
        const task = tasks.find((t) => t.id === s.taskId)
        return !task || task.tagIds.length === 0
      })
      const uncategorizedFocus = uncategorizedSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
      if (uncategorizedFocus > 0 || uncategorizedSessions.length > 0) {
        tagStats.push({
          tagId: '__uncategorized__',
          tagName: '未分类',
          color: '#9ca3af',
          completed: 0,
          focusMinutes: uncategorizedFocus,
          tasks: [],
          sessions: uncategorizedSessions,
        })
      }

      weeks.push({
        label,
        start: weekStart,
        end: weekEnd,
        tagStats: tagStats.filter((s) => s.completed > 0 || s.focusMinutes > 0),
      })
    }

    return weeks
  }, [focusSessions, tasks, tags, weekOffset])

  const stats = useMemo(() => {
    const completedCount = periodTasks.filter((t) => t.completed).length
    const totalCount = periodTasks.length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const totalFocusMinutes = periodFocus.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)

    const tagStats = tags
      .map((tag) => {
        const tagTasks = periodTasks.filter((t) => t.tagIds.includes(tag.id))
        const completedTagTasks = tagTasks.filter((t) => t.completed).length
        const tagSessions = periodFocus.filter((s) => {
          const task = tasks.find((t) => t.id === s.taskId)
          return task?.tagIds.includes(tag.id)
        })
        const tagFocusMinutes = tagSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
        return { tag, total: tagTasks.length, completed: completedTagTasks, focusMinutes: tagFocusMinutes, tasks: tagTasks, sessions: tagSessions }
      })
      .filter((s) => s.total > 0 || s.focusMinutes > 0)

    const uncategorizedSessions = periodFocus.filter((s) => {
      if (!s.taskId) return true
      const task = tasks.find((t) => t.id === s.taskId)
      return !task || task.tagIds.length === 0
    })
    const uncategorizedFocus = uncategorizedSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
    if (uncategorizedFocus > 0 || uncategorizedSessions.length > 0) {
      tagStats.push({
        tag: { id: '__uncategorized__', name: '未分类', color: '#9ca3af' },
        total: 0,
        completed: 0,
        focusMinutes: uncategorizedFocus,
        tasks: [],
        sessions: uncategorizedSessions,
      })
    }

    const dailyStats = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTasks = tasks.filter((t) => {
        if (t.completed && t.completedAt) return format(new Date(t.completedAt), 'yyyy-MM-dd') === dayStr
        return t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') === dayStr : false
      })
      const dayCompleted = dayTasks.filter((t) => t.completed).length
      const dayFocus = focusSessions
        .filter((s) => s.type === 'focus' && s.completed && format(new Date(s.endTime), 'yyyy-MM-dd') === dayStr)
        .reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
      return { date: day, total: dayTasks.length, completed: dayCompleted, focusMinutes: dayFocus }
    })

    const maxDaily = Math.max(...dailyStats.map((d) => d.total), 1)
    const maxFocus = Math.max(...dailyStats.map((d) => d.focusMinutes), 60)

    return { completedCount, totalCount, completionRate, totalFocusMinutes, tagStats, dailyStats, maxDaily, maxFocus, pomodoroCount: periodFocus.length }
  }, [tasks, tags, periodFocus, days, dateRange, focusSessions])

  const drillData = useMemo(() => {
    if (!drillTagId) return null
    return stats.tagStats.find((s) => s.tag.id === drillTagId) || null
  }, [drillTagId, stats.tagStats])

  const drillWeeklyData = useMemo(() => {
    if (!drillTagId) return []
    return weeklyTrends.map((w) => {
      const ts = w.tagStats.find((s) => s.tagId === drillTagId)
      return {
        label: w.label,
        start: w.start,
        end: w.end,
        completed: ts?.completed ?? 0,
        focusMinutes: ts?.focusMinutes ?? 0,
        tasks: ts?.tasks ?? [],
        sessions: ts?.sessions ?? [],
      }
    })
  }, [drillTagId, weeklyTrends])

  const moodEmojis: { value: NonNullable<DailyReview['mood']>; label: string; icon: any; color: string }[] = [
    { value: 'great', label: '很棒', icon: Laugh, color: '#10b981' },
    { value: 'good', label: '不错', icon: Smile, color: '#3b82f6' },
    { value: 'neutral', label: '一般', icon: Meh, color: '#6b7280' },
    { value: 'bad', label: '糟糕', icon: Frown, color: '#ef4444' },
  ]

  const handleSaveReview = () => {
    addReview({ date: getTodayStr(), content: reviewContent, mood: reviewMood })
    setReviewSaved(true)
    setTimeout(() => setReviewSaved(false), 2000)
  }

  const formatHours = (minutes: number) => {
    if (minutes < 60) return `${minutes} 分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours} 小时`
  }

  const maxTagFocus = Math.max(...stats.tagStats.map((s) => s.focusMinutes), 1)

  const generateMarkdown = useCallback(() => {
    const weekStart = format(dateRange.start, 'yyyy年M月d日')
    const weekEnd = format(dateRange.end, 'yyyy年M月d日')
    const lines: string[] = []
    lines.push(`# 周报复盘（${weekStart} - ${weekEnd}）`)
    lines.push('')
    lines.push('## 概览')
    lines.push(`- 完成任务：**${stats.completedCount}** / ${stats.totalCount} 个（完成率 ${stats.completionRate}%）`)
    lines.push(`- 专注番茄：**${stats.pomodoroCount}** 个，累计 ${formatHours(stats.totalFocusMinutes)}`)
    lines.push('')

    lines.push('## 完成任务')
    const completedTasks = periodTasks.filter((t) => t.completed)
    if (completedTasks.length === 0) {
      lines.push('_本周无完成任务_')
    } else {
      completedTasks.forEach((t) => {
        const tagNames = t.tagIds.map((id) => tags.find((tg) => tg.id === id)?.name).filter(Boolean).join('、')
        const when = t.completedAt ? format(new Date(t.completedAt), 'M月d日') : ''
        const pr = t.priority === 'high' ? '【高】' : t.priority === 'medium' ? '【中】' : '【低】'
        lines.push(`- ${pr}${t.title}${tagNames ? `（${tagNames}）` : ''}${when ? ` · ${when}` : ''}`)
      })
    }
    lines.push('')

    lines.push('## 专注记录')
    if (periodFocus.length === 0) {
      lines.push('_本周无专注记录_')
    } else {
      const grouped = stats.tagStats
      grouped.forEach((ts) => {
        lines.push(`### ${ts.tag.name}（${formatHours(ts.focusMinutes)}）`)
        if (ts.sessions.length === 0) {
          lines.push('_暂无记录_')
        } else {
          ts.sessions.forEach((s) => {
            const task = tasks.find((t) => t.id === s.taskId)
            const when = format(new Date(s.startTime), 'M月d日 HH:mm')
            lines.push(`- ${when} · ${task?.title || '无关联任务'} · ${Math.round(s.duration / 60)} 分钟`)
          })
        }
        lines.push('')
      })
    }

    lines.push('## 每日回顾')
    if (periodReviews.length === 0) {
      lines.push('_本周无回顾记录_')
    } else {
      periodReviews
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((r) => {
          const mood = moodEmojis.find((m) => m.value === r.mood)
          lines.push(`### ${format(new Date(r.date), 'M月d日 EEEE', { locale: zhCN })}${mood ? ` · ${mood.label}` : ''}`)
          if (r.content) {
            lines.push(r.content.split('\n').map((l) => `> ${l}`).join('\n'))
          }
          lines.push('')
        })
    }

    return lines.join('\n')
  }, [dateRange, stats, periodTasks, periodFocus, periodReviews, tags, tasks, moodEmojis])

  const handleCopyMarkdown = async () => {
    const md = generateMarkdown()
    try {
      await navigator.clipboard.writeText(md)
      showToast('已复制 Markdown 到剪贴板')
    } catch {
      showToast('复制失败，请手动选择复制', 'info')
    }
  }

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `周报-${format(dateRange.start, 'yyyyMMdd')}-${format(dateRange.end, 'yyyyMMdd')}.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已下载 Markdown 文件')
  }

  const renderTrendIcon = (delta: number) => {
    if (delta > 0) return <TrendingUp size={12} className="text-green-500" />
    if (delta < 0) return <TrendingDown size={12} className="text-red-500" />
    return <Minus size={12} className="text-gray-400" />
  }

  const markdownPreview = useMemo(() => generateMarkdown(), [generateMarkdown])

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">周报工作台</h1>
            <p className="mt-1 text-gray-500">按自然周回顾你的效率数据</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 px-1 py-1 mr-2">
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-900 whitespace-nowrap">
                {currentWeek.label}
              </span>
              <button
                onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                disabled={weekOffset === 0}
                className={cn(
                  'rounded-lg p-1.5 hover:bg-white hover:shadow-sm',
                  weekOffset === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <ChevronRight size={16} />
              </button>
              {weekOffset > 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="ml-1 rounded-lg px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                >
                  本周
                </button>
              )}
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowPreview(true)} icon={<Eye size={14} />}>
              预览
            </Button>
            <Button size="sm" variant="secondary" onClick={handleCopyMarkdown} icon={<Copy size={14} />}>
              复制
            </Button>
            <Button size="sm" variant="secondary" onClick={handleDownloadMarkdown} icon={<Download size={14} />}>
              导出
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <CheckCircle2 size={18} className="text-green-500" />
              <span className="text-sm">完成任务</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{stats.completedCount}</span>
              <span className="text-sm text-gray-400">/ {stats.totalCount}</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <TrendingUp size={18} className="text-primary-500" />
              <span className="text-sm">完成率</span>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900">{stats.completionRate}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${stats.completionRate}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <Target size={18} className="text-tomato-500" />
              <span className="text-sm">番茄数</span>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900">{stats.pomodoroCount}</span>
              <span className="ml-1 text-sm text-gray-400">个</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 text-gray-500">
              <BarChart3 size={18} className="text-amber-500" />
              <span className="text-sm">专注时长</span>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900">{formatHours(stats.totalFocusMinutes)}</span>
            </div>
          </div>
        </div>

        {drillData ? (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => setDrillTagId(null)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <ArrowLeft size={20} />
              </button>
              <TagBadge tagId={drillData.tag.id} size="md" />
              <h3 className="text-lg font-semibold text-gray-900">{drillData.tag.name}详情</h3>
              <div className="flex-1" />
              <span className="text-sm text-gray-500">
                {drillData.completed}/{drillData.total} 完成 · {formatHours(drillData.focusMinutes)} 专注
              </span>
            </div>

            {showTrend && (
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    最近 {TREND_WEEKS} 周趋势
                  </h4>
                  <button
                    onClick={() => setShowTrend(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    收起
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="pb-2 text-left font-normal">周</th>
                        <th className="pb-2 text-right font-normal">完成任务</th>
                        <th className="pb-2 text-right font-normal">专注时长</th>
                        <th className="pb-2 text-right font-normal">环比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyTrends.map((w, idx) => {
                        const ts = w.tagStats.find((s) => s.tagId === drillData.tag.id)
                        const prev = idx > 0
                          ? weeklyTrends[idx - 1].tagStats.find((s) => s.tagId === drillData.tag.id)
                          : null
                        const delta = ts && prev ? ts.completed - prev.completed : 0
                        return (
                          <tr key={w.label} className="border-t border-gray-100">
                            <td className="py-2 text-gray-700">{w.label}</td>
                            <td className="py-2 text-right text-gray-900 font-medium">
                              {ts?.completed ?? 0}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {formatHours(ts?.focusMinutes ?? 0)}
                            </td>
                            <td className="py-2 text-right flex items-center justify-end gap-1">
                              {idx > 0 ? renderTrendIcon(delta) : null}
                              {idx > 0 && (
                                <span className={cn(
                                  'text-xs',
                                  delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                                )}>
                                  {delta > 0 ? `+${delta}` : delta}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4">
                  <h5 className="mb-2 text-xs font-semibold text-gray-600">每周任务与专注</h5>
                  <div className="space-y-3">
                    {drillWeeklyData.map((week) => (
                      <div key={week.label} className="rounded-lg border border-gray-100 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{week.label}</span>
                          <span className="text-xs text-gray-500">
                            完成 {week.completed} · 专注 {formatHours(week.focusMinutes)}
                          </span>
                        </div>
                        {week.tasks.length === 0 && week.sessions.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">暂无数据</p>
                        ) : (
                          <>
                            {week.tasks.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {week.tasks.map((task: Task) => (
                                  <div key={task.id} className={cn('flex items-center gap-2 text-xs', task.completed && 'opacity-60')}>
                                    <CheckCircle2 size={12} className={task.completed ? 'text-green-500' : 'text-gray-300'} />
                                    <span className={cn(task.completed && 'line-through text-gray-400')}>{task.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {week.sessions.length > 0 && (
                              <div className="space-y-1">
                                {week.sessions.map((session: FocusSession) => {
                                  const task = tasks.find((t) => t.id === session.taskId)
                                  return (
                                    <div key={session.id} className="flex items-center justify-between text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <Clock size={10} className="text-tomato-400" />
                                        <span>{task?.title || '无关联任务'}</span>
                                      </div>
                                      <span>{format(new Date(session.startTime), 'M/d')} · {Math.round(session.duration / 60)}分钟</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">相关任务（当周）</h4>
              <div className="space-y-2">
                {drillData.tasks.map((task: Task) => (
                  <div key={task.id} className={cn('flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3', task.completed && 'opacity-60')}>
                    <CheckCircle2 size={16} className={task.completed ? 'text-green-500' : 'text-gray-300'} />
                    <span className={cn('flex-1 text-sm font-medium', task.completed && 'line-through text-gray-400')}>
                      {task.title}
                    </span>
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">{format(new Date(task.dueDate), 'M/d')}</span>
                    )}
                  </div>
                ))}
                {drillData.tasks.length === 0 && (
                  <p className="text-sm text-gray-400">当周无相关任务</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">专注记录（当周）</h4>
              {drillData.sessions.length === 0 ? (
                <p className="text-sm text-gray-400">暂无专注记录</p>
              ) : (
                <div className="space-y-1.5">
                  {drillData.sessions.slice().reverse().map((session: FocusSession) => {
                    const task = tasks.find((t) => t.id === session.taskId)
                    return (
                      <div key={session.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-tomato-400" />
                          <span className="text-sm text-gray-700">{task?.title || '无关联任务'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{format(new Date(session.startTime), 'M/d HH:mm')}</span>
                          <span className="font-medium text-tomato-500">{Math.round(session.duration / 60)}分钟</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {stats.tagStats.length > 0 && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-gray-900">按标签分类</h3>
                <div className="mb-6 space-y-4">
                  {stats.tagStats.map(({ tag, total, completed, focusMinutes }) => {
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
                    return (
                      <div
                        key={tag.id}
                        className="group cursor-pointer rounded-xl border border-gray-100 p-4 transition-all hover:border-gray-200 hover:shadow-sm"
                        onClick={() => setDrillTagId(tag.id)}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TagBadge tagId={tag.id} size="md" />
                            <span className="text-sm text-gray-500">{total} 个任务 · 完成 {rate}%</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              专注 <span className="font-medium text-gray-900">{formatHours(focusMinutes)}</span>
                            </span>
                            <span className="text-xs text-primary-500 group-hover:text-primary-700">查看详情 →</span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${rate}%`, backgroundColor: tag.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <h4 className="mb-3 text-sm font-semibold text-gray-700">专注时长分布</h4>
                <div className="space-y-3">
                  {stats.tagStats.map(({ tag, focusMinutes }) => (
                    <div key={tag.id} className="flex items-center gap-3">
                      <TagBadge tagId={tag.id} size="sm" />
                      <div className="flex-1 h-6 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all flex items-center pl-2"
                          style={{ width: `${Math.max((focusMinutes / maxTagFocus) * 100, focusMinutes > 0 ? 8 : 0)}%`, backgroundColor: tag.color }}
                        >
                          {focusMinutes > 0 && (
                            <span className="text-xs font-medium text-white">{focusMinutes}分钟</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTrend && stats.tagStats.length > 0 && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">标签周趋势对比</h3>
                  <button onClick={() => setShowTrend(false)} className="text-xs text-gray-500 hover:text-gray-700">
                    收起
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 text-left font-normal">标签</th>
                        {weeklyTrends.map((w) => (
                          <th key={w.label} className="pb-2 text-right font-normal whitespace-nowrap px-2">
                            {w.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.tagStats.map(({ tag }) => (
                        <tr key={tag.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <TagBadge tagId={tag.id} size="sm" />
                              <span className="text-xs text-gray-500 font-medium">完成/专注</span>
                            </div>
                          </td>
                          {weeklyTrends.map((w) => {
                            const ts = w.tagStats.find((s) => s.tagId === tag.id)
                            return (
                              <td key={w.label} className="py-2 text-right px-2 whitespace-nowrap">
                                <div className="text-xs font-medium text-gray-900">{ts?.completed ?? 0}</div>
                                <div className="text-[10px] text-gray-400">
                                  {formatHours(ts?.focusMinutes ?? 0)}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-gray-900">每日任务完成</h3>
                <div className="flex items-end justify-between gap-2 h-40">
                  {stats.dailyStats.map((stat, idx) => {
                    const completedH = stat.total > 0 ? Math.max((stat.completed / stat.total) * 100, 4) : 0
                    const pendingH = stat.total > 0 ? Math.max(((stat.total - stat.completed) / stat.total) * 100, 4) : 0
                    const isCurrentDay = format(new Date(), 'yyyy-MM-dd') === format(stat.date, 'yyyy-MM-dd')
                    return (
                      <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-full w-full flex-col items-end justify-center gap-0.5">
                          {stat.total > 0 ? (
                            <>
                              <div className={cn('w-full max-w-[32px] rounded-t-sm', isCurrentDay ? 'bg-gray-400' : 'bg-gray-300')} style={{ height: `${pendingH}%` }} />
                              <div className={cn('w-full max-w-[32px] rounded-b-sm', isCurrentDay ? 'bg-green-500' : 'bg-green-400')} style={{ height: `${completedH}%` }} />
                            </>
                          ) : (
                            <div className="h-1 w-full max-w-[32px] rounded bg-gray-100" />
                          )}
                        </div>
                        <span className={cn('text-xs', isCurrentDay ? 'font-semibold text-primary-600' : 'text-gray-500')}>
                          {format(stat.date, 'd', { locale: zhCN })}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-400" /> 已完成</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-300" /> 未完成</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-gray-900">每日专注时长</h3>
                <div className="flex items-end justify-between gap-2 h-40">
                  {stats.dailyStats.map((stat, idx) => {
                    const h = stat.focusMinutes > 0 ? Math.max((stat.focusMinutes / stats.maxFocus) * 100, 6) : 2
                    const isCurrentDay = format(new Date(), 'yyyy-MM-dd') === format(stat.date, 'yyyy-MM-dd')
                    return (
                      <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className={cn('w-full max-w-[32px] rounded-t-md', isCurrentDay ? 'bg-amber-500' : 'bg-amber-300')}
                            style={{ height: `${h}%` }}
                            title={`${stat.focusMinutes} 分钟`}
                          />
                        </div>
                        <span className={cn('text-xs', isCurrentDay ? 'font-semibold text-primary-600' : 'text-gray-500')}>
                          {format(stat.date, 'd', { locale: zhCN })}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 text-center text-xs text-gray-500">单位：分钟，最高 {stats.maxFocus} 分钟</div>
              </div>
            </div>
          </>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine size={20} className="text-primary-600" />
              <h3 className="font-semibold text-gray-900">今日回顾</h3>
              <span className="text-sm text-gray-400">{format(new Date(), 'M月d日', { locale: zhCN })}</span>
            </div>
            {reviewSaved && (
              <span className="flex items-center gap-1 text-sm text-green-600"><Save size={14} /> 已保存</span>
            )}
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm text-gray-600">今天感觉如何？</label>
            <div className="flex gap-3">
              {moodEmojis.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setReviewMood(value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border-2 px-4 py-3 transition-all',
                    reviewMood === value ? 'border-current bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                  )}
                  style={reviewMood === value ? { borderColor: color, color } : {}}
                >
                  <Icon size={24} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm text-gray-600">写点什么吧... 今天做得好的、需要改进的、明天的计划</label>
            <Textarea
              placeholder="今天完成了什么？有什么收获？遇到了什么问题？明天打算怎么做？"
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              rows={5}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveReview} icon={<Save size={16} />}>保存回顾</Button>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <Calendar size={18} className="text-primary-600" /> 历史回顾
            </h3>
            <div className="space-y-3">
              {reviews.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((review) => {
                const mood = moodEmojis.find((m) => m.value === review.mood)
                const MoodIcon = mood?.icon
                const isFocus = reviewFocusDate === review.date
                return (
                  <div
                    id={`review-${review.date}`}
                    key={review.date}
                    className={cn(
                      'rounded-lg bg-gray-50 p-4 transition-all',
                      isFocus && 'ring-2 ring-amber-400 ring-offset-2 animate-pulse'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {format(new Date(review.date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                      </span>
                      {mood && MoodIcon && (
                        <span className="flex items-center gap-1 text-sm" style={{ color: mood.color }}>
                          <MoodIcon size={16} /> {mood.label}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-600">{review.content}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Markdown 预览</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleCopyMarkdown} icon={<Copy size={14} />}>
                  复制
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDownloadMarkdown} icon={<Download size={14} />}>
                  下载
                </Button>
                <button onClick={() => setShowPreview(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-mono leading-relaxed bg-gray-50 rounded-xl p-6">
                {markdownPreview}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
