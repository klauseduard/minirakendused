/**
 * Garden Layout Module — Option D: Hybrid (Structured Beds + Sketch Canvas)
 * Fabric.js variant — full object manipulation, vector persistence/export.
 *
 * Storage: bed.fabricJson = canvas.toJSON() — structured object data.
 * Export: SVG via canvas.toSVG() + grid overlay.
 * Thumbnail: small JPEG for bed list preview only.
 */

import { getSelectedItems } from './storage.js';
import { showModal, showConfirmDialog, showNotification } from './ui.js';

const STORAGE_KEY = 'gardening_layout_hybrid';

// Custom properties to persist in Fabric JSON serialization
const CUSTOM_PROPS = ['isSticker', 'plantName', 'stickerColor'];

let beds = [];
let activeBedId = null;

let fCanvas = null;
let currentTool = 'pen';
let currentColor = '#2d5016';
let lineWidth = 3;
let placingSticker = null;
let clipboard = null;
let activeKeyHandler = null;

const COLORS = ['#2d5016', '#c75b12', '#8b4513', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#2c3e50'];

const TOOLS = [
    { id: 'pen', label: 'Pen', icon: '✏️' },
    { id: 'select', label: 'Select', icon: '👆' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'rect', label: 'Rect', icon: '⬜' },
    { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
    { id: 'text', label: 'Text', icon: '🔤' },
    { id: 'sticker', label: 'Plants', icon: '🌱' }
];

// ── Storage ─────────────────────────────────────────────────────────

function loadBeds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        beds = raw ? JSON.parse(raw) : [];
        beds.forEach(bed => {
            if (!bed.fabricJson) bed.fabricJson = null;
        });
    } catch (e) {
        console.error('Failed to load layout beds:', e);
        beds = [];
    }
}

function saveBeds() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(beds));
    } catch (e) {
        console.error('Failed to save layout beds:', e);
    }
}

// ── Helpers ─────────────────────────────────────────────────────────

function getPlantName(item) {
    const lang = window.GardeningApp?.currentLang || 'en';
    if (typeof item === 'object' && item !== null) {
        return item[lang] || item.en || String(item);
    }
    return String(item);
}

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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function countStickers(bed) {
    if (!bed.fabricJson || !bed.fabricJson.objects) return 0;
    return bed.fabricJson.objects.filter(o => o.isSticker).length;
}

// ── Fabric canvas setup ─────────────────────────────────────────────

/**
 * Draw the grid background onto the lower canvas (not part of object model)
 */
function drawGridBackground(bed, canvasW, canvasH) {
    const lowerCanvas = fCanvas.lowerCanvasEl;
    const lctx = lowerCanvas.getContext('2d');

    lctx.fillStyle = '#f5f0e6';
    lctx.fillRect(0, 0, canvasW, canvasH);

    const pxPerMeter = canvasW / bed.width;
    const gridSpacing = pxPerMeter * 0.3;

    lctx.strokeStyle = 'rgba(139, 105, 20, 0.15)';
    lctx.lineWidth = 1;

    for (let x = gridSpacing; x < canvasW; x += gridSpacing) {
        lctx.beginPath();
        lctx.moveTo(Math.round(x) + 0.5, 0);
        lctx.lineTo(Math.round(x) + 0.5, canvasH);
        lctx.stroke();
    }
    for (let y = gridSpacing; y < canvasH; y += gridSpacing) {
        lctx.beginPath();
        lctx.moveTo(0, Math.round(y) + 0.5);
        lctx.lineTo(canvasW, Math.round(y) + 0.5);
        lctx.stroke();
    }

    lctx.strokeStyle = '#8b6914';
    lctx.lineWidth = 2;
    lctx.strokeRect(1, 1, canvasW - 2, canvasH - 2);
}

/**
 * Set drawing mode based on current tool
 */
function applyToolMode() {
    if (!fCanvas) return;

    fCanvas.isDrawingMode = false;
    fCanvas.selection = false;
    fCanvas.defaultCursor = 'crosshair';
    fCanvas.forEachObject(o => { o.selectable = false; o.evented = false; });

    if (currentTool === 'pen') {
        fCanvas.isDrawingMode = true;
        fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas);
        fCanvas.freeDrawingBrush.color = currentColor;
        fCanvas.freeDrawingBrush.width = lineWidth;
    } else if (currentTool === 'select') {
        fCanvas.selection = true;
        fCanvas.defaultCursor = 'default';
        fCanvas.forEachObject(o => { o.selectable = true; o.evented = true; });
    } else if (currentTool === 'sticker') {
        fCanvas.defaultCursor = 'copy';
    }
}

function generateThumbnail() {
    if (!fCanvas) return null;
    // Scale down large canvases to ~200px wide; never upscale small ones
    const multiplier = Math.min(1, 200 / fCanvas.width);
    return fCanvas.toDataURL({ format: 'jpeg', quality: 0.6, multiplier });
}

// ── Plant stickers as Fabric objects ────────────────────────────────

function createStickerObject(plantName, x, y, color) {
    const label = new fabric.Text('\ud83c\udf31 ' + plantName, {
        fontSize: 14,
        fontFamily: "'Source Sans 3', sans-serif",
        fontWeight: 'bold',
        fill: color,
    });

    const padding = 6;
    const bg = new fabric.Rect({
        width: label.width + padding * 2,
        height: label.height + padding,
        fill: 'rgba(255, 255, 255, 0.92)',
        stroke: color,
        strokeWidth: 1.5,
        rx: 4,
        ry: 4,
    });

    const group = new fabric.Group([bg, label], {
        left: x,
        top: y,
        isSticker: true,
        plantName: plantName,
        stickerColor: color,
    });

    fCanvas.add(group);
    return group;
}

/**
 * Migrate old HTML-overlay stickers to Fabric objects
 */
function migrateOldStickers(bed) {
    if (!bed.stickers || bed.stickers.length === 0 || !fCanvas) return;

    const canvasW = fCanvas.width;
    const canvasH = fCanvas.height;

    bed.stickers.forEach(s => {
        createStickerObject(s.text, (s.x / 100) * canvasW, (s.y / 100) * canvasH, s.color || '#2d5016');
    });

    bed.stickers = [];
    fCanvas.renderAll();
}

// ── Shape drawing with mouse events ─────────────────────────────────

let shapeStartX = 0, shapeStartY = 0;
let activeShape = null;
let suppressUndo = false;
let onSaveState = null;

function setupShapeDrawing() {
    if (!fCanvas) return;

    fCanvas.on('mouse:down', function(opt) {
        // Sticker placement
        if (currentTool === 'sticker' && placingSticker) {
            const pointer = fCanvas.getPointer(opt.e);
            createStickerObject(placingSticker, pointer.x, pointer.y, currentColor);
            fCanvas.renderAll();
            return;
        }

        if (['line', 'rect', 'ellipse'].includes(currentTool)) {
            suppressUndo = true;
            const pointer = fCanvas.getPointer(opt.e);
            shapeStartX = pointer.x;
            shapeStartY = pointer.y;

            if (currentTool === 'line') {
                activeShape = new fabric.Line(
                    [pointer.x, pointer.y, pointer.x, pointer.y],
                    { stroke: currentColor, strokeWidth: lineWidth, selectable: false, evented: false }
                );
            } else if (currentTool === 'rect') {
                activeShape = new fabric.Rect({
                    left: pointer.x, top: pointer.y, width: 0, height: 0,
                    fill: 'transparent', stroke: currentColor, strokeWidth: lineWidth,
                    selectable: false, evented: false
                });
            } else if (currentTool === 'ellipse') {
                activeShape = new fabric.Ellipse({
                    left: pointer.x, top: pointer.y, rx: 0, ry: 0,
                    fill: 'transparent', stroke: currentColor, strokeWidth: lineWidth,
                    selectable: false, evented: false
                });
            }

            if (activeShape) fCanvas.add(activeShape);
        } else if (currentTool === 'text') {
            const pointer = fCanvas.getPointer(opt.e);
            promptText(pointer.x, pointer.y);
        }
    });

    fCanvas.on('mouse:move', function(opt) {
        if (!activeShape) return;
        const pointer = fCanvas.getPointer(opt.e);

        if (currentTool === 'line') {
            activeShape.set({ x2: pointer.x, y2: pointer.y });
        } else if (currentTool === 'rect') {
            const left = Math.min(shapeStartX, pointer.x);
            const top = Math.min(shapeStartY, pointer.y);
            activeShape.set({
                left, top,
                width: Math.abs(pointer.x - shapeStartX),
                height: Math.abs(pointer.y - shapeStartY)
            });
        } else if (currentTool === 'ellipse') {
            const rx = Math.abs(pointer.x - shapeStartX) / 2;
            const ry = Math.abs(pointer.y - shapeStartY) / 2;
            activeShape.set({
                left: Math.min(shapeStartX, pointer.x),
                top: Math.min(shapeStartY, pointer.y),
                rx, ry
            });
        }
        fCanvas.renderAll();
    });

    fCanvas.on('mouse:up', function() {
        if (activeShape) {
            activeShape.setCoords();
            activeShape = null;
            suppressUndo = false;
            if (onSaveState) onSaveState();
        }
    });
}

/**
 * Prompt for text and place as IText object
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
            const itext = new fabric.IText(text, {
                left: x, top: y,
                fontFamily: "'Source Sans 3', sans-serif",
                fontWeight: 'bold',
                fontSize,
                fill: currentColor,
                selectable: currentTool === 'select',
                evented: currentTool === 'select'
            });
            fCanvas.add(itext);
            fCanvas.renderAll();
            close();
        });
        document.getElementById('layoutTextInput')?.focus();
    }, 100);
}

// ── Copy / Paste ────────────────────────────────────────────────────

function copySelection() {
    const active = fCanvas?.getActiveObject();
    if (!active) return;
    active.clone(function(cloned) {
        clipboard = cloned;
    }, CUSTOM_PROPS);
}

function pasteClipboard() {
    if (!clipboard || !fCanvas) return;
    clipboard.clone(function(cloned) {
        fCanvas.discardActiveObject();
        cloned.set({
            left: cloned.left + 20,
            top: cloned.top + 20,
        });
        if (cloned.type === 'activeSelection') {
            cloned.canvas = fCanvas;
            cloned.forEachObject(function(obj) {
                fCanvas.add(obj);
            });
            cloned.setCoords();
        } else {
            fCanvas.add(cloned);
        }
        clipboard.left += 20;
        clipboard.top += 20;

        // Switch to select mode so pasted objects are interactive
        currentTool = 'select';
        document.querySelectorAll('.layout-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'select');
        });
        applyToolMode();

        fCanvas.setActiveObject(cloned);
        fCanvas.requestRenderAll();
    }, CUSTOM_PROPS);
}

// ── Layout views ────────────────────────────────────────────────────

function renderLayout() {
    const content = document.getElementById('layoutContent');
    if (!content) return;

    if (beds.length === 0) {
        content.innerHTML = `
            <div class="layout-empty-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">\ud83c\udf3f</div>
                <h3>No Garden Beds Yet</h3>
                <p>Define your garden beds (raised beds, rows, borders) and sketch plant placements inside each one.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="layout-bed-grid">
            ${beds.map(bed => {
                const stickerCount = countStickers(bed);
                return `
                <div class="layout-bed-card" data-id="${bed.id}">
                    <div class="layout-bed-preview">
                        ${bed.canvasData
                            ? `<img src="${bed.canvasData}" alt="${escapeHtml(bed.name)}" class="layout-bed-thumb">`
                            : `<div class="layout-bed-placeholder">\ud83c\udf31</div>`
                        }
                    </div>
                    <div class="layout-bed-info">
                        <h3 class="layout-bed-name">${escapeHtml(bed.name)}</h3>
                        <span class="layout-bed-dims">${bed.width}m \u00d7 ${bed.height}m</span>
                        ${stickerCount > 0
                            ? `<span class="layout-bed-plant-count">${stickerCount} plant${stickerCount !== 1 ? 's' : ''}</span>`
                            : ''
                        }
                        ${bed.notes ? `<p class="layout-bed-notes">${escapeHtml(bed.notes)}</p>` : ''}
                    </div>
                    <div class="layout-bed-actions">
                        <button class="layout-bed-edit-btn" data-id="${bed.id}" title="Edit sketch">\u270f\ufe0f</button>
                        <button class="layout-bed-delete-btn" data-id="${bed.id}" title="Delete bed">\ud83d\uddd1\ufe0f</button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;

    content.querySelectorAll('.layout-bed-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.layout-bed-delete-btn')) return;
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
                name, width, height, shape, notes,
                fabricJson: null,
                canvasData: null,
                createdAt: new Date().toISOString()
            };

            beds.push(bed);
            saveBeds();
            close();
            renderLayout();
            showNotification(`"${name}" created \u2014 tap to start sketching`, 'success');
        });
        document.getElementById('bedNameInput')?.focus();
    }, 100);
}

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

// ── Bed editor ──────────────────────────────────────────────────────

function openBedEditor(bedId) {
    const bed = beds.find(b => b.id === bedId);
    if (!bed) return;

    // Clean up previous editor if open
    if (fCanvas) {
        const prevBed = beds.find(b => b.id === activeBedId);
        if (prevBed) saveBedCanvas(prevBed);
        cleanupEditor();
        fCanvas.dispose();
        fCanvas = null;
    }

    activeBedId = bedId;

    const content = document.getElementById('layoutContent');
    if (!content) return;

    const isMobile = window.innerWidth <= 768;
    const availWidth = isMobile ? window.innerWidth - 20 : Math.min(window.innerWidth - 40, 800);
    const maxHeight = isMobile ? window.innerHeight - 260 : 600;
    const scale = Math.min(availWidth / bed.width, maxHeight / bed.height);
    const canvasW = Math.round(bed.width * scale);
    const canvasH = Math.round(bed.height * scale);

    content.innerHTML = `
        <div class="layout-editor">
            <div class="layout-editor-header">
                <button class="layout-editor-back" id="layoutEditorBack">\u2190 Back</button>
                <h3 class="layout-editor-title">${escapeHtml(bed.name)} <span class="layout-editor-dims">${bed.width}m \u00d7 ${bed.height}m</span></h3>
                <div class="layout-editor-actions">
                    <button class="layout-editor-action-btn" id="layoutUndoBtn" title="Undo (Ctrl+Z)">\u21a9</button>
                    <button class="layout-editor-action-btn" id="layoutRedoBtn" title="Redo (Ctrl+Y)">\u21aa</button>
                    <button class="layout-editor-action-btn" id="layoutDeleteObjBtn" title="Delete selected (Del)">\ud83d\uddd1\ufe0f</button>
                    <button class="layout-editor-action-btn layout-action-overflow" id="layoutBringFrontBtn" title="Bring to front">\u2b06\ufe0f</button>
                    <button class="layout-editor-action-btn layout-action-overflow" id="layoutSendBackBtn" title="Send to back">\u2b07\ufe0f</button>
                    <button class="layout-editor-action-btn layout-action-overflow" id="layoutClearBtn" title="Clear all">\u2716</button>
                    <button class="layout-editor-action-btn layout-action-overflow" id="layoutExportBtn" title="Export as SVG">\ud83d\udcbe</button>
                    <button class="layout-editor-action-btn layout-overflow-toggle" id="layoutOverflowToggle" title="More actions">\u22ef</button>
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
                ${renderBedShape(bed.shape, canvasW, canvasH)}
            </div>
            <div class="layout-sticker-panel" id="layoutStickerPanel" style="display: none;">
                <div class="layout-sticker-header">
                    <span>Select a plant, then click on the bed to place it</span>
                    <button class="layout-sticker-cancel" id="layoutStickerCancel">Done</button>
                </div>
                <div class="layout-sticker-list" id="layoutStickerList"></div>
            </div>
            <div class="layout-bed-notes-editor">
                <label for="layoutBedNotes" class="form-label">Notes</label>
                <textarea id="layoutBedNotes" class="form-textarea layout-notes-textarea" rows="3"
                    placeholder="Describe this bed's planting plan, companion planting strategy, etc.">${bed.notes || ''}</textarea>
            </div>
            <div class="layout-grid-info">
                <span class="layout-grid-label">Grid: ~30cm squares | Select (\ud83d\udc46) to move, resize, copy objects | Del to remove</span>
            </div>
        </div>
    `;

    // Initialize Fabric canvas
    fCanvas = new fabric.Canvas('layoutCanvas', {
        isDrawingMode: true,
        backgroundColor: '#f5f0e6',
        preserveObjectStacking: true,
        width: canvasW,
        height: canvasH
    });

    drawGridBackground(bed, canvasW, canvasH);

    if (bed.fabricJson) {
        fCanvas.loadFromJSON(bed.fabricJson, () => {
            drawGridBackground(bed, canvasW, canvasH);
            fCanvas.renderAll();
            applyToolMode();
            migrateOldStickers(bed);
        });
    } else {
        applyToolMode();
        migrateOldStickers(bed);
    }

    setupShapeDrawing();
    bindEditorEvents(bed);
}

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

// ── Sticker panel ───────────────────────────────────────────────────

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
                data-plant="${escapeHtml(name)}">
            \ud83c\udf31 ${escapeHtml(name)}
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

// ── Save / Export ───────────────────────────────────────────────────

function saveBedCanvas(bed) {
    if (fCanvas) {
        bed.fabricJson = fCanvas.toJSON(CUSTOM_PROPS);
        bed.canvasData = generateThumbnail();
    }
    saveBeds();
}

function exportBed(bed) {
    if (!fCanvas) return;

    const w = fCanvas.width;
    const h = fCanvas.height;
    const pxPerMeter = w / bed.width;
    const gridSpacing = pxPerMeter * 0.3;

    let svg = fCanvas.toSVG();

    // Build grid + border + title to append before closing </svg>
    let extra = '<g id="grid" opacity="0.15">\n';
    for (let x = gridSpacing; x < w; x += gridSpacing) {
        extra += `  <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${h}" stroke="#8b6914" stroke-width="1"/>\n`;
    }
    for (let y = gridSpacing; y < h; y += gridSpacing) {
        extra += `  <line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="#8b6914" stroke-width="1"/>\n`;
    }
    extra += '</g>\n';
    extra += `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#8b6914" stroke-width="2"/>\n`;
    extra += `<text x="8" y="${h - 10}" font-family="Source Sans 3, sans-serif" font-weight="bold" font-size="16" fill="rgba(0,0,0,0.7)">${escapeHtml(bed.name)} (${bed.width}m \u00d7 ${bed.height}m)</text>\n`;

    svg = svg.replace('</svg>', extra + '</svg>');

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `garden-bed-${bed.name.replace(/\s+/g, '-').toLowerCase()}.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showNotification('Bed exported as SVG', 'success');
}

// ── Event binding ───────────────────────────────────────────────────

function cleanupEditor() {
    if (activeKeyHandler) {
        document.removeEventListener('keydown', activeKeyHandler);
        activeKeyHandler = null;
    }
}

function deleteActiveObjects() {
    if (!fCanvas) return;
    const active = fCanvas.getActiveObject();
    if (!active) return;

    if (active.type === 'activeSelection') {
        active.forEachObject(obj => fCanvas.remove(obj));
        fCanvas.discardActiveObject();
    } else {
        fCanvas.remove(active);
        fCanvas.discardActiveObject();
    }
    fCanvas.renderAll();
}

function bindEditorEvents(bed) {
    // Clean up any previous key handler
    cleanupEditor();

    // Back button
    document.getElementById('layoutEditorBack')?.addEventListener('click', () => {
        cleanupEditor();
        saveBedCanvas(bed);
        if (fCanvas) { fCanvas.dispose(); fCanvas = null; }
        activeBedId = null;
        renderLayout();
    });

    // Notes
    document.getElementById('layoutBedNotes')?.addEventListener('input', (e) => {
        bed.notes = e.target.value.trim();
        saveBeds();
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

            applyToolMode();
        });
    });

    // Color selection
    document.querySelectorAll('.layout-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            currentColor = btn.dataset.color;
            document.querySelectorAll('.layout-color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (fCanvas && fCanvas.isDrawingMode && fCanvas.freeDrawingBrush) {
                fCanvas.freeDrawingBrush.color = currentColor;
            }
        });
    });

    // Line width
    document.getElementById('layoutLineWidth')?.addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
        if (fCanvas && fCanvas.isDrawingMode && fCanvas.freeDrawingBrush) {
            fCanvas.freeDrawingBrush.width = lineWidth;
        }
    });

    // ── Undo/Redo ───────────────────────────────────────────────────
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO = 30;

    function saveState() {
        if (suppressUndo) return;
        undoStack.push(JSON.stringify(fCanvas.toJSON(CUSTOM_PROPS)));
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
    }

    function restoreState(stateJson) {
        fCanvas.off('object:added', saveState);
        fCanvas.off('object:modified', saveState);
        fCanvas.off('object:removed', saveState);

        fCanvas.loadFromJSON(stateJson, () => {
            drawGridBackground(bed, fCanvas.width, fCanvas.height);
            fCanvas.renderAll();
            applyToolMode();
            fCanvas.on('object:added', saveState);
            fCanvas.on('object:modified', saveState);
            fCanvas.on('object:removed', saveState);
        });
    }

    saveState();
    onSaveState = saveState;
    fCanvas.on('object:added', saveState);
    fCanvas.on('object:modified', saveState);
    fCanvas.on('object:removed', saveState);

    document.getElementById('layoutUndoBtn')?.addEventListener('click', () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        restoreState(undoStack[undoStack.length - 1]);
    });

    document.getElementById('layoutRedoBtn')?.addEventListener('click', () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);
        restoreState(state);
    });

    // Delete selected
    document.getElementById('layoutDeleteObjBtn')?.addEventListener('click', deleteActiveObjects);

    // Bring to front / Send to back
    document.getElementById('layoutBringFrontBtn')?.addEventListener('click', () => {
        const active = fCanvas.getActiveObject();
        if (active) {
            fCanvas.bringToFront(active);
            fCanvas.renderAll();
        }
    });

    document.getElementById('layoutSendBackBtn')?.addEventListener('click', () => {
        const active = fCanvas.getActiveObject();
        if (active) {
            fCanvas.sendToBack(active);
            fCanvas.renderAll();
        }
    });

    // Clear all
    document.getElementById('layoutClearBtn')?.addEventListener('click', () => {
        showConfirmDialog('Clear sketch?', 'This will erase all drawings and plant labels.', () => {
            fCanvas.clear();
            fCanvas.backgroundColor = '#f5f0e6';
            drawGridBackground(bed, fCanvas.width, fCanvas.height);
            fCanvas.renderAll();
        });
    });

    // Export
    document.getElementById('layoutExportBtn')?.addEventListener('click', () => exportBed(bed));

    // Overflow toggle for mobile action buttons
    document.getElementById('layoutOverflowToggle')?.addEventListener('click', () => {
        document.querySelector('.layout-editor-actions')?.classList.toggle('show-overflow');
    });

    // Sticker panel done
    document.getElementById('layoutStickerCancel')?.addEventListener('click', () => {
        placingSticker = null;
        document.getElementById('layoutStickerPanel').style.display = 'none';
        currentTool = 'select';
        document.querySelectorAll('.layout-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'select');
        });
        applyToolMode();
    });

    // Keyboard shortcuts — skip when user is typing in a text field
    activeKeyHandler = (e) => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            document.getElementById('layoutUndoBtn')?.click();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            document.getElementById('layoutRedoBtn')?.click();
        }
        if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            copySelection();
        }
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            pasteClipboard();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const active = fCanvas?.getActiveObject();
            if (active && !active.isEditing) {
                e.preventDefault();
                deleteActiveObjects();
            }
        }
    };
    document.addEventListener('keydown', activeKeyHandler);
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
            cleanupEditor();
            if (fCanvas) {
                fCanvas.dispose();
                fCanvas = null;
            }
            const closeLayout = window.GardeningApp?.closeLayoutPanel;
            if (closeLayout) closeLayout();
        });
    }

    renderLayout();
    console.log('Layout (hybrid + Fabric.js) module initialized');
}

export { renderLayout, loadBeds, saveBeds };
