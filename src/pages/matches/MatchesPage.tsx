import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { useAuth } from 'hooks/useAuth'

const STATUS_LABELS: Record<string, string> = {
  zaplanowany: 'Zaplanowany', w_trakcie: 'W trakcie', zakończony: 'Zakończony',
}
const STATUS_COLORS: Record<string, string> = {
  zaplanowany: 'bg-gray-700 text-gray-300',
  w_trakcie: 'bg-green-900 text-green-300',
  zakończony: 'bg-blue-900 text-blue-300',
}

const MatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { profile } = useAuth()

  const load = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(name,short_name), away_team:teams!matches_away_team_id_fkey(name,short_name)')
      .order('match_date', { ascending: false })
    setMatches(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (match: any) => {
    if (!window.confirm(`Usunąć mecz ${match.home_team?.name} vs ${match.away_team?.name}? Usunie też wszystkie zapisane akcje.`)) return
    setDeleting(match.id)
    await supabase.from('matches').delete().eq('id', match.id)
    setMatches(prev => prev.filter(m => m.id !== match.id))
    setDeleting(null)
  }

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
          <div className="text-gray-400 mb-4">Brak meczów.</div>
          {profile?.role === 'statystyk' && (
            <Link to="/mecze/nowy" className="btn-primary inline-block">Utwórz mecz</Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(match => (
            <div key={match.id} className="card hover:border-gray-600 transition-colors flex items-center gap-3 py-3">
              {/* Data */}
              <div className="text-center w-12 shrink-0">
                <div className="text-xs text-gray-500">
                  {new Date(match.match_date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(match.match_date).getFullYear()}
                </div>
              </div>

              {/* Teams */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">
                  {match.home_team?.name} <span className="text-gray-500 font-normal text-sm">vs</span> {match.away_team?.name}
                </div>
                {match.location && (
                  <div className="text-gray-500 text-xs mt-0.5">📍 {match.location}</div>
                )}
              </div>

              {/* YouTube */}
              {match.youtube_url && <span className="text-red-400 text-xs shrink-0">▶ YT</span>}

              {/* Status */}
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[match.status]}`}>
                {STATUS_LABELS[match.status]}
              </span>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                {(match.status === 'w_trakcie' || match.status === 'zaplanowany') && profile?.role === 'statystyk' && (
                  <Link to={match.status === 'w_trakcie' ? `/mecze/${match.id}/rejestracja` : `/mecze/${match.id}`}
                    className="text-xs bg-primary-700 hover:bg-primary-600 text-white px-2 py-1 rounded transition-colors">
                    {match.status === 'w_trakcie' ? '▶ Rejestruj' : '⚙️ Skład'}
                  </Link>
                )}
                {(match.status === 'w_trakcie' || match.status === 'zakończony') && (
                  <Link to={`/mecze/${match.id}/statystyki`}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors">
                    📊
                  </Link>
                )}
                {profile?.role === 'statystyk' && (
                  <>
                    <Link to={`/mecze/${match.id}/edytuj`}
                      className="text-gray-600 hover:text-white px-2 py-1 rounded hover:bg-gray-700 text-xs transition-colors">
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDelete(match)}
                      disabled={deleting === match.id}
                      className="text-gray-600 hover:text-red-400 px-2 py-1 rounded hover:bg-gray-700 text-xs transition-colors"
                    >{deleting === match.id ? '...' : '🗑️'}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MatchesPage
