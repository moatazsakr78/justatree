-- Safe Automations: automated recurring safe operations (withdraw/deposit/transfer)
-- ==================================================================================

-- Table: safe_automations - stores automation rules
CREATE TABLE IF NOT EXISTS elfaroukgroup.safe_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which safe this automation belongs to
  record_id UUID NOT NULL,

  -- Human-readable label
  name TEXT NOT NULL,

  -- Operation type: 'withdraw', 'deposit', 'transfer'
  operation_type TEXT NOT NULL CHECK (operation_type IN ('withdraw', 'deposit', 'transfer')),

  -- Source selection (matches withdraw modal semantics)
  -- Values: 'all', 'transfers', 'safe-only', specific drawer UUID, or ''
  source_id TEXT NOT NULL DEFAULT '',

  -- For 'all' mode: 'full' or 'excluding_reserves'
  all_mode TEXT CHECK (all_mode IN ('full', 'excluding_reserves') OR all_mode IS NULL),

  -- Amount strategy: 'fixed', 'all_available', 'all_excluding_reserves'
  amount_type TEXT NOT NULL CHECK (amount_type IN ('fixed', 'all_available', 'all_excluding_reserves')),

  -- Fixed amount (only relevant when amount_type = 'fixed')
  fixed_amount NUMERIC(12, 2) DEFAULT 0,

  -- Target safe for transfers
  target_record_id UUID,

  -- Note template with {day_name}, {date} placeholders
  notes_template TEXT DEFAULT '',

  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_time TIME NOT NULL DEFAULT '06:00',
  schedule_days_of_week INT[] DEFAULT NULL,
  schedule_day_of_month INT DEFAULT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Execution tracking
  last_executed_at TIMESTAMPTZ DEFAULT NULL,
  last_execution_status TEXT DEFAULT NULL,
  next_scheduled_at TIMESTAMPTZ DEFAULT NULL,

  -- Metadata
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_safe_automations_active ON elfaroukgroup.safe_automations (is_active)
  WHERE is_active = true;
CREATE INDEX idx_safe_automations_record ON elfaroukgroup.safe_automations (record_id);
CREATE INDEX idx_safe_automations_next ON elfaroukgroup.safe_automations (next_scheduled_at)
  WHERE is_active = true;


-- Table: safe_automation_logs - execution history
CREATE TABLE IF NOT EXISTS elfaroukgroup.safe_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES elfaroukgroup.safe_automations(id) ON DELETE CASCADE,

  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'error')),
  message TEXT DEFAULT NULL,

  -- Execution details
  amount_executed NUMERIC(12, 2) DEFAULT NULL,
  balance_before NUMERIC(12, 2) DEFAULT NULL,
  balance_after NUMERIC(12, 2) DEFAULT NULL,
  resolved_notes TEXT DEFAULT NULL,

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_logs_automation ON elfaroukgroup.safe_automation_logs (automation_id, executed_at DESC);


-- Function: compute next scheduled run time based on schedule config
CREATE OR REPLACE FUNCTION elfaroukgroup.compute_next_automation_run(
  p_schedule_type TEXT,
  p_schedule_time TIME,
  p_schedule_days_of_week INT[],
  p_schedule_day_of_month INT,
  p_from_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cairo_now TIMESTAMP;
  cairo_date DATE;
  cairo_time TIME;
  candidate TIMESTAMP;
  dow INT;
  i INT;
  target_date DATE;
BEGIN
  -- Convert to Cairo time
  cairo_now := p_from_time AT TIME ZONE 'Africa/Cairo';
  cairo_date := cairo_now::DATE;
  cairo_time := cairo_now::TIME;

  IF p_schedule_type = 'daily' THEN
    -- If today's time hasn't passed, schedule for today; otherwise tomorrow
    IF cairo_time < p_schedule_time THEN
      candidate := cairo_date + p_schedule_time;
    ELSE
      candidate := (cairo_date + 1) + p_schedule_time;
    END IF;
    RETURN candidate AT TIME ZONE 'Africa/Cairo';

  ELSIF p_schedule_type = 'weekly' THEN
    -- Find next matching day of week (0=Sun..6=Sat)
    IF p_schedule_days_of_week IS NULL OR array_length(p_schedule_days_of_week, 1) IS NULL THEN
      -- No days specified, default to daily behavior
      IF cairo_time < p_schedule_time THEN
        candidate := cairo_date + p_schedule_time;
      ELSE
        candidate := (cairo_date + 1) + p_schedule_time;
      END IF;
      RETURN candidate AT TIME ZONE 'Africa/Cairo';
    END IF;

    FOR i IN 0..7 LOOP
      target_date := cairo_date + i;
      dow := EXTRACT(DOW FROM target_date)::INT;
      IF dow = ANY(p_schedule_days_of_week) THEN
        candidate := target_date + p_schedule_time;
        IF candidate > cairo_now THEN
          RETURN candidate AT TIME ZONE 'Africa/Cairo';
        END IF;
      END IF;
    END LOOP;
    -- Fallback: next week same day
    RETURN (cairo_date + 7 + p_schedule_time) AT TIME ZONE 'Africa/Cairo';

  ELSIF p_schedule_type = 'monthly' THEN
    IF p_schedule_day_of_month IS NULL THEN
      p_schedule_day_of_month := 1;
    END IF;

    -- Try this month
    BEGIN
      target_date := DATE_TRUNC('month', cairo_date)::DATE + (p_schedule_day_of_month - 1);
      candidate := target_date + p_schedule_time;
      IF candidate > cairo_now THEN
        RETURN candidate AT TIME ZONE 'Africa/Cairo';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Day doesn't exist in this month
    END;

    -- Next month
    BEGIN
      target_date := (DATE_TRUNC('month', cairo_date) + INTERVAL '1 month')::DATE + (p_schedule_day_of_month - 1);
      candidate := target_date + p_schedule_time;
      RETURN candidate AT TIME ZONE 'Africa/Cairo';
    EXCEPTION WHEN OTHERS THEN
      -- Day doesn't exist in next month either, use last day
      target_date := (DATE_TRUNC('month', cairo_date) + INTERVAL '2 months')::DATE - 1;
      candidate := target_date + p_schedule_time;
      RETURN candidate AT TIME ZONE 'Africa/Cairo';
    END;
  END IF;

  -- Fallback: tomorrow
  RETURN ((cairo_date + 1) + p_schedule_time) AT TIME ZONE 'Africa/Cairo';
END;
$$;
