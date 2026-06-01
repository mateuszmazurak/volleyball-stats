import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Player, PlayerPosition } from 'types/database'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  rozgrywajacy: 'Rozgrywający',
  atakujacy: 'Atakujący',
  przyjmujacy: 'Przyjmujący',
  srodkowy: 'Środkowy',
  libero: 'Libero',
  uniwersalny: 'Uniwersalny',
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  rozgrywajacy: 'border-yellow-500 bg-yellow-900/30 text-yellow-300',
  atakujacy: 'border-red-500 bg-red-900/30 text-red-300',
  przyjmujacy: 'border-blue-500 bg-blue-900/30 text-blue-300',
  srodkowy: 'border-green-500 bg-green-900/30 text-green-300',
  libero: 'border-purple-500 bg-purple-900/30 text-purple-300',
  uniwersalny: 'border-gray-500 bg-gray-700/30 text-gray-300',
}

/**
 * Układ pozycji rotacyjnych dla ustawienia 5-1 (jeden rozgrywający)
 * Zgodnie z zasadami FIVB: zawodnicy naprzeciwko swoich odpowiedników.
 * Format: [pozycja_1, pozycja_2, pozycja_3, pozycja_4, pozycja_5, pozycja_6]
 *
 * Diagram boiska (siatka na górze):
 *   Poz4  Poz3  Poz2
 *   Poz5  Poz6  Poz1
 *
 * Zasada: rozgrywający naprzeciwko atakującego (1↔4, 2↔5, 3↔6)
 */
/**
 * Formacje 5-1 wg oficjalnej tabeli FIVB (joinstriveon.com/blog/5-1-volleyball-rotation)
 *
 * Numeracja stref:
 *   Z4 | Z3 | Z2   ← przód (przy siatce)
 *   Z5 | Z6 | Z1   ← tył  (linia końcowa)
 *
 * Każdy slot = [Z1, Z2, Z3, Z4, Z5, Z6] → indeks 0 = pozycja 1 itd.
 *
 * Role:
 *   ROZ = Rozgrywający (Setter, S)
 *   ATK = Atakujący/Opposite (OPP) — zawodnik naprzeciwko rozgrywającego
 *   PRZ = Przyjmujący zewnętrzny (OH1/OH2)
 *   ŚRO = Środkowy (MB1/MB2)
 *   LIB = Libero — wchodzi za środkowego w tylnym rzędzie (osobne pole!)
 *
 * Libero zastępuje środkowego w tylnym rzędzie — poniżej zaznaczono komentarzem
 * który środkowy jest zastępowany i z jakiej strefy libero faktycznie gra.
 */
const FORMATIONS_51: Record<string, {
  label: string
  desc: string
  liberoReplaces: string  // opis kogo libero zastępuje i gdzie stoi
  slots: Array<{ role: PlayerPosition; hint: string }>
}> = {
  R1: {
    label: 'R1 — Rozgrywający na Z1 (serwuje)',
    desc: 'Rozgrywający startuje od serwisu (Z1). 3 atakujących z przodu.',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z6 (środek tył) → staje w Z6',
    // Z1=ROZ, Z2=OH1(PRZ), Z3=MB2(ŚRO), Z4=OPP(ATK), Z5=OH2(PRZ), Z6=MB1(ŚRO→LIB)
    slots: [
      { role: 'rozgrywajacy', hint: 'Z1 — Rozgrywający (serwuje, biegnie do Z2/3)' },
      { role: 'przyjmujacy',  hint: 'Z2 — Przyjmujący zewnętrzny (OH1, prawy przód)' },
      { role: 'srodkowy',     hint: 'Z3 — Środkowy MB2 (środek przód)' },
      { role: 'atakujacy',    hint: 'Z4 — Atakujący/Opposite (lewy przód)' },
      { role: 'przyjmujacy',  hint: 'Z5 — Przyjmujący zewnętrzny (OH2, lewy tył)' },
      { role: 'srodkowy',     hint: 'Z6 — Środkowy MB1 (środek tył) ★ Libero go zastępuje' },
    ],
  },
  R2: {
    label: 'R2 — Rozgrywający na Z6 (tył środek)',
    desc: 'Rozgrywający w środku tyłu. 3 atakujących z przodu. Najczęstsze ustawienie.',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z5 (lewy tył) → staje w Z5',
    // Z1=OH1(PRZ), Z2=MB2(ŚRO), Z3=OPP(ATK), Z4=OH2(PRZ), Z5=MB1(ŚRO→LIB), Z6=ROZ
    slots: [
      { role: 'przyjmujacy',  hint: 'Z1 — Przyjmujący zewnętrzny (OH1, prawy tył, serwuje)' },
      { role: 'srodkowy',     hint: 'Z2 — Środkowy MB2 (prawy przód)' },
      { role: 'atakujacy',    hint: 'Z3 — Atakujący/Opposite (środek przód)' },
      { role: 'przyjmujacy',  hint: 'Z4 — Przyjmujący zewnętrzny (OH2, lewy przód)' },
      { role: 'srodkowy',     hint: 'Z5 — Środkowy MB1 (lewy tył) ★ Libero go zastępuje' },
      { role: 'rozgrywajacy', hint: 'Z6 — Rozgrywający (środek tył, biegnie do Z2/3)' },
    ],
  },
  R3: {
    label: 'R3 — Rozgrywający na Z5 (lewy tył)',
    desc: 'Rozgrywający po lewej z tyłu. 3 atakujących z przodu.',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z1 (prawy tył) → staje w Z1',
    // Z1=MB2(ŚRO→LIB), Z2=OPP(ATK), Z3=OH2(PRZ), Z4=MB1(ŚRO), Z5=ROZ, Z6=OH1(PRZ)
    slots: [
      { role: 'srodkowy',     hint: 'Z1 — Środkowy MB2 (prawy tył, serwuje) ★ Libero go zastępuje' },
      { role: 'atakujacy',    hint: 'Z2 — Atakujący/Opposite (prawy przód)' },
      { role: 'przyjmujacy',  hint: 'Z3 — Przyjmujący zewnętrzny (OH2, środek przód)' },
      { role: 'srodkowy',     hint: 'Z4 — Środkowy MB1 (lewy przód)' },
      { role: 'rozgrywajacy', hint: 'Z5 — Rozgrywający (lewy tył, biegnie do Z2/3)' },
      { role: 'przyjmujacy',  hint: 'Z6 — Przyjmujący zewnętrzny (OH1, środek tył)' },
    ],
  },
  R4: {
    label: 'R4 — Rozgrywający na Z4 (lewy przód)',
    desc: 'Rozgrywający przy siatce po lewej. 2 atakujących z przodu (setter może dumpować).',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z6 (środek tył) → staje w Z6',
    // Z1=OPP(ATK), Z2=OH2(PRZ), Z3=MB1(ŚRO), Z4=ROZ, Z5=OH1(PRZ), Z6=MB2(ŚRO→LIB)
    slots: [
      { role: 'atakujacy',    hint: 'Z1 — Atakujący/Opposite (prawy tył, serwuje)' },
      { role: 'przyjmujacy',  hint: 'Z2 — Przyjmujący zewnętrzny (OH2, prawy przód)' },
      { role: 'srodkowy',     hint: 'Z3 — Środkowy MB1 (środek przód)' },
      { role: 'rozgrywajacy', hint: 'Z4 — Rozgrywający (lewy przód, przy siatce)' },
      { role: 'przyjmujacy',  hint: 'Z5 — Przyjmujący zewnętrzny (OH1, lewy tył)' },
      { role: 'srodkowy',     hint: 'Z6 — Środkowy MB2 (środek tył) ★ Libero go zastępuje' },
    ],
  },
  R5: {
    label: 'R5 — Rozgrywający na Z3 (środek przód)',
    desc: 'Rozgrywający w środku przy siatce. 2 atakujących z przodu.',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z5 (lewy tył) → staje w Z5',
    // Z1=OH2(PRZ), Z2=MB1(ŚRO), Z3=ROZ, Z4=OH1(PRZ), Z5=MB2(ŚRO→LIB), Z6=OPP(ATK)
    slots: [
      { role: 'przyjmujacy',  hint: 'Z1 — Przyjmujący zewnętrzny (OH2, prawy tył, serwuje)' },
      { role: 'srodkowy',     hint: 'Z2 — Środkowy MB1 (prawy przód)' },
      { role: 'rozgrywajacy', hint: 'Z3 — Rozgrywający (środek przód, przy siatce)' },
      { role: 'przyjmujacy',  hint: 'Z4 — Przyjmujący zewnętrzny (OH1, lewy przód)' },
      { role: 'srodkowy',     hint: 'Z5 — Środkowy MB2 (lewy tył) ★ Libero go zastępuje' },
      { role: 'atakujacy',    hint: 'Z6 — Atakujący/Opposite (środek tył)' },
    ],
  },
  R6: {
    label: 'R6 — Rozgrywający na Z2 (prawy przód)',
    desc: 'Rozgrywający przy siatce po prawej. 2 atakujących z przodu.',
    liberoReplaces: 'Libero wchodzi za Środkowego z Z1 (prawy tył) → staje w Z1',
    // Z1=MB1(ŚRO→LIB), Z2=ROZ, Z3=OH1(PRZ), Z4=MB2(ŚRO), Z5=OPP(ATK), Z6=OH2(PRZ)
    slots: [
      { role: 'srodkowy',     hint: 'Z1 — Środkowy MB1 (prawy tył, serwuje) ★ Libero go zastępuje' },
      { role: 'rozgrywajacy', hint: 'Z2 — Rozgrywający (prawy przód, przy siatce)' },
      { role: 'przyjmujacy',  hint: 'Z3 — Przyjmujący zewnętrzny (OH1, środek przód)' },
      { role: 'srodkowy',     hint: 'Z4 — Środkowy MB2 (lewy przód)' },
      { role: 'atakujacy',    hint: 'Z5 — Atakujący/Opposite (lewy tył)' },
      { role: 'przyjmujacy',  hint: 'Z6 — Przyjmujący zewnętrzny (OH2, środek tył)' },
    ],
  },
}

// Mapa boiska do wizualizacji
// [wiersz_przód: poz4, poz3, poz2], [wiersz_tył: poz5, poz6, poz1]
const COURT_DISPLAY = [[4, 3, 2], [5, 6, 1]]

interface LineupState { [pos: number]: string }

const MatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<any>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [homeLineup, setHomeLineup] = useState<LineupState>({})
  const [awayLineup, setAwayLineup] = useState<LineupState>({})
  // Libero jest POZA składem startowym — osobne pole
  const [homeLibero, setHomeLibero] = useState<string>('')
  const [awayLibero, setAwayLibero] = useState<string>('')
  const [homeFormation, setHomeFormation] = useState<string>('R2')
  const [awayFormation, setAwayFormation] = useState<string>('R2')
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

      const { data: lineups } = await supabase.from('match_lineups').select('*').eq('match_id', id!)
      if (lineups && lineups.length > 0) {
        const hl: LineupState = {}; const al: LineupState = {}
        lineups.forEach((l: any) => {
          if (l.team_side === 'home') {
            if (l.start_position === 0) setHomeLibero(l.player_id)
            else hl[l.start_position] = l.player_id
          } else {
            if (l.start_position === 0) setAwayLibero(l.player_id)
            else al[l.start_position] = l.player_id
          }
        })
        setHomeLineup(hl); setAwayLineup(al)
        setStep('lineups')
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleStartMatch = async () => {
    setSaving(true)
    await supabase.from('match_lineups').delete().eq('match_id', id!)

    const lineups: any[] = []
    // 6 zawodników startowych
    Object.entries(homeLineup).filter(([,v]) => v).forEach(([pos, pid]) =>
      lineups.push({ match_id: id!, player_id: pid, team_side: 'home', start_position: parseInt(pos) }))
    Object.entries(awayLineup).filter(([,v]) => v).forEach(([pos, pid]) =>
      lineups.push({ match_id: id!, player_id: pid, team_side: 'away', start_position: parseInt(pos) }))
    // Libero — pozycja 0 = specjalny marker
    if (homeLibero) lineups.push({ match_id: id!, player_id: homeLibero, team_side: 'home', start_position: 0 })
    if (awayLibero) lineups.push({ match_id: id!, player_id: awayLibero, team_side: 'away', start_position: 0 })

    await supabase.from('match_lineups').insert(lineups)
    await supabase.from('matches').update({ status: 'w_trakcie' }).eq('id', id!)

    const { data: existingSets } = await supabase.from('sets').select('id').eq('match_id', id!)
    if (!existingSets || existingSets.length === 0) {
      await supabase.from('sets').insert({
        match_id: id!, set_number: 1, score_home: 0, score_away: 0, is_finished: false
      })
    }

    sessionStorage.setItem(`match_${id}_serving`, servingTeam)
    navigate(`/mecze/${id}/rejestracja`)
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const homeFilledCount = [1,2,3,4,5,6].filter(p => homeLineup[p]).length
  const awayFilledCount = [1,2,3,4,5,6].filter(p => awayLineup[p]).length
  const homeReady = homeFilledCount >= 6
  const awayReady = awayFilledCount >= 6

  // Wizualizacja boiska
  const CourtPreview = ({ lineup, players, liberoId }: { lineup: LineupState; players: Player[]; liberoId: string }) => {
    const playerMap: Record<string, Player> = {}
    players.forEach(p => { playerMap[p.id] = p })
    const libero = liberoId ? playerMap[liberoId] : null

    return (
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1 text-center">— siatka —</div>
        <div className="border border-gray-600 rounded-lg overflow-hidden max-w-[220px]">
          {COURT_DISPLAY.map((row, ri) => (
            <div key={ri} className={`flex ${ri === 0 ? '' : 'border-t border-gray-700'}`}>
              {row.map((zone, zi) => {
                const pid = lineup[zone]
                const p = pid ? playerMap[pid] : null
                // Libero zastępuje zawodnika na tylnym rzędzie automatycznie (wizualnie)
                return (
                  <div key={zone} className={`flex-1 h-14 flex flex-col items-center justify-center text-xs border-r border-gray-700 last:border-r-0 ${p ? 'bg-gray-800' : 'bg-gray-900'}`}>
                    <div className="text-gray-600 text-xs">{zone}</div>
                    {p ? (
                      <>
                        <div className="font-bold text-white">#{p.jersey_number}</div>
                        <div className="text-gray-400 text-xs leading-none">{POSITION_LABELS[p.position]?.slice(0,3)}</div>
                      </>
                    ) : <div className="text-gray-700">—</div>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">— linia końcowa —</div>
        {libero && (
          <div className="mt-2 flex items-center gap-2 bg-purple-900/30 border border-purple-700 rounded-lg px-3 py-1.5 max-w-[220px]">
            <span className="text-purple-300 text-xs font-bold">L</span>
            <span className="text-purple-200 text-xs">#{libero.jersey_number} {libero.full_name.split(' ')[0]}</span>
            <span className="text-purple-400 text-xs ml-auto">Libero</span>
          </div>
        )}
      </div>
    )
  }

  // Picker składu dla jednej drużyny
  const LineupPicker = ({
    side, players, lineup, setLineup, liberoId, setLiberoId, formation, setFormation
  }: {
    side: 'home' | 'away'
    players: Player[]
    lineup: LineupState
    setLineup: (l: LineupState) => void
    liberoId: string
    setLiberoId: (id: string) => void
    formation: string
    setFormation: (f: string) => void
  }) => {
    // Zawodnicy startowi = wszyscy poza libero (libero ma własne pole)
    // Ale pozwalamy wybrać każdego zawodnika na każdą pozycję (trener może zdecydować)
    const teamName = side === 'home' ? match.home_team?.name : match.away_team?.name
    const color = side === 'home' ? 'text-blue-400' : 'text-orange-400'
    const filledCount = [1,2,3,4,5,6].filter(p => lineup[p]).length

    // Zawodnicy bez libero (libero jest osobno)
    const fieldPlayers = players.filter(p => p.position !== 'libero')
    const liberoPlayers = players.filter(p => p.position === 'libero')
    // Jeśli brak libero w kadrze, pokaż wszystkich
    const liberoOptions = liberoPlayers.length > 0 ? liberoPlayers : players

    const formation5 = FORMATIONS_51[formation]

    return (
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-base mb-3 ${color}`}>
          {teamName}
          <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${filledCount >= 6 ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
            {filledCount}/6
          </span>
        </div>

        {/* Ustawienie */}
        <div className="mb-4">
          <label className="label text-xs">Ustawienie startowe (5-1)</label>
          <select className="input text-sm" value={formation} onChange={e => setFormation(e.target.value)}>
            {Object.entries(FORMATIONS_51).map(([key, f]) => (
              <option key={key} value={key}>{f.label}</option>
            ))}
          </select>
          {formation5 && (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-gray-500">📋 {formation5.desc}</p>
              <p className="text-xs text-purple-400">🟣 {formation5.liberoReplaces}</p>
            </div>
          )}
        </div>

        {/* 6 slotów pozycji */}
        <div className="space-y-2 mb-4">
          {[1,2,3,4,5,6].map(pos => {
            const slot = formation5?.slots[pos - 1]
            const suggestedRole = slot?.role
            const hint = slot?.hint || `Pozycja ${pos}`

            // Sortuj: pasująca rola na górze
            const sortedPlayers = [...fieldPlayers].sort((a, b) => {
              if (a.position === suggestedRole && b.position !== suggestedRole) return -1
              if (b.position === suggestedRole && a.position !== suggestedRole) return 1
              return a.jersey_number - b.jersey_number
            })

            const selectedPlayer = lineup[pos] ? players.find(p => p.id === lineup[pos]) : null

            return (
              <div key={pos} className="flex items-center gap-2">
                {/* Pozycja badge */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  pos <= 3 ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'
                }`} title={pos <= 3 ? 'Przód' : 'Tył'}>
                  {pos}
                </div>

                <div className="flex-1 min-w-0">
                  <select
                    className={`input text-sm ${selectedPlayer ? (POSITION_COLORS[selectedPlayer.position] || '') : ''}`}
                    value={lineup[pos] || ''}
                    onChange={e => setLineup({ ...lineup, [pos]: e.target.value })}
                    title={hint}
                  >
                    <option value="">— {hint} —</option>
                    {sortedPlayers.map(p => {
                      const isUsed = Object.values(lineup).includes(p.id) && lineup[pos] !== p.id
                      const isSuggested = p.position === suggestedRole
                      return (
                        <option key={p.id} value={p.id} disabled={isUsed}>
                          {isSuggested ? '★ ' : ''}#{p.jersey_number} {p.full_name} — {POSITION_LABELS[p.position]}
                          {isUsed ? ' (zajęty)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {lineup[pos] && (
                  <button onClick={() => setLineup({ ...lineup, [pos]: '' })}
                    className="text-gray-600 hover:text-red-400 text-xs px-1 shrink-0">✕</button>
                )}
              </div>
            )
          })}
        </div>

        {/* LIBERO — osobna sekcja */}
        <div className="border border-purple-800 rounded-lg p-3 bg-purple-900/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-300 font-semibold text-sm">L Libero</span>
            <span className="text-xs text-gray-500">— wchodzi i wychodzi swobodnie za zawodników tylnego rzędu (nie zużywa zmian)</span>
          </div>
          <select
            className="input text-sm border-purple-700"
            value={liberoId}
            onChange={e => setLiberoId(e.target.value)}
          >
            <option value="">Brak libero / nie używamy</option>
            {liberoOptions.map(p => (
              <option key={p.id} value={p.id}>
                #{p.jersey_number} {p.full_name} — {POSITION_LABELS[p.position]}
              </option>
            ))}
          </select>
          {liberoId && (
            <p className="text-xs text-purple-400 mt-1">
              ✓ Libero wybrany — będzie widoczny osobno na tablicy wyników i przy rotacjach
            </p>
          )}
        </div>

        {/* Podgląd boiska */}
        <CourtPreview lineup={lineup} players={players} liberoId={liberoId} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mecze" className="text-gray-400 hover:text-white">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">{match.home_team?.name} vs {match.away_team?.name}</h1>
      </div>

      {/* Krok 1: Kto serwuje */}
      {step === 'serving' && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Krok 1 — Kto zaczyna serwis?</h2>
          <p className="text-gray-400 text-sm mb-5">Wynik losowania przed meczem.</p>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {(['home', 'away'] as const).map(side => (
              <button
                key={side}
                onClick={() => { setServingTeam(side); setStep('lineups') }}
                className={`py-5 rounded-xl border-2 font-semibold text-base transition-all ${
                  servingTeam === side
                    ? side === 'home' ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-orange-500 bg-orange-900/40 text-orange-300'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-1">{side === 'home' ? '🏠' : '✈️'}</div>
                {side === 'home' ? match.home_team?.name : match.away_team?.name}
                <div className="text-xs font-normal mt-1 text-gray-400">{side === 'home' ? 'Gospodarz' : 'Gość'}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Krok 2: Składy */}
      {step === 'lineups' && (
        <>
          <div className={`card mb-4 py-2.5 flex items-center gap-3 border ${servingTeam === 'home' ? 'border-blue-700 bg-blue-900/20' : 'border-orange-700 bg-orange-900/20'}`}>
            <span>🏐</span>
            <span className="text-sm text-white">
              Serwuje: <strong>{servingTeam === 'home' ? match.home_team?.name : match.away_team?.name}</strong>
              <span className="text-gray-400 text-xs ml-2">— zawodnik na pozycji 1 serwuje jako pierwszy</span>
            </span>
            <button onClick={() => setStep('serving')} className="ml-auto text-xs text-gray-500 hover:text-white">Zmień</button>
          </div>

          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Krok 2 — Składy startowe</h2>
            <p className="text-gray-400 text-sm mb-5">
              Wybierz ustawienie (np. R2 = rozgrywający na P2). Aplikacja podpowiada właściwą rolę dla każdej pozycji (★ = idealne dopasowanie).
              <strong className="text-white"> Libero wybierasz osobno</strong> — nie jest wliczany do 6 startowych.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <LineupPicker
                side="home" players={homePlayers}
                lineup={homeLineup} setLineup={setHomeLineup}
                liberoId={homeLibero} setLiberoId={setHomeLibero}
                formation={homeFormation} setFormation={setHomeFormation}
              />
              <LineupPicker
                side="away" players={awayPlayers}
                lineup={awayLineup} setLineup={setAwayLineup}
                liberoId={awayLibero} setLiberoId={setAwayLibero}
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
              <p className="text-yellow-500 text-sm">
                Wypełnij 6 pozycji dla obu drużyn
                {!homeReady && ` · ${match.home_team?.short_name}: brakuje ${6 - homeFilledCount}`}
                {!awayReady && ` · ${match.away_team?.short_name}: brakuje ${6 - awayFilledCount}`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default MatchDetailPage
