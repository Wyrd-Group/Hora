-- ============================================================
-- Multiplayer: Friends, Game Rooms, Invites
-- Real Supabase-backed multiplayer for AEGIS Empire
-- ============================================================

-- ── Friend Requests ────────────────────────────────────────
create table if not exists public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  receiver_id  uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at   timestamptz default now(),
  responded_at timestamptz,
  unique (sender_id, receiver_id),
  check (sender_id != receiver_id)
);

create index idx_friend_requests_receiver on public.friend_requests(receiver_id) where status = 'pending';
create index idx_friend_requests_sender on public.friend_requests(sender_id);

alter table public.friend_requests enable row level security;

create policy "Users can see own requests"
  on public.friend_requests for select
  using (auth.uid() in (sender_id, receiver_id));

create policy "Users can send requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id and status = 'pending');

create policy "Receiver can respond to requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('accepted', 'declined'));

create policy "Either party can delete accepted friendship"
  on public.friend_requests for delete
  using (auth.uid() in (sender_id, receiver_id));

-- ── Game Rooms ─────────────────────────────────────────────
create table if not exists public.game_rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  host_id          uuid not null references auth.users(id) on delete cascade,
  host_name        text not null default 'Anonymous',
  mode             text not null default 'free_for_all',
  duration         int not null default 10,
  time_multiplier  int not null default 10,
  max_players      int not null default 6 check (max_players between 2 and 10),
  starting_capital bigint not null default 500000,
  allow_agents     boolean not null default true,
  event_frequency  text not null default 'Normal',
  status           text not null default 'waiting'
                   check (status in ('waiting', 'starting', 'in_progress', 'finished')),
  created_at       timestamptz default now(),
  started_at       timestamptz,
  finished_at      timestamptz
);

create index idx_game_rooms_code on public.game_rooms(code);
create index idx_game_rooms_status on public.game_rooms(status) where status = 'waiting';

alter table public.game_rooms enable row level security;

create policy "Anyone can browse open rooms"
  on public.game_rooms for select using (true);

create policy "Users can create rooms"
  on public.game_rooms for insert
  with check (auth.uid() = host_id);

create policy "Host can update room"
  on public.game_rooms for update
  using (auth.uid() = host_id);

create policy "Host can delete room"
  on public.game_rooms for delete
  using (auth.uid() = host_id);

-- ── Room Players ───────────────────────────────────────────
create table if not exists public.room_players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous',
  is_host      boolean not null default false,
  is_ready     boolean not null default false,
  is_bot       boolean not null default false,
  slot         int not null,
  joined_at    timestamptz default now()
);

create index idx_room_players_room on public.room_players(room_id);

-- Unique constraint: real players can only join once per room
create unique index idx_room_players_unique_user
  on public.room_players(room_id, user_id) where user_id is not null and is_bot = false;

alter table public.room_players enable row level security;

create policy "Anyone can see room players"
  on public.room_players for select using (true);

create policy "Users can join rooms"
  on public.room_players for insert
  with check (
    auth.uid() = user_id
    or (is_bot = true and exists (
      select 1 from public.game_rooms where id = room_id and host_id = auth.uid()
    ))
  );

create policy "Users can update own state or host can update"
  on public.room_players for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.game_rooms where id = room_id and host_id = auth.uid())
  );

create policy "Users can leave or host can kick"
  on public.room_players for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.game_rooms where id = room_id and host_id = auth.uid())
  );

-- ── Game Invites ───────────────────────────────────────────
create table if not exists public.game_invites (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  room_code    text not null,
  sender_id    uuid not null references auth.users(id) on delete cascade,
  sender_name  text not null default 'Anonymous',
  receiver_id  uuid not null references auth.users(id) on delete cascade,
  mode         text not null default 'free_for_all',
  duration     int not null default 10,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at   timestamptz default now(),
  unique (room_id, receiver_id)
);

create index idx_game_invites_receiver on public.game_invites(receiver_id) where status = 'pending';

alter table public.game_invites enable row level security;

create policy "Users can see own invites"
  on public.game_invites for select
  using (auth.uid() in (sender_id, receiver_id));

create policy "Users can send invites"
  on public.game_invites for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can respond"
  on public.game_invites for update
  using (auth.uid() = receiver_id);

create policy "Sender can cancel"
  on public.game_invites for delete
  using (auth.uid() = sender_id);

-- ── Enable Realtime ────────────────────────────────────────
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.game_invites;

-- ── Profile search index (trigram for name search) ─────────
create extension if not exists pg_trgm;

do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'idx_profiles_display_name_trgm'
  ) then
    create index idx_profiles_display_name_trgm
      on public.profiles using gin (display_name gin_trgm_ops);
  end if;
end $$;
