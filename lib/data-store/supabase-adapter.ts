import { supabase } from '@/lib/supabase';
import type {
  DataStoreAdapter,
  AuthAdapter,
  Study,
  StudyDomain,
  ProposalQuestion,
  Participant,
  Proposal,
  DelphiItem,
  ItemResponse,
  BackupData,
} from './types';

export class SupabaseDataAdapter implements DataStoreAdapter {
  async getStudies(): Promise<Study[]> {
    const { data, error } = await supabase
      .from('studies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getStudy(id: string): Promise<Study | null> {
    const { data, error } = await supabase
      .from('studies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createStudy(study: Omit<Study, 'id' | 'created_at'>): Promise<Study> {
    const { data, error } = await supabase
      .from('studies')
      .insert(study)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStudy(id: string, updates: Partial<Study>): Promise<Study> {
    const { data, error } = await supabase
      .from('studies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStudy(id: string): Promise<void> {
    const { error } = await supabase
      .from('studies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getDomains(studyId: string): Promise<StudyDomain[]> {
    const { data, error } = await supabase
      .from('study_domains')
      .select('*')
      .eq('study_id', studyId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createDomain(domain: Omit<StudyDomain, 'id' | 'created_at'>): Promise<StudyDomain> {
    const { data, error } = await supabase
      .from('study_domains')
      .insert(domain)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDomain(id: string, updates: Partial<StudyDomain>): Promise<StudyDomain> {
    const { data, error } = await supabase
      .from('study_domains')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDomain(id: string): Promise<void> {
    const { error } = await supabase
      .from('study_domains')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getQuestions(studyId: string): Promise<ProposalQuestion[]> {
    const { data, error } = await supabase
      .from('proposal_questions')
      .select('*')
      .eq('study_id', studyId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createQuestion(question: Omit<ProposalQuestion, 'id' | 'created_at'>): Promise<ProposalQuestion> {
    const { data, error } = await supabase
      .from('proposal_questions')
      .insert(question)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateQuestion(id: string, updates: Partial<ProposalQuestion>): Promise<ProposalQuestion> {
    const { data, error } = await supabase
      .from('proposal_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase
      .from('proposal_questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getParticipants(studyId: string, excludeAdmin = false): Promise<Participant[]> {
    let query = supabase
      .from('participants')
      .select('*')
      .eq('study_id', studyId);

    if (excludeAdmin) {
      query = query.neq('role', 'admin');
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getParticipantByEmail(studyId: string, email: string): Promise<Participant | null> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('study_id', studyId)
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .insert(participant)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteParticipant(id: string): Promise<void> {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getProposals(studyId: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('study_id', studyId);

    if (error) throw error;
    return data || [];
  }

  async getProposalsByQuestion(questionId: string): Promise<Proposal[]> {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('question_id', questionId);

    if (error) throw error;
    return data || [];
  }

  async createProposal(proposal: Omit<Proposal, 'id' | 'created_at'>): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposal)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProposal(id: string): Promise<void> {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getItems(studyId: string, roundNumber?: number): Promise<DelphiItem[]> {
    let query = supabase
      .from('delphi_items')
      .select('*')
      .eq('study_id', studyId);

    if (roundNumber !== undefined) {
      query = query.eq('round_number', roundNumber);
    }

    query = query.order('display_order', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async createItem(item: Omit<DelphiItem, 'id' | 'created_at'>): Promise<DelphiItem> {
    const { data, error } = await supabase
      .from('delphi_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateItem(id: string, updates: Partial<DelphiItem>): Promise<DelphiItem> {
    const { data, error } = await supabase
      .from('delphi_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('delphi_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getResponses(studyId: string, roundNumber?: number): Promise<ItemResponse[]> {
    let query = supabase
      .from('item_responses')
      .select('*')
      .eq('study_id', studyId);

    if (roundNumber !== undefined) {
      query = query.eq('round_number', roundNumber);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getResponsesByParticipant(participantId: string, roundNumber: number): Promise<ItemResponse[]> {
    const { data, error } = await supabase
      .from('item_responses')
      .select('*')
      .eq('participant_id', participantId)
      .eq('round_number', roundNumber);

    if (error) throw error;
    return data || [];
  }

  async createResponse(response: Omit<ItemResponse, 'id' | 'created_at'>): Promise<ItemResponse> {
    const { data, error } = await supabase
      .from('item_responses')
      .insert(response)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateResponse(id: string, updates: Partial<ItemResponse>): Promise<ItemResponse> {
    const { data, error } = await supabase
      .from('item_responses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getParticipantCount(studyId: string, excludeAdmin = false): Promise<number> {
    let query = supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('study_id', studyId);

    if (excludeAdmin) {
      query = query.neq('role', 'admin');
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  async getProposalCount(studyId: string, status?: string): Promise<number> {
    let query = supabase
      .from('proposals')
      .select('id', { count: 'exact', head: true })
      .eq('study_id', studyId);

    if (status) {
      query = query.eq('status', status);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  async getItemCount(studyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('delphi_items')
      .select('id', { count: 'exact', head: true })
      .eq('study_id', studyId);

    if (error) throw error;
    return count || 0;
  }

  async getResponseCount(itemId: string): Promise<number> {
    const { count, error } = await supabase
      .from('item_responses')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId);

    if (error) throw error;
    return count || 0;
  }

  async exportData(): Promise<BackupData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const studies = await this.getStudies();
    const allDomains: StudyDomain[] = [];
    const allQuestions: ProposalQuestion[] = [];
    const allParticipants: Participant[] = [];
    const allProposals: Proposal[] = [];
    const allItems: DelphiItem[] = [];
    const allResponses: ItemResponse[] = [];

    for (const study of studies) {
      const domains = await this.getDomains(study.id);
      const questions = await this.getQuestions(study.id);
      const participants = await this.getParticipants(study.id);
      const proposals = await this.getProposals(study.id);
      const items = await this.getItems(study.id);
      const responses = await this.getResponses(study.id);

      allDomains.push(...domains);
      allQuestions.push(...questions);
      allParticipants.push(...participants);
      allProposals.push(...proposals);
      allItems.push(...items);
      allResponses.push(...responses);
    }

    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      storage_mode: 'supabase',
      data: {
        studies,
        domains: allDomains,
        questions: allQuestions,
        participants: allParticipants,
        proposals: allProposals,
        items: allItems,
        responses: allResponses,
      },
    };
  }

  async importData(backup: BackupData): Promise<void> {
    throw new Error('Import not supported in Supabase mode - data already in cloud');
  }
}

export class SupabaseAuthAdapter implements AuthAdapter {
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email || '' };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign in failed');

    return { id: data.user.id, email: data.user.email || '' };
  }

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');

    return { id: data.user.id, email: data.user.email || '' };
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback: (user: { id: string; email: string } | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          callback({ id: session.user.id, email: session.user.email || '' });
        } else {
          callback(null);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}
