import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from 'hooks/useAuth'
import { supabase } from 'lib/supabase'

const DashboardPage: React.FC = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ teams: 0, players: 0, matches: 0, actions: 0 })

  useEffect(() => {
    const load = async () => {
      const [t, p, m, a] = await Promise.all([
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('actions').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        teams: t.count || 0,
        players: p.count || 0,
        matches: m.count || 0,
        actions: a.count || 0,
      })
    }
    load()
  }, [])

  const cards = [
    { label: 'Drużyny', value: stats.teams, icon: '👥', path: '/druzyny', color: 'text-blue-400' },
    { label: 'Zawodnicy', value: stats.players, icon: '🏃', path: '/zawodnicy', color: 'text-green-400' },
    { label: 'Mecze', value: stats.matches, icon: '🏐', path: '/mecze', color: 'text-orange-400' },
    { label: 'Akcje', value: stats.actions, icon: '⚡', path: '/mecze', color: 'text-purple-400' },
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Cześć, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1">Witaj w VolleyStats Pro</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <Link key={card.label} to={card.path} className="card hover:border-gray-500 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-gray-400 text-sm">{card.label}</span>
            </div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      {profile?.role === 'statystyk' && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Szybkie akcje</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link to="/mecze/nowy" className="card hover:border-primary-600 transition-colors group">
              <div className="text-2xl mb-2">➕</div>
              <div className="font-medium text-white group-hover:text-primary-400">Nowy mecz</div>
              <div className="text-gray-500 text-sm mt-1">Utwórz i zacznij rejestrację</div>
            </Link>
            <Link to="/druzyny/nowa" className="card hover:border-primary-600 transition-colors group">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-white group-hover:text-primary-400">Nowa drużyna</div>
              <div className="text-gray-500 text-sm mt-1">Dodaj drużynę i skład</div>
            </Link>
            <Link to="/zawodnicy/nowy" className="card hover:border-primary-600 transition-colors group">
              <div className="text-2xl mb-2">🏃</div>
              <div className="font-medium text-white group-hover:text-primary-400">Nowy zawodnik</div>
              <div className="text-gray-500 text-sm mt-1">Dodaj zawodnika do drużyny</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
