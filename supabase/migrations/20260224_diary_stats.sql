CREATE TABLE IF NOT EXISTS diary_stats (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  visitors INTEGER DEFAULT 0
);

ALTER TABLE diary_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='diary_stats' AND policyname='Anyone can read diary_stats') THEN
    CREATE POLICY "Anyone can read diary_stats" ON diary_stats FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='diary_stats' AND policyname='Anyone can insert diary_stats') THEN
    CREATE POLICY "Anyone can insert diary_stats" ON diary_stats FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='diary_stats' AND policyname='Anyone can update diary_stats') THEN
    CREATE POLICY "Anyone can update diary_stats" ON diary_stats FOR UPDATE USING (true);
  END IF;
END $$;
