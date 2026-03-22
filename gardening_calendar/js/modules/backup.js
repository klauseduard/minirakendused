/**
 * Backup Module for Gardening Calendar
 * Unified export/import of all app data as a .zip file
 */

import {
    getJournalEntries, saveJournalEntries,
    getCustomEntries, importCustomEntries,
    getSelectedItems, getCustomPeriods,
    getTodoItems, saveTodoItems,
    getTemperatureUnit, saveTemperatureUnit,
    getPrecipitationUnit, savePrecipitationUnit,
    getWindUnit, saveWindUnit,
    getLastLocation, saveLastLocation,
    getClimateZoneOverride, saveClimateZoneOverride,
    getLanguage, saveLanguage,
    STORAGE_KEYS
} from './storage.js';
import * as photoStorage from './photo-storage.js';
import { showOptionsModal, showNotification } from './ui.js';

const BACKUP_REMINDER_DAYS = 30;
const LAST_BACKUP_KEY = 'gardening_last_backup';
const REMINDER_DISMISSED_KEY = 'backup_reminder_dismissed';
const BUILTIN_ORDER_KEY = 'gardenCal_builtinPeriodOrders';

/**
 * Initialize backup module: wire up buttons and check reminder
 */
export function initBackup() {
    const exportBtn = document.getElementById('exportAllBtn');
    const importBtn = document.getElementById('importAllBtn');

    if (exportBtn) {
        exportBtn.addEventListener('click', showExportOptions);
    }
    if (importBtn) {
        importBtn.addEventListener('click', triggerImport);
    }

    checkBackupReminder();
}

// ─── Export ──────────────────────────────────────────────────

function showExportOptions() {
    showOptionsModal(
        'Export All Data',
        'Choose how to export your garden planner data:',
        [
            {
                icon: '📷',
                title: 'Complete Backup',
                description: 'All data including photos (larger file)',
                onClick: () => exportAll(true)
            },
            {
                icon: '📝',
                title: 'Lightweight Backup',
                description: 'All data without photos (smaller file)',
                onClick: () => exportAll(false)
            }
        ]
    );
}

async function exportAll(includePhotos) {
    try {
        showNotification('Preparing backup...', 'info');

        const zip = new JSZip();

        // 1. Manifest
        const journal = getJournalEntries();
        const customEntries = getCustomEntries();
        const customPeriods = getCustomPeriods();
        const todoItems = getTodoItems();
        const selectedItems = getSelectedItems();

        const manifest = {
            version: 1,
            exportDate: new Date().toISOString(),
            app: 'garden-planner',
            stats: {
                journalEntries: journal.length,
                customPlants: customEntries.plants?.length || 0,
                customTasks: customEntries.tasks?.length || 0,
                todoItems: todoItems.length,
                includesPhotos: includePhotos
            }
        };
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        // 2. Settings
        const settings = {
            temperatureUnit: getTemperatureUnit(),
            precipitationUnit: getPrecipitationUnit(),
            windUnit: getWindUnit(),
            lastLocation: getLastLocation(),
            climateZoneOverride: getClimateZoneOverride(),
            language: getLanguage(),
            activePeriod: localStorage.getItem('gardening_active_period') || null,
            builtinPeriodOrders: localStorage.getItem(BUILTIN_ORDER_KEY)
                ? JSON.parse(localStorage.getItem(BUILTIN_ORDER_KEY))
                : null,
            onboardingDismissed: localStorage.getItem('onboarding-dismissed') || null
        };
        zip.file('settings.json', JSON.stringify(settings, null, 2));

        // 3. Journal entries (strip imageIds references — photos are separate)
        zip.file('journal.json', JSON.stringify(journal, null, 2));

        // 4. Custom entries + periods
        const customExport = {
            plants: customEntries.plants || [],
            tasks: customEntries.tasks || [],
            customPeriods: customPeriods.periods || []
        };
        zip.file('custom-entries.json', JSON.stringify(customExport, null, 2));

        // 5. TODO items
        zip.file('todo.json', JSON.stringify(todoItems, null, 2));

        // 6. Selected items
        zip.file('selected-items.json', JSON.stringify(selectedItems, null, 2));

        // 7. Photos
        if (includePhotos) {
            const allPhotos = await photoStorage.getAllPhotosRaw();
            if (allPhotos && allPhotos.length > 0) {
                const photosFolder = zip.folder('photos');
                for (const photo of allPhotos) {
                    photosFolder.file(`${photo.id}.json`, JSON.stringify({
                        id: photo.id,
                        entryId: photo.entryId,
                        data: photo.data,
                        thumbnail: photo.thumbnail
                    }));
                }
                manifest.stats.photos = allPhotos.length;
                // Re-write manifest with photo count
                zip.file('manifest.json', JSON.stringify(manifest, null, 2));
            }
        }

        // Generate and download
        const blob = await zip.generateAsync({ type: 'blob' });
        const date = new Date().toISOString().slice(0, 10);
        const filename = `garden-planner-backup-${date}.zip`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Record backup timestamp
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());

        // Dismiss any visible reminder
        const banner = document.getElementById('backupReminder');
        if (banner) banner.remove();

        showNotification('Backup exported successfully!', 'success');
    } catch (err) {
        console.error('Backup export failed:', err);
        showNotification('Export failed: ' + err.message, 'error');
    }
}

// ─── Import ─────────────────────────────────────────────────

function triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.name.endsWith('.json')) {
            await handleLegacyJson(file);
        } else {
            await handleZipImport(file);
        }
    };
    input.click();
}

async function handleZipImport(file) {
    try {
        const zip = await JSZip.loadAsync(file);

        // Validate manifest
        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
            showNotification('Invalid backup file: missing manifest', 'error');
            return;
        }

        const manifest = JSON.parse(await manifestFile.async('string'));
        if (manifest.app !== 'garden-planner') {
            showNotification('This file is not a Garden Planner backup', 'error');
            return;
        }

        // Build summary for the user
        const stats = manifest.stats || {};
        const summary = [
            stats.journalEntries ? `${stats.journalEntries} journal entries` : null,
            stats.customPlants || stats.customTasks
                ? `${(stats.customPlants || 0) + (stats.customTasks || 0)} custom entries`
                : null,
            stats.todoItems ? `${stats.todoItems} tasks` : null,
            stats.photos ? `${stats.photos} photos` : null
        ].filter(Boolean).join(', ');

        showOptionsModal(
            'Import Backup',
            `Backup from ${new Date(manifest.exportDate).toLocaleDateString()}:\n${summary || 'No data found'}`,
            [
                {
                    icon: '♻️',
                    title: 'Replace All',
                    description: 'Clear current data and restore from backup',
                    onClick: () => applyZipImport(zip, 'replace')
                },
                {
                    icon: '🔄',
                    title: 'Merge',
                    description: 'Add new items, update matching ones by ID',
                    onClick: () => applyZipImport(zip, 'merge')
                }
            ]
        );
    } catch (err) {
        console.error('Zip import failed:', err);
        showNotification('Failed to read backup file: ' + err.message, 'error');
    }
}

async function applyZipImport(zip, mode) {
    try {
        showNotification('Importing...', 'info');
        const isReplace = mode === 'replace';

        // ── 1. Settings ──
        const settingsFile = zip.file('settings.json');
        if (settingsFile) {
            const settings = JSON.parse(await settingsFile.async('string'));
            // Settings are always overwritten (both modes)
            if (settings.temperatureUnit) saveTemperatureUnit(settings.temperatureUnit);
            if (settings.precipitationUnit) savePrecipitationUnit(settings.precipitationUnit);
            if (settings.windUnit) saveWindUnit(settings.windUnit);
            if (settings.lastLocation) saveLastLocation(settings.lastLocation);
            if (settings.climateZoneOverride) {
                saveClimateZoneOverride(settings.climateZoneOverride);
            }
            if (settings.language) saveLanguage(settings.language);
            if (settings.activePeriod) {
                localStorage.setItem('gardening_active_period', settings.activePeriod);
            }
            if (settings.builtinPeriodOrders) {
                localStorage.setItem(BUILTIN_ORDER_KEY, JSON.stringify(settings.builtinPeriodOrders));
            }
            if (settings.onboardingDismissed) {
                localStorage.setItem('onboarding-dismissed', settings.onboardingDismissed);
            }
        }

        // ── 2. Journal ──
        const journalFile = zip.file('journal.json');
        if (journalFile) {
            const importedJournal = JSON.parse(await journalFile.async('string'));
            if (isReplace) {
                saveJournalEntries(importedJournal);
            } else {
                const existing = getJournalEntries();
                const merged = mergeById(existing, importedJournal);
                saveJournalEntries(merged);
            }
        }

        // ── 3. Custom entries ──
        const customFile = zip.file('custom-entries.json');
        if (customFile) {
            const importData = JSON.parse(await customFile.async('string'));
            importCustomEntries(importData, isReplace);
        }

        // ── 4. TODO ──
        const todoFile = zip.file('todo.json');
        if (todoFile) {
            const importedTodo = JSON.parse(await todoFile.async('string'));
            if (isReplace) {
                saveTodoItems(importedTodo);
            } else {
                const existing = getTodoItems();
                const merged = mergeById(existing, importedTodo);
                saveTodoItems(merged);
            }
        }

        // ── 5. Selected items ──
        const selectionsFile = zip.file('selected-items.json');
        if (selectionsFile) {
            const importedSelections = JSON.parse(await selectionsFile.async('string'));
            if (isReplace) {
                localStorage.setItem(STORAGE_KEYS.SELECTED_ITEMS, JSON.stringify(importedSelections));
            } else {
                const existing = getSelectedItems();
                const merged = mergeSelections(existing, importedSelections);
                localStorage.setItem(STORAGE_KEYS.SELECTED_ITEMS, JSON.stringify(merged));
            }
        }

        // ── 6. Photos ──
        const photosFolder = zip.folder('photos');
        const photoFiles = [];
        photosFolder.forEach((relativePath, file) => {
            if (relativePath.endsWith('.json')) {
                photoFiles.push(file);
            }
        });

        if (photoFiles.length > 0) {
            if (isReplace) {
                await photoStorage.clearAllPhotos();
            }

            for (const file of photoFiles) {
                const photoData = JSON.parse(await file.async('string'));
                // Import each photo individually
                await photoStorage.importPhotos(photoData.entryId, [{
                    data: photoData.data,
                    thumbnail: photoData.thumbnail
                }]);
            }
        } else if (isReplace) {
            await photoStorage.clearAllPhotos();
        }

        // Record backup timestamp
        localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());

        showNotification('Import complete! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        console.error('Import failed:', err);
        showNotification('Import failed: ' + err.message, 'error');
    }
}

// ─── Legacy JSON import ─────────────────────────────────────

async function handleLegacyJson(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Detect format
        if (Array.isArray(data)) {
            // Journal entries (array of objects with id, date, type, notes, etc.)
            await legacyJournalImport(data);
        } else if (data.type === 'garden_planner_todo' && Array.isArray(data.items)) {
            // TODO export
            await legacyTodoImport(data.items);
        } else if (data.plants || data.tasks) {
            // Custom entries export
            legacyCustomImport(data);
        } else {
            showNotification('Unrecognized file format', 'error');
        }
    } catch (err) {
        console.error('Legacy import failed:', err);
        showNotification('Failed to read file: ' + err.message, 'error');
    }
}

async function legacyJournalImport(importData) {
    // Migrate inline images to IndexedDB
    for (const entry of importData) {
        if (entry.images && Array.isArray(entry.images) && entry.images.length > 0) {
            try {
                const photoIds = await photoStorage.importPhotos(entry.id, entry.images);
                entry.imageIds = photoIds;
                delete entry.images;
            } catch (e) {
                console.warn(`Legacy import: failed to save photos for entry ${entry.id}`, e);
            }
        }
    }

    const count = importData.length;
    showOptionsModal(
        'Import Journal',
        `Found ${count} journal ${count === 1 ? 'entry' : 'entries'} to import.`,
        [
            {
                icon: '🔄',
                title: 'Merge',
                description: 'Add new entries and update existing ones',
                onClick: () => {
                    const existing = getJournalEntries();
                    saveJournalEntries(mergeById(existing, importData));
                    showNotification('Journal entries merged', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            },
            {
                icon: '♻️',
                title: 'Replace All',
                description: 'Delete all existing entries and use imported ones',
                onClick: () => {
                    saveJournalEntries(importData);
                    showNotification('Journal entries replaced', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            }
        ]
    );
}

async function legacyTodoImport(importItems) {
    // Migrate inline images to IndexedDB
    for (const item of importItems) {
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
            try {
                const photoIds = await photoStorage.importPhotos(item.id, item.images);
                item.imageIds = photoIds;
                delete item.images;
            } catch (e) {
                console.warn(`Legacy import: failed to save photos for ${item.id}`, e);
            }
        }
    }

    const count = importItems.length;
    showOptionsModal(
        'Import TODO',
        `Found ${count} task${count === 1 ? '' : 's'} to import.`,
        [
            {
                icon: '🔄',
                title: 'Merge',
                description: 'Add new tasks and update existing ones',
                onClick: () => {
                    const existing = getTodoItems();
                    saveTodoItems(mergeById(existing, importItems));
                    showNotification('Tasks merged', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            },
            {
                icon: '♻️',
                title: 'Replace All',
                description: 'Delete all existing tasks and use imported ones',
                onClick: () => {
                    saveTodoItems(importItems);
                    showNotification('Tasks replaced', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            }
        ]
    );
}

function legacyCustomImport(importData) {
    const plantCount = importData.plants?.length || 0;
    const taskCount = importData.tasks?.length || 0;

    showOptionsModal(
        'Import Custom Entries',
        `Found ${plantCount} plants and ${taskCount} tasks to import.`,
        [
            {
                icon: '🔄',
                title: 'Merge',
                description: 'Add new entries and update existing ones',
                onClick: () => {
                    importCustomEntries(importData, false);
                    showNotification('Custom entries merged', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            },
            {
                icon: '♻️',
                title: 'Replace All',
                description: 'Delete all existing entries and use imported ones',
                onClick: () => {
                    importCustomEntries(importData, true);
                    showNotification('Custom entries replaced', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            }
        ]
    );
}

// ─── Backup Reminder ────────────────────────────────────────

function checkBackupReminder() {
    // Don't show if dismissed this session
    if (sessionStorage.getItem(REMINDER_DISMISSED_KEY)) return;

    // Don't show if no data at all
    const journal = getJournalEntries();
    const custom = getCustomEntries();
    const todo = getTodoItems();
    const hasData = journal.length > 0
        || (custom.plants && custom.plants.length > 0)
        || (custom.tasks && custom.tasks.length > 0)
        || todo.length > 0;
    if (!hasData) return;

    // Check last backup date
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    if (lastBackup) {
        const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < BACKUP_REMINDER_DAYS) return;
    }

    // Show reminder banner
    const banner = document.createElement('div');
    banner.id = 'backupReminder';
    banner.className = 'backup-reminder';
    banner.innerHTML = `
        <span class="backup-reminder-text">
            <span class="icon-size-sm">💾</span>
            ${lastBackup
                ? `It's been over 30 days since your last backup.`
                : `You haven't backed up your garden data yet.`}
            Consider exporting a backup.
        </span>
        <div class="backup-reminder-actions">
            <button id="backupReminderExport" class="backup-reminder-btn backup-reminder-btn--export">Export Now</button>
            <button id="backupReminderDismiss" class="backup-reminder-btn backup-reminder-btn--dismiss">Dismiss</button>
        </div>
    `;

    const footer = document.querySelector('footer');
    if (footer) {
        footer.parentNode.insertBefore(banner, footer);
    }

    document.getElementById('backupReminderExport')?.addEventListener('click', () => {
        banner.remove();
        showExportOptions();
    });

    document.getElementById('backupReminderDismiss')?.addEventListener('click', () => {
        banner.remove();
        sessionStorage.setItem(REMINDER_DISMISSED_KEY, 'true');
    });
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Merge two arrays by ID: existing items updated, new items appended
 */
function mergeById(existing, incoming) {
    const merged = [...existing];
    for (const item of incoming) {
        const idx = merged.findIndex(e => e.id === item.id);
        if (idx >= 0) {
            merged[idx] = item;
        } else {
            merged.push(item);
        }
    }
    return merged;
}

/**
 * Merge selected items: union categories per period
 */
function mergeSelections(existing, incoming) {
    const result = JSON.parse(JSON.stringify(existing));
    for (const period in incoming) {
        if (!result[period]) {
            result[period] = incoming[period];
            continue;
        }
        for (const category in incoming[period]) {
            if (!result[period][category]) {
                result[period][category] = incoming[period][category];
                continue;
            }
            // Union by stringified comparison
            const existingSet = new Set(result[period][category].map(i => JSON.stringify(i)));
            for (const item of incoming[period][category]) {
                const key = JSON.stringify(item);
                if (!existingSet.has(key)) {
                    result[period][category].push(item);
                    existingSet.add(key);
                }
            }
        }
    }
    return result;
}
