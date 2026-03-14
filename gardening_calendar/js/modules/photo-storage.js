/**
 * Photo Storage Module for Gardening Calendar
 * Stores journal photos in IndexedDB instead of localStorage to avoid the ~5MB limit.
 *
 * IndexedDB database: 'gardening-photos', version 1
 * Object store: 'photos' with keyPath 'id', indexed by 'entryId'
 *
 * Each photo record: { id, entryId, data (base64), thumbnail (base64), created }
 */

const DB_NAME = 'gardening-photos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

/** @type {IDBDatabase|null} */
let db = null;

/**
 * Open or create the IndexedDB database.
 * Must be called once at app startup before any other photo-storage functions.
 * @returns {Promise<IDBDatabase>}
 */
export function initPhotoStorage() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('entryId', 'entryId', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Photo storage (IndexedDB) initialized');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Failed to open photo storage:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Get the database, initializing if needed.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
    if (db) return Promise.resolve(db);
    return initPhotoStorage();
}

/**
 * Wrap an IDBRequest in a Promise.
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Wrap an IDBTransaction completion in a Promise.
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function promisifyTransaction(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
}

/**
 * Save photos for a journal entry to IndexedDB.
 * @param {string} entryId - The journal entry ID
 * @param {Array<{data: string, thumbnail: string}>} photos - Array of photo objects with base64 data
 * @returns {Promise<string[]>} Array of generated photo IDs
 */
export async function savePhotos(entryId, photos) {
    if (!photos || photos.length === 0) return [];

    const database = await getDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const timestamp = Date.now();

    const photoIds = [];

    photos.forEach((photo, index) => {
        const id = `photo-${timestamp}-${index}`;
        const record = {
            id,
            entryId,
            data: photo.data || '',
            thumbnail: photo.thumbnail || photo.data || '',
            created: timestamp
        };
        store.put(record);
        photoIds.push(id);
    });

    await promisifyTransaction(tx);
    return photoIds;
}

/**
 * Get all photos for a journal entry from IndexedDB.
 * @param {string} entryId - The journal entry ID
 * @returns {Promise<Array<{id: string, entryId: string, data: string, thumbnail: string, created: number}>>}
 */
export async function getPhotos(entryId) {
    const database = await getDB();
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('entryId');

    const result = await promisifyRequest(index.getAll(entryId));
    return result || [];
}

/**
 * Delete all photos for a journal entry from IndexedDB.
 * @param {string} entryId - The journal entry ID
 * @returns {Promise<void>}
 */
export async function deletePhotos(entryId) {
    const database = await getDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('entryId');

    // Get all photo keys for this entry
    const keys = await promisifyRequest(index.getAllKeys(entryId));

    // Delete each photo
    for (const key of keys) {
        store.delete(key);
    }

    await promisifyTransaction(tx);
}

/**
 * Get all photos grouped by entryId, for export purposes.
 * @returns {Promise<Map<string, Array<{data: string, thumbnail: string}>>>}
 */
export async function getAllPhotosForExport() {
    const database = await getDB();
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const allPhotos = await promisifyRequest(store.getAll());
    const photoMap = new Map();

    for (const photo of allPhotos) {
        if (!photoMap.has(photo.entryId)) {
            photoMap.set(photo.entryId, []);
        }
        photoMap.get(photo.entryId).push({
            data: photo.data,
            thumbnail: photo.thumbnail
        });
    }

    return photoMap;
}

/**
 * Bulk import photos for a journal entry (used during journal import).
 * @param {string} entryId - The journal entry ID
 * @param {Array<{data: string, thumbnail: string}|string>} photos - Array of photo objects or base64 strings
 * @returns {Promise<string[]>} Array of generated photo IDs
 */
export async function importPhotos(entryId, photos) {
    if (!photos || photos.length === 0) return [];

    // Normalize photos: handle both string format and object format
    const normalizedPhotos = photos.map(photo => {
        if (typeof photo === 'string') {
            return { data: photo, thumbnail: photo };
        }
        return {
            data: photo.data || photo.thumbnail || '',
            thumbnail: photo.thumbnail || photo.data || ''
        };
    });

    return savePhotos(entryId, normalizedPhotos);
}

/**
 * ONE-TIME migration: reads journal entries from localStorage, extracts inline images,
 * saves them to IndexedDB, updates the entries in localStorage to have imageIds instead
 * of images, and saves back.
 *
 * Only runs if entries still have inline `images` arrays with base64 data.
 * Safe to call multiple times -- it's a no-op if migration is already done.
 *
 * @returns {Promise<{migrated: number, skipped: number}>}
 */
export async function migrateFromLocalStorage() {
    const JOURNAL_STORAGE_KEY = 'gardening_journal_entries';
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);

    if (!raw) {
        console.log('Photo migration: no journal entries found, nothing to migrate');
        return { migrated: 0, skipped: 0 };
    }

    let entries;
    try {
        entries = JSON.parse(raw);
    } catch (e) {
        console.error('Photo migration: failed to parse journal entries', e);
        return { migrated: 0, skipped: 0 };
    }

    if (!Array.isArray(entries)) {
        return { migrated: 0, skipped: 0 };
    }

    // Check if any entries still have inline images that need migration
    const entriesToMigrate = entries.filter(entry =>
        entry.images && Array.isArray(entry.images) && entry.images.length > 0
    );

    if (entriesToMigrate.length === 0) {
        console.log('Photo migration: no entries with inline images, migration not needed');
        return { migrated: 0, skipped: 0 };
    }

    console.log(`Photo migration: migrating ${entriesToMigrate.length} entries with inline images to IndexedDB`);

    let migrated = 0;
    let skipped = 0;

    for (const entry of entries) {
        if (!entry.images || !Array.isArray(entry.images) || entry.images.length === 0) {
            skipped++;
            continue;
        }

        try {
            // Save images to IndexedDB
            const photoIds = await importPhotos(entry.id, entry.images);

            // Replace images with imageIds in the entry
            entry.imageIds = photoIds;
            delete entry.images;

            migrated++;
        } catch (e) {
            console.error(`Photo migration: failed to migrate entry ${entry.id}`, e);
            // Leave the entry as-is with inline images so it still works
            skipped++;
        }
    }

    // Save the updated entries back to localStorage (now much smaller without base64 images)
    try {
        localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
        console.log(`Photo migration complete: ${migrated} entries migrated, ${skipped} skipped`);
    } catch (e) {
        console.error('Photo migration: failed to save updated entries to localStorage', e);
    }

    return { migrated, skipped };
}
