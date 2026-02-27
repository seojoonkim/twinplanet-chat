-- community_comments 테이블 생성
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  idol_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_reply BOOLEAN DEFAULT FALSE,
  reply_to_comment_id UUID REFERENCES public.community_comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments(post_id);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'allow_read'
  ) THEN
    CREATE POLICY "allow_read" ON public.community_comments FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'allow_insert'
  ) THEN
    CREATE POLICY "allow_insert" ON public.community_comments FOR INSERT WITH CHECK (true);
  END IF;
END $$;
