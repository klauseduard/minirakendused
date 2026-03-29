/**
 * Garden Layout Module — Free-form Canvas Sketch
 *
 * Option B from the layout plan: HTML5 Canvas with drawing tools,
 * plant labels as draggable stickers, PNG export.
 */

import { getSelectedItems } from './storage.js';
import { calendarData } from './data.js';

// ── Constants ──────────────────────────────────────────────────
const STORAGE_KEY = 'gardening_layout_sketches';
const CANVAS_W = 1200;
const CANVAS_H = 800;

const TOOLS = {
    PEN:       'pen',
    LINE:      'line',
    RECT:      'rect',
    ELLIPSE:   'ellipse',
    TEXT:      'text',
    ERASER:    'eraser',
};

const COLORS = [
    '#5a7247', // forest green
    '#c4956a', // terracotta
    '#7a9e7e', // sage
    '#b8860b', // dark goldenrod
    '#8b4513', // saddle brown
    '#2e6b4f', // deep green
    '#d4a574', // warm tan
    '#6b8e6b', // muted green
    '#c25a3c', // brick red
    '#4a7c59', // garden green
];

const LINE_WIDTHS = [2, 4, 8, 16];

// ── State ──────────────────────────────────────────────────────
let sketches = [];
let currentSketchId = null;
let activeTool = TOOLS.PEN;
let activeColor = COLORS[0];
let activeWidth = 4;
let isDrawing = false;
let canvas = null;
let ctx = null;
let undoStack = [];
let redoStack = [];

// Shape preview state
let shapeStartX = 0;
let shapeStartY = 0;
let preShapeSnapshot = null;

// Plant stickers
let stickers = [];
let draggingSticker = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// ── Persistence ────────────────────────────────────────────────
function loadSketches() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        sketches = raw ? JSON.parse(raw) : [];
    } catch {
        sketches = [];
    }
}

function saveSketches() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sketches));
}

function getCurrentSketch() {
    return sketches.find(s => s.id === currentSketchId);
}

function saveCanvasState() {
    const sketch = getCurrentSketch();
    if (!sketch || !canvas) return;
    sketch.canvasData = canvas.toDataURL('image/png');
    sketch.stickers = JSON.parse(JSON.stringify(stickers));
    saveSketches();
}

// ── Undo / Redo ────────────────────────────────────────────────
function pushUndo() {
    if (!canvas) return;
    undoStack.push({
        imageData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers))
    });
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push({
        imageData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers))
    });
    const state = undoStack.pop();
    restoreState(state);
    updateUndoRedoButtons();
    saveCanvasState();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push({
        imageData: canvas.toDataURL('image/png'),
        stickers: JSON.parse(JSON.stringify(stickers))
    });
    const state = redoStack.pop();
    restoreState(state);
    updateUndoRedoButtons();
    saveCanvasState();
}

function restoreState(state) {
    stickers = state.stickers;
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
    };
    img.src = state.imageData;
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('layoutUndoBtn');
    const redoBtn = document.getElementById('layoutRedoBtn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// ── Plant stickers ─────────────────────────────────────────────
function getSelectedPlantNames() {
    const selections = getSelectedItems();
    const names = new Set();
    const lang = window.GardeningApp?.currentLang || 'en';

    for (const period in selections) {
        for (const category in selections[period]) {
            for (const item of selections[period][category]) {
                if (typeof item === 'object' && item !== null) {
                    names.add(item[lang] || item.en || JSON.stringify(item));
                } else {
                    names.add(String(item));
                }
            }
        }
    }
    return [...names].sort();
}

function addSticker(text, x, y) {
    pushUndo();
    stickers.push({
        id: Date.now() + Math.random(),
        text,
        x: x ?? CANVAS_W / 2 - 40,
        y: y ?? CANVAS_H / 2 - 12,
    });
    redrawCanvas();
    saveCanvasState();
}

function removeSticker(sticker) {
    pushUndo();
    stickers = stickers.filter(s => s.id !== sticker.id);
    redrawCanvas();
    saveCanvasState();
}

function drawStickers() {
    if (!ctx) return;
    for (const s of stickers) {
        ctx.save();
        ctx.font = 'bold 14px "Source Sans 3", sans-serif';
        const textWidth = ctx.measureText('🌱 ' + s.text).width;
        const pad = 8;
        const w = textWidth + pad * 2;
        const h = 28;

        // Background pill
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = '#5a7247';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(s.x, s.y, w, h, 6);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#2d2a26';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌱 ' + s.text, s.x + pad, s.y + h / 2);
        ctx.restore();

        // Store hit area
        s._w = w;
        s._h = h;
    }
}

function findStickerAt(x, y) {
    for (let i = stickers.length - 1; i >= 0; i--) {
        const s = stickers[i];
        if (x >= s.x && x <= s.x + (s._w || 100) && y >= s.y && y <= s.y + (s._h || 28)) {
            return s;
        }
    }
    return null;
}

// ── Canvas drawing ─────────────────────────────────────────────
function redrawCanvas() {
    if (!ctx || !canvas) return;
    const sketch = getCurrentSketch();
    if (sketch?.canvasData) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.drawImage(img, 0, 0);
            drawStickers();
        };
        img.src = sketch.canvasData;
    } else {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        drawGrid();
        drawStickers();
    }
}

function drawGrid() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x <= CANVAS_W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
    }
    ctx.restore();
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

function setupCanvasEvents() {
    if (!canvas) return;
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Double-click to remove sticker
    canvas.addEventListener('dblclick', (e) => {
        const { x, y } = getCanvasCoords(e);
        const sticker = findStickerAt(x, y);
        if (sticker) removeSticker(sticker);
    });

    // Right-click to remove sticker
    canvas.addEventListener('contextmenu', (e) => {
        const { x, y } = getCanvasCoords(e);
        const sticker = findStickerAt(x, y);
        if (sticker) {
            e.preventDefault();
            removeSticker(sticker);
        }
    });
}

function onPointerDown(e) {
    const { x, y } = getCanvasCoords(e);

    // Sticker drag (any tool except eraser)
    const sticker = findStickerAt(x, y);
    if (sticker && activeTool !== TOOLS.ERASER) {
        draggingSticker = sticker;
        dragOffsetX = x - sticker.x;
        dragOffsetY = y - sticker.y;
        pushUndo();
        canvas.setPointerCapture(e.pointerId);
        return;
    }

    isDrawing = true;
    canvas.setPointerCapture(e.pointerId);

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.ERASER) {
        pushUndo();
        ctx.beginPath();
        ctx.moveTo(x, y);
        if (activeTool === TOOLS.ERASER) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = activeWidth * 3;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = activeWidth;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    } else if (activeTool === TOOLS.LINE || activeTool === TOOLS.RECT || activeTool === TOOLS.ELLIPSE) {
        pushUndo();
        shapeStartX = x;
        shapeStartY = y;
        preShapeSnapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    } else if (activeTool === TOOLS.TEXT) {
        promptTextInput(x, y);
        isDrawing = false;
    }
}

function onPointerMove(e) {
    const { x, y } = getCanvasCoords(e);

    if (draggingSticker) {
        draggingSticker.x = x - dragOffsetX;
        draggingSticker.y = y - dragOffsetY;
        redrawCanvas();
        return;
    }

    if (!isDrawing) return;

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.ERASER) {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (preShapeSnapshot) {
        ctx.putImageData(preShapeSnapshot, 0, 0);
        drawStickers();
        ctx.save();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = activeWidth;
        ctx.lineCap = 'round';

        if (activeTool === TOOLS.LINE) {
            ctx.beginPath();
            ctx.moveTo(shapeStartX, shapeStartY);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (activeTool === TOOLS.RECT) {
            ctx.beginPath();
            ctx.rect(shapeStartX, shapeStartY, x - shapeStartX, y - shapeStartY);
            ctx.stroke();
        } else if (activeTool === TOOLS.ELLIPSE) {
            const cx = (shapeStartX + x) / 2;
            const cy = (shapeStartY + y) / 2;
            const rx = Math.abs(x - shapeStartX) / 2;
            const ry = Math.abs(y - shapeStartY) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }
}

function onPointerUp() {
    if (draggingSticker) {
        draggingSticker = null;
        saveCanvasState();
        return;
    }
    if (!isDrawing) return;
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
    preShapeSnapshot = null;
    saveCanvasState();
}

function promptTextInput(x, y) {
    const { showModal } = window.GardeningApp.modules.ui;
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Text label:</label>
            <input type="text" id="canvasTextInput"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   placeholder="e.g. North bed, Herb spiral..." autofocus>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="canvasTextCancel" class="layout-btn layout-btn-secondary">Cancel</button>
            <button id="canvasTextOk" class="layout-btn layout-btn-primary">Add</button>
        </div>
    `;
    const modal = showModal('Add Text Label', content, { width: '360px' });
    const input = content.querySelector('#canvasTextInput');

    const submit = () => {
        const text = input.value.trim();
        if (text) {
            pushUndo();
            ctx.save();
            ctx.font = 'bold 16px "Source Sans 3", sans-serif';
            ctx.fillStyle = activeColor;
            ctx.fillText(text, x, y);
            ctx.restore();
            saveCanvasState();
        }
        modal.close();
    };

    content.querySelector('#canvasTextOk').addEventListener('click', submit);
    content.querySelector('#canvasTextCancel').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => input.focus(), 50);
}

// ── Export ──────────────────────────────────────────────────────
function exportAsPng() {
    if (!canvas) return;
    const link = document.createElement('a');
    const sketch = getCurrentSketch();
    link.download = `${sketch?.name || 'garden-sketch'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// ── Sketch CRUD ────────────────────────────────────────────────
function createSketch(name) {
    const sketch = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name || 'Untitled Sketch',
        canvasData: null,
        stickers: [],
        createdAt: new Date().toISOString(),
    };
    sketches.push(sketch);
    saveSketches();
    return sketch;
}

function deleteSketch(id) {
    sketches = sketches.filter(s => s.id !== id);
    if (currentSketchId === id) currentSketchId = null;
    saveSketches();
    renderLayout();
}

function renameSketch(id, newName) {
    const sketch = sketches.find(s => s.id === id);
    if (sketch) {
        sketch.name = newName;
        saveSketches();
    }
}

// ── UI Rendering ───────────────────────────────────────────────
export function renderLayout() {
    const container = document.getElementById('layoutContent');
    if (!container) return;

    // Clean up old keyboard handler
    if (container._keyHandler) {
        document.removeEventListener('keydown', container._keyHandler);
        container._keyHandler = null;
    }

    if (!currentSketchId) {
        renderSketchList(container);
    } else {
        renderEditor(container);
    }
}

function renderSketchList(container) {
    container.innerHTML = '';

    if (sketches.length === 0) {
        container.innerHTML = `
            <div class="layout-empty-state">
                <div class="icon-size-jumbo">🎨</div>
                <h3>No Garden Sketches Yet</h3>
                <p>Draw your garden layout freehand — outline beds, paths, and place plant labels.</p>
                <button class="layout-btn layout-btn-primary" id="layoutEmptyAddBtn">
                    ✏️ Create First Sketch
                </button>
            </div>
        `;
        container.querySelector('#layoutEmptyAddBtn')?.addEventListener('click', openNewSketchModal);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'layout-sketch-grid';

    for (const sketch of sketches) {
        const card = document.createElement('div');
        card.className = 'layout-sketch-card';

        const preview = document.createElement('div');
        preview.className = 'layout-sketch-preview';
        if (sketch.canvasData) {
            const img = document.createElement('img');
            img.src = sketch.canvasData;
            img.alt = sketch.name;
            preview.appendChild(img);
        } else {
            preview.innerHTML = '<span class="layout-sketch-placeholder">🎨</span>';
        }
        preview.addEventListener('click', () => openSketch(sketch.id));

        const info = document.createElement('div');
        info.className = 'layout-sketch-info';
        info.innerHTML = `
            <span class="layout-sketch-name">${sketch.name}</span>
            <span class="layout-sketch-date">${new Date(sketch.createdAt).toLocaleDateString()}</span>
        `;

        const actions = document.createElement('div');
        actions.className = 'layout-sketch-actions';
        actions.innerHTML = `
            <button class="layout-sketch-action-btn" data-action="open" title="Open">✏️</button>
            <button class="layout-sketch-action-btn" data-action="rename" title="Rename">📝</button>
            <button class="layout-sketch-action-btn layout-sketch-action-btn--danger" data-action="delete" title="Delete">🗑️</button>
        `;

        actions.querySelector('[data-action="open"]').addEventListener('click', () => openSketch(sketch.id));
        actions.querySelector('[data-action="rename"]').addEventListener('click', () => openRenameModal(sketch));
        actions.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDeleteSketch(sketch));

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(actions);
        grid.appendChild(card);
    }

    container.appendChild(grid);
}

function renderEditor(container) {
    const sketch = getCurrentSketch();
    if (!sketch) {
        currentSketchId = null;
        renderLayout();
        return;
    }

    stickers = sketch.stickers ? JSON.parse(JSON.stringify(sketch.stickers)) : [];
    undoStack = [];
    redoStack = [];

    container.innerHTML = `
        <div class="layout-editor">
            <div class="layout-editor-toolbar">
                <div class="layout-toolbar-group">
                    <button class="layout-tool-btn active" data-tool="pen" title="Pen">✏️</button>
                    <button class="layout-tool-btn" data-tool="line" title="Line">╱</button>
                    <button class="layout-tool-btn" data-tool="rect" title="Rectangle">▭</button>
                    <button class="layout-tool-btn" data-tool="ellipse" title="Ellipse">◯</button>
                    <button class="layout-tool-btn" data-tool="text" title="Text label">T</button>
                    <button class="layout-tool-btn" data-tool="eraser" title="Eraser">⌫</button>
                </div>
                <div class="layout-toolbar-separator"></div>
                <div class="layout-toolbar-group layout-color-group">
                    ${COLORS.map((c, i) => `
                        <button class="layout-color-swatch${i === 0 ? ' active' : ''}"
                                data-color="${c}"
                                style="background: ${c};"
                                title="Color"></button>
                    `).join('')}
                </div>
                <div class="layout-toolbar-separator"></div>
                <div class="layout-toolbar-group layout-width-group">
                    ${LINE_WIDTHS.map((w, i) => `
                        <button class="layout-width-btn${i === 1 ? ' active' : ''}"
                                data-width="${w}" title="${w}px">
                            <span class="layout-width-dot" style="width: ${w + 2}px; height: ${w + 2}px;"></span>
                        </button>
                    `).join('')}
                </div>
                <div class="layout-toolbar-separator"></div>
                <div class="layout-toolbar-group">
                    <button class="layout-tool-btn" id="layoutUndoBtn" title="Undo" disabled>↩</button>
                    <button class="layout-tool-btn" id="layoutRedoBtn" title="Redo" disabled>↪</button>
                </div>
                <div class="layout-toolbar-separator"></div>
                <div class="layout-toolbar-group">
                    <button class="layout-tool-btn" id="layoutClearBtn" title="Clear canvas">🗑️</button>
                    <button class="layout-tool-btn" id="layoutExportBtn" title="Export PNG">💾</button>
                </div>
                <div class="layout-toolbar-group layout-toolbar-back">
                    <button class="layout-btn layout-btn-secondary" id="layoutBackToList">← Back</button>
                </div>
            </div>

            <div class="layout-editor-body">
                <div class="layout-canvas-wrapper">
                    <canvas id="layoutCanvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
                </div>
                <div class="layout-plant-sidebar">
                    <h4 class="layout-sidebar-title">Plant Stickers</h4>
                    <p class="layout-sidebar-hint">Click to place on canvas. Drag to move. Double-click to remove.</p>
                    <div id="layoutPlantList" class="layout-plant-list"></div>
                </div>
            </div>
        </div>
    `;

    // Set up canvas
    canvas = document.getElementById('layoutCanvas');
    ctx = canvas.getContext('2d');

    if (sketch.canvasData) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            drawStickers();
        };
        img.src = sketch.canvasData;
    } else {
        drawGrid();
    }

    setupCanvasEvents();
    setupToolbarEvents(container);
    populatePlantSidebar();
    updateCanvasCursor();
}

function setupToolbarEvents(container) {
    // Tool selection
    container.querySelectorAll('.layout-tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.layout-tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTool = btn.dataset.tool;
            updateCanvasCursor();
        });
    });

    // Color selection
    container.querySelectorAll('.layout-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.layout-color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeColor = btn.dataset.color;
        });
    });

    // Width selection
    container.querySelectorAll('.layout-width-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.layout-width-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeWidth = parseInt(btn.dataset.width, 10);
        });
    });

    // Undo / Redo
    document.getElementById('layoutUndoBtn')?.addEventListener('click', undo);
    document.getElementById('layoutRedoBtn')?.addEventListener('click', redo);

    // Clear
    document.getElementById('layoutClearBtn')?.addEventListener('click', () => {
        const { showConfirmDialog } = window.GardeningApp.modules.ui;
        showConfirmDialog(
            'Clear canvas? This cannot be undone.',
            () => {
                pushUndo();
                stickers = [];
                ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
                drawGrid();
                saveCanvasState();
            }
        );
    });

    // Export
    document.getElementById('layoutExportBtn')?.addEventListener('click', exportAsPng);

    // Back to list
    document.getElementById('layoutBackToList')?.addEventListener('click', () => {
        currentSketchId = null;
        renderLayout();
    });

    // Keyboard shortcuts
    const keyHandler = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (!document.body.classList.contains('layout-active')) return;
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') { e.preventDefault(); undo(); }
            if (e.key === 'y') { e.preventDefault(); redo(); }
        }
    };
    document.addEventListener('keydown', keyHandler);
    container._keyHandler = keyHandler;
}

function updateCanvasCursor() {
    if (!canvas) return;
    const cursors = {
        [TOOLS.PEN]: 'crosshair',
        [TOOLS.LINE]: 'crosshair',
        [TOOLS.RECT]: 'crosshair',
        [TOOLS.ELLIPSE]: 'crosshair',
        [TOOLS.TEXT]: 'text',
        [TOOLS.ERASER]: 'cell',
    };
    canvas.style.cursor = cursors[activeTool] || 'default';
}

function populatePlantSidebar() {
    const list = document.getElementById('layoutPlantList');
    if (!list) return;

    const plants = getSelectedPlantNames();

    if (plants.length === 0) {
        list.innerHTML = `
            <div class="layout-sidebar-empty">
                <p>No plants selected yet.</p>
                <p>Select plants in the Schedule tab — they'll appear here as stickers.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    for (const name of plants) {
        const btn = document.createElement('button');
        btn.className = 'layout-plant-sticker-btn';
        btn.textContent = '🌱 ' + name;
        btn.addEventListener('click', () => addSticker(name));
        list.appendChild(btn);
    }
}

// ── Modals ─────────────────────────────────────────────────────
function openNewSketchModal() {
    const { showModal } = window.GardeningApp.modules.ui;
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Sketch name:</label>
            <input type="text" id="newSketchName"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   placeholder="e.g. Backyard Overview, Raised Beds..." autofocus>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="newSketchCancel" class="layout-btn layout-btn-secondary">Cancel</button>
            <button id="newSketchCreate" class="layout-btn layout-btn-primary">Create</button>
        </div>
    `;
    const modal = showModal('New Garden Sketch', content, { width: '400px' });
    const input = content.querySelector('#newSketchName');

    const submit = () => {
        const name = input.value.trim() || 'Untitled Sketch';
        const sketch = createSketch(name);
        openSketch(sketch.id);
        modal.close();
    };

    content.querySelector('#newSketchCreate').addEventListener('click', submit);
    content.querySelector('#newSketchCancel').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => input.focus(), 50);
}

function openRenameModal(sketch) {
    const { showModal } = window.GardeningApp.modules.ui;
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Sketch name:</label>
            <input type="text" id="renameSketchInput"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   value="${sketch.name}">
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="renameSketchCancel" class="layout-btn layout-btn-secondary">Cancel</button>
            <button id="renameSketchSave" class="layout-btn layout-btn-primary">Save</button>
        </div>
    `;
    const modal = showModal('Rename Sketch', content, { width: '400px' });
    const input = content.querySelector('#renameSketchInput');

    const submit = () => {
        const name = input.value.trim();
        if (name) {
            renameSketch(sketch.id, name);
            renderLayout();
        }
        modal.close();
    };

    content.querySelector('#renameSketchSave').addEventListener('click', submit);
    content.querySelector('#renameSketchCancel').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => { input.focus(); input.select(); }, 50);
}

function confirmDeleteSketch(sketch) {
    const { showConfirmDialog } = window.GardeningApp.modules.ui;
    showConfirmDialog(
        `Delete "${sketch.name}"? This cannot be undone.`,
        () => deleteSketch(sketch.id)
    );
}

function openSketch(id) {
    currentSketchId = id;
    activeTool = TOOLS.PEN;
    activeColor = COLORS[0];
    activeWidth = 4;
    renderLayout();
}

// ── Init ───────────────────────────────────────────────────────
export function initLayout() {
    loadSketches();

    const addBtn = document.getElementById('layoutAddSketchBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openNewSketchModal);
    }

    console.log('Layout (canvas sketch) module initialized');
}

export { loadSketches, saveSketches };
