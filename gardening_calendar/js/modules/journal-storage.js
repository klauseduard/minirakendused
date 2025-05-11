/**
 * Journal Storage Module
 * Handles persistence of journal entries.
 * Provides a clean API for storage operations.
 */

// Import from storage.js (where actual storage functions currently live)
import { saveJournalEntries, getJournalEntries } from './storage.js';

// Re-export the storage functions
export { saveJournalEntries, getJournalEntries };

// Future functions for cloud sync, backup, etc. will be added here 