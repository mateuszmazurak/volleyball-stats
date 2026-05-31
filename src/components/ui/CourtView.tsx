import React from 'react'
import { CourtLineup, COURT_LAYOUT } from 'lib/rotation'

interface Player {
  id: string
  full_name: string
  jersey_number: number
  position: string
}

interface CourtViewProps {
  lineup: CourtLineup
  players: Player[]
  teamName: string
  teamSide: 'home' | 'away'
  isServing: boolean
  highlightPlayerId?: string | null
  compact?: boolean
}

const POSITION_ABBR: Record<string, string> = {
  atakujacy: 'ATK', przyjmujacy: 'PRZ', rozgrywajacy: 'ROZ',
  libero: 'LIB', srodkowy: 'ŚRO', uniwersalny: 'UNI',
}

const POSITION_COLORS: Record<string, string> = {
  atakujacy: 'bg-red-800 border-red-600',
  przyjmujacy: 'bg-blue-800 border-blue-600',
  rozgrywajacy: 'bg-yellow-800 border-yellow-600',
  libero: 'bg-purple-800 border-purple-600',
  srodkowy: 'bg-green-800 border-green-600',
  uniwersalny: 'bg-gray-700 border-gray-500',
}

export const CourtView: React.FC<CourtViewProps> = ({
  lineup, players, teamName, teamSide, isServing, highlightPlayerId, compact = false
}) => {
  const playerMap: Record<string, Player> = {}
  players.forEach(p => { playerMap[p.id] = p })

  const cellSize = compact ? 'h-14 w-14' : 'h-20 w-20'
  const textSize = compact ? 'text-xs' : 'text-sm'

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-semibold ${teamSide === 'home' ? 'text-blue-400' : 'text-orange-400'}`}>
          {teamName}
        </span>
        {isServing && (
          <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full font-medium">
            🏐 Serwis
          </span>
        )}
      </div>

      {/* Siatka */}
      <div className="border-t-2 border-gray-400 mb-0.5">
        <div className="text-xs text-gray-600 text-center pb-0.5">— siatka —</div>
      </div>

      {/* Boisko */}
      <div className="border border-gray-600 rounded-b-lg overflow-hidden">
        {COURT_LAYOUT.map((row, rowIdx) => (
          <div key={rowIdx} className="flex border-b border-gray-700 last:border-b-0">
            {row.map(zone => {
              const playerId = lineup[zone]
              const player = playerId ? playerMap[playerId] : null
              const isHighlighted = highlightPlayerId && playerId === highlightPlayerId

              return (
                <div
                  key={zone}
                  className={`
                    flex-1 ${cellSize} flex flex-col items-center justify-center border-r border-gray-700 last:border-r-0
                    ${isHighlighted ? 'ring-2 ring-inset ring-yellow-400' : ''}
                    ${player ? (POSITION_COLORS[player.position] || 'bg-gray-800') : 'bg-gray-900'}
                  `}
                >
                  <div className="text-gray-600 text-xs absolute-top-left opacity-40 self-start pl-1 pt-0.5 leading-none">
                    {zone}
                  </div>
                  {player ? (
                    <>
                      <div className={`font-bold text-white ${textSize}`}>#{player.jersey_number}</div>
                      {!compact && (
                        <div className="text-gray-300 text-xs leading-tight text-center px-1 truncate max-w-full">
                          {player.full_name.split(' ')[0]}
                        </div>
                      )}
                      <div className="text-gray-400 text-xs">{POSITION_ABBR[player.position]}</div>
                    </>
                  ) : (
                    <div className="text-gray-700 text-xs">—</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Linia końcowa */}
      <div className="border-t border-gray-500 mt-0.5">
        <div className="text-xs text-gray-600 text-center pt-0.5">— linia końcowa —</div>
      </div>
    </div>
  )
}
