-- ============================================
-- ATLAS - Monitor de Passagens Aereas
-- Schema PostgreSQL (Supabase)
-- ============================================

-- Extensoes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS
-- ============================================

-- Cache de aeroportos
CREATE TABLE IF NOT EXISTS airports (
  iata VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country VARCHAR(2) NOT NULL,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rotas monitoradas
CREATE TABLE IF NOT EXISTS monitored_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id BIGINT NOT NULL,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  is_round_trip BOOLEAN DEFAULT true,
  min_stay_days INTEGER,
  max_stay_days INTEGER,
  target_price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chat_id, origin, destination)
);

-- Alertas de preco configurados
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id BIGINT NOT NULL,
  route_id UUID REFERENCES monitored_routes(id) ON DELETE CASCADE,
  origin VARCHAR(3),
  destination VARCHAR(3),
  max_price DECIMAL(10, 2),
  min_drop_percent INTEGER DEFAULT 15,
  notify_lowest_ever BOOLEAN DEFAULT true,
  notify_trend_down BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historico de precos (para analise de tendencias)
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES monitored_routes(id) ON DELETE SET NULL,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',
  airline TEXT,
  stops INTEGER DEFAULT 0,
  duration INTEGER, -- minutos
  provider VARCHAR(20) NOT NULL,
  deep_link TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index para queries de tendencia
  CONSTRAINT valid_price CHECK (price > 0)
);

-- Deals/promocoes detectados
CREATE TABLE IF NOT EXISTS flight_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES monitored_routes(id) ON DELETE SET NULL,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2) NOT NULL,
  previous_price DECIMAL(10, 2),
  drop_percent DECIMAL(5, 2),
  airline TEXT,
  stops INTEGER DEFAULT 0,
  deep_link TEXT,
  deal_type VARCHAR(20) NOT NULL, -- 'price_drop', 'lowest_ever', 'trend_down', 'manual'
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuracoes por chat/usuario
CREATE TABLE IF NOT EXISTS chat_settings (
  chat_id BIGINT PRIMARY KEY,
  digest_enabled BOOLEAN DEFAULT true,
  digest_time VARCHAR(5) DEFAULT '08:30', -- HH:mm
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  language VARCHAR(5) DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetria de uso de APIs
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(20) NOT NULL,
  endpoint TEXT,
  request_count INTEGER DEFAULT 1,
  cost DECIMAL(10, 4),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_monitored_routes_chat ON monitored_routes(chat_id);
CREATE INDEX IF NOT EXISTS idx_monitored_routes_active ON monitored_routes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_monitored_routes_route ON monitored_routes(origin, destination);

CREATE INDEX IF NOT EXISTS idx_price_alerts_chat ON price_alerts(chat_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_route ON price_alerts(route_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_price_history_route ON price_history(origin, destination);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(departure_date);
CREATE INDEX IF NOT EXISTS idx_price_history_fetched ON price_history(fetched_at);
CREATE INDEX IF NOT EXISTS idx_price_history_route_id ON price_history(route_id);

CREATE INDEX IF NOT EXISTS idx_flight_deals_route ON flight_deals(origin, destination);
CREATE INDEX IF NOT EXISTS idx_flight_deals_created ON flight_deals(created_at);
CREATE INDEX IF NOT EXISTS idx_flight_deals_type ON flight_deals(deal_type);

CREATE INDEX IF NOT EXISTS idx_usage_events_provider ON usage_events(provider);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at);

-- ============================================
-- FUNCOES AUXILIARES
-- ============================================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_monitored_routes_updated ON monitored_routes;
CREATE TRIGGER trg_monitored_routes_updated
  BEFORE UPDATE ON monitored_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_price_alerts_updated ON price_alerts;
CREATE TRIGGER trg_price_alerts_updated
  BEFORE UPDATE ON price_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_chat_settings_updated ON chat_settings;
CREATE TRIGGER trg_chat_settings_updated
  BEFORE UPDATE ON chat_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS UTEIS
-- ============================================

-- View de precos medios dos ultimos 7 dias por rota
CREATE OR REPLACE VIEW v_avg_prices_7d AS
SELECT
  origin,
  destination,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as sample_count
FROM price_history
WHERE fetched_at > NOW() - INTERVAL '7 days'
GROUP BY origin, destination;

-- View de menor preco historico por rota
CREATE OR REPLACE VIEW v_lowest_prices AS
SELECT DISTINCT ON (origin, destination)
  origin,
  destination,
  price as lowest_price,
  airline,
  departure_date,
  fetched_at
FROM price_history
ORDER BY origin, destination, price ASC;
