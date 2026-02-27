import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/ingredients', label: 'Ingredients', icon: '🥩' },
  { to: '/recipes', label: 'Recipes', icon: '📋' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/import', label: 'Import', icon: '📥' },
  { to: '/waste', label: 'Waste', icon: '🗑️' },
];

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-green-100 text-green-800'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <span className="text-lg">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - visible on desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">FoodCost</h1>
          <p className="text-xs text-gray-500">Deli Manager</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav - visible on mobile/tablet */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-2 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
                isActive ? 'text-green-700' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
