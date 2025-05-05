// Journal Module for Garden Calendar
// Contains all journal-related functionality

// Import data module constants
import { journalEntryTypes } from './data.js';

// Core Journal Functions
function getJournalEntries() {
    const stored = localStorage.getItem('gardening_journal_entries');
    return stored ? JSON.parse(stored) : [];
}

function saveJournalEntries(entries) {
    localStorage.setItem('gardening_journal_entries', JSON.stringify(entries));
}

function createJournalEntry(entryData) {
    const entries = getJournalEntries();
    const newEntry = {
        id: `journal-${Date.now()}`,
        date: entryData.date || new Date().toISOString().split('T')[0],
        type: entryData.type || 'observation',
        plants: entryData.plants || [],
        notes: entryData.notes || '',
        location: entryData.location || '',
        metrics: entryData.metrics || {},
        images: entryData.images || [],
        weather: window.lastWeatherData ? {
            temperature: window.lastWeatherData.current_weather.temperature,
            weatherCode: window.lastWeatherData.current_weather.weathercode,
            precipitation: window.lastWeatherData.daily.precipitation_sum[0] || 0
        } : null,
        timestamp: Date.now()
    };
    
    entries.push(newEntry);
    saveJournalEntries(entries);
    return newEntry;
}

function updateJournalEntry(id, updatedData) {
    const entries = getJournalEntries();
    const index = entries.findIndex(entry => entry.id === id);
    
    if (index !== -1) {
        entries[index] = { ...entries[index], ...updatedData, timestamp: Date.now() };
        saveJournalEntries(entries);
        return entries[index];
    }
    
    return null;
}

function deleteJournalEntry(id) {
    const entries = getJournalEntries();
    const newEntries = entries.filter(entry => entry.id !== id);
    
    if (newEntries.length !== entries.length) {
        saveJournalEntries(newEntries);
        return true;
    }
    
    return false;
}

// Storage and Image Utilities
function getStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += (localStorage[key].length * 2) / 1024 / 1024; // Approximate MB
        }
    }
    // Most browsers have ~5MB limit
    return {
        used: total.toFixed(2),
        percentage: (total / 5 * 100).toFixed(1)
    };
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function compressImage(base64Image, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get the compressed image
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
    });
}

function generateThumbnail(base64Image, size = 150) {
    return compressImage(base64Image, size, 0.5);
}

// Rendering Functions
function renderJournal() {
    const entries = getJournalEntries();
    const emptyMessage = document.getElementById('emptyJournalMessage');
    const journalTimeline = document.getElementById('journalTimeline');
    
    // Show/hide empty message
    if (entries.length === 0) {
        emptyMessage.style.display = 'block';
        journalTimeline.style.display = 'none';
        // Also hide the tabs if empty
        document.querySelector('.journal-tabs').style.display = 'none';
        return;
    } else {
        emptyMessage.style.display = 'none';
        journalTimeline.style.display = 'block';
        document.querySelector('.journal-tabs').style.display = 'flex';
    }
    
    // Render the timeline
    renderTimeline();
    
    // Render gallery if it's visible
    const galleryTab = document.querySelector('.journal-tab[data-view="gallery"]');
    if (galleryTab && galleryTab.classList.contains('active')) {
        renderGallery();
    }
    
    // Render calendar if it's visible
    const calendarTab = document.querySelector('.journal-tab[data-view="calendar"]');
    if (calendarTab && calendarTab.classList.contains('active')) {
        renderJournalCalendar();
    }
}

function renderTimeline() {
    const entries = getJournalEntries();
    const journalTimeline = document.getElementById('journalTimeline');
    
    // Sort entries by date (newest first)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Generate HTML for timeline
    let html = '';
    
    entries.forEach(entry => {
        const entryType = journalEntryTypes[entry.type] || { icon: '📝', name: 'Note' };
        const dateObj = new Date(entry.date);
        const formattedDate = dateObj.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Start entry card
        html += `
            <div class="journal-entry-card" style="margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--secondary-color);">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <div style="font-size: 1.5rem; margin-right: 10px;">${entryType.icon}</div>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 500; color: var(--primary-color);">${entryType.name}</div>
                        <div style="font-size: 0.9rem; color: #666;">${formattedDate}</div>
                    </div>
                    <div>
                        <button class="edit-entry-btn" data-entry-id="${entry.id}" style="background: none; border: none; cursor: pointer; margin-right: 5px;">✏️</button>
                        <button class="delete-entry-btn" data-entry-id="${entry.id}" style="background: none; border: none; cursor: pointer;">🗑️</button>
                    </div>
                </div>`;
        
        // Plants section (if any)
        if (entry.plants && entry.plants.length > 0) {
            html += `<div style="margin-bottom: 10px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Plants:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">`;
            
            entry.plants.forEach(plant => {
                html += `<span style="background: var(--light-bg); padding: 3px 8px; border-radius: 12px; font-size: 0.9rem;">${plant}</span>`;
            });
            
            html += `</div></div>`;
        }
        
        // Location (if any)
        if (entry.location) {
            html += `<div style="margin-bottom: 10px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Location:</div>
                <div>${entry.location}</div>
            </div>`;
        }
        
        // Harvest metrics (if it's a harvest entry)
        if (entry.type === 'harvest' && entry.metrics) {
            const qualityStars = '★'.repeat(parseInt(entry.metrics.quality) || 0) + '☆'.repeat(5 - (parseInt(entry.metrics.quality) || 0));
            
            html += `<div style="margin-bottom: 10px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Harvest:</div>
                <div style="display: flex; gap: 15px;">
                    <div>Quantity: ${entry.metrics.quantity || 'n/a'} ${entry.metrics.unit || ''}</div>
                    <div>Quality: <span style="color: #FFC107;">${qualityStars}</span></div>
                </div>
            </div>`;
        }
        
        // Weather at the time (if available)
        if (entry.weather) {
            const weatherIcon = entry.weather.weatherCode !== undefined 
                ? weatherCodeToIconTextColor(entry.weather.weatherCode).icon 
                : '🌡️';
                
            const weatherText = entry.weather.weatherCode !== undefined 
                ? weatherCodeToIconTextColor(entry.weather.weatherCode).text 
                : '';
                
            html += `<div style="margin-bottom: 10px; font-size: 0.9rem; color: #666;">
                <div style="font-weight: 500; margin-bottom: 5px;">Weather:</div>
                <div>${weatherIcon} ${entry.weather.temperature !== undefined ? entry.weather.temperature + '°' : ''} ${weatherText}</div>
            </div>`;
        }
        
        // Notes (if any)
        if (entry.notes) {
            html += `<div style="margin-bottom: 10px;">
                <div style="font-weight: 500; margin-bottom: 5px;">Notes:</div>
                <div style="white-space: pre-wrap;">${entry.notes}</div>
            </div>`;
        }
        
        // Images (if any)
        if (entry.images && entry.images.length > 0) {
            html += `<div style="margin-top: 15px;">
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">`;
            
            entry.images.forEach((imgSrc, index) => {
                html += `<div class="journal-image" style="width: 100px; height: 100px; cursor: pointer;" data-full-img="${imgSrc}" data-entry-id="${entry.id}" data-img-index="${index}">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Journal image">
                </div>`;
            });
            
            html += `</div></div>`;
        }
        
        // Close entry card
        html += `</div>`;
    });
    
    journalTimeline.innerHTML = html;
    
    // Add event listeners for edit/delete buttons
    journalTimeline.querySelectorAll('.edit-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const entryId = btn.dataset.entryId;
            openJournalEntryModal(entryId);
        });
    });
    
    journalTimeline.querySelectorAll('.delete-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const entryId = btn.dataset.entryId;
            showDeleteConfirmModal(entryId);
        });
    });
    
    // Add event listeners for image lightbox
    journalTimeline.querySelectorAll('.journal-image').forEach(img => {
        img.addEventListener('click', () => {
            const fullImg = img.dataset.fullImg;
            showImageLightbox(fullImg);
        });
    });
}

function renderGallery() {
    const entries = getJournalEntries();
    const journalGallery = document.getElementById('journalGallery');
    
    // Get all images from all entries
    const allImages = [];
    entries.forEach(entry => {
        if (entry.images && entry.images.length > 0) {
            entry.images.forEach((imgSrc, index) => {
                allImages.push({
                    src: imgSrc,
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
            
            html += `<div class="gallery-image" style="cursor: pointer;" data-full-img="${img.src}" data-entry-id="${img.entryId}">
                <div style="position: relative; padding-bottom: 100%;">
                    <img src="${img.src}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Garden photo">
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
            showImageLightbox(fullImg, entryId);
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

function showImageLightbox(imgSrc, entryId = null) {
    // Remove any existing lightbox
    const oldLightbox = document.getElementById('imageLightbox');
    if (oldLightbox) oldLightbox.remove();
    
    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.id = 'imageLightbox';
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.width = '100%';
    lightbox.style.height = '100%';
    lightbox.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    lightbox.style.zIndex = '9999';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.backgroundColor = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '2rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '10000';
    closeBtn.addEventListener('click', () => lightbox.remove());
    
    // Add image
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.3)';
    
    // Add caption if entry ID is provided
    if (entryId) {
        const entries = getJournalEntries();
        const entry = entries.find(e => e.id === entryId);
        
        if (entry) {
            const caption = document.createElement('div');
            caption.style.position = 'absolute';
            caption.style.bottom = '20px';
            caption.style.left = '0';
            caption.style.width = '100%';
            caption.style.textAlign = 'center';
            caption.style.color = 'white';
            caption.style.padding = '10px';
            caption.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            
            const dateObj = new Date(entry.date);
            const formattedDate = dateObj.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            caption.textContent = `${formattedDate} - ${journalEntryTypes[entry.type]?.name || 'Journal Entry'}`;
            
            lightbox.appendChild(caption);
        }
    }
    
    // Add to document
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(img);
    document.body.appendChild(lightbox);
    
    // Add click event to close on background click
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.remove();
        }
    });
    
    // Add escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('imageLightbox')) {
            document.getElementById('imageLightbox').remove();
        }
    });
}

// The weather code function is still in main code - we'll need to handle dependency temporarily
// This is a dependency we need to handle when we refactor the weather module
function weatherCodeToIconTextColor(code) {
    // Temporary fallback if the function isn't available yet
    if (typeof window.weatherCodeToIconTextColor === 'function') {
        return window.weatherCodeToIconTextColor(code);
    }
    
    // Simple fallback implementation
    return { 
        icon: '🌡️', 
        text: 'Weather info', 
        bg: '#f5f5f5', 
        color: '#666' 
    };
}

// Export functions
export {
    getJournalEntries,
    saveJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getStorageUsage,
    fileToBase64,
    compressImage,
    generateThumbnail,
    renderJournal,
    renderTimeline,
    renderGallery,
    renderJournalCalendar,
    showImageLightbox,
    weatherCodeToIconTextColor
};

// Initialize module - will add all event listeners
export function initJournal() {
    console.log("Journal module initialized");
    
    // Add event listeners for journal features
    const addJournalEntryBtn = document.getElementById('addJournalEntryBtn');
    const emptyJournalAddBtn = document.getElementById('emptyJournalAddBtn');
    const exportJournalBtn = document.getElementById('exportJournalBtn');
    const importJournalBtn = document.getElementById('importJournalBtn');
    const journalTabs = document.querySelectorAll('.journal-tab');
    const journalSection = document.getElementById('garden-journal');
    
    // Render journal if we're already on that tab
    if (journalSection && journalSection.style.display !== 'none') {
        renderJournal();
    }
    
    // Watch for visibility changes on the journal section
    // This ensures the journal renders when it becomes visible
    // from the navigation menu clicks
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style' && 
                journalSection.style.display !== 'none') {
                renderJournal();
            }
        });
    });
    
    // Start observing the journal section for style changes
    if (journalSection) {
        observer.observe(journalSection, { attributes: true });
    }
    
    // Add journal entry buttons
    if (addJournalEntryBtn) {
        addJournalEntryBtn.addEventListener('click', () => openJournalEntryModal());
    }
    
    if (emptyJournalAddBtn) {
        emptyJournalAddBtn.addEventListener('click', () => openJournalEntryModal());
    }
    
    // Export/Import buttons
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
}

// Note: Some functions will be added after we further refactor the HTML file
// Specifically, we need these functions to be adapted as we extract other modules:
// - showExportOptionsModal()
// - showImportOptionsModal()
// - openJournalEntryModal()
// - handlePhotoSelection()
// - exportJournal()

// These will be added/adjusted in future updates as we proceed with refactoring 

// Temporarily adding the modal functions here until we fully refactor the UI module
// Show import options modal
function showImportOptionsModal(importData) {
    const modal = document.getElementById('importOptionsModal');
    const statsMessage = document.getElementById('importStatsMessage');
    
    if (!modal || !statsMessage) {
        console.error('Import modal elements not found');
        return;
    }
    
    // Display stats about the import data
    statsMessage.textContent = `Found ${importData.length} entries to import.`;
    modal.style.display = 'flex';
    
    // Set up event listeners
    const closeBtn = document.getElementById('importModalCloseBtn');
    const cancelBtn = document.getElementById('importOptionsCancelBtn');
    
    // Close/cancel buttons
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => modal.style.display = 'none';
    }
    
    // Handle options click
    const options = modal.querySelectorAll('.import-option');
    options.forEach(option => {
        option.onclick = (e) => {
            const isMerge = e.currentTarget === options[0];
            
            if (isMerge) {
                // Merge mode: Keep existing entries, add new ones
                const currentEntries = getJournalEntries();
                
                // Map existing entries by ID for quick lookup
                const existingIds = {};
                currentEntries.forEach(entry => {
                    existingIds[entry.id] = true;
                });
                
                // Add only entries that don't exist yet
                let newEntries = [...currentEntries];
                let addedCount = 0;
                let updatedCount = 0;
                
                importData.forEach(importEntry => {
                    if (!importEntry.id) {
                        // Generate a new ID if missing
                        importEntry.id = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
                        newEntries.push(importEntry);
                        addedCount++;
                    } else if (existingIds[importEntry.id]) {
                        // Update existing entry
                        const index = newEntries.findIndex(e => e.id === importEntry.id);
                        if (index !== -1) {
                            newEntries[index] = importEntry;
                            updatedCount++;
                        }
                    } else {
                        // New entry with ID
                        newEntries.push(importEntry);
                        addedCount++;
                    }
                });
                
                saveJournalEntries(newEntries);
                alert(`Import complete: ${addedCount} entries added, ${updatedCount} entries updated.`);
            } else {
                // Replace mode: Delete all existing and use imported
                saveJournalEntries(importData);
                alert(`Import complete: Replaced journal with ${importData.length} entries.`);
            }
            
            // Close modal and reload journal
            modal.style.display = 'none';
            renderJournal();
        };
    });
}

// Add showExportOptionsModal function too for completeness
function showExportOptionsModal() {
    const modal = document.getElementById('exportOptionsModal');
    
    if (!modal) {
        console.error('Export modal element not found');
        return;
    }
    
    modal.style.display = 'flex';
    
    // Set up event listeners
    const closeBtn = document.getElementById('exportModalCloseBtn');
    const cancelBtn = document.getElementById('exportOptionsCancelBtn');
    
    // Close/cancel buttons
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => modal.style.display = 'none';
    }
    
    // Handle options click
    const options = modal.querySelectorAll('.export-option');
    options.forEach(option => {
        option.onclick = (e) => {
            const isComplete = e.currentTarget === options[0];
            
            if (isComplete) {
                // Complete export with images
                exportJournal(false);
            } else {
                // Lightweight export without images
                exportJournal(true);
            }
            
            // Close modal
            modal.style.display = 'none';
        };
    });
}

// Export journal function to save journal entries
function exportJournal(lightweight = false) {
    const entries = getJournalEntries();
    
    // For lightweight export, remove photo data to reduce file size
    let exportData = entries;
    if (lightweight) {
        exportData = entries.map(entry => {
            const { photos, ...entryWithoutPhotos } = entry;
            return {
                ...entryWithoutPhotos,
                photos: photos ? photos.map(photo => ({ 
                    id: photo.id,
                    thumbnail: null, // Remove thumbnail data
                    caption: photo.caption || '' 
                })) : []
            };
        });
    }
    
    // Create JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Create download link
    const exportName = lightweight ? 
        'garden_journal_lightweight.json' : 
        'garden_journal_complete.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.style.display = 'none';
    
    // Add to body, click and remove
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}

// Export the new functions
export {
    getJournalEntries,
    saveJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    getStorageUsage,
    fileToBase64,
    compressImage,
    generateThumbnail,
    renderJournal,
    renderTimeline,
    renderGallery,
    renderJournalCalendar,
    showImageLightbox,
    weatherCodeToIconTextColor,
    showImportOptionsModal,
    showExportOptionsModal,
    exportJournal,
    openJournalEntryModal
};

// Open the journal entry modal for adding or editing entries
function openJournalEntryModal(entryId = null) {
    // Get DOM elements
    const modal = document.getElementById('journalEntryModal');
    const form = document.getElementById('journalEntryForm');
    const modalTitle = document.getElementById('journalEntryModalTitle');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const harvestMetricsContainer = document.getElementById('harvestMetricsContainer');
    
    if (!modal || !form) {
        console.error('Journal entry modal elements not found');
        return;
    }
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    
    // Get editable elements
    const idInput = document.getElementById('journalEntryId');
    const dateInput = document.getElementById('entryDate');
    const typeSelect = document.getElementById('entryType');
    const locationInput = document.getElementById('entryLocation');
    const notesInput = document.getElementById('entryNotes');
    const plantsSelect = document.getElementById('entryPlants');
    const quantityInput = document.getElementById('harvestQuantity');
    const unitSelect = document.getElementById('harvestUnit');
    const qualityInput = document.getElementById('harvestQuality');
    
    // Get quality rating text element
    const qualityRatingText = document.getElementById('qualityRatingText');
    
    // Clear form
    form.reset();
    if (photoPreviewContainer) photoPreviewContainer.innerHTML = '';
    idInput.value = '';
    dateInput.value = today;
    
    // Populate plants dropdown from calendar data if available
    if (plantsSelect && window.calendarData) {
        plantsSelect.innerHTML = '';
        
        // Get unique plants from all months
        const plants = new Set();
        for (const month in window.calendarData) {
            for (const category in window.calendarData[month]) {
                if (category !== 'garden_tasks') { // Exclude tasks, only include plants
                    window.calendarData[month][category].forEach(plant => {
                        const plantName = plant.en || JSON.stringify(plant);
                        plants.add(plantName);
                    });
                }
            }
        }
        
        // Sort plants alphabetically
        const sortedPlants = Array.from(plants).sort();
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select plants...';
        plantsSelect.appendChild(emptyOption);
        
        // Add all plants as options
        sortedPlants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant;
            option.textContent = plant;
            plantsSelect.appendChild(option);
        });
    }
    
    // If editing an existing entry
    if (entryId) {
        // Set modal title
        modalTitle.textContent = 'Edit Journal Entry';
        
        // Find the entry
        const entries = getJournalEntries();
        const entry = entries.find(e => e.id === entryId);
        
        if (entry) {
            // Populate form with entry data
            idInput.value = entry.id;
            dateInput.value = entry.date;
            typeSelect.value = entry.type;
            locationInput.value = entry.location || '';
            notesInput.value = entry.notes || '';
            
            // Handle plants selection (multi-select)
            if (entry.plants && plantsSelect) {
                entry.plants.forEach(plant => {
                    const options = plantsSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === plant) {
                            options[i].selected = true;
                            break;
                        }
                    }
                });
            }
            
            // Handle harvest metrics
            if (entry.type === 'harvest') {
                harvestMetricsContainer.style.display = 'block';
                if (entry.harvest) {
                    quantityInput.value = entry.harvest.quantity || '';
                    unitSelect.value = entry.harvest.unit || 'kg';
                    qualityInput.value = entry.harvest.quality || 3;
                    
                    // Update quality rating text
                    updateQualityText(entry.harvest.quality || 3);
                }
            } else {
                harvestMetricsContainer.style.display = 'none';
            }
            
            // Display existing photos
            if (entry.photos && entry.photos.length > 0 && photoPreviewContainer) {
                entry.photos.forEach(photo => {
                    if (photo.thumbnail) {
                        // Create preview element
                        const previewContainer = document.createElement('div');
                        previewContainer.className = 'photo-preview';
                        previewContainer.setAttribute('data-photo-id', photo.id);
                        
                        const img = document.createElement('img');
                        img.src = photo.thumbnail;
                        img.alt = 'Photo thumbnail';
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'remove-photo-btn';
                        removeBtn.innerHTML = '&times;';
                        removeBtn.onclick = function() {
                            previewContainer.remove();
                        };
                        
                        const captionInput = document.createElement('input');
                        captionInput.type = 'text';
                        captionInput.className = 'photo-caption-input';
                        captionInput.placeholder = 'Add caption...';
                        captionInput.value = photo.caption || '';
                        
                        previewContainer.appendChild(img);
                        previewContainer.appendChild(removeBtn);
                        previewContainer.appendChild(captionInput);
                        photoPreviewContainer.appendChild(previewContainer);
                    }
                });
            }
        }
    } else {
        // New entry
        modalTitle.textContent = 'Add Journal Entry';
    }
    
    // Show/hide harvest metrics based on entry type
    typeSelect.onchange = function() {
        if (this.value === 'harvest') {
            harvestMetricsContainer.style.display = 'block';
        } else {
            harvestMetricsContainer.style.display = 'none';
        }
    };
    
    // Update quality rating text when slider changes
    if (qualityInput && qualityRatingText) {
        qualityInput.oninput = function() {
            updateQualityText(this.value);
        };
        
        // Initialize quality text
        updateQualityText(qualityInput.value);
    }
    
    // Helper function to update quality text
    function updateQualityText(value) {
        const qualityLabels = {
            1: 'Poor',
            2: 'Fair',
            3: 'Good',
            4: 'Very Good',
            5: 'Excellent'
        };
        qualityRatingText.textContent = qualityLabels[value] || 'Good';
    }
    
    // Set up photo upload handling
    const photoInput = document.getElementById('photoInput');
    const photoUploadContainer = document.getElementById('photoUploadContainer');
    const dragDropText = document.getElementById('dragDropText');
    
    if (photoInput && photoUploadContainer) {
        // File input change handler
        photoInput.onchange = function(e) {
            handlePhotoSelection(e.target.files);
        };
        
        // Drag and drop functionality
        photoUploadContainer.ondragover = function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--primary-color)';
            this.style.backgroundColor = 'rgba(var(--primary-rgb), 0.05)';
        };
        
        photoUploadContainer.ondragleave = function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--secondary-color)';
            this.style.backgroundColor = '';
        };
        
        photoUploadContainer.ondrop = function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--secondary-color)';
            this.style.backgroundColor = '';
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handlePhotoSelection(e.dataTransfer.files);
            }
        };
    }
    
    // Photo selection handler
    function handlePhotoSelection(files) {
        if (!files || files.length === 0) return;
        
        // Check if adding these files would exceed the limit
        const existingPreviews = photoPreviewContainer.querySelectorAll('.photo-preview');
        if (existingPreviews.length + files.length > 5) {
            alert('Maximum 5 photos per entry. Please remove some photos before adding more.');
            return;
        }
        
        // Process each file
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                console.error('Not an image file:', file.name);
                return;
            }
            
            // Generate a unique ID for this photo
            const photoId = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
            
            // Read file and generate thumbnail
            fileToBase64(file).then(base64 => {
                // Compress the image
                return compressImage(base64);
            }).then(compressedImage => {
                // Create thumbnail
                return generateThumbnail(compressedImage, 200);
            }).then(thumbnail => {
                // Create preview element
                const previewContainer = document.createElement('div');
                previewContainer.className = 'photo-preview';
                previewContainer.setAttribute('data-photo-id', photoId);
                
                const img = document.createElement('img');
                img.src = thumbnail;
                img.alt = 'Photo thumbnail';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-photo-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = function() {
                    previewContainer.remove();
                };
                
                const captionInput = document.createElement('input');
                captionInput.type = 'text';
                captionInput.className = 'photo-caption-input';
                captionInput.placeholder = 'Add caption...';
                
                previewContainer.appendChild(img);
                previewContainer.appendChild(removeBtn);
                previewContainer.appendChild(captionInput);
                photoPreviewContainer.appendChild(previewContainer);
                
                // Hide drag/drop text if we have photos
                if (dragDropText) {
                    dragDropText.style.display = 'none';
                }
                
                // Check if we should show storage warning
                checkStorageUsage();
            }).catch(err => {
                console.error('Error processing image:', err);
            });
        });
    }
    
    // Check storage usage and show warning if needed
    function checkStorageUsage() {
        const storageWarning = document.getElementById('storageWarning');
        if (!storageWarning) return;
        
        const usage = getStorageUsage();
        if (usage.percentUsed > 80) {
            storageWarning.style.display = 'block';
            storageWarning.textContent = `Storage usage: ${usage.percentUsed.toFixed(1)}% (${usage.usedMB.toFixed(1)}MB/${usage.limitMB}MB)`;
        } else {
            storageWarning.style.display = 'none';
        }
    }
    
    // Initially check storage
    checkStorageUsage();
    
    // Form submission
    form.onsubmit = function(e) {
        e.preventDefault();
        
        // Get form values
        const entryData = {
            id: idInput.value || null, // If empty, a new ID will be generated
            date: dateInput.value,
            type: typeSelect.value,
            location: locationInput.value,
            notes: notesInput.value,
            timestamp: Date.now()
        };
        
        // Get selected plants
        if (plantsSelect) {
            entryData.plants = Array.from(plantsSelect.selectedOptions).map(option => option.value);
        }
        
        // Get harvest metrics if applicable
        if (typeSelect.value === 'harvest') {
            entryData.harvest = {
                quantity: parseFloat(quantityInput.value) || 0,
                unit: unitSelect.value,
                quality: parseInt(qualityInput.value) || 3
            };
        }
        
        // Get photos
        const photoPreviews = photoPreviewContainer.querySelectorAll('.photo-preview');
        if (photoPreviews.length > 0) {
            entryData.photos = [];
            photoPreviews.forEach(preview => {
                const photoId = preview.getAttribute('data-photo-id');
                const img = preview.querySelector('img');
                const captionInput = preview.querySelector('.photo-caption-input');
                
                entryData.photos.push({
                    id: photoId,
                    thumbnail: img.src,
                    caption: captionInput ? captionInput.value : ''
                });
            });
        }
        
        // Save the entry
        if (entryData.id) {
            // Update existing entry
            updateJournalEntry(entryData.id, entryData);
        } else {
            // Create new entry
            createJournalEntry(entryData);
        }
        
        // Close modal and refresh journal
        modal.style.display = 'none';
        renderJournal();
        
        return false;
    };
    
    // Close button
    const closeBtn = document.getElementById('closeJournalEntryBtn');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelJournalEntryBtn');
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // Show modal
    modal.style.display = 'flex';
}

// Temporarily adding the modal functions here until we fully refactor the UI module
// Show import options modal
function showImportOptionsModal(importData) {
    const modal = document.getElementById('importOptionsModal');
    const statsMessage = document.getElementById('importStatsMessage');
    
    if (!modal || !statsMessage) {
        console.error('Import modal elements not found');
        return;
    }
    
    // Display stats about the import data
    statsMessage.textContent = `Found ${importData.length} entries to import.`;
    modal.style.display = 'flex';
    
    // Set up event listeners
    const closeBtn = document.getElementById('importModalCloseBtn');
    const cancelBtn = document.getElementById('importOptionsCancelBtn');
    
    // Close/cancel buttons
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => modal.style.display = 'none';
    }
    
    // Handle options click
    const options = modal.querySelectorAll('.import-option');
    options.forEach(option => {
        option.onclick = (e) => {
            const isMerge = e.currentTarget === options[0];
            
            if (isMerge) {
                // Merge mode: Keep existing entries, add new ones
                const currentEntries = getJournalEntries();
                
                // Map existing entries by ID for quick lookup
                const existingIds = {};
                currentEntries.forEach(entry => {
                    existingIds[entry.id] = true;
                });
                
                // Add only entries that don't exist yet
                let newEntries = [...currentEntries];
                let addedCount = 0;
                let updatedCount = 0;
                
                importData.forEach(importEntry => {
                    if (!importEntry.id) {
                        // Generate a new ID if missing
                        importEntry.id = Date.now() + '-' + Math.random().toString(36).substring(2, 10);
                        newEntries.push(importEntry);
                        addedCount++;
                    } else if (existingIds[importEntry.id]) {
                        // Update existing entry
                        const index = newEntries.findIndex(e => e.id === importEntry.id);
                        if (index !== -1) {
                            newEntries[index] = importEntry;
                            updatedCount++;
                        }
                    } else {
                        // New entry with ID
                        newEntries.push(importEntry);
                        addedCount++;
                    }
                });
                
                saveJournalEntries(newEntries);
                alert(`Import complete: ${addedCount} entries added, ${updatedCount} entries updated.`);
            } else {
                // Replace mode: Delete all existing and use imported
                saveJournalEntries(importData);
                alert(`Import complete: Replaced journal with ${importData.length} entries.`);
            }
            
            // Close modal and reload journal
            modal.style.display = 'none';
            renderJournal();
        };
    });
}

// Add showExportOptionsModal function too for completeness
function showExportOptionsModal() {
    const modal = document.getElementById('exportOptionsModal');
    
    if (!modal) {
        console.error('Export modal element not found');
        return;
    }
    
    modal.style.display = 'flex';
    
    // Set up event listeners
    const closeBtn = document.getElementById('exportModalCloseBtn');
    const cancelBtn = document.getElementById('exportOptionsCancelBtn');
    
    // Close/cancel buttons
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (cancelBtn) {
        cancelBtn.onclick = () => modal.style.display = 'none';
    }
    
    // Handle options click
    const options = modal.querySelectorAll('.export-option');
    options.forEach(option => {
        option.onclick = (e) => {
            const isComplete = e.currentTarget === options[0];
            
            if (isComplete) {
                // Complete export with images
                exportJournal(false);
            } else {
                // Lightweight export without images
                exportJournal(true);
            }
            
            // Close modal
            modal.style.display = 'none';
        };
    });
}

// Export journal function to save journal entries
function exportJournal(lightweight = false) {
    const entries = getJournalEntries();
    
    // For lightweight export, remove photo data to reduce file size
    let exportData = entries;
    if (lightweight) {
        exportData = entries.map(entry => {
            const { photos, ...entryWithoutPhotos } = entry;
            return {
                ...entryWithoutPhotos,
                photos: photos ? photos.map(photo => ({ 
                    id: photo.id,
                    thumbnail: null, // Remove thumbnail data
                    caption: photo.caption || '' 
                })) : []
            };
        });
    }
    
    // Create JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Create download link
    const exportName = lightweight ? 
        'garden_journal_lightweight.json' : 
        'garden_journal_complete.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.style.display = 'none';
    
    // Add to body, click and remove
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
} 