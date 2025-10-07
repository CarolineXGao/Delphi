/*
  # Add Stage Tracking to Studies

  1. Changes
    - Add `current_stage` field to track which stage the study is on (1-7)
    - Add `completed_stages` array to track which stages are complete
    - Add `stage_progress` JSONB field to store stage-specific metadata
  
  2. Stages
    1. Setup (define domains, participants, consensus rules)
    2. Collecting Proposals (Round 1 - gather expert input)
    3. Synthesis & Item Generation (cluster proposals into items)
    4. Rating (Round 2 - experts rate items)
    5. Re-Rating (Round 3 - experts re-rate with feedback)
    6. Validation/Workshop (optional - final discussions)
    7. Results & Exports (show consensus, export data)
  
  3. Notes
    - Default current_stage is 1 (Setup)
    - completed_stages starts as empty array
    - stage_progress stores metadata like completion percentages, checklists
*/

-- Add stage tracking columns to studies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studies' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE studies ADD COLUMN current_stage integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studies' AND column_name = 'completed_stages'
  ) THEN
    ALTER TABLE studies ADD COLUMN completed_stages integer[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'studies' AND column_name = 'stage_progress'
  ) THEN
    ALTER TABLE studies ADD COLUMN stage_progress jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add check constraint to ensure current_stage is between 1-7
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'studies_current_stage_check'
  ) THEN
    ALTER TABLE studies ADD CONSTRAINT studies_current_stage_check CHECK (current_stage >= 1 AND current_stage <= 7);
  END IF;
END $$;

-- Create index for stage queries
CREATE INDEX IF NOT EXISTS idx_studies_current_stage ON studies(current_stage);
CREATE INDEX IF NOT EXISTS idx_studies_completed_stages ON studies USING gin(completed_stages);
