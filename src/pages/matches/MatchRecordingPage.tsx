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
  const [rightTab, setRightTab] = useState<'boisko' | 'log' | 'zawodnicy'>('log')

  // YouTube
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [ytReady, setYtReady] = useState(false)

  // serving team is loaded from sets table in the main load effect below

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
        // Serwujący z bazy
        if (activeSet.serving_team) {
          setServingTeam(activeSet.serving_team)
        } else {
          const saved = sessionStorage.getItem(`match_${id}_serving`)
          if (saved === 'home' || saved === 'away') setServingTeam(saved)
        }
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

      // Wczytaj aktualny lineup z bazy — nadpisuje pozycje startowe gdy set jest w toku
      if (activeSet?.home_lineup && Object.keys(activeSet.home_lineup).length > 0) {
        const hl: Record<number, string> = {}
        Object.entries(activeSet.home_lineup).forEach(([k, v]) => { hl[parseInt(k)] = v as string })
        setHomeLineup(hl)
      }
      if (activeSet?.away_lineup && Object.keys(activeSet.away_lineup).length > 0) {
        const al: Record<number, string> = {}
        Object.entries(activeSet.away_lineup).forEach(([k, v]) => { al[parseInt(k)] = v as string })
        setAwayLineup(al)
      }

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

  /**
   * Logika punktowania wg VolleyStation PRO "match flow":
   * Ostatnia akcja wymiany z jakością kończącą determinuje kto zdobywa punkt.
   *
   * Akcja | Jakość | Punkt dla
   * S     | # *    | Serwujący (as)
   * S     | / =    | Przyjmujący (błąd serwisu)
   * R     | /      | Serwujący (overpass/błąd przyjęcia)
   * A K   | # *    | Atakujący (drużyna wykonująca)
   * A K   | /      | Broniący (błąd ataku lub blok punkt)
   * B     | *      | Blokujący
   * B     | /      | Atakujący (błąd bloku)
   * Inne jakości (+, !, -) = gra trwa, brak punktu
   */
  const determineScoringTeam = useCallback((parsed: ParsedRally): 'home' | 'away' | null => {
    if (!parsed.actions || parsed.actions.length === 0) return null

    // Znajdź ostatnią akcję która kończy wymianę
    const terminalActions = parsed.actions.filter(a => {
      const q = a.quality
      if (!q) return false
      const type = a.actionType
      // Akcje które mogą kończyć wymianę
      if (type === 'S') return q === '#' || q === '*' || q === '/'
      if (type === 'R') return q === '/'
      if (type === 'A' || type === 'K') return q === '#' || q === '*' || q === '/'
      if (type === 'B') return q === '*' || q === '/'
      return false
    })

    if (terminalActions.length === 0) return null

    // Bierzemy ostatnią akcję kończącą
    const last = terminalActions[terminalActions.length - 1]
    const type = last.actionType
    const q = last.quality
    const executorTeam = (last as any).teamPrefix === 'away' ? 'away' : 'home'
    const opponentTeam = executorTeam === 'home' ? 'away' : 'home'

    if (type === 'S') {
      if (q === '#' || q === '*') return executorTeam  // as = punkt dla serwującego
      if (q === '/') return opponentTeam  // błąd = punkt dla przeciwnika
    }
    if (type === 'R') {
      if (q === '/') return opponentTeam  // overpass/błąd przyjęcia = punkt dla serwującego (czyli opponent względem przyjmującego)
    }
    if (type === 'A' || type === 'K') {
      if (q === '#' || q === '*') return executorTeam  // kill = punkt dla atakującego
      if (q === '/') return opponentTeam               // błąd/blok punkt = punkt dla broniących
    }
    if (type === 'B') {
      if (q === '*') return executorTeam  // blok punkt = punkt dla blokującego
      if (q === '/') return opponentTeam  // błąd bloku = punkt dla atakującego
    }

    return null
  }, [])

  // Zapisz aktualny lineup do bazy
  const saveLineupToDB = useCallback(async (hl: Record<number, string|null>, al: Record<number, string|null>) => {
    if (!currentSet) return
    await supabase.from('sets').update({
      home_lineup: hl,
      away_lineup: al,
    }).eq('id', currentSet.id)
  }, [currentSet])

  // Handle point scored — update score, rotation, save to DB
  const handlePoint = useCallback(async (scoringTeam: 'home' | 'away') => {
    const newScoreHome = scoringTeam === 'home' ? scoreHome + 1 : scoreHome
    const newScoreAway = scoringTeam === 'away' ? scoreAway + 1 : scoreAway
    setScoreHome(newScoreHome)
    setScoreAway(newScoreAway)

    // Rotation: if scoring team was NOT serving, they rotate
    const newServingTeam = scoringTeam !== servingTeam ? scoringTeam : servingTeam
    if (scoringTeam !== servingTeam) {
      if (scoringTeam === 'home') setHomeLineup(prev => rotate(prev))
      else setAwayLineup(prev => rotate(prev))
      setServingTeam(scoringTeam)
    }

    // Update score, serving team AND current lineup in DB
    if (currentSet) {
      // Oblicz nowe lineup po rotacji (musimy użyć rotate() lokalnie bo setHomeLineup jest async)
      const newHomeLineup = (scoringTeam === 'home' && scoringTeam !== servingTeam)
        ? (() => {
            const ROTATE_TO: Record<number,number> = {1:6,2:1,3:2,4:3,5:4,6:5}
            const next: Record<number, string|null> = {}
            for(let p=1;p<=6;p++) next[ROTATE_TO[p]] = homeLineup[p] ?? null
            return next
          })()
        : homeLineup
      const newAwayLineup = (scoringTeam === 'away' && scoringTeam !== servingTeam)
        ? (() => {
            const ROTATE_TO: Record<number,number> = {1:6,2:1,3:2,4:3,5:4,6:5}
            const next: Record<number, string|null> = {}
            for(let p=1;p<=6;p++) next[ROTATE_TO[p]] = awayLineup[p] ?? null
            return next
          })()
        : awayLineup
      await supabase.from('sets').update({
        score_home: newScoreHome,
        score_away: newScoreAway,
        serving_team: newServingTeam,
        home_lineup: newHomeLineup,
        away_lineup: newAwayLineup,
      }).eq('id', currentSet.id)
    }

    // Check if set should end (25+ points, 2+ lead; or 15 in 5th set)
    const isSetPoint = checkSetEnd(newScoreHome, newScoreAway, allSets.length)
    if (isSetPoint) setShowSetEndModal(true)
  }, [scoreHome, scoreAway, servingTeam, currentSet, allSets.length])

  // useRef do uniknięcia stale closure w saveRally
  const handlePointRef = React.useRef(handlePoint)
  React.useEffect(() => { handlePointRef.current = handlePoint }, [handlePoint])

  // Odejmij punkt z zapisem do bazy
  const handleMinus = useCallback(async (team: 'home' | 'away') => {
    const newScoreHome = team === 'home' ? Math.max(0, scoreHome - 1) : scoreHome
    const newScoreAway = team === 'away' ? Math.max(0, scoreAway - 1) : scoreAway
    if (newScoreHome === scoreHome && newScoreAway === scoreAway) return
    setScoreHome(newScoreHome)
    setScoreAway(newScoreAway)
    if (currentSet) {
      await supabase.from('sets').update({
        score_home: newScoreHome,
        score_away: newScoreAway,
      }).eq('id', currentSet.id)
    }
  }, [scoreHome, scoreAway, currentSet])

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
    const zone = getPlayerZone(subOutPlayer, lineup)
    if (zone === null) return
    const newLineup = { ...lineup, [zone]: subInPlayer }
    if (subSide === 'home') {
      setHomeLineup(newLineup)
      await saveLineupToDB(newLineup, awayLineup)
    } else {
      setAwayLineup(newLineup)
      await saveLineupToDB(homeLineup, newLineup)
    }
    setShowSubModal(false)
    setSubOutPlayer('')
    setSubInPlayer('')
  }

  // Save rally
  const saveRally = useCallback(async (code: string, ytS: number | null, ytE: number | null) => {
    if (!currentSet || !code.trim()) return
    const parsed = parseRally(code)
    if (parsed.actions.length === 0) return

    // Build SEPARATE player maps per team to avoid collision when both teams have same jersey number
    const homePlayerIds = Object.values(homeLineup).filter(Boolean) as string[]
    const awayPlayerIds = Object.values(awayLineup).filter(Boolean) as string[]
    const allLineupPlayers = [...homePlayerIds, ...awayPlayerIds]

    const { data: pData } = await supabase.from('players').select('id, jersey_number, team_id').in('id', allLineupPlayers)

    // Separate maps: homeMap[11] = id of home #11, awayMap[11] = id of away #11
    const homeMap: Record<number, string> = {}
    const awayMap: Record<number, string> = {}
    const homeSet = new Set(homePlayerIds)
    const awaySet = new Set(awayPlayerIds)
    ;(pData || []).forEach((p: any) => {
      if (homeSet.has(p.id)) homeMap[p.jersey_number] = p.id
      if (awaySet.has(p.id)) awayMap[p.jersey_number] = p.id
    })

    // Resolve player: rozróżnia zawodników gdy obie drużyny mają ten sam numer
    // Prefix h/a w kodzie (np. h11 lub a11) wymusze konkretną drużynę
    const resolvePlayer = (num: number, teamPrefix?: string | null): string | null => {
      const inHome = homeMap[num]
      const inAway = awayMap[num]
      // Jawny prefix — użyj go bezwarunkowo
      if (teamPrefix === 'home') return inHome || null
      if (teamPrefix === 'away') return inAway || null
      // Brak prefixu — jeśli tylko jedna drużyna ma ten numer
      if (inHome && !inAway) return inHome
      if (inAway && !inHome) return inAway
      // Kolizja — obie drużyny mają ten numer, brak prefixu
      if (inHome && inAway) {
        console.warn(`Numer #${num} istnieje w obu drużynach. Użyj h${num} (gospodarz) lub a${num} (gość) aby ujednoznacznić.`)
        return inHome // domyślnie gospodarz
      }
      return null
    }

    const rotState = scoreHome * 100 + scoreAway // encode score as rotation state reference

    const toInsert = parsed.actions.map((a, i) => ({
      set_id: currentSet.id,
      player_id: resolvePlayer(a.playerNumber, (a as any).teamPrefix),
      raw_code: a.rawCode,
      action_type: a.actionType,
      quality: a.quality,
      zone_from: a.zoneFrom,
      zone_to: a.zoneTo,
      technique: a.technique,
      result: a.result,
      yt_start: ytS,  // każda akcja dostaje timestamp startu wymiany
      yt_end: ytE,      // każda akcja dostaje timestamp końca wymiany
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

      // Automatyczny punkt i rotacja wg logiki VolleyStation PRO
      const scoringTeam = determineScoringTeam(parsed)
      if (scoringTeam !== null) {
        // Użyj ref żeby zawsze mieć aktualną wersję handlePoint (uniknięcie stale closure)
        await handlePointRef.current(scoringTeam)
      }
    }
  }, [currentSet, homeLineup, awayLineup, rallyIndex, scoreHome, scoreAway, determineScoringTeam, handlePoint])


  // Oznacz timestamp startowy

  const markStart = useCallback(() => {
    if (!playerRef.current || !ytReady) return
    const t = playerRef.current.getCurrentTime?.()
    if (t !== undefined && t !== null) {
      setYtStart(t)
      setIsRecordingTime(true)
    }
  }, [ytReady])

  // Oznacz timestamp końcowy
  const markEnd = useCallback(() => {
    if (!playerRef.current || !ytReady) return
    const t = playerRef.current.getCurrentTime?.()
    if (t !== undefined && t !== null) {
      setYtEnd(t)
      setIsRecordingTime(false)
    }
  }, [ytReady])

  // Usuń ostatnią wymianę — tylko ostatnia może być usunięta (ochrona rotacji)
  const deleteRally = useCallback(async (rallyIdx: number) => {
    // Sprawdź czy to jest ostatnia wymiana
    const maxRally = actions.length > 0 ? Math.max(...actions.map(a => a.rally_index)) : -1
    if (rallyIdx !== maxRally) {
      alert('Można usunąć tylko ostatnią zarejestrowaną wymianę aby zachować poprawność rotacji.')
      return
    }
    const toDelete = actions.filter(a => a.rally_index === rallyIdx).map(a => a.id)
    if (toDelete.length === 0) return
    await supabase.from('actions').delete().in('id', toDelete)
    setActions(prev => prev.filter(a => a.rally_index !== rallyIdx))
    setRallyIndex(prev => Math.max(0, prev - 1))
  }, [actions])

  // Keyboard handler
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    if (showSubModal || showSetEndModal) return

    // TAB — nowa akcja, focus na pole kodu
    if (e.key === 'Tab') {
      e.preventDefault()
      inputRef.current?.focus()
      setInputCode('')
    }

    // SPACJA — play/pause (tylko gdy focus NIE jest na polu kodu)
    if (e.key === ' ' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      if (!playerRef.current || !ytReady) return
      const state = playerRef.current.getPlayerState?.()
      if (state === 1) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    }

    // STRZAŁKA LEWO — cofnij wideo o 5 sekund
    if (e.key === 'ArrowLeft' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      if (!playerRef.current || !ytReady) return
      const t = playerRef.current.getCurrentTime?.() || 0
      playerRef.current.seekTo(Math.max(0, t - 5), true)
    }

    // STRZAŁKA PRAWO — przewiń wideo o 5 sekund
    if (e.key === 'ArrowRight' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      if (!playerRef.current || !ytReady) return
      const t = playerRef.current.getCurrentTime?.() || 0
      playerRef.current.seekTo(t + 5, true)
    }

    // [ — oznacz Start timestamp
    if (e.key === '[' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      markStart()
    }

    // ] — oznacz Stop timestamp
    if (e.key === ']' && document.activeElement !== inputRef.current) {
      e.preventDefault()
      markEnd()
    }

    // ENTER — zapisz wymianę
    if (e.key === 'Enter' && document.activeElement === inputRef.current) {
      e.preventDefault()
      if (!inputCode.trim()) return
      await saveRally(inputCode, ytStart, ytEnd)
      setInputCode('')
      setYtStart(null); setYtEnd(null); setIsRecordingTime(false)
    }
  }, [inputCode, ytReady, ytStart, ytEnd, saveRally, showSubModal, showSetEndModal, markStart, markEnd])

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

  // Zawodnicy na boisku (pozycje 1-6) — libero (pozycja 0) celowo pominięty
  // żeby mógł się pojawiać w obu dropdownach zmiany
  const homeLineupPlayers = Object.entries(homeLineup)
    .filter(([pos]) => parseInt(pos) >= 1)
    .map(([, id]) => id).filter(Boolean) as string[]
  const awayLineupPlayers = Object.entries(awayLineup)
    .filter(([pos]) => parseInt(pos) >= 1)
    .map(([, id]) => id).filter(Boolean) as string[]

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
              onClick={() => handleMinus('home')}
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
              onClick={() => handleMinus('away')}
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
            onClick={async () => {
              const newServing = servingTeam === 'home' ? 'away' : 'home'
              setServingTeam(newServing)
              if (currentSet) {
                await supabase.from('sets').update({ serving_team: newServing }).eq('id', currentSet.id)
              }
            }}
            className="text-xs bg-gray-800 hover:bg-yellow-900 text-gray-400 hover:text-yellow-300 px-2 py-1 rounded transition-colors"
            title="Zmień kto serwuje"
          >🔄 Serwis</button>
          <button
            onClick={() => setShowSetEndModal(true)}
            className="text-xs bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-300 px-2 py-1 rounded transition-colors"
          >Koniec seta</button>
          <Link to={`/mecze/${id}/statystyki`} className="text-xs text-primary-400 hover:text-primary-300">📊 Statystyki</Link>
          <Link to="/pomoc" target="_blank" className="text-xs text-gray-500 hover:text-gray-300">📖 Pomoc</Link>
        </div>
      </div>

      {/* ── MAIN CONTENT — nowy układ: wideo 55%, panel 45% ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: YouTube + timestamp controls — pełna wysokość */}
        <div className="flex flex-col bg-black border-r border-gray-800" style={{ width: '55%' }}>
          {/* Wideo — flex-1 żeby zajmowało całą dostępną przestrzeń */}
          <div className="flex-1 relative">
            {match.youtube_url ? (
              <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 flex-col gap-2">
                <div className="text-4xl">📹</div>
                <div className="text-sm">Brak nagrania YouTube</div>
                <Link to={`/mecze/${id}/edytuj`} className="text-primary-400 text-xs hover:underline">Dodaj nagranie →</Link>
              </div>
            )}
          </div>

          {/* Timestamp bar — na dole pod wideo */}
          <div className="bg-gray-900 border-t border-gray-700 px-3 py-2 shrink-0">
            <div className="flex items-center gap-2 mb-1.5">
              {/* Start */}
              <button onClick={markStart} disabled={!ytReady}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ytStart !== null ? 'bg-green-800 text-green-200 border border-green-600' : 'bg-gray-800 hover:bg-green-900 text-gray-300 hover:text-green-300 border border-gray-600'
                } disabled:opacity-40`}
                title="[ lub kliknij"
              >
                <span>⏱</span><span>Start</span>
                {ytStart !== null && <span className="font-mono text-green-300">{formatTime(ytStart)}</span>}
              </button>

              {/* Stop */}
              <button onClick={markEnd} disabled={!ytReady || ytStart === null}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  ytEnd !== null ? 'bg-red-900 text-red-200 border border-red-700' : 'bg-gray-800 hover:bg-red-900 text-gray-300 hover:text-red-300 border border-gray-600'
                } disabled:opacity-40`}
                title="] lub kliknij"
              >
                <span>⏹</span><span>Stop</span>
                {ytEnd !== null && <span className="font-mono text-red-300">{formatTime(ytEnd)}</span>}
              </button>

              {(ytStart !== null || ytEnd !== null) && (
                <button onClick={() => { setYtStart(null); setYtEnd(null); setIsRecordingTime(false) }}
                  className="text-gray-600 hover:text-red-400 text-xs px-2 py-1.5 rounded hover:bg-gray-800"
                >✕</button>
              )}
              {isRecordingTime && ytStart !== null && ytEnd === null && (
                <span className="text-green-400 text-xs animate-pulse">● nagrywam...</span>
              )}
            </div>

            {/* Skróty klawiszowe */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">TAB</kbd> nowa akcja</span>
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">SPACJA</kbd> play/pause</span>
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">← →</kbd> ±5s</span>
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">[</kbd> start ts</span>
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">]</kbd> stop ts</span>
              <span><kbd className="bg-gray-800 text-gray-500 px-1 rounded text-xs">ENTER</kbd> zapisz</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Kod akcji (zawsze widoczny) + zakładki ── */}
        <div className="flex flex-col border-l border-gray-700 overflow-hidden" style={{ width: '45%' }}>

          {/* POLE KODU — zawsze widoczne na górze */}
          <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kod akcji</label>
              {saved && <span className="text-green-400 text-xs animate-pulse font-semibold">✓ Zapisano</span>}
            </div>
            <input
              ref={inputRef}
              type="text"
              className="input font-mono text-base tracking-wider"
              placeholder="np. 8S6F- / a13R+ / a7A4H*"
              value={inputCode}
              onChange={e => setInputCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {preview && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs ${preview.error ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                {preview.error ? (
                  <span className="text-red-400">⚠ {preview.error}</span>
                ) : (
                  <div>
                    <div className="text-white leading-relaxed mb-1.5">{describeRally(preview)}</div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {preview.actions.map((a, i) => (
                        <span key={i} className="bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-300">
                          #{a.playerNumber} {ACTION_LABELS[a.actionType]}
                          {a.quality && <span className={`ml-1 ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                        </span>
                      ))}
                      {(() => {
                        const scoring = determineScoringTeam(preview)
                        if (!scoring) return null
                        const teamName = scoring === 'home' ? match?.home_team?.short_name : match?.away_team?.short_name
                        const color = scoring === 'home' ? 'bg-blue-900 text-blue-300 border-blue-700' : 'bg-orange-900 text-orange-300 border-orange-700'
                        return <span className={`ml-auto text-xs px-2 py-0.5 rounded border font-semibold ${color}`}>🏆 → {teamName}</span>
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
            {lastSaved && !saved && (
              <div className="mt-1 text-xs text-gray-700 font-mono truncate">↩ {lastSaved}</div>
            )}
          </div>

          {/* ZAKŁADKI — Boisko / Log / Składy */}
          <div className="flex border-b border-gray-700 bg-gray-900 shrink-0">
            {([['boisko', '🏐 Boisko'], ['log', '📋 Log'], ['zawodnicy', '👥 Składy']] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setRightTab(t as any)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${rightTab === t ? 'bg-gray-800 text-white border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
              >{label}</button>
            ))}
          </div>

          {/* Log wymian — zawsze widoczny pod polem kodu gdy aktywna zakładka Boisko lub Log */}
          {(rightTab === 'boisko' || rightTab === 'log') && rightTab === 'log' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Wymiany w secie — {rallyIndex} łącznie</div>
              {rallyList.length === 0 ? (
                <div className="text-center text-gray-700 text-sm py-8">Brak wymian — wpisz kod i naciśnij ENTER</div>
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
                              className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs"
                            >▶ {formatTime(first.yt_start!)}</button>
                          )}
                          <button
                            onClick={() => { if (window.confirm(`Usunąć wymianę #${first.rally_index + 1}?`)) deleteRally(first.rally_index) }}
                            className="ml-auto text-gray-700 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-gray-800 text-xs"
                            title="Usuń (tylko ostatnia)"
                          >🗑</button>
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
          )}

          {/* TAB: BOISKO + LOG */}
          {rightTab === 'boisko' && (
            <div className="flex-1 overflow-y-auto">
              {/* Boisko */}
              <div className="p-3 border-b border-gray-800">
                <div className="grid grid-cols-2 gap-4 mb-3">
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

                {/* Zmiana zawodników */}
                <div className="flex gap-2 mb-3">
                  <button onClick={() => { setSubSide('home'); setShowSubModal(true) }}
                    className="btn-secondary text-xs flex-1 py-1.5"
                  >↔ {match.home_team?.short_name}</button>
                  <button onClick={() => { setSubSide('away'); setShowSubModal(true) }}
                    className="btn-secondary text-xs flex-1 py-1.5"
                  >↔ {match.away_team?.short_name}</button>
                </div>

                {/* Ręczna korekta rotacji */}
                <div className="bg-gray-900 rounded-lg p-2.5 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                    <span>🔧</span>
                    <span className="uppercase tracking-wider">Ręczna korekta rotacji</span>
                    <span className="text-gray-700">— użyj gdy rotacja się rozjechała</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Home rotations */}
                    <div>
                      <div className="text-xs text-blue-400 font-medium mb-1.5">{match.home_team?.short_name}</div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const BACK: Record<number,number> = {1:2,2:3,3:4,4:5,5:6,6:1}
                            const next: Record<number,string|null> = {}
                            for(let p=1;p<=6;p++) next[BACK[p]] = homeLineup[p] ?? null
                            setHomeLineup(next)
                            saveLineupToDB(next, awayLineup)
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded border border-gray-600 transition-colors"
                          title="Cofnij rotację o 1"
                        >◀ Wstecz</button>
                        <button
                          onClick={() => {
                            const FORWARD: Record<number,number> = {1:6,2:1,3:2,4:3,5:4,6:5}
                            const next: Record<number,string|null> = {}
                            for(let p=1;p<=6;p++) next[FORWARD[p]] = homeLineup[p] ?? null
                            setHomeLineup(next)
                            saveLineupToDB(next, awayLineup)
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded border border-gray-600 transition-colors"
                          title="Przesuń rotację o 1 do przodu"
                        >Przód ▶</button>
                      </div>
                    </div>
                    {/* Away rotations */}
                    <div>
                      <div className="text-xs text-orange-400 font-medium mb-1.5">{match.away_team?.short_name}</div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            const BACK: Record<number,number> = {1:2,2:3,3:4,4:5,5:6,6:1}
                            const next: Record<number,string|null> = {}
                            for(let p=1;p<=6;p++) next[BACK[p]] = awayLineup[p] ?? null
                            setAwayLineup(next)
                            saveLineupToDB(homeLineup, next)
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded border border-gray-600 transition-colors"
                        >◀ Wstecz</button>
                        <button
                          onClick={() => {
                            const FORWARD: Record<number,number> = {1:6,2:1,3:2,4:3,5:4,6:5}
                            const next: Record<number,string|null> = {}
                            for(let p=1;p<=6;p++) next[FORWARD[p]] = awayLineup[p] ?? null
                            setAwayLineup(next)
                            saveLineupToDB(homeLineup, next)
                          }}
                          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs py-1.5 rounded border border-gray-600 transition-colors"
                        >Przód ▶</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log wymian pod boiskiem */}
              <div className="p-3">
                <div className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Wymiany — {rallyIndex} łącznie</div>
                {rallyList.length === 0 ? (
                  <div className="text-center text-gray-700 text-sm py-4">Brak wymian</div>
                ) : (
                  <div className="space-y-1.5">
                    {rallyList.map((rally, ri) => {
                      const sorted = [...rally].sort((a, b) => a.action_index - b.action_index)
                      const first = sorted[0]
                      return (
                        <div key={ri} className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-700 font-mono">#{first.rally_index + 1}</span>
                            {first.yt_start !== null && (
                              <button onClick={() => { if (playerRef.current && ytReady) { playerRef.current.seekTo(first.yt_start!, true); playerRef.current.playVideo() } }}
                                className="text-red-400 hover:text-red-300 text-xs">▶ {formatTime(first.yt_start!)}</button>
                            )}
                            <button onClick={() => { if (window.confirm(`Usunąć wymianę #${first.rally_index + 1}?`)) deleteRally(first.rally_index) }}
                              className="ml-auto text-gray-700 hover:text-red-400 px-1 rounded hover:bg-gray-800 text-xs">🗑</button>
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

          {/* TAB: LOG — szczegółowa lista wszystkich akcji */}
          {rightTab === 'log' && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="text-xs text-gray-600 mb-2 uppercase tracking-wider">Akcje w secie — {actions.length} łącznie</div>
              <div className="space-y-0.5">
                {[...actions].reverse().map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-800/50">
                    <span className="font-mono text-gray-700 w-5 text-right shrink-0">{a.rally_index + 1}</span>
                    <span className="font-mono text-blue-400 w-6 shrink-0">#{(a as any).player?.jersey_number || '?'}</span>
                    <span className="text-gray-300 w-16 shrink-0">{ACTION_LABELS[a.action_type]}</span>
                    {a.quality && <span className={`font-bold ${QUALITY_COLORS[a.quality]}`}>{QUALITY_LABELS[a.quality]}</span>}
                    {a.zone_to && <span className="text-gray-600 text-xs">→Z{a.zone_to}</span>}
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                      {a.yt_start !== null && (
                        <button onClick={() => { if (playerRef.current && ytReady) { playerRef.current.seekTo(a.yt_start!, true); playerRef.current.playVideo() } }}
                          className="text-red-400 hover:text-red-300 text-xs">▶ {formatTime(a.yt_start!)}</button>
                      )}
                      <button onClick={async () => { await supabase.from('actions').delete().eq('id', a.id); setActions(prev => prev.filter(x => x.id !== a.id)) }}
                        className="text-gray-700 hover:text-red-400 px-1 rounded hover:bg-gray-800 text-xs" title="Usuń akcję">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ZAWODNICY */}
          {rightTab === 'zawodnicy' && (
            <div className="flex-1 overflow-y-auto p-3">
              {/* HOME TEAM */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                  <span className="text-blue-400 font-semibold text-xs uppercase tracking-wider">{match.home_team?.name}</span>
                  <span className="text-gray-600 text-xs">(Gospodarz)</span>
                </div>
                <div className="space-y-1">
                  {homePlayers
                    .sort((a: any, b: any) => a.jersey_number - b.jersey_number)
                    .map((p: any) => {
                      const isOnCourt = Object.values(homeLineup).includes(p.id)
                      const isLibero = p.position === 'libero'
                      const POSITION_FULL: Record<string, string> = {
                        atakujacy: 'Atakujący', przyjmujacy: 'Przyjmujący',
                        rozgrywajacy: 'Rozgrywający', libero: 'Libero',
                        srodkowy: 'Środkowy', uniwersalny: 'Uniwersalny',
                      }
                      const POSITION_COLORS: Record<string, string> = {
                        atakujacy: 'text-red-400', przyjmujacy: 'text-blue-400',
                        rozgrywajacy: 'text-yellow-400', libero: 'text-purple-400',
                        srodkowy: 'text-green-400', uniwersalny: 'text-gray-400',
                      }
                      return (
                        <div key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${isOnCourt ? 'bg-gray-800' : 'opacity-50'}`}>
                          <span className="font-mono font-bold text-white w-6 text-right">{p.jersey_number}</span>
                          <span className="text-gray-200 flex-1 truncate">{p.full_name}</span>
                          <span className={`text-xs font-medium ${POSITION_COLORS[p.position] || 'text-gray-400'}`}>
                            {POSITION_FULL[p.position] || p.position}
                          </span>
                          {isLibero && <span className="bg-purple-900 text-purple-300 text-xs px-1.5 rounded font-bold">L</span>}
                          {isOnCourt && !isLibero && <span className="text-green-500 text-xs">●</span>}
                          {!isOnCourt && <span className="text-gray-700 text-xs">○</span>}
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* AWAY TEAM */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0"></span>
                  <span className="text-orange-400 font-semibold text-xs uppercase tracking-wider">{match.away_team?.name}</span>
                  <span className="text-gray-600 text-xs">(Gość)</span>
                </div>
                <div className="space-y-1">
                  {awayPlayers
                    .sort((a: any, b: any) => a.jersey_number - b.jersey_number)
                    .map((p: any) => {
                      const isOnCourt = Object.values(awayLineup).includes(p.id)
                      const isLibero = p.position === 'libero'
                      const POSITION_FULL: Record<string, string> = {
                        atakujacy: 'Atakujący', przyjmujacy: 'Przyjmujący',
                        rozgrywajacy: 'Rozgrywający', libero: 'Libero',
                        srodkowy: 'Środkowy', uniwersalny: 'Uniwersalny',
                      }
                      const POSITION_COLORS: Record<string, string> = {
                        atakujacy: 'text-red-400', przyjmujacy: 'text-blue-400',
                        rozgrywajacy: 'text-yellow-400', libero: 'text-purple-400',
                        srodkowy: 'text-green-400', uniwersalny: 'text-gray-400',
                      }
                      return (
                        <div key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${isOnCourt ? 'bg-gray-800' : 'opacity-50'}`}>
                          <span className="font-mono font-bold text-white w-6 text-right">{p.jersey_number}</span>
                          <span className="text-gray-200 flex-1 truncate">{p.full_name}</span>
                          <span className={`text-xs font-medium ${POSITION_COLORS[p.position] || 'text-gray-400'}`}>
                            {POSITION_FULL[p.position] || p.position}
                          </span>
                          {isLibero && <span className="bg-purple-900 text-purple-300 text-xs px-1.5 rounded font-bold">L</span>}
                          {isOnCourt && !isLibero && <span className="text-green-500 text-xs">●</span>}
                          {!isOnCourt && <span className="text-gray-700 text-xs">○</span>}
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600 space-y-1">
                <div className="flex items-center gap-2"><span className="text-green-500">●</span> na boisku</div>
                <div className="flex items-center gap-2"><span className="text-gray-700">○</span> ławka</div>
                <div className="flex items-center gap-2"><span className="bg-purple-900 text-purple-300 px-1 rounded font-bold">L</span> libero</div>
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
                    const POS: Record<string, string> = { atakujacy: 'ATK', przyjmujacy: 'PRZ', rozgrywajacy: 'ROZ', libero: 'LIB', srodkowy: 'ŚRO', uniwersalny: 'UNI' }
                    return p ? <option key={pid} value={pid}>#{p.jersey_number} {p.full_name} — {POS[p.position] || p.position}</option> : null
                  })}
                </select>
              </div>
              <div>
                <label className="label">Wchodzi na boisko</label>
                <select className="input" value={subInPlayer} onChange={e => setSubInPlayer(e.target.value)}>
                  <option value="">Wybierz zawodnika</option>
                  {(subSide === 'home' ? homePlayers : awayPlayers)
                    .filter((p: any) => !(subSide === 'home' ? homeLineupPlayers : awayLineupPlayers).includes(p.id))
                    .map((p: any) => {
                      const POS: Record<string, string> = { atakujacy: 'ATK', przyjmujacy: 'PRZ', rozgrywajacy: 'ROZ', libero: 'LIB', srodkowy: 'ŚRO', uniwersalny: 'UNI' }
                      return <option key={p.id} value={p.id}>#{p.jersey_number} {p.full_name} — {POS[p.position] || p.position}</option>
                    })}
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
