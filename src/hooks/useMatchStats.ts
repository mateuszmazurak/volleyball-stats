import { useMemo } from 'react'
import { Action, ActionType } from 'types/database'

export interface ActionStat {
  total: number
  perfect: number   // #
  positive: number  // +
  overpass: number  // !
  negative: number  // -
  error: number     // /
  point: number     // *
  pct: number       // (perfect + positive) / total * 100
  errorPct: number  // error / total * 100
}

export interface PlayerStat {
  player_id: string
  player_name: string
  jersey_number: number
  position: string
  byType: Partial<Record<ActionType, ActionStat>>
  total: number
}

export interface ZoneStat {
  zone: number
  count: number
  pct: number
}

const emptyActionStat = (): ActionStat => ({
  total: 0, perfect: 0, positive: 0, overpass: 0,
  negative: 0, error: 0, point: 0, pct: 0, errorPct: 0
})

function buildActionStat(actions: Action[]): ActionStat {
  const s = emptyActionStat()
  s.total = actions.length
  actions.forEach(a => {
    if (a.quality === '#') s.perfect++
    else if (a.quality === '+') s.positive++
    else if (a.quality === '!') s.overpass++
    else if (a.quality === '-') s.negative++
    else if (a.quality === '/') s.error++
    else if (a.quality === '*') s.point++
  })
  s.pct = s.total > 0 ? Math.round(((s.perfect + s.positive) / s.total) * 100) : 0
  s.errorPct = s.total > 0 ? Math.round((s.error / s.total) * 100) : 0
  return s
}

export function useMatchStats(actions: Action[]) {
  return useMemo(() => {
    // Per player stats
    const playerMap: Record<string, { actions: Action[]; info: any }> = {}
    actions.forEach(a => {
      if (!a.player_id) return
      if (!playerMap[a.player_id]) {
        playerMap[a.player_id] = { actions: [], info: (a as any).player }
      }
      playerMap[a.player_id].actions.push(a)
    })

    const playerStats: PlayerStat[] = Object.entries(playerMap).map(([pid, { actions: pActions, info }]) => {
      const types: ActionType[] = ['S', 'R', 'E', 'A', 'B', 'D', 'K', 'F']
      const byType: Partial<Record<ActionType, ActionStat>> = {}
      types.forEach(t => {
        const filtered = pActions.filter(a => a.action_type === t)
        if (filtered.length > 0) byType[t] = buildActionStat(filtered)
      })
      return {
        player_id: pid,
        player_name: info?.full_name || 'Nieznany',
        jersey_number: info?.jersey_number || 0,
        position: info?.position || '',
        byType,
        total: pActions.length,
      }
    }).sort((a, b) => a.jersey_number - b.jersey_number)

    // Team overall stats per action type
    const types: ActionType[] = ['S', 'R', 'E', 'A', 'B', 'D', 'K', 'F']
    const teamStats: Partial<Record<ActionType, ActionStat>> = {}
    types.forEach(t => {
      const filtered = actions.filter(a => a.action_type === t)
      if (filtered.length > 0) teamStats[t] = buildActionStat(filtered)
    })

    // Zone stats (attacks and serves)
    const zoneAttacks: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    const zoneServes: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    actions.filter(a => a.action_type === 'A' && a.zone_from).forEach(a => { zoneAttacks[a.zone_from!]++ })
    actions.filter(a => a.action_type === 'S' && a.zone_from).forEach(a => { zoneServes[a.zone_from!]++ })

    const totalAttacks = Object.values(zoneAttacks).reduce((s, v) => s + v, 0)
    const totalServes = Object.values(zoneServes).reduce((s, v) => s + v, 0)

    const attackZones: ZoneStat[] = Object.entries(zoneAttacks).map(([z, count]) => ({
      zone: parseInt(z), count,
      pct: totalAttacks > 0 ? Math.round((count / totalAttacks) * 100) : 0
    }))
    const serveZones: ZoneStat[] = Object.entries(zoneServes).map(([z, count]) => ({
      zone: parseInt(z), count,
      pct: totalServes > 0 ? Math.round((count / totalServes) * 100) : 0
    }))

    return { playerStats, teamStats, attackZones, serveZones, totalActions: actions.length }
  }, [actions])
}
