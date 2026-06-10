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
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from '@/components/TaskCard'
import { TaskEditorModal } from '@/components/TaskEditorModal'
import { Button } from '@/components/ui/Button'
import { TagBadge } from '@/components/ui/TagBadge'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, GripVertical, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Task } from '@/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function DraggableTask({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { taskId: task.id },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined }
    : undefined

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0.5 top-2 z-10 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      >
        <GripVertical size={12} />
      </button>
      <TaskCard task={task} onEdit={onEdit} showSubTasks={true} draggable={false} />
    </div>
  )
}

function MiniDraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `minitask-${task.id}`,
    data: { taskId: task.id },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : undefined }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
        task.completed
          ? 'bg-green-100 text-green-700 line-through'
          : task.priority === 'high'
            ? 'bg-red-100 text-red-700'
            : task.priority === 'medium'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-primary-100 text-primary-700'
      )}
      title={task.title}
    >
      {task.completed && <CheckCircle2 size={10} className="inline mr-0.5 -mt-0.5" />}
      {task.title}
    </div>
  )
}

function DroppableDateCell({
  date,
  isCurrentMonth,
  isSelected,
  isTodayDate,
  dayTasks,
  onClick,
  onTaskClick,
}: {
  date: Date
  isCurrentMonth: boolean
  isSelected: boolean
  isTodayDate: boolean
  dayTasks: Task[]
  onClick: () => void
  onTaskClick: (task: Task) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `date-${format(date, 'yyyy-MM-dd')}`,
    data: { date: format(date, 'yyyy-MM-dd') },
  })

  const shownTasks = dayTasks.slice(0, 3)
  const extraCount = dayTasks.length - shownTasks.length

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-lg p-1.5 text-left transition-all min-h-[88px]',
        'border',
        isSelected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
        !isCurrentMonth && 'opacity-40',
        isOver && 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
      )}
    >
      <span
        className={cn(
          'text-xs font-medium mb-1',
          isTodayDate && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white',
          !isTodayDate && isSelected && 'text-primary-700',
          !isTodayDate && !isSelected && 'text-gray-700'
        )}
      >
        {format(date, 'd')}
      </span>
      <div className="space-y-1 flex-1" onClick={(e) => e.stopPropagation()}>
        {shownTasks.map((t) => (
          <div key={t.id} className="flex items-center gap-1">
            <MiniDraggableTask task={t} />
          </div>
        ))}
        {extraCount > 0 && (
          <div className="text-[10px] text-gray-500 pl-0.5">+{extraCount} 更多</div>
        )}
      </div>
    </div>
  )
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [showEditor, setShowEditor] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const getTasksByDate = useAppStore((s) => s.getTasksByDate)
  const tasks = useAppStore((s) => s.tasks)
  const moveTaskToDate = useAppStore((s) => s.moveTaskToDate)

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const tasksForDate = useMemo(() => getTasksByDate(selectedDate), [selectedDate, getTasksByDate])

  const getTasksForDay = (dateStr: string): Task[] => {
    return tasks.filter((t) => {
      if (t.archived) return false
      if (t.completed) {
        return t.completedAt ? format(new Date(t.completedAt), 'yyyy-MM-dd') === dateStr : false
      }
      return t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr : false
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = String(active.id).replace('minitask-', '').replace('task-', '')
    const targetDate = String(over.id).replace('date-', '')

    if (taskId && targetDate) {
      moveTaskToDate(taskId, new Date(targetDate).toISOString())
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

        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex gap-6 overflow-hidden">
            <div className="flex-1 flex flex-col">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 overflow-y-auto">
                {calendarDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = isSameDay(day, new Date(selectedDate))
                  const isTodayDate = isToday(day)
                  const dayTasks = getTasksForDay(dateStr)

                  return (
                    <DroppableDateCell
                      key={idx}
                      date={day}
                      isCurrentMonth={isCurrentMonth}
                      isSelected={isSelected}
                      isTodayDate={isTodayDate}
                      dayTasks={dayTasks}
                      onClick={() => setSelectedDate(dateStr)}
                      onTaskClick={(t) => { setEditingTask(t); setShowEditor(true) }}
                    />
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
                <p className="mt-1 text-xs text-gray-400">💡 拖拽任务到其他日期可改期</p>
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
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </DndContext>
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
