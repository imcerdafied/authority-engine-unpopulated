-- Outcome Loops: execution cycles attached to bets
-- question → build → learn → decision

-- Loop status enum
DO $$ BEGIN
  CREATE TYPE loop_status AS ENUM ('proposed', 'active', 'iterating', 'completed', 'killed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Loop decision enum
DO $$ BEGIN
  CREATE TYPE loop_decision AS ENUM ('scale', 'iterate', 'kill', 'unclear');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Main outcome_loops table
CREATE TABLE IF NOT EXISTS outcome_loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  use_case text NOT NULL,
  hypothesis text,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  contributors jsonb DEFAULT '[]'::jsonb,
  status loop_status NOT NULL DEFAULT 'proposed',
  priority integer NOT NULL DEFAULT 0,

  -- Execution fields
  last_ship_summary text,
  last_ship_date timestamptz,
  last_learning text,
  last_learning_date timestamptz,
  current_decision loop_decision NOT NULL DEFAULT 'unclear',
  decision_notes text,

  -- Versioning
  version_number integer NOT NULL DEFAULT 1,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Loop version history (snapshot on each ship/learn/decision update)
CREATE TABLE IF NOT EXISTS loop_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id uuid NOT NULL REFERENCES outcome_loops(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('ship', 'learning', 'decision', 'status')),
  ship_summary text,
  ship_date timestamptz,
  learning text,
  learning_date timestamptz,
  decision loop_decision,
  decision_notes text,
  status loop_status,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outcome_loops_bet_id ON outcome_loops(bet_id);
CREATE INDEX IF NOT EXISTS idx_outcome_loops_org_id ON outcome_loops(org_id);
CREATE INDEX IF NOT EXISTS idx_outcome_loops_owner ON outcome_loops(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_outcome_loops_status ON outcome_loops(status);
CREATE INDEX IF NOT EXISTS idx_loop_versions_loop_id ON loop_versions(loop_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_outcome_loop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_outcome_loops_updated_at ON outcome_loops;
CREATE TRIGGER trg_outcome_loops_updated_at
  BEFORE UPDATE ON outcome_loops
  FOR EACH ROW EXECUTE FUNCTION update_outcome_loop_updated_at();

-- RLS
ALTER TABLE outcome_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE loop_versions ENABLE ROW LEVEL SECURITY;

-- Read: org members can see loops for their org
CREATE POLICY "organization_memberships_read_loops" ON outcome_loops
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM organization_memberships WHERE user_id = auth.uid()
    )
  );

-- Insert: admin and pod_lead can create loops
CREATE POLICY "admin_pod_lead_insert_loops" ON outcome_loops
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'pod_lead')
    )
  );

-- Update: admin, pod_lead, or loop owner can update
CREATE POLICY "admin_pod_lead_owner_update_loops" ON outcome_loops
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'pod_lead')
    )
    OR owner_user_id = auth.uid()
  );

-- Delete: admin only
CREATE POLICY "admin_delete_loops" ON outcome_loops
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Loop versions: same read policy as loops
CREATE POLICY "organization_memberships_read_loop_versions" ON loop_versions
  FOR SELECT USING (
    loop_id IN (
      SELECT id FROM outcome_loops WHERE org_id IN (
        SELECT org_id FROM organization_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Loop versions: insert for writers
CREATE POLICY "writers_insert_loop_versions" ON loop_versions
  FOR INSERT WITH CHECK (
    loop_id IN (
      SELECT id FROM outcome_loops WHERE org_id IN (
        SELECT org_id FROM organization_memberships
        WHERE user_id = auth.uid() AND role IN ('admin', 'pod_lead')
      )
      OR owner_user_id = auth.uid()
    )
  );
