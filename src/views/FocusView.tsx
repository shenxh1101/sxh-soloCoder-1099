import { useState, useEffect, useRef, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/Button'
import { Play, Pause, RotateCcw, Coffee, Clock, Target, Settings, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { format, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { zhCN } from 'date-fns/locale'

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

const TIMER_PRESETS = {
  focus: [25, 30, 45, 50],
  shortBreak: [5, 10],
  longBreak: [15, 20, 30],
}

export function FocusView() {
  const [mode, setMode] = useState<TimerMode>('focus')
  const [duration, setDuration] = useState(25 * 60)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [customMinutes, setCustomMinutes] = useState(25)
  const [customBreakMinutes, setCustomBreakMinutes] = useState(5)
  const [customLongBreakMinutes, setCustomLongBreakMinutes] = useState(15)

  const intervalRef = useRef<number | null>(null)
  const startTimeRef = useRef<string | null>(null)

  const addFocusSession = useAppStore((s) => s.addFocusSession)
  const tasks = useAppStore((s) => s.tasks.filter((t) => !t.completed))
  const focusSessions = useAppStore((s) => s.focusSessions)

  const todaySessions = useMemo(() => {
    return focusSessions.filter((s) => s.type === 'focus' && s.completed && isToday(new Date(s.endTime)))
  }, [focusSessions])

  const todayTotalMinutes = todaySessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0)

  const weekDays = useMemo(() => {
    const now = new Date()
    const start = startOfWeek(now, { weekStartsOn: 1 })
    const end = endOfWeek(now, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [])

  const weekStats = useMemo(() => {
    return weekDays.map((day) => {
      const daySessions = focusSessions.filter(
        (s) => s.type === 'focus' && s.completed && isToday(new Date(s.endTime))
      )
      // eslint-disable-next-line
      const dayStr = format(day, 'yyyy-MM-dd')
      const actualSessions = focusSessions.filter(
        (s) =>
          s.type === 'focus' &&
          s.completed &&
          format(new Date(s.endTime), 'yyyy-MM-dd') === dayStr
      )
      return {
        date: day,
        minutes: actualSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0),
        count: actualSessions.length,
      }
    })
  }, [weekDays, focusSessions])

  const maxWeekMinutes = Math.max(...weekStats.map((s) => s.minutes), 60)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((t) => t - 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      const endTime = new Date().toISOString()
      if (mode === 'focus') {
        addFocusSession({
          taskId: selectedTaskId || undefined,
          startTime: startTimeRef.current || endTime,
          endTime,
          duration,
          type: 'focus',
          completed: true,
        })
        setCompletedPomodoros((p) => p + 1)

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('专注完成！', {
            body: '干得漂亮！休息一下吧 ☕',
            icon: '🍅',
          })
        }
        setTimeout(() => switchMode('shortBreak'), 500)
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('休息结束！', {
            body: '准备好继续专注了吗？',
            icon: '🎯',
          })
        }
        setTimeout(() => switchMode('focus'), 500)
      }
    }
  }, [timeLeft, isRunning, mode, duration, selectedTaskId, addFocusSession])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleStart = () => {
    if (!isRunning) {
      startTimeRef.current = new Date().toISOString()
    }
    setIsRunning(!isRunning)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(duration)
    startTimeRef.current = null
  }

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false)
    setMode(newMode)
    let mins = newMode === 'focus' ? customMinutes : newMode === 'shortBreak' ? customBreakMinutes : customLongBreakMinutes
    setDuration(mins * 60)
    setTimeLeft(mins * 60)
    startTimeRef.current = null
  }

  const applyCustomSettings = () => {
    setShowSettings(false)
    if (mode === 'focus') {
      setDuration(customMinutes * 60)
      setTimeLeft(customMinutes * 60)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = (duration - timeLeft) / duration
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  const modeConfig = {
    focus: { label: '专注', color: '#ef4444', bg: '#fef2f2', icon: Target },
    shortBreak: { label: '短休息', color: '#10b981', bg: '#ecfdf5', icon: Coffee },
    longBreak: { label: '长休息', color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  }

  const currentConfig = modeConfig[mode]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">专注计时</h1>
          <p className="mt-1 text-gray-500">使用番茄工作法，保持高效专注</p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => {
            const cfg = modeConfig[m]
            const Icon = cfg.icon
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all',
                  mode === m
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                style={mode === m ? { backgroundColor: cfg.color } : {}}
              >
                <Icon size={16} />
                {cfg.label}
              </button>
            )
          })}
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <Settings size={18} />
          </button>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="relative">
            <svg width="280" height="280" className="-rotate-90">
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={currentConfig.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold tabular-nums" style={{ color: currentConfig.color }}>
                {formatTime(timeLeft)}
              </span>
              <span className="mt-2 text-sm text-gray-500">{currentConfig.label}</span>
              {selectedTaskId && (
                <span className="mt-2 max-w-[200px] truncate text-xs text-gray-400">
                  {tasks.find((t) => t.id === selectedTaskId)?.title}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 flex justify-center gap-3">
          <Button
            onClick={handleStart}
            size="lg"
            className="w-36"
            style={{ backgroundColor: isRunning ? undefined : currentConfig.color }}
            variant={isRunning ? 'secondary' : 'primary'}
            icon={isRunning ? <Pause size={20} /> : <Play size={20} />}
          >
            {isRunning ? '暂停' : '开始'}
          </Button>
          <Button variant="secondary" size="lg" onClick={handleReset} icon={<RotateCcw size={20} />}>
            重置
          </Button>
        </div>

        {mode === 'focus' && (
          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-gray-700">关联任务（可选）</label>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">不关联任务</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="text-3xl font-bold text-tomato-500">{completedPomodoros}</div>
            <div className="mt-1 text-sm text-gray-500">本次已完成</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{todaySessions.length}</div>
            <div className="mt-1 text-sm text-gray-500">今日番茄数</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <div className="text-3xl font-bold text-primary-600">{todayTotalMinutes}</div>
            <div className="mt-1 text-sm text-gray-500">今日专注（分钟）</div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-900">本周专注概览</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {weekStats.map((stat, idx) => {
              const height = stat.minutes > 0 ? Math.max((stat.minutes / maxWeekMinutes) * 100, 8) : 2
              const isCurrentDay = format(new Date(), 'yyyy-MM-dd') === format(stat.date, 'yyyy-MM-dd')
              return (
                <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end justify-center">
                    <div
                      className={cn(
                        'w-full max-w-[40px] rounded-t-md transition-all',
                        isCurrentDay ? 'bg-primary-500' : 'bg-primary-200'
                      )}
                      style={{ height: `${height}%` }}
                      title={`${stat.minutes} 分钟`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(stat.date, 'EEE', { locale: zhCN })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {todaySessions.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <CheckCircle2 size={18} className="text-green-500" />
              今日专注记录
            </h3>
            <div className="space-y-2">
              {todaySessions.slice().reverse().map((session) => {
                const task = tasks.find((t) => t.id === session.taskId)
                return (
                  <div key={session.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {task?.title || '无关联任务'}
                      </span>
                      <span className="ml-3 text-xs text-gray-400">
                        {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-tomato-500">
                      {Math.round(session.duration / 60)} 分钟
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-4 text-lg font-semibold">计时设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">专注时长（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 25))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">短休息时长（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customBreakMinutes}
                    onChange={(e) => setCustomBreakMinutes(Math.max(1, parseInt(e.target.value) || 5))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">长休息时长（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customLongBreakMinutes}
                    onChange={(e) => setCustomLongBreakMinutes(Math.max(1, parseInt(e.target.value) || 15))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  {TIMER_PRESETS.focus.map((m) => (
                    <button
                      key={m}
                      onClick={() => setCustomMinutes(m)}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-1.5 text-sm',
                        customMinutes === m ? 'border-tomato-500 bg-tomato-50 text-tomato-600' : 'border-gray-200'
                      )}
                    >
                      {m}分钟
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowSettings(false)}>取消</Button>
                <Button onClick={applyCustomSettings}>应用</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
