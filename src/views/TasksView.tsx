import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { TaskCard } from '@/components/TaskCard'
import { TaskEditorModal } from '@/components/TaskEditorModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TagBadge } from '@/components/ui/TagBadge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Plus, Search, Filter, ListTodo, Archive, X, Tag, Calendar, ArrowUp } from 'lucide-react'
import type { Priority } from '@/types'

type SortBy = 'createdAt' | 'dueDate' | 'priority' | 'completed'
type FilterStatus = 'all' | 'pending' | 'completed'

export function TasksView() {
  const [editingTask, setEditingTask] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchBar, setShowBatchBar] = useState(false)
  const [showBatchPanel, setShowBatchPanel] = useState(false)
  const [batchTagIds, setBatchTagIds] = useState<string[]>([])
  const [batchDueDate, setBatchDueDate] = useState('')
  const [batchPriority, setBatchPriority] = useState<Priority | ''>('')

  const getFilteredTasks = useAppStore((s) => s.getFilteredTasks)
  const tags = useAppStore((s) => s.tags)
  const activeTagIds = useAppStore((s) => s.activeTagIds)
  const toggleActiveTag = useAppStore((s) => s.toggleActiveTag)
  const clearActiveTags = useAppStore((s) => s.clearActiveTags)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const batchUpdateTasks = useAppStore((s) => s.batchUpdateTasks)
  const archiveTasks = useAppStore((s) => s.archiveTasks)
  const showToast = useAppStore((s) => s.showToast)

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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(tasks.map((t) => t.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setShowBatchBar(false)
    setShowBatchPanel(false)
  }

  const handleBatchApply = () => {
    const updates: Partial<import('@/types').Task> = {}
    const parts: string[] = []
    if (batchTagIds.length > 0) {
      updates.tagIds = batchTagIds
      const tagNames = batchTagIds.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean).join('、')
      parts.push(`标签：${tagNames}`)
    }
    if (batchDueDate) {
      updates.dueDate = new Date(batchDueDate).toISOString()
      parts.push(`截止：${batchDueDate}`)
    }
    if (batchPriority) {
      updates.priority = batchPriority
      const label = batchPriority === 'high' ? '高' : batchPriority === 'medium' ? '中' : '低'
      parts.push(`优先级：${label}`)
    }

    if (Object.keys(updates).length > 0) {
      const count = batchUpdateTasks(Array.from(selectedIds), updates)
      showToast(`已批量修改 ${count} 个任务（${parts.join('，')}）`)
    } else {
      showToast('未选择任何修改项', 'info')
    }
    clearSelection()
  }

  const handleBatchArchive = () => {
    const selectedCompletedCount = Array.from(selectedIds).filter((id) => {
      const t = tasks.find((task) => task.id === id)
      return t?.completed
    }).length
    if (selectedCompletedCount === 0) {
      showToast('选中的任务中没有已完成项', 'info')
      return
    }
    const count = archiveTasks(Array.from(selectedIds))
    showToast(`已归档 ${count} 个已完成任务`)
    clearSelection()
  }

  const handleEnterBatchMode = () => {
    setShowBatchBar(true)
    setSelectedIds(new Set())
    setShowBatchPanel(false)
    setBatchTagIds([])
    setBatchDueDate('')
    setBatchPriority('')
  }

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
          <div className="flex gap-2">
            {!showBatchBar && (
              <Button variant="secondary" onClick={handleEnterBatchMode} icon={<ListTodo size={16} />}>
                批量管理
              </Button>
            )}
            <Button onClick={() => { setEditingTask(null); setShowEditor(true) }} icon={<Plus size={18} />}>
              新建任务
            </Button>
          </div>
        </div>

        {showBatchBar && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
            <Checkbox
              checked={selectedIds.size === tasks.length && tasks.length > 0}
              onChange={() => selectedIds.size === tasks.length ? clearSelection() : selectAll()}
            />
            <span className="text-sm font-medium text-primary-700">
              已选 {selectedIds.size} 项
              {selectedIds.size > 0 && (() => {
                const completed = Array.from(selectedIds).filter((id) => tasks.find((t) => t.id === id)?.completed).length
                const pending = selectedIds.size - completed
                if (completed > 0 && pending > 0) return `（${completed} 已完成 / ${pending} 待办）`
                return ''
              })()}
            </span>
            {selectedIds.size > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowBatchPanel(!showBatchPanel)} icon={<Tag size={14} />}>
                  批量修改
                </Button>
                {selectedIds.size > 0 && tasks.some((t) => selectedIds.has(t.id) && t.completed) && (
                  <Button size="sm" variant="secondary" onClick={handleBatchArchive} icon={<Archive size={14} />}>
                    归档已完成
                  </Button>
                )}
              </>
            )}
            <div className="flex-1" />
            <button onClick={clearSelection} className="text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
        )}

        {showBatchPanel && selectedIds.size > 0 && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-sm font-semibold text-gray-700">批量修改选中的 {selectedIds.size} 个任务</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-500">设置标签</label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tagId={tag.id}
                      size="sm"
                      active={batchTagIds.includes(tag.id)}
                      onClick={() =>
                        setBatchTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">设置截止日期</label>
                <Input type="date" value={batchDueDate} onChange={(e) => setBatchDueDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">设置优先级</label>
                <select
                  value={batchPriority}
                  onChange={(e) => setBatchPriority(e.target.value as Priority | '')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">不改</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowBatchPanel(false)}>取消</Button>
              <Button size="sm" onClick={handleBatchApply}>应用修改</Button>
            </div>
          </div>
        )}

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
              <div key={task.id} className="flex items-center gap-2">
                {showBatchBar && (
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onChange={() => toggleSelect(task.id)}
                  />
                )}
                <div className="flex-1">
                  <TaskCard
                    task={task}
                    onEdit={() => { setEditingTask(task); setShowEditor(true) }}
                    draggable={false}
                  />
                </div>
              </div>
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
