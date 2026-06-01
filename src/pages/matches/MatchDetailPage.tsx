import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Player, PlayerPosition } from 'types/database'

// Pozycje na boisku siatkówkowym pogrupowane logicznie
const POSITION_LABELS: Record<PlayerPosition, string> = {
  rozgrywajacy: 'Rozgrywający',
  atakujacy: 'Atakujący',
  przyjmujacy: 'Przyjmujący',
  srodkowy: 'Środkowy',
  libero: 'Libero',
  uniwersalny: 'Uniwersalny',
}

// Typowe ustawienie: pozycja na boisku -> pozycja w rotacji
// Ustawienie P1 znaczy: rozgrywający startuje na pozycji 1 (serwuje)
// Aplikacja pyta o ustawienie i mapuje zawodników wg roli, nie numerka
const FORMATIONS: Record<string, { label: string; description: string; roleOrder: PlayerPosition[] }> = {
  P1: {
    label: 'Ustawienie P1',
    description: 'Rozgrywający na pozycji 1 (serwuje na starcie)',
    roleOrder: ['rozgrywajacy', 'srodkowy', 'atakujacy', 'przyjmujacy', 'srodkowy', 'przyjmujacy'],
  },
  P2: {
    label: 'Ustawienie P2',
    description: 'Rozgrywający na pozycji 2 (przy siatce po prawej)',
    roleOrder: ['przyjmujacy', 'rozgrywajacy', 'srodkowy', 'atakujacy', 'przyjmujacy', 'srodkowy'],
  },
  P3: {
    label: 'Ustawienie P3',
    description: 'Rozgrywający na pozycji 3 (środek przy siatce)',
    roleOrder: ['srodkowy', 'przyjmujacy', 'rozgrywajacy', 'srodkowy', 'atakujacy', 'przyjmujacy'],
  },
  P4: {
    label: 'Ustawienie P4',
    description: 'Rozgrywający na pozycji 4 (lewy przód)',
    roleOrder: ['atakujacy', 'srodkowy', 'przyjmujacy', 'rozgrywajacy', 'srodkowy', 'atakujacy'],
  },
  P5: {
    label: 'Ustawienie P5',
    description: 'Rozgrywający na pozycji 5 (lewy tył)',
    roleOrder: ['przyjmujacy', 'atakujacy', 'srodkowy', 'przyjmujacy', 'rozgrywajacy', 'srodkowy'],
  },
  P6: {
    label: 'Ustawienie P6',
    description: 'Rozgrywający na pozycji 6 (środek tył)',
    roleOrder: ['srodkowy', 'przyjmujacy', 'atakujacy', 'srodkowy', 'przyjmujacy', 'rozgrywajacy'],
  },
}

// Opis każdej pozycji rotacyjnej
const ZONE_LABELS: Record<number, string> = {
  1: 'Poz. 1 — prawy tył (serwujący)',
  2: 'Poz. 2 — prawy przód',
  3: 'Poz. 3 — środek przód',
  4: 'Poz. 4 — lewy przód',
  5: 'Poz. 5 — lewy tył',
  6: 'Poz. 6 — środek tył',
}

interface LineupState {
  [position: number]: string // position 1-6 -> player_id
}

const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<any>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [homeLineup, setHomeLineup] = useState<LineupState>({})
  const [awayLineup, setAwayLineup] = useState<LineupState>({})
  const [homeFormation, setHomeFormation] = useState<string>('')
  const [awayFormation, setAwayFormation] = useState<string>('')
  const [servingTeam, setServingTeam] = useState<'home' | 'away'>('home')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'serving' | 'lineups'>('serving')

  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!).single()
      setMatch(matchData)

      const [home, away] = await Promise.all([
        supabase.from('players').select('*').eq('team_id', matchData.home_team_id).order('jersey_number'),
        supabase.from('players').select('*').eq('team_id', matchData.away_team_id).order('jersey_number'),
      ])
      setHomePlayers(home.data || [])
      setAwayPlayers(away.data || [])

      // Wczytaj istniejący skład jeśli jest
      const { data: lineups } = await supabase.from('match_lineups').select('*').eq('match_id', id!)
      if (lineups && lineups.length > 0) {
        const hl: LineupState = {}
        const al: LineupState = {}
        lineups.forEach((l: any) => {
          if (l.team_side === 'home') hl[l.start_position] = l.player_id
          else al[l.start_position] = l.player_id
        })
        setHomeLineup(hl)
        setAwayLineup(al)
        setStep('lineups')
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleStartMatch = async () => {
    setSaving(true)
    await supabase.from('match_lineups').delete().eq('match_id', id!)

    const lineups = [
      ...Object.entries(homeLineup).filter(([, pid]) => pid).map(([pos, pid]) => ({
        match_id: id!, player_id: pid, team_side: 'home', start_position: parseInt(pos)
      })),
      ...Object.entries(awayLineup).filter(([, pid]) => pid).map(([pos, pid]) => ({
        match_id: id!, player_id: pid, team_side: 'away', start_position: parseInt(pos)
      })),
    ]
    await supabase.from('match_lineups').insert(lineups)
    await supabase.from('matches').update({
      status: 'w_trakcie',
      // Zapisz kto serwuje jako pole pomocnicze w location (tymczasowe)
    }).eq('id', id!)

    const { data: existingSets } = await supabase.from('sets').select('id').eq('match_id', id!)
    if (!existingSets || existingSets.length === 0) {
      await supabase.from('sets').insert({
        match_id: id!, set_number: 1, score_home: 0, score_away: 0, is_finished: false
      })
    }

    // Pass serving team via sessionStorage so recording page knows
    sessionStorage.setItem(`match_${id}_serving`, servingTeam)
    navigate(`/mecze/${id}/rejestracja`)
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const homeReady = [1,2,3,4,5,6].filter(p => homeLineup[p]).length >= 6
  const awayReady = [1,2,3,4,5,6].filter(p => awayLineup[p]).length >= 6

  // LineupPicker — przypisuje zawodników per pozycja rotacyjna
  const LineupPicker = ({
    side, players, lineup, setLineup, formation, setFormation
  }: {
    side: 'home' | 'away'
    players: Player[]
    lineup: LineupState
    setLineup: (l: LineupState) => void
    formation: string
    setFormation: (f: string) => void
  }) => {
    const teamName = side === 'home' ? match.home_team?.name : match.away_team?.name
    const sideLabel = side === 'home' ? 'Gospodarz' : 'Gość'
    const sideColor = side === 'home' ? 'text-blue-400' : 'text-orange-400'

    return (
      <div>
        <h3 className={`text-base font-semibold mb-1 ${sideColor}`}>
          {teamName} <span className="text-gray-500 text-sm font-normal">({sideLabel})</span>
        </h3>

        {/* Formation picker */}
        <div className="mb-3">
          <label className="label text-xs">Ustawienie startowe</label>
          <select
            className="input text-sm"
            value={formation}
            onChange={e => setFormation(e.target.value)}
          >
            <option value="">Wybierz ustawienie lub ustaw ręcznie</option>
            {Object.entries(FORMATIONS).map(([key, f]) => (
              <option key={key} value={key}>{f.label} — {f.description}</option>
            ))}
          </select>
          {formation && (
            <p className="text-xs text-gray-500 mt-1">
              💡 Wybierz ustawienie — pozycje zostaną podpowiedziane. Możesz je zmienić ręcznie poniżej.
            </p>
          )}
        </div>

        {/* Position slots */}
        <div className="space-y-2">
          {[1,2,3,4,5,6].map(pos => {
            // Sugerowana rola dla tej pozycji w wybranym ustawieniu
            const suggestedRole = formation && FORMATIONS[formation]
              ? FORMATIONS[formation].roleOrder[pos - 1]
              : null

            // Zawodnicy pasujący do sugerowanej roli (pokazani na górze)
            const sortedPlayers = suggestedRole
              ? [...players].sort((a, b) => {
                  const aMatch = a.position === suggestedRole ? -1 : 0
                  const bMatch = b.position === suggestedRole ? -1 : 0
                  return aMatch - bMatch
                })
              : players

            return (
              <div key={pos} className="flex items-center gap-2">
                {/* Zone badge */}
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-bold shrink-0">
                  {pos}
                </div>
                {/* Role hint */}
                {suggestedRole && (
                  <div className="text-xs text-gray-500 w-8 shrink-0">
                    {POSITION_LABELS[suggestedRole].slice(0, 3)}
                  </div>
                )}
                <select
                  className="input text-sm flex-1"
                  value={lineup[pos] || ''}
                  onChange={e => setLineup({ ...lineup, [pos]: e.target.value })}
                  title={ZONE_LABELS[pos]}
                >
                  <option value="">— {ZONE_LABELS[pos]} —</option>
                  {sortedPlayers.map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={Object.values(lineup).includes(p.id) && lineup[pos] !== p.id}
                    >
                      #{p.jersey_number} {p.full_name} ({POSITION_LABELS[p.position as PlayerPosition] || p.position})
                      {suggestedRole && p.position === suggestedRole ? ' ★' : ''}
                    </option>
                  ))}
                </select>
                {/* Clear button */}
                {lineup[pos] && (
                  <button
                    onClick={() => setLineup({ ...lineup, [pos]: '' })}
                    className="text-gray-600 hover:text-red-400 text-xs px-1"
                    title="Wyczyść"
                  >✕</button>
                )}
              </div>
            )
          })}
        </div>

        {/* Status */}
        <div className="mt-2 text-xs text-gray-500">
          Wypełniono: <span className={`font-semibold ${[1,2,3,4,5,6].filter(p => lineup[p]).length >= 6 ? 'text-green-400' : 'text-yellow-400'}`}>
            {[1,2,3,4,5,6].filter(p => lineup[p]).length}/6
          </span> pozycji
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mecze" className="text-gray-400 hover:text-white">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">
          {match.home_team?.name} vs {match.away_team?.name}
        </h1>
      </div>

      {match.youtube_url && (
        <div className="card mb-4 flex items-center gap-3 py-3">
          <span className="text-red-400">▶</span>
          <div className="text-sm text-gray-300">Nagranie YouTube przypisane</div>
          <div className="text-xs text-gray-500 truncate max-w-sm ml-2">{match.youtube_url}</div>
        </div>
      )}

      {/* KROK 1: Kto serwuje */}
      {step === 'serving' && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Krok 1 — Kto zaczyna serwis?</h2>
          <p className="text-gray-400 text-sm mb-5">
            Wybierz drużynę która serwuje jako pierwsza w tym meczu (zwykle losowane przed meczem).
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => { setServingTeam('home'); setStep('lineups') }}
              className={`py-5 rounded-xl border-2 font-semibold text-base transition-all ${
                servingTeam === 'home'
                  ? 'border-blue-500 bg-blue-900/40 text-blue-300'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-blue-600'
              }`}
            >
              <div className="text-2xl mb-1">🏠</div>
              {match.home_team?.name}
              <div className="text-xs text-gray-400 font-normal mt-1">Gospodarz</div>
            </button>
            <button
              onClick={() => { setServingTeam('away'); setStep('lineups') }}
              className={`py-5 rounded-xl border-2 font-semibold text-base transition-all ${
                servingTeam === 'away'
                  ? 'border-orange-500 bg-orange-900/40 text-orange-300'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-orange-600'
              }`}
            >
              <div className="text-2xl mb-1">✈️</div>
              {match.away_team?.name}
              <div className="text-xs text-gray-400 font-normal mt-1">Gość</div>
            </button>
          </div>
        </div>
      )}

      {/* KROK 2: Składy */}
      {step === 'lineups' && (
        <>
          {/* Serving summary */}
          <div className={`card mb-4 py-3 flex items-center gap-3 border ${servingTeam === 'home' ? 'border-blue-700 bg-blue-900/20' : 'border-orange-700 bg-orange-900/20'}`}>
            <span className="text-xl">🏐</span>
            <span className="text-sm text-white">
              Serwuje: <strong>{servingTeam === 'home' ? match.home_team?.name : match.away_team?.name}</strong>
              <span className="text-gray-400 text-xs ml-2">— zawodnik na pozycji 1 serwuje jako pierwszy</span>
            </span>
            <button onClick={() => setStep('serving')} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
              Zmień
            </button>
          </div>

          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Krok 2 — Składy startowe</h2>
            <p className="text-gray-400 text-sm mb-5">
              Przypisz zawodników do pozycji. Pozycja <strong className="text-white">1 = serwujący</strong>.
              Wybierz ustawienie aby aplikacja podpowiedziała które pozycje pasują do danej roli (oznaczone ★).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <LineupPicker
                side="home" players={homePlayers}
                lineup={homeLineup} setLineup={setHomeLineup}
                formation={homeFormation} setFormation={setHomeFormation}
              />
              <LineupPicker
                side="away" players={awayPlayers}
                lineup={awayLineup} setLineup={setAwayLineup}
                formation={awayFormation} setFormation={setAwayFormation}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleStartMatch}
              disabled={saving || !homeReady || !awayReady}
              className="btn-primary text-base px-6 py-3"
            >
              {saving ? 'Zapisywanie...' : '▶ Rozpocznij rejestrację meczu'}
            </button>
            {(!homeReady || !awayReady) && (
              <p className="text-gray-500 text-sm">
                Uzupełnij wszystkie 6 pozycji dla obu drużyn
                {!homeReady && ` (${match.home_team?.short_name}: brakuje ${6 - [1,2,3,4,5,6].filter(p => homeLineup[p]).length})`}
                {!awayReady && ` (${match.away_team?.short_name}: brakuje ${6 - [1,2,3,4,5,6].filter(p => awayLineup[p]).length})`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MatchDetailPage
