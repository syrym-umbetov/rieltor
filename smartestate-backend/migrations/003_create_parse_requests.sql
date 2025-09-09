-- 003_create_parse_requests.sql
-- +goose Up
CREATE TABLE IF NOT EXISTS parse_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    max_pages INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    results JSONB NOT NULL DEFAULT '[]',
    count INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_parse_requests_user_id ON parse_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_parse_requests_status ON parse_requests(status);
CREATE INDEX IF NOT EXISTS idx_parse_requests_created_at ON parse_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_parse_requests_filters ON parse_requests USING GIN (filters);

-- +goose Down
DROP TABLE IF EXISTS parse_requests;