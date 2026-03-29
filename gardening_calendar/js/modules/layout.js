/**
 * Garden Layout Module — Option D: Hybrid (Structured Beds + Sketch Canvas)
 * Vector persistence variant — strokes stored as JSON operations, not rasterized bitmaps.
 *
 * Combines structured bed definitions (name, dimensions) with a free-form
 * sketch canvas within each bed for flexible plant placement.
 *
 * Storage format: bed.strokes = [
 *   { tool: 'pen', color, lineWidth, points: [[nx,ny], ...] },
 *   { tool: 'line'|'rect'|'ellipse', color, lineWidth, start: [nx,ny], end: [nx,ny] },
 *   { tool: 'text', color, fontSize, text, position: [nx,ny] },
 *   { tool: 'eraser', lineWidth, points: [[nx,ny], ...] }
 * ]
 * All coordinates normalized to 0–1 range so drawings survive canvas resize.
 * bed.canvasData is kept only as a thumbnail cache for the bed list view.
 */

import { getSelectedItems } from './storage.js';
import { showModal, showConfirmDialog, showNotification } from './ui.js';

const STORAGE_KEY = 'gardening_layout_hybrid';

let beds = [];
let activeBedId = null;

// Canvas drawing state
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#2d5016';
let lineWidth = 3;

// Vector stroke tracking
let strokes = [];        // completed strokes for the active bed
let currentStroke = null; // stroke being drawn right now
let undoStack = [];       // strokes arrays (snapshots of strokes state)
let redoStack = [];       // for redo
const MAX_UNDO = 30;
let startX, startY;       // normalized start coords for shapes

// Sticker placement
let placingSticker = null;
let stickers = [];

const COLORS = ['#2d5016', '#c75b12', '#8b4513', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#2c3e50'];

const TOOLS = [
    { id: 'pen', label: 'Pen', icon: '✏️' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'rect', label: 'Rect', icon: '⬜' },
    { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
    { id: 'text', label: 'Text', icon: '🔤' },
    { id: 'eraser', label: 'Eraser', icon: '🧹' },
    { id: 'sticker', label: 'Plants', icon: '🌱' }
];

/**
 * Load beds from localStorage
 */
function loadBeds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        beds = raw ? JSON.parse(raw) : [];
        // Migrate: if a bed has canvasData but no strokes, it's from the old bitmap format.
        // We keep the bitmap for display but can't reconstruct strokes from it.
        beds.forEach(bed => {
            if (!bed.strokes) bed.strokes = [];
        });
    } catch (e) {
        console.error('Failed to load layout beds:', e);
        beds = [];
    }
}

/**
 * Save beds to localStorage
 */
function saveBeds() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
    } catch (e) {
        console.error('Failed to save layout beds:', e);
    }
}

/**
 * Get the plant name from a selection item
 */
function getPlantName(item) {
    const lang = window.GardeningApp?.currentLang || 'en';
    if (typeof item === 'object' && item !== null) {
        return item[lang] || item.en || String(item);
    }
    return String(item);
}

/**
 * Get selected plants from calendar
 */
function getSelectedPlants() {
    const selections = getSelectedItems();
    const plants = new Set();
    for (const period in selections) {
        for (const category in selections[period]) {
            const items = selections[period][category];
            if (Array.isArray(items)) {
                items.forEach(item => plants.add(getPlantName(item)));
            } else {
                plants.add(getPlantName(items));
            }
        }
    }
    return [...plants].sort();
}

/**
 * Generate a unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ── Coordinate normalization ────────────────────────────────────────

/**
 * Convert pixel coords to normalized 0–1
 */
function toNorm(px, py) {
    return [px / canvas.width, py / canvas.height];
}

/**
 * Convert normalized 0–1 coords to current canvas pixels
 */
function toPx(nx, ny) {
    return [nx * canvas.width, ny * canvas.height];
}

// ── Stroke replay (the core of vector persistence) ──────────────────

/**
 * Replay a single stroke onto the canvas context
 */
function replayStroke(stroke) {
    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        if (!stroke.points || stroke.points.length < 1) return;
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.tool === 'eraser'
            ? stroke.lineWidth * 4 * (canvas.width / 800)
            : stroke.lineWidth * (canvas.width / 800);
        if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
        }
        const [sx, sy] = toPx(stroke.points[0][0], stroke.points[0][1]);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < stroke.points.length; i++) {
            const [px, py] = toPx(stroke.points[i][0], stroke.points[i][1]);
            ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
    } else if (stroke.tool === 'line') {
        const [x1, y1] = toPx(stroke.start[0], stroke.start[1]);
        const [x2, y2] = toPx(stroke.end[0], stroke.end[1]);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth * (canvas.width / 800);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if (stroke.tool === 'rect') {
        const [x1, y1] = toPx(stroke.start[0], stroke.start[1]);
        const [x2, y2] = toPx(stroke.end[0], stroke.end[1]);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth * (canvas.width / 800);
        ctx.lineCap = 'round';
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (stroke.tool === 'ellipse') {
        const [x1, y1] = toPx(stroke.start[0], stroke.start[1]);
        const [x2, y2] = toPx(stroke.end[0], stroke.end[1]);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth * (canvas.width / 800);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (stroke.tool === 'text') {
        const [px, py] = toPx(stroke.position[0], stroke.position[1]);
        const fontSize = stroke.fontSize * (canvas.width / 800);
        ctx.font = `bold ${fontSize}px 'Source Sans 3', sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.textBaseline = 'middle';
        ctx.fillText(stroke.text, px, py);
    }
}

/**
 * Redraw the full canvas: background + all strokes
 */
function redrawCanvas(bed) {
    if (!canvas || !ctx) return;
    drawBedBackground(bed, canvas.width, canvas.height);
    strokes.forEach(stroke => replayStroke(stroke));
}

// ── Undo / Redo (operation-based) ───────────────────────────────────

/**
 * Save current strokes state for undo
 */
function saveUndoState() {
    undoStack.push(JSON.parse(JSON.stringify(strokes)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
}

/**
 * Undo last stroke
 */
function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    strokes = JSON.parse(JSON.stringify(undoStack[undoStack.length - 1]));
    const bed = beds.find(b => b.id === activeBedId);
    if (bed) redrawCanvas(bed);
}

/**
 * Redo last undone stroke
 */
function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    strokes = JSON.parse(JSON.stringify(state));
    const bed = beds.find(b => b.id === activeBedId);
    if (bed) redrawCanvas(bed);
}

// ── Canvas helpers ──────────────────────────────────────────────────

/**
 * Get canvas coordinates from pointer event (pixel space)
 */
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
}

/**
 * Draw the bed background with grid lines
 */
function drawBedBackground(bed, canvasW, canvasH) {
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const pxPerMeter = canvasW / bed.width;
    const gridSpacing = pxPerMeter * 0.3;

    ctx.strokeStyle = 'rgba(139, 105, 20, 0.15)';
    ctx.lineWidth = 1;

    for (let x = gridSpacing; x < canvasW; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, canvasH);
        ctx.stroke();
    }
    for (let y = gridSpacing; y < canvasH; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(canvasW, Math.round(y) + 0.5);
        ctx.stroke();
    }

    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasW - 2, canvasH - 2);
}

/**
 * Render SVG bed shape overlay
 */
function renderBedShape(shape, w, h) {
    if (shape === 'circle') {
        return `<svg class="layout-bed-shape-overlay" width="${w}" height="${h}" style="position:absolute;top:0;left:0;pointer-events:none;">
            <ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-2}" ry="${h/2-2}" fill="none" stroke="#8b6914" stroke-width="3" stroke-dasharray="8,4"/>
        </svg>`;
    }
    if (shape === 'lshape') {
        const midX = w * 0.6;
        const midY = h * 0.5;
        return `<svg class="layout-bed-shape-overlay" width="${w}" height="${h}" style="position:absolute;top:0;left:0;pointer-events:none;">
            <polyline points="2,2 ${w-2},2 ${w-2},${midY} ${midX},${midY} ${midX},${h-2} 2,${h-2} 2,2"
                fill="none" stroke="#8b6914" stroke-width="3" stroke-dasharray="8,4"/>
        </svg>`;
    }
    return '';
}

/**
 * Generate a thumbnail data URL from current canvas (for bed list preview only)
 */
function generateThumbnail() {
    if (!canvas) return null;
    const thumb = document.createElement('canvas');
    const thumbW = 200;
    const thumbH = Math.round(thumbW * (canvas.height / canvas.width));
    thumb.width = thumbW;
    thumb.height = thumbH;
    const tctx = thumb.getContext('2d');
    tctx.drawImage(canvas, 0, 0, thumbW, thumbH);
    return thumb.toDataURL('image/jpeg', 0.6);
}

// ── Drawing event handlers ──────────────────────────────────────────

function onPointerDown(e) {
    if (currentTool === 'sticker') return;
    e.preventDefault();
    const coords = getCanvasCoords(e);

    if (currentTool === 'text') {
        promptText(coords.x, coords.y);
        return;
    }

    isDrawing = true;
    const [nx, ny] = toNorm(coords.x, coords.y);
    startX = nx;
    startY = ny;

    if (currentTool === 'pen' || currentTool === 'eraser') {
        currentStroke = {
            tool: currentTool,
            color: currentTool === 'eraser' ? null : currentColor,
            lineWidth,
            points: [[nx, ny]]
        };
        // Start drawing immediately
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = currentTool === 'eraser' ? lineWidth * 4 : lineWidth;
        if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.strokeStyle = currentColor;
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.moveTo(coords.x, coords.y);
    }
}

function onPointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const [nx, ny] = toNorm(coords.x, coords.y);

    if (currentTool === 'pen' || currentTool === 'eraser') {
        currentStroke.points.push([nx, ny]);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    } else if (['line', 'rect', 'ellipse'].includes(currentTool)) {
        // Preview: redraw everything + the shape being drawn
        const bed = beds.find(b => b.id === activeBedId);
        if (bed) {
            redrawCanvas(bed);
            drawShapePreview(
                ...toPx(startX, startY),
                coords.x, coords.y
            );
        }
    }
}

function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';

    if (currentTool === 'pen' || currentTool === 'eraser') {
        if (currentStroke && currentStroke.points.length > 0) {
            strokes.push(currentStroke);
            currentStroke = null;
            saveUndoState();
        }
    } else if (['line', 'rect', 'ellipse'].includes(currentTool)) {
        const coords = e.changedTouches
            ? getCanvasCoords(e.changedTouches[0] ? { touches: [e.changedTouches[0]] } : e)
            : getCanvasCoords(e);
        const [nx, ny] = toNorm(coords.x, coords.y);

        strokes.push({
            tool: currentTool,
            color: currentColor,
            lineWidth,
            start: [startX, startY],
            end: [nx, ny]
        });

        // Final redraw with the committed shape
        const bed = beds.find(b => b.id === activeBedId);
        if (bed) redrawCanvas(bed);
        saveUndoState();
    }
}

/**
 * Draw shape preview during drag (not committed to strokes yet)
 */
function drawShapePreview(x1, y1, x2, y2) {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if (currentTool === 'rect') {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (currentTool === 'ellipse') {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

/**
 * Prompt for text input and add as a text stroke
 */
function promptText(x, y) {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <div class="layout-modal-form">
            <div class="form-row">
                <label for="layoutTextInput" class="form-label">Text label</label>
                <input type="text" id="layoutTextInput" class="form-input" placeholder="e.g. Tomatoes here">
            </div>
            <div class="form-actions">
                <button type="button" id="textModalCancel" class="modal-btn-cancel">Cancel</button>
                <button type="button" id="textModalConfirm" class="modal-btn-confirm">Place</button>
            </div>
        </div>
    `;

    const { close } = showModal('Add Text', modalContent);

    setTimeout(() => {
        document.getElementById('textModalCancel')?.addEventListener('click', close);
        document.getElementById('textModalConfirm')?.addEventListener('click', () => {
            const text = document.getElementById('layoutTextInput').value.trim();
            if (!text) return;

            const fontSize = Math.max(14, lineWidth * 4);
            const [nx, ny] = toNorm(x, y);

            strokes.push({
                tool: 'text',
                color: currentColor,
                fontSize,
                text,
                position: [nx, ny]
            });

            // Draw it immediately
            const bed = beds.find(b => b.id === activeBedId);
            if (bed) redrawCanvas(bed);
            saveUndoState();
            close();
        });
        document.getElementById('layoutTextInput')?.focus();
    }, 100);
}

// ── Layout views ────────────────────────────────────────────────────

/**
 * Render the main layout view (bed list)
 */
function renderLayout() {
    const content = document.getElementById('layoutContent');
    if (!content) return;

    if (beds.length === 0) {
        content.innerHTML = `
            <div class="layout-empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🌿</div>
                <h3>No Garden Beds Yet</h3>
                <p>Define your garden beds (raised beds, rows, borders) and sketch plant placements inside each one.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="layout-bed-grid">
            ${beds.map(bed => `
                <div class="layout-bed-card" data-id="${bed.id}">
                    <div class="layout-bed-preview">
                        ${bed.canvasData
                            ? `<img src="${bed.canvasData}" alt="${bed.name}" class="layout-bed-thumb">`
                            : `<div class="layout-bed-placeholder">🌱</div>`
                        }
                    </div>
                    <div class="layout-bed-info">
                        <h3 class="layout-bed-name">${bed.name}</h3>
                        <span class="layout-bed-dims">${bed.width}m × ${bed.height}m</span>
                        ${bed.stickers && bed.stickers.length > 0
                            ? `<span class="layout-bed-plant-count">${bed.stickers.length} plant${bed.stickers.length !== 1 ? 's' : ''}</span>`
                            : ''
                        }
                        ${bed.notes ? `<p class="layout-bed-notes">${bed.notes}</p>` : ''}
                    </div>
                    <div class="layout-bed-actions">
                        <button class="layout-bed-edit-btn" data-id="${bed.id}" title="Edit sketch">✏️</button>
                        <button class="layout-bed-delete-btn" data-id="${bed.id}" title="Delete bed">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    content.querySelectorAll('.layout-bed-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.layout-bed-delete-btn')) return;
            if (e.target.closest('.layout-bed-edit-btn')) {
                openBedEditor(card.dataset.id);
                return;
            }
            openBedEditor(card.dataset.id);
        });
    });

    content.querySelectorAll('.layout-bed-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBed(btn.dataset.id);
        });
    });
}

/**
 * Show the "Add Bed" modal
 */
function showAddBedModal() {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <div class="layout-modal-form">
            <div class="form-row">
                <label for="bedNameInput" class="form-label">Bed Name</label>
                <input type="text" id="bedNameInput" class="form-input" placeholder="e.g. North Raised Bed, Herb Border" required>
            </div>
            <div class="form-row form-row-flex">
                <div class="form-column form-column-flex">
                    <label for="bedWidthInput" class="form-label">Width (m)</label>
                    <input type="number" id="bedWidthInput" class="form-input" value="2" min="0.5" max="20" step="0.5">
                </div>
                <div class="form-column form-column-flex">
                    <label for="bedHeightInput" class="form-label">Length (m)</label>
                    <input type="number" id="bedHeightInput" class="form-input" value="4" min="0.5" max="20" step="0.5">
                </div>
            </div>
            <div class="form-row">
                <label for="bedShapeSelect" class="form-label">Shape</label>
                <select id="bedShapeSelect" class="form-input">
                    <option value="rect">Rectangle</option>
                    <option value="circle">Circle / Oval</option>
                    <option value="lshape">L-Shape</option>
                </select>
            </div>
            <div class="form-row">
                <label for="bedNotesInput" class="form-label">Notes (optional)</label>
                <textarea id="bedNotesInput" class="form-textarea" rows="3" placeholder="e.g. Companion planting: carrots between onion rows for pest control"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" id="bedModalCancel" class="modal-btn-cancel">Cancel</button>
                <button type="button" id="bedModalConfirm" class="modal-btn-confirm">Create Bed</button>
            </div>
        </div>
    `;

    const { close } = showModal('Add Garden Bed', modalContent);

    setTimeout(() => {
        document.getElementById('bedModalCancel')?.addEventListener('click', close);
        document.getElementById('bedModalConfirm')?.addEventListener('click', () => {
            const name = document.getElementById('bedNameInput').value.trim();
            const width = parseFloat(document.getElementById('bedWidthInput').value) || 2;
            const height = parseFloat(document.getElementById('bedHeightInput').value) || 4;
            const shape = document.getElementById('bedShapeSelect').value;
            const notes = document.getElementById('bedNotesInput').value.trim();

            if (!name) {
                showNotification('Please enter a bed name', 'warning');
                return;
            }

            const bed = {
                id: generateId(),
                name,
                width,
                height,
                shape,
                notes,
                strokes: [],
                canvasData: null,
                stickers: [],
                createdAt: new Date().toISOString()
            };

            beds.push(bed);
            saveBeds();
            close();
            renderLayout();
            showNotification(`"${name}" created — tap to start sketching`, 'success');
        });
        document.getElementById('bedNameInput')?.focus();
    }, 100);
}

/**
 * Delete a bed
 */
function deleteBed(bedId) {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    showConfirmDialog(
        `Delete "${bed.name}"?`,
        'This will remove the bed and its sketch permanently.',
        () => {
            beds = beds.filter(b => b.id !== bedId);
            saveBeds();
            renderLayout();
            showNotification(`"${bed.name}" deleted`, 'info');
        }
    );
}

/**
 * Open the bed sketch editor
 */
function openBedEditor(bedId) {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    activeBedId = bedId;
    stickers = bed.stickers ? JSON.parse(JSON.stringify(bed.stickers)) : [];
    strokes = bed.strokes ? JSON.parse(JSON.stringify(bed.strokes)) : [];
    undoStack = [];
    redoStack = [];

    const content = document.getElementById('layoutContent');
    if (!content) return;

    const maxWidth = Math.min(window.innerWidth - 40, 800);
    const scale = maxWidth / Math.max(bed.width, bed.height);
    const canvasW = Math.round(bed.width * scale);
    const canvasH = Math.round(bed.height * scale);

    content.innerHTML = `
        <div class="layout-editor">
            <div class="layout-editor-header">
                <button class="layout-editor-back" id="layoutEditorBack">← Back</button>
                <h3 class="layout-editor-title">${bed.name} <span class="layout-editor-dims">${bed.width}m × ${bed.height}m</span></h3>
                <div class="layout-editor-actions">
                    <button class="layout-editor-action-btn" id="layoutUndoBtn" title="Undo (Ctrl+Z)">↩</button>
                    <button class="layout-editor-action-btn" id="layoutRedoBtn" title="Redo (Ctrl+Y)">↪</button>
                    <button class="layout-editor-action-btn" id="layoutClearBtn" title="Clear canvas">🗑️</button>
                    <button class="layout-editor-action-btn" id="layoutExportBtn" title="Export as PNG">💾</button>
                </div>
            </div>
            <div class="layout-toolbar">
                <div class="layout-tools">
                    ${TOOLS.map(t => `
                        <button class="layout-tool-btn ${t.id === currentTool ? 'active' : ''}"
                                data-tool="${t.id}" title="${t.label}">
                            ${t.icon}
                        </button>
                    `).join('')}
                </div>
                <div class="layout-colors">
                    ${COLORS.map(c => `
                        <button class="layout-color-swatch ${c === currentColor ? 'active' : ''}"
                                data-color="${c}"
                                style="background: ${c}"
                                title="${c}"></button>
                    `).join('')}
                </div>
                <div class="layout-line-width">
                    <label>Size:</label>
                    <input type="range" id="layoutLineWidth" min="1" max="12" value="${lineWidth}" class="layout-width-slider">
                </div>
            </div>
            <div class="layout-canvas-wrapper" id="layoutCanvasWrapper">
                <canvas id="layoutCanvas" width="${canvasW}" height="${canvasH}"></canvas>
                <div class="layout-stickers-overlay" id="layoutStickersOverlay"
                     style="width: ${canvasW}px; height: ${canvasH}px;"></div>
                ${renderBedShape(bed.shape, canvasW, canvasH)}
            </div>
            <div class="layout-sticker-panel" id="layoutStickerPanel" style="display: none;">
                <div class="layout-sticker-header">
                    <span>Place a plant label — tap on the bed</span>
                    <button class="layout-sticker-cancel" id="layoutStickerCancel">Cancel</button>
                </div>
                <div class="layout-sticker-list" id="layoutStickerList"></div>
            </div>
            <div class="layout-bed-notes-editor">
                <label for="layoutBedNotes" class="form-label">Notes</label>
                <textarea id="layoutBedNotes" class="form-textarea layout-notes-textarea" rows="3"
                    placeholder="Describe this bed's planting plan, companion planting strategy, etc.">${bed.notes || ''}</textarea>
            </div>
            <div class="layout-grid-info">
                <span class="layout-grid-label">Grid: ~30cm squares</span>
            </div>
        </div>
    `;

    // Initialize canvas
    canvas = document.getElementById('layoutCanvas');
    ctx = canvas.getContext('2d');

    // Draw background + replay all saved strokes
    redrawCanvas(bed);

    // Save initial undo state
    saveUndoState();

    // Render existing stickers
    renderStickers();

    // Bind events
    bindEditorEvents(bed);
}

// ── Sticker UI ──────────────────────────────────────────────────────

function showStickerPanel() {
    const list = document.getElementById('layoutStickerList');
    if (!list) return;

    const plants = getSelectedPlants();

    if (plants.length === 0) {
        list.innerHTML = '<div class="layout-sticker-empty">No plants selected in the calendar. Check some plants first!</div>';
        return;
    }

    list.innerHTML = plants.map(name => `
        <button class="layout-sticker-btn ${placingSticker === name ? 'active' : ''}"
                data-plant="${name}">
            🌱 ${name}
        </button>
    `).join('');

    list.querySelectorAll('.layout-sticker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            placingSticker = btn.dataset.plant;
            list.querySelectorAll('.layout-sticker-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function renderStickers() {
    const overlay = document.getElementById('layoutStickersOverlay');
    if (!overlay) return;

    overlay.innerHTML = stickers.map(s => `
        <div class="layout-sticker" data-id="${s.id}"
             style="left: ${s.x}%; top: ${s.y}%; border-color: ${s.color}; color: ${s.color};">
            🌱 ${s.text}
            <button class="layout-sticker-remove" data-id="${s.id}">×</button>
        </div>
    `).join('');

    overlay.querySelectorAll('.layout-sticker').forEach(el => {
        let dragStartX, dragStartY, origX, origY;
        const sticker = stickers.find(s => s.id === el.dataset.id);

        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('layout-sticker-remove')) return;
            e.preventDefault();
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            origX = sticker.x;
            origY = sticker.y;
            el.classList.add('dragging');

            const onMove = (me) => {
                const rect = overlay.getBoundingClientRect();
                const dx = ((me.clientX - dragStartX) / rect.width) * 100;
                const dy = ((me.clientY - dragStartY) / rect.height) * 100;
                sticker.x = Math.max(0, Math.min(100, origX + dx));
                sticker.y = Math.max(0, Math.min(100, origY + dy));
                el.style.left = sticker.x + '%';
                el.style.top = sticker.y + '%';
            };
            const onUp = () => {
                el.classList.remove('dragging');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                const bed = beds.find(b => b.id === activeBedId);
                if (bed) saveBedStickers(bed);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });

    overlay.querySelectorAll('.layout-sticker-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            stickers = stickers.filter(s => s.id !== btn.dataset.id);
            renderStickers();
            const bed = beds.find(b => b.id === activeBedId);
            if (bed) saveBedStickers(bed);
        });
    });
}

// ── Save / Export ───────────────────────────────────────────────────

/**
 * Save vector strokes + thumbnail to bed
 */
function saveBedCanvas(bed) {
    bed.strokes = JSON.parse(JSON.stringify(strokes));
    bed.canvasData = generateThumbnail(); // cache for bed list preview only
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

/**
 * Save just stickers to bed
 */
function saveBedStickers(bed) {
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

/**
 * Export bed as PNG
 */
function exportBed(bed) {
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');

    expCtx.drawImage(canvas, 0, 0);

    expCtx.font = 'bold 14px "Source Sans 3", sans-serif';
    stickers.forEach(s => {
        const px = (s.x / 100) * canvas.width;
        const py = (s.y / 100) * canvas.height;

        const text = '🌱 ' + s.text;
        const metrics = expCtx.measureText(text);
        const padding = 6;
        const bgW = metrics.width + padding * 2;
        const bgH = 22;

        expCtx.fillStyle = 'rgba(255,255,255,0.9)';
        expCtx.strokeStyle = s.color;
        expCtx.lineWidth = 2;
        expCtx.beginPath();
        expCtx.roundRect(px - 4, py - bgH / 2, bgW, bgH, 4);
        expCtx.fill();
        expCtx.stroke();

        expCtx.fillStyle = s.color;
        expCtx.textBaseline = 'middle';
        expCtx.fillText(text, px + padding - 4, py);
    });

    expCtx.font = 'bold 16px "Source Sans 3", sans-serif';
    expCtx.fillStyle = 'rgba(0,0,0,0.7)';
    expCtx.fillText(bed.name + ` (${bed.width}m × ${bed.height}m)`, 8, canvas.height - 10);

    const link = document.createElement('a');
    link.download = `garden-bed-${bed.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    showNotification('Bed exported as PNG', 'success');
}

// ── Event binding ───────────────────────────────────────────────────

function bindEditorEvents(bed) {
    document.getElementById('layoutEditorBack')?.addEventListener('click', () => {
        saveBedCanvas(bed);
        activeBedId = null;
        renderLayout();
    });

    document.getElementById('layoutBedNotes')?.addEventListener('input', (e) => {
        bed.notes = e.target.value.trim();
        saveBeds();
    });

    document.querySelectorAll('.layout-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = btn.dataset.tool;
            document.querySelectorAll('.layout-tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const stickerPanel = document.getElementById('layoutStickerPanel');
            const overlay = document.getElementById('layoutStickersOverlay');
            if (currentTool === 'sticker') {
                showStickerPanel();
                if (stickerPanel) stickerPanel.style.display = 'block';
                if (overlay) overlay.classList.add('sticker-mode');
            } else {
                placingSticker = null;
                if (stickerPanel) stickerPanel.style.display = 'none';
                if (overlay) overlay.classList.remove('sticker-mode');
            }
        });
    });

    document.querySelectorAll('.layout-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            document.querySelectorAll('.layout-color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    document.getElementById('layoutLineWidth')?.addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
    });

    document.getElementById('layoutUndoBtn')?.addEventListener('click', undo);
    document.getElementById('layoutRedoBtn')?.addEventListener('click', redo);
    document.getElementById('layoutClearBtn')?.addEventListener('click', () => {
        showConfirmDialog('Clear sketch?', 'This will erase all drawings (stickers will remain).', () => {
            strokes = [];
            redrawCanvas(bed);
            saveUndoState();
        });
    });
    document.getElementById('layoutExportBtn')?.addEventListener('click', () => exportBed(bed));

    document.getElementById('layoutStickerCancel')?.addEventListener('click', () => {
        placingSticker = null;
        document.getElementById('layoutStickerPanel').style.display = 'none';
        const overlay = document.getElementById('layoutStickersOverlay');
        if (overlay) overlay.classList.remove('sticker-mode');
        currentTool = 'pen';
        document.querySelectorAll('.layout-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'pen');
        });
    });

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    const keyHandler = (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', keyHandler);

    const overlay = document.getElementById('layoutStickersOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (placingSticker && currentTool === 'sticker') {
                const rect = overlay.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                stickers.push({
                    id: generateId(),
                    x, y,
                    text: placingSticker,
                    color: currentColor
                });
                renderStickers();
                saveBedStickers(bed);
            }
        });
    }
}

// ── Init ────────────────────────────────────────────────────────────

export function initLayout() {
    loadBeds();

    const addBtn = document.getElementById('layoutAddBedBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddBedModal);
    }

    const closeBtn = document.getElementById('layoutCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (activeBedId) {
                const bed = beds.find(b => b.id === activeBedId);
                if (bed) saveBedCanvas(bed);
                activeBedId = null;
            }
            const closeLayout = window.GardeningApp?.closeLayoutPanel;
            if (closeLayout) closeLayout();
        });
    }

    renderLayout();
    console.log('Layout (hybrid + vector persistence) module initialized');
}

export { renderLayout, loadBeds, saveBeds };
