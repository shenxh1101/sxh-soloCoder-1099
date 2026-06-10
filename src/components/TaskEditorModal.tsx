import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { Checkbox } from './ui/Checkbox'
import { TagBadge } from './ui/TagBadge'
import { useAppStore } from '@/store/appStore'
import type { Task, Priority, RepeatFrequency } from '@/types'
import { cn } from '@/utils/cn'
import { Plus, X } from 'lucide-react'

interface TaskEditorModalProps {
  open: boolean
  onClose: () => void
  editTask?: Task | null
  defaultDueDate?: string
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#dc2626' },
  { value: 'medium', label: '中', color: '#d97706' },
  { value: 'low', label: '低', color: '#059669' },
]

const repeatOptions: { value: RepeatFrequency; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export function TaskEditorModal({ open, onClose, editTask, defaultDueDate }: TaskEditorModalProps) {
  const addTask = useAppStore((s) => s.addTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const tags = useAppStore((s) => s.tags)
  const addTag = useAppStore((s) => s.addTag)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [repeat, setRepeat] = useState<RepeatFrequency>('none')
  const [newSubTask, setNewSubTask] = useState('')
  const [subTasks, setSubTasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')

  useEffect(() => {
    if (open) {
      if (editTask) {
        setTitle(editTask.title)
        setDescription(editTask.description || '')
        setPriority(editTask.priority)
        setDueDate(editTask.dueDate ? editTask.dueDate.slice(0, 10) : '')
        setTagIds(editTask.tagIds)
        setRepeat(editTask.repeat)
        setSubTasks(editTask.subTasks)
      } else {
        setTitle('')
        setDescription('')
        setPriority('medium')
        setDueDate(defaultDueDate || '')
        setTagIds([])
        setRepeat('none')
        setSubTasks([])
      }
      setNewSubTask('')
      setShowNewTag(false)
      setNewTagName('')
    }
  }, [open, editTask, defaultDueDate])

  const handleSubmit = () => {
    if (!title.trim()) return

    if (editTask) {
      updateTask(editTask.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        tagIds,
        repeat,
        subTasks,
      })
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        tagIds,
        repeat,
      })
      if (subTasks.length > 0) {
      }
    }
    onClose()
  }

  const toggleTag = (tagId: string) => {
    setTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleAddSubTask = () => {
    if (!newSubTask.trim()) return
    setSubTasks((prev) => [
      ...prev,
      { id: Date.now().toString(36), title: newSubTask.trim(), completed: false },
    ])
    setNewSubTask('')
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return
    addTag(newTagName.trim(), newTagColor)
    setNewTagName('')
    setShowNewTag(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTask ? '编辑任务' : '新建任务'}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">标题</label>
          <Input
            placeholder="要做什么？"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">描述</label>
          <Textarea
            placeholder="更多详情..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">截止日期</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">重复</label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as RepeatFrequency)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {repeatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">优先级</label>
          <div className="flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                  priority === p.value
                    ? 'border-2'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                style={{
                  borderColor: priority === p.value ? p.color : undefined,
                  color: p.color,
                  backgroundColor: priority === p.value ? `${p.color}10` : 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">标签</label>
            <button
              onClick={() => setShowNewTag(!showNewTag)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              + 新建标签
            </button>
          </div>
          {showNewTag && (
            <div className="mb-3 flex gap-2">
              <Input
                placeholder="标签名称"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-9 w-9 rounded-lg border border-gray-300 cursor-pointer"
              />
              <Button size="sm" onClick={handleAddTag}>
                添加
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <TagBadge
                key={tag.id}
                tagId={tag.id}
                size="md"
                active={tagIds.includes(tag.id)}
                onClick={() => toggleTag(tag.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">子任务</label>
          {subTasks.length > 0 && (
            <div className="mb-2 space-y-1">
              {subTasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Checkbox
                    checked={st.completed}
                    onChange={(v) =>
                      setSubTasks((prev) =>
                        prev.map((t) => (t.id === st.id ? { ...t, completed: v } : t))
                      )
                    }
                  />
                  <span className={cn('flex-1 text-sm', st.completed && 'line-through text-gray-400')}>
                    {st.title}
                  </span>
                  <button
                    onClick={() =>
                      setSubTasks((prev) => prev.filter((t) => t.id !== st.id))
                    }
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="添加子任务..."
              value={newSubTask}
              onChange={(e) => setNewSubTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
              className="flex-1"
            />
            <Button size="sm" onClick={handleAddSubTask} icon={<Plus size={16} />}>
              添加
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {editTask ? '保存' : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
