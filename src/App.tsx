import { useAppStore } from '@/store/appStore'
import { BoardView } from '@/views/BoardView'
import { TasksView } from '@/views/TasksView'
import { CalendarView } from '@/views/CalendarView'
import { FocusView } from '@/views/FocusView'
import { ReviewView } from '@/views/ReviewView'
import type { ViewType } from '@/types'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Timer,
  BarChart3,
  Sparkles,
} from 'lucide-react'

const NAV_ITEMS: { view: ViewType; label: string; icon: any }[] = [
  { view: 'board', label: '今日看板', icon: LayoutDashboard },
  { view: 'tasks', label: '任务清单', icon: ListTodo },
  { view: 'calendar', label: '日历视图', icon: Calendar },
  { view: 'focus', label: '专注计时', icon: Timer },
  { view: 'review', label: '复盘统计', icon: BarChart3 },
]

export default function App() {
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const getOverdueTasks = useAppStore((s) => s.getOverdueTasks)
  const getTodayTasks = useAppStore((s) => s.getTodayTasks)

  const overdueCount = getOverdueTasks().length
  const todayPendingCount = getTodayTasks().filter((t) => !t.completed).length

  const renderView = () => {
    switch (currentView) {
      case 'board':
        return <BoardView />
      case 'tasks':
        return <TasksView />
      case 'calendar':
        return <CalendarView />
      case 'focus':
        return <FocusView />
      case 'review':
        return <ReviewView />
      default:
        return <BoardView />
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">效率助手</h1>
            <p className="text-xs text-gray-400">Productivity</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
            const isActive = currentView === view
            let badge = 0
            if (view === 'board' && todayPendingCount > 0) badge = todayPendingCount
            if (view === 'tasks' && overdueCount > 0) badge = overdueCount

            return (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                  )}
                />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && (
                  <span
                    className={cn(
                      'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'bg-red-500 text-white'
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4">
          <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white">
            <p className="text-xs font-medium opacity-80">今日提示</p>
            <p className="mt-1 text-sm font-medium">
              专注当下，一步一个脚印地完成你的目标 🚀
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">{renderView()}</main>
    </div>
  )
}
