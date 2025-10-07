/*
  # Fix RLS Infinite Recursion

  The previous policies had circular dependencies:
  - studies policy checked participants table
  - participants policy checked studies table
  
  This migration fixes the issue by:
  1. Dropping all existing policies
  2. Creating new policies without circular references
  3. Using direct auth.uid() checks instead of subqueries where possible
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view studies they participate in" ON studies;
DROP POLICY IF EXISTS "Study creators can update their studies" ON studies;
DROP POLICY IF EXISTS "Authenticated users can create studies" ON studies;

DROP POLICY IF EXISTS "Users can view their own participation records" ON participants;
DROP POLICY IF EXISTS "Study admins can view all participants" ON participants;
DROP POLICY IF EXISTS "Study admins can manage participants" ON participants;

-- Studies policies (no circular reference)
CREATE POLICY "Study creators can view their studies"
  ON studies FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Study creators can update their studies"
  ON studies FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can create studies"
  ON studies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Study creators can delete their studies"
  ON studies FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Participants policies (direct checks, no circular reference)
CREATE POLICY "Users can view their own participant records"
  ON participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert participant records"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participant records"
  ON participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
