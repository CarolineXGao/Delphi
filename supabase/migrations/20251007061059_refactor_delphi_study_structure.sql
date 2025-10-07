/*
  # Refactor Delphi Study Structure for Multi-Study Workflow

  1. New Tables
    - `study_domains` - Thematic areas/categories within each study
    - `proposal_questions` - Admin-defined questions for Round 1 proposal collection
    - `participant_tokens` - Email validation tokens for lightweight participant access
    
  2. Changes to Existing Tables
    - Update `proposals` to link to `proposal_questions`
    - Add `response_token` to `participants` for email validation
    - Add `question_id` reference to proposals
    
  3. Security
    - Enable RLS on all new tables
    - Add policies for role-based access
*/

-- Create study_domains table
CREATE TABLE IF NOT EXISTS study_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  display_order integer DEFAULT 0,
  item_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE study_domains ENABLE ROW LEVEL SECURITY;

-- Create proposal_questions table
CREATE TABLE IF NOT EXISTS proposal_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
  domain_id uuid REFERENCES study_domains(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_rationale text DEFAULT '',
  display_order integer DEFAULT 0,
  required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE proposal_questions ENABLE ROW LEVEL SECURITY;

-- Create participant_tokens table for email validation
CREATE TABLE IF NOT EXISTS participant_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE participant_tokens ENABLE ROW LEVEL SECURITY;

-- Add new columns to proposals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'question_id'
  ) THEN
    ALTER TABLE proposals ADD COLUMN question_id uuid REFERENCES proposal_questions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'domain_id'
  ) THEN
    ALTER TABLE proposals ADD COLUMN domain_id uuid REFERENCES study_domains(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add invitation token fields to participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'invitation_token'
  ) THEN
    ALTER TABLE participants ADD COLUMN invitation_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'invitation_sent_at'
  ) THEN
    ALTER TABLE participants ADD COLUMN invitation_sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE participants ADD COLUMN last_activity_at timestamptz;
  END IF;
END $$;

-- RLS Policies for study_domains
CREATE POLICY "Study members can view domains"
  ON study_domains FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = study_domains.study_id 
      AND participants.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = study_domains.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage domains"
  ON study_domains FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = study_domains.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- RLS Policies for proposal_questions
CREATE POLICY "Study members can view questions"
  ON proposal_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.study_id = proposal_questions.study_id 
      AND participants.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_questions.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can manage questions"
  ON proposal_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_questions.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- RLS Policies for participant_tokens
CREATE POLICY "Tokens are publicly readable by token value"
  ON participant_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Study admins can manage tokens"
  ON participant_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = participant_tokens.study_id 
      AND studies.created_by = auth.uid()
    )
  );

-- Function to generate unique invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
DECLARE
  token text;
  exists boolean;
BEGIN
  LOOP
    token := encode(gen_random_bytes(32), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token, 1, 32);
    
    SELECT EXISTS(SELECT 1 FROM participant_tokens WHERE participant_tokens.token = token) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;
