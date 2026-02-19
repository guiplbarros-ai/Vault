-- Migration 002: Alert preferences + Benchmarks persistence
-- Run this in Supabase SQL Editor

-- 1. Add alert preferences to chat_settings
ALTER TABLE atlas_chat_settings
  ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'good_and_great',
  ADD COLUMN IF NOT EXISTS silence_until TIMESTAMPTZ;

-- 2. Create benchmarks table for persistent price benchmarks
CREATE TABLE IF NOT EXISTS atlas_benchmarks (
  route TEXT PRIMARY KEY,           -- "CNF-NRT"
  avg_price DECIMAL(10, 2) NOT NULL,
  good_price DECIMAL(10, 2) NOT NULL,
  great_price DECIMAL(10, 2) NOT NULL,
  last_updated TEXT NOT NULL,       -- "2026-02"
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at on benchmarks
CREATE OR REPLACE TRIGGER trg_atlas_benchmarks_updated
  BEFORE UPDATE ON atlas_benchmarks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
