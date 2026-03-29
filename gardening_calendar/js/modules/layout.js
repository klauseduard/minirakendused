/**
 * Layout Module for Gardening Calendar
 * Grid-based bed planner — define rectangular beds and paint plant placements.
 */

import { getSelectedItems } from './storage.js';
import { showModal, showConfirmDialog } from './ui.js';

// ── Constants ───────────────────────────────────────────────────────
const STORAGE_KEY = 'gardening_layout_beds';

/** Garden-friendly color palette for plant cells */
const PALETTE_COLORS = [
    '#4c8c4a', '#c2785c', '#6b8e9b', '#d4a843', '#7b5ea7',
    '#c75b7a', '#3d9e8f', '#8b6f47', '#5a7abf', '#a0a040',
    '#e07040', '#4ab8a1', '#9b5fb4', '#bf9f30', '#6a9e4a',
    '#d06070', '#5090c0', '#8a7e5a', '#50b080', '#c08050'
];

// ── State ───────────────────────────────────────────────────────────
let beds = [];
let activeBedId = null;
let activePlant = null;    // currently selected palette plant (null = eraser)
let isPainting = false;

/** Stored reference so we can remove the global pointerup listener */
let _stopPaintHandler = null;

// ── Persistence ─────────────────────────────────────────────────────

/** Load beds from localStorage */
export function loadBeds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        beds = raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to load layout beds:', e);
        beds = [];
    }
    return beds;
}

/** Save beds to localStorage */
export function saveBeds() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
    } catch (e) {
        console.error('Failed to save layout beds:', e);
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a stable color map for a single bed's grid so that the same
 * plant always gets the same color within that bed.
 * @param {Object} bed - Bed object with grid
 * @returns {Object} Map of plant name → color hex
 */
function buildColorMap(bed) {
    const map = {};
    let idx = 0;
    for (let r = 0; r < bed.rows; r++) {
        for (let c = 0; c < bed.cols; c++) {
            const name = bed.grid[r]?.[c];
            if (name && !map[name]) {
                map[name] = PALETTE_COLORS[idx % PALETTE_COLORS.length];
                idx++;
            }
        }
    }
    return map;
}

/**
 * Extract unique plant names from the user's calendar selections.
 * Items may be objects like {type:"plant", en:"carrot", et:"porgand"}
 * or plain strings.
 * @returns {string[]} Sorted, deduplicated plant names
 */
function getSelectedPlantNames() {
    const lang = window.GardeningApp?.currentLang || 'en';
    const selections = getSelectedItems();
    const names = new Set();

    for (const month in selections) {
        for (const category in selections[month]) {
            const items = selections[month][category];
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                if (typeof item === 'object' && item !== null) {
                    const name = item[lang] || item.en;
                    if (name) names.add(name);
                } else if (typeof item === 'string' && item) {
                    names.add(item);
                }
            }
        }
    }

    return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Create an empty grid (2-D array of nulls)
 */
function createEmptyGrid(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
}

// ── Bed CRUD ────────────────────────────────────────────────────────

/**
 * Open a modal to create or edit a bed.
 * @param {Object|null} existing - If editing, pass the bed object
 */
function openBedModal(existing = null) {
    const isEdit = !!existing;
    const title = isEdit ? 'Edit Bed' : 'New Bed';

    const form = document.createElement('div');
    form.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:14px">
            <label style="display:flex;flex-direction:column;gap:4px">
                <span style="font-weight:600;font-size:0.9rem">Name</span>
                <input type="text" id="bedNameInput" class="todo-quick-input"
                    placeholder="e.g. Raised bed #1"
                    value="${isEdit ? existing.name : ''}"
                    maxlength="60" style="padding:8px 12px">
            </label>
            <div style="display:flex;gap:12px">
                <label style="flex:1;display:flex;flex-direction:column;gap:4px">
                    <span style="font-weight:600;font-size:0.9rem">Rows</span>
                    <input type="number" id="bedRowsInput" class="todo-quick-input"
                        min="1" max="30" value="${isEdit ? existing.rows : 4}"
                        style="padding:8px 12px">
                </label>
                <label style="flex:1;display:flex;flex-direction:column;gap:4px">
                    <span style="font-weight:600;font-size:0.9rem">Columns</span>
                    <input type="number" id="bedColsInput" class="todo-quick-input"
                        min="1" max="30" value="${isEdit ? existing.cols : 6}"
                        style="padding:8px 12px">
                </label>
            </div>
            ${isEdit ? '<p class="layout-resize-note">Changing dimensions will clear cells that fall outside the new size.</p>' : ''}
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
                <button id="bedModalCancel" class="button modal-btn-cancel">Cancel</button>
                <button id="bedModalSave" class="button modal-btn-confirm">${isEdit ? 'Save' : 'Create'}</button>
            </div>
        </div>
    `;

    const modal = showModal(title, form, { maxWidth: '400px' });

    const nameInput = form.querySelector('#bedNameInput');
    const rowsInput = form.querySelector('#bedRowsInput');
    const colsInput = form.querySelector('#bedColsInput');

    form.querySelector('#bedModalCancel').addEventListener('click', () => modal.close());

    form.querySelector('#bedModalSave').addEventListener('click', () => {
        const name = nameInput.value.trim() || (isEdit ? existing.name : 'Untitled Bed');
        const rows = Math.max(1, Math.min(30, parseInt(rowsInput.value, 10) || 4));
        const cols = Math.max(1, Math.min(30, parseInt(colsInput.value, 10) || 6));

        if (isEdit) {
            existing.name = name;
            // Resize grid, preserving existing cells that fit
            const oldGrid = existing.grid;
            const newGrid = createEmptyGrid(rows, cols);
            for (let r = 0; r < Math.min(rows, existing.rows); r++) {
                for (let c = 0; c < Math.min(cols, existing.cols); c++) {
                    newGrid[r][c] = oldGrid[r]?.[c] ?? null;
                }
            }
            existing.rows = rows;
            existing.cols = cols;
            existing.grid = newGrid;
        } else {
            const bed = {
                id: 'bed-' + Date.now(),
                name,
                rows,
                cols,
                grid: createEmptyGrid(rows, cols),
                createdAt: new Date().toISOString()
            };
            beds.push(bed);
        }

        saveBeds();
        modal.close();
        renderLayout();
    });

    // Focus the name input
    setTimeout(() => nameInput.focus(), 60);
}

/**
 * Delete a bed after user confirmation.
 * @param {string} bedId
 */
function deleteBed(bedId) {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    showConfirmDialog(
        'Delete Bed',
        `Are you sure you want to delete "${bed.name}"? This cannot be undone.`,
        () => {
            beds = beds.filter(b => b.id !== bedId);
            if (activeBedId === bedId) activeBedId = null;
            saveBeds();
            renderLayout();
        },
        null,
        'Delete',
        'Cancel',
        { confirmClass: 'modal-btn-confirm modal-btn-danger' }
    );
}

// ── Rendering ───────────────────────────────────────────────────────

/**
 * Render the main layout panel: either the bed list or the grid editor
 * for the active bed.
 */
export function renderLayout() {
    const container = document.getElementById('layoutContent');
    if (!container) return;

    // If a bed is open for editing, show the grid editor
    if (activeBedId) {
        const bed = beds.find(b => b.id === activeBedId);
        if (bed) {
            renderGridEditor(container, bed);
            return;
        }
        activeBedId = null;  // bed was deleted; fall through to list
    }

    renderBedList(container);
}

/**
 * Render the bed card list (overview).
 */
function renderBedList(container) {
    if (beds.length === 0) {
        container.innerHTML = `
            <div class="layout-empty-state">
                <div style="font-size:2.4rem">🌱</div>
                <h3>No beds yet</h3>
                <p>Create your first garden bed to start planning plant placement.</p>
                <button class="layout-add-bed-btn layout-empty-add-btn" id="layoutEmptyAddBtn">
                    <span class="icon-size-sm">+</span>
                    <span>New Bed</span>
                </button>
            </div>
        `;
        container.querySelector('#layoutEmptyAddBtn')
            ?.addEventListener('click', () => openBedModal());
        return;
    }

    let html = '<div class="layout-bed-grid">';
    for (const bed of beds) {
        const colorMap = buildColorMap(bed);
        const plantNames = [...new Set(
            bed.grid.flat().filter(Boolean)
        )];

        // Mini-grid preview
        const cellSize = Math.max(6, Math.min(18, Math.floor(200 / Math.max(bed.rows, bed.cols))));
        let miniGrid = `<div class="layout-mini-grid" style="grid-template-columns:repeat(${bed.cols},${cellSize}px);grid-template-rows:repeat(${bed.rows},${cellSize}px)">`;
        for (let r = 0; r < bed.rows; r++) {
            for (let c = 0; c < bed.cols; c++) {
                const plant = bed.grid[r]?.[c];
                const bg = plant ? (colorMap[plant] || '#999') : 'var(--bg-cream)';
                miniGrid += `<div class="layout-mini-cell" style="background:${bg}"></div>`;
            }
        }
        miniGrid += '</div>';

        // Legend chips
        let legendHtml = '';
        if (plantNames.length > 0) {
            legendHtml = plantNames.map(name =>
                `<span class="layout-legend-chip" style="background:${colorMap[name] || '#999'}">${name}</span>`
            ).join('');
        } else {
            legendHtml = '<span class="layout-no-plants">No plants placed yet</span>';
        }

        html += `
            <div class="layout-bed-card" data-bed-id="${bed.id}">
                <div class="layout-bed-card-header">
                    <h3 class="layout-bed-name">${bed.name}</h3>
                    <span class="layout-bed-dims">${bed.rows} &times; ${bed.cols}</span>
                </div>
                <div class="layout-bed-preview">${miniGrid}</div>
                <div class="layout-bed-plants">${legendHtml}</div>
                <div class="layout-bed-actions">
                    <button class="layout-btn-open" data-action="open" data-bed-id="${bed.id}">Open</button>
                    <button class="layout-btn-icon" data-action="edit" data-bed-id="${bed.id}" title="Edit name / size">&#9998;</button>
                    <button class="layout-btn-icon layout-btn-delete" data-action="delete" data-bed-id="${bed.id}" title="Delete bed">&#128465;</button>
                </div>
            </div>
        `;
    }
    html += '</div>';

    container.innerHTML = html;

    // Delegate card action clicks
    container.addEventListener('click', handleBedListClick);
}

function handleBedListClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const bedId = btn.dataset.bedId;
    const action = btn.dataset.action;

    if (action === 'open') {
        activeBedId = bedId;
        renderLayout();
    } else if (action === 'edit') {
        const bed = beds.find(b => b.id === bedId);
        if (bed) openBedModal(bed);
    } else if (action === 'delete') {
        deleteBed(bedId);
    }
}

// ── Grid Editor ─────────────────────────────────────────────────────

/**
 * Render the grid editor for a single bed.
 * @param {HTMLElement} container - #layoutContent
 * @param {Object} bed - Bed data object
 */
function renderGridEditor(container, bed) {
    // Clean up any previous global pointerup listener
    cleanupPaintListeners();

    const plantNames = getSelectedPlantNames();
    const colorMap = buildColorMap(bed);

    // Assign colors to palette plants that aren't yet in the map
    let nextIdx = Object.keys(colorMap).length;
    for (const name of plantNames) {
        if (!colorMap[name]) {
            colorMap[name] = PALETTE_COLORS[nextIdx % PALETTE_COLORS.length];
            nextIdx++;
        }
    }

    // Reset painting state
    activePlant = null;
    isPainting = false;

    // ── Build HTML ──
    let html = '';

    // Header with back button
    html += `
        <div class="layout-grid-header">
            <button class="layout-back-btn" id="layoutGridBack">&larr; Back</button>
            <div>
                <h3 class="layout-grid-title">${bed.name}</h3>
                <span class="layout-grid-dims">${bed.rows} &times; ${bed.cols}</span>
            </div>
        </div>
    `;

    html += '<div class="layout-grid-body">';

    // Plant palette
    html += '<div class="layout-palette">';
    html += '<div class="layout-palette-title">Plants</div>';

    // Eraser button
    html += `
        <button class="layout-palette-item active" data-plant="">
            <span class="layout-palette-swatch layout-eraser-swatch"></span>
            <span class="layout-palette-label">Eraser</span>
        </button>
    `;

    if (plantNames.length > 0) {
        for (const name of plantNames) {
            const color = colorMap[name] || '#999';
            html += `
                <button class="layout-palette-item" data-plant="${name}">
                    <span class="layout-palette-swatch" style="background:${color}"></span>
                    <span class="layout-palette-label">${name}</span>
                </button>
            `;
        }
    } else {
        html += '<div class="layout-palette-empty">Select plants in the calendar to see them here.</div>';
    }
    html += '</div>'; // .layout-palette

    // Grid area
    const maxCellSize = 48;
    const minCellSize = 20;
    const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(500 / Math.max(bed.rows, bed.cols))));

    html += '<div class="layout-grid-wrap">';
    html += `<div class="layout-grid" id="layoutGrid" style="grid-template-columns:repeat(${bed.cols},${cellSize}px);grid-template-rows:repeat(${bed.rows},${cellSize}px)">`;

    for (let r = 0; r < bed.rows; r++) {
        for (let c = 0; c < bed.cols; c++) {
            const plant = bed.grid[r]?.[c];
            const bg = plant ? (colorMap[plant] || '#999') : 'var(--bg-cream)';
            const titleAttr = plant ? ` title="${plant}"` : '';
            html += `<div class="layout-grid-cell" data-row="${r}" data-col="${c}" style="background:${bg}"${titleAttr}></div>`;
        }
    }

    html += '</div>'; // .layout-grid
    html += '<div class="layout-grid-hint">Click or drag to paint cells. Select a plant from the palette.</div>';
    html += '</div>'; // .layout-grid-wrap

    html += '</div>'; // .layout-grid-body

    container.innerHTML = html;

    // ── Wire up events ──

    // Back button
    container.querySelector('#layoutGridBack').addEventListener('click', () => {
        cleanupPaintListeners();
        activeBedId = null;
        renderLayout();
    });

    // Palette selection
    const paletteItems = container.querySelectorAll('.layout-palette-item');
    paletteItems.forEach(btn => {
        btn.addEventListener('click', () => {
            paletteItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const plant = btn.dataset.plant;
            activePlant = plant || null;  // empty string → null (eraser)
        });
    });

    // Grid painting with pointer events
    const grid = container.querySelector('#layoutGrid');
    if (grid) {
        grid.addEventListener('pointerdown', (e) => {
            const cell = e.target.closest('.layout-grid-cell');
            if (!cell) return;
            e.preventDefault();
            isPainting = true;
            paintCell(bed, cell, colorMap);
        });

        grid.addEventListener('pointerover', (e) => {
            if (!isPainting) return;
            const cell = e.target.closest('.layout-grid-cell');
            if (!cell) return;
            paintCell(bed, cell, colorMap);
        });

        // Global pointerup to stop painting (even outside the grid)
        _stopPaintHandler = () => {
            isPainting = false;
        };
        document.addEventListener('pointerup', _stopPaintHandler);
    }
}

/**
 * Paint a single cell with the active plant or erase it.
 * @param {Object} bed - Bed data object
 * @param {HTMLElement} cell - Grid cell element
 * @param {Object} colorMap - Plant → color mapping
 */
function paintCell(bed, cell, colorMap) {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);

    bed.grid[r][c] = activePlant;

    if (activePlant) {
        const color = colorMap[activePlant] || '#999';
        cell.style.background = color;
        cell.title = activePlant;
    } else {
        cell.style.background = 'var(--bg-cream)';
        cell.title = '';
    }

    saveBeds();
}

/**
 * Remove the global pointerup handler to prevent listener leaks.
 */
function cleanupPaintListeners() {
    if (_stopPaintHandler) {
        document.removeEventListener('pointerup', _stopPaintHandler);
        _stopPaintHandler = null;
    }
    isPainting = false;
}

// ── Initialization ──────────────────────────────────────────────────

/**
 * Initialize the layout module: load persisted beds, wire the "New Bed"
 * button, and do an initial render.
 */
export function initLayout() {
    loadBeds();

    const addBedBtn = document.getElementById('layoutAddBedBtn');
    if (addBedBtn) {
        addBedBtn.addEventListener('click', () => openBedModal());
    }

    // Initial render only if the section is visible
    const section = document.getElementById('garden-layout');
    if (section && section.style.display === 'block') {
        renderLayout();
    }
}
