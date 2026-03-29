/**
 * Garden Layout Module — Option D: Hybrid (Structured Beds + Sketch Canvas)
 *
 * Combines structured bed definitions (name, dimensions) with a free-form
 * sketch canvas within each bed for flexible plant placement.
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
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 30;
let startX, startY;
let snapshotBeforeShape = null;

// Sticker placement
let placingSticker = null;
let stickers = []; // {x, y, text, color} for active bed

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
                    </div>
                    <div class="layout-bed-actions">
                        <button class="layout-bed-edit-btn" data-id="${bed.id}" title="Edit sketch">✏️</button>
                        <button class="layout-bed-delete-btn" data-id="${bed.id}" title="Delete bed">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Bind events
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
            <div class="form-actions">
                <button type="button" id="bedModalCancel" class="modal-btn-cancel">Cancel</button>
                <button type="button" id="bedModalConfirm" class="modal-btn-confirm">Create Bed</button>
            </div>
        </div>
    `;

    const { close } = showModal('Add Garden Bed', modalContent);

    // Bind confirm/cancel inside the modal
    setTimeout(() => {
        document.getElementById('bedModalCancel')?.addEventListener('click', close);
        document.getElementById('bedModalConfirm')?.addEventListener('click', () => {
            const name = document.getElementById('bedNameInput').value.trim();
            const width = parseFloat(document.getElementById('bedWidthInput').value) || 2;
            const height = parseFloat(document.getElementById('bedHeightInput').value) || 4;
            const shape = document.getElementById('bedShapeSelect').value;

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
    undoStack = [];
    redoStack = [];

    const content = document.getElementById('layoutContent');
    if (!content) return;

    // Calculate canvas dimensions (pixels) maintaining aspect ratio
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
            <div class="layout-grid-info">
                <span class="layout-grid-label">Grid: ~30cm squares</span>
            </div>
        </div>
    `;

    // Initialize canvas
    canvas = document.getElementById('layoutCanvas');
    ctx = canvas.getContext('2d');

    // Draw bed background with grid
    drawBedBackground(bed, canvasW, canvasH);

    // Restore saved canvas data
    if (bed.canvasData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            saveUndoState();
        };
        img.src = bed.canvasData;
    } else {
        saveUndoState();
    }

    // Render existing stickers
    renderStickers();

    // Bind events
    bindEditorEvents(bed);
}

/**
 * Render SVG bed shape overlay (border/clip)
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
    // rect default — simple border is handled by CSS
    return '';
}

/**
 * Draw the bed background with grid lines
 */
function drawBedBackground(bed, canvasW, canvasH) {
    // Cream background
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid lines (each ~30cm in real space)
    const pxPerMeter = canvasW / bed.width;
    const gridSpacing = pxPerMeter * 0.3; // 30cm

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

    // Border
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasW - 2, canvasH - 2);
}

/**
 * Save current canvas state for undo
 */
function saveUndoState() {
    if (!canvas) return;
    undoStack.push(canvas.toDataURL('image/png'));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
}

/**
 * Undo last canvas action
 */
function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    restoreCanvasState(undoStack[undoStack.length - 1]);
}

/**
 * Redo last undone action
 */
function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    restoreCanvasState(state);
}

/**
 * Restore canvas from data URL
 */
function restoreCanvasState(dataUrl) {
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

/**
 * Get canvas coordinates from pointer event
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
 * Bind all editor events
 */
function bindEditorEvents(bed) {
    // Back button
    document.getElementById('layoutEditorBack')?.addEventListener('click', () => {
        saveBedCanvas(bed);
        activeBedId = null;
        renderLayout();
    });

    // Tool selection
    document.querySelectorAll('.layout-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = btn.dataset.tool;
            document.querySelectorAll('.layout-tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const stickerPanel = document.getElementById('layoutStickerPanel');
            if (currentTool === 'sticker') {
                showStickerPanel();
                if (stickerPanel) stickerPanel.style.display = 'block';
            } else {
                placingSticker = null;
                if (stickerPanel) stickerPanel.style.display = 'none';
            }
        });
    });

    // Color selection
    document.querySelectorAll('.layout-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            document.querySelectorAll('.layout-color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Line width
    document.getElementById('layoutLineWidth')?.addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
    });

    // Undo/Redo/Clear/Export
    document.getElementById('layoutUndoBtn')?.addEventListener('click', undo);
    document.getElementById('layoutRedoBtn')?.addEventListener('click', redo);
    document.getElementById('layoutClearBtn')?.addEventListener('click', () => {
        showConfirmDialog('Clear sketch?', 'This will erase all drawings (stickers will remain).', () => {
            drawBedBackground(bed, canvas.width, canvas.height);
            saveUndoState();
        });
    });
    document.getElementById('layoutExportBtn')?.addEventListener('click', () => exportBed(bed));

    // Sticker cancel
    document.getElementById('layoutStickerCancel')?.addEventListener('click', () => {
        placingSticker = null;
        document.getElementById('layoutStickerPanel').style.display = 'none';
        currentTool = 'pen';
        document.querySelectorAll('.layout-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'pen');
        });
    });

    // Canvas drawing events
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp);

    // Keyboard shortcuts
    const keyHandler = (e) => {
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', keyHandler);

    // Sticker overlay click (for placing stickers)
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

/**
 * Canvas pointer down
 */
function onPointerDown(e) {
    if (currentTool === 'sticker') return;
    e.preventDefault();
    isDrawing = true;
    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;

    if (currentTool === 'text') {
        isDrawing = false;
        promptText(coords.x, coords.y);
        return;
    }

    if (['line', 'rect', 'ellipse'].includes(currentTool)) {
        snapshotBeforeShape = canvas.toDataURL('image/png');
    }

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = currentTool === 'eraser' ? lineWidth * 4 : lineWidth;
        ctx.strokeStyle = currentTool === 'eraser' ? '#f5f0e6' : currentColor;
        ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    }
}

/**
 * Canvas pointer move
 */
function onPointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    } else if (['line', 'rect', 'ellipse'].includes(currentTool) && snapshotBeforeShape) {
        // Restore snapshot and draw preview
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            drawShapePreview(startX, startY, coords.x, coords.y);
        };
        img.src = snapshotBeforeShape;
    }
}

/**
 * Canvas pointer up
 */
function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';

    if (['line', 'rect', 'ellipse'].includes(currentTool)) {
        const coords = e.changedTouches ? getCanvasCoords(e.changedTouches[0] ? { touches: [e.changedTouches[0]] } : e) : getCanvasCoords(e);
        if (snapshotBeforeShape) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                drawShapePreview(startX, startY, coords.x, coords.y);
                snapshotBeforeShape = null;
                saveUndoState();
            };
            img.src = snapshotBeforeShape;
            return;
        }
    }

    saveUndoState();
}

/**
 * Draw shape preview during drag
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
 * Prompt for text input and draw on canvas
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

            ctx.font = `bold ${Math.max(14, lineWidth * 4)}px 'Source Sans 3', sans-serif`;
            ctx.fillStyle = currentColor;
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);
            saveUndoState();
            close();
        });
        document.getElementById('layoutTextInput')?.focus();
    }, 100);
}

/**
 * Show the plant sticker panel
 */
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

/**
 * Render plant stickers on the overlay
 */
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

    // Drag stickers
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

    // Remove sticker buttons
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

/**
 * Save canvas data to bed
 */
function saveBedCanvas(bed) {
    if (canvas) {
        bed.canvasData = canvas.toDataURL('image/jpeg', 0.7);
    }
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
 * Export bed as PNG with stickers rendered on top
 */
function exportBed(bed) {
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');

    // Draw the sketch canvas
    expCtx.drawImage(canvas, 0, 0);

    // Draw stickers
    expCtx.font = 'bold 14px "Source Sans 3", sans-serif';
    stickers.forEach(s => {
        const px = (s.x / 100) * canvas.width;
        const py = (s.y / 100) * canvas.height;

        // Background pill
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

    // Add title
    expCtx.font = 'bold 16px "Source Sans 3", sans-serif';
    expCtx.fillStyle = 'rgba(0,0,0,0.7)';
    expCtx.fillText(bed.name + ` (${bed.width}m × ${bed.height}m)`, 8, canvas.height - 10);

    const link = document.createElement('a');
    link.download = `garden-bed-${bed.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    showNotification('Bed exported as PNG', 'success');
}

/**
 * Initialize the layout module
 */
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
    console.log('Layout (hybrid beds + sketch) module initialized');
}

/**
 * Public render function
 */
export { renderLayout, loadBeds, saveBeds };
