export type Priority = 'low' | 'medium' | 'high'

export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Tag {
  id: string
  name: string
  color: string
}

export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  tagIds: string[]
  dueDate?: string
  completed: boolean
  completedAt?: string
  createdAt: string
  repeat: RepeatFrequency
  subTasks: SubTask[]
  order: number
  archived: boolean
}

export interface FocusSession {
  id: string
  taskId?: string
  startTime: string
  endTime: string
  duration: number
  type: 'focus' | 'break'
  completed: boolean
}

export interface DailyReview {
  date: string
  content: string
  createdAt: string
  mood?: 'great' | 'good' | 'neutral' | 'bad'
}

export type ViewType = 'board' | 'tasks' | 'calendar' | 'focus' | 'review'
