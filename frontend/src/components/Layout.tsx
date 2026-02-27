import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Zap, Brain, FileText, Settings, LogOut, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/triggers', icon: Zap, label: 'Triggers' },
  { to: '/patterns', icon: Brain, label: 'Patterns' },
  { to: '/summary', icon: FileText, label: 'Weekly Summary' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const TIER_COLORS: Record<string, string> = {
  free: 'text-subtle border-muted',
  pro: 'text-primary border-primary/40',
  executive: 'text-accent border-accent/40',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-midnight overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary">⚡</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">TriggerIQ</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-subtle hover:text-white hover:bg-surface-2'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="opacity-50" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">
                {user?.full_name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name}</div>
              <div className={clsx(
                'text-xs capitalize border px-1.5 py-0.5 rounded-md inline-block mt-0.5',
                TIER_COLORS[user?.tier || 'free']
              )}>
                {user?.tier || 'free'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-subtle hover:text-danger hover:bg-danger/10 transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
