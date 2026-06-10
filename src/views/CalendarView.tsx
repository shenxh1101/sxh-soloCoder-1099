import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  format,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from '@/components/TaskCard'
import { TaskEditorModal } from '@/components/TaskEditorModal'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Task } from '@/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [showEditor, setShowEditor] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const getTasksByDate = useAppStore((s) => s.getTasksByDate)
  const tasks = useAppStore((s) => s.tasks)

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const tasksForDate = useMemo(() => getTasksByDate(selectedDate), [selectedDate, getTasksByDate])

  const getTaskCountForDate = (date: Date): { total: number; completed: number } => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayTasks = tasks.filter((t) => {
      if (t.completed) {
        return t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') === dateStr : false
      }
      return t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr : false
    })
    return {
      total: dayTasks.length,
      completed: dayTasks.filter((t) => t.completed).length,
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
            </h1>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="rounded-lg px-3 py-2 text-sm text-primary-600 hover:bg-primary-50"
              >
                今天
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <Button onClick={() => { setEditingTask(null); setShowEditor(true) }} icon={<Plus size={18} />}>
            新建任务
          </Button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 overflow-hidden">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = isSameDay(day, new Date(selectedDate))
                const isTodayDate = isToday(day)
                const { total, completed } = getTaskCountForDate(day)

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      'group relative flex flex-col rounded-lg p-2 text-left transition-all',
                      'border',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                      !isCurrentMonth && 'opacity-40'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isTodayDate && 'flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white',
                        !isTodayDate && isSelected && 'text-primary-700',
                        !isTodayDate && !isSelected && 'text-gray-700'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {total > 0 && (
                      <div className="mt-1 flex gap-0.5">
                        {total <= 3 ? (
                          Array.from({ length: total }).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                i < completed ? 'bg-green-500' : 'bg-primary-500'
                              )}
                            />
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">+{total}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="w-80 flex flex-col rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
            <div className="border-b border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-primary-600" />
                <h3 className="font-semibold text-gray-900">
                  {format(new Date(selectedDate), 'M月d日 EEEE', { locale: zhCN })}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {tasksForDate.length} 个任务 · 已完成 {tasksForDate.filter((t) => t.completed).length}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tasksForDate.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <CalendarIcon size={36} className="mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">这一天暂无任务</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => { setEditingTask(null); setShowEditor(true) }}
                  >
                    添加任务
                  </Button>
                </div>
              ) : (
                tasksForDate.map((task: Task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                    showSubTasks={false}
                    draggable={false}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskEditorModal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        editTask={editingTask}
        defaultDueDate={selectedDate}
      />
    </div>
  )
}
