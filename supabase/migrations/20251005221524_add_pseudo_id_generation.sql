/*
  # Add Pseudo ID Auto-generation

  1. Changes
    - Create a function to generate sequential pseudo IDs per study (e.g., P001, P002, P003)
    - Add a trigger to automatically generate pseudo_id when a participant is inserted
    - Make pseudo_id generation handle concurrent inserts safely

  2. Security
    - Function runs with security definer to ensure consistent ID generation
*/

-- Function to generate the next pseudo ID for a study
CREATE OR REPLACE FUNCTION generate_pseudo_id()
RETURNS TRIGGER AS $$
DECLARE
  next_number integer;
  new_pseudo_id text;
BEGIN
  -- Get the count of existing participants for this study
  SELECT COUNT(*) + 1 INTO next_number
  FROM participants
  WHERE study_id = NEW.study_id;
  
  -- Generate pseudo ID in format P001, P002, etc.
  new_pseudo_id := 'P' || LPAD(next_number::text, 3, '0');
  
  -- Set the pseudo_id
  NEW.pseudo_id := new_pseudo_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-generate pseudo_id before insert
DROP TRIGGER IF EXISTS set_pseudo_id ON participants;
CREATE TRIGGER set_pseudo_id
  BEFORE INSERT ON participants
  FOR EACH ROW
  WHEN (NEW.pseudo_id IS NULL)
  EXECUTE FUNCTION generate_pseudo_id();
