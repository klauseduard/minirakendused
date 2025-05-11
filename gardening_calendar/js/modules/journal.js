/**
 * Journal Module for Gardening Calendar
 * Handles garden journal functionality
 * 
 * REFACTORING IN PROGRESS:
 * This file is being split into:
 * - journal-logic.js (data functions)
 * - journal-storage.js (storage functions)
 * - journal-ui.js (UI/DOM functions)
 */

// Re-export from new modules
export { 
  journalEntryTypes,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  removeImageFromEntry,
  exportJournal,
  handleImport,
  fileToBase64,
  compressImage,
  generateThumbnail,
  getStorageUsage,
  weatherCodeToIconTextColor
} from './journal-logic.js';

// Re-export from UI module
export {
  showExportOptionsModal,
  showImportOptionsModal,
  openJournalEntryModal,
  handlePhotoSelection,
  renderJournal,
  renderTimeline,
  showImageLightbox,
  showDeleteConfirmModal,
  openViewModal,
  shareJournalEntry,
  renderTimelineEntry
} from './journal-ui.js';

// Import functions needed internally
import { saveJournalEntries, getJournalEntries } from './storage.js';
import { shareContent } from './social.js';
import { openJournalEntryModal, showExportOptionsModal, showImportOptionsModal } from './journal-ui.js';

// Function to render the gallery view
function renderGallery() {
    const entries = getJournalEntries();
    const journalGallery = document.getElementById('journalGallery');
    
    // Get all images from all entries
    const allImages = [];
    entries.forEach(entry => {
        if (entry.images && entry.images.length > 0) {
            entry.images.forEach((img, index) => {
                // Handle both string format and object format for backward compatibility
                const imgSrc = typeof img === 'string' ? img : (img.data || img.thumbnail);
                allImages.push({
                    src: imgSrc,
                    thumbnail: typeof img === 'string' ? img : (img.thumbnail || img.data),
                    date: entry.date,
                    entryId: entry.id,
                    imgIndex: index
                });
            });
        }
    });
    
    // Sort by date (newest first)
    allImages.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Build gallery HTML
    let html = '';
    
    if (allImages.length === 0) {
        html = `<div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 3rem; margin-bottom: 20px;">📷</div>
            <h3 style="margin-bottom: 15px; color: var(--primary-color);">No Photos Yet</h3>
            <p style="margin-bottom: 20px; color: #666;">Add photos to your journal entries to see them here!</p>
        </div>`;
    } else {
        html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">`;
        
        allImages.forEach(img => {
            const dateObj = new Date(img.date);
            const formattedDate = dateObj.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            html += `<div class="gallery-image" style="cursor: pointer;" data-full-img="${img.src}" data-entry-id="${img.entryId}" data-img-index="${img.imgIndex}">
                <div style="position: relative; padding-bottom: 100%;">
                    <img src="${img.thumbnail}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Garden photo">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: white; padding: 5px 8px; font-size: 0.8rem; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">${formattedDate}</div>
                </div>
            </div>`;
        });
        
        html += `</div>`;
    }
    
    journalGallery.innerHTML = html;
    
    // Add event listeners for image lightbox
    journalGallery.querySelectorAll('.gallery-image').forEach(img => {
        img.addEventListener('click', () => {
            const fullImg = img.dataset.fullImg;
            const entryId = img.dataset.entryId;
            const imgIndex = parseInt(img.dataset.imgIndex, 10);
            showImageLightbox(fullImg, entryId, imgIndex);
        });
    });
}

function renderJournalCalendar() {
    const entries = getJournalEntries();
    const journalCalendar = document.getElementById('journalCalendar');
    
    // Group entries by month/year
    const entriesByMonth = {};
    
    entries.forEach(entry => {
        const date = new Date(entry.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        
        if (!entriesByMonth[key]) {
            entriesByMonth[key] = [];
        }
        
        entriesByMonth[key].push(entry);
    });
    
    // Sort months chronologically (newest first)
    const sortedMonths = Object.keys(entriesByMonth).sort().reverse();
    
    // Build calendar HTML
    let html = '';
    
    if (sortedMonths.length === 0) {
        html = `<div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 3rem; margin-bottom: 20px;">📅</div>
            <h3 style="margin-bottom: 15px; color: var(--primary-color);">No Journal Entries Yet</h3>
            <p style="margin-bottom: 20px; color: #666;">Add entries to your garden journal to see them in the calendar!</p>
        </div>`;
    } else {
        sortedMonths.forEach(monthKey => {
            const [year, month] = monthKey.split('-').map(Number);
            const date = new Date(year, month, 1);
            const monthName = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            
            html += `<div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; color: var(--primary-color);">${monthName}</h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">`;
            
            // Get entries for this month and sort by date
            const monthEntries = entriesByMonth[monthKey];
            monthEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Group by day
            const entriesByDay = {};
            monthEntries.forEach(entry => {
                const day = new Date(entry.date).getDate();
                if (!entriesByDay[day]) entriesByDay[day] = [];
                entriesByDay[day].push(entry);
            });
            
            // Sort days and create calendar items
            const sortedDays = Object.keys(entriesByDay).map(Number).sort((a, b) => b - a);
            
            sortedDays.forEach(day => {
                const dayDate = new Date(year, month, day);
                const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' });
                
                html += `<div style="display: flex; gap: 15px;">
                    <div style="flex: 0 0 60px; text-align: center; font-weight: 500; padding-top: 5px;">
                        <div style="font-size: 1.1rem;">${day}</div>
                        <div style="font-size: 0.8rem; color: #666;">${dayDate.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">`;
                
                entriesByDay[day].forEach(entry => {
                    const entryType = journalEntryTypes[entry.type] || { icon: '📝', name: 'Note' };
                    
                    html += `<div class="calendar-entry" style="cursor: pointer; padding: 8px 12px; background: #f1f8e9; border-radius: 6px; display: flex; align-items: center;" data-entry-id="${entry.id}">
                        <div style="margin-right: 10px; font-size: 1.1rem;">${entryType.icon}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${entryType.name}</div>
                            <div style="font-size: 0.9rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${entry.plants && entry.plants.length ? entry.plants.join(', ') : (entry.notes ? entry.notes.substring(0, 30) + (entry.notes.length > 30 ? '...' : '') : 'No details')}</div>
                        </div>
                        ${entry.images && entry.images.length ? `<div style="width: 30px; text-align: center; font-size: 0.9rem;">📷${entry.images.length}</div>` : ''}
                    </div>`;
                });
                
                html += `</div></div>`;
            });
            
            html += `</div></div>`;
        });
    }
    
    journalCalendar.innerHTML = html;
    
    // Add event listeners for calendar entries
    journalCalendar.querySelectorAll('.calendar-entry').forEach(entry => {
        entry.addEventListener('click', () => {
            const entryId = entry.dataset.entryId;
            
            // Switch to timeline view and scroll to the entry
            const timelineTab = document.querySelector('.journal-tab[data-view="timeline"]');
            timelineTab.click();
            
            // Wait for the timeline to render and then scroll to the entry
            setTimeout(() => {
                const entryElement = document.querySelector(`.journal-entry-card [data-entry-id="${entryId}"]`).closest('.journal-entry-card');
                if (entryElement) {
                    entryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    entryElement.style.background = '#e8f5e9';
                    setTimeout(() => {
                        entryElement.style.transition = 'background-color 1s';
                        entryElement.style.background = '#f9f9f9';
                    }, 100);
                }
            }, 100);
        });
    });
}

function openViewModal(entry) {
    if (!entry) return;
    
    const entryType = journalEntryTypes[entry.type] || { icon: '📝', label: 'Note' };
    
    // Format date
    const entryDate = new Date(entry.date);
    const formattedDate = entryDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Create photo gallery
    let photoGallery = '';
    if (entry.images && entry.images.length > 0) {
        photoGallery = `
            <div class="entry-view-photos">
                ${entry.images.map(photo => 
                    `<div class="entry-view-photo">
                        <img src="${photo}" alt="Garden journal photo">
                    </div>`
                ).join('')}
            </div>
        `;
    }
    
    // Fill the modal content
    const viewModal = document.getElementById('journalEntryViewModal');
    const viewTitle = document.getElementById('journalEntryViewTitle');
    const viewContent = document.getElementById('journalEntryViewContent');
    
    viewTitle.innerHTML = `${entryType.icon} ${entryType.label} - ${formattedDate}`;
    
    viewContent.innerHTML = `
        <div class="entry-view-content">
            ${entry.plants ? `
            <div class="entry-view-field">
                <span class="field-label">Plants:</span>
                <span class="field-value">${entry.plants}</span>
            </div>
            ` : ''}
            
            ${entry.location ? `
            <div class="entry-view-field">
                <span class="field-label">Location:</span>
                <span class="field-value">${entry.location}</span>
            </div>
            ` : ''}
            
            ${entry.type === 'harvest' && (entry.metrics.weight || entry.metrics.quantity) ? `
            <div class="entry-view-field">
                <span class="field-label">Harvest Details:</span>
                <span class="field-value">
                    ${entry.metrics.weight ? `Weight: ${entry.metrics.weight}` : ''}
                    ${entry.metrics.weight && entry.metrics.quantity ? ' • ' : ''}
                    ${entry.metrics.quantity ? `Quantity: ${entry.metrics.quantity}` : ''}
                </span>
            </div>
            ` : ''}
            
            ${entry.notes ? `
            <div class="entry-view-field entry-notes-full">
                <span class="field-label">Notes:</span>
                <div class="entry-view-notes">${entry.notes.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}
            
            ${photoGallery}
        </div>
    `;
    
    // Initialize share button in the view modal
    const shareContainer = document.getElementById('journalEntryShareContainer');
    shareContainer.innerHTML = ''; // Clear previous content
    
    // Set up event listeners
    const closeButtons = viewModal.querySelectorAll('#journalEntryViewModalCloseBtn, #journalEntryViewCloseBtn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewModal.style.display = 'none';
        });
    });
    
    // Show the modal
    viewModal.style.display = 'flex';
    
    // Initialize share button for this entry
    window.initSocialSharing({
        selector: '#journalEntryShareContainer',
        defaultTitle: `Garden Journal: ${entryType.label} - ${formattedDate}`,
        defaultDescription: `Plants: ${entry.plants || 'None'}\n${entry.notes || ''}`,
        addShareCallback: () => {
            // Track share event
            console.log('Share initiated for journal entry:', entry.id);
        }
    });
}

function shareJournalEntry(entry) {
    if (!entry) return;
    
    // Use the shareContent function from social module
    window.shareContent('journal', { entry });
}

function renderTimelineEntry(entry, index) {
    const entryTypes = journalEntryTypes;
    const entryType = entryTypes[entry.type] || { icon: '📝', label: 'Note' };
    
    const entryEl = document.createElement('div');
    entryEl.className = 'journal-entry';
    entryEl.dataset.entryId = entry.id;
    
    // Add date formatting
    const entryDate = new Date(entry.date);
    const formattedDate = entryDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // Truncate notes for preview if they're too long
    const truncatedNotes = entry.notes && entry.notes.length > 120 
        ? entry.notes.substring(0, 120) + '...' 
        : entry.notes;
    
    // Create photo gallery if there are images
    let photoGallery = '';
    if (entry.images && entry.images.length > 0) {
        photoGallery = `
            <div class="entry-photos">
                ${entry.images.slice(0, 3).map(photo => 
                    `<div class="entry-photo">
                        <img src="${photo}" alt="Garden journal photo">
                    </div>`
                ).join('')}
                ${entry.images.length > 3 ? `<div class="entry-photo entry-photo-more">+${entry.images.length - 3}</div>` : ''}
            </div>
        `;
    }
    
    // Template for entry
    entryEl.innerHTML = `
        <div class="entry-header">
            <div class="entry-type">
                <span class="entry-icon">${entryType.icon}</span>
                <span class="entry-type-label">${entryType.label}</span>
            </div>
            <div class="entry-date">${formattedDate}</div>
        </div>
        
        ${entry.plants ? `
        <div class="entry-plants">
            <strong>Plants:</strong> ${entry.plants}
        </div>
        ` : ''}
        
        ${entry.location ? `
        <div class="entry-location">
            <strong>Location:</strong> ${entry.location}
        </div>
        ` : ''}
        
        ${entry.type === 'harvest' && (entry.metrics.weight || entry.metrics.quantity) ? `
        <div class="entry-harvest-metrics">
            ${entry.metrics.weight ? `<span><strong>Weight:</strong> ${entry.metrics.weight}</span>` : ''}
            ${entry.metrics.quantity ? `<span><strong>Quantity:</strong> ${entry.metrics.quantity}</span>` : ''}
        </div>
        ` : ''}
        
        ${entry.notes ? `
        <div class="entry-notes">
            ${truncatedNotes}
        </div>
        ` : ''}
        
        ${photoGallery}
        
        <div class="entry-actions">
            <button class="entry-edit-btn" data-entry-id="${entry.id}">
                <span class="action-icon">✏️</span> Edit
            </button>
            <button class="entry-delete-btn" data-entry-id="${entry.id}">
                <span class="action-icon">🗑️</span> Delete
            </button>
            <button class="entry-share-btn" data-entry-id="${entry.id}">
                <span class="action-icon">🔗</span> Share
            </button>
        </div>
    `;
    
    // Add event listeners
    entryEl.querySelector('.entry-edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(entry.id);
    });
    
    entryEl.querySelector('.entry-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteEntry(entry.id);
    });
    
    entryEl.querySelector('.entry-share-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        shareJournalEntry(entry);
    });
    
    // Open view modal when clicking on the entry
    entryEl.addEventListener('click', () => {
        openViewModal(entry);
    });
    
    return entryEl;
}

/**
 * Initialize the journal module
 */
export function initJournal() {
    console.log('Initializing journal module...');
    
    const journalTab = document.querySelector('.journal-tab[data-view="timeline"]');
    const journalContent = document.getElementById('journalContent');
    const addEntryBtn = document.getElementById('addJournalEntryBtn');
    const emptyAddBtn = document.getElementById('emptyJournalAddBtn');
    const shareContainer = document.getElementById('journalShareContainer');
    
    // If any elements are not found, return early
    if (!journalTab || !journalContent) {
        console.warn('Required journal elements not found');
        return;
    }
    
    // Initialize share button
    if (shareContainer) {
        window.GardeningApp.modules.social.initSocialSharing({
            selector: '#journalShareContainer',
            defaultTitle: 'My Garden Journal',
            defaultDescription: 'Check out my gardening journey!'
        });
    }
    
    // Render journal if we're already on that tab
    if (journalContent && journalContent.style.display !== 'none') {
        renderJournal();
    }
    
    // Watch for visibility changes on the journal section
    // This ensures the journal renders when it becomes visible
    // from the navigation menu clicks
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                journalContent.style.display !== 'none') {
                renderJournal();
            }
        });
    });
    
    // Start observing the journal section for style changes
    if (journalContent) {
        observer.observe(journalContent, { attributes: true });
    }
    
    // Add journal entry buttons
    if (addEntryBtn) {
        addEntryBtn.addEventListener('click', () => openJournalEntryModal());
    }
    
    if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', () => openJournalEntryModal());
    }
    
    // Export/Import buttons
    const exportJournalBtn = document.getElementById('exportJournalBtn');
    const importJournalBtn = document.getElementById('importJournalBtn');
    
    if (exportJournalBtn) {
        exportJournalBtn.addEventListener('click', function() {
            showExportOptionsModal();
        });
    }
    
    if (importJournalBtn) {
        importJournalBtn.addEventListener('click', function() {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'application/json';
            
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);
                        
                        // Validate data format
                        if (!Array.isArray(importData)) {
                            throw new Error('Invalid format: Data should be an array of journal entries');
                        }
                        
                        // Show import options modal
                        showImportOptionsModal(importData);
                        
                    } catch (error) {
                        console.error('Import error:', error);
                        alert(`Error importing journal: ${error.message}`);
                    }
                };
                
                reader.readAsText(file);
            };
            
            fileInput.click();
        });
    }
    
    // Tab switching
    const journalTabs = document.querySelectorAll('.journal-tab');
    
    journalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            journalTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const view = tab.dataset.view;
            document.getElementById('journalTimeline').style.display = view === 'timeline' ? 'block' : 'none';
            document.getElementById('journalGallery').style.display = view === 'gallery' ? 'block' : 'none';
            document.getElementById('journalCalendar').style.display = view === 'calendar' ? 'block' : 'none';
            
            // If showing the gallery, make sure it's rendered
            if (view === 'gallery') {
                renderGallery();
            } else if (view === 'calendar') {
                renderJournalCalendar();
            }
        });
    });
    
    // Check for journal-related hash to show journal 
    if (window.location.hash === '#garden-journal') {
        // Find and click the journal tab to activate it
        const journalBtn = document.querySelector('.quick-jump-btn[data-section="garden-journal"]');
        if (journalBtn) journalBtn.click();
    }
    
    // Set up journal entry form handlers
    const journalEntryForm = document.getElementById('journalEntryForm');
    const journalEntryModalCloseBtn = document.getElementById('journalEntryModalCloseBtn');
    const journalEntryCancelBtn = document.getElementById('journalEntryCancelBtn');
    const photoSelectBtn = document.getElementById('photoSelectBtn');
    const entryTypeSelect = document.getElementById('entryType');
    const entryPhotosInput = document.getElementById('entryPhotos');
    const journalEntryModal = document.getElementById('journalEntryModal');
    
    // Type change shows/hides harvest metrics
    if (entryTypeSelect) {
        entryTypeSelect.addEventListener('change', function() {
            const harvestMetricsContainer = document.getElementById('harvestMetricsContainer');
            if (harvestMetricsContainer) {
                harvestMetricsContainer.style.display = this.value === 'harvest' ? 'block' : 'none';
            }
        });
    }
    
    // Photo selection
    if (photoSelectBtn && entryPhotosInput) {
        photoSelectBtn.addEventListener('click', function() {
            entryPhotosInput.click();
        });
        
        entryPhotosInput.addEventListener('change', function() {
            handlePhotoSelection(this);
        });
    }
    
    // Form submission
    if (journalEntryForm) {
        journalEntryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const entryId = document.getElementById('journalEntryId').value;
            const entryData = {
                date: document.getElementById('entryDate').value,
                type: document.getElementById('entryType').value,
                notes: document.getElementById('entryNotes').value,
                location: document.getElementById('entryLocation').value,
                plants: document.getElementById('entryPlants').value.split(',').map(p => p.trim()).filter(p => p)
            };
            
            // Add harvest metrics if applicable
            if (entryData.type === 'harvest') {
                entryData.metrics = {
                    weight: document.getElementById('harvestWeight').value,
                    quantity: document.getElementById('harvestQuantity').value
                };
            }
            
            // Add photos if any
            const photoPreviewContainer = document.getElementById('photoPreviewContainer');
            if (photoPreviewContainer) {
                const photoElements = photoPreviewContainer.querySelectorAll('.photo-preview img');
                if (photoElements.length > 0) {
                    entryData.images = [];
                    photoElements.forEach(img => {
                        // Get full image and thumbnail
                        const fullImage = img.dataset.fullImage || img.src;
                        const thumbnail = img.src;
                        
                        // Skip if the image data is invalid
                        if (!fullImage) {
                            console.warn('Skipping image with no data');
                            return;
                        }
                        
                        // Always store images in the same format (object with data and thumbnail)
                        entryData.images.push({
                            data: fullImage,
                            thumbnail: thumbnail
                        });
                    });
                }
            }
            
            // Create or update entry
            if (entryId) {
                updateJournalEntry(entryId, entryData);
            } else {
                createJournalEntry(entryData);
            }
            
            // Update view
            renderJournal();
            
            // Close modal
            journalEntryModal.style.display = 'none';
        });
    }
    
    // Close modal buttons
    if (journalEntryModalCloseBtn) {
        journalEntryModalCloseBtn.addEventListener('click', function() {
            journalEntryModal.style.display = 'none';
        });
    }
    
    if (journalEntryCancelBtn) {
        journalEntryCancelBtn.addEventListener('click', function() {
            journalEntryModal.style.display = 'none';
        });
    }
    
    // Click outside to close
    if (journalEntryModal) {
        journalEntryModal.addEventListener('click', function(e) {
            if (e.target === journalEntryModal) {
                journalEntryModal.style.display = 'none';
            }
        });
    }

    /** --- MOBILE JOURNAL USABILITY IMPROVEMENTS (mobile-usability branch) --- **/

    // Mobile journal UI controls
    const fabBtn = document.getElementById('journalFabBtn');
    const moreMenuContainer = document.getElementById('journalMoreMenuContainer');
    const moreBtn = document.getElementById('journalMoreBtn');
    const moreMenu = document.getElementById('journalMoreMenu');
    const exportMenuBtn = document.getElementById('journalExportMenuBtn');
    const importMenuBtn = document.getElementById('journalImportMenuBtn');
    const viewDropdownContainer = document.getElementById('journalViewDropdownContainer');
    const viewDropdown = document.getElementById('journalViewDropdown');

    function isMobile() {
        return window.innerWidth <= 600;
    }

    function updateMobileJournalUI() {
        if (isMobile()) {
            if (fabBtn) fabBtn.style.display = 'flex';
            if (moreMenuContainer) moreMenuContainer.style.display = 'flex';
            if (viewDropdownContainer) viewDropdownContainer.style.display = 'block';
        } else {
            if (fabBtn) fabBtn.style.display = 'none';
            if (moreMenuContainer) moreMenuContainer.style.display = 'none';
            if (viewDropdownContainer) viewDropdownContainer.style.display = 'none';
            if (moreMenu) moreMenu.style.display = 'none';
        }
    }
    window.addEventListener('resize', updateMobileJournalUI);
    updateMobileJournalUI();

    // More button toggles menu
    if (moreBtn && moreMenu) {
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreMenu.style.display = moreMenu.style.display === 'flex' ? 'none' : 'flex';
        });
        // Hide menu when clicking outside
        document.addEventListener('click', (e) => {
            if (moreMenu.style.display === 'flex' && !moreMenu.contains(e.target) && e.target !== moreBtn) {
                moreMenu.style.display = 'none';
            }
        });
    }
    // Export/Import menu actions
    if (exportMenuBtn) {
        exportMenuBtn.addEventListener('click', () => {
            moreMenu.style.display = 'none';
            showExportOptionsModal();
        });
    }
    if (importMenuBtn) {
        importMenuBtn.addEventListener('click', () => {
            moreMenu.style.display = 'none';
            // Simulate click on original import button
            if (importJournalBtn) importJournalBtn.click();
        });
    }
    // Dropdown for journal views
    if (viewDropdown) {
        viewDropdown.addEventListener('change', (e) => {
            const view = e.target.value;
            // Hide all views
            document.getElementById('journalTimeline').style.display = view === 'timeline' ? 'block' : 'none';
            document.getElementById('journalGallery').style.display = view === 'gallery' ? 'block' : 'none';
            document.getElementById('journalCalendar').style.display = view === 'calendar' ? 'block' : 'none';
            // Render if needed
            if (view === 'gallery') renderGallery();
            if (view === 'calendar') renderJournalCalendar();
        });
        // Set default view
        viewDropdown.value = 'timeline';
    }

    /** --- END MOBILE JOURNAL USABILITY IMPROVEMENTS --- **/

    // --- Journal floating UI visibility: only show when journal section is visible (mobile) ---
    const journalSection = document.getElementById('garden-journal');
    function updateJournalFloatingUIVisibility() {
        if (fabBtn && moreMenuContainer && viewDropdownContainer && journalSection) {
            const isJournalVisible = journalSection.style.display !== 'none';
            if (isMobile()) {
                fabBtn.style.display = isJournalVisible ? 'flex' : 'none';
                moreMenuContainer.style.display = isJournalVisible ? 'flex' : 'none';
                viewDropdownContainer.style.display = isJournalVisible ? 'block' : 'none';
            } else {
                fabBtn.style.display = 'none';
                moreMenuContainer.style.display = 'none';
                viewDropdownContainer.style.display = 'none';
            }
        }
    }
    // Observe changes to journal section visibility
    if (journalSection) {
        const observer = new MutationObserver(updateJournalFloatingUIVisibility);
        observer.observe(journalSection, { attributes: true, attributeFilter: ['style'] });
    }
    // Also update on navigation and resize
    window.addEventListener('resize', updateJournalFloatingUIVisibility);
    updateJournalFloatingUIVisibility();
    // --- END Journal floating UI visibility ---

    // --- FAB Expansion Logic ---
    const fabActions = document.getElementById('journalFabActions');
    const fabAddEntryBtn = document.getElementById('fabAddEntryBtn');
    const fabExportBtn = document.getElementById('fabExportBtn');
    const fabImportBtn = document.getElementById('fabImportBtn');

    function closeFabActions() {
        if (fabActions) fabActions.style.display = 'none';
        if (fabBtn) fabBtn.setAttribute('aria-expanded', 'false');
    }
    function openFabActions() {
        if (fabActions) fabActions.style.display = 'flex';
        if (fabBtn) fabBtn.setAttribute('aria-expanded', 'true');
    }
    function toggleFabActions() {
        if (!fabActions) return;
        if (fabActions.style.display === 'flex') {
            closeFabActions();
        } else {
            openFabActions();
        }
    }
    if (fabBtn && fabActions) {
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFabActions();
        });
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (fabActions.style.display === 'flex' && !fabActions.contains(e.target) && e.target !== fabBtn) {
                closeFabActions();
            }
        });
        // Keyboard accessibility: close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeFabActions();
        });
    }
    // Action handlers
    if (fabAddEntryBtn) {
        fabAddEntryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFabActions();
            openJournalEntryModal();
        });
    }
    if (fabExportBtn) {
        fabExportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFabActions();
            showExportOptionsModal();
        });
    }
    if (fabImportBtn) {
        fabImportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFabActions();
            if (importJournalBtn) importJournalBtn.click();
        });
    }
    // --- END FAB Expansion Logic ---
} 