-- =============================================
-- VolleyStats Pro - Schemat bazy danych
-- Wklej całość w Supabase > SQL Editor > Run
-- =============================================

-- Typy ENUM
create type user_role as enum ('statystyk', 'trener', 'zawodnik');
create type player_position as enum ('atakujacy', 'przyjmujacy', 'rozgrywajacy', 'libero', 'srodkowy', 'uniwersalny');
create type action_type as enum ('S', 'R', 'E', 'A', 'B', 'D', 'K', 'F');
create type action_quality as enum ('#', '+', '!', '-', '/', '*');
create type action_technique as enum ('H', 'T', 'Q', 'P', 'J', 'F');
create type match_status as enum ('zaplanowany', 'w_trakcie', 'zakończony');
create type team_side as enum ('home', 'away');

-- Tabela profili użytkowników (rozszerza auth.users Supabase)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role user_role not null default 'zawodnik',
  created_at timestamptz default now()
);

-- Automatyczne tworzenie profilu po rejestracji
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Nowy użytkownik'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'zawodnik')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Drużyny
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_name text not null check (length(short_name) between 2 and 4),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Zawodnicy
create table players (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  full_name text not null,
  jersey_number int not null check (jersey_number between 1 and 99),
  position player_position not null,
  created_at timestamptz default now(),
  unique(team_id, jersey_number)
);

-- Trenerzy przypisani do drużyn
create table coaches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, team_id)
);

-- Mecze
create table matches (
  id uuid default gen_random_uuid() primary key,
  home_team_id uuid references teams(id) not null,
  away_team_id uuid references teams(id) not null,
  match_date timestamptz not null,
  location text,
  youtube_url text,
  status match_status not null default 'zaplanowany',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  check (home_team_id != away_team_id)
);

-- Składy meczowe (kto gra w danym meczu i na jakiej pozycji rotacyjnej)
create table match_lineups (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  team_side team_side not null,
  start_position int not null check (start_position between 1 and 6),
  unique(match_id, player_id),
  unique(match_id, team_side, start_position)
);

-- Sety meczu
create table sets (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  set_number int not null check (set_number between 1 and 5),
  score_home int not null default 0,
  score_away int not null default 0,
  is_finished boolean not null default false,
  created_at timestamptz default now(),
  unique(match_id, set_number)
);

-- Akcje (serce aplikacji)
create table actions (
  id uuid default gen_random_uuid() primary key,
  set_id uuid references sets(id) on delete cascade not null,
  player_id uuid references players(id) on delete set null,
  raw_code text not null,
  action_type action_type not null,
  quality action_quality,
  zone_from int check (zone_from between 1 and 6),
  zone_to int check (zone_to between 1 and 6),
  technique action_technique,
  result text,
  yt_start float,         -- timestamp w YouTube (sekundy) - start akcji
  yt_end float,           -- timestamp w YouTube (sekundy) - koniec akcji
  rotation_state int,     -- stan rotacji w momencie akcji
  rally_index int not null default 0,   -- numer wymiany w secie
  action_index int not null default 0,  -- numer akcji w wymianie
  created_at timestamptz default now()
);

-- Indeksy dla wydajności
create index idx_actions_set_id on actions(set_id);
create index idx_actions_player_id on actions(player_id);
create index idx_actions_action_type on actions(action_type);
create index idx_actions_rally on actions(set_id, rally_index, action_index);
create index idx_match_lineups_match on match_lineups(match_id);
create index idx_players_team on players(team_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
alter table profiles enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table coaches enable row level security;
alter table matches enable row level security;
alter table match_lineups enable row level security;
alter table sets enable row level security;
alter table actions enable row level security;

-- Profiles: każdy widzi swój profil, statystycy widzą wszystkich
create policy "profiles_select" on profiles for select using (
  auth.uid() = id or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'statystyk')
);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Teams: wszyscy mogą czytać, statystycy mogą tworzyć
create policy "teams_select" on teams for select using (auth.role() = 'authenticated');
create policy "teams_insert" on teams for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "teams_update" on teams for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Players: wszyscy zalogowani widzą, statystycy zarządzają
create policy "players_select" on players for select using (auth.role() = 'authenticated');
create policy "players_insert" on players for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "players_update" on players for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Coaches
create policy "coaches_select" on coaches for select using (auth.role() = 'authenticated');
create policy "coaches_insert" on coaches for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Matches: wszyscy widzą, statystycy tworzą
create policy "matches_select" on matches for select using (auth.role() = 'authenticated');
create policy "matches_insert" on matches for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "matches_update" on matches for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Match lineups
create policy "lineups_select" on match_lineups for select using (auth.role() = 'authenticated');
create policy "lineups_insert" on match_lineups for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "lineups_delete" on match_lineups for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Sets
create policy "sets_select" on sets for select using (auth.role() = 'authenticated');
create policy "sets_insert" on sets for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "sets_update" on sets for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- Actions: wszyscy widzą, statystycy tworzą
create policy "actions_select" on actions for select using (auth.role() = 'authenticated');
create policy "actions_insert" on actions for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);
create policy "actions_delete" on actions for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'statystyk')
);

-- =============================================
-- Dane testowe (opcjonalne - możesz usunąć)
-- =============================================
-- UWAGA: Najpierw stwórz konto w Supabase Auth, 
-- potem wróć tu i odkomentuj jeśli chcesz dane testowe
-- insert into teams (name, short_name, created_by) values 
--   ('KS Volleyball Warszawa', 'KSV', (select id from profiles limit 1)),
--   ('AZS Poznań', 'AZS', (select id from profiles limit 1));
