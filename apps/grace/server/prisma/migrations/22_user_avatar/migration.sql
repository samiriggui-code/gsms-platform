-- User profile avatar (relative path under uploads/avatars/)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_path" VARCHAR(500);
