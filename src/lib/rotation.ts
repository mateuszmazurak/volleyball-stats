/**
 * Logika rotacji w siatkówce halowej
 * 
 * Numeracja stref:
 *   4 | 3 | 2   (strefa ataku - przy siatce)
 *   5 | 6 | 1   (strefa obrony - przy linii końcowej)
 * 
 * Rotacja: zgodnie z ruchem wskazówek zegara
 * 1 → 6 → 5 → 4 → 3 → 2 → 1
 * 
 * Serwuje zawodnik z pozycji 1.
 * Po zdobyciu punktu przez drużynę przyjmującą następuje rotacja.
 */

export interface CourtLineup {
  // position 1-6 -> player_id
  [position: number]: string | null
}

export interface RotationState {
  homeLineup: CourtLineup  // aktualne pozycje
  awayLineup: CourtLineup
  servingTeam: 'home' | 'away'
  rotationCount: number    // ile rotacji od startu
}

/**
 * Mapa rotacji wg FIVB - dokąd idzie zawodnik z danej pozycji:
 *
 *   4 | 3 | 2   (przód - siatka)
 *   5 | 6 | 1   (tył - linia końcowa)
 *
 * Rotacja zgodna z ruchem wskazówek zegara (patrząc z góry na boisko):
 *   Z1 (prawy tył, serwujący) → Z6 (środek tył)
 *   Z2 (prawy przód)         → Z1 (prawy tył - nowy serwujący!)
 *   Z3 (środek przód)        → Z2
 *   Z4 (lewy przód)          → Z3
 *   Z5 (lewy tył)            → Z4
 *   Z6 (środek tył)          → Z5
 */
const ROTATE_TO: Record<number, number> = {
  1: 6,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
}

/**
 * Wykonuje rotację dla danej drużyny (zdobyła punkt i przejęła serwis)
 */
export function rotate(lineup: CourtLineup): CourtLineup {
  const next: CourtLineup = {}
  for (let pos = 1; pos <= 6; pos++) {
    next[ROTATE_TO[pos]] = lineup[pos] ?? null
  }
  return next
}

/**
 * Oblicza strefę zawodnika na podstawie aktualnego składu
 */
export function getPlayerZone(playerId: string, lineup: CourtLineup): number | null {
  for (const [pos, pid] of Object.entries(lineup)) {
    if (pid === playerId) return parseInt(pos)
  }
  return null
}

/**
 * Konwertuje skład startowy (pozycja rotacyjna) na skład boiskowy (strefa)
 * Pozycja 1 = serwujący = strefa 1
 */
export function lineupToCourtPositions(
  players: { player_id: string; start_position: number }[]
): CourtLineup {
  const lineup: CourtLineup = {}
  players.forEach(p => {
    lineup[p.start_position] = p.player_id
  })
  return lineup
}

/**
 * Sprawdza czy rotacja jest potrzebna (zmiana serwisu)
 */
export function needsRotation(
  scoringTeam: 'home' | 'away',
  servingTeam: 'home' | 'away'
): boolean {
  return scoringTeam !== servingTeam
}

/**
 * Zwraca nazwę strefy
 */
export function getZoneName(zone: number): string {
  const names: Record<number, string> = {
    1: 'P1 (prawy tył)',
    2: 'P2 (prawy przód)',
    3: 'P3 (środek przód)',
    4: 'P4 (lewy przód)',
    5: 'P5 (lewy tył)',
    6: 'P6 (środek tył)',
  }
  return names[zone] || `Strefa ${zone}`
}

/**
 * Wizualne ułożenie boiska: [wiersz][kolumna] = strefa
 * Widok od strony drużyny (siatka na górze)
 */
export const COURT_LAYOUT = [
  [4, 3, 2],  // przód (przy siatce)
  [5, 6, 1],  // tył (przy linii końcowej)
]
