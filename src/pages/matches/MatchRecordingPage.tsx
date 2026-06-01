import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from 'lib/supabase'
import { parseRally, describeRally, ParsedRally } from 'lib/interpreter'
import { rotate, lineupToCourtPositions, CourtLineup, getPlayerZone } from 'lib/rotation'
import { CourtView } from 'components/ui/CourtView'
import { Action } from 'types/database'

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void }
}

function extractYTId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

const ACTION_LABELS: Record<string, string> = {
  S: 'Serwis', R: 'Przyjęcie', E: 'Rozegranie', A: 'Atak',
  B: 'Blok', D: 'Obrona', K: 'Kiwka', F: 'Free ball'
}
const QUALITY_COLORS: Record<string, string> = {
  '#': 'text-blue-400', '+': 'text-green-400', '!': 'text-yellow-400',
  '-': 'text-orange-400', '/': 'text-red-400', '*': 'text-emerald-400'
}
const QUALITY_LABELS: Record<string, string> = {
  '#': 'PERF', '+': 'POZ', '!': 'OVER', '-': 'NEG', '/': 'BŁĄD', '*': 'PKT'
}

const MatchRecordingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [match, setMatch] = useState<any>(null)
  const [allSets, setAllSets] = useState<any[]>([])
  const [currentSet, setCurrentSet] = useState<any>(null)
  const [homePlayers, setHomePlayers] = useState<any[]>([])
  const [awayPlayers, setAwayPlayers] = useState<any[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [rallyIndex, setRallyIndex] = useState(0)

  // Rotation state
  const [homeLineup, setHomeLineup] = useState<CourtLineup>({})
  const [awayLineup, setAwayLineup] = useState<CourtLineup>({})
  const [servingTeam, setServingTeam] = useState<'home' | 'away'>('home')
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)

  // Substitution modal
  const [showSubModal, setShowSubModal] = useState(false)
  const [subSide, setSubSide] = useState<'home' | 'away'>('home')
  const [subOutPlayer, setSubOutPlayer] = useState<string>('')
  const [subInPlayer, setSubInPlayer] = useState<string>('')

  // Set end modal
  const [showSetEndModal, setShowSetEndModal] = useState(false)

  // Recording state
  const [inputCode, setInputCode] = useState('')
  const [preview, setPreview] = useState<ParsedRally | null>(null)
  const [ytStart, setYtStart] = useState<number | null>(null)
  const [ytEnd, setYtEnd] = useState<number | null>(null)
  const [isRecordingTime, setIsRecordingTime] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<string>('')

  // Panel tabs
  const [rightTab, setRightTab] = useState<'rejestracja' | 'boisko' | 'log'>('rejestracja')

  // YouTube
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [ytReady, setYtReady] = useState(false)

  // Read serving team set in MatchDetailPage
  useEffect(() => {
    const saved = sessionStorage.getItem(`match_${id}_serving`)
    if (saved === 'home' || saved === 'away') setServingTeam(saved)
  }, [id])

  // Load all data
  useEffect(() => {
    const load = async () => {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id!).single()
      setMatch(matchData)

      const { data: setsData } = await supabase.from('sets').select('*').eq('match_id', id!).order('set_number')
      setAllSets(setsData || [])
      const activeSet = setsData?.find((s: any) => !s.is_finished) || setsData?.[setsData.length - 1]
      setCurrentSet(activeSet)
      if (activeSet) {
        setScoreHome(activeSet.score_home)
        setScoreAway(activeSet.score_away)
      }

      const { data: acts } = await supabase
        .from('actions').select('*, player:players(*)')
        .eq('set_id', activeSet?.id).order('rally_index').order('action_index')
      setActions((acts as any) || [])
      const maxRally = acts && acts.length > 0 ? Math.max(...acts.map((a: any) => a.rally_index)) + 1 : 0
      setRallyIndex(maxRally)

      // Load lineups
      const { data: lu } = await supabase
        .from('match_lineups').select('*, player:players(*)')
        .eq('match_id', id!)
      const homeL = (lu || []).filter((l: any) => l.team_side === 'home')
      const awayL = (lu || []).filter((l: any) => l.team_side === 'away')

      setHomePlayers((lu || []).filter((l: any) => l.team_side === 'home').map((l: any) => l.player).filter(Boolean))
      setAwayPlayers((lu || []).filter((l: any) => l.team_side === 'away').map((l: any) => l.player).filter(Boolean))

      setHomeLineup(lineupToCourtPositions(homeL.map((l: any) => ({ player_id: l.player_id, start_position: l.start_position }))))
      setAwayLineup(lineupToCourtPositions(awayL.map((l: any) => ({ player_id: l.player_id, start_position: l.start_position }))))

      // Load players from teams for substitutions
      const { data: hpFull } = await supabase.from('players').select('*').eq('team_id', matchData.home_team_id).order('jersey_number')
      const { data: apFull } = await supabase.from('players').select('*').eq('team_id', matchData.away_team_id).order('jersey_number')
      setHomePlayers(hpFull || [])
      setAwayPlayers(apFull || [])
    }
    load()
  }, [id])

  // Init YouTube
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
    if (window.YT?.Player) initPlayer()
    else {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
      window.onYouTubeIframeAPIReady = initPlayer
    }
    return () => { window.onYouTubeIframeAPIReady = () => {} }
  }, [match?.youtube_url])

  // Live preview
  useEffect(() => {
    setPreview(inputCode.trim() ? parseRally(inputCode) : null)
  }, [inputCode])

  // Handle point scored — update score, rotation, save to DB
  const handlePoint = useCallback(async (scoringTeam: 'home' | 'away') => {
    const newScoreHome = scoringTeam === 'home' ? scoreHome + 1 : scoreHome
    const newScoreAway = scoringTeam === 'away' ? scoreAway + 1 : scoreAway
    setScoreHome(newScoreHome)
    setScoreAway(newScoreAway)

    // Rotation: if scoring team was NOT serving, they rotate
    if (scoringTeam !== servingTeam) {
      if (scoringTeam === 'home') setHomeLineup(prev => rotate(prev))
      else setAwayLineup(prev => rotate(prev))
      setServingTeam(scoringTeam)
    }

    // Update score in DB
    if (currentSet) {
      await supabase.from('sets').update({
        score_home: newScoreHome,
        score_away: newScoreAway
      }).eq('id', currentSet.id)
    }

    // Check if set should end (25+ points, 2+ lead; or 15 in 5th set)
    const isSetPoint = checkSetEnd(newScoreHome, newScoreAway, allSets.length)
    if (isSetPoint) setShowSetEndModal(true)
  }, [scoreHome, scoreAway, servingTeam, currentSet, allSets.length])

  function checkSetEnd(h: number, a: number, setNum: number): boolean {
    const limit = setNum >= 5 ? 15 : 25
    return (h >= limit || a >= limit) && Math.abs(h - a) >= 2
  }

  // End set and create next
  const endSet = async (winningSide: 'home' | 'away') => {
    if (!currentSet) return
    await supabase.from('sets').update({ is_finished: true }).eq('id', currentSet.id)

    const nextSetNum = currentSet.set_number + 1
    if (nextSetNum <= 5) {
      const { data: newSet } = await supabase.from('sets').insert({
        match_id: id!, set_number: nextSetNum, score_home: 0, score_away: 0, is_finished: false
      }).select().single()
      setCurrentSet(newSet)
      setAllSets(prev => [...prev.map(s => s.id === currentSet.id ? { ...s, is_finished: true } : s), newSet])
      setScoreHome(0)
      setScoreAway(0)
      setRallyIndex(0)
      setActions([])
      // Reset lineups to starting positions
      if (winningSide === 'away') {
        setHomeLineup(prev => rotate(prev))
        setServingTeam('away')
      } else {
        setAwayLineup(prev => rotate(prev))
        setServingTeam('home')
      }
    } else {
      // Match over
      await supabase.from('matches').update({ status: 'zakończony' }).eq('id', id!)
      navigate(`/mecze/${id}/statystyki`)
    }
    setShowSetEndModal(false)
  }

  // End match manually
  const endMatch = async () => {
    if (!currentSet) return
    await supabase.from('sets').update({ is_finished: true }).eq('id', currentSet.id)
    await supabase.from('matches').update({ status: 'zakończony' }).eq('id', id!)
    navigate(`/mecze/${id}/statystyki`)
  }

  // Substitution
  const handleSubstitution = async () => {
    if (!subOutPlayer || !subInPlayer) return
    const lineup = subSide === 'home' ? homeLineup : awayLineup
    const setLineup = subSide === 'home' ? setHomeLineup : setAwayLineup

    const zone = getPlayerZone(subOutPlayer, lineup)
    if (zone === null) return

    setLineup(prev => ({ ...prev, [zone]: subInPlayer }))
    setShowSubModal(false)
    setSubOutPlayer('')
    setSubInPlayer('')
  }

  // Save rally
  const saveRally = useCallback(async (code: string, ytS: number | null, ytE: number | null) => {
    if (!currentSet || !code.trim()) return
    const parsed = parseRally(code)
    if (parsed.actions.length === 0) return

    // Build player map from both lineups
    const allLineupPlayers = [...Object.values(homeLineup), ...Object.values(awayLineup)].filter(Boolean) as string[]
    const { data: pData } = await supabase.from('players').select('id, jersey_number').in('id', allLineupPlayers)
    const playerMap: Record<number, string> = {}
    ;(pData || []).forEach((p: any) => { playerMap[p.jersey_number] = p.id })

    const rotState = scoreHome * 100 + scoreAway // encode score as rotation state reference

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
      rotation_state: rotState,
    }))

    const { error } = await supabase.from('actions').insert(toInsert)
    if (!error) {
      setRallyIndex(r => r + 1)
      setActions(prev => [...prev, ...(toInsert as any)])
      setSaved(true)
      setLastSaved(code)
      setTimeout(() => setSaved(false), 2000)
    }
  }, [currentSet, homeLineup, awayLineup, rallyIndex, scoreHome, scoreAway])

  // Keyboard handler
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (showSubModal || showSetEndModal) return

    if (e.key === 'Tab') {
      e.preventDefault()
      inputRef.current?.focus()
      setInputCode('')
      setYtStart(null); setYtEnd(null); setIsRecordingTime(false)
      if (playerRef.current && ytReady) {
        const t = playerRef.current.getCurrentTime?.()
        if (t !== undefined) setYtStart(t)
      }
    }

    if (e.key === ' ' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      if (!playerRef.current || !ytReady) return
      const state = playerRef.current.getPlayerState?.()
      if (state === 1) {
        playerRef.current.pauseVideo()
        const t = playerRef.current.getCurrentTime?.()
        if (!ytStart) setYtStart(t); else setYtEnd(t)
      } else {
        playerRef.current.playVideo()
        setIsRecordingTime(true)
      }
    }

    if (e.key === 'Enter' && document.activeElement === inputRef.current) {
      e.preventDefault()
      if (!inputCode.trim()) return
      let endTime = ytEnd
      if (playerRef.current && ytReady) {
        endTime = playerRef.current.getCurrentTime?.() || null
        setYtEnd(endTime)
        playerRef.current.pauseVideo?.()
      }
      await saveRally(inputCode, ytStart, endTime)
      setInputCode('')
      setYtStart(null); setYtEnd(null); setIsRecordingTime(false)
    }
  }, [inputCode, ytReady, ytStart, ytEnd, saveRally, showSubModal, showSetEndModal])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const ralliesByIndex: Record<number, Action[]> = {}
  actions.forEach(a => {
    if (!ralliesByIndex[a.rally_index]) ralliesByIndex[a.rally_index] = []
    ralliesByIndex[a.rally_index].push(a)
  })
  const rallyList = Object.values(ralliesByIndex).reverse().slice(0, 20)

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!match) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 flex flex-col items-center gap-3">
        <div className="text-3xl animate-spin">🏐</div><div>Ładowanie...</div>
      </div>
    </div>
  )

  const homeLineupPlayers = Object.values(homeLineup).filter(Boolean) as string[]
  const awayLineupPlayers = Object.values(awayLineup).filter(Boolean) as string[]

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="bg-gray-900 border-b border-gray-700 px-3 py-1.5 flex items-center gap-3 shrink-0">
        <Link to="/mecze" className="text-gray-500 hover:text-white text-xs">← Mecze</Link>

        {/* Scoreboard */}
        <div className="flex items-center gap-2 mx-auto">
          {/* Home team */}
          <div className="text-right">
            <div className="text-xs text-blue-400 font-medium">{match.home_team?.short_name}</div>
          </div>
          {/* Home score */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScoreHome(s => Math.max(0, s - 1))}
              className="w-6 h-6 rounded bg-gray-800 hover:bg-red-900 border border-gray-700 text-gray-400 hover:text-red-300 text-xs font-bold transition-colors"
              title="Odejmij punkt"
            >−</button>
            <button
              onClick={() => handlePoint('home')}
              className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-blue-900 border border-gray-600 hover:border-blue-500 text-white font-bold text-xl transition-colors"
              title="Dodaj punkt gospodarzom"
            >{scoreHome}</button>
            <button
              onClick={() => handlePoint('home')}
              className="w-6 h-6 rounded bg-gray-800 hover:bg-blue-900 border border-gray-700 text-gray-400 hover:text-blue-300 text-xs font-bold transition-colors"
              title="Dodaj punkt"
            >+</button>
          </div>
          <div className="text-gray-600 font-bold">:</div>
          {/* Away score */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScoreAway(s => Math.max(0, s - 1))}
              className="w-6 h-6 rounded bg-gray-800 hover:bg-red-900 border border-gray-700 text-gray-400 hover:text-red-300 text-xs font-bold transition-colors"
              title="Odejmij punkt"
            >−</button>
            <button
              onClick={() => handlePoint('away')}
              className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-orange-900 border border-gray-600 hover:border-orange-500 text-white font-bold text-xl transition-colors"
              title="Dodaj punkt gościom"
            >{scoreAway}</button>
            <button
              onClick={() => handlePoint('away')}
              className="w-6 h-6 rounded bg-gray-800 hover:bg-orange-900 border border-gray-700 text-gray-400 hover:text-orange-300 text-xs font-bold transition-colors"
              title="Dodaj punkt"
            >+</button>
          </div>
          <div className="text-left">
            <div className="text-xs text-orange-400 font-medium">{match.away_team?.short_name}</div>
          </div>

          {/* Set scores */}
          <div className="flex gap-1 ml-2">
            {allSets.filter(s => s.is_finished).map(s => (
              <div key={s.id} className="text-xs text-gray-500 bg-gray-800 rounded px-1.5 py-0.5 font-mono">
                {s.score_home}:{s.score_away}
              </div>
            ))}
            <div className="text-xs text-white bg-gray-700 rounded px-1.5 py-0.5 font-semibold">
              S{currentSet?.set_number}
            </div>
          </div>

          {/* Serving indicator */}
          <div className={`text-xs px-2 py-0.5 rounded-full font-medium ml-1 ${servingTeam === 'home' ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
            🏐 {servingTeam === 'home' ? match.home_team?.short_name : match.away_team?.short_name}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { setSubSide('home'); setShowSubModal(true) }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded transition-colors"
          >↔ Zmiana</button>
          <button
            onClick={() => setShowSetEndModal(true)}
            className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-300 px-2 py-1 rounded transition-colors"
          >Koniec seta</button>
          <Link to={`/mecze/${id}/statystyki`} className="text-xs text-primary-400 hover:text-primary-300">📊 Statystyki</Link>
          <Link to="/pomoc" target="_blank" className="text-xs text-gray-500 hover:text-gray-300">📖 Pomoc</Link>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: YouTube */}
        <div className="w-1/2 bg-black flex flex-col shrink-0">
          {match.youtube_url ? (
            <div ref={playerContainerRef} className="w-full aspect-video" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 flex-col gap-2">
              <div className="text-3xl">📹</div>
              <div className="text-sm">Brak nagrania YouTube</div>
            </div>
          )}
          {(ytStart !== null || ytEnd !== null) && (
            <div className="bg-gray-900 px-4 py-1.5 flex gap-6 text-xs border-t border-gray-700">
              <span className="text-gray-400">Start: <span className="text-white font-mono">{ytStart !== null ? formatTime(ytStart) : '—'}</span></span>
              <span className="text-gray-400">Koniec: <span className="text-white font-mono">{ytEnd !== null ? formatTime(ytEnd) : '—'}</span></span>
              {isRecordingTime && <span className="text-green-400 animate-pulse">● REC</span>}
            </div>
          )}

          {/* Keyboard hints */}
          <div className="bg-gray-900 border-t border-gray-700 px-4 py-1.5 flex gap-4 text-xs text-gray-600">
            <span><kbd className="bg-gray-800 text-gray-400 px-1 rounded text-xs">TAB</kbd> nowa akcja</span>
            <span><kbd className="bg-gray-800 text-gray-400 px-1 rounded text-xs">SPACJA</kbd> play/pause</span>
            <span><kbd className="bg-gray-800 text-gray-400 px-1 rounded text-xs">ENTER</kbd> zapisz</span>
            <span className="ml-auto">Kliknij wynik aby dodać punkt</span>
          </div>
        </div>

        {/* RIGHT: Tabs panel */}
        <div className="w-1/2 flex flex-col border-l border-gray-700 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-700 bg-gray-900 shrink-0">
            {([['rejestracja', '📝 Rejestracja'], ['boisko', '🏐 Boisko'], ['log', '📋 Log']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${rightTab === t ? 'bg-gray-800 text-white border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
              >{label}</button>
            ))}
          </div>

          {/* TAB: REJESTRACJA */}
          {rightTab === 'rejestracja' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-gray-900 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Kod akcji</label>
                  {saved && <span className="text-green-400 text-sm animate-pulse">✓ Zapisano</span>}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="input font-mono text-base tracking-wider"
                  placeholder="np. 2S2H / 5R+ / 6E3Q / 10A6H*"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                {preview && (
                  <div className={`mt-2 p-2.5 rounded-lg text-sm ${preview.error ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                    {preview.error ? (
                      <span className="text-red-400 text-xs">⚠ {preview.error}</span>
                    ) : (
                      <div>
                        <div className="text-gray-400 text-xs mb-1">Podgląd:</div>
                        <div className="text-white text-xs leading-relaxed">{describeRally(preview)}</div>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {preview.actions.map((a, i) => (
                            <span key={i} className="bg-gray-700 text-xs px-1.5 py-0.5 rounded font-mono text-gray-300">
                              #{a.playerNumber} {ACTION_LABELS[a.actionType]}
                              {a.quality && <span className={`ml-1 ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {lastSaved && !saved && (
                  <div className="mt-1 text-xs text-gray-600 font-mono truncate">Ostatnie: {lastSaved}</div>
                )}
              </div>

              {/* Rally log */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Wymiany w secie — {rallyIndex} łącznie</div>
                {rallyList.length === 0 ? (
                  <div className="text-center text-gray-700 text-sm py-8">Naciśnij TAB aby zacząć</div>
                ) : (
                  <div className="space-y-1.5">
                    {rallyList.map((rally, ri) => {
                      const sorted = [...rally].sort((a, b) => a.action_index - b.action_index)
                      const first = sorted[0]
                      return (
                        <div key={ri} className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-gray-700 font-mono">#{first.rally_index + 1}</span>
                            {first.yt_start !== null && (
                              <button
                                onClick={() => { if (playerRef.current && ytReady) { playerRef.current.seekTo(first.yt_start!, true); playerRef.current.playVideo() } }}
                                className="text-red-400 hover:text-red-300 flex items-center gap-1"
                              >▶ {formatTime(first.yt_start!)}</button>
                            )}
                            <span className="ml-auto text-gray-700">
                              {(first as any).rotation_state !== null ? `${Math.floor((first as any).rotation_state / 100)}:${(first as any).rotation_state % 100}` : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sorted.map((a, ai) => (
                              <div key={ai} className="flex items-center gap-0.5">
                                {ai > 0 && <span className="text-gray-700">→</span>}
                                <span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-mono">
                                  <span className="text-blue-400">#{(a as any).player?.jersey_number || '?'}</span>
                                  {' '}{ACTION_LABELS[a.action_type]}
                                  {a.quality && <span className={`ml-0.5 font-bold ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
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
            </div>
          )}

          {/* TAB: BOISKO */}
          {rightTab === 'boisko' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-6">
                <CourtView
                  lineup={homeLineup}
                  players={homePlayers}
                  teamName={match.home_team?.name}
                  teamSide="home"
                  isServing={servingTeam === 'home'}
                  compact
                />
                <CourtView
                  lineup={awayLineup}
                  players={awayPlayers}
                  teamName={match.away_team?.name}
                  teamSide="away"
                  isServing={servingTeam === 'away'}
                  compact
                />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setSubSide('home'); setShowSubModal(true) }}
                  className="btn-secondary text-sm flex-1"
                >↔ Zmiana {match.home_team?.short_name}</button>
                <button
                  onClick={() => { setSubSide('away'); setShowSubModal(true) }}
                  className="btn-secondary text-sm flex-1"
                >↔ Zmiana {match.away_team?.short_name}</button>
              </div>
            </div>
          )}

          {/* TAB: LOG */}
          {rightTab === 'log' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs text-gray-600 mb-3 uppercase">Wszystkie akcje w secie</div>
              <div className="space-y-1">
                {[...actions].reverse().map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-800">
                    <span className="font-mono text-gray-600 w-6 text-right">{a.rally_index + 1}</span>
                    <span className="font-mono text-blue-400 w-6">#{(a as any).player?.jersey_number || '?'}</span>
                    <span className="text-gray-300 w-20">{ACTION_LABELS[a.action_type]}</span>
                    {a.quality && <span className={QUALITY_COLORS[a.quality]}>{QUALITY_LABELS[a.quality]}</span>}
                    {a.zone_from && <span className="text-gray-600">S{a.zone_from}</span>}
                    {a.zone_to && <span className="text-gray-600">→S{a.zone_to}</span>}
                    {a.yt_start !== null && (
                      <button
                        onClick={() => { if (playerRef.current && ytReady) { playerRef.current.seekTo(a.yt_start!, true); playerRef.current.playVideo() } }}
                        className="ml-auto text-red-400 hover:text-red-300"
                      >▶ {formatTime(a.yt_start!)}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SUBSTITUTION MODAL ── */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-4">
              Zmiana zawodnika — {subSide === 'home' ? match.home_team?.name : match.away_team?.name}
            </h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSubSide('home')} className={`flex-1 py-1.5 rounded text-sm ${subSide === 'home' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {match.home_team?.short_name}
              </button>
              <button onClick={() => setSubSide('away')} className={`flex-1 py-1.5 rounded text-sm ${subSide === 'away' ? 'bg-orange-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {match.away_team?.short_name}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Schodzi z boiska</label>
                <select className="input" value={subOutPlayer} onChange={e => setSubOutPlayer(e.target.value)}>
                  <option value="">Wybierz zawodnika</option>
                  {(subSide === 'home' ? homeLineupPlayers : awayLineupPlayers).map(pid => {
                    const p = (subSide === 'home' ? homePlayers : awayPlayers).find((pl: any) => pl.id === pid)
                    return p ? <option key={pid} value={pid}>#{p.jersey_number} {p.full_name}</option> : null
                  })}
                </select>
              </div>
              <div>
                <label className="label">Wchodzi na boisko</label>
                <select className="input" value={subInPlayer} onChange={e => setSubInPlayer(e.target.value)}>
                  <option value="">Wybierz zawodnika</option>
                  {(subSide === 'home' ? homePlayers : awayPlayers)
                    .filter((p: any) => !(subSide === 'home' ? homeLineupPlayers : awayLineupPlayers).includes(p.id))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>#{p.jersey_number} {p.full_name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSubstitution} disabled={!subOutPlayer || !subInPlayer} className="btn-primary flex-1">
                Zatwierdź zmianę
              </button>
              <button onClick={() => { setShowSubModal(false); setSubOutPlayer(''); setSubInPlayer('') }} className="btn-secondary">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET END MODAL ── */}
      {showSetEndModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">🏆</div>
            <h2 className="text-xl font-bold text-white mb-2">Koniec seta {currentSet?.set_number}</h2>
            <div className="text-3xl font-mono font-bold text-white mb-4">{scoreHome} : {scoreAway}</div>
            <div className="text-gray-400 text-sm mb-6">
              Kto wygrał tego seta?
            </div>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => endSet('home')}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {match.home_team?.name}
              </button>
              <button
                onClick={() => endSet('away')}
                className="flex-1 bg-orange-700 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                {match.away_team?.name}
              </button>
            </div>
            <button onClick={endMatch} className="w-full btn-danger text-sm py-2">
              Zakończ cały mecz
            </button>
            <button onClick={() => setShowSetEndModal(false)} className="mt-2 text-gray-500 text-sm hover:text-gray-300 w-full py-1">
              Wróć do rejestracji
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchRecordingPage
