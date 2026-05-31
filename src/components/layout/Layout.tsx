import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from 'hooks/useAuth'

const navItems = {
  statystyk: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/mecze', label: 'Mecze', icon: '🏐' },
    { path: '/druzyny', label: 'Drużyny', icon: '👥' },
    { path: '/zawodnicy', label: 'Zawodnicy', icon: '🏃' },
  ],
  trener: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/mecze', label: 'Mecze', icon: '🏐' },
    { path: '/statystyki', label: 'Statystyki', icon: '📈' },
  ],
  zawodnik: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/moje-statystyki', label: 'Moje statystyki', icon: '📈' },
  ],
}

const roleLabels: Record<string, string> = {
  statystyk: 'Statystyk',
  trener: 'Trener',
  zawodnik: 'Zawodnik',
}

const roleBadgeColors: Record<string, string> = {
  statystyk: 'bg-blue-900 text-blue-300',
  trener: 'bg-green-900 text-green-300',
  zawodnik: 'bg-orange-900 text-orange-300',
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const items = navItems[profile?.role as keyof typeof navItems] || []

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} transition-all duration-200 bg-gray-900 border-r border-gray-700 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-3">
          <span className="text-2xl">🏐</span>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-white text-sm leading-tight">VolleyStats</div>
              <div className="text-gray-500 text-xs">Pro</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-700">
          {sidebarOpen && profile && (
            <div className="mb-2 px-1">
              <div className="text-sm text-white font-medium truncate">{profile.full_name}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadgeColors[profile.role]}`}>
                {roleLabels[profile.role]}
              </span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full transition-colors"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Wyloguj</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
