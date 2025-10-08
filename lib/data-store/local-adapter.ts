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

const DB_NAME = 'delphi_local_db';
const DB_VERSION = 1;

const STORES = {
  studies: 'studies',
  domains: 'domains',
  questions: 'questions',
  participants: 'participants',
  proposals: 'proposals',
  items: 'items',
  responses: 'responses',
  auth: 'auth',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.studies)) {
        db.createObjectStore(STORES.studies, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.domains)) {
        const domainStore = db.createObjectStore(STORES.domains, { keyPath: 'id' });
        domainStore.createIndex('study_id', 'study_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.questions)) {
        const questionStore = db.createObjectStore(STORES.questions, { keyPath: 'id' });
        questionStore.createIndex('study_id', 'study_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.participants)) {
        const participantStore = db.createObjectStore(STORES.participants, { keyPath: 'id' });
        participantStore.createIndex('study_id', 'study_id', { unique: false });
        participantStore.createIndex('email', 'email', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.proposals)) {
        const proposalStore = db.createObjectStore(STORES.proposals, { keyPath: 'id' });
        proposalStore.createIndex('question_id', 'question_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.items)) {
        const itemStore = db.createObjectStore(STORES.items, { keyPath: 'id' });
        itemStore.createIndex('study_id', 'study_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.responses)) {
        const responseStore = db.createObjectStore(STORES.responses, { keyPath: 'id' });
        responseStore.createIndex('item_id', 'item_id', { unique: false });
        responseStore.createIndex('participant_id', 'participant_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.auth)) {
        db.createObjectStore(STORES.auth, { keyPath: 'key' });
      }
    };
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class LocalDataAdapter implements DataStoreAdapter {
  private async getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOne<T>(storeName: string, id: string): Promise<T | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async put<T>(storeName: string, item: T): Promise<T> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStudies(): Promise<Study[]> {
    const studies = await this.getAll<Study>(STORES.studies);
    return studies.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getStudy(id: string): Promise<Study | null> {
    return this.getOne<Study>(STORES.studies, id);
  }

  async createStudy(study: Omit<Study, 'id' | 'created_at'>): Promise<Study> {
    const newStudy: Study = {
      ...study,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.studies, newStudy);
  }

  async updateStudy(id: string, updates: Partial<Study>): Promise<Study> {
    const existing = await this.getOne<Study>(STORES.studies, id);
    if (!existing) throw new Error('Study not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.studies, updated);
  }

  async deleteStudy(id: string): Promise<void> {
    return this.delete(STORES.studies, id);
  }

  async getDomains(studyId: string): Promise<StudyDomain[]> {
    const domains = await this.getByIndex<StudyDomain>(STORES.domains, 'study_id', studyId);
    return domains.sort((a, b) => a.display_order - b.display_order);
  }

  async createDomain(domain: Omit<StudyDomain, 'id' | 'created_at'>): Promise<StudyDomain> {
    const newDomain: StudyDomain = {
      ...domain,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.domains, newDomain);
  }

  async updateDomain(id: string, updates: Partial<StudyDomain>): Promise<StudyDomain> {
    const existing = await this.getOne<StudyDomain>(STORES.domains, id);
    if (!existing) throw new Error('Domain not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.domains, updated);
  }

  async deleteDomain(id: string): Promise<void> {
    return this.delete(STORES.domains, id);
  }

  async getQuestions(studyId: string): Promise<ProposalQuestion[]> {
    const questions = await this.getByIndex<ProposalQuestion>(STORES.questions, 'study_id', studyId);
    return questions.sort((a, b) => a.display_order - b.display_order);
  }

  async createQuestion(question: Omit<ProposalQuestion, 'id' | 'created_at'>): Promise<ProposalQuestion> {
    const newQuestion: ProposalQuestion = {
      ...question,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.questions, newQuestion);
  }

  async updateQuestion(id: string, updates: Partial<ProposalQuestion>): Promise<ProposalQuestion> {
    const existing = await this.getOne<ProposalQuestion>(STORES.questions, id);
    if (!existing) throw new Error('Question not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.questions, updated);
  }

  async deleteQuestion(id: string): Promise<void> {
    return this.delete(STORES.questions, id);
  }

  async getParticipants(studyId: string, excludeAdmin = false): Promise<Participant[]> {
    let participants = await this.getByIndex<Participant>(STORES.participants, 'study_id', studyId);

    if (excludeAdmin) {
      participants = participants.filter(p => p.role !== 'admin');
    }

    return participants;
  }

  async getParticipantByEmail(studyId: string, email: string): Promise<Participant | null> {
    const participants = await this.getByIndex<Participant>(STORES.participants, 'study_id', studyId);
    return participants.find(p => p.email === email) || null;
  }

  async createParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Promise<Participant> {
    const newParticipant: Participant = {
      ...participant,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.participants, newParticipant);
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<Participant> {
    const existing = await this.getOne<Participant>(STORES.participants, id);
    if (!existing) throw new Error('Participant not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.participants, updated);
  }

  async deleteParticipant(id: string): Promise<void> {
    return this.delete(STORES.participants, id);
  }

  async getProposals(studyId: string): Promise<Proposal[]> {
    const allProposals = await this.getAll<Proposal>(STORES.proposals);
    const questions = await this.getQuestions(studyId);
    const questionIds = new Set(questions.map(q => q.id));

    return allProposals.filter(p => questionIds.has(p.question_id));
  }

  async getProposalsByQuestion(questionId: string): Promise<Proposal[]> {
    return this.getByIndex<Proposal>(STORES.proposals, 'question_id', questionId);
  }

  async createProposal(proposal: Omit<Proposal, 'id' | 'created_at'>): Promise<Proposal> {
    const newProposal: Proposal = {
      ...proposal,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.proposals, newProposal);
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
    const existing = await this.getOne<Proposal>(STORES.proposals, id);
    if (!existing) throw new Error('Proposal not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.proposals, updated);
  }

  async deleteProposal(id: string): Promise<void> {
    return this.delete(STORES.proposals, id);
  }

  async getItems(studyId: string, roundNumber?: number): Promise<DelphiItem[]> {
    let items = await this.getByIndex<DelphiItem>(STORES.items, 'study_id', studyId);

    if (roundNumber !== undefined) {
      items = items.filter(item => item.round_number === roundNumber);
    }

    return items.sort((a, b) => a.display_order - b.display_order);
  }

  async createItem(item: Omit<DelphiItem, 'id' | 'created_at'>): Promise<DelphiItem> {
    const newItem: DelphiItem = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.items, newItem);
  }

  async updateItem(id: string, updates: Partial<DelphiItem>): Promise<DelphiItem> {
    const existing = await this.getOne<DelphiItem>(STORES.items, id);
    if (!existing) throw new Error('Item not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.items, updated);
  }

  async deleteItem(id: string): Promise<void> {
    return this.delete(STORES.items, id);
  }

  async getResponses(studyId: string, roundNumber?: number): Promise<ItemResponse[]> {
    const allResponses = await this.getAll<ItemResponse>(STORES.responses);
    const items = await this.getItems(studyId, roundNumber);
    const itemIds = new Set(items.map(i => i.id));

    return allResponses.filter(r => itemIds.has(r.item_id));
  }

  async getResponsesByParticipant(participantId: string, roundNumber: number): Promise<ItemResponse[]> {
    const responses = await this.getByIndex<ItemResponse>(STORES.responses, 'participant_id', participantId);
    return responses.filter(r => r.round_number === roundNumber);
  }

  async createResponse(response: Omit<ItemResponse, 'id' | 'created_at'>): Promise<ItemResponse> {
    const newResponse: ItemResponse = {
      ...response,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    return this.put(STORES.responses, newResponse);
  }

  async updateResponse(id: string, updates: Partial<ItemResponse>): Promise<ItemResponse> {
    const existing = await this.getOne<ItemResponse>(STORES.responses, id);
    if (!existing) throw new Error('Response not found');

    const updated = { ...existing, ...updates };
    return this.put(STORES.responses, updated);
  }

  async getParticipantCount(studyId: string, excludeAdmin = false): Promise<number> {
    const participants = await this.getParticipants(studyId, excludeAdmin);
    return participants.length;
  }

  async getProposalCount(studyId: string, status?: string): Promise<number> {
    let proposals = await this.getProposals(studyId);

    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }

    return proposals.length;
  }

  async getItemCount(studyId: string): Promise<number> {
    const items = await this.getItems(studyId);
    return items.length;
  }

  async getResponseCount(itemId: string): Promise<number> {
    const responses = await this.getByIndex<ItemResponse>(STORES.responses, 'item_id', itemId);
    return responses.length;
  }

  async exportData(): Promise<BackupData> {
    const studies = await this.getAll<Study>(STORES.studies);
    const domains = await this.getAll<StudyDomain>(STORES.domains);
    const questions = await this.getAll<ProposalQuestion>(STORES.questions);
    const participants = await this.getAll<Participant>(STORES.participants);
    const proposals = await this.getAll<Proposal>(STORES.proposals);
    const items = await this.getAll<DelphiItem>(STORES.items);
    const responses = await this.getAll<ItemResponse>(STORES.responses);

    return {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      storage_mode: 'local',
      data: {
        studies,
        domains,
        questions,
        participants,
        proposals,
        items,
        responses,
      },
    };
  }

  async importData(backup: BackupData): Promise<void> {
    const db = await openDB();

    const clearStore = (storeName: string) => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    };

    await clearStore(STORES.studies);
    await clearStore(STORES.domains);
    await clearStore(STORES.questions);
    await clearStore(STORES.participants);
    await clearStore(STORES.proposals);
    await clearStore(STORES.items);
    await clearStore(STORES.responses);

    for (const study of backup.data.studies) {
      await this.put(STORES.studies, study);
    }
    for (const domain of backup.data.domains) {
      await this.put(STORES.domains, domain);
    }
    for (const question of backup.data.questions) {
      await this.put(STORES.questions, question);
    }
    for (const participant of backup.data.participants) {
      await this.put(STORES.participants, participant);
    }
    for (const proposal of backup.data.proposals) {
      await this.put(STORES.proposals, proposal);
    }
    for (const item of backup.data.items) {
      await this.put(STORES.items, item);
    }
    for (const response of backup.data.responses) {
      await this.put(STORES.responses, response);
    }
  }
}

export class LocalAuthAdapter implements AuthAdapter {
  private readonly CURRENT_USER_KEY = 'current_user';

  private async getCurrentUserFromDB(): Promise<{ id: string; email: string } | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.auth, 'readonly');
      const store = transaction.objectStore(STORES.auth);
      const request = store.get(this.CURRENT_USER_KEY);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async setCurrentUserInDB(user: { id: string; email: string } | null): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.auth, 'readwrite');
      const store = transaction.objectStore(STORES.auth);

      if (user === null) {
        const request = store.delete(this.CURRENT_USER_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        const request = store.put({ key: this.CURRENT_USER_KEY, value: user });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  }

  async getCurrentUser() {
    return this.getCurrentUserFromDB();
  }

  async signIn(email: string, password: string) {
    const user = { id: generateId(), email };
    await this.setCurrentUserInDB(user);
    return user;
  }

  async signUp(email: string, password: string) {
    const user = { id: generateId(), email };
    await this.setCurrentUserInDB(user);
    return user;
  }

  async signOut() {
    await this.setCurrentUserInDB(null);
  }

  onAuthStateChange(callback: (user: { id: string; email: string } | null) => void) {
    this.getCurrentUserFromDB().then(callback);

    return () => {};
  }
}
