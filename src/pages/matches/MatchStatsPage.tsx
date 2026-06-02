import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Action } from 'types/database'
import { useMatchStats, PlayerFullStat } from 'hooks/useMatchStats'

type Tab = 'druzyna' | 'zawodnicy' | 'strefy'

// ─── helpers ────────────────────────────────────────────────────────────────

const pct = (v: number | undefined) => v !== undefined ? `${v}%` : '—'
const num = (v: number | undefined) => v !== undefined ? String(v) : '—'
const avg = (v: number | undefined) => v !== undefined ? v.toFixed(2) : '—'
const eff = (v: number | undefined) => {
  if (v === undefined) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${(v * 100).toFixed(1)}%`
}
const effColor = (v: number | undefined) => {
  if (v === undefined) return 'text-gray-400'
  if (v >= 0.3) return 'text-green-400'
  if (v >= 0.1) return 'text-yellow-400'
  if (v >= 0) return 'text-orange-400'
  return 'text-red-400'
}
const pctColor = (v: number | undefined, good = 60) => {
  if (v === undefined) return 'text-gray-400'
  if (v >= good) return 'text-green-400'
  if (v >= good * 0.7) return 'text-yellow-400'
  return 'text-red-400'
}

// Mini progress bar
const Bar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-primary-500' }) => (
  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-0.5">
    <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
)

// Court zone heatmap
const ZoneMap: React.FC<{ zones: { zone: number; count: number; pct: number }[]; title: string }> = ({ zones, title }) => {
  const map: Record<number, { count: number; pct: number }> = {}
  zones.forEach(z => { map[z.zone] = z })
  const maxCount = Math.max(...zones.map(z => z.count), 1)

  const Cell = ({ zone }: { zone: number }) => {
    const d = map[zone] || { count: 0, pct: 0 }
    const opacity = d.count > 0 ? 0.15 + (d.count / maxCount) * 0.75 : 0
    return (
      <div className="flex flex-col items-center justify-center rounded border border-gray-700 aspect-square relative"
        style={{ backgroundColor: `rgba(59,130,246,${opacity})` }}>
        <div className="text-gray-600 text-xs absolute top-0.5 left-1">{zone}</div>
        <div className="font-bold text-white text-base">{d.count || ''}</div>
        {d.pct > 0 && <div className="text-gray-300 text-xs">{d.pct}%</div>}
      </div>
    )
  }

  return (
    <div>
      <div className="text-xs font-medium text-gray-300 mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-1" style={{ maxWidth: 160 }}>
        <Cell zone={4} /><Cell zone={3} /><Cell zone={2} />
        <Cell zone={5} /><Cell zone={6} /><Cell zone={1} />
      </div>
      <div className="text-xs text-gray-600 mt-1 text-center" style={{ maxWidth: 160 }}>← lewa | prawa →</div>
    </div>
  )
}

// ─── Team summary cards ──────────────────────────────────────────────────────

const TeamSummary: React.FC<{
  teamStats: ReturnType<typeof useMatchStats>['teamStats']
  label?: string
  color?: string
}> = ({ teamStats, label, color = 'text-white' }) => {
  const { attack, serve, reception, block, dig } = teamStats

  return (
    <div>
    {label && <div className={`text-sm font-semibold mb-3 ${color}`}>{label}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {/* ATAK */}
      {attack && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">⚡ Atak</div>
          <div className={`text-2xl font-bold mb-1 ${effColor(attack.hitEff)}`}>{eff(attack.hitEff)}</div>
          <div className="text-xs text-gray-500 mb-2">Hitting Efficiency</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Punkty (Kill)</span><span className="text-emerald-400 font-semibold">{attack.kill}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Błędy</span><span className="text-red-400">{attack.error}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Próby</span><span className="text-white">{attack.att}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Kill%</span><span className={pctColor(attack.killPct, 40)}>{pct(attack.killPct)}</span></div>
          </div>
        </div>
      )}

      {/* SERWIS */}
      {serve && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">🏐 Serwis</div>
          <div className={`text-2xl font-bold mb-1 ${pctColor(serve.acePct, 10)}`}>{serve.ace}</div>
          <div className="text-xs text-gray-500 mb-2">Asy serwisowe</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Asy (Ace)</span><span className="text-emerald-400 font-semibold">{serve.ace}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Błędy</span><span className="text-red-400">{serve.error}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Łącznie</span><span className="text-white">{serve.att}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Ace%</span><span className={pctColor(serve.acePct, 10)}>{pct(serve.acePct)}</span></div>
          </div>
        </div>
      )}

      {/* PRZYJĘCIE */}
      {reception && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">🤲 Przyjęcie</div>
          <div className={`text-2xl font-bold mb-1 ${pctColor(reception.posPct, 60)}`}>{avg(reception.avg)}</div>
          <div className="text-xs text-gray-500 mb-2">Średnia (0–3)</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-blue-400">Perfekcyjne (#)</span><span className="text-blue-400 font-semibold">{reception.perfect}</span>
            </div>
            <Bar value={reception.perfect} max={reception.att} color="bg-blue-500" />
            <div className="flex justify-between items-center">
              <span className="text-green-400">Pozytywne (+)</span><span className="text-green-400 font-semibold">{reception.positive}</span>
            </div>
            <Bar value={reception.positive} max={reception.att} color="bg-green-500" />
            <div className="flex justify-between items-center">
              <span className="text-orange-400">Negatywne (-)</span><span className="text-orange-400 font-semibold">{reception.negative}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-400">Błędy (/)</span><span className="text-red-400 font-semibold">{reception.error}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-gray-700">
              <span className="text-gray-400">Exc%</span><span className={pctColor(reception.excPct, 50)}>{pct(reception.excPct)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pos%</span><span className={pctColor(reception.posPct, 60)}>{pct(reception.posPct)}</span>
            </div>
          </div>
        </div>
      )}

      {/* BLOK */}
      {block && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">🧱 Blok</div>
          <div className="text-2xl font-bold mb-1 text-primary-400">{block.solo}</div>
          <div className="text-xs text-gray-500 mb-2">Bloki punktowe</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Solo (*)</span><span className="text-emerald-400 font-semibold">{block.solo}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Assist (+)</span><span className="text-blue-400">{block.assist}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Błędy</span><span className="text-red-400">{block.error}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Łącznie</span><span className="text-white">{block.att}</span></div>
          </div>
        </div>
      )}

      {/* OBRONA */}
      {dig && (
        <div className="card">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">🛡️ Obrona</div>
          <div className={`text-2xl font-bold mb-1 ${pctColor(dig.digPct, 70)}`}>{pct(dig.digPct)}</div>
          <div className="text-xs text-gray-500 mb-2">Dig%</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">Dobre</span><span className="text-green-400 font-semibold">{dig.good}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Błędy</span><span className="text-red-400">{dig.error}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Łącznie</span><span className="text-white">{dig.att}</span></div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// ─── Player stats table (DataVolley style) ───────────────────────────────────

const POSITION_SHORT: Record<string, string> = {
  atakujacy: 'ATK', przyjmujacy: 'PRZ', rozgrywajacy: 'ROZ',
  libero: 'LIB', srodkowy: 'ŚRO', uniwersalny: 'UNI',
}

const PlayerTable: React.FC<{
  players: PlayerFullStat[]
  onSelect: (id: string) => void
  selected: string | null
}> = ({ players, onSelect, selected }) => {
  if (players.length === 0) return <div className="text-gray-500 text-sm py-8 text-center">Brak danych</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-400">
            <th className="text-left px-3 py-2 font-medium sticky left-0 bg-gray-800 w-8">#</th>
            <th className="text-left px-3 py-2 font-medium sticky left-8 bg-gray-800 min-w-[120px]">Zawodnik</th>
            <th className="text-center px-2 py-2 font-medium w-10">Poz</th>
            {/* ATAK */}
            <th className="text-center px-2 py-1 font-medium border-l border-gray-700 bg-red-950/30 text-red-300" colSpan={4}>⚡ ATAK</th>
            {/* SERWIS */}
            <th className="text-center px-2 py-1 font-medium border-l border-gray-700 bg-yellow-950/30 text-yellow-300" colSpan={3}>🏐 SERWIS</th>
            {/* PRZYJĘCIE */}
            <th className="text-center px-2 py-1 font-medium border-l border-gray-700 bg-blue-950/30 text-blue-300" colSpan={4}>🤲 PRZYJĘCIE</th>
            {/* BLOK */}
            <th className="text-center px-2 py-1 font-medium border-l border-gray-700 bg-green-950/30 text-green-300" colSpan={3}>🧱 BLOK</th>
            {/* PKT */}
            <th className="text-center px-2 py-1 font-medium border-l border-gray-700 text-white" colSpan={1}>PKT</th>
          </tr>
          <tr className="bg-gray-900 text-gray-500 text-xs">
            <th className="px-3 py-1 sticky left-0 bg-gray-900"></th>
            <th className="px-3 py-1 sticky left-8 bg-gray-900"></th>
            <th className="px-2 py-1"></th>
            {/* Atak */}
            <th className="px-2 py-1 border-l border-gray-700 bg-red-950/10 font-normal">Kill</th>
            <th className="px-2 py-1 bg-red-950/10 font-normal">Err</th>
            <th className="px-2 py-1 bg-red-950/10 font-normal">Att</th>
            <th className="px-2 py-1 bg-red-950/10 font-normal">Eff</th>
            {/* Serwis */}
            <th className="px-2 py-1 border-l border-gray-700 bg-yellow-950/10 font-normal">Ace</th>
            <th className="px-2 py-1 bg-yellow-950/10 font-normal">Err</th>
            <th className="px-2 py-1 bg-yellow-950/10 font-normal">Att</th>
            {/* Przyjęcie */}
            <th className="px-2 py-1 border-l border-gray-700 bg-blue-950/10 font-normal">Exc%</th>
            <th className="px-2 py-1 bg-blue-950/10 font-normal">Pos%</th>
            <th className="px-2 py-1 bg-blue-950/10 font-normal">Err</th>
            <th className="px-2 py-1 bg-blue-950/10 font-normal">Avg</th>
            {/* Blok */}
            <th className="px-2 py-1 border-l border-gray-700 bg-green-950/10 font-normal">Solo</th>
            <th className="px-2 py-1 bg-green-950/10 font-normal">Ast</th>
            <th className="px-2 py-1 bg-green-950/10 font-normal">Err</th>
            {/* Pts */}
            <th className="px-2 py-1 border-l border-gray-700 font-normal text-white">Σ</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr
              key={p.player_id}
              onClick={() => onSelect(p.player_id)}
              className={`border-b border-gray-800 cursor-pointer transition-colors ${
                selected === p.player_id ? 'bg-primary-900/40' : i % 2 === 0 ? 'hover:bg-gray-800/40' : 'bg-gray-900/20 hover:bg-gray-800/40'
              }`}
            >
              <td className="px-3 py-1.5 font-mono text-gray-400 sticky left-0 bg-inherit">{p.jersey_number}</td>
              <td className="px-3 py-1.5 font-medium text-white sticky left-8 bg-inherit whitespace-nowrap">{p.player_name.split(' ').map((n,i)=>i===0?n:n[0]+'.').join(' ')}</td>
              <td className="px-2 py-1.5 text-center text-gray-500">{POSITION_SHORT[p.position] || '—'}</td>
              {/* Atak */}
              <td className="px-2 py-1.5 text-center border-l border-gray-800 text-emerald-400 font-semibold">{num(p.attack?.kill)}</td>
              <td className="px-2 py-1.5 text-center text-red-400">{num(p.attack?.error)}</td>
              <td className="px-2 py-1.5 text-center text-gray-300">{num(p.attack?.att)}</td>
              <td className={`px-2 py-1.5 text-center font-semibold ${effColor(p.attack?.hitEff)}`}>{p.attack ? eff(p.attack.hitEff) : '—'}</td>
              {/* Serwis */}
              <td className="px-2 py-1.5 text-center border-l border-gray-800 text-emerald-400 font-semibold">{num(p.serve?.ace)}</td>
              <td className="px-2 py-1.5 text-center text-red-400">{num(p.serve?.error)}</td>
              <td className="px-2 py-1.5 text-center text-gray-300">{num(p.serve?.att)}</td>
              {/* Przyjęcie */}
              <td className={`px-2 py-1.5 text-center border-l border-gray-800 ${pctColor(p.reception?.excPct, 40)}`}>{pct(p.reception?.excPct)}</td>
              <td className={`px-2 py-1.5 text-center ${pctColor(p.reception?.posPct, 60)}`}>{pct(p.reception?.posPct)}</td>
              <td className="px-2 py-1.5 text-center text-red-400">{num(p.reception?.error)}</td>
              <td className={`px-2 py-1.5 text-center font-semibold ${pctColor(p.reception ? p.reception.avg / 3 * 100 : undefined, 60)}`}>{p.reception ? avg(p.reception.avg) : '—'}</td>
              {/* Blok */}
              <td className="px-2 py-1.5 text-center border-l border-gray-800 text-emerald-400 font-semibold">{num(p.block?.solo)}</td>
              <td className="px-2 py-1.5 text-center text-blue-400">{num(p.block?.assist)}</td>
              <td className="px-2 py-1.5 text-center text-red-400">{num(p.block?.error)}</td>
              {/* Punkty */}
              <td className="px-2 py-1.5 text-center border-l border-gray-800 font-bold text-white">{p.directPoints || '—'}</td>
            </tr>
          ))}
        </tbody>
        {/* Team totals */}
      </table>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const MatchStatsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<any>(null)
  const [sets, setSets] = useState<any[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('druzyna')
  const [loading, setLoading] = useState(true)
  const [playerTeamMap, setPlayerTeamMap] = useState<Record<string, 'home' | 'away'>>({})
  const [ytCurrentTime, setYtCurrentTime] = useState<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Map: player_id -> team_side ('home'|'away')

  useEffect(() => {
    const load = async () => {
      const { data: m } = await supabase
        .from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!).single()
      setMatch(m)

      const { data: s } = await supabase.from('sets').select('*').eq('match_id', id!).order('set_number')
      setSets(s || [])

      const { data: a } = await supabase
        .from('actions').select('*, player:players(*)')
        .in('set_id', (s || []).map((x: any) => x.id))
        .order('rally_index').order('action_index')
      setActions((a as any) || [])

      // Load lineups to know which player belongs to which team
      const { data: lineups } = await supabase
        .from('match_lineups').select('player_id, team_side')
        .eq('match_id', id!)
      const map: Record<string, 'home' | 'away'> = {}
      ;(lineups || []).forEach((l: any) => { map[l.player_id] = l.team_side })
      setPlayerTeamMap(map)

      setLoading(false)
    }
    load()
  }, [id])


  const filteredActions = selectedSet === 'all' ? actions : actions.filter(a => a.set_id === selectedSet)
  const { playerStats, teamStats, homeStats, awayStats, home: homeZones, away: awayZones } = useMatchStats(filteredActions)

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  const seekTo = (t: number) => {
    setYtCurrentTime(t)
  }

  const selectedPlayerData = playerStats.find(p => p.player_id === selectedPlayer)
  const playerActions = selectedPlayer ? filteredActions.filter(a => a.player_id === selectedPlayer && a.yt_start !== null) : []

  const QUALITY_COLORS: Record<string, string> = {
    '#': 'bg-blue-900 text-blue-300', '+': 'bg-green-900 text-green-300',
    '!': 'bg-yellow-900 text-yellow-300', '-': 'bg-orange-900 text-orange-300',
    '/': 'bg-red-900 text-red-300', '*': 'bg-emerald-900 text-emerald-300',
  }
  const QUALITY_LABELS: Record<string, string> = {
    '#': 'PERF', '+': 'POZ', '!': 'OVER', '-': 'NEG', '/': 'BŁĄD', '*': 'PKT'
  }
  const ACTION_LABELS: Record<string, string> = {
    S: 'Serwis', R: 'Przyjęcie', E: 'Rozegranie', A: 'Atak', B: 'Blok', D: 'Obrona', K: 'Kiwka', F: 'Free ball'
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie statystyk...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link to="/mecze" className="text-gray-400 hover:text-white text-sm">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">
          {match?.home_team?.name} <span className="text-gray-500 font-normal text-base">vs</span> {match?.away_team?.name}
        </h1>
        {match?.status === 'w_trakcie' && (
          <Link to={`/mecze/${id}/rejestracja`} className="ml-auto btn-secondary text-sm">▶ Kontynuuj rejestrację</Link>
        )}
      </div>

      {/* Set scores */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {sets.map(s => (
          <div key={s.id} className="bg-gray-800 rounded-lg px-3 py-1.5 text-sm flex items-center gap-2">
            <span className="text-gray-400 text-xs">Set {s.set_number}</span>
            <span className="font-bold text-white font-mono">{s.score_home}:{s.score_away}</span>
            {s.is_finished && <span className="text-xs text-gray-600">✓</span>}
          </div>
        ))}
        <div className="text-gray-500 text-sm ml-2">{filteredActions.length} akcji</div>
      </div>

      {/* YouTube iframe — bezpośredni embed, bez YouTube API */}
      {match?.youtube_url && match.youtube_url.trim().length > 0 && (() => {
        const videoId = match.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1]
        if (!videoId) return null
        const startParam = ytCurrentTime !== null ? `&start=${Math.floor(ytCurrentTime)}&autoplay=1` : ''
        const src = `https://www.youtube.com/embed/${videoId}?rel=0${startParam}`
        return (
          <div className="mb-5 rounded-xl overflow-hidden" style={{ maxWidth: 560 }}>
            <iframe
              ref={iframeRef}
              key={ytCurrentTime ?? 'init'}
              className="w-full aspect-video"
              src={src}
              title="YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )
      })()}

      {/* Set filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setSelectedSet('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSet === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
          Cały mecz
        </button>
        {sets.map(s => (
          <button key={s.id} onClick={() => setSelectedSet(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSet === s.id ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            Set {s.set_number}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-900 p-1 rounded-lg w-fit">
        {([['druzyna', '📊 Drużyna'], ['zawodnicy', '👥 Zawodnicy'], ['strefy', '🗺️ Strefy']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: DRUŻYNA */}
      {tab === 'druzyna' && (
        <div>
          {filteredActions.length === 0 ? (
            <div className="text-center text-gray-500 py-12">Brak zarejestrowanych akcji w wybranym zakresie</div>
          ) : (
            <div className="space-y-8">
              {/* Gospodarz */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0"></span>
                  <span className="text-blue-400 font-semibold">{match?.home_team?.name}</span>
                  <span className="text-gray-500 text-xs">(Gospodarz)</span>
                </div>
                <TeamSummary teamStats={homeStats} />
              </div>

              <div className="border-t border-gray-800"></div>

              {/* Gość */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0"></span>
                  <span className="text-orange-400 font-semibold">{match?.away_team?.name}</span>
                  <span className="text-gray-500 text-xs">(Gość)</span>
                </div>
                <TeamSummary teamStats={awayStats} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: ZAWODNICY */}
      {tab === 'zawodnicy' && (
        <div>
          <p className="text-gray-500 text-xs mb-3">Kliknij zawodnika aby zobaczyć szczegóły i klipy wideo ↓</p>

          {/* HOME TEAM */}
          {(() => {
            const homePlayers = playerStats.filter(p => playerTeamMap[p.player_id] === 'home')
            const awayPlayers = playerStats.filter(p => playerTeamMap[p.player_id] === 'away')
            const unknownPlayers = playerStats.filter(p => !playerTeamMap[p.player_id])
            return (
              <>
                {homePlayers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                      <span className="text-blue-400 font-semibold text-sm">{match?.home_team?.name}</span>
                      <span className="text-gray-500 text-xs">(Gospodarz)</span>
                    </div>
                    <PlayerTable players={homePlayers} onSelect={setSelectedPlayer} selected={selectedPlayer} />
                  </div>
                )}
                {awayPlayers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0"></span>
                      <span className="text-orange-400 font-semibold text-sm">{match?.away_team?.name}</span>
                      <span className="text-gray-500 text-xs">(Gość)</span>
                    </div>
                    <PlayerTable players={awayPlayers} onSelect={setSelectedPlayer} selected={selectedPlayer} />
                  </div>
                )}
                {unknownPlayers.length > 0 && (
                  <div className="mb-6">
                    <div className="text-gray-500 text-xs mb-2">Pozostali zawodnicy</div>
                    <PlayerTable players={unknownPlayers} onSelect={setSelectedPlayer} selected={selectedPlayer} />
                  </div>
                )}
              </>
            )
          })()}

          {/* Player detail panel */}
          {selectedPlayerData && (
            <div className="mt-2 card border-primary-700">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  playerTeamMap[selectedPlayerData.player_id] === 'home' ? 'bg-blue-800' : 'bg-orange-800'
                }`}>
                  {selectedPlayerData.jersey_number}
                </div>
                <div>
                  <div className="font-semibold text-white">{selectedPlayerData.player_name}</div>
                  <div className="text-gray-400 text-xs">
                    {playerTeamMap[selectedPlayerData.player_id] === 'home' ? match?.home_team?.name : match?.away_team?.name}
                    {' · '}{playerActions.length} akcji z nagraniem
                  </div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="ml-auto text-gray-500 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-700">✕</button>
              </div>

              {!match?.youtube_url || match.youtube_url.trim().length === 0 ? (
                <div className="text-yellow-600 text-sm bg-yellow-900/20 border border-yellow-800 rounded-lg px-3 py-2">
                  ⚠️ Ten mecz nie ma przypisanego nagrania YouTube — timestampy nie są dostępne.
                  <Link to={`/mecze/${id}/edytuj`} className="text-yellow-400 hover:text-yellow-300 ml-2 underline">Dodaj nagranie →</Link>
                </div>
              ) : playerActions.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  Brak akcji z timestampami dla tego zawodnika w wybranym zakresie.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                  {playerActions.map(a => (
                    <button key={a.id} onClick={() => seekTo(a.yt_start!)}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-600 rounded-lg px-3 py-2 text-xs text-left transition-colors">
                      <span className="text-red-400">▶</span>
                      <span className="font-mono text-gray-300 w-10 shrink-0">{formatTime(a.yt_start!)}</span>
                      <span className="text-white">{ACTION_LABELS[a.action_type]}</span>
                      {a.quality && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ml-auto ${QUALITY_COLORS[a.quality]}`}>
                          {QUALITY_LABELS[a.quality]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: STREFY */}
      {tab === 'strefy' && (
        <div className="space-y-8">
          {/* Legenda */}
          <div className="flex gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>Duża gęstość</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-900 inline-block opacity-40"></span>Mała gęstość</span>
            <span className="text-gray-500">— każda strefa pokazuje liczbę akcji i procent z ogółu drużyny</span>
          </div>

          {/* Gospodarz */}
          {homeZones && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <span className="text-blue-400 font-semibold">{match?.home_team?.name}</span>
                <span className="text-gray-500 text-xs">(Gospodarz)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <ZoneMap zones={homeZones.attackZonesTo} title="⚡ Ataki — dokąd" />
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500 max-w-[160px]">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Punkty</span>
                      <span>{homeZones.attackZonesTo_kill.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Błędy</span>
                      <span>{homeZones.attackZonesTo_err.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <ZoneMap zones={homeZones.serveZonesTo} title="🏐 Serwisy — dokąd" />
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500 max-w-[160px]">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Asy</span>
                      <span>{homeZones.serveZonesTo_ace.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                  </div>
                </div>
                {homeZones.reception && homeZones.reception.att > 0 && (
                  <div style={{ minWidth: 200 }}>
                    <div className="text-xs font-medium text-gray-300 mb-2">🤲 Jakość przyjęć</div>
                    {[
                      { label: 'Perfekcyjne (#)', value: homeZones.reception.perfect, color: 'bg-blue-500', text: 'text-blue-400' },
                      { label: 'Pozytywne (+)', value: homeZones.reception.positive, color: 'bg-green-500', text: 'text-green-400' },
                      { label: 'Overpass (!)', value: homeZones.reception.overpass, color: 'bg-yellow-500', text: 'text-yellow-400' },
                      { label: 'Negatywne (-)', value: homeZones.reception.negative, color: 'bg-orange-500', text: 'text-orange-400' },
                      { label: 'Błąd (/)', value: homeZones.reception.error, color: 'bg-red-500', text: 'text-red-400' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2 mb-1">
                        <div className="w-24 text-gray-400 text-xs shrink-0">{row.label}</div>
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${row.color}`}
                            style={{ width: `${homeZones.reception!.att > 0 ? (row.value / homeZones.reception!.att) * 100 : 0}%` }} />
                        </div>
                        <div className={`w-5 text-right text-xs font-mono ${row.text}`}>{row.value}</div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-500 mt-1.5">
                      Pos% <span className={pctColor(homeZones.reception.posPct, 60)}>{pct(homeZones.reception.posPct)}</span>
                      {' · '} Avg <span className="text-white">{avg(homeZones.reception.avg)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-gray-800"></div>

          {/* Gość */}
          {awayZones && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                <span className="text-orange-400 font-semibold">{match?.away_team?.name}</span>
                <span className="text-gray-500 text-xs">(Gość)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <ZoneMap zones={awayZones.attackZonesTo} title="⚡ Ataki — dokąd" />
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500 max-w-[160px]">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Punkty</span>
                      <span>{awayZones.attackZonesTo_kill.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Błędy</span>
                      <span>{awayZones.attackZonesTo_err.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <ZoneMap zones={awayZones.serveZonesTo} title="🏐 Serwisy — dokąd" />
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500 max-w-[160px]">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Asy</span>
                      <span>{awayZones.serveZonesTo_ace.reduce((s,z) => s+z.count,0)}</span>
                    </div>
                  </div>
                </div>
                {awayZones.reception && awayZones.reception.att > 0 && (
                  <div style={{ minWidth: 200 }}>
                    <div className="text-xs font-medium text-gray-300 mb-2">🤲 Jakość przyjęć</div>
                    {[
                      { label: 'Perfekcyjne (#)', value: awayZones.reception.perfect, color: 'bg-blue-500', text: 'text-blue-400' },
                      { label: 'Pozytywne (+)', value: awayZones.reception.positive, color: 'bg-green-500', text: 'text-green-400' },
                      { label: 'Overpass (!)', value: awayZones.reception.overpass, color: 'bg-yellow-500', text: 'text-yellow-400' },
                      { label: 'Negatywne (-)', value: awayZones.reception.negative, color: 'bg-orange-500', text: 'text-orange-400' },
                      { label: 'Błąd (/)', value: awayZones.reception.error, color: 'bg-red-500', text: 'text-red-400' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2 mb-1">
                        <div className="w-24 text-gray-400 text-xs shrink-0">{row.label}</div>
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${row.color}`}
                            style={{ width: `${awayZones.reception!.att > 0 ? (row.value / awayZones.reception!.att) * 100 : 0}%` }} />
                        </div>
                        <div className={`w-5 text-right text-xs font-mono ${row.text}`}>{row.value}</div>
                      </div>
                    ))}
                    <div className="text-xs text-gray-500 mt-1.5">
                      Pos% <span className={pctColor(awayZones.reception.posPct, 60)}>{pct(awayZones.reception.posPct)}</span>
                      {' · '} Avg <span className="text-white">{avg(awayZones.reception.avg)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {filteredActions.length === 0 && (
            <div className="text-center text-gray-500 py-12">Brak zarejestrowanych akcji</div>
          )}
        </div>
      )}
    </div>
  )
}

export default MatchStatsPage
