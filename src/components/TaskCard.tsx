import { useState, useEffect } from 'react'
import type { Task } from '@/types'
import { Checkbox } from './ui/Checkbox'
import { TagBadge } from './ui/TagBadge'
import { PriorityBadge } from './ui/PriorityBadge'
import { useAppStore } from '@/store/appStore'
import { formatDueDate, isOverdue } from '@/utils/date'
import { cn } from '@/utils/cn'
import { Calendar, Clock, Edit2, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TaskCardProps {
  task: Task
  onEdit?: () => void
  showSubTasks?: boolean
  draggable?: boolean
}

export function TaskCard({ task, onEdit, showSubTasks = true, draggable = true }: TaskCardProps) {
  const toggleTaskComplete = useAppStore((s) => s.toggleTaskComplete)
  const deleteTask = useAppStore((s) => s.deleteTask)
  const toggleSubTask = useAppStore((s) => s.updateSubTask)
  const highlightedTaskId = useAppStore((s) => s.highlightedTaskId)
  const [expanded, setExpanded] = useState(false)
  const [isHighlight, setIsHighlight] = useState(false)

  useEffect(() => {
    if (highlightedTaskId === task.id) {
      setIsHighlight(true)
      setExpanded(true)
      const t = setTimeout(() => setIsHighlight(false), 2500)
      return () => clearTimeout(t)
    }
  }, [highlightedTaskId, task.id])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = draggable
    ? useSortable({ id: task.id })
    : { attributes: {}, listeners: {}, setNodeRef: null, transform: null, transition: null, isDragging: false }

  const style = transform && setNodeRef
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const overdue = !task.completed && isOverdue(task.dueDate)
  const completedSubTasks = task.subTasks.filter((st) => st.completed).length
  const totalSubTasks = task.subTasks.length

  return (
    <div
      id={`task-${task.id}`}
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md',
        overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200',
        task.completed && 'opacity-60',
        isHighlight && 'ring-2 ring-primary-400 ring-offset-2 animate-pulse'
      )}
    >
      <div className="flex items-start gap-3">
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
        )}
        <Checkbox
          checked={task.completed}
          onChange={() => toggleTaskComplete(task.id)}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'font-medium text-gray-900 break-words',
                task.completed && 'line-through text-gray-400'
              )}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && !task.completed && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            {task.tagIds.slice(0, 3).map((tagId) => (
              <TagBadge key={tagId} tagId={tagId} />
            ))}
            {task.tagIds.length > 3 && (
              <span className="text-xs text-gray-400">+{task.tagIds.length - 3}</span>
            )}
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                  overdue
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {overdue ? <Clock size={12} /> : <Calendar size={12} />}
                {formatDueDate(task.dueDate)}
                {overdue && ' (已过期)'}
              </span>
            )}
            {task.repeat !== 'none' && (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-600">
                {task.repeat === 'daily' ? '每天' : task.repeat === 'weekly' ? '每周' : '每月'}
              </span>
            )}
          </div>

          {showSubTasks && totalSubTasks > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                子任务 {completedSubTasks}/{totalSubTasks}
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5 pl-2">
                  {task.subTasks.map((st) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={st.completed}
                        onChange={(v) => toggleSubTask(task.id, st.id, { completed: v })}
                        size="sm"
                      />
                      <span
                        className={cn(
                          'text-sm',
                          st.completed ? 'text-gray-400 line-through' : 'text-gray-600'
                        )}
                      >
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
