-- Three FK columns that my original unindexed-FK query missed (the regex
-- was too strict). Adding covering B-tree indexes to close the final
-- performance-advisor findings.
CREATE INDEX IF NOT EXISTS idx_game_invites_sender_id    ON public.game_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id      ON public.room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_social_post_likes_user_id ON public.social_post_likes(user_id);
