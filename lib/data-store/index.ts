import type { DataStoreAdapter, AuthAdapter, StorageMode } from './types';
import { SupabaseDataAdapter, SupabaseAuthAdapter } from './supabase-adapter';
import { LocalDataAdapter, LocalAuthAdapter } from './local-adapter';

export * from './types';

let storageMode: StorageMode = 'supabase';

if (typeof window !== 'undefined') {
  const savedMode = localStorage.getItem('storage_mode') as StorageMode | null;
  if (savedMode === 'local' || savedMode === 'supabase') {
    storageMode = savedMode;
  }
}

let dataStoreInstance: DataStoreAdapter | null = null;
let authAdapterInstance: AuthAdapter | null = null;

function createDataStore(): DataStoreAdapter {
  if (storageMode === 'local') {
    return new LocalDataAdapter();
  }
  return new SupabaseDataAdapter();
}

function createAuthAdapter(): AuthAdapter {
  if (storageMode === 'local') {
    return new LocalAuthAdapter();
  }
  return new SupabaseAuthAdapter();
}

export function getDataStore(): DataStoreAdapter {
  if (!dataStoreInstance) {
    dataStoreInstance = createDataStore();
  }
  return dataStoreInstance;
}

export function getAuthAdapter(): AuthAdapter {
  if (!authAdapterInstance) {
    authAdapterInstance = createAuthAdapter();
  }
  return authAdapterInstance;
}

export function getStorageMode(): StorageMode {
  return storageMode;
}

export function setStorageMode(mode: StorageMode): void {
  if (mode === storageMode) return;

  storageMode = mode;

  if (typeof window !== 'undefined') {
    localStorage.setItem('storage_mode', mode);
  }

  dataStoreInstance = createDataStore();
  authAdapterInstance = createAuthAdapter();

  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function isLocalMode(): boolean {
  return storageMode === 'local';
}

export function isSupabaseMode(): boolean {
  return storageMode === 'supabase';
}
