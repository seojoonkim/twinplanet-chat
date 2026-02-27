-- onair_sessions에 member_name, last_chat_at 추가
ALTER TABLE onair_sessions ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE onair_sessions ADD COLUMN IF NOT EXISTS last_chat_at TIMESTAMPTZ;

-- onair_messages에 author_name 추가
ALTER TABLE onair_messages ADD COLUMN IF NOT EXISTS author_name TEXT;
