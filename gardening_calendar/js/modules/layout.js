/**
 * Garden Layout Module — Option D: Hybrid (Structured Beds + Sketch Canvas)
 * Fabric.js variant — uses Fabric.js for canvas rendering with built-in
 * object manipulation (select, move, resize, rotate) and JSON serialization.
 *
 * Storage: bed.fabricJson = canvas.toJSON() — structured object data, not rasterized.
 * bed.canvasData = small JPEG thumbnail for bed list preview only.
 */

import { getSelectedItems } from './storage.js';
import { showModal, showConfirmDialog, showNotification } from './ui.js';

const STORAGE_KEY = 'gardening_layout_hybrid';

let beds = [];
let activeBedId = null;

// Fabric.js canvas instance
let fCanvas = null;
let currentTool = 'pen';
let currentColor = '#2d5016';
let lineWidth = 3;

// Sticker placement
let placingSticker = null;
let stickers = [];

const COLORS = ['#2d5016', '#c75b12', '#8b4513', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#2c3e50'];

const TOOLS = [
    { id: 'pen', label: 'Pen', icon: '✏️' },
    { id: 'select', label: 'Select', icon: '👆' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'rect', label: 'Rect', icon: '⬜' },
    { id: 'ellipse', label: 'Ellipse', icon: '⭕' },
    { id: 'text', label: 'Text', icon: '🔤' },
    { id: 'eraser', label: 'Eraser', icon: '🧹' },
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
    } else if (currentTool === 'eraser') {
        fCanvas.isDrawingMode = true;
        fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas);
        fCanvas.freeDrawingBrush.color = '#f5f0e6';
        fCanvas.freeDrawingBrush.width = lineWidth * 4;
    } else if (currentTool === 'select') {
        fCanvas.selection = true;
        fCanvas.defaultCursor = 'default';
        fCanvas.forEachObject(o => { o.selectable = true; o.evented = true; });
    }
}

/**
 * Generate thumbnail for bed list
 */
function generateThumbnail() {
    if (!fCanvas) return null;
    return fCanvas.toDataURL({ format: 'jpeg', quality: 0.6, multiplier: 0.25 });
}

// ── Shape drawing with mouse events ─────────────────────────────────

let shapeStartX = 0, shapeStartY = 0;
let activeShape = null;

function setupShapeDrawing() {
    if (!fCanvas) return;

    fCanvas.on('mouse:down', function(opt) {
        if (['line', 'rect', 'ellipse'].includes(currentTool)) {
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

// ── Layout views ────────────────────────────────────────────────────

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

    activeBedId = bedId;
    stickers = bed.stickers ? JSON.parse(JSON.stringify(bed.stickers)) : [];

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
                    <button class="layout-editor-action-btn" id="layoutDeleteObjBtn" title="Delete selected">🗑️</button>
                    <button class="layout-editor-action-btn" id="layoutClearBtn" title="Clear all">✖</button>
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
                <span class="layout-grid-label">Grid: ~30cm squares | Use Select tool (👆) to move/resize drawn objects</span>
            </div>
        </div>
    `;

    // Initialize Fabric canvas
    fCanvas = new fabric.Canvas('layoutCanvas', {
        isDrawingMode: true,
        backgroundColor: '#f5f0e6',
        width: canvasW,
        height: canvasH
    });

    // Draw grid on the background
    drawGridBackground(bed, canvasW, canvasH);

    // Restore saved Fabric JSON
    if (bed.fabricJson) {
        fCanvas.loadFromJSON(bed.fabricJson, () => {
            drawGridBackground(bed, canvasW, canvasH);
            fCanvas.renderAll();
            applyToolMode();
        });
    } else {
        applyToolMode();
    }

    // Setup shape drawing handlers
    setupShapeDrawing();

    // Render stickers
    renderStickers();

    // Bind editor events
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

// ── Stickers ────────────────────────────────────────────────────────

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

function saveBedCanvas(bed) {
    if (fCanvas) {
        bed.fabricJson = fCanvas.toJSON();
        bed.canvasData = generateThumbnail();
    }
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

function saveBedStickers(bed) {
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

function exportBed(bed) {
    if (!fCanvas) return;

    const dataUrl = fCanvas.toDataURL({ format: 'png', multiplier: 1 });
    const img = new Image();
    img.onload = () => {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = fCanvas.width;
        exportCanvas.height = fCanvas.height;
        const expCtx = exportCanvas.getContext('2d');

        expCtx.fillStyle = '#f5f0e6';
        expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        expCtx.drawImage(img, 0, 0);

        expCtx.font = 'bold 14px "Source Sans 3", sans-serif';
        stickers.forEach(s => {
            const px = (s.x / 100) * exportCanvas.width;
            const py = (s.y / 100) * exportCanvas.height;

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
        expCtx.fillText(bed.name + ` (${bed.width}m × ${bed.height}m)`, 8, exportCanvas.height - 10);

        const link = document.createElement('a');
        link.download = `garden-bed-${bed.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();

        showNotification('Bed exported as PNG', 'success');
    };
    img.src = dataUrl;
}

// ── Event binding ───────────────────────────────────────────────────

function bindEditorEvents(bed) {
    document.getElementById('layoutEditorBack')?.addEventListener('click', () => {
        saveBedCanvas(bed);
        if (fCanvas) {
            fCanvas.dispose();
            fCanvas = null;
        }
        activeBedId = null;
        renderLayout();
    });

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
                fCanvas.freeDrawingBrush.color = currentTool === 'eraser' ? '#f5f0e6' : currentColor;
            }
        });
    });

    // Line width
    document.getElementById('layoutLineWidth')?.addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
        if (fCanvas && fCanvas.isDrawingMode && fCanvas.freeDrawingBrush) {
            fCanvas.freeDrawingBrush.width = currentTool === 'eraser' ? lineWidth * 4 : lineWidth;
        }
    });

    // Undo/Redo via JSON state tracking
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO = 30;

    function saveState() {
        undoStack.push(JSON.stringify(fCanvas.toJSON()));
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
    }

    saveState();

    fCanvas.on('object:added', saveState);
    fCanvas.on('object:modified', saveState);
    fCanvas.on('object:removed', saveState);

    document.getElementById('layoutUndoBtn')?.addEventListener('click', () => {
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        const prev = undoStack[undoStack.length - 1];

        fCanvas.off('object:added', saveState);
        fCanvas.off('object:modified', saveState);
        fCanvas.off('object:removed', saveState);

        fCanvas.loadFromJSON(prev, () => {
            drawGridBackground(bed, fCanvas.width, fCanvas.height);
            fCanvas.renderAll();
            applyToolMode();
            fCanvas.on('object:added', saveState);
            fCanvas.on('object:modified', saveState);
            fCanvas.on('object:removed', saveState);
        });
    });

    document.getElementById('layoutRedoBtn')?.addEventListener('click', () => {
        if (redoStack.length === 0) return;
        const state = redoStack.pop();
        undoStack.push(state);

        fCanvas.off('object:added', saveState);
        fCanvas.off('object:modified', saveState);
        fCanvas.off('object:removed', saveState);

        fCanvas.loadFromJSON(state, () => {
            drawGridBackground(bed, fCanvas.width, fCanvas.height);
            fCanvas.renderAll();
            applyToolMode();
            fCanvas.on('object:added', saveState);
            fCanvas.on('object:modified', saveState);
            fCanvas.on('object:removed', saveState);
        });
    });

    // Delete selected object
    document.getElementById('layoutDeleteObjBtn')?.addEventListener('click', () => {
        const active = fCanvas.getActiveObject();
        if (active) {
            fCanvas.remove(active);
            fCanvas.discardActiveObject();
            fCanvas.renderAll();
        }
    });

    // Clear all
    document.getElementById('layoutClearBtn')?.addEventListener('click', () => {
        showConfirmDialog('Clear sketch?', 'This will erase all drawings (stickers will remain).', () => {
            fCanvas.clear();
            fCanvas.backgroundColor = '#f5f0e6';
            drawGridBackground(bed, fCanvas.width, fCanvas.height);
            fCanvas.renderAll();
        });
    });

    document.getElementById('layoutExportBtn')?.addEventListener('click', () => exportBed(bed));

    // Sticker cancel
    document.getElementById('layoutStickerCancel')?.addEventListener('click', () => {
        placingSticker = null;
        document.getElementById('layoutStickerPanel').style.display = 'none';
        const overlay = document.getElementById('layoutStickersOverlay');
        if (overlay) overlay.classList.remove('sticker-mode');
        currentTool = 'pen';
        document.querySelectorAll('.layout-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'pen');
        });
        applyToolMode();
    });

    // Keyboard shortcuts
    const keyHandler = (e) => {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            document.getElementById('layoutUndoBtn')?.click();
        }
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            document.getElementById('layoutRedoBtn')?.click();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const active = fCanvas?.getActiveObject();
            if (active && !active.isEditing) {
                e.preventDefault();
                fCanvas.remove(active);
                fCanvas.discardActiveObject();
                fCanvas.renderAll();
            }
        }
    };
    document.addEventListener('keydown', keyHandler);

    // Sticker overlay click
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
