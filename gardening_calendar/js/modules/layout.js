/**
 * Garden Layout Module — Option D: Hybrid (Structured Beds + Sketch Canvas)
 * SVG persistence — drawings stored as SVG documents, not rasterized bitmaps.
 *
 * Drawing UX uses Canvas 2D (smooth freehand), but persistence is SVG:
 * - On save: strokes → SVG document string (bed.svgData)
 * - On load: SVG → parse elements → replay on Canvas
 * - Export: download the actual SVG file (viewable in any browser/editor)
 * - Thumbnail: SVG data URL (no JPEG needed)
 *
 * SVG uses a viewBox of "0 0 {W} {H}" where W/H are proportional to bed
 * dimensions (1000 units wide). All coordinates are in this space.
 * No external dependencies.
 */

import { getSelectedItems } from './storage.js';
import { showModal, showConfirmDialog, showNotification } from './ui.js';

const STORAGE_KEY = 'gardening_layout_hybrid';
const SVG_SCALE = 1000; // viewBox width in SVG units

let beds = [];
let activeBedId = null;

// Canvas drawing state
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#2d5016';
let lineWidth = 3;

// Stroke tracking (in-memory for Canvas drawing + undo/redo)
let strokes = [];
let currentStroke = null;
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 30;
let startX, startY; // normalized start coords for shapes

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

// ── Storage ─────────────────────────────────────────────────────────

function loadBeds() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        beds = raw ? JSON.parse(raw) : [];
        beds.forEach(bed => {
            if (!bed.svgData) bed.svgData = null;
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

// ── SVG coordinate system ───────────────────────────────────────────

function svgViewBoxH(bed) {
    return Math.round(SVG_SCALE * bed.height / bed.width);
}

/** Convert normalized 0-1 coords to SVG viewBox coords */
function toSvg(nx, ny, bed) {
    return [nx * SVG_SCALE, ny * svgViewBoxH(bed)];
}

/** Convert SVG viewBox coords to normalized 0-1 */
function fromSvg(sx, sy, bed) {
    return [sx / SVG_SCALE, sy / svgViewBoxH(bed)];
}

/** Convert normalized 0-1 to canvas pixel coords */
function toPx(nx, ny) {
    return [nx * canvas.width, ny * canvas.height];
}

/** Convert canvas pixel coords to normalized 0-1 */
function toNorm(px, py) {
    return [px / canvas.width, py / canvas.height];
}

// ── SVG generation (strokes → SVG document) ─────────────────────────

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function strokesToSvg(bed) {
    const vbW = SVG_SCALE;
    const vbH = svgViewBoxH(bed);

    // Grid lines
    let gridLines = '';
    const gridStep = (SVG_SCALE / bed.width) * 0.3; // 30cm
    for (let x = gridStep; x < vbW; x += gridStep) {
        gridLines += `    <line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${vbH}" stroke="rgba(139,105,20,0.15)" stroke-width="1"/>\n`;
    }
    for (let y = gridStep; y < vbH; y += gridStep) {
        gridLines += `    <line x1="0" y1="${y.toFixed(1)}" x2="${vbW}" y2="${y.toFixed(1)}" stroke="rgba(139,105,20,0.15)" stroke-width="1"/>\n`;
    }

    // User drawing elements
    let drawingElements = '';
    for (const stroke of strokes) {
        if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
            if (!stroke.points || stroke.points.length < 1) continue;
            const d = stroke.points.map((p, i) => {
                const [sx, sy] = toSvg(p[0], p[1], bed);
                return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
            }).join(' ');
            const color = stroke.tool === 'eraser' ? '#f5f0e6' : stroke.color;
            const w = stroke.tool === 'eraser' ? stroke.lineWidth * 4 : stroke.lineWidth;
            drawingElements += `    <path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" data-tool="${stroke.tool}"/>\n`;
        } else if (stroke.tool === 'line') {
            const [x1, y1] = toSvg(stroke.start[0], stroke.start[1], bed);
            const [x2, y2] = toSvg(stroke.end[0], stroke.end[1], bed);
            drawingElements += `    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" stroke-linecap="round" data-tool="line"/>\n`;
        } else if (stroke.tool === 'rect') {
            const [x1, y1] = toSvg(stroke.start[0], stroke.start[1], bed);
            const [x2, y2] = toSvg(stroke.end[0], stroke.end[1], bed);
            const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
            const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
            drawingElements += `    <rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" fill="none" stroke-linecap="round" data-tool="rect"/>\n`;
        } else if (stroke.tool === 'ellipse') {
            const [x1, y1] = toSvg(stroke.start[0], stroke.start[1], bed);
            const [x2, y2] = toSvg(stroke.end[0], stroke.end[1], bed);
            const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
            const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
            drawingElements += `    <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" stroke="${stroke.color}" stroke-width="${stroke.lineWidth}" fill="none" stroke-linecap="round" data-tool="ellipse"/>\n`;
        } else if (stroke.tool === 'text') {
            const [sx, sy] = toSvg(stroke.position[0], stroke.position[1], bed);
            drawingElements += `    <text x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" fill="${stroke.color}" font-size="${stroke.fontSize}" font-weight="bold" font-family="'Source Sans 3', sans-serif" dominant-baseline="middle" data-tool="text">${escapeXml(stroke.text)}</text>\n`;
        }
    }

    // Sticker labels (also part of the SVG)
    let stickerElements = '';
    for (const s of stickers) {
        const sx = (s.x / 100) * vbW;
        const sy = (s.y / 100) * vbH;
        stickerElements += `    <g class="sticker" data-id="${s.id}" transform="translate(${sx.toFixed(1)},${sy.toFixed(1)})">\n`;
        stickerElements += `      <rect x="-4" y="-10" width="120" height="20" rx="4" fill="rgba(255,255,255,0.9)" stroke="${s.color}" stroke-width="1.5"/>\n`;
        stickerElements += `      <text x="4" y="3" fill="${s.color}" font-size="12" font-family="'Source Sans 3', sans-serif" font-weight="bold">${escapeXml(s.text)}</text>\n`;
        stickerElements += `    </g>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}"
     width="${bed.width * 100}" height="${bed.height * 100}"
     data-bed-name="${escapeXml(bed.name)}" data-bed-width="${bed.width}" data-bed-height="${bed.height}">
  <title>${escapeXml(bed.name)} (${bed.width}m × ${bed.height}m)</title>
  <rect width="100%" height="100%" fill="#f5f0e6"/>
  <g id="grid">
${gridLines}    <rect x="1" y="1" width="${vbW - 2}" height="${vbH - 2}" stroke="#8b6914" stroke-width="2" fill="none"/>
  </g>
  <g id="drawing">
${drawingElements}  </g>
  <g id="stickers">
${stickerElements}  </g>
</svg>`;
}

// ── SVG parsing (SVG document → strokes) ────────────────────────────

function svgToStrokes(svgString, bed) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const drawingGroup = doc.getElementById('drawing');
    if (!drawingGroup) return [];

    const parsed = [];
    for (const el of drawingGroup.children) {
        const tool = el.getAttribute('data-tool');
        if (!tool) continue;

        if ((tool === 'pen' || tool === 'eraser') && el.tagName === 'path') {
            const d = el.getAttribute('d') || '';
            const points = [];
            const commands = d.match(/[ML][^ML]*/g) || [];
            for (const cmd of commands) {
                const coords = cmd.substring(1).split(',').map(Number);
                if (coords.length === 2 && !isNaN(coords[0])) {
                    const [nx, ny] = fromSvg(coords[0], coords[1], bed);
                    points.push([nx, ny]);
                }
            }
            if (points.length > 0) {
                parsed.push({
                    tool,
                    color: tool === 'eraser' ? null : el.getAttribute('stroke'),
                    lineWidth: parseFloat(el.getAttribute('stroke-width')) / (tool === 'eraser' ? 4 : 1),
                    points
                });
            }
        } else if (tool === 'line' && el.tagName === 'line') {
            const x1 = parseFloat(el.getAttribute('x1'));
            const y1 = parseFloat(el.getAttribute('y1'));
            const x2 = parseFloat(el.getAttribute('x2'));
            const y2 = parseFloat(el.getAttribute('y2'));
            const [ns1, ns2] = fromSvg(x1, y1, bed);
            const [ne1, ne2] = fromSvg(x2, y2, bed);
            parsed.push({
                tool: 'line',
                color: el.getAttribute('stroke'),
                lineWidth: parseFloat(el.getAttribute('stroke-width')),
                start: [ns1, ns2],
                end: [ne1, ne2]
            });
        } else if (tool === 'rect' && el.tagName === 'rect') {
            const x = parseFloat(el.getAttribute('x'));
            const y = parseFloat(el.getAttribute('y'));
            const w = parseFloat(el.getAttribute('width'));
            const h = parseFloat(el.getAttribute('height'));
            const [ns1, ns2] = fromSvg(x, y, bed);
            const [ne1, ne2] = fromSvg(x + w, y + h, bed);
            parsed.push({
                tool: 'rect',
                color: el.getAttribute('stroke'),
                lineWidth: parseFloat(el.getAttribute('stroke-width')),
                start: [ns1, ns2],
                end: [ne1, ne2]
            });
        } else if (tool === 'ellipse' && el.tagName === 'ellipse') {
            const cx = parseFloat(el.getAttribute('cx'));
            const cy = parseFloat(el.getAttribute('cy'));
            const rx = parseFloat(el.getAttribute('rx'));
            const ry = parseFloat(el.getAttribute('ry'));
            const [ns1, ns2] = fromSvg(cx - rx, cy - ry, bed);
            const [ne1, ne2] = fromSvg(cx + rx, cy + ry, bed);
            parsed.push({
                tool: 'ellipse',
                color: el.getAttribute('stroke'),
                lineWidth: parseFloat(el.getAttribute('stroke-width')),
                start: [ns1, ns2],
                end: [ne1, ne2]
            });
        } else if (tool === 'text' && el.tagName === 'text') {
            const sx = parseFloat(el.getAttribute('x'));
            const sy = parseFloat(el.getAttribute('y'));
            const [nx, ny] = fromSvg(sx, sy, bed);
            parsed.push({
                tool: 'text',
                color: el.getAttribute('fill'),
                fontSize: parseFloat(el.getAttribute('font-size')),
                text: el.textContent,
                position: [nx, ny]
            });
        }
    }
    return parsed;
}

// ── SVG thumbnail for bed list ──────────────────────────────────────

function svgToDataUrl(svgString) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
}

// ── Canvas replay (strokes → Canvas drawing) ────────────────────────

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
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
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

function redrawCanvas(bed) {
    if (!canvas || !ctx) return;
    drawBedBackground(bed, canvas.width, canvas.height);
    strokes.forEach(stroke => replayStroke(stroke));
}

// ── Undo / Redo ─────────────────────────────────────────────────────

function saveUndoState() {
    undoStack.push(JSON.parse(JSON.stringify(strokes)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
}

function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    strokes = JSON.parse(JSON.stringify(undoStack[undoStack.length - 1]));
    const bed = beds.find(b => b.id === activeBedId);
    if (bed) redrawCanvas(bed);
}

function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    strokes = JSON.parse(JSON.stringify(state));
    const bed = beds.find(b => b.id === activeBedId);
    if (bed) redrawCanvas(bed);
}

// ── Canvas helpers ──────────────────────────────────────────────────

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
}

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
        const bed = beds.find(b => b.id === activeBedId);
        if (bed) {
            redrawCanvas(bed);
            drawShapePreview(...toPx(startX, startY), coords.x, coords.y);
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

        const bed = beds.find(b => b.id === activeBedId);
        if (bed) redrawCanvas(bed);
        saveUndoState();
    }
}

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
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

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

            const bed = beds.find(b => b.id === activeBedId);
            if (bed) redrawCanvas(bed);
            saveUndoState();
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
            ${beds.map(bed => {
                const thumbSrc = bed.svgData
                    ? svgToDataUrl(bed.svgData)
                    : (bed.canvasData || ''); // fallback for old bitmap data
                return `
                <div class="layout-bed-card" data-id="${bed.id}">
                    <div class="layout-bed-preview">
                        ${thumbSrc
                            ? `<img src="${thumbSrc}" alt="${bed.name}" class="layout-bed-thumb">`
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
                </div>`;
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
                svgData: null,
                canvasData: null, // kept for backward compat with old data
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

    // Restore strokes from SVG (or start fresh)
    if (bed.svgData) {
        strokes = svgToStrokes(bed.svgData, bed);
    } else {
        strokes = [];
    }
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
                    <button class="layout-editor-action-btn" id="layoutExportBtn" title="Export as SVG">💾</button>
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

    canvas = document.getElementById('layoutCanvas');
    ctx = canvas.getContext('2d');

    redrawCanvas(bed);
    saveUndoState();
    renderStickers();
    bindEditorEvents(bed);
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
    bed.svgData = strokesToSvg(bed);
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

function saveBedStickers(bed) {
    bed.stickers = JSON.parse(JSON.stringify(stickers));
    saveBeds();
}

function exportBed(bed) {
    const svgString = strokesToSvg(bed);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `garden-bed-${bed.name.replace(/\s+/g, '-').toLowerCase()}.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    showNotification('Bed exported as SVG', 'success');
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
    console.log('Layout (hybrid + SVG persistence) module initialized');
}

export { renderLayout, loadBeds, saveBeds };
