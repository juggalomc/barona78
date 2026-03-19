-- MIGRĀCIJA: ATKRITUMU IZVEŠANAS TARIFS
-- Izpildit Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waste_tariffs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period TEXT NOT NULL UNIQUE,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_rate DECIMAL(5, 2) DEFAULT 21,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Pievienot indeksu uz period (ātrākai meklēšanai)
CREATE INDEX IF NOT EXISTS idx_waste_tariffs_period ON waste_tariffs(period);

-- Atslēgt RLS (lokālai testēšanai)
ALTER TABLE waste_tariffs DISABLE ROW LEVEL SECURITY;

-- Piemērs: Ievietot atkritumu tarifu martsam 2026
INSERT INTO waste_tariffs (period, total_amount, vat_rate)
VALUES ('2026-03', 100, 21)
ON CONFLICT (period) DO NOTHING;

-- Verifikācija
SELECT * FROM waste_tariffs;
