/**
 * TODO Module for Gardening Calendar
 * Handles task list within the Schedule section
 */

import { getTodoItems, saveTodoItems, getAllPeriods } from './storage.js';
import { createJournalEntry, fileToBase64, compressImage, generateThumbnail, showImageLightbox, renderJournal } from './journal.js';
import * as photoStorage from './photo-storage.js';
import { showConfirmDialog, showOptionsModal, showNotification } from './ui.js';

// ─── CRUD ───────────────────────────────────────────────────

function createTodoItem(data) {
    const items = getTodoItems();
    const now = new Date().toISOString();
    const newItem = {
        id: `todo_${Date.now()}`,
        text: data.text || '',
        notes: data.notes || '',
        date: data.date || '',
        period: data.period || '',
        done: false,
        imageIds: data.imageIds || [],
        created: now,
        updated: now
    };
    items.push(newItem);
    saveTodoItems(items);
    return newItem;
}

function updateTodoItem(id, data) {
    const items = getTodoItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...data, updated: new Date().toISOString() };
    saveTodoItems(items);
    return items[index];
}

async function deleteTodoItem(id) {
    const items = getTodoItems();
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length !== items.length) {
        saveTodoItems(filtered);
        try { await photoStorage.deletePhotos(id); } catch (e) { /* ignore */ }
        return true;
    }
    return false;
}

function toggleTodoComplete(id) {
    const items = getTodoItems();
    const item = items.find(item => item.id === id);
    if (!item) return null;
    item.done = !item.done;
    item.updated = new Date().toISOString();
    saveTodoItems(items);
    return item;
}

// ─── Move to Journal ────────────────────────────────────────

async function moveToJournal(todoId) {
    const items = getTodoItems();
    const todo = items.find(item => item.id === todoId);
    if (!todo) return;

    showConfirmDialog(
        'Move to Journal',
        `Convert "${todo.text}" to a journal entry? The task will be removed from your TODO list.`,
        async () => {
            // Build notes from text + notes
            let notes = todo.text;
            if (todo.notes) notes += '\n\n' + todo.notes;

            // Create journal entry
            const journalEntry = createJournalEntry({
                date: todo.date || new Date().toISOString().split('T')[0],
                type: 'task',
                notes: notes,
                plants: []
            });

            // Transfer photos
            if (todo.imageIds && todo.imageIds.length > 0) {
                try {
                    const photos = await photoStorage.getPhotos(todoId);
                    if (photos.length > 0) {
                        const photoIds = await photoStorage.savePhotos(journalEntry.id, photos);
                        // Update journal entry with photo IDs
                        const { getJournalEntries, saveJournalEntries } = await import('./storage.js');
                        const entries = getJournalEntries();
                        const idx = entries.findIndex(e => e.id === journalEntry.id);
                        if (idx !== -1) {
                            entries[idx].imageIds = photoIds;
                            saveJournalEntries(entries);
                        }
                    }
                    await photoStorage.deletePhotos(todoId);
                } catch (e) {
                    console.warn('Failed to transfer photos to journal:', e);
                }
            }

            // Remove todo item
            const remaining = items.filter(item => item.id !== todoId);
            saveTodoItems(remaining);

            renderTodoList();
            showNotification('Task moved to journal', 'success');
        },
        null,
        'Move to Journal',
        'Cancel'
    );
}

// ─── Rendering ──────────────────────────────────────────────

function renderTodoList() {
    const todoList = document.getElementById('todoList');
    const emptyState = document.getElementById('todoEmptyState');
    if (!todoList || !emptyState) return;

    const items = getTodoItems();
    const filterPeriod = document.getElementById('todoFilterPeriod')?.value || '';
    const filterStatus = document.getElementById('todoFilterStatus')?.value || 'active';

    // Filter
    let filtered = items;
    if (filterPeriod) {
        filtered = filtered.filter(item => item.period === filterPeriod);
    }
    if (filterStatus === 'active') {
        filtered = filtered.filter(item => !item.done);
    } else if (filterStatus === 'completed') {
        filtered = filtered.filter(item => item.done);
    }

    // Sort: active items by date (nulls last), done items at bottom
    filtered.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return new Date(b.created) - new Date(a.created);
    });

    if (filtered.length === 0) {
        todoList.innerHTML = '';
        emptyState.classList.remove('hidden-default');
        // Customize empty state message based on filters
        const h3 = emptyState.querySelector('h3');
        const p = emptyState.querySelector('p');
        if (filterStatus === 'completed' && items.some(i => !i.done)) {
            h3.textContent = 'No completed tasks';
            p.textContent = 'Complete some tasks to see them here.';
        } else if (filterPeriod && items.length > 0) {
            h3.textContent = 'No tasks for this period';
            p.textContent = 'Try a different filter or add a task.';
        } else {
            h3.textContent = 'No tasks yet';
            p.textContent = 'Type in the field above to add your first task.';
        }
        return;
    }

    emptyState.classList.add('hidden-default');

    const today = new Date().toISOString().split('T')[0];
    const periods = getAllPeriods();
    const periodMap = {};
    periods.forEach(p => { periodMap[p.id] = p.name; });

    todoList.innerHTML = filtered.map(item => {
        const isOverdue = item.date && item.date < today && !item.done;
        const doneClass = item.done ? ' todo-item--done' : '';

        // Build meta badges
        let metaHtml = '';
        if (item.period && periodMap[item.period]) {
            metaHtml += `<span class="todo-meta-badge">📅 ${periodMap[item.period]}</span>`;
        }
        if (item.date) {
            const dateClass = isOverdue ? ' todo-meta-badge--overdue' : '';
            const dateLabel = isOverdue ? '⚠️ ' : '';
            metaHtml += `<span class="todo-meta-badge${dateClass}">${dateLabel}${formatDate(item.date)}</span>`;
        }
        if (item.imageIds && item.imageIds.length > 0) {
            metaHtml += `<span class="todo-meta-badge todo-meta-badge--photos">📷 ${item.imageIds.length}</span>`;
        }

        // Action buttons
        let actionsHtml = `<button class="todo-action-btn" data-action="edit" data-id="${item.id}" title="Edit">✏️</button>`;
        if (item.done) {
            actionsHtml += `<button class="todo-action-btn todo-action-btn--journal" data-action="journal" data-id="${item.id}" title="Move to journal">📔</button>`;
        }
        actionsHtml += `<button class="todo-action-btn todo-action-btn--delete" data-action="delete" data-id="${item.id}" title="Delete">🗑️</button>`;

        return `
            <div class="todo-item${doneClass}" data-id="${item.id}">
                <input type="checkbox" class="todo-item-checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''}>
                <div class="todo-item-body">
                    <div class="todo-item-text">${escapeHtml(item.text)}</div>
                    ${metaHtml ? `<div class="todo-item-meta">${metaHtml}</div>` : ''}
                </div>
                <div class="todo-item-actions">${actionsHtml}</div>
            </div>
        `;
    }).join('');
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Quick-add ──────────────────────────────────────────────

function handleQuickAdd() {
    const input = document.getElementById('todoQuickAddInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    createTodoItem({ text });
    input.value = '';
    renderTodoList();
}

// ─── Edit Modal ─────────────────────────────────────────────

let editingTodoId = null;

async function openTodoEditModal(id = null) {
    const modal = document.getElementById('todoEditModal');
    const form = document.getElementById('todoEditForm');
    const title = document.getElementById('todoEditModalTitle');
    const photoPreview = document.getElementById('todoPhotoPreviewContainer');
    if (!modal || !form) return;

    form.reset();
    photoPreview.innerHTML = '';
    editingTodoId = id;

    // Populate period dropdown
    populatePeriodDropdown('todoEditPeriod');

    if (id) {
        title.textContent = 'Edit Task';
        const items = getTodoItems();
        const item = items.find(i => i.id === id);
        if (!item) return;

        document.getElementById('todoEditText').value = item.text;
        document.getElementById('todoEditDate').value = item.date || '';
        document.getElementById('todoEditPeriod').value = item.period || '';
        document.getElementById('todoEditNotes').value = item.notes || '';

        // Load existing photos
        if (item.imageIds && item.imageIds.length > 0) {
            try {
                const photos = await photoStorage.getPhotos(id);
                photos.forEach(photo => {
                    addPhotoPreview(photoPreview, photo.thumbnail || photo.data, photo.data || photo.thumbnail, id);
                });
            } catch (e) {
                console.warn('Failed to load todo photos:', e);
            }
        }
    } else {
        title.textContent = 'New Task';
    }

    modal.style.display = 'flex';

    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

function addPhotoPreview(container, thumbnail, fullImage, entryId) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'photo-preview';

    const img = document.createElement('img');
    img.src = thumbnail;
    img.dataset.fullImage = fullImage;
    img.onclick = () => showImageLightbox(fullImage, entryId);

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'photo-remove-btn';
    removeBtn.type = 'button';
    removeBtn.onclick = () => { imgContainer.remove(); };

    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    container.appendChild(imgContainer);
}

async function handleTodoPhotoSelection(input) {
    if (!input.files || input.files.length === 0) return;

    const container = document.getElementById('todoPhotoPreviewContainer');

    for (const file of Array.from(input.files)) {
        if (!file.type.match('image.*')) continue;
        try {
            const base64 = await fileToBase64(file);
            const compressed = await compressImage(base64, 800, 0.7);
            const thumbnail = await generateThumbnail(compressed, 150);
            addPhotoPreview(container, thumbnail, compressed, editingTodoId);
        } catch (e) {
            console.warn('Failed to process photo:', e);
        }
    }
    // Reset file input so same file can be selected again
    input.value = '';
}

async function handleTodoEditSubmit(e) {
    e.preventDefault();

    const text = document.getElementById('todoEditText').value.trim();
    if (!text) return;

    const data = {
        text,
        date: document.getElementById('todoEditDate').value || '',
        period: document.getElementById('todoEditPeriod').value || '',
        notes: document.getElementById('todoEditNotes').value || ''
    };

    // Collect photos from preview
    const container = document.getElementById('todoPhotoPreviewContainer');
    const imgs = container.querySelectorAll('.photo-preview img');
    const photos = Array.from(imgs).map(img => ({
        data: img.dataset.fullImage,
        thumbnail: img.src
    }));

    let itemId;
    if (editingTodoId) {
        updateTodoItem(editingTodoId, data);
        itemId = editingTodoId;
    } else {
        const newItem = createTodoItem(data);
        itemId = newItem.id;
    }

    // Save photos to IndexedDB
    if (photos.length > 0) {
        try {
            // Delete old photos first if editing
            if (editingTodoId) {
                await photoStorage.deletePhotos(itemId);
            }
            const photoIds = await photoStorage.savePhotos(itemId, photos);
            updateTodoItem(itemId, { imageIds: photoIds });
        } catch (e) {
            console.warn('Failed to save todo photos:', e);
        }
    } else if (editingTodoId) {
        // No photos in form — clear any existing
        try { await photoStorage.deletePhotos(itemId); } catch (e) { /* ignore */ }
        updateTodoItem(itemId, { imageIds: [] });
    }

    // Close modal and re-render
    document.getElementById('todoEditModal').style.display = 'none';
    editingTodoId = null;
    renderTodoList();
}

// ─── Tab Switching ──────────────────────────────────────────

function switchTab(tabName) {
    window.GardeningApp.state.activeScheduleTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.schedule-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Calendar-specific elements
    const calendarElements = [
        document.querySelector('.calendar-explainer'),
        document.getElementById('calendarNav'),
        document.getElementById('addPeriodBtn'),
        document.getElementById('search-section'),
        document.getElementById('calendarContent'),
        document.querySelector('.custom-entries-toolbar'),
        document.getElementById('calendarHint')
    ];

    const todoContent = document.getElementById('todoContent');
    const scheduleHeader = document.querySelector('.month-nav-header');

    // Schedule header export/import buttons — swap between calendar and todo
    const calExportBtn = document.getElementById('exportCustomEntriesBtn');
    const calImportBtn = document.getElementById('importCustomEntriesBtn');
    const calShareContainer = document.getElementById('calendarShareContainer');

    const calendarContent = document.getElementById('calendarContent');

    if (tabName === 'todo') {
        calendarElements.forEach(el => { if (el) el.style.display = 'none'; });
        // Use class toggle for calendarContent since it has !important grid display
        if (calendarContent) calendarContent.classList.add('hidden-by-tab');
        if (todoContent) todoContent.style.display = 'block';
        if (calExportBtn) calExportBtn.style.display = 'none';
        if (calImportBtn) calImportBtn.style.display = 'none';
        if (calShareContainer) calShareContainer.style.display = 'none';
        renderTodoList();
    } else {
        calendarElements.forEach(el => {
            if (!el) return;
            if (el.classList?.contains('custom-entries-toolbar')) {
                el.style.display = 'flex';
            } else {
                el.style.display = '';
            }
        });
        if (calendarContent) calendarContent.classList.remove('hidden-by-tab');
        if (todoContent) todoContent.style.display = 'none';
        if (calExportBtn) calExportBtn.style.display = '';
        if (calImportBtn) calImportBtn.style.display = '';
        if (calShareContainer) calShareContainer.style.display = '';
    }
}

// ─── Period Filter ──────────────────────────────────────────

function populatePeriodDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const periods = getAllPeriods();
    const currentValue = select.value;

    // Keep the first option (All periods / No period)
    const firstOption = select.options[0];
    select.innerHTML = '';
    select.appendChild(firstOption);

    periods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });

    // Restore selection if it still exists
    if (currentValue) select.value = currentValue;
}

// ─── Export/Import ──────────────────────────────────────────

async function exportTodo(includeImages = true) {
    const items = getTodoItems();
    if (items.length === 0) {
        showNotification('No tasks to export', 'info');
        return;
    }

    let exportItems = JSON.parse(JSON.stringify(items));

    if (includeImages) {
        for (const item of exportItems) {
            if (item.imageIds && item.imageIds.length > 0) {
                try {
                    const photos = await photoStorage.getPhotos(item.id);
                    item.images = photos.map(p => ({ data: p.data, thumbnail: p.thumbnail }));
                } catch (e) {
                    console.warn(`Export: failed to fetch photos for ${item.id}`, e);
                    item.images = [];
                }
                delete item.imageIds;
            }
        }
    } else {
        exportItems = exportItems.map(item => {
            const copy = { ...item };
            delete copy.imageIds;
            return copy;
        });
    }

    const exportData = {
        version: 1,
        type: 'garden_planner_todo',
        exportDate: new Date().toISOString(),
        items: exportItems
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `garden_todo_${date}${includeImages ? '_with_images' : ''}.json`;

    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showExportOptions() {
    showOptionsModal(
        'Export TODO',
        'Choose how to export your tasks:',
        [
            {
                icon: '📷',
                title: 'Complete Export',
                description: 'Include all tasks with images',
                onClick: () => exportTodo(true)
            },
            {
                icon: '📝',
                title: 'Lightweight Export',
                description: 'Text-only export without images',
                onClick: () => exportTodo(false)
            }
        ]
    );
}

function triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            let importItems;
            // Support both wrapped and raw array formats
            if (data.type === 'garden_planner_todo' && Array.isArray(data.items)) {
                importItems = data.items;
            } else if (Array.isArray(data)) {
                importItems = data;
            } else {
                showNotification('Invalid TODO export file', 'error');
                return;
            }

            showImportOptions(importItems);
        } catch (err) {
            showNotification('Failed to read import file', 'error');
        }
    };
    input.click();
}

function showImportOptions(importItems) {
    const count = importItems.length;
    showOptionsModal(
        'Import TODO',
        `Found ${count} task${count === 1 ? '' : 's'} to import.`,
        [
            {
                icon: '🔄',
                title: 'Merge',
                description: 'Add new tasks and update existing ones',
                onClick: () => handleImport(importItems, true)
            },
            {
                icon: '♻️',
                title: 'Replace All',
                description: 'Delete all existing tasks and use imported ones',
                onClick: () => handleImport(importItems, false)
            }
        ]
    );
}

async function handleImport(importItems, isMerge) {
    // Migrate inline images to IndexedDB
    for (const item of importItems) {
        if (item.images && Array.isArray(item.images) && item.images.length > 0) {
            try {
                const photoIds = await photoStorage.importPhotos(item.id, item.images);
                item.imageIds = photoIds;
                delete item.images;
            } catch (e) {
                console.warn(`Import: failed to save photos for ${item.id}`, e);
            }
        }
    }

    const existing = getTodoItems();

    if (isMerge) {
        const merged = [...existing];
        let added = 0, updated = 0;

        for (const importItem of importItems) {
            const idx = merged.findIndex(i => i.id === importItem.id);
            if (idx >= 0) {
                await photoStorage.deletePhotos(merged[idx].id);
                merged[idx] = importItem;
                updated++;
            } else {
                merged.push(importItem);
                added++;
            }
        }
        saveTodoItems(merged);
        showNotification(`Imported: ${added} added, ${updated} updated`, 'success');
    } else {
        for (const item of existing) {
            await photoStorage.deletePhotos(item.id);
        }
        saveTodoItems(importItems);
        showNotification(`Replaced with ${importItems.length} task${importItems.length === 1 ? '' : 's'}`, 'success');
    }

    renderTodoList();
}

// ─── Event Delegation ───────────────────────────────────────

function handleTodoListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (btn) {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'edit') openTodoEditModal(id);
        else if (action === 'delete') confirmDelete(id);
        else if (action === 'journal') moveToJournal(id);
        return;
    }

    const checkbox = e.target.closest('.todo-item-checkbox');
    if (checkbox) {
        const id = checkbox.dataset.id;
        toggleTodoComplete(id);
        renderTodoList();
    }
}

function confirmDelete(id) {
    const items = getTodoItems();
    const item = items.find(i => i.id === id);
    if (!item) return;

    showConfirmDialog(
        'Delete Task',
        `Delete "${item.text}"? This cannot be undone.`,
        async () => {
            await deleteTodoItem(id);
            renderTodoList();
            showNotification('Task deleted', 'info');
        },
        null,
        'Delete',
        'Cancel'
    );
}

// ─── Init ───────────────────────────────────────────────────

export function initTodo() {
    console.log('Initializing TODO module...');

    // Default tab state
    if (!window.GardeningApp.state.activeScheduleTab) {
        window.GardeningApp.state.activeScheduleTab = 'calendar';
    }

    // Tab switching
    const tabContainer = document.getElementById('scheduleTabs');
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.schedule-tab');
            if (tab) switchTab(tab.dataset.tab);
        });
    }

    // Quick-add
    const quickAddBtn = document.getElementById('todoQuickAddBtn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', handleQuickAdd);
    }
    const quickAddInput = document.getElementById('todoQuickAddInput');
    if (quickAddInput) {
        quickAddInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
        });
    }

    // Filters
    const filterPeriod = document.getElementById('todoFilterPeriod');
    const filterStatus = document.getElementById('todoFilterStatus');
    if (filterPeriod) filterPeriod.addEventListener('change', renderTodoList);
    if (filterStatus) filterStatus.addEventListener('change', renderTodoList);

    // Populate period filter
    populatePeriodDropdown('todoFilterPeriod');

    // Refresh period dropdowns when periods change
    document.addEventListener('periodChanged', () => {
        populatePeriodDropdown('todoFilterPeriod');
    });

    // Todo list event delegation
    const todoList = document.getElementById('todoList');
    if (todoList) {
        todoList.addEventListener('click', handleTodoListClick);
    }

    // Edit modal
    const editForm = document.getElementById('todoEditForm');
    if (editForm) editForm.addEventListener('submit', handleTodoEditSubmit);

    const editCloseBtn = document.getElementById('todoEditModalCloseBtn');
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', () => {
            document.getElementById('todoEditModal').style.display = 'none';
            editingTodoId = null;
        });
    }

    const editCancelBtn = document.getElementById('todoEditCancelBtn');
    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', () => {
            document.getElementById('todoEditModal').style.display = 'none';
            editingTodoId = null;
        });
    }

    // Photo handling in edit modal
    const photoSelectBtn = document.getElementById('todoPhotoSelectBtn');
    const photoInput = document.getElementById('todoEditPhotos');
    if (photoSelectBtn && photoInput) {
        photoSelectBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', () => handleTodoPhotoSelection(photoInput));
    }

    // Export/Import buttons
    const exportBtn = document.getElementById('todoExportBtn');
    if (exportBtn) exportBtn.addEventListener('click', showExportOptions);

    const importBtn = document.getElementById('todoImportBtn');
    if (importBtn) importBtn.addEventListener('click', triggerImport);

    console.log('TODO module initialized');
}

export { switchTab, renderTodoList };
