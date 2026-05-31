export type UserRole = 'statystyk' | 'trener' | 'zawodnik'
export type PlayerPosition = 'atakujacy' | 'przyjmujacy' | 'rozgrywajacy' | 'libero' | 'srodkowy' | 'uniwersalny'
export type ActionType = 'S' | 'R' | 'E' | 'A' | 'B' | 'D' | 'K' | 'F'
export type ActionQuality = '#' | '+' | '!' | '-' | '/' | '*'
export type ActionTechnique = 'H' | 'T' | 'Q' | 'P' | 'J' | 'F'
export type MatchStatus = 'zaplanowany' | 'w_trakcie' | 'zakończony'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Team {
  id: string
  name: string
  short_name: string
  created_by: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  user_id: string | null
  full_name: string
  jersey_number: number
  position: PlayerPosition
  created_at: string
  team?: Team
}

export interface Coach {
  id: string
  user_id: string
  team_id: string
  created_at: string
  profile?: Profile
  team?: Team
}

export interface Match {
  id: string
  home_team_id: string
  away_team_id: string
  match_date: string
  location: string | null
  youtube_url: string | null
  status: MatchStatus
  created_by: string
  created_at: string
  home_team?: Team
  away_team?: Team
}

export interface MatchLineup {
  id: string
  match_id: string
  player_id: string
  team_side: 'home' | 'away'
  start_position: number // 1-6 pozycja rotacyjna
  player?: Player
}

export interface VolleySet {
  id: string
  match_id: string
  set_number: number
  score_home: number
  score_away: number
  is_finished: boolean
  created_at: string
}

export interface Action {
  id: string
  set_id: string
  player_id: string
  raw_code: string
  action_type: ActionType
  quality: ActionQuality | null
  zone_from: number | null
  zone_to: number | null
  technique: ActionTechnique | null
  result: string | null
  yt_start: number | null
  yt_end: number | null
  rotation_state: number | null
  rally_index: number
  action_index: number
  created_at: string
  player?: Player
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      teams: { Row: Team; Insert: Omit<Team, 'id' | 'created_at'>; Update: Partial<Team> }
      players: { Row: Player; Insert: Omit<Player, 'id' | 'created_at'>; Update: Partial<Player> }
      coaches: { Row: Coach; Insert: Omit<Coach, 'id' | 'created_at'>; Update: Partial<Coach> }
      matches: { Row: Match; Insert: Omit<Match, 'id' | 'created_at'>; Update: Partial<Match> }
      match_lineups: { Row: MatchLineup; Insert: Omit<MatchLineup, 'id'>; Update: Partial<MatchLineup> }
      sets: { Row: VolleySet; Insert: Omit<VolleySet, 'id' | 'created_at'>; Update: Partial<VolleySet> }
      actions: { Row: Action; Insert: Omit<Action, 'id' | 'created_at'>; Update: Partial<Action> }
    }
  }
}
