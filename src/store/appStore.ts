import { create } from 'zustand'
import type { Task, Tag, FocusSession, DailyReview, SubTask, Priority, RepeatFrequency, ViewType } from '@/types'
import { storage } from '@/utils/storage'
import { generateId } from '@/utils/cn'
import { isSameDate, getTodayStr, isOverdue } from '@/utils/date'
import { addDays, addWeeks, addMonths, isToday } from 'date-fns'

interface AppState {
  currentView: ViewType
  tasks: Task[]
  tags: Tag[]
  focusSessions: FocusSession[]
  reviews: DailyReview[]
  searchQuery: string
  activeTagIds: string[]

  setCurrentView: (view: ViewType) => void
  setSearchQuery: (query: string) => void
  toggleActiveTag: (tagId: string) => void
  clearActiveTags: () => void

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'subTasks' | 'order'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskComplete: (id: string) => void
  reorderTasks: (taskIds: string[]) => void

  addSubTask: (taskId: string, title: string) => void
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void
  deleteSubTask: (taskId: string, subTaskId: string) => void

  addTag: (name: string, color: string) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  deleteTag: (id: string) => void

  addFocusSession: (session: Omit<FocusSession, 'id'>) => void
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => void

  addReview: (review: Omit<DailyReview, 'createdAt'>) => void
  updateReview: (date: string, updates: Partial<DailyReview>) => void

  getTodayTasks: () => Task[]
  getOverdueTasks: () => Task[]
  getTasksByDate: (date: string) => Task[]
  getFilteredTasks: () => Task[]
}

const STORAGE_KEY = 'productivity-app-state'

const defaultTags: Tag[] = [
  { id: 'tag-work', name: '工作', color: '#3b82f6' },
  { id: 'tag-life', name: '生活', color: '#10b981' },
  { id: 'tag-study', name: '学习', color: '#8b5cf6' },
  { id: 'tag-health', name: '健康', color: '#ef4444' },
]

function loadInitialState(): Partial<AppState> {
  const saved = storage.get<any>(STORAGE_KEY, null)
  if (saved) {
    return {
      tasks: saved.tasks || [],
      tags: saved.tags?.length ? saved.tags : defaultTags,
      focusSessions: saved.focusSessions || [],
      reviews: saved.reviews || [],
    }
  }
  return {
    tasks: [],
    tags: defaultTags,
    focusSessions: [],
    reviews: [],
  }
}

function getNextOccurrence(baseDate: string, repeat: RepeatFrequency): string {
  const date = new Date(baseDate)
  switch (repeat) {
    case 'daily':
      return addDays(date, 1).toISOString()
    case 'weekly':
      return addWeeks(date, 1).toISOString()
    case 'monthly':
      return addMonths(date, 1).toISOString()
    default:
      return baseDate
  }
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = loadInitialState()

  return {
    currentView: 'board',
    tasks: initial.tasks || [],
    tags: initial.tags || defaultTags,
    focusSessions: initial.focusSessions || [],
    reviews: initial.reviews || [],
    searchQuery: '',
    activeTagIds: [],

    setCurrentView: (view) => set({ currentView: view }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    toggleActiveTag: (tagId) =>
      set((state) => ({
        activeTagIds: state.activeTagIds.includes(tagId)
          ? state.activeTagIds.filter((id) => id !== tagId)
          : [...state.activeTagIds, tagId],
      })),
    clearActiveTags: () => set({ activeTagIds: [] }),

    addTask: (taskData) => {
      const newTask: Task = {
        ...taskData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        completed: false,
        subTasks: [],
        order: get().tasks.length,
      }
      set((state) => {
        const tasks = [...state.tasks, newTask]
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    updateTask: (id, updates) => {
      set((state) => {
        const tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    deleteTask: (id) => {
      set((state) => {
        const tasks = state.tasks.filter((t) => t.id !== id)
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    toggleTaskComplete: (id) => {
      set((state) => {
        let tasks = state.tasks.map((t) => {
          if (t.id === id) {
            const wasCompleted = t.completed
            const nowCompleted = !wasCompleted
            const updated: Task = {
              ...t,
              completed: nowCompleted,
              completedAt: nowCompleted ? new Date().toISOString() : undefined,
            }

            if (nowCompleted && t.repeat !== 'none' && t.dueDate) {
              const newDueDate = getNextOccurrence(t.dueDate, t.repeat)
              const repeatedTask: Task = {
                ...t,
                id: generateId(),
                createdAt: new Date().toISOString(),
                completed: false,
                completedAt: undefined,
                dueDate: newDueDate,
                order: state.tasks.length,
              }
              return [updated, repeatedTask]
            }
            return [updated]
          }
          return [t]
        }).flat()

        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    reorderTasks: (taskIds) => {
      set((state) => {
        const taskMap = new Map(state.tasks.map((t) => [t.id, t]))
        const tasks = taskIds.map((id, idx) => ({
          ...taskMap.get(id)!,
          order: idx,
        }))
        state.tasks.forEach((t) => {
          if (!taskIds.includes(t.id)) {
            tasks.push(t)
          }
        })
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    addSubTask: (taskId, title) => {
      set((state) => {
        const tasks = state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: [
                  ...t.subTasks,
                  { id: generateId(), title, completed: false },
                ],
              }
            : t
        )
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    updateSubTask: (taskId, subTaskId, updates) => {
      set((state) => {
        const tasks = state.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((st) =>
                  st.id === subTaskId ? { ...st, ...updates } : st
                ),
              }
            : t
        )
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    deleteSubTask: (taskId, subTaskId) => {
      set((state) => {
        const tasks = state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subTasks: t.subTasks.filter((st) => st.id !== subTaskId) }
            : t
        )
        storage.set(STORAGE_KEY, { ...state, tasks })
        return { tasks }
      })
    },

    addTag: (name, color) => {
      set((state) => {
        const tag: Tag = { id: generateId(), name, color }
        const tags = [...state.tags, tag]
        storage.set(STORAGE_KEY, { ...state, tags })
        return { tags }
      })
    },

    updateTag: (id, updates) => {
      set((state) => {
        const tags = state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t))
        storage.set(STORAGE_KEY, { ...state, tags })
        return { tags }
      })
    },

    deleteTag: (id) => {
      set((state) => {
        const tags = state.tags.filter((t) => t.id !== id)
        const tasks = state.tasks.map((t) => ({
          ...t,
          tagIds: t.tagIds.filter((tid) => tid !== id),
        }))
        const activeTagIds = state.activeTagIds.filter((tid) => tid !== id)
        storage.set(STORAGE_KEY, { ...state, tags, tasks })
        return { tags, tasks, activeTagIds }
      })
    },

    addFocusSession: (session) => {
      set((state) => {
        const focusSessions = [
          ...state.focusSessions,
          { ...session, id: generateId() },
        ]
        storage.set(STORAGE_KEY, { ...state, focusSessions })
        return { focusSessions }
      })
    },

    updateFocusSession: (id, updates) => {
      set((state) => {
        const focusSessions = state.focusSessions.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        )
        storage.set(STORAGE_KEY, { ...state, focusSessions })
        return { focusSessions }
      })
    },

    addReview: (review) => {
      set((state) => {
        const existing = state.reviews.find((r) => r.date === review.date)
        let reviews
        if (existing) {
          reviews = state.reviews.map((r) =>
            r.date === review.date ? { ...r, ...review, createdAt: new Date().toISOString() } : r
          )
        } else {
          reviews = [
            ...state.reviews,
            { ...review, createdAt: new Date().toISOString() },
          ]
        }
        storage.set(STORAGE_KEY, { ...state, reviews })
        return { reviews }
      })
    },

    updateReview: (date, updates) => {
      set((state) => {
        const reviews = state.reviews.map((r) =>
          r.date === date ? { ...r, ...updates } : r
        )
        storage.set(STORAGE_KEY, { ...state, reviews })
        return { reviews }
      })
    },

    getTodayTasks: () => {
      const state = get()
      return state.tasks
        .filter((t) => {
          if (t.completed) return t.completedAt ? isToday(new Date(t.completedAt)) : false
          if (!t.dueDate) return true
          return isToday(new Date(t.dueDate))
        })
        .sort((a, b) => a.order - b.order)
    },

    getOverdueTasks: () => {
      const state = get()
      return state.tasks.filter((t) => !t.completed && isOverdue(t.dueDate))
    },

    getTasksByDate: (date) => {
      const state = get()
      return state.tasks.filter((t) => {
        if (t.completed) {
          return t.completedAt ? isSameDate(t.completedAt, date) : false
        }
        if (!t.dueDate) return false
        return isSameDate(t.dueDate, date)
      })
    },

    getFilteredTasks: () => {
      const state = get()
      return state.tasks.filter((t) => {
        if (state.searchQuery) {
          const q = state.searchQuery.toLowerCase()
          if (
            !t.title.toLowerCase().includes(q) &&
            !t.description?.toLowerCase().includes(q) &&
            !t.subTasks.some((st) => st.title.toLowerCase().includes(q))
          ) {
            return false
          }
        }
        if (state.activeTagIds.length > 0) {
          if (!state.activeTagIds.some((id) => t.tagIds.includes(id))) {
            return false
          }
        }
        return true
      })
    },
  }
})
