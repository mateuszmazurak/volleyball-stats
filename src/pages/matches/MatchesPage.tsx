import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Match } from '../../types/database'
import { useAuth } from 'hooks/useAuth'

const STATUS_LABELS: Record<string, string> = {
  zaplanowany: 'Zaplanowany',
  w_trakcie: 'W trakcie',
  zakończony: 'Zakończony',
}

const STATUS_COLORS: Record<string, string> = {
  zaplanowany: 'bg-gray-700 text-gray-300',
  w_trakcie: 'bg-green-900 text-green-300',
  zakończony: 'bg-blue-900 text-blue-300',
}

const MatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(name,short_name), away_team:teams!matches_away_team_id_fkey(name,short_name)')
      .order('match_date', { ascending: false })
      .then(({ data }) => {
        setMatches(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mecze</h1>
        {profile?.role === 'statystyk' && (
          <Link to="/mecze/nowy" className="btn-primary">+ Nowy mecz</Link>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">Ładowanie...</div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🏐</div>
          <div className="text-gray-400">Brak meczów. Utwórz pierwszy!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => (
            <Link
              key={match.id}
              to={match.status === 'w_trakcie' || match.status === 'zakończony'
                ? `/mecze/${match.id}/rejestracja`
                : `/mecze/${match.id}`}
              className="card hover:border-gray-500 transition-colors flex items-center gap-4 py-4"
            >
              {/* Data */}
              <div className="text-center w-14 shrink-0">
                <div className="text-xs text-gray-500">
                  {new Date(match.match_date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(match.match_date).getFullYear()}
                </div>
              </div>

              {/* Teams */}
              <div className="flex-1 flex items-center gap-3">
                <span className="font-semibold text-white">{match.home_team?.name}</span>
                <span className="text-gray-500 text-sm font-mono">vs</span>
                <span className="font-semibold text-white">{match.away_team?.name}</span>
              </div>

              {/* Location */}
              {match.location && (
                <div className="text-gray-500 text-sm hidden sm:block">📍 {match.location}</div>
              )}

              {/* YouTube indicator */}
              {match.youtube_url && (
                <div className="text-red-400 text-sm">▶ YT</div>
              )}

              {/* Stats link */}
              {(match.status === 'w_trakcie' || match.status === 'zakończony') && (
                <Link
                  to={`/mecze/${match.id}/statystyki`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded bg-primary-900/30 hover:bg-primary-900/50 transition-colors shrink-0"
                >
                  📊 Statystyki
                </Link>
              )}
              {/* Status */}
              <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[match.status]}`}>
                {STATUS_LABELS[match.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default MatchesPage
