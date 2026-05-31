import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { useMatchStats } from 'hooks/useMatchStats'
import { ActionStatCard, ACTION_LABELS } from 'components/ui/StatComponents'
import { Action } from 'types/database'

const QUALITY_COLORS: Record<string, string> = {
  '#': 'bg-blue-900 text-blue-300', '+': 'bg-green-900 text-green-300',
  '!': 'bg-yellow-900 text-yellow-300', '-': 'bg-orange-900 text-orange-300',
  '/': 'bg-red-900 text-red-300', '*': 'bg-emerald-900 text-emerald-300',
}
const QUALITY_LABELS: Record<string, string> = {
  '#': 'PERF', '+': 'POZ', '!': 'OVER', '-': 'NEG', '/': 'BŁĄD', '*': 'PKT'
}

const PlayerStatsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<any>(null)
  const [actions, setActions] = useState<Action[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterQuality, setFilterQuality] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [ytPlayer, setYtPlayer] = useState<any>(null)
  const [ytReady, setYtReady] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<any>(null)
  const playerRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: playerData } = await supabase
        .from('players').select('*, team:teams(*)').eq('id', id!).single()
      setPlayer(playerData)

      const { data: actionsData } = await supabase
        .from('actions')
        .select('*, set:sets(*, match:matches(*, youtube_url))')
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handlePlay = (action: any) => {
    const match = action.set?.match
    if (!match?.youtube_url) return

    // If different match, reinit player
    if (!currentMatch || currentMatch.id !== match.id) {
      setCurrentMatch(match)
      setYtReady(false)
      setYtPlayer(null)
    }
    // seek handled by effect below
    setTimeout(() => {
      if (ytPlayer && ytReady) {
        ytPlayer.seekTo(action.yt_start, true)
        ytPlayer.playVideo()
      }
    }, 500)
  }

  // Init YT player when currentMatch changes
  useEffect(() => {
    if (!currentMatch?.youtube_url || !playerRef.current) return
    const videoId = currentMatch.youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1]
    if (!videoId) return

    // Clear old player
    if (ytPlayer) { try { ytPlayer.destroy() } catch {} }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.id])

  if (loading) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const actionTypes = actions.map(a => a.action_type).filter((v, i, arr) => arr.indexOf(v) === i)

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

      {/* Summary stats */}
      {myStat && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {Object.entries(myStat.byType).map(([type, stat]) => (
            <ActionStatCard key={type} type={type} stat={stat!} compact />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* YouTube player */}
        <div>
          {currentMatch ? (
            <div>
              <div className="text-sm text-gray-400 mb-2">
                Nagranie: {currentMatch.home_team?.name || ''} vs {currentMatch.away_team?.name || ''}
              </div>
              <div className="rounded-xl overflow-hidden bg-black">
                <div ref={playerRef} className="w-full aspect-video" />
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🎬</div>
              <div className="text-gray-400">Kliknij ▶ przy akcji aby odtworzyć fragment</div>
            </div>
          )}
        </div>

        {/* Action list */}
        <div>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-3">
            <select
              className="input text-sm py-1.5 w-auto"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">Wszystkie akcje</option>
              {actionTypes.map(t => (
                <option key={t} value={t}>{ACTION_LABELS[t] || t}</option>
              ))}
            </select>
            <select
              className="input text-sm py-1.5 w-auto"
              value={filterQuality}
              onChange={e => setFilterQuality(e.target.value)}
            >
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
                <button
                  key={a.id}
                  onClick={() => handlePlay(a)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary-600 rounded-lg px-4 py-2.5 transition-colors flex items-center gap-3 text-sm"
                >
                  <span className="text-red-400">▶</span>
                  <span className="font-mono text-gray-300 w-12 shrink-0">{formatTime(a.yt_start!)}</span>
                  <span className="text-white">{ACTION_LABELS[a.action_type]}</span>
                  {a.quality && (
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${QUALITY_COLORS[a.quality]}`}>
                      {QUALITY_LABELS[a.quality]}
                    </span>
                  )}
                  {a.zone_from && <span className="text-gray-500 text-xs">S{a.zone_from}</span>}
                  {a.zone_to && <span className="text-gray-500 text-xs">→S{a.zone_to}</span>}
                  {match && (
                    <span className="ml-auto text-xs text-gray-600 truncate max-w-[100px]">
                      {new Date((a as any).set?.match?.match_date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </button>
              )
            })}
            {filteredActions.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">
                Brak akcji z nagraniem dla wybranych filtrów
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerStatsPage
