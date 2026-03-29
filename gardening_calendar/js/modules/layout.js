/**
 * Garden Layout Module — Photo Annotation Overlay
 *
 * Option C from the layout plan: upload a garden photo,
 * draw bed outlines and label plants on top via SVG overlay.
 */

import { getSelectedItems } from './storage.js';
import { calendarData } from './data.js';

// ── Constants ──────────────────────────────────────────────────
const STORAGE_KEY = 'gardening_layout_photos';

const TOOLS = {
    RECT:    'rect',
    POLYGON: 'polygon',
    LABEL:   'label',
    SELECT:  'select',
    ERASER:  'eraser',
};

const COLORS = [
    '#5a7247', '#c4956a', '#7a9e7e', '#b8860b',
    '#8b4513', '#2e6b4f', '#d4a574', '#c25a3c',
];

// ── State ──────────────────────────────────────────────────────
let layouts = [];
let currentLayoutId = null;
let activeTool = TOOLS.RECT;
let activeColor = COLORS[0];
let annotations = []; // Current layout's annotations
let selectedAnnotation = null;

// Drawing state
let isDrawing = false;
let drawStartX = 0;
let drawStartY = 0;
let polygonPoints = [];
let dragOffset = null;

// ── Persistence ────────────────────────────────────────────────
function loadLayouts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        layouts = raw ? JSON.parse(raw) : [];
    } catch {
        layouts = [];
    }
}

function saveLayouts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

function getCurrentLayout() {
    return layouts.find(l => l.id === currentLayoutId);
}

function saveAnnotations() {
    const layout = getCurrentLayout();
    if (layout) {
        layout.annotations = JSON.parse(JSON.stringify(annotations));
        saveLayouts();
    }
}

// ── Plant name helper ──────────────────────────────────────────
function getSelectedPlantNames() {
    const selections = getSelectedItems();
    const names = new Set();
    const lang = window.GardeningApp?.currentLang || 'en';

    for (const period in selections) {
        for (const category in selections[period]) {
            for (const item of selections[period][category]) {
                if (typeof item === 'object' && item !== null) {
                    names.add(item[lang] || item.en || String(item));
                } else {
                    names.add(String(item));
                }
            }
        }
    }
    return [...names].sort();
}

// ── SVG coordinate helpers ─────────────────────────────────────
function getSvgCoords(e, svg) {
    const rect = svg.getBoundingClientRect();
    return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
    };
}

// ── Annotation rendering ───────────────────────────────────────
function renderAnnotations(svg) {
    // Remove existing annotation elements (keep the image)
    svg.querySelectorAll('.annotation-el').forEach(el => el.remove());

    for (const ann of annotations) {
        if (ann.type === 'rect') {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', ann.x + '%');
            rect.setAttribute('y', ann.y + '%');
            rect.setAttribute('width', ann.w + '%');
            rect.setAttribute('height', ann.h + '%');
            rect.setAttribute('fill', ann.color + '22');
            rect.setAttribute('stroke', ann.color);
            rect.setAttribute('stroke-width', '0.3%');
            rect.setAttribute('rx', '0.5%');
            rect.classList.add('annotation-el');
            rect.dataset.id = ann.id;
            if (selectedAnnotation === ann.id) {
                rect.setAttribute('stroke-dasharray', '1.5% 0.5%');
                rect.setAttribute('stroke-width', '0.4%');
            }
            svg.appendChild(rect);

            // Label
            if (ann.label) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', (ann.x + ann.w / 2) + '%');
                text.setAttribute('y', (ann.y + ann.h / 2) + '%');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('fill', ann.color);
                text.setAttribute('font-size', '2.2%');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('font-family', '"Source Sans 3", sans-serif');
                text.classList.add('annotation-el');
                text.dataset.id = ann.id;
                text.textContent = ann.label;
                svg.appendChild(text);
            }
        } else if (ann.type === 'polygon') {
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const pointsStr = ann.points.map(p => p.x + '%,' + p.y + '%').join(' ');
            polygon.setAttribute('points', pointsStr);
            polygon.setAttribute('fill', ann.color + '22');
            polygon.setAttribute('stroke', ann.color);
            polygon.setAttribute('stroke-width', '0.3%');
            polygon.classList.add('annotation-el');
            polygon.dataset.id = ann.id;
            if (selectedAnnotation === ann.id) {
                polygon.setAttribute('stroke-dasharray', '1.5% 0.5%');
                polygon.setAttribute('stroke-width', '0.4%');
            }
            svg.appendChild(polygon);

            if (ann.label) {
                // Find centroid
                const cx = ann.points.reduce((s, p) => s + p.x, 0) / ann.points.length;
                const cy = ann.points.reduce((s, p) => s + p.y, 0) / ann.points.length;
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', cx + '%');
                text.setAttribute('y', cy + '%');
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('fill', ann.color);
                text.setAttribute('font-size', '2.2%');
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('font-family', '"Source Sans 3", sans-serif');
                text.classList.add('annotation-el');
                text.dataset.id = ann.id;
                text.textContent = ann.label;
                svg.appendChild(text);
            }
        } else if (ann.type === 'label') {
            // Floating text label (no shape)
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add('annotation-el');
            g.dataset.id = ann.id;

            // Background pill
            const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bg.setAttribute('x', (ann.x - 0.5) + '%');
            bg.setAttribute('y', (ann.y - 1.8) + '%');
            bg.setAttribute('width', (ann.label.length * 1.2 + 3) + '%');
            bg.setAttribute('height', '3.6%');
            bg.setAttribute('rx', '0.5%');
            bg.setAttribute('fill', 'rgba(255,255,255,0.88)');
            bg.setAttribute('stroke', ann.color);
            bg.setAttribute('stroke-width', '0.2%');
            g.appendChild(bg);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', (ann.x + 0.8) + '%');
            text.setAttribute('y', ann.y + '%');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', ann.color);
            text.setAttribute('font-size', '2%');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-family', '"Source Sans 3", sans-serif');
            text.textContent = '🌱 ' + ann.label;
            g.appendChild(text);

            if (selectedAnnotation === ann.id) {
                bg.setAttribute('stroke-dasharray', '1% 0.4%');
                bg.setAttribute('stroke-width', '0.3%');
            }
            svg.appendChild(g);
        }
    }

    // Draw polygon in-progress points
    if (activeTool === TOOLS.POLYGON && polygonPoints.length > 0) {
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        const pts = polygonPoints.map(p => p.x + '%,' + p.y + '%').join(' ');
        polyline.setAttribute('points', pts);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', activeColor);
        polyline.setAttribute('stroke-width', '0.25%');
        polyline.setAttribute('stroke-dasharray', '1% 0.5%');
        polyline.classList.add('annotation-el');
        svg.appendChild(polyline);

        // Draw dots at each vertex
        for (const p of polygonPoints) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', p.x + '%');
            circle.setAttribute('cy', p.y + '%');
            circle.setAttribute('r', '0.6%');
            circle.setAttribute('fill', activeColor);
            circle.classList.add('annotation-el');
            svg.appendChild(circle);
        }
    }
}

// ── Preview rect during draw ───────────────────────────────────
function showDrawPreview(svg, x1, y1, x2, y2) {
    let preview = svg.querySelector('.draw-preview');
    if (!preview) {
        preview = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        preview.classList.add('draw-preview');
        svg.appendChild(preview);
    }
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    preview.setAttribute('x', x + '%');
    preview.setAttribute('y', y + '%');
    preview.setAttribute('width', w + '%');
    preview.setAttribute('height', h + '%');
    preview.setAttribute('fill', activeColor + '15');
    preview.setAttribute('stroke', activeColor);
    preview.setAttribute('stroke-width', '0.25%');
    preview.setAttribute('stroke-dasharray', '1% 0.5%');
}

function removeDrawPreview(svg) {
    svg.querySelector('.draw-preview')?.remove();
}

// ── SVG event handlers ─────────────────────────────────────────
function setupSvgEvents(svg) {
    svg.addEventListener('pointerdown', (e) => onSvgPointerDown(e, svg));
    svg.addEventListener('pointermove', (e) => onSvgPointerMove(e, svg));
    svg.addEventListener('pointerup', (e) => onSvgPointerUp(e, svg));
    svg.addEventListener('dblclick', (e) => onSvgDblClick(e, svg));
}

function onSvgPointerDown(e, svg) {
    const { x, y } = getSvgCoords(e, svg);

    if (activeTool === TOOLS.SELECT) {
        // Find annotation under cursor
        const el = e.target.closest('.annotation-el');
        if (el && el.dataset.id) {
            selectedAnnotation = el.dataset.id;
            const ann = annotations.find(a => a.id === el.dataset.id);
            if (ann) {
                dragOffset = { x: x - (ann.x || 0), y: y - (ann.y || 0) };
                svg.setPointerCapture(e.pointerId);
            }
        } else {
            selectedAnnotation = null;
        }
        renderAnnotations(svg);
        updateAnnotationList();
        return;
    }

    if (activeTool === TOOLS.ERASER) {
        const el = e.target.closest('.annotation-el');
        if (el && el.dataset.id) {
            annotations = annotations.filter(a => a.id !== el.dataset.id);
            renderAnnotations(svg);
            saveAnnotations();
            updateAnnotationList();
        }
        return;
    }

    if (activeTool === TOOLS.RECT) {
        isDrawing = true;
        drawStartX = x;
        drawStartY = y;
        svg.setPointerCapture(e.pointerId);
        return;
    }

    if (activeTool === TOOLS.POLYGON) {
        polygonPoints.push({ x, y });
        renderAnnotations(svg);
        return;
    }

    if (activeTool === TOOLS.LABEL) {
        promptLabel(x, y, svg);
        return;
    }
}

function onSvgPointerMove(e, svg) {
    const { x, y } = getSvgCoords(e, svg);

    if (activeTool === TOOLS.SELECT && dragOffset && selectedAnnotation) {
        const ann = annotations.find(a => a.id === selectedAnnotation);
        if (ann) {
            ann.x = x - dragOffset.x;
            ann.y = y - dragOffset.y;
            // Move polygon points
            if (ann.type === 'polygon' && ann._dragStart) {
                const dx = ann.x - ann._dragStart.x;
                const dy = ann.y - ann._dragStart.y;
                for (let i = 0; i < ann.points.length; i++) {
                    ann.points[i].x = ann._origPoints[i].x + dx;
                    ann.points[i].y = ann._origPoints[i].y + dy;
                }
            }
            renderAnnotations(svg);
        }
        return;
    }

    if (activeTool === TOOLS.RECT && isDrawing) {
        showDrawPreview(svg, drawStartX, drawStartY, x, y);
    }
}

function onSvgPointerUp(e, svg) {
    const { x, y } = getSvgCoords(e, svg);

    if (activeTool === TOOLS.SELECT && dragOffset) {
        dragOffset = null;
        const ann = annotations.find(a => a.id === selectedAnnotation);
        if (ann) {
            delete ann._dragStart;
            delete ann._origPoints;
        }
        saveAnnotations();
        return;
    }

    if (activeTool === TOOLS.RECT && isDrawing) {
        isDrawing = false;
        removeDrawPreview(svg);
        const w = Math.abs(x - drawStartX);
        const h = Math.abs(y - drawStartY);
        if (w > 1 && h > 1) {
            const ann = {
                id: genId(),
                type: 'rect',
                x: Math.min(drawStartX, x),
                y: Math.min(drawStartY, y),
                w, h,
                color: activeColor,
                label: '',
            };
            annotations.push(ann);
            renderAnnotations(svg);
            saveAnnotations();
            updateAnnotationList();
            // Prompt for label immediately
            promptAnnotationLabel(ann, svg);
        }
    }
}

function onSvgDblClick(e, svg) {
    if (activeTool === TOOLS.POLYGON && polygonPoints.length >= 3) {
        // Close polygon
        const ann = {
            id: genId(),
            type: 'polygon',
            points: [...polygonPoints],
            x: polygonPoints[0].x,
            y: polygonPoints[0].y,
            color: activeColor,
            label: '',
        };
        annotations.push(ann);
        polygonPoints = [];
        renderAnnotations(svg);
        saveAnnotations();
        updateAnnotationList();
        promptAnnotationLabel(ann, svg);
        return;
    }

    // Double-click an annotation to edit label
    if (activeTool === TOOLS.SELECT) {
        const el = e.target.closest('.annotation-el');
        if (el && el.dataset.id) {
            const ann = annotations.find(a => a.id === el.dataset.id);
            if (ann) promptAnnotationLabel(ann, svg);
        }
    }
}

// ── Label prompts ──────────────────────────────────────────────
function promptAnnotationLabel(ann, svg) {
    const { showModal } = window.GardeningApp.modules.ui;
    const plants = getSelectedPlantNames();

    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Label this area:</label>
            <input type="text" id="annLabelInput"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   placeholder="e.g. Tomato bed, Herb corner..."
                   value="${ann.label || ''}" autofocus>
        </div>
        ${plants.length > 0 ? `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem;">Or pick a plant:</label>
            <div id="annPlantPicker" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
        </div>
        ` : ''}
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="annLabelSkip" class="layout-btn layout-btn-secondary">Skip</button>
            <button id="annLabelOk" class="layout-btn layout-btn-primary">Save</button>
        </div>
    `;

    const modal = showModal('Label Annotation', content, { width: '400px' });
    const input = content.querySelector('#annLabelInput');

    // Plant picker buttons
    const picker = content.querySelector('#annPlantPicker');
    if (picker) {
        for (const name of plants) {
            const btn = document.createElement('button');
            btn.className = 'layout-plant-pick-btn';
            btn.textContent = '🌱 ' + name;
            btn.addEventListener('click', () => { input.value = name; });
            picker.appendChild(btn);
        }
    }

    const save = () => {
        ann.label = input.value.trim();
        renderAnnotations(svg);
        saveAnnotations();
        updateAnnotationList();
        modal.close();
    };

    content.querySelector('#annLabelOk').addEventListener('click', save);
    content.querySelector('#annLabelSkip').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => { input.focus(); input.select(); }, 50);
}

function promptLabel(x, y, svg) {
    const { showModal } = window.GardeningApp.modules.ui;
    const plants = getSelectedPlantNames();

    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Plant label:</label>
            <input type="text" id="floatLabelInput"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   placeholder="e.g. Tomato, Basil..." autofocus>
        </div>
        ${plants.length > 0 ? `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem;">Or pick:</label>
            <div id="floatPlantPicker" style="display: flex; flex-wrap: wrap; gap: 4px;"></div>
        </div>
        ` : ''}
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="floatLabelCancel" class="layout-btn layout-btn-secondary">Cancel</button>
            <button id="floatLabelOk" class="layout-btn layout-btn-primary">Place</button>
        </div>
    `;

    const modal = showModal('Add Plant Label', content, { width: '380px' });
    const input = content.querySelector('#floatLabelInput');

    const picker = content.querySelector('#floatPlantPicker');
    if (picker) {
        for (const name of plants) {
            const btn = document.createElement('button');
            btn.className = 'layout-plant-pick-btn';
            btn.textContent = '🌱 ' + name;
            btn.addEventListener('click', () => { input.value = name; });
            picker.appendChild(btn);
        }
    }

    const place = () => {
        const label = input.value.trim();
        if (label) {
            annotations.push({
                id: genId(),
                type: 'label',
                x, y,
                color: activeColor,
                label,
            });
            renderAnnotations(svg);
            saveAnnotations();
            updateAnnotationList();
        }
        modal.close();
    };

    content.querySelector('#floatLabelOk').addEventListener('click', place);
    content.querySelector('#floatLabelCancel').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') place();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => input.focus(), 50);
}

// ── Annotation list sidebar ────────────────────────────────────
function updateAnnotationList() {
    const list = document.getElementById('layoutAnnotationList');
    if (!list) return;

    if (annotations.length === 0) {
        list.innerHTML = `
            <div class="layout-sidebar-empty">
                <p>No annotations yet.</p>
                <p>Draw rectangles or polygons on the photo, then label them.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    for (const ann of annotations) {
        const item = document.createElement('div');
        item.className = 'layout-annotation-item' + (selectedAnnotation === ann.id ? ' selected' : '');

        const icon = ann.type === 'rect' ? '▭' : ann.type === 'polygon' ? '⬡' : '🏷️';
        const label = ann.label || '(unlabeled)';

        item.innerHTML = `
            <span class="layout-ann-color" style="background: ${ann.color};"></span>
            <span class="layout-ann-icon">${icon}</span>
            <span class="layout-ann-label">${label}</span>
            <button class="layout-ann-delete" title="Delete">×</button>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('layout-ann-delete')) return;
            selectedAnnotation = ann.id;
            activeTool = TOOLS.SELECT;
            updateToolButtons();
            const svg = document.getElementById('layoutSvgOverlay');
            if (svg) renderAnnotations(svg);
            updateAnnotationList();
        });

        item.querySelector('.layout-ann-delete').addEventListener('click', () => {
            annotations = annotations.filter(a => a.id !== ann.id);
            if (selectedAnnotation === ann.id) selectedAnnotation = null;
            const svg = document.getElementById('layoutSvgOverlay');
            if (svg) renderAnnotations(svg);
            saveAnnotations();
            updateAnnotationList();
        });

        list.appendChild(item);
    }
}

function updateToolButtons() {
    document.querySelectorAll('.layout-tool-btn[data-tool]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === activeTool);
    });
}

// ── Photo upload ───────────────────────────────────────────────
function handlePhotoUpload(file, layout) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Compress to reasonable size
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 1600;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round(h * maxDim / w);
                        w = maxDim;
                    } else {
                        w = Math.round(w * maxDim / h);
                        h = maxDim;
                    }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                layout.photoData = canvas.toDataURL('image/jpeg', 0.8);
                layout.photoWidth = w;
                layout.photoHeight = h;
                saveLayouts();
                resolve();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ── Export ──────────────────────────────────────────────────────
function exportAnnotatedPhoto() {
    const layout = getCurrentLayout();
    if (!layout?.photoData) return;

    const svgEl = document.getElementById('layoutSvgOverlay');
    if (!svgEl) return;

    // Render SVG to canvas
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = layout.photoWidth;
        canvas.height = layout.photoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Draw annotations on canvas
        for (const ann of annotations) {
            const scaleX = layout.photoWidth / 100;
            const scaleY = layout.photoHeight / 100;

            ctx.strokeStyle = ann.color;
            ctx.lineWidth = 3;
            ctx.fillStyle = ann.color + '22';

            if (ann.type === 'rect') {
                ctx.beginPath();
                ctx.rect(ann.x * scaleX, ann.y * scaleY, ann.w * scaleX, ann.h * scaleY);
                ctx.fill();
                ctx.stroke();
                if (ann.label) {
                    ctx.font = 'bold 18px "Source Sans 3", sans-serif';
                    ctx.fillStyle = ann.color;
                    ctx.textAlign = 'center';
                    ctx.fillText(ann.label, (ann.x + ann.w / 2) * scaleX, (ann.y + ann.h / 2) * scaleY + 6);
                }
            } else if (ann.type === 'polygon') {
                ctx.beginPath();
                ctx.moveTo(ann.points[0].x * scaleX, ann.points[0].y * scaleY);
                for (let i = 1; i < ann.points.length; i++) {
                    ctx.lineTo(ann.points[i].x * scaleX, ann.points[i].y * scaleY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                if (ann.label) {
                    const cx = ann.points.reduce((s, p) => s + p.x, 0) / ann.points.length * scaleX;
                    const cy = ann.points.reduce((s, p) => s + p.y, 0) / ann.points.length * scaleY;
                    ctx.font = 'bold 18px "Source Sans 3", sans-serif';
                    ctx.fillStyle = ann.color;
                    ctx.textAlign = 'center';
                    ctx.fillText(ann.label, cx, cy + 6);
                }
            } else if (ann.type === 'label') {
                ctx.font = 'bold 16px "Source Sans 3", sans-serif';
                ctx.fillStyle = ann.color;
                ctx.textAlign = 'left';
                ctx.fillText('🌱 ' + ann.label, (ann.x + 0.8) * scaleX, ann.y * scaleY);
            }
        }

        const link = document.createElement('a');
        link.download = `${layout.name || 'garden-annotated'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    };
    img.src = layout.photoData;
}

// ── Layout CRUD ────────────────────────────────────────────────
function createLayout(name) {
    const layout = {
        id: genId(),
        name: name || 'Untitled',
        photoData: null,
        photoWidth: 0,
        photoHeight: 0,
        annotations: [],
        createdAt: new Date().toISOString(),
    };
    layouts.push(layout);
    saveLayouts();
    return layout;
}

function deleteLayout(id) {
    layouts = layouts.filter(l => l.id !== id);
    if (currentLayoutId === id) currentLayoutId = null;
    saveLayouts();
    renderLayout();
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── UI Rendering ───────────────────────────────────────────────
export function renderLayout() {
    const container = document.getElementById('layoutContent');
    if (!container) return;

    if (!currentLayoutId) {
        renderLayoutList(container);
    } else {
        renderEditor(container);
    }
}

function renderLayoutList(container) {
    container.innerHTML = '';

    if (layouts.length === 0) {
        container.innerHTML = `
            <div class="layout-empty-state">
                <div class="icon-size-jumbo">📷</div>
                <h3>No Garden Photos Yet</h3>
                <p>Upload a photo of your garden and annotate it — outline beds and label what grows where.</p>
                <button class="layout-btn layout-btn-primary" id="layoutEmptyAddBtn">
                    📷 Upload First Photo
                </button>
            </div>
        `;
        container.querySelector('#layoutEmptyAddBtn')?.addEventListener('click', openNewLayoutModal);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'layout-photo-grid';

    for (const layout of layouts) {
        const card = document.createElement('div');
        card.className = 'layout-photo-card';

        const preview = document.createElement('div');
        preview.className = 'layout-photo-preview';
        if (layout.photoData) {
            const img = document.createElement('img');
            img.src = layout.photoData;
            img.alt = layout.name;
            preview.appendChild(img);
        } else {
            preview.innerHTML = '<span class="layout-photo-placeholder">📷</span>';
        }
        preview.addEventListener('click', () => openLayout(layout.id));

        const info = document.createElement('div');
        info.className = 'layout-photo-info';

        const annCount = (layout.annotations || []).length;
        info.innerHTML = `
            <span class="layout-photo-name">${layout.name}</span>
            <span class="layout-photo-meta">${annCount} annotation${annCount !== 1 ? 's' : ''}</span>
        `;

        const actions = document.createElement('div');
        actions.className = 'layout-photo-actions';
        actions.innerHTML = `
            <button class="layout-sketch-action-btn" data-action="open" title="Open">✏️</button>
            <button class="layout-sketch-action-btn layout-sketch-action-btn--danger" data-action="delete" title="Delete">🗑️</button>
        `;

        actions.querySelector('[data-action="open"]').addEventListener('click', () => openLayout(layout.id));
        actions.querySelector('[data-action="delete"]').addEventListener('click', () => {
            const { showConfirmDialog } = window.GardeningApp.modules.ui;
            showConfirmDialog(`Delete "${layout.name}"?`, () => deleteLayout(layout.id));
        });

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(actions);
        grid.appendChild(card);
    }

    container.appendChild(grid);
}

function renderEditor(container) {
    const layout = getCurrentLayout();
    if (!layout) {
        currentLayoutId = null;
        renderLayout();
        return;
    }

    annotations = layout.annotations ? JSON.parse(JSON.stringify(layout.annotations)) : [];
    selectedAnnotation = null;
    polygonPoints = [];

    container.innerHTML = `
        <div class="layout-editor">
            <div class="layout-editor-toolbar">
                <div class="layout-toolbar-group">
                    <button class="layout-tool-btn active" data-tool="rect" title="Rectangle bed">▭</button>
                    <button class="layout-tool-btn" data-tool="polygon" title="Polygon (click vertices, double-click to close)">⬡</button>
                    <button class="layout-tool-btn" data-tool="label" title="Plant label">🏷️</button>
                    <button class="layout-tool-btn" data-tool="select" title="Select / move">↖</button>
                    <button class="layout-tool-btn" data-tool="eraser" title="Delete annotation">⌫</button>
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
                <div class="layout-toolbar-group">
                    <button class="layout-tool-btn" id="layoutExportBtn" title="Export annotated photo">💾</button>
                    <button class="layout-tool-btn" id="layoutReplacePhotoBtn" title="Replace photo">📷</button>
                </div>
                <div class="layout-toolbar-group layout-toolbar-back">
                    <button class="layout-btn layout-btn-secondary" id="layoutBackToList">← Back</button>
                </div>
            </div>

            <div class="layout-editor-body">
                <div class="layout-photo-wrapper" id="layoutPhotoWrapper">
                    ${layout.photoData
                        ? `<img id="layoutBasePhoto" src="${layout.photoData}" alt="${layout.name}" draggable="false">`
                        : `<div class="layout-photo-upload-zone" id="layoutUploadZone">
                            <div class="icon-size-jumbo">📷</div>
                            <p>Drop a photo here or click to upload</p>
                            <input type="file" id="layoutPhotoInput" accept="image/*" hidden>
                            <button class="layout-btn layout-btn-primary" id="layoutBrowseBtn">Browse...</button>
                        </div>`
                    }
                    <svg id="layoutSvgOverlay" class="layout-svg-overlay"
                         viewBox="0 0 100 100" preserveAspectRatio="none"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></svg>
                </div>
                <div class="layout-annotation-sidebar">
                    <h4 class="layout-sidebar-title">Annotations</h4>
                    <div id="layoutAnnotationList" class="layout-annotation-list"></div>
                </div>
            </div>
        </div>
    `;

    // Setup toolbar events
    setupToolbarEvents(container);

    // Setup SVG overlay
    const svg = document.getElementById('layoutSvgOverlay');
    if (svg) {
        setupSvgEvents(svg);
        renderAnnotations(svg);
    }

    updateAnnotationList();

    // Photo upload zone (if no photo yet)
    const uploadZone = document.getElementById('layoutUploadZone');
    const photoInput = document.getElementById('layoutPhotoInput');
    const browseBtn = document.getElementById('layoutBrowseBtn');

    if (uploadZone && photoInput) {
        browseBtn?.addEventListener('click', () => photoInput.click());
        uploadZone.addEventListener('click', (e) => {
            if (e.target === uploadZone || e.target.tagName === 'P' || e.target.tagName === 'DIV') {
                photoInput.click();
            }
        });
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                await handlePhotoUpload(file, layout);
                renderEditor(container);
            }
        });
        photoInput.addEventListener('change', async () => {
            const file = photoInput.files[0];
            if (file) {
                await handlePhotoUpload(file, layout);
                renderEditor(container);
            }
        });
    }

    // Replace photo button
    document.getElementById('layoutReplacePhotoBtn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (file) {
                await handlePhotoUpload(file, layout);
                renderEditor(container);
            }
        });
        input.click();
    });

    // Export
    document.getElementById('layoutExportBtn')?.addEventListener('click', exportAnnotatedPhoto);

    // Back
    document.getElementById('layoutBackToList')?.addEventListener('click', () => {
        currentLayoutId = null;
        polygonPoints = [];
        renderLayout();
    });
}

function setupToolbarEvents(container) {
    container.querySelectorAll('.layout-tool-btn[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTool = btn.dataset.tool;
            // Reset polygon if switching away
            if (activeTool !== TOOLS.POLYGON && polygonPoints.length > 0) {
                polygonPoints = [];
                const svg = document.getElementById('layoutSvgOverlay');
                if (svg) renderAnnotations(svg);
            }
            updateToolButtons();
        });
    });

    container.querySelectorAll('.layout-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.layout-color-swatch').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeColor = btn.dataset.color;
        });
    });
}

// ── Modals ─────────────────────────────────────────────────────
function openNewLayoutModal() {
    const { showModal } = window.GardeningApp.modules.ui;
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Name:</label>
            <input type="text" id="newLayoutName"
                   style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 1rem;"
                   placeholder="e.g. Backyard, Front Garden..." autofocus>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="newLayoutCancel" class="layout-btn layout-btn-secondary">Cancel</button>
            <button id="newLayoutCreate" class="layout-btn layout-btn-primary">Create</button>
        </div>
    `;
    const modal = showModal('New Photo Layout', content, { width: '400px' });
    const input = content.querySelector('#newLayoutName');

    const submit = () => {
        const name = input.value.trim() || 'Untitled';
        const layout = createLayout(name);
        openLayout(layout.id);
        modal.close();
    };

    content.querySelector('#newLayoutCreate').addEventListener('click', submit);
    content.querySelector('#newLayoutCancel').addEventListener('click', () => modal.close());
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') modal.close();
    });
    setTimeout(() => input.focus(), 50);
}

function openLayout(id) {
    currentLayoutId = id;
    activeTool = TOOLS.RECT;
    activeColor = COLORS[0];
    selectedAnnotation = null;
    polygonPoints = [];
    renderLayout();
}

// ── Init ───────────────────────────────────────────────────────
export function initLayout() {
    loadLayouts();

    const addBtn = document.getElementById('layoutAddPhotoBtn');
    if (addBtn) {
        addBtn.addEventListener('click', openNewLayoutModal);
    }

    console.log('Layout (photo annotation) module initialized');
}

export { loadLayouts, saveLayouts };
