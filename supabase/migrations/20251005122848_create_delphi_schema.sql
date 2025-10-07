/*
  # Delphi Study Platform Schema

  1. New Tables
    - `studies`
      - Core study configuration and metadata
      - Includes Likert scale settings and consensus rules
      - Tracks study status and progression
    
    - `participants`
      - Links users to studies with anonymized pseudo_id
      - Stores role information (admin, participant, viewer)
    
    - `proposals`
      - Stage 1-2 qualitative recommendations from participants
      - Supports clustering and merging
    
    - `delphi_items`
      - Final curated items for Delphi rounds
      - Created from merged proposals
    
    - `rounds`
      - Configuration for each Delphi round
      - Tracks open/close dates and status
    
    - `responses`
      - Participant ratings and comments per item per round
      - Stores group statistics for feedback
    
    - `documents`
      - Fact & Evidence files linked to studies
    
    - `surveys`
      - Post-assessment feedback from participants

  2. Security
    - Enable RLS on all tables
    - Participants can only access their own data and studies they're enrolled in
    - Study creators (admins) have full access to their studies
*/

-- Studies table
CREATE TABLE IF NOT EXISTS studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  domains jsonb DEFAULT '[]'::jsonb,
  total_rounds integer DEFAULT 3,
  current_round integer DEFAULT 0,
  likert_min integer DEFAULT 1,
  likert_max integer DEFAULT 9,
  consensus_rule text DEFAULT 'iqr',
  iqr_threshold numeric DEFAULT 1,
  net_agreement_threshold numeric DEFAULT 75,
  status text DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  pseudo_id text NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'participant',
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Studies RLS policies
CREATE POLICY "Authenticated users can view studies they participate in"
  ON studies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = studies.id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study creators can update their studies"
  ON studies FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can create studies"
  ON studies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Participants RLS policies
CREATE POLICY "Users can view their own participation records"
  ON participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Study admins can view all participants"
  ON participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = participants.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage participants"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = participants.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  domain text NOT NULL,
  recommendation text NOT NULL,
  rationale text DEFAULT '',
  cluster_id uuid,
  merged_into uuid REFERENCES proposals(id),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view proposals in their studies"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = proposals.study_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create their own proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = proposals.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their own proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = proposals.participant_id 
      AND participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = proposals.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

-- Delphi items table
CREATE TABLE IF NOT EXISTS delphi_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  domain text NOT NULL,
  item_number integer NOT NULL,
  recommendation text NOT NULL,
  rationale text DEFAULT '',
  source_proposals jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delphi_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view items in their studies"
  ON delphi_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = delphi_items.study_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage items"
  ON delphi_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = delphi_items.study_id 
      AND studies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = delphi_items.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- Rounds table
CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  open_date timestamptz,
  close_date timestamptz,
  status text DEFAULT 'pending',
  settings jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view rounds in their studies"
  ON rounds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = rounds.study_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage rounds"
  ON rounds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = rounds.study_id 
      AND studies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = rounds.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- Responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  item_id uuid REFERENCES delphi_items(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text DEFAULT '',
  previous_rating integer,
  group_median numeric,
  group_iqr numeric,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their own responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = responses.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study admins can view all responses"
  ON responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN studies s ON r.study_id = s.id
      WHERE r.id = responses.round_id 
      AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Participants can submit responses"
  ON responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = responses.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their responses"
  ON responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = responses.participant_id 
      AND participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = responses.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  file_type text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view documents in their studies"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = documents.study_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = documents.study_id 
      AND studies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = documents.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE,
  clarity_rating integer,
  engagement_rating integer,
  consensus_rating integer,
  comments text DEFAULT '',
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their own surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = surveys.participant_id 
      AND participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Study admins can view all surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = surveys.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Participants can submit surveys"
  ON surveys FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.id = surveys.participant_id 
      AND participants.user_id = auth.uid()
    )
  );