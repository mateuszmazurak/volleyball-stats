import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { Action } from 'types/database'
import { useMatchStats } from 'hooks/useMatchStats'
import { ActionStatCard, CourtZoneMap, ACTION_LABELS } from 'components/ui/StatComponents'

type Tab = 'druzyna' | 'zawodnicy' | 'strefy'

const QUALITY_COLORS: Record<string, string> = {
  '#': 'bg-blue-900 text-blue-300',
  '+': 'bg-green-900 text-green-300',
  '!': 'bg-yellow-900 text-yellow-300',
  '-': 'bg-orange-900 text-orange-300',
  '/': 'bg-red-900 text-red-300',
  '*': 'bg-emerald-900 text-emerald-300',
}
const QUALITY_LABELS: Record<string, string> = {
  '#': 'PERF', '+': 'POZ', '!': 'OVER', '-': 'NEG', '/': 'BŁĄD', '*': 'PKT'
}

const MatchStatsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<any>(null)
  const [sets, setSets] = useState<any[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [selectedSet, setSelectedSet] = useState<string>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('druzyna')
  const [loading, setLoading] = useState(true)
  const [ytPlayer, setYtPlayer] = useState<any>(null)
  const [ytReady, setYtReady] = useState(false)
  const playerRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!).single()
      setMatch(matchData)

      const { data: setsData } = await supabase.from('sets').select('*').eq('match_id', id!).order('set_number')
      setSets(setsData || [])

      const { data: actionsData } = await supabase
        .from('actions')
        .select('*, player:players(*)')
        .in('set_id', (setsData || []).map((s: any) => s.id))
        .order('rally_index').order('action_index')
      setActions((actionsData as any) || [])
      setLoading(false)
    }
    load()
  }, [id])

  // Init YouTube player
  useEffect(() => {
    if (!match?.youtube_url || !playerRef.current) return
    const videoId = match.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1]
    if (!videoId) return

    const init = () => {
      const p = new (window as any).YT.Player(playerRef.current, {
        videoId,
        playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: { onReady: () => setYtReady(true) }
      })
      setYtPlayer(p)
    }

    if ((window as any).YT?.Player) init()
    else {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
      ;(window as any).onYouTubeIframeAPIReady = init
    }
  }, [match?.youtube_url])

  const seekTo = (time: number) => {
    if (ytPlayer && ytReady) {
      ytPlayer.seekTo(time, true)
      ytPlayer.playVideo()
    }
  }

  const filteredActions = selectedSet === 'all'
    ? actions
    : actions.filter(a => a.set_id === selectedSet)

  const { playerStats, teamStats, attackZones, serveZones } = useMatchStats(filteredActions)

  const selectedPlayerStat = playerStats.find(p => p.player_id === selectedPlayer)

  // Player actions with yt timestamps
  const playerActions = selectedPlayer
    ? filteredActions.filter(a => a.player_id === selectedPlayer && a.yt_start !== null)
    : []

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="p-6 text-gray-400">Ładowanie statystyk...</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link to="/mecze" className="text-gray-400 hover:text-white text-sm">← Mecze</Link>
        <span className="text-gray-600">/</span>
        <h1 className="text-xl font-bold text-white">
          {match?.home_team?.name} vs {match?.away_team?.name}
        </h1>
        <Link
          to={`/mecze/${id}/rejestracja`}
          className="ml-auto btn-secondary text-sm"
        >▶ Otwórz rejestrację</Link>
      </div>

      {/* Set score summary */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {sets.map(s => (
          <div key={s.id} className="bg-gray-800 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-400 mr-2">Set {s.set_number}</span>
            <span className="font-bold text-white">{s.score_home} : {s.score_away}</span>
            {s.is_finished && <span className="ml-2 text-xs text-gray-500">✓</span>}
          </div>
        ))}
      </div>

      {/* YouTube player (compact) */}
      {match?.youtube_url && (
        <div className="mb-6 rounded-xl overflow-hidden bg-black" style={{ maxWidth: 640 }}>
          <div ref={playerRef} className="w-full aspect-video" />
        </div>
      )}

      {/* Set filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedSet('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSet === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >Cały mecz</button>
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSet(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSet === s.id ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >Set {s.set_number}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-lg w-fit">
        {([['druzyna', '📊 Drużyna'], ['zawodnicy', '🏃 Zawodnicy'], ['strefy', '🗺️ Strefy']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >{label}</button>
        ))}
      </div>

      {/* TAB: DRUŻYNA */}
      {tab === 'druzyna' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(teamStats).map(([type, stat]) => (
              <ActionStatCard key={type} type={type} stat={stat!} />
            ))}
          </div>
          {Object.keys(teamStats).length === 0 && (
            <div className="text-center text-gray-500 py-12">Brak zarejestrowanych akcji</div>
          )}
        </div>
      )}

      {/* TAB: ZAWODNICY */}
      {tab === 'zawodnicy' && (
        <div className="flex gap-6">
          {/* Player list */}
          <div className="w-56 shrink-0">
            <div className="text-xs text-gray-500 uppercase mb-2">Wybierz zawodnika</div>
            <div className="space-y-1">
              {playerStats.map(p => (
                <button
                  key={p.player_id}
                  onClick={() => setSelectedPlayer(p.player_id === selectedPlayer ? null : p.player_id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedPlayer === p.player_id ? 'bg-primary-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  <span className="font-mono text-xs w-6 text-center">{p.jersey_number}</span>
                  <span className="truncate">{p.player_name.split(' ')[0]} {p.player_name.split(' ')[1]?.[0]}.</span>
                  <span className="ml-auto text-xs text-gray-500">{p.total}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Player details */}
          <div className="flex-1 min-w-0">
            {!selectedPlayerStat ? (
              <div className="text-center text-gray-500 py-12">← Wybierz zawodnika aby zobaczyć statystyki</div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary-800 flex items-center justify-center text-2xl font-bold text-white">
                    {selectedPlayerStat.jersey_number}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{selectedPlayerStat.player_name}</div>
                    <div className="text-gray-400 text-sm">{selectedPlayerStat.total} akcji łącznie</div>
                  </div>
                </div>

                {/* Stats per action type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  {Object.entries(selectedPlayerStat.byType).map(([type, stat]) => (
                    <ActionStatCard key={type} type={type} stat={stat!} compact />
                  ))}
                </div>

                {/* YouTube timestamps */}
                {playerActions.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-white mb-3">
                      🎬 Akcje na wideo ({playerActions.length})
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {playerActions.map((a, i) => (
                        <button
                          key={a.id}
                          onClick={() => seekTo(a.yt_start!)}
                          className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-600 rounded-lg px-4 py-2.5 transition-colors flex items-center gap-3 text-sm"
                        >
                          <span className="text-red-400 text-base">▶</span>
                          <span className="font-mono text-gray-300 w-12 shrink-0">{formatTime(a.yt_start!)}</span>
                          <span className="text-gray-300">{ACTION_LABELS[a.action_type] || a.action_type}</span>
                          {a.quality && (
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ml-auto ${QUALITY_COLORS[a.quality]}`}>
                              {QUALITY_LABELS[a.quality]}
                            </span>
                          )}
                          {a.zone_from && <span className="text-gray-500 text-xs">Strefa {a.zone_from}</span>}
                        </button>
                      ))}
                    </div>
                    {!match?.youtube_url && (
                      <p className="text-gray-500 text-xs mt-2">Dodaj nagranie YouTube do meczu aby móc odtwarzać akcje</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STREFY */}
      {tab === 'strefy' && (
        <div className="flex gap-10 flex-wrap">
          <CourtZoneMap zones={attackZones} title="Strefy ataków" />
          <CourtZoneMap zones={serveZones} title="Strefy serwisów" />

          {/* Acceptance quality breakdown */}
          <div>
            <div className="text-sm font-medium text-gray-300 mb-3">Jakość przyjęć</div>
            {teamStats['R'] ? (
              <div className="space-y-2 w-52">
                {[
                  { key: '#', label: 'Perfekcyjne', color: 'bg-blue-500', value: teamStats['R']!.perfect },
                  { key: '+', label: 'Pozytywne', color: 'bg-green-500', value: teamStats['R']!.positive },
                  { key: '!', label: 'Overpass', color: 'bg-yellow-500', value: teamStats['R']!.overpass },
                  { key: '-', label: 'Negatywne', color: 'bg-orange-500', value: teamStats['R']!.negative },
                  { key: '/', label: 'Błąd', color: 'bg-red-500', value: teamStats['R']!.error },
                ].map(row => (
                  <div key={row.key} className="flex items-center gap-3 text-sm">
                    <div className="w-24 text-gray-400 text-xs">{row.label}</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${row.color}`}
                        style={{ width: `${teamStats['R']!.total > 0 ? (row.value / teamStats['R']!.total) * 100 : 0}%` }} />
                    </div>
                    <div className="w-8 text-right text-white text-xs font-mono">{row.value}</div>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-2">
                  Skuteczność: <span className="text-white">{teamStats['R']!.pct}%</span>
                  {' '}· Łącznie: <span className="text-white">{teamStats['R']!.total}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Brak danych o przyjęciach</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchStatsPage
