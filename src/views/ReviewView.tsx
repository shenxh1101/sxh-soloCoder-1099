import { useState, useEffect, useMemo } from 'react'
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
  startOfMonth,
  endOfMonth,
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
  Clock,
  ArrowLeft,
} from 'lucide-react'
import type { DailyReview, Task, FocusSession } from '@/types'
import { cn } from '@/utils/cn'

type Period = 'week' | 'month'

export function ReviewView() {
  const [period, setPeriod] = useState<Period>('week')
  const [reviewContent, setReviewContent] = useState('')
  const [reviewMood, setReviewMood] = useState<DailyReview['mood']>(undefined)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [drillTagId, setDrillTagId] = useState<string | null>(null)

  const tasks = useAppStore((s) => s.tasks)
  const tags = useAppStore((s) => s.tags)
  const focusSessions = useAppStore((s) => s.focusSessions)
  const reviews = useAppStore((s) => s.reviews)
  const addReview = useAppStore((s) => s.addReview)

  const todayReview = reviews.find((r) => r.date === getTodayStr())

  useEffect(() => {
    if (todayReview) {
      setReviewContent(todayReview.content)
      setReviewMood(todayReview.mood)
    }
  }, [todayReview])

  const dateRange = useMemo(() => {
    const now = new Date()
    if (period === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    }
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    }
  }, [period])

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

  const stats = useMemo(() => {
    const completedCount = periodTasks.filter((t) => t.completed).length
    const totalCount = periodTasks.length
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const totalFocusMinutes = periodFocus.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)

    const tagStats = tags
      .map((tag) => {
        const tagTasks = periodTasks.filter((t) => t.tagIds.includes(tag.id))
        const completedTagTasks = tagTasks.filter((t) => t.completed).length

        const tagFocusMinutes = periodFocus
          .filter((s) => {
            const task = tasks.find((t) => t.id === s.taskId)
            return task?.tagIds.includes(tag.id)
          })
          .reduce((acc, s) => acc + Math.round(s.duration / 60), 0)

        return {
          tag,
          total: tagTasks.length,
          completed: completedTagTasks,
          focusMinutes: tagFocusMinutes,
          tasks: tagTasks,
          sessions: periodFocus.filter((s) => {
            const task = tasks.find((t) => t.id === s.taskId)
            return task?.tagIds.includes(tag.id)
          }),
        }
      })
      .filter((s) => s.total > 0 || s.focusMinutes > 0)

    const dailyStats = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTasks = tasks.filter((t) => {
        if (t.completed && t.completedAt) {
          return format(new Date(t.completedAt), 'yyyy-MM-dd') === dayStr
        }
        return t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dayStr
      })
      const dayCompleted = dayTasks.filter((t) => t.completed).length
      const dayFocus = focusSessions
        .filter(
          (s) =>
            s.type === 'focus' &&
            s.completed &&
            format(new Date(s.endTime), 'yyyy-MM-dd') === dayStr
        )
        .reduce((acc, s) => acc + Math.round(s.duration / 60), 0)
      return { date: day, total: dayTasks.length, completed: dayCompleted, focusMinutes: dayFocus }
    })

    const maxDaily = Math.max(...dailyStats.map((d) => d.total), 1)
    const maxFocus = Math.max(...dailyStats.map((d) => d.focusMinutes), 60)

    return {
      completedCount,
      totalCount,
      completionRate,
      totalFocusMinutes,
      tagStats,
      dailyStats,
      maxDaily,
      maxFocus,
      pomodoroCount: periodFocus.length,
    }
  }, [tasks, tags, periodFocus, days, dateRange, focusSessions])

  const drillData = useMemo(() => {
    if (!drillTagId) return null
    const ts = stats.tagStats.find((s) => s.tag.id === drillTagId)
    if (!ts) return null
    return ts
  }, [drillTagId, stats.tagStats])

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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">复盘统计</h1>
            <p className="mt-1 text-gray-500">回顾你的时间都花在哪里了</p>
          </div>
          <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
            {(['week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p === 'week' ? '本周' : '本月'}
              </button>
            ))}
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

            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-gray-700">相关任务</h4>
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
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-700">专注记录</h4>
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
                              <div
                                className={cn('w-full max-w-[32px] rounded-t-sm', isCurrentDay ? 'bg-gray-400' : 'bg-gray-300')}
                                style={{ height: `${pendingH}%` }}
                              />
                              <div
                                className={cn('w-full max-w-[32px] rounded-b-sm', isCurrentDay ? 'bg-green-500' : 'bg-green-400')}
                                style={{ height: `${completedH}%` }}
                              />
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
              {reviews.slice().reverse().slice(0, 5).map((review) => {
                const mood = moodEmojis.find((m) => m.value === review.mood)
                const MoodIcon = mood?.icon
                return (
                  <div key={review.date} className="rounded-lg bg-gray-50 p-4">
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
    </div>
  )
}
