import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Study = {
  id: string;
  title: string;
  description: string;
  domains: string[];
  total_rounds: number;
  current_round: number;
  likert_min: number;
  likert_max: number;
  consensus_rule: 'iqr' | 'net_agreement';
  iqr_threshold: number;
  net_agreement_threshold: number;
  status: 'draft' | 'active' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Participant = {
  id: string;
  study_id: string;
  user_id: string;
  pseudo_id: string;
  email: string;
  role: 'admin' | 'participant' | 'expert' | 'viewer';
  invited_at: string;
  joined_at?: string;
  invitation_token?: string;
  invitation_sent_at?: string;
  last_activity_at?: string;
};

export type Proposal = {
  id: string;
  study_id: string;
  participant_id: string;
  question_id?: string;
  domain_id?: string;
  domain: string;
  recommendation: string;
  rationale: string;
  cluster_id?: string;
  merged_into?: string;
  status: 'draft' | 'submitted' | 'merged';
  ai_cluster_label?: string;
  similarity_score?: number;
  created_at: string;
};

export type DelphiItem = {
  id: string;
  study_id: string;
  domain: string;
  item_number: number;
  recommendation: string;
  rationale: string;
  source_proposals: string[];
  consensus_reached: boolean;
  consensus_round?: number;
  final_median?: number;
  final_iqr?: number;
  status: 'active' | 'dropped' | 'consensus';
  created_at: string;
};

export type Round = {
  id: string;
  study_id: string;
  round_number: number;
  stage: 'round_1_proposals' | 'round_2_rating' | 'round_3_rerating' | 'validation';
  round_type: 'proposals' | 'rating';
  instructions: string;
  requires_previous_rating: boolean;
  open_date?: string;
  close_date?: string;
  status: 'pending' | 'open' | 'closed';
  settings: Record<string, any>;
};

export type Response = {
  id: string;
  round_id: string;
  item_id: string;
  participant_id: string;
  rating: number;
  comment: string;
  previous_rating?: number;
  group_median?: number;
  group_iqr?: number;
  submitted_at: string;
};

export type Document = {
  id: string;
  study_id: string;
  title: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
};

export type Survey = {
  id: string;
  study_id: string;
  participant_id: string;
  clarity_rating?: number;
  engagement_rating?: number;
  consensus_rating?: number;
  comments: string;
  submitted_at: string;
};

export type ProposalCluster = {
  id: string;
  study_id: string;
  round_id: string;
  domain: string;
  cluster_label: string;
  cluster_summary?: string;
  proposal_count: number;
  created_at: string;
  created_by_ai: boolean;
};

export type StudyDomain = {
  id: string;
  study_id: string;
  name: string;
  description: string;
  display_order: number;
  item_count: number;
  created_at: string;
  updated_at: string;
};

export type ProposalQuestion = {
  id: string;
  study_id: string;
  domain_id?: string;
  question_text: string;
  question_rationale: string;
  display_order: number;
  required: boolean;
  created_at: string;
  updated_at: string;
};

export type ParticipantToken = {
  id: string;
  participant_id: string;
  study_id: string;
  token: string;
  email: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
};
