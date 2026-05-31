import React from 'react'
import { ActionStat } from 'hooks/useMatchStats'

const ACTION_LABELS: Record<string, string> = {
  S: 'Serwis', R: 'Przyjęcie', E: 'Rozegranie',
  A: 'Atak', B: 'Blok', D: 'Obrona', K: 'Kiwka', F: 'Free ball'
}

interface StatBarProps {
  label: string
  value: number
  max: number
  color: string
}

export const StatBar: React.FC<StatBarProps> = ({ label, value, max, color }) => (
  <div className="flex items-center gap-2 text-sm">
    <div className="w-20 text-gray-400 text-xs shrink-0">{label}</div>
    <div className="flex-1 bg-gray-800 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
    <div className="w-8 text-right text-white text-xs font-mono">{value}</div>
  </div>
)

interface ActionStatCardProps {
  type: string
  stat: ActionStat
  compact?: boolean
}

export const ActionStatCard: React.FC<ActionStatCardProps> = ({ type, stat, compact = false }) => {
  const pctColor = stat.pct >= 70 ? 'text-green-400' : stat.pct >= 50 ? 'text-yellow-400' : 'text-red-400'

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-3 text-center">
        <div className="text-xs text-gray-400 mb-1">{ACTION_LABELS[type] || type}</div>
        <div className={`text-xl font-bold ${pctColor}`}>{stat.pct}%</div>
        <div className="text-xs text-gray-500">{stat.total} akcji</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-white">{ACTION_LABELS[type] || type}</div>
        <div className={`text-2xl font-bold ${pctColor}`}>{stat.pct}%</div>
      </div>
      <div className="space-y-1.5">
        <StatBar label="Perfekcyjne" value={stat.perfect} max={stat.total} color="bg-blue-500" />
        <StatBar label="Pozytywne" value={stat.positive} max={stat.total} color="bg-green-500" />
        <StatBar label="Overpass" value={stat.overpass} max={stat.total} color="bg-yellow-500" />
        <StatBar label="Negatywne" value={stat.negative} max={stat.total} color="bg-orange-500" />
        <StatBar label="Błąd" value={stat.error} max={stat.total} color="bg-red-500" />
        {type === 'S' || type === 'A' || type === 'B'
          ? <StatBar label="Punkt" value={stat.point} max={stat.total} color="bg-emerald-500" />
          : null}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
        <span>Łącznie: <span className="text-white">{stat.total}</span></span>
        <span>Błędy: <span className="text-red-400">{stat.errorPct}%</span></span>
      </div>
    </div>
  )
}

interface CourtZoneMapProps {
  zones: { zone: number; count: number; pct: number }[]
  title: string
}

export const CourtZoneMap: React.FC<CourtZoneMapProps> = ({ zones, title }) => {
  const zoneMap: Record<number, { count: number; pct: number }> = {}
  zones.forEach(z => { zoneMap[z.zone] = z })

  const maxCount = Math.max(...zones.map(z => z.count), 1)

  const ZoneCell = ({ zone }: { zone: number }) => {
    const data = zoneMap[zone] || { count: 0, pct: 0 }
    const intensity = data.count > 0 ? Math.max(0.15, data.count / maxCount) : 0
    return (
      <div
        className="flex flex-col items-center justify-center rounded border border-gray-600 aspect-square"
        style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
      >
        <div className="text-xs text-gray-300 font-bold">{zone}</div>
        <div className="text-sm font-bold text-white">{data.count}</div>
        {data.pct > 0 && <div className="text-xs text-gray-300">{data.pct}%</div>}
      </div>
    )
  }

  // Volleyball court zones layout:
  // Back row (from left): 5, 6, 1
  // Front row (from left): 4, 3, 2
  return (
    <div>
      <div className="text-sm font-medium text-gray-300 mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-1 max-w-[160px]">
        <ZoneCell zone={4} />
        <ZoneCell zone={3} />
        <ZoneCell zone={2} />
        <ZoneCell zone={5} />
        <ZoneCell zone={6} />
        <ZoneCell zone={1} />
      </div>
      <div className="text-xs text-gray-600 mt-1">← lewa | prawa →</div>
    </div>
  )
}

export { ACTION_LABELS }
