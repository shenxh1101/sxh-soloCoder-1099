import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { BoardView } from '@/views/BoardView'
import { TasksView } from '@/views/TasksView'
import { CalendarView } from '@/views/CalendarView'
import { FocusView } from '@/views/FocusView'
import { ReviewView } from '@/views/ReviewView'
import { GlobalSearchModal } from '@/components/GlobalSearchModal'
import type { ViewType } from '@/types'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Timer,
  BarChart3,
  Sparkles,
  Search,
  CheckCircle2,
  Info,
  X,
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
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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

        <div className="px-3 pb-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <Search size={16} />
            <span className="flex-1 text-left">全局搜索...</span>
            <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-400">
              Ctrl+K
            </kbd>
          </button>
        </div>

        <div className="border-t border-gray-100 px-4 py-4">
          <div className="rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white">
            <p className="text-xs font-medium opacity-80">今日提示</p>
            <p className="mt-1 text-sm font-medium">
              专注当下，一步一个脚印地完成你的目标 🚀
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        {renderView()}

        {toast && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
            <div
              className={cn(
                'pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg',
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-800'
              )}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} className="text-green-600" />
              ) : (
                <Info size={16} className="text-gray-600" />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
              <button
                onClick={clearToast}
                className="ml-2 rounded p-0.5 text-gray-400 hover:bg-white/60 hover:text-gray-700"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </main>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  )
}
