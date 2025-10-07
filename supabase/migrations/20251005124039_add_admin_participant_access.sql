/*
  # Add Admin Access to Participants
  
  This migration adds a helper function and policies to allow:
  1. Study creators to view all participants in their studies
  2. Study creators to add participants to their studies
  
  Without causing circular policy dependencies
*/

-- Helper function to check if user is study admin
CREATE OR REPLACE FUNCTION is_study_admin(study_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM studies 
    WHERE id = study_uuid 
    AND created_by = auth.uid()
  );
$$;

-- Add policy for admins to view participants in their studies
CREATE POLICY "Study admins can view participants in their studies"
  ON participants FOR SELECT
  TO authenticated
  USING (is_study_admin(study_id));

-- Add policy for admins to insert participants in their studies
CREATE POLICY "Study admins can add participants to their studies"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (is_study_admin(study_id));

-- Add policy for admins to update participants in their studies
CREATE POLICY "Study admins can update participants in their studies"
  ON participants FOR UPDATE
  TO authenticated
  USING (is_study_admin(study_id))
  WITH CHECK (is_study_admin(study_id));

-- Add policy for admins to delete participants in their studies
CREATE POLICY "Study admins can delete participants from their studies"
  ON participants FOR DELETE
  TO authenticated
  USING (is_study_admin(study_id));
