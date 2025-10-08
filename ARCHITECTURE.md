# Delphi Study App - Architecture Documentation

## Overview

This application is designed for a **hybrid storage approach** that will eventually become a local-first desktop application packaged with Tauri.

**Current State:** Phase 1 - Abstraction layer implemented, Supabase mode active
**Future State:** Phase 3 - Tauri desktop app with encrypted SQLite (SQLCipher)

---

## Storage Architecture

### Abstraction Layer

All data operations go through a unified `DataStoreAdapter` interface. This allows swapping between storage backends without changing UI code.

**Location:** `/lib/data-store/`

```
lib/data-store/
├── types.ts              # TypeScript interfaces for all adapters
├── supabase-adapter.ts   # Cloud storage implementation (current default)
├── local-adapter.ts      # IndexedDB implementation (Phase 2/3)
└── index.ts              # Factory pattern & storage mode switching
```

### Storage Modes

- **`supabase`** (default) - Cloud-based storage using Supabase
- **`local`** (disabled in Phase 1) - Browser-based IndexedDB storage

Storage mode is determined by:
1. `localStorage.getItem('storage_mode')` in browser
2. Falls back to `'supabase'` if not set

---

## Phase Roadmap

### Phase 1: Abstraction Layer ✅ (Current)

**Goal:** Introduce adapter pattern while keeping Supabase functionality intact

**Completed:**
- ✅ Created `DataStoreAdapter` interface
- ✅ Wrapped all Supabase calls in `SupabaseDataAdapter`
- ✅ Created `LocalDataAdapter` stub with IndexedDB
- ✅ Storage mode configuration (`STORAGE_MODE = "supabase" | "local"`)
- ✅ Export/Import JSON backup structure

**Next Steps:**
- Update all UI components to use `getDataStore()` instead of direct Supabase calls
- Add Settings UI for storage mode selection (local disabled for now)
- Add Backup/Restore UI placeholders

**Definition of Done:**
- All data reads/writes go through `DataStoreAdapter`
- App still works exactly the same with Supabase
- "Backup/Restore" UI is present (even if disabled)

---

### Phase 2: Prove Offline Flow (Next Week)

**Goal:** Enable and test local mode for a complete offline flow

**Tasks:**
- Enable local mode with a dev flag
- Test create study → add items → responses → export/import
- Add Unlock screen (stub passphrase UI)

**Definition of Done:**
- Can run app with `STORAGE_MODE=local`
- Complete a small Delphi study flow offline
- Export/import JSON backup works

---

### Phase 3: Tauri + Encrypted DB (Later)

**Goal:** Package as desktop app with encrypted local storage

**Tasks:**
- Add Tauri shell
- Replace IndexedDB with SQLCipher (encrypted SQLite)
- Store DB encryption key in OS keychain:
  - macOS: Keychain
  - Windows: Credential Manager
  - Linux: Secret Service
- Passphrase unlocks DB access
- Keep same `DataStoreAdapter` interface

**Definition of Done:**
- Desktop app packaged with Tauri
- Data encrypted at rest with SQLCipher
- OS keychain integration
- No cloud dependencies (fully offline-capable)

---

## Data Models

### Core Entities

```typescript
Study              # Top-level research study
├── StudyDomain    # Domain categories for proposals
├── ProposalQuestion  # Questions participants answer
├── Participant    # Study participants (admin + participants)
├── Proposal       # Initial proposals from participants
├── DelphiItem     # Consensus items for rating rounds
└── ItemResponse   # Participant ratings on items
```

### Backup Format

```typescript
{
  version: "1.0.0",
  exported_at: "ISO timestamp",
  storage_mode: "supabase" | "local",
  data: {
    studies: Study[],
    domains: StudyDomain[],
    questions: ProposalQuestion[],
    participants: Participant[],
    proposals: Proposal[],
    items: DelphiItem[],
    responses: ItemResponse[]
  }
}
```

---

## Usage

### In UI Components

**Before (direct Supabase):**
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('studies')
  .select('*');
```

**After (abstracted):**
```typescript
import { getDataStore } from '@/lib/data-store';

const dataStore = getDataStore();
const studies = await dataStore.getStudies();
```

### Storage Mode Switching

```typescript
import { getStorageMode, setStorageMode, isLocalMode } from '@/lib/data-store';

// Check current mode
const mode = getStorageMode(); // 'supabase' | 'local'
const offline = isLocalMode(); // boolean

// Switch mode (reloads page)
setStorageMode('local');
```

### Backup & Restore

```typescript
import { getDataStore } from '@/lib/data-store';

const dataStore = getDataStore();

// Export all data
const backup = await dataStore.exportData();
const json = JSON.stringify(backup, null, 2);
// Download as file

// Import from backup
const backup = JSON.parse(fileContents);
await dataStore.importData(backup);
```

---

## Authentication

Auth is also abstracted through `AuthAdapter`:

```typescript
import { getAuthAdapter } from '@/lib/data-store';

const auth = getAuthAdapter();

// Sign in
const user = await auth.signIn(email, password);

// Get current user
const user = await auth.getCurrentUser();

// Listen for auth changes
const unsubscribe = auth.onAuthStateChange((user) => {
  console.log('User changed:', user);
});
```

---

## Security Notes

### Phase 1 (Current - Supabase Mode)
- Auth handled by Supabase Auth
- Row Level Security (RLS) policies enforce data access
- Data transmitted over HTTPS

### Phase 2 (Local Mode - IndexedDB)
- **No encryption yet** - plaintext in browser IndexedDB
- Auth is stubbed (no real authentication)
- Data stays in browser only

### Phase 3 (Tauri - SQLCipher)
- **Encrypted at rest** with SQLCipher
- Encryption key stored in OS keychain
- Passphrase required to unlock DB
- No network access required

**⚠️ WARNING:** Phase 2 local mode is NOT secure. Do not use for sensitive data until Phase 3 is complete.

---

## File Paths & Storage Locations

### Current (Browser)
- **Supabase mode:** Cloud storage (PostgreSQL)
- **Local mode:** Browser IndexedDB (`delphi_local_db`)

### Future (Tauri Desktop)
```
# to be replaced with Tauri file API

macOS:    ~/Library/Application Support/com.delphi.app/
Windows:  %APPDATA%/Delphi/
Linux:    ~/.local/share/delphi/

└── data/
    └── delphi.db (SQLCipher encrypted)
```

---

## Migration Path

### Supabase → Local Migration

1. Export data from Supabase mode:
   ```typescript
   const backup = await dataStore.exportData(); // storage_mode: 'supabase'
   ```

2. Switch to local mode:
   ```typescript
   setStorageMode('local');
   ```

3. Import data:
   ```typescript
   await dataStore.importData(backup);
   ```

### Local → Tauri Migration (Phase 3)

- Replace `LocalDataAdapter` with `TauriSQLiteAdapter`
- Keep same `DataStoreAdapter` interface
- UI code remains unchanged
- Add Rust backend for file I/O and keychain access

---

## Code Comments

Throughout the codebase, you'll see comments like:

```typescript
// TODO (Phase 3): Replace with Tauri file API
// TODO (Phase 3): Use SQLCipher for encryption
// STUB: Passphrase UI - no encryption yet
```

These mark areas that will change during desktop packaging.

---

## API Routes (AI Features)

Current AI features use Next.js API routes:

- `/api/ai/cluster` - Cluster proposals
- `/api/ai/suggest` - Generate suggestions
- `/api/ai/summarise` - Summarize responses

**Phase 3 Note:** These will need to be optional or replaced with local AI models for fully offline operation.

---

## Testing Strategy

### Phase 1
- Verify Supabase mode still works after refactor
- Test all CRUD operations through adapters

### Phase 2
- Test full Delphi flow in local mode
- Verify export/import data integrity
- Test switching between modes

### Phase 3
- Test encryption/decryption
- Test keychain integration on all platforms
- Test offline operation
- Stress test with large datasets

---

## Future Enhancements

- **Automatic backups** - Scheduled exports to user-chosen location
- **Sync between devices** - Optional peer-to-peer or self-hosted sync
- **Conflict resolution** - Merge strategies for simultaneous edits
- **Audit log** - Track all changes for research integrity
- **Plugin system** - Custom analysis or export formats

---

## Questions?

This architecture supports:
- ✅ Full offline operation
- ✅ Data portability (JSON export/import)
- ✅ Encrypted local storage (Phase 3)
- ✅ Cross-platform desktop app (Phase 3)
- ✅ No vendor lock-in
- ✅ Privacy-first design

For implementation details, see adapter files in `/lib/data-store/`.
