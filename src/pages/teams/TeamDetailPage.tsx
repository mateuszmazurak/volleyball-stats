import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'

const POSITION_LABELS: Record<string, string> = {
  atakujacy: 'Atakujący', przyjmujacy: 'Przyjmujący', rozgrywajacy: 'Rozgrywający',
  libero: 'Libero', srodkowy: 'Środkowy', uniwersalny: 'Uniwersalny',
}
const POSITION_COLORS: Record<string, string> = {
  atakujacy: 'bg-red-900 text-red-300', przyjmujacy: 'bg-blue-900 text-blue-300',
  rozgrywajacy: 'bg-yellow-900 text-yellow-300', libero: 'bg-purple-900 text-purple-300',
  srodkowy: 'bg-green-900 text-green-300', uniwersalny: 'bg-gray-700 text-gray-300',
}

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: teamData } = await supabase.from('teams').select('*').eq('id', id!).single()
      setTeam(teamData)

      const { data: playersData } = await supabase
        .from('players').select('*').eq('team_id', id!).order('jersey_number')
      setPlayers(playersData || [])

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)')
        .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
        .order('match_date', { ascending: false })
        .limit(10)
      setMatches(matchesData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const byPosition: Record<string, any[]> = {}
  players.forEach(p => {
    if (!byPosition[p.position]) byPosition[p.position] = []
    byPosition[p.position].push(p)
  })

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/druzyny" className="text-gray-400 hover:text-white">← Drużyny</Link>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center text-white font-bold">
            {team?.short_name}
          </div>
          <h1 className="text-2xl font-bold text-white">{team?.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Skład ({players.length} zawodników)</h2>
            <Link to="/zawodnicy/nowy" className="btn-secondary text-sm">+ Dodaj zawodnika</Link>
          </div>

          {Object.entries(byPosition).map(([pos, posPlayers]) => (
            <div key={pos} className="mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{POSITION_LABELS[pos] || pos}</div>
              <div className="space-y-2">
                {posPlayers.map(p => (
                  <div key={p.id} className="card flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white text-sm">
                      {p.jersey_number}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{p.full_name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${POSITION_COLORS[p.position]}`}>
                        {POSITION_LABELS[p.position]}
                      </span>
                    </div>
                    {p.user_id && (
                      <span className="text-xs text-green-400">● Konto</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {players.length === 0 && (
            <div className="card text-center py-8 text-gray-400">
              Brak zawodników w tej drużynie
            </div>
          )}
        </div>

        {/* Recent matches */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Ostatnie mecze</h2>
          <div className="space-y-2">
            {matches.map(m => (
              <Link
                key={m.id}
                to={`/mecze/${m.id}/statystyki`}
                className="card hover:border-gray-500 transition-colors block py-3"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(m.match_date).toLocaleDateString('pl-PL')}
                </div>
                <div className="text-sm text-white">
                  {m.home_team?.name} vs {m.away_team?.name}
                </div>
                <div className={`text-xs mt-1 ${m.status === 'zakończony' ? 'text-blue-400' : m.status === 'w_trakcie' ? 'text-green-400' : 'text-gray-500'}`}>
                  {m.status === 'zakończony' ? 'Zakończony' : m.status === 'w_trakcie' ? 'W trakcie' : 'Zaplanowany'}
                </div>
              </Link>
            ))}
            {matches.length === 0 && (
              <div className="text-gray-500 text-sm">Brak meczów</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeamDetailPage
