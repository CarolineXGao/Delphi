/*
  # Enhance Delphi Stages Workflow

  1. Changes
    - Add `stage` field to rounds table to track Delphi methodology stages
    - Add `round_type` to distinguish between proposal collection and rating rounds
    - Add `instructions` field for round-specific instructions
    - Add `requires_previous_rating` for Round 3+ feedback display
    - Add AI clustering support fields to proposals table
    - Add consensus tracking fields to delphi_items
    - Create a clusters table for topic modeling results

  2. New Tables
    - `proposal_clusters` - stores AI-generated topic clusters from Round 1

  3. Security
    - Enable RLS on proposal_clusters table
    - Add appropriate policies for study admins
*/

-- Add stage tracking to rounds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' AND column_name = 'stage'
  ) THEN
    ALTER TABLE rounds ADD COLUMN stage text DEFAULT 'round_1_proposals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' AND column_name = 'round_type'
  ) THEN
    ALTER TABLE rounds ADD COLUMN round_type text DEFAULT 'proposals';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' AND column_name = 'instructions'
  ) THEN
    ALTER TABLE rounds ADD COLUMN instructions text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' AND column_name = 'requires_previous_rating'
  ) THEN
    ALTER TABLE rounds ADD COLUMN requires_previous_rating boolean DEFAULT false;
  END IF;
END $$;

-- Add AI clustering fields to proposals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'ai_cluster_label'
  ) THEN
    ALTER TABLE proposals ADD COLUMN ai_cluster_label text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proposals' AND column_name = 'similarity_score'
  ) THEN
    ALTER TABLE proposals ADD COLUMN similarity_score numeric;
  END IF;
END $$;

-- Add consensus tracking to delphi_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delphi_items' AND column_name = 'consensus_reached'
  ) THEN
    ALTER TABLE delphi_items ADD COLUMN consensus_reached boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delphi_items' AND column_name = 'consensus_round'
  ) THEN
    ALTER TABLE delphi_items ADD COLUMN consensus_round integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delphi_items' AND column_name = 'final_median'
  ) THEN
    ALTER TABLE delphi_items ADD COLUMN final_median numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delphi_items' AND column_name = 'final_iqr'
  ) THEN
    ALTER TABLE delphi_items ADD COLUMN final_iqr numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delphi_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE delphi_items ADD COLUMN status text DEFAULT 'active';
  END IF;
END $$;

-- Create proposal clusters table for AI topic modeling
CREATE TABLE IF NOT EXISTS proposal_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES studies(id) ON DELETE CASCADE,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE,
  domain text NOT NULL,
  cluster_label text NOT NULL,
  cluster_summary text,
  proposal_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by_ai boolean DEFAULT true
);

ALTER TABLE proposal_clusters ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_clusters
CREATE POLICY "Study admins can view proposal clusters"
  ON proposal_clusters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_clusters.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can insert proposal clusters"
  ON proposal_clusters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_clusters.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can update proposal clusters"
  ON proposal_clusters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_clusters.study_id 
      AND studies.created_by = auth.uid()
    )
  );

CREATE POLICY "Study admins can delete proposal clusters"
  ON proposal_clusters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies 
      WHERE studies.id = proposal_clusters.study_id 
      AND studies.created_by = auth.uid()
    )
  );
