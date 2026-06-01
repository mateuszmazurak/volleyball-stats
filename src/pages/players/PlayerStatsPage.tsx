import React, { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { useMatchStats } from 'hooks/useMatchStats'
import { ACTION_LABELS, QUALITY_COLORS, QUALITY_LABELS } from 'components/ui/StatComponents'
import { Action } from 'types/database'

const PlayerStatsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<any>(null)
  const [actions, setActions] = useState<Action[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterQuality, setFilterQuality] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [currentMatch, setCurrentMatch] = useState<any>(null)
  const ytRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const [ytReady, setYtReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: playerData } = await supabase
        .from('players').select('*, team:teams(*)').eq('id', id!).single()
      setPlayer(playerData)
      const { data: actionsData } = await supabase
        .from('actions')
        .select('*, set:sets(*, match:matches(*, youtube_url, home_team:teams!matches_home_team_id_fkey(name), away_team:teams!matches_away_team_id_fkey(name)))')
        .eq('player_id', id!)
        .not('yt_start', 'is', null)
        .order('created_at', { ascending: false })
      setActions((actionsData as any) || [])
      setLoading(false)
    }
    load()
  }, [id])

  const { playerStats } = useMatchStats(actions)
  const myStat = playerStats[0]

  const filteredActions = actions.filter(a => {
    if (filterType !== 'all' && a.action_type !== filterType) return false
    if (filterQuality !== 'all' && a.quality !== filterQuality) return false
    return true
  })

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  const handlePlay = (action: any) => {
    const match = action.set?.match
    if (!match?.youtube_url) return
    if (!currentMatch || currentMatch.id !== match.id) {
      setCurrentMatch(match)
      setYtReady(false)
    }
    setTimeout(() => {
      if (ytPlayerRef.current && ytReady) {
        ytPlayerRef.current.seekTo(action.yt_start, true)
        ytPlayerRef.current.playVideo()
      }
    }, 600)
  }

  useEffect(() => {
    if (!currentMatch?.youtube_url || !ytRef.current) return
    const videoId = currentMatch.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1]
    if (!videoId) return
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch {} }
    const init = () => {
      ytPlayerRef.current = new (window as any).YT.Player(ytRef.current, {
        videoId, playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: { onReady: () => setYtReady(true) }
      })
    }
    if ((window as any).YT?.Player) init()
    else {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
      ;(window as any).onYouTubeIframeAPIReady = init
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.id])

  const pct = (v?: number) => v !== undefined ? `${v}%` : '—'
  const eff = (v?: number) => {
    if (v === undefined) return '—'
    return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
  }
  const effColor = (v?: number) => {
    if (v === undefined) return 'text-gray-400'
    if (v >= 0.3) return 'text-green-400'
    if (v >= 0.1) return 'text-yellow-400'
    return v >= 0 ? 'text-orange-400' : 'text-red-400'
  }

  const actionTypes = actions.map(a => a.action_type).filter((v, i, arr) => arr.indexOf(v) === i)

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/zawodnicy" className="text-gray-400 hover:text-white">← Zawodnicy</Link>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center font-bold text-white">
            {player?.jersey_number}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{player?.full_name}</h1>
            <div className="text-gray-400 text-sm">{player?.team?.name}</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {myStat && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {myStat.attack && (
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">⚡ Atak</div>
              <div className={`text-xl font-bold ${effColor(myStat.attack.hitEff)}`}>{eff(myStat.attack.hitEff)}</div>
              <div className="text-xs text-gray-500 mt-1">{myStat.attack.kill}K / {myStat.attack.error}E / {myStat.attack.att}Att</div>
            </div>
          )}
          {myStat.serve && (
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">🏐 Serwis</div>
              <div className="text-xl font-bold text-emerald-400">{myStat.serve.ace}</div>
              <div className="text-xs text-gray-500 mt-1">Asy z {myStat.serve.att} serwisów</div>
            </div>
          )}
          {myStat.reception && (
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">🤲 Przyjęcie</div>
              <div className="text-xl font-bold text-blue-400">{myStat.reception.avg.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">Avg · Pos% {pct(myStat.reception.posPct)}</div>
            </div>
          )}
          {myStat.block && (
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">🧱 Blok</div>
              <div className="text-xl font-bold text-primary-400">{myStat.block.solo}</div>
              <div className="text-xs text-gray-500 mt-1">Solo z {myStat.block.att} bloków</div>
            </div>
          )}
          {myStat.dig && (
            <div className="card text-center">
              <div className="text-xs text-gray-500 mb-1">🛡️ Obrona</div>
              <div className="text-xl font-bold text-yellow-400">{pct(myStat.dig.digPct)}</div>
              <div className="text-xs text-gray-500 mt-1">{myStat.dig.good} z {myStat.dig.att}</div>
            </div>
          )}
          <div className="card text-center">
            <div className="text-xs text-gray-500 mb-1">🏆 Punkty</div>
            <div className="text-xl font-bold text-white">{myStat.directPoints}</div>
            <div className="text-xs text-gray-500 mt-1">Ace + Kill + Blok</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* YouTube player */}
        <div>
          {currentMatch ? (
            <div>
              <div className="text-sm text-gray-400 mb-2">
                {currentMatch.home_team?.name} vs {currentMatch.away_team?.name}
              </div>
              <div className="rounded-xl overflow-hidden bg-black">
                <div ref={ytRef} className="w-full aspect-video" />
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🎬</div>
              <div className="text-gray-400">Kliknij ▶ przy akcji aby odtworzyć fragment</div>
            </div>
          )}
        </div>

        {/* Actions list */}
        <div>
          <div className="flex gap-2 flex-wrap mb-3">
            <select className="input text-sm py-1.5 w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">Wszystkie akcje</option>
              {actionTypes.map(t => <option key={t} value={t}>{ACTION_LABELS[t] || t}</option>)}
            </select>
            <select className="input text-sm py-1.5 w-auto" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}>
              <option value="all">Każda jakość</option>
              <option value="#">Perfekcyjne (#)</option>
              <option value="+">Pozytywne (+)</option>
              <option value="!">Overpass (!)</option>
              <option value="-">Negatywne (-)</option>
              <option value="/">Błąd (/)</option>
              <option value="*">Punkt (*)</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 mb-2">{filteredActions.length} akcji z nagraniem</div>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredActions.map(a => {
              const match = (a as any).set?.match
              return (
                <button key={a.id} onClick={() => handlePlay(a)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-600 rounded-lg px-4 py-2.5 transition-colors flex items-center gap-3 text-sm">
                  <span className="text-red-400">▶</span>
                  <span className="font-mono text-gray-300 w-12 shrink-0">{formatTime(a.yt_start!)}</span>
                  <span className="text-white">{ACTION_LABELS[a.action_type]}</span>
                  {a.quality && <span className={`text-xs px-2 py-0.5 rounded font-semibold ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                  {a.zone_from && <span className="text-gray-500 text-xs">S{a.zone_from}</span>}
                  {a.zone_to && <span className="text-gray-500 text-xs">→S{a.zone_to}</span>}
                  {match && <span className="ml-auto text-xs text-gray-600 truncate max-w-[100px]">
                    {new Date(match.match_date || '').toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                  </span>}
                </button>
              )
            })}
            {filteredActions.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">Brak akcji z nagraniem</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerStatsPage
