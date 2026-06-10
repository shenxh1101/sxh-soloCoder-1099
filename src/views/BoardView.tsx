import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from '@/components/TaskCard'
import { TaskEditorModal } from '@/components/TaskEditorModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TagBadge } from '@/components/ui/TagBadge'
import { Plus, Search, Sun, ListTodo, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { formatDate, getTodayStr } from '@/utils/date'
import { cn } from '@/utils/cn'

export function BoardView() {
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [quickAdd, setQuickAdd] = useState('')

  const getTodayTasks = useAppStore((s) => s.getTodayTasks)
  const getOverdueTasks = useAppStore((s) => s.getOverdueTasks)
  const addTask = useAppStore((s) => s.addTask)
  const reorderTasks = useAppStore((s) => s.reorderTasks)
  const tags = useAppStore((s) => s.tags)
  const activeTagIds = useAppStore((s) => s.activeTagIds)
  const toggleActiveTag = useAppStore((s) => s.toggleActiveTag)
  const clearActiveTags = useAppStore((s) => s.clearActiveTags)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const todayTasks = useMemo(() => {
    let tasks = getTodayTasks()
    if (activeTagIds.length > 0) {
      tasks = tasks.filter((t) => t.tagIds.some((id) => activeTagIds.includes(id)))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.subTasks.some((st) => st.title.toLowerCase().includes(q))
      )
    }
    return tasks
  }, [getTodayTasks, activeTagIds, searchQuery])

  const overdueTasks = useMemo(() => {
    let tasks = getOverdueTasks()
    if (activeTagIds.length > 0) {
      tasks = tasks.filter((t) => t.tagIds.some((id) => activeTagIds.includes(id)))
    }
    return tasks
  }, [getOverdueTasks, activeTagIds])

  const pendingTasks = todayTasks.filter((t) => !t.completed)
  const completedTasks = todayTasks.filter((t) => t.completed)

  const handleQuickAdd = () => {
    if (!quickAdd.trim()) return
    addTask({
      title: quickAdd.trim(),
      priority: 'medium',
      tagIds: [],
      dueDate: new Date().toISOString(),
      repeat: 'none',
    })
    setQuickAdd('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const taskIds = pendingTasks.map((t) => t.id)
      const oldIndex = taskIds.indexOf(String(active.id))
      const newIndex = taskIds.indexOf(String(over.id))
      const newIds = arrayMove(taskIds, oldIndex, newIndex)
      reorderTasks(newIds)
    }
  }

  const today = new Date()
  const greeting = today.getHours() < 12 ? '早上好' : today.getHours() < 18 ? '下午好' : '晚上好'

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
          <p className="mt-1 text-gray-500">
            今天是 {formatDate(today, 'yyyy年M月d日 EEEE')}，你有 {pendingTasks.length} 个待办事项
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="快速添加今日任务..."
              value={quickAdd}
              onChange={(e) => setQuickAdd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
            />
            <Button onClick={handleQuickAdd} icon={<Plus size={18} />}>
              添加
            </Button>
          </div>
          <Button variant="secondary" onClick={() => { setEditingTask(null); setShowEditor(true) }} icon={<ListTodo size={18} />}>
            详细创建
          </Button>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <Input
              placeholder="搜索今日任务..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tagId={tag.id}
                size="md"
                active={activeTagIds.includes(tag.id)}
                onClick={() => toggleActiveTag(tag.id)}
              />
            ))}
            {activeTagIds.length > 0 && (
              <button
                onClick={clearActiveTags}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h2 className="text-sm font-semibold text-red-600">
                过期事项 ({overdueTasks.length})
              </h2>
            </div>
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Sun size={18} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              待办 ({pendingTasks.length})
            </h2>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400">暂无待办事项，添加一个开始你的一天吧！</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {completedTasks.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                已完成 ({completedTasks.length})
              </h2>
            </div>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <TaskEditorModal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        editTask={editingTask}
        defaultDueDate={getTodayStr()}
      />
    </div>
  )
}
