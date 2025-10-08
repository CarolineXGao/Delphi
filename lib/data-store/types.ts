export type StorageMode = 'supabase' | 'local';

export interface Study {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  current_stage: number;
  stages_config?: any;
}

export interface StudyDomain {
  id: string;
  study_id: string;
  domain_name: string;
  display_order: number;
  created_at: string;
}

export interface ProposalQuestion {
  id: string;
  study_id: string;
  domain_id: string;
  question_text: string;
  question_rationale?: string;
  required: boolean;
  display_order: number;
  created_at: string;
}

export interface Participant {
  id: string;
  study_id: string;
  email: string;
  pseudo_id?: string;
  role: 'admin' | 'participant';
  invitation_sent_at?: string;
  joined_at?: string;
  created_at: string;
}

export interface Proposal {
  id: string;
  question_id: string;
  participant_id: string;
  proposal_text: string;
  rationale?: string;
  status: 'draft' | 'submitted';
  submitted_at?: string;
  created_at: string;
}

export interface DelphiItem {
  id: string;
  study_id: string;
  round_number: number;
  item_text: string;
  item_description?: string;
  source_proposal_id?: string;
  cluster_label?: string;
  display_order: number;
  consensus_reached: boolean;
  created_at: string;
}

export interface ItemResponse {
  id: string;
  item_id: string;
  participant_id: string;
  round_number: number;
  rating?: number;
  comment?: string;
  submitted_at?: string;
  created_at: string;
}

export interface BackupData {
  version: string;
  exported_at: string;
  storage_mode: StorageMode;
  data: {
    studies: Study[];
    domains: StudyDomain[];
    questions: ProposalQuestion[];
    participants: Participant[];
    proposals: Proposal[];
    items: DelphiItem[];
    responses: ItemResponse[];
  };
}

export interface DataStoreAdapter {
  // Studies
  getStudies(): Promise<Study[]>;
  getStudy(id: string): Promise<Study | null>;
  createStudy(study: Omit<Study, 'id' | 'created_at'>): Promise<Study>;
  updateStudy(id: string, updates: Partial<Study>): Promise<Study>;
  deleteStudy(id: string): Promise<void>;

  // Domains
  getDomains(studyId: string): Promise<StudyDomain[]>;
  createDomain(domain: Omit<StudyDomain, 'id' | 'created_at'>): Promise<StudyDomain>;
  updateDomain(id: string, updates: Partial<StudyDomain>): Promise<StudyDomain>;
  deleteDomain(id: string): Promise<void>;

  // Questions
  getQuestions(studyId: string): Promise<ProposalQuestion[]>;
  createQuestion(question: Omit<ProposalQuestion, 'id' | 'created_at'>): Promise<ProposalQuestion>;
  updateQuestion(id: string, updates: Partial<ProposalQuestion>): Promise<ProposalQuestion>;
  deleteQuestion(id: string): Promise<void>;

  // Participants
  getParticipants(studyId: string, excludeAdmin?: boolean): Promise<Participant[]>;
  getParticipantByEmail(studyId: string, email: string): Promise<Participant | null>;
  createParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Promise<Participant>;
  updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant>;
  deleteParticipant(id: string): Promise<void>;

  // Proposals
  getProposals(studyId: string): Promise<Proposal[]>;
  getProposalsByQuestion(questionId: string): Promise<Proposal[]>;
  createProposal(proposal: Omit<Proposal, 'id' | 'created_at'>): Promise<Proposal>;
  updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal>;
  deleteProposal(id: string): Promise<void>;

  // Delphi Items
  getItems(studyId: string, roundNumber?: number): Promise<DelphiItem[]>;
  createItem(item: Omit<DelphiItem, 'id' | 'created_at'>): Promise<DelphiItem>;
  updateItem(id: string, updates: Partial<DelphiItem>): Promise<DelphiItem>;
  deleteItem(id: string): Promise<void>;

  // Responses
  getResponses(studyId: string, roundNumber?: number): Promise<ItemResponse[]>;
  getResponsesByParticipant(participantId: string, roundNumber: number): Promise<ItemResponse[]>;
  createResponse(response: Omit<ItemResponse, 'id' | 'created_at'>): Promise<ItemResponse>;
  updateResponse(id: string, updates: Partial<ItemResponse>): Promise<ItemResponse>;

  // Stats & Counts
  getParticipantCount(studyId: string, excludeAdmin?: boolean): Promise<number>;
  getProposalCount(studyId: string, status?: string): Promise<number>;
  getItemCount(studyId: string): Promise<number>;
  getResponseCount(itemId: string): Promise<number>;

  // Backup & Restore
  exportData(): Promise<BackupData>;
  importData(backup: BackupData): Promise<void>;
}

export interface AuthAdapter {
  getCurrentUser(): Promise<{ id: string; email: string } | null>;
  signIn(email: string, password: string): Promise<{ id: string; email: string }>;
  signUp(email: string, password: string): Promise<{ id: string; email: string }>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: { id: string; email: string } | null) => void): () => void;
}
