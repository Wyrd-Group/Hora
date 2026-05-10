-- ============================================================
-- Social Platform Tables
-- Posts, comments, likes, follows, leaderboard
-- ============================================================

-- ── Posts ────────────────────────────────────────────────────
create table if not exists public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 2000),
  tags        text[] default '{}',          -- extracted $TICKER tags
  likes_count int default 0,
  comments_count int default 0,
  views_count int default 0,
  created_at  timestamptz default now()
);

create index idx_social_posts_author on public.social_posts(author_id);
create index idx_social_posts_created on public.social_posts(created_at desc);

alter table public.social_posts enable row level security;

create policy "Anyone can read posts"
  on public.social_posts for select using (true);

create policy "Users can create own posts"
  on public.social_posts for insert
  with check (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.social_posts for update
  using (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.social_posts for delete
  using (auth.uid() = author_id);

-- ── Comments ────────────────────────────────────────────────
create table if not exists public.social_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.social_posts(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 1000),
  created_at  timestamptz default now()
);

create index idx_social_comments_post on public.social_comments(post_id);

alter table public.social_comments enable row level security;

create policy "Anyone can read comments"
  on public.social_comments for select using (true);

create policy "Users can create own comments"
  on public.social_comments for insert
  with check (auth.uid() = author_id);

create policy "Users can delete own comments"
  on public.social_comments for delete
  using (auth.uid() = author_id);

-- ── Post Likes ──────────────────────────────────────────────
create table if not exists public.social_post_likes (
  post_id     uuid not null references public.social_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.social_post_likes enable row level security;

create policy "Anyone can read likes"
  on public.social_post_likes for select using (true);

create policy "Users can like posts"
  on public.social_post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.social_post_likes for delete
  using (auth.uid() = user_id);

-- ── Follows ─────────────────────────────────────────────────
create table if not exists public.social_follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index idx_social_follows_following on public.social_follows(following_id);

alter table public.social_follows enable row level security;

create policy "Anyone can read follows"
  on public.social_follows for select using (true);

create policy "Users can follow others"
  on public.social_follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.social_follows for delete
  using (auth.uid() = follower_id);

-- ── Leaderboard Scores ──────────────────────────────────────
-- Materialized from profiles.game_state periodically or on save
create table if not exists public.leaderboard_scores (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text default 'Anonymous',
  net_worth     numeric default 0,
  level         int default 1,
  tier          text default 'Bronze',
  followers     int default 0,
  win_rate      numeric default 0,
  reputation    int default 0,
  updated_at    timestamptz default now()
);

alter table public.leaderboard_scores enable row level security;

create policy "Anyone can read leaderboard"
  on public.leaderboard_scores for select using (true);

create policy "Users can upsert own score"
  on public.leaderboard_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own score"
  on public.leaderboard_scores for update
  using (auth.uid() = user_id);

-- ── Trigger: auto-update likes_count on social_posts ────────
create or replace function public.update_post_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.social_posts set likes_count = likes_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.social_posts set likes_count = likes_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_post_likes_count
  after insert or delete on public.social_post_likes
  for each row execute function public.update_post_likes_count();

-- ── Trigger: auto-update comments_count on social_posts ─────
create or replace function public.update_post_comments_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.social_posts set comments_count = comments_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.social_posts set comments_count = comments_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_post_comments_count
  after insert or delete on public.social_comments
  for each row execute function public.update_post_comments_count();

-- ── Add display_name to profiles if missing ─────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
  ) then
    alter table public.profiles add column display_name text default 'Anonymous';
  end if;
end $$;
