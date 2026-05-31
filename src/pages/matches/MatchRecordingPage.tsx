import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { parseRally, describeRally, ParsedRally } from 'lib/interpreter'
import { Action } from 'types/database'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

// Extract YouTube video ID from URL
function extractYTId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

const MatchRecordingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<any>(null)
  const [currentSet, setCurrentSet] = useState<any>(null)
  const [lineups, setLineups] = useState<any[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [rallyIndex, setRallyIndex] = useState(0)

  // Recording state
  const [inputCode, setInputCode] = useState('')
  const [preview, setPreview] = useState<ParsedRally | null>(null)
  const [ytStart, setYtStart] = useState<number | null>(null)
  const [ytEnd, setYtEnd] = useState<number | null>(null)
  const [isRecordingTime, setIsRecordingTime] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // YouTube player
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [ytReady, setYtReady] = useState(false)

  // Load match data
  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!).single()
      setMatch(matchData)

      const { data: sets } = await supabase.from('sets').select('*').eq('match_id', id!).order('set_number')
      const activeSet = sets?.find(s => !s.is_finished) || sets?.[sets.length - 1]
      setCurrentSet(activeSet)

      if (activeSet) {
        const { data: acts } = await supabase.from('actions').select('*, player:players(*)').eq('set_id', activeSet.id).order('rally_index').order('action_index')
        setActions((acts as any) || [])
        const maxRally = acts && acts.length > 0 ? Math.max(...acts.map((a: any) => a.rally_index)) + 1 : 0
        setRallyIndex(maxRally)
      }

      const { data: lu } = await supabase.from('match_lineups').select('*, player:players(*)').eq('match_id', id!)
      setLineups(lu || [])
    }
    load()
  }, [id])

  // Init YouTube player
  useEffect(() => {
    if (!match?.youtube_url) return
    const videoId = extractYTId(match.youtube_url)
    if (!videoId) return

    const initPlayer = () => {
      if (!playerContainerRef.current) return
      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId,
        playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: { onReady: () => setYtReady(true) }
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => { window.onYouTubeIframeAPIReady = () => {} }
  }, [match?.youtube_url])

  // Update preview as user types
  useEffect(() => {
    if (inputCode.trim()) {
      setPreview(parseRally(inputCode))
    } else {
      setPreview(null)
    }
  }, [inputCode])

  // Save rally to database
  const saveRally = useCallback(async (code: string, ytS: number | null, ytE: number | null) => {
    if (!currentSet || !code.trim()) return
    const parsed = parseRally(code)
    if (parsed.actions.length === 0) return

    // Get player map: number -> id
    const playerMap: Record<number, string> = {}
    lineups.forEach((l: any) => {
      if (l.player) playerMap[l.player.jersey_number] = l.player_id
    })

    const toInsert = parsed.actions.map((a, i) => ({
      set_id: currentSet.id,
      player_id: playerMap[a.playerNumber] || null,
      raw_code: a.rawCode,
      action_type: a.actionType,
      quality: a.quality,
      zone_from: a.zoneFrom,
      zone_to: a.zoneTo,
      technique: a.technique,
      result: a.result,
      yt_start: i === 0 ? ytS : null,
      yt_end: i === parsed.actions.length - 1 ? ytE : null,
      rally_index: rallyIndex,
      action_index: i,
    }))

    const { error } = await supabase.from('actions').insert(toInsert)
    if (!error) {
      setRallyIndex(r => r + 1)
      setActions(prev => [...prev, ...(toInsert as any)])
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }, [currentSet, lineups, rallyIndex])

  // Keyboard handler
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    // TAB - start new action (focus input)
    if (e.key === 'Tab') {
      e.preventDefault()
      inputRef.current?.focus()
      setInputCode('')
      setYtStart(null)
      setYtEnd(null)
      setIsRecordingTime(false)
      setError('')
      // Capture start time from YouTube
      if (playerRef.current && ytReady) {
        const t = playerRef.current.getCurrentTime?.()
        if (t !== undefined) setYtStart(t)
      }
    }

    // SPACE - play/pause youtube ONLY when not typing in input
    if (e.key === ' ' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      if (!playerRef.current || !ytReady) return
      const state = playerRef.current.getPlayerState?.()
      if (state === 1) { // playing
        playerRef.current.pauseVideo()
        const t = playerRef.current.getCurrentTime?.()
        if (!ytStart) setYtStart(t)
        else setYtEnd(t)
      } else {
        playerRef.current.playVideo()
        setIsRecordingTime(true)
      }
    }

    // ENTER - save action
    if (e.key === 'Enter' && document.activeElement === inputRef.current) {
      e.preventDefault()
      if (!inputCode.trim()) return
      // Capture end time
      let endTime = ytEnd
      if (playerRef.current && ytReady) {
        endTime = playerRef.current.getCurrentTime?.() || null
        setYtEnd(endTime)
        playerRef.current.pauseVideo?.()
      }
      await saveRally(inputCode, ytStart, endTime)
      setInputCode('')
      setYtStart(null)
      setYtEnd(null)
      setIsRecordingTime(false)
    }
  }, [inputCode, ytReady, ytStart, ytEnd, saveRally])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Group actions by rally
  const ralliesByIndex: Record<number, Action[]> = {}
  actions.forEach(a => {
    if (!ralliesByIndex[a.rally_index]) ralliesByIndex[a.rally_index] = []
    ralliesByIndex[a.rally_index].push(a)
  })
  const rallyList = Object.values(ralliesByIndex).reverse().slice(0, 15)

  const ACTION_LABELS: Record<string, string> = {
    S: 'Serwis', R: 'Przyjęcie', E: 'Rozegranie', A: 'Atak', B: 'Blok', D: 'Obrona', K: 'Kiwka', F: 'Free ball'
  }
  const QUALITY_COLORS: Record<string, string> = {
    '#': 'text-blue-400', '+': 'text-green-400', '!': 'text-yellow-400',
    '-': 'text-orange-400', '/': 'text-red-400', '*': 'text-emerald-400'
  }
  const QUALITY_LABELS: Record<string, string> = {
    '#': 'PERF', '+': 'POZ', '!': 'OVER', '-': 'NEG', '/': 'BŁĄD', '*': 'PKT'
  }

  if (!match) return <div className="p-6 text-gray-400">Ładowanie...</div>

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-4 shrink-0">
        <Link to="/mecze" className="text-gray-400 hover:text-white text-sm">← Mecze</Link>
        <div className="font-semibold text-white">
          {match.home_team?.short_name} vs {match.away_team?.short_name}
        </div>
        {currentSet && (
          <div className="text-gray-400 text-sm">Set {currentSet.set_number}</div>
        )}
        <div className="ml-auto text-xs text-gray-500 space-x-3">
          <span><kbd className="bg-gray-700 text-gray-300 px-1 rounded">TAB</kbd> nowa akcja</span>
          <span><kbd className="bg-gray-700 text-gray-300 px-1 rounded">SPACJA</kbd> play/pause</span>
          <span><kbd className="bg-gray-700 text-gray-300 px-1 rounded">ENTER</kbd> zapisz</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* YouTube player */}
        <div className="w-1/2 bg-black flex flex-col">
          {match.youtube_url ? (
            <div ref={playerContainerRef} className="w-full aspect-video" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-3">
              <div className="text-4xl">📹</div>
              <div className="text-sm">Brak nagrania YouTube</div>
              <Link to={`/mecze/${id}`} className="text-primary-400 text-sm hover:underline">Dodaj nagranie</Link>
            </div>
          )}

          {/* Time indicators */}
          {(ytStart !== null || ytEnd !== null) && (
            <div className="bg-gray-900 px-4 py-2 flex gap-6 text-sm border-t border-gray-700">
              <span className="text-gray-400">Start: <span className="text-white font-mono">{ytStart !== null ? formatTime(ytStart) : '—'}</span></span>
              <span className="text-gray-400">Koniec: <span className="text-white font-mono">{ytEnd !== null ? formatTime(ytEnd) : '—'}</span></span>
              {isRecordingTime && <span className="text-green-400 animate-pulse">● Nagrywam czas...</span>}
            </div>
          )}
        </div>

        {/* Recording panel */}
        <div className="w-1/2 flex flex-col border-l border-gray-700">
          {/* Input area */}
          <div className="p-4 border-b border-gray-700 bg-gray-900 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Kod akcji</label>
              {saved && <span className="text-green-400 text-sm">✓ Zapisano</span>}
            </div>
            <input
              ref={inputRef}
              type="text"
              className="input font-mono text-lg tracking-wider"
              placeholder="np. 2S2H / 5R+ / 6E3Q / 10A6H*"
              value={inputCode}
              onChange={e => { setInputCode(e.target.value); setError('') }}
              autoComplete="off"
              spellCheck={false}
            />

            {/* Live preview */}
            {preview && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${preview.error ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                {preview.error ? (
                  <span className="text-red-400">⚠ {preview.error}</span>
                ) : (
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Podgląd:</div>
                    <div className="text-white">{describeRally(preview)}</div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {preview.actions.map((a, i) => (
                        <span key={i} className="bg-gray-700 text-xs px-2 py-0.5 rounded font-mono text-gray-300">
                          #{a.playerNumber} {ACTION_LABELS[a.actionType] || a.actionType}
                          {a.quality && <span className={`ml-1 ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action log */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Ostatnie wymiany ({rallyIndex} łącznie)</div>
            {rallyList.length === 0 ? (
              <div className="text-center text-gray-600 text-sm py-8">
                Naciśnij TAB aby zacząć rejestrację
              </div>
            ) : (
              <div className="space-y-2">
                {rallyList.map((rally, ri) => {
                  const sortedRally = [...rally].sort((a, b) => a.action_index - b.action_index)
                  const firstAction = sortedRally[0]
                  return (
                    <div key={ri} className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-600 text-xs font-mono">#{firstAction.rally_index + 1}</span>
                        {firstAction.yt_start !== null && (
                          <button
                            onClick={() => {
                              if (playerRef.current && ytReady) {
                                playerRef.current.seekTo(firstAction.yt_start!, true)
                                playerRef.current.playVideo()
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            ▶ {formatTime(firstAction.yt_start!)}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sortedRally.map((a, ai) => (
                          <div key={ai} className="flex items-center gap-1">
                            {ai > 0 && <span className="text-gray-600">→</span>}
                            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                              <span className="text-blue-400">#{(a as any).player?.jersey_number || '?'}</span>
                              {' '}{ACTION_LABELS[a.action_type] || a.action_type}
                              {a.quality && <span className={`ml-1 font-bold ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Active players legend */}
          <div className="border-t border-gray-700 p-3 shrink-0">
            <div className="text-xs text-gray-500 mb-2 uppercase">Skład na boisku</div>
            <div className="flex flex-wrap gap-1.5">
              {lineups.map((l: any) => l.player && (
                <span key={l.id} className={`text-xs px-2 py-0.5 rounded font-mono ${l.team_side === 'home' ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'}`}>
                  #{l.player.jersey_number} {l.player.full_name.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchRecordingPage
