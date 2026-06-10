import { create } from 'zustand'
import type { Task, Tag, FocusSession, DailyReview, SubTask, Priority, RepeatFrequency, ViewType } from '@/types'
import { storage } from '@/utils/storage'
import { generateId } from '@/utils/cn'
import { isSameDate, getTodayStr, isOverdue } from '@/utils/date'
import { addDays, addWeeks, addMonths, isToday, format } from 'date-fns'

interface WeeklyNote {
  weekGoals: string
  nextWeekPlan: string
}

interface SavedFilterState {
  searchQuery: string
  activeTagIds: string[]
}

interface AppState {
  currentView: ViewType
  tasks: Task[]
  tags: Tag[]
  focusSessions: FocusSession[]
  reviews: DailyReview[]
  weeklyNotes: Record<string, WeeklyNote>
  searchQuery: string
  activeTagIds: string[]
  highlightedTaskId: string | null
  reviewFocusDate: string | null
  taskFilterOverride: boolean
  savedFilter: SavedFilterState | null
  filterSuspended: boolean
  toast: { message: string; type: 'success' | 'info' } | null

  setCurrentView: (view: ViewType) => void
  setSearchQuery: (query: string) => void
  toggleActiveTag: (tagId: string) => void
  clearActiveTags: () => void
  setHighlightedTaskId: (id: string | null) => void
  setReviewFocusDate: (date: string | null) => void
  setTaskFilterOverride: (v: boolean) => void
  suspendFilters: () => void
  restoreFilters: () => void
  updateWeeklyNote: (weekKey: string, patch: Partial<WeeklyNote>) => void
  showToast: (message: string, type?: 'success' | 'info') => void
  clearToast: () => void

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed' | 'order' | 'archived'> & { subTasks?: SubTask[] }) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskComplete: (id: string) => void
  reorderTasks: (taskIds: string[]) => void
  batchUpdateTasks: (ids: string[], updates: Partial<Task>) => number
  archiveTasks: (ids: string[]) => number
  moveTaskToDate: (id: string, newDueDate: string) => void

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
    const tasks = (saved.tasks || []).map((t: Task) => ({
      ...t,
      archived: t.archived ?? false,
    }))
    return {
      tasks,
      tags: saved.tags?.length ? saved.tags : defaultTags,
      focusSessions: saved.focusSessions || [],
      reviews: saved.reviews || [],
      weeklyNotes: saved.weeklyNotes || {},
    }
  }
  return {
    tasks: [],
    tags: defaultTags,
    focusSessions: [],
    reviews: [],
    weeklyNotes: {},
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

function persist(state: any) {
  storage.set(STORAGE_KEY, {
    tasks: state.tasks,
    tags: state.tags,
    focusSessions: state.focusSessions,
    reviews: state.reviews,
    weeklyNotes: state.weeklyNotes,
  })
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = loadInitialState()

  return {
    currentView: 'board',
    tasks: initial.tasks || [],
    tags: initial.tags || defaultTags,
    focusSessions: initial.focusSessions || [],
    reviews: initial.reviews || [],
    weeklyNotes: initial.weeklyNotes || {},
    searchQuery: '',
    activeTagIds: [],
    highlightedTaskId: null,
    reviewFocusDate: null,
    taskFilterOverride: false,
    savedFilter: null,
    filterSuspended: false,
    toast: null,

    setCurrentView: (view) => set({ currentView: view }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    toggleActiveTag: (tagId) =>
      set((state) => ({
        activeTagIds: state.activeTagIds.includes(tagId)
          ? state.activeTagIds.filter((id) => id !== tagId)
          : [...state.activeTagIds, tagId],
      })),
    clearActiveTags: () => set({ activeTagIds: [] }),
    setHighlightedTaskId: (id) => set({ highlightedTaskId: id }),
    setReviewFocusDate: (date) => set({ reviewFocusDate: date }),
    setTaskFilterOverride: (v) => set({ taskFilterOverride: v }),

    suspendFilters: () => {
      const s = get()
      set({
        savedFilter: { searchQuery: s.searchQuery, activeTagIds: [...s.activeTagIds] },
        searchQuery: '',
        activeTagIds: [],
        filterSuspended: true,
      })
    },

    restoreFilters: () => {
      const s = get()
      if (s.savedFilter) {
        set({
          searchQuery: s.savedFilter.searchQuery,
          activeTagIds: s.savedFilter.activeTagIds,
          savedFilter: null,
          filterSuspended: false,
        })
      }
    },

    updateWeeklyNote: (weekKey, patch) => {
      set((state) => {
        const weeklyNotes = {
          ...state.weeklyNotes,
          [weekKey]: { ...(state.weeklyNotes[weekKey] || { weekGoals: '', nextWeekPlan: '' }), ...patch },
        }
        persist({ ...state, weeklyNotes })
        return { weeklyNotes }
      })
    },

    showToast: (message, type = 'success') => {
      set({ toast: { message, type } })
      setTimeout(() => set({ toast: null }), 2500)
    },
    clearToast: () => set({ toast: null }),

    addTask: (taskData) => {
      const { subTasks: inputSubTasks, ...rest } = taskData
      const newTask: Task = {
        ...rest,
        id: generateId(),
        createdAt: new Date().toISOString(),
        completed: false,
        subTasks: inputSubTasks || [],
        order: get().tasks.length,
        archived: false,
      }
      set((state) => {
        const tasks = [...state.tasks, newTask]
        persist({ ...state, tasks })
        return { tasks }
      })
    },

    updateTask: (id, updates) => {
      set((state) => {
        const tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
        persist({ ...state, tasks })
        return { tasks }
      })
    },

    deleteTask: (id) => {
      set((state) => {
        const tasks = state.tasks.filter((t) => t.id !== id)
        persist({ ...state, tasks })
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
              const resetSubTasks = t.subTasks.map((st) => ({ ...st, completed: false }))
              const repeatedTask: Task = {
                ...t,
                id: generateId(),
                createdAt: new Date().toISOString(),
                completed: false,
                completedAt: undefined,
                dueDate: newDueDate,
                subTasks: resetSubTasks,
                order: state.tasks.length,
                archived: false,
              }
              return [updated, repeatedTask]
            }
            return [updated]
          }
          return [t]
        }).flat()

        persist({ ...state, tasks })
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
        persist({ ...state, tasks })
        return { tasks }
      })
    },

    batchUpdateTasks: (ids, updates) => {
      let updatedCount = 0
      set((state) => {
        const tasks = state.tasks.map((t) => {
          if (ids.includes(t.id)) {
            updatedCount++
            return { ...t, ...updates }
          }
          return t
        })
        persist({ ...state, tasks })
        return { tasks }
      })
      return updatedCount
    },

    archiveTasks: (ids) => {
      let archivedCount = 0
      set((state) => {
        const tasks = state.tasks.map((t) => {
          if (ids.includes(t.id) && t.completed) {
            archivedCount++
            return { ...t, archived: true }
          }
          return t
        })
        persist({ ...state, tasks })
        return { tasks }
      })
      return archivedCount
    },

    moveTaskToDate: (id, newDueDate) => {
      set((state) => {
        const tasks = state.tasks.map((t) => {
          if (t.id !== id) return t
          const updates: Partial<Task> = { dueDate: newDueDate }
          if (t.completed) {
            const old = t.completedAt ? new Date(t.completedAt) : null
            const nd = new Date(newDueDate)
            if (old) {
              old.setFullYear(nd.getFullYear())
              old.setMonth(nd.getMonth())
              old.setDate(nd.getDate())
              updates.completedAt = old.toISOString()
            } else {
              updates.completedAt = new Date(newDueDate).toISOString()
            }
          }
          return { ...t, ...updates }
        })
        persist({ ...state, tasks })
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
        persist({ ...state, tasks })
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
        persist({ ...state, tasks })
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
        persist({ ...state, tasks })
        return { tasks }
      })
    },

    addTag: (name, color) => {
      set((state) => {
        const tag: Tag = { id: generateId(), name, color }
        const tags = [...state.tags, tag]
        persist({ ...state, tags })
        return { tags }
      })
    },

    updateTag: (id, updates) => {
      set((state) => {
        const tags = state.tags.map((t) => (t.id === id ? { ...t, ...updates } : t))
        persist({ ...state, tags })
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
        persist({ ...state, tags, tasks })
        return { tags, tasks, activeTagIds }
      })
    },

    addFocusSession: (session) => {
      set((state) => {
        const focusSessions = [
          ...state.focusSessions,
          { ...session, id: generateId() },
        ]
        persist({ ...state, focusSessions })
        return { focusSessions }
      })
    },

    updateFocusSession: (id, updates) => {
      set((state) => {
        const focusSessions = state.focusSessions.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        )
        persist({ ...state, focusSessions })
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
        persist({ ...state, reviews })
        return { reviews }
      })
    },

    updateReview: (date, updates) => {
      set((state) => {
        const reviews = state.reviews.map((r) =>
          r.date === date ? { ...r, ...updates } : r
        )
        persist({ ...state, reviews })
        return { reviews }
      })
    },

    getTodayTasks: () => {
      const state = get()
      return state.tasks
        .filter((t) => {
          if (t.archived) return false
          if (t.completed) return t.completedAt ? isToday(new Date(t.completedAt)) : false
          if (!t.dueDate) return true
          return isToday(new Date(t.dueDate))
        })
        .sort((a, b) => a.order - b.order)
    },

    getOverdueTasks: () => {
      const state = get()
      return state.tasks.filter((t) => !t.archived && !t.completed && isOverdue(t.dueDate))
    },

    getTasksByDate: (date) => {
      const state = get()
      return state.tasks.filter((t) => {
        if (t.archived) return false
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
        if (t.archived) return false
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
