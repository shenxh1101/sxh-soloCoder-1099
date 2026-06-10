import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from '@/components/TaskCard'
import { TaskEditorModal } from '@/components/TaskEditorModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TagBadge } from '@/components/ui/TagBadge'
import { Plus, Search, Filter, ListTodo } from 'lucide-react'
import type { Priority } from '@/types'

type SortBy = 'createdAt' | 'dueDate' | 'priority' | 'completed'
type FilterStatus = 'all' | 'pending' | 'completed'

export function TasksView() {
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const getFilteredTasks = useAppStore((s) => s.getFilteredTasks)
  const tags = useAppStore((s) => s.tags)
  const activeTagIds = useAppStore((s) => s.activeTagIds)
  const toggleActiveTag = useAppStore((s) => s.toggleActiveTag)
  const clearActiveTags = useAppStore((s) => s.clearActiveTags)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 }

  const tasks = useMemo(() => {
    let result = getFilteredTasks()

    if (filterStatus === 'pending') {
      result = result.filter((t) => !t.completed)
    } else if (filterStatus === 'completed') {
      result = result.filter((t) => t.completed)
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (sortBy === 'priority') {
        return priorityWeight[b.priority] - priorityWeight[a.priority]
      }
      if (sortBy === 'completed') {
        return (a.completed ? 1 : 0) - (b.completed ? 1 : 0)
      }
      return 0
    })

    return result
  }, [getFilteredTasks, sortBy, filterStatus])

  const pendingCount = tasks.filter((t) => !t.completed).length
  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">任务清单</h1>
            <p className="mt-1 text-gray-500">
              共 {tasks.length} 个任务 · 进行中 {pendingCount} · 已完成 {completedCount}
            </p>
          </div>
          <Button onClick={() => { setEditingTask(null); setShowEditor(true) }} icon={<Plus size={18} />}>
            新建任务
          </Button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="搜索任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">全部状态</option>
                <option value="pending">进行中</option>
                <option value="completed">已完成</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="createdAt">按创建时间</option>
                <option value="dueDate">按截止日期</option>
                <option value="priority">按优先级</option>
                <option value="completed">按完成状态</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ListTodo size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">按标签筛选：</span>
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

        {tasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
            <ListTodo size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400">暂无任务，点击右上角开始创建吧！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                draggable={false}
              />
            ))}
          </div>
        )}
      </div>

      <TaskEditorModal
        open={showEditor}
        onClose={() => setShowEditor(false)}
        editTask={editingTask}
      />
    </div>
  )
}
