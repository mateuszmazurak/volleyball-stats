import { useMemo } from 'react'
import { Action, ActionType } from 'types/database'

/**
 * Statystyki wzorowane na DataVolley / AVCA / SoloStats
 *
 * ATAK (A, K):
 *   Kill (K)     = akcja zakończona punktem (*)
 *   Error (E)    = błąd (/)
 *   Att          = łączna liczba prób
 *   HitEff       = (Kill - Error) / Att  — główny wskaźnik ataku wg AVCA
 *   Kill%        = Kill / Att * 100
 *
 * SERWIS (S):
 *   Ace (#, *)   = as serwisowy
 *   Error (/)    = błąd serwisu
 *   Att          = łączna liczba serwisów
 *   Eff%         = (Ace - Error) / Att * 100
 *
 * PRZYJĘCIE (R):
 *   Perfect (#)  = perfekcyjne — setter wystawia ze wszystkich opcji
 *   Positive (+) = pozytywne — setter wystawia w ograniczeniu
 *   Overpass (!) = overpass / trudne
 *   Negative (-) = negatywne — brak możliwości ataku
 *   Error (/)    = błąd przyjęcia (punkt przeciwnika)
 *   Exc%         = Perfect / Att * 100
 *   Pos%         = (Perfect + Positive) / Att * 100
 *   Avg          = (3×Perfect + 2×Positive + 1×Overpass + 0×Error) / Att  (skala 0-3)
 *
 * BLOK (B):
 *   Solo (*)     = blok punktowy
 *   Assist (+)   = blok zatrzymujący (kontynuacja gry)
 *   Error (/)    = błąd bloku
 *
 * OBRONA (D):
 *   Dig+         = # lub + (skuteczna obrona)
 *   Error        = /
 *   Dig%         = Dig+ / Att * 100
 */

export interface AttackStat {
  att: number      // łączna liczba ataków
  kill: number     // punkty (*)
  error: number    // błędy (/)
  hitEff: number   // (kill-error)/att — AVCA Hitting Efficiency
  killPct: number  // kill/att*100
  errorPct: number
}

export interface ServeStat {
  att: number
  ace: number      // as (#, *)
  error: number    // błąd (/)
  positive: number // + (negatywny dla przyjmujących ale nie punkt)
  effPct: number   // (ace-error)/att*100
  acePct: number
  errorPct: number
}

export interface ReceptionStat {
  att: number
  perfect: number  // #
  positive: number // +
  overpass: number // !
  negative: number // -
  error: number    // /
  excPct: number   // perfect/att*100
  posPct: number   // (perfect+positive)/att*100
  avg: number      // average 0-3
}

export interface BlockStat {
  att: number
  solo: number     // * (punkt)
  assist: number   // + (zatrzymanie)
  error: number    // /
  totalPts: number // solo + assist*0.5 (wg DataVolley)
}

export interface DigStat {
  att: number
  good: number     // # lub +
  error: number    // /
  digPct: number
}

export interface PlayerFullStat {
  player_id: string
  player_name: string
  jersey_number: number
  position: string
  attack?: AttackStat
  serve?: ServeStat
  reception?: ReceptionStat
  block?: BlockStat
  dig?: DigStat
  totalActions: number
  // Punkty zdobyte bezpośrednio
  directPoints: number // ace + kill + block solo
}

export interface ZoneStat {
  zone: number
  count: number
  pct: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calcAttack(actions: Action[]): AttackStat | undefined {
  if (actions.length === 0) return undefined
  const att = actions.length
  const kill = actions.filter(a => a.quality === '*').length
  const error = actions.filter(a => a.quality === '/').length
  return {
    att, kill, error,
    hitEff: att > 0 ? Math.round(((kill - error) / att) * 1000) / 1000 : 0,
    killPct: att > 0 ? Math.round((kill / att) * 100) : 0,
    errorPct: att > 0 ? Math.round((error / att) * 100) : 0,
  }
}

function calcServe(actions: Action[]): ServeStat | undefined {
  if (actions.length === 0) return undefined
  const att = actions.length
  const ace = actions.filter(a => a.quality === '#' || a.quality === '*').length
  const error = actions.filter(a => a.quality === '/').length
  const positive = actions.filter(a => a.quality === '+').length
  return {
    att, ace, error, positive,
    effPct: att > 0 ? Math.round(((ace - error) / att) * 100) : 0,
    acePct: att > 0 ? Math.round((ace / att) * 100) : 0,
    errorPct: att > 0 ? Math.round((error / att) * 100) : 0,
  }
}

function calcReception(actions: Action[]): ReceptionStat | undefined {
  if (actions.length === 0) return undefined
  const att = actions.length
  const perfect = actions.filter(a => a.quality === '#').length
  const positive = actions.filter(a => a.quality === '+').length
  const overpass = actions.filter(a => a.quality === '!').length
  const negative = actions.filter(a => a.quality === '-').length
  const error = actions.filter(a => a.quality === '/').length
  const avg = att > 0
    ? Math.round(((perfect * 3 + positive * 2 + overpass * 1) / att) * 100) / 100
    : 0
  return {
    att, perfect, positive, overpass, negative, error,
    excPct: att > 0 ? Math.round((perfect / att) * 100) : 0,
    posPct: att > 0 ? Math.round(((perfect + positive) / att) * 100) : 0,
    avg,
  }
}

function calcBlock(actions: Action[]): BlockStat | undefined {
  if (actions.length === 0) return undefined
  const att = actions.length
  const solo = actions.filter(a => a.quality === '*').length
  const assist = actions.filter(a => a.quality === '+').length
  const error = actions.filter(a => a.quality === '/').length
  return { att, solo, assist, error, totalPts: solo + assist * 0.5 }
}

function calcDig(actions: Action[]): DigStat | undefined {
  if (actions.length === 0) return undefined
  const att = actions.length
  const good = actions.filter(a => a.quality === '#' || a.quality === '+').length
  const error = actions.filter(a => a.quality === '/').length
  return { att, good, error, digPct: att > 0 ? Math.round((good / att) * 100) : 0 }
}

// ─── Main hook ───────────────────────────────────────────────────────────────

export function useMatchStats(actions: Action[]) {
  return useMemo(() => {
    // Per-player
    const playerMap: Record<string, { actions: Action[]; info: any }> = {}
    actions.forEach(a => {
      if (!a.player_id) return
      if (!playerMap[a.player_id]) playerMap[a.player_id] = { actions: [], info: (a as any).player }
      playerMap[a.player_id].actions.push(a)
    })

    const playerStats: PlayerFullStat[] = Object.entries(playerMap).map(([pid, { actions: pa, info }]) => {
      const byType = (t: ActionType) => pa.filter(a => a.action_type === t)
      const attackActions = [...byType('A'), ...byType('K')]
      const directPoints =
        pa.filter(a => (a.action_type === 'S') && (a.quality === '#' || a.quality === '*')).length +
        pa.filter(a => (a.action_type === 'A' || a.action_type === 'K') && a.quality === '*').length +
        pa.filter(a => a.action_type === 'B' && a.quality === '*').length
      return {
        player_id: pid,
        player_name: info?.full_name || 'Nieznany',
        jersey_number: info?.jersey_number || 0,
        position: info?.position || '',
        attack: calcAttack(attackActions),
        serve: calcServe(byType('S')),
        reception: calcReception(byType('R')),
        block: calcBlock(byType('B')),
        dig: calcDig(byType('D')),
        totalActions: pa.length,
        directPoints,
      }
    }).sort((a, b) => a.jersey_number - b.jersey_number)

    // Pomocnik: rozpoznaj akcje gości (prefix 'a' + cyfra)
    const isAwayAction = (a: Action): boolean => {
      const raw = a.raw_code?.trim() || ''
      return /^[Aa]\d/.test(raw)
    }
    const homeActions = actions.filter(a => !isAwayAction(a))
    const awayActions = actions.filter(a => isAwayAction(a))

    // Pomocnik: oblicz pełne statystyki drużyny z listy akcji
    const calcTeamStats = (acts: Action[]) => ({
      attack: calcAttack(acts.filter(a => a.action_type === 'A' || a.action_type === 'K')),
      serve: calcServe(acts.filter(a => a.action_type === 'S')),
      reception: calcReception(acts.filter(a => a.action_type === 'R')),
      block: calcBlock(acts.filter(a => a.action_type === 'B')),
      dig: calcDig(acts.filter(a => a.action_type === 'D')),
    })

    // Team totals — teraz osobno per drużyna + łącznie
    const teamStats = calcTeamStats(actions)
    const homeStats = calcTeamStats(homeActions)
    const awayStats = calcTeamStats(awayActions)

    // Zone heatmaps
    // Heatmapy stref
    const zoneCount = (
      acts: Action[],
      type: ActionType,
      field: 'zone_from' | 'zone_to',
      qualities?: string[]
    ) => {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      acts
        .filter(a => a.action_type === type && a[field])
        .filter(a => !qualities || (a.quality && qualities.includes(a.quality)))
        .forEach(a => { counts[a[field]!]++ })
      const total = Object.values(counts).reduce((s, v) => s + v, 0)
      return Object.entries(counts).map(([z, count]) => ({
        zone: parseInt(z), count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      }))
    }

    return {
      playerStats,
      teamStats,
      homeStats,
      awayStats,
      // Strefy per drużyna
      home: {
        attackZonesTo: zoneCount(homeActions, 'A', 'zone_to'),
        attackZonesTo_kill: zoneCount(homeActions, 'A', 'zone_to', ['*', '#']),
        attackZonesTo_err: zoneCount(homeActions, 'A', 'zone_to', ['/']),
        serveZonesTo: zoneCount(homeActions, 'S', 'zone_to'),
        serveZonesTo_ace: zoneCount(homeActions, 'S', 'zone_to', ['#', '*']),
        reception: calcReception(homeActions.filter(a => a.action_type === 'R')),
      },
      away: {
        attackZonesTo: zoneCount(awayActions, 'A', 'zone_to'),
        attackZonesTo_kill: zoneCount(awayActions, 'A', 'zone_to', ['*', '#']),
        attackZonesTo_err: zoneCount(awayActions, 'A', 'zone_to', ['/']),
        serveZonesTo: zoneCount(awayActions, 'S', 'zone_to'),
        serveZonesTo_ace: zoneCount(awayActions, 'S', 'zone_to', ['#', '*']),
        reception: calcReception(awayActions.filter(a => a.action_type === 'R')),
      },
      // Legacy (cały mecz razem - używane w zakładce Drużyna)
      attackZonesFrom: zoneCount(actions, 'A', 'zone_from'),
      attackZonesTo: zoneCount(actions, 'A', 'zone_to'),
      serveZonesTo: zoneCount(actions, 'S', 'zone_to'),
      totalActions: actions.length,
    }
  }, [actions])
}
