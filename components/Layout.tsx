import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'フィード', end: true },
  { to: '/announcements', label: 'お知らせ' },
  { to: '/events', label: 'イベント' },
  { to: '/contents', label: 'コンテンツ' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="shrink-0 font-bold text-indigo-600">Member Hub</span>
          <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:overflow-visible sm:px-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded px-2 py-1 ${
                    isActive
                      ? 'bg-indigo-50 font-medium text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <div className="ml-auto flex shrink-0 items-center gap-2 text-sm">
              <NavLink to="/profile" className="text-slate-700 hover:underline">
                {user.displayName}
                {user.membership === 'premium' && (
                  <span className="ml-1 rounded bg-amber-100 px-1 text-xs text-amber-700">
                    PREMIUM
                  </span>
                )}
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="rounded border px-2 py-1 text-slate-600 hover:bg-slate-100"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className="ml-auto shrink-0 rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              ログイン
            </NavLink>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  );
}
