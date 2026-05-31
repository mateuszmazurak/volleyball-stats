import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Player } from 'types/database'

const POSITION_LABELS: Record<string, string> = {
  atakujacy: 'ATK', przyjmujacy: 'PRZ', rozgrywajacy: 'ROZ',
  libero: 'LIB', srodkowy: 'ŚRO', uniwersalny: 'UNI',
}

const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<any>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [homeLineup, setHomeLineup] = useState<Record<number, string>>({}) // position -> player_id
  const [awayLineup, setAwayLineup] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!)
        .single()
      setMatch(matchData)

      const [home, away] = await Promise.all([
        supabase.from('players').select('*').eq('team_id', matchData.home_team_id).order('jersey_number'),
        supabase.from('players').select('*').eq('team_id', matchData.away_team_id).order('jersey_number'),
      ])
      setHomePlayers(home.data || [])
      setAwayPlayers(away.data || [])

      // Load existing lineup if any
      const { data: lineups } = await supabase.from('match_lineups').select('*').eq('match_id', id!)
      if (lineups && lineups.length > 0) {
        const hl: Record<number, string> = {}
        const al: Record<number, string> = {}
        lineups.forEach((l: any) => {
          if (l.team_side === 'home') hl[l.start_position] = l.player_id
          else al[l.start_position] = l.player_id
        })
        setHomeLineup(hl)
        setAwayLineup(al)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleStartMatch = async () => {
    setSaving(true)
    // Delete old lineups
    await supabase.from('match_lineups').delete().eq('match_id', id!)

    // Insert new lineups
    const lineups = [
      ...Object.entries(homeLineup).map(([pos, pid]) => ({
        match_id: id!, player_id: pid, team_side: 'home', start_position: parseInt(pos)
      })),
      ...Object.entries(awayLineup).map(([pos, pid]) => ({
        match_id: id!, player_id: pid, team_side: 'away', start_position: parseInt(pos)
      })),
    ]
    await supabase.from('match_lineups').insert(lineups)

    // Update match status
    await supabase.from('matches').update({ status: 'w_trakcie' }).eq('id', id!)

    // Create first set
    const { data: existingSets } = await supabase.from('sets').select('id').eq('match_id', id!)
    if (!existingSets || existingSets.length === 0) {
      await supabase.from('sets').insert({ match_id: id!, set_number: 1, score_home: 0, score_away: 0, is_finished: false })
    }

    navigate(`/mecze/${id}/rejestracja`)
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const positions = [1, 2, 3, 4, 5, 6]

  const LineupPicker = ({
    side, players, lineup, setLineup
  }: { side: string; players: Player[]; lineup: Record<number, string>; setLineup: (l: Record<number, string>) => void }) => (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">
        {side === 'home' ? match.home_team?.name : match.away_team?.name}
        <span className="text-gray-500 text-sm ml-2">{side === 'home' ? '(Gospodarz)' : '(Gość)'}</span>
      </h3>
      <div className="space-y-2">
        {positions.map(pos => (
          <div key={pos} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-sm font-bold shrink-0">
              {pos}
            </div>
            <select
              className="input text-sm"
              value={lineup[pos] || ''}
              onChange={e => setLineup({ ...lineup, [pos]: e.target.value })}
            >
              <option value="">— brak —</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={Object.values(lineup).includes(p.id) && lineup[pos] !== p.id}>
                  #{p.jersey_number} {p.full_name} ({POSITION_LABELS[p.position] || p.position})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )

  const homeReady = Object.keys(homeLineup).filter(k => homeLineup[parseInt(k)]).length >= 6
  const awayReady = Object.keys(awayLineup).filter(k => awayLineup[parseInt(k)]).length >= 6

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mecze" className="text-gray-400 hover:text-white">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">
          {match.home_team?.name} vs {match.away_team?.name}
        </h1>
      </div>

      {match.youtube_url && (
        <div className="card mb-6 flex items-center gap-3">
          <span className="text-red-400 text-xl">▶</span>
          <div>
            <div className="text-sm text-gray-300">Nagranie YouTube przypisane</div>
            <div className="text-xs text-gray-500 truncate max-w-sm">{match.youtube_url}</div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">🏐 Ustaw składy startowe</h2>
        <p className="text-gray-400 text-sm mb-6">Przypisz zawodników do pozycji rotacyjnych (1-6). Pozycja 1 = serwujący na starcie.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <LineupPicker side="home" players={homePlayers} lineup={homeLineup} setLineup={setHomeLineup} />
          <LineupPicker side="away" players={awayPlayers} lineup={awayLineup} setLineup={setAwayLineup} />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleStartMatch}
          disabled={saving || (!homeReady && !awayReady)}
          className="btn-primary text-base px-6 py-3"
        >
          {saving ? 'Zapisywanie...' : '▶ Rozpocznij rejestrację meczu'}
        </button>
        {!homeReady && !awayReady && (
          <p className="text-gray-500 text-sm self-center">Ustaw co najmniej 6 zawodników dla każdej drużyny</p>
        )}
      </div>
    </div>
  )
}

export default MatchDetailPage
