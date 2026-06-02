import { Action, ActionType, ActionQuality, ActionTechnique } from 'types/database'

export interface ParsedAction {
  playerNumber: number
  actionType: ActionType
  quality: ActionQuality | null
  zoneFrom: number | null
  zoneTo: number | null
  technique: ActionTechnique | null
  result: string | null
  rawCode: string
  error?: string
}

export interface ParsedRally {
  actions: ParsedAction[]
  rawCode: string
  error?: string
}

const ACTION_TYPES: Record<string, ActionType> = {
  S: 'S', R: 'R', E: 'E', A: 'A', B: 'B', D: 'D', K: 'K', F: 'F'
}

const ACTION_LABELS: Record<ActionType, string> = {
  S: 'Serwis', R: 'Przyjęcie', E: 'Rozegranie',
  A: 'Atak', B: 'Blok', D: 'Obrona', K: 'Kiwka', F: 'Free ball'
}

const QUALITY_LABELS: Record<string, string> = {
  '#': 'Perfekcyjne', '+': 'Pozytywne', '!': 'Overpass/Trudne',
  '-': 'Negatywne', '/': 'Błąd', '*': 'Punkt'
}

const TECHNIQUE_LABELS: Record<string, string> = {
  H: 'Mocny', T: 'Topspin/Liniowy', Q: 'Szybka',
  P: 'Planowany (pipe)', J: 'Jump serve', F: 'Float serve'
}

const ZONE_NAMES: Record<number, string> = {
  1: 'Strefa 1 (PP)', 2: 'Strefa 2 (PP-siatka)',
  3: 'Strefa 3 (środek-siatka)', 4: 'Strefa 4 (PL-siatka)',
  5: 'Strefa 5 (PL)', 6: 'Strefa 6 (środek)'
}

/**
 * Parsuje pojedynczą akcję w formacie: [nr][TYP][strefa_z?][technika?][jakość/wynik?]
 * Przykłady: 2S2H, 5R+, 6E3Q, 10A6H*, 7B*, 11R#
 */
export function parseAction(raw: string): ParsedAction {
  const code = raw.trim().toUpperCase()
  const result: ParsedAction = {
    playerNumber: 0,
    actionType: 'S',
    quality: null,
    zoneFrom: null,
    zoneTo: null,
    technique: null,
    result: null,
    rawCode: raw.trim()
  }

  // Wyciągamy numer zawodnika z opcjonalnym prefixem drużyny
  // Standard DataVolley/VolleyStation:
  //   *11S  lub  11S  = gospodarz #11 (gwiazdka opcjonalna, domyślnie gospodarz)
  //    a11S          = gość #11 (prefiks 'a' wymagany dla gościa)
  const numMatch = code.match(/^[*A]?(\d{1,2})/)
  if (!numMatch) return { ...result, error: `Brak numeru zawodnika: "${raw}"` }
  result.playerNumber = parseInt(numMatch[1])

  // Określ drużynę na podstawie prefiksu
  const prefix = code[0]
  ;(result as any).teamPrefix = prefix === 'A' ? 'away' : 'home' // brak lub * = home

  let rest = code.slice(numMatch[0].length)

  // Typ akcji (jedna litera)
  const typeChar = rest[0]
  if (!ACTION_TYPES[typeChar]) return { ...result, error: `Nieznany typ akcji "${typeChar}" w: "${raw}"` }
  result.actionType = ACTION_TYPES[typeChar]
  rest = rest.slice(1)

  // Parsowanie reszty znaków po typie akcji
  // Możliwe: cyfra (strefa), litera techniki (H,T,Q,P,J,F), jakość (#,+,!,-,/,*)
  // Kolejność: [strefa_z lub strefa_do][technika][jakość]
  // Dla serwisu: S[strefa_do][technika][jakość]
  // Dla przyjęcia: R[jakość]
  // Dla rozegrania: E[strefa_do][tempo]
  // Dla ataku: A[strefa_do][technika][wynik]
  // Dla bloku: B[wynik]

  const qualities = new Set(['#', '+', '!', '-', '/', '*'])
  const techniques = new Set(['H', 'T', 'Q', 'P', 'J', 'F'])
  const zones = new Set(['1', '2', '3', '4', '5', '6'])

  const zonesSeen: number[] = []

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (zones.has(ch)) {
      zonesSeen.push(parseInt(ch))
    } else if (techniques.has(ch)) {
      result.technique = ch as ActionTechnique
    } else if (qualities.has(ch)) {
      result.quality = ch as ActionQuality
      result.result = ch
    }
  }

  // Przypisz strefy zależnie od kontekstu
  if (result.actionType === 'S') {
    // Serwis:
    // - 1 cyfra: strefa docelowa na boisku przeciwnika (np. 8S6F = serwis w strefę 6)
    // - 2 cyfry: pierwsza = strefa wyjścia, druga = strefa docelowa (np. 8S16F = z 1 w 6)
    if (zonesSeen.length === 1) result.zoneTo = zonesSeen[0]
    else if (zonesSeen.length >= 2) { result.zoneFrom = zonesSeen[0]; result.zoneTo = zonesSeen[1] }
  } else if (result.actionType === 'R' || result.actionType === 'D' || result.actionType === 'F') {
    // Przyjęcie/obrona: strefa z której przyjmujemy
    if (zonesSeen.length >= 1) result.zoneFrom = zonesSeen[0]
  } else if (result.actionType === 'E') {
    // Rozegranie: strefa do której wystawiamy
    if (zonesSeen.length >= 1) result.zoneTo = zonesSeen[0]
  } else if (result.actionType === 'A' || result.actionType === 'K') {
    // Atak/kiwka:
    // - 1 cyfra: strefa DOCELOWA na boisku przeciwnika (np. 7A5H+ = atak W strefę 5)
    // - 2 cyfry: pierwsza = skąd atakuje, druga = gdzie trafia (np. 7A45H+ = ze strefy 4 w strefę 5)
    if (zonesSeen.length === 1) result.zoneTo = zonesSeen[0]
    else if (zonesSeen.length >= 2) { result.zoneFrom = zonesSeen[0]; result.zoneTo = zonesSeen[1] }
  } else if (result.actionType === 'B') {
    // Blok: strefa bloku
    if (zonesSeen.length >= 1) result.zoneFrom = zonesSeen[0]
  }

  return result
}

/**
 * Parsuje całą wymianę (rally) złożoną z akcji oddzielonych " / " lub " "
 * Przykład: "2S2H / 5R+ / 6E3Q / 10A6H*"
 */
export function parseRally(raw: string): ParsedRally {
  if (!raw.trim()) return { actions: [], rawCode: raw }

  // Dzielenie po "/" lub po spacji między akcjami
  // Dziel przed: cyfrą, prefiksem 'a' (gość) lub '*' (gospodarz)
  // Separator: '/' otoczone spacjami LUB spacja przed cyfrą/prefiksem
  // '/' bez spacji = jakość błędu, nie separator!
  const parts = raw.split(/\s+\/\s+|\s+(?=[\d*])|\s+(?=[aA]\d)/).filter(p => p.trim())
  const actions: ParsedAction[] = []
  const errors: string[] = []

  for (const part of parts) {
    const action = parseAction(part)
    if (action.error) errors.push(action.error)
    actions.push(action)
  }

  return {
    actions,
    rawCode: raw,
    error: errors.length ? errors.join(', ') : undefined
  }
}

/**
 * Generuje czytelny opis akcji po polsku
 */
export function describeAction(action: ParsedAction): string {
  if (action.error) return `⚠️ ${action.error}`

  const teamLabel = (action as any).teamPrefix === 'away' ? '[Gość]' : '[Gosp]'
  const parts: string[] = [`${teamLabel} #${action.playerNumber}`]
  parts.push(ACTION_LABELS[action.actionType] || action.actionType)

  if (action.actionType === 'S') {
    if (action.zoneFrom) parts.push(`ze strefy ${action.zoneFrom}`)
    if (action.technique) parts.push(TECHNIQUE_LABELS[action.technique] || action.technique)
    if (action.zoneTo) parts.push(`w strefę ${action.zoneTo}`)
  } else {
    if (action.zoneFrom) parts.push(`ze strefy ${action.zoneFrom}`)
    if (action.technique) parts.push(TECHNIQUE_LABELS[action.technique] || action.technique)
    if (action.zoneTo) parts.push(`→ strefa ${action.zoneTo}`)
  }
  if (action.quality) parts.push(`[${QUALITY_LABELS[action.quality] || action.quality}]`)

  return parts.join(' ')
}

/**
 * Generuje czytelny opis całej wymiany
 */
export function describeRally(rally: ParsedRally): string {
  return rally.actions.map(describeAction).join(' → ')
}

/**
 * Oblicza skuteczność dla danego typu akcji z listy akcji
 */
export function calcEfficiency(actions: Action[], type: ActionType): {
  total: number
  perfect: number
  positive: number
  negative: number
  error: number
  point: number
  pct: number
} {
  const filtered = actions.filter(a => a.action_type === type)
  const total = filtered.length
  if (total === 0) return { total: 0, perfect: 0, positive: 0, negative: 0, error: 0, point: 0, pct: 0 }

  const perfect = filtered.filter(a => a.quality === '#').length
  const positive = filtered.filter(a => a.quality === '+').length
  const negative = filtered.filter(a => a.quality === '-').length
  const error = filtered.filter(a => a.quality === '/').length
  const point = filtered.filter(a => a.quality === '*').length

  const pct = Math.round(((perfect + positive) / total) * 100)

  return { total, perfect, positive, negative, error, point, pct }
}

export { ACTION_LABELS, QUALITY_LABELS, TECHNIQUE_LABELS, ZONE_NAMES }
