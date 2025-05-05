// Journal Module for Garden Calendar
// Contains all journal-related functionality

// Journal entry types
const journalEntryTypes = {
    "planting": { icon: "🌱", name: "Planting" },
    "care": { icon: "🌿", name: "Garden Care" },
    "harvest": { icon: "🥕", name: "Harvest" },
    "observation": { icon: "👁️", name: "Observation" },
    "maintenance": { icon: "🧰", name: "Maintenance" }
};

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

// Export journal to JSON file
function exportJournal(includeImages = true) {
    const entries = getJournalEntries();
    
    // If no entries, show message
    if (entries.length === 0) {
        alert('No journal entries to export.');
        return;
    }
    
    // Clone entries to avoid modifying the original data
    let exportData = JSON.parse(JSON.stringify(entries));
    
    // Remove images if not including them
    if (!includeImages) {
        exportData = exportData.map(entry => {
            const entryCopy = {...entry};
            delete entryCopy.images;
            return entryCopy;
        });
    }
    
    // Create the export file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    // Generate filename with timestamp
    const date = new Date().toISOString().slice(0, 10);
    const filename = `garden_journal_${date}${includeImages ? '_with_images' : '_no_images'}.json`;
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Show export options modal
function showExportOptionsModal() {
    const modal = document.getElementById('exportOptionsModal');
    const exportOptions = modal.querySelectorAll('.export-option');
    const cancelBtn = document.getElementById('exportOptionsCancelBtn');
    const closeBtn = document.getElementById('exportModalCloseBtn');
    
    // Clear any previous selections
    exportOptions.forEach(option => {
        option.style.borderColor = '#ddd';
        option.style.backgroundColor = 'transparent';
    });
    
    // Set click behavior for options
    exportOptions[0].onclick = () => {
        modal.style.display = 'none';
        exportJournal(true); // Full export with images
    };
    
    exportOptions[1].onclick = () => {
        modal.style.display = 'none';
        exportJournal(false); // Lightweight export without images
    };
    
    // Add hover effects
    exportOptions.forEach(option => {
        option.onmouseover = () => {
            if (option.style.borderColor !== 'var(--primary-color)') {
                option.style.backgroundColor = '#f5f5f5';
            }
        };
        
        option.onmouseout = () => {
            if (option.style.borderColor !== 'var(--primary-color)') {
                option.style.backgroundColor = 'transparent';
            }
        };
    });
    
    // Cancel and close buttons close the modal
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Show modal
    modal.style.display = 'flex';
    
    // Setup escape key handler
    const handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEscapeKey);
        }
    };
    document.addEventListener('keydown', handleEscapeKey);
}

// Show import options modal
function showImportOptionsModal(importData) {
    const modal = document.getElementById('importOptionsModal');
    const importOptions = modal.querySelectorAll('.import-option');
    const cancelBtn = document.getElementById('importOptionsCancelBtn');
    const closeBtn = document.getElementById('importModalCloseBtn');
    const statsMessage = document.getElementById('importStatsMessage');
    
    // Update the stats message
    statsMessage.textContent = `Found ${importData.length} journal ${importData.length === 1 ? 'entry' : 'entries'} to import.`;
    
    // Clear any previous selections
    importOptions.forEach(option => {
        option.style.borderColor = '#ddd';
        option.style.backgroundColor = 'transparent';
    });
    
    // Set click behavior for options
    importOptions[0].onclick = () => {
        // Merge option
        modal.style.display = 'none';
        handleImport(importData, true);
    };
    
    importOptions[1].onclick = () => {
        // Replace option
        modal.style.display = 'none';
        handleImport(importData, false);
    };
    
    // Add hover effects
    importOptions.forEach(option => {
        option.onmouseover = () => {
            if (option.style.borderColor !== 'var(--primary-color)') {
                option.style.backgroundColor = '#f5f5f5';
            }
        };
        
        option.onmouseout = () => {
            if (option.style.borderColor !== 'var(--primary-color)') {
                option.style.backgroundColor = 'transparent';
            }
        };
    });
    
    // Cancel and close buttons close the modal
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Click outside to close
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // Show modal
    modal.style.display = 'flex';
    
    // Setup escape key handler
    const handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEscapeKey);
        }
    };
    document.addEventListener('keydown', handleEscapeKey);
}

// Handle import of journal entries
function handleImport(importData, isMerge) {
    const existingEntries = getJournalEntries();
    
    if (isMerge) {
        // Merge: Keep existing entries and add new ones
        const mergedEntries = [...existingEntries];
        
        // Track stats for user feedback
        let added = 0;
        let updated = 0;
        
        importData.forEach(importEntry => {
            const existingIndex = mergedEntries.findIndex(e => e.id === importEntry.id);
            
            if (existingIndex >= 0) {
                // Update existing entry
                mergedEntries[existingIndex] = importEntry;
                updated++;
            } else {
                // Add new entry
                mergedEntries.push(importEntry);
                added++;
            }
        });
        
        // Save merged entries
        saveJournalEntries(mergedEntries);
        
        // Show success message
        alert(`Import successful!\nAdded ${added} new ${added === 1 ? 'entry' : 'entries'}\nUpdated ${updated} existing ${updated === 1 ? 'entry' : 'entries'}`);
    } else {
        // Replace: Delete all existing entries and use imported ones
        saveJournalEntries(importData);
        
        // Show success message
        alert(`Import successful!\nReplaced all entries with ${importData.length} imported ${importData.length === 1 ? 'entry' : 'entries'}`);
    }
    
    // Refresh the journal display
    if (typeof renderJournal === 'function') {
        renderJournal();
    }
}

// Function to open the journal entry modal (new or edit)
function openJournalEntryModal(entryId = null) {
    // Get required DOM elements
    const journalEntryForm = document.getElementById('journalEntryForm');
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    const harvestMetricsContainer = document.getElementById('harvestMetricsContainer');
    
    // Reset form
    journalEntryForm.reset();
    document.getElementById('journalEntryId').value = '';
    photoPreviewContainer.innerHTML = '';
    document.getElementById('journalEntryModalTitle').textContent = 'Add Journal Entry';
    
    // Set today's date as default
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    
    // Hide harvest metrics by default
    harvestMetricsContainer.style.display = 'none';
    
    // If editing an existing entry
    if (entryId) {
        const entries = getJournalEntries();
        const entry = entries.find(e => e.id === entryId);
        
        if (entry) {
            // Set form title
            document.getElementById('journalEntryModalTitle').textContent = 'Edit Journal Entry';
            
            // Set form values
            document.getElementById('journalEntryId').value = entry.id;
            document.getElementById('entryDate').value = entry.date;
            document.getElementById('entryType').value = entry.type;
            document.getElementById('entryNotes').value = entry.notes || '';
            document.getElementById('entryLocation').value = entry.location || '';
            
            // Handle plants
            if (entry.plants && entry.plants.length > 0) {
                document.getElementById('entryPlants').value = entry.plants.join(', ');
            }
            
            // Show harvest metrics if relevant
            if (entry.type === 'harvest' && entry.metrics) {
                harvestMetricsContainer.style.display = 'block';
                document.getElementById('harvestWeight').value = entry.metrics.weight || '';
                document.getElementById('harvestQuantity').value = entry.metrics.quantity || '';
            }
            
            // Show photos if available
            if (entry.images && entry.images.length > 0) {
                entry.images.forEach(imgData => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'photo-preview';
                    
                    const img = document.createElement('img');
                    img.src = imgData.thumbnail || imgData.data;
                    img.onclick = () => showImageLightbox(imgData.data, entry.id);
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.className = 'photo-remove-btn';
                    removeBtn.onclick = () => {
                        imgContainer.remove();
                    };
                    
                    imgContainer.appendChild(img);
                    imgContainer.appendChild(removeBtn);
                    photoPreviewContainer.appendChild(imgContainer);
                });
            }
        }
    }
    
    // Show the modal
    const modal = document.getElementById('journalEntryModal');
    modal.style.display = 'flex';
    
    // Setup escape key handler
    const handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            document.removeEventListener('keydown', handleEscapeKey);
        }
    };
    document.addEventListener('keydown', handleEscapeKey);
}

// Function to handle photo selection
function handlePhotoSelection(input) {
    if (!input.files || input.files.length === 0) return;
    
    const photoPreviewContainer = document.getElementById('photoPreviewContainer');
    
    Array.from(input.files).forEach(file => {
        if (!file.type.match('image.*')) {
            alert('Please select image files only.');
            return;
        }
        
        fileToBase64(file).then(base64 => {
            compressImage(base64, 1200, 0.7).then(compressed => {
                generateThumbnail(compressed, 150).then(thumbnail => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'photo-preview';
                    
                    const img = document.createElement('img');
                    img.src = thumbnail;
                    img.dataset.fullImage = compressed;
                    img.onclick = () => showImageLightbox(compressed);
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.className = 'photo-remove-btn';
                    removeBtn.onclick = () => {
                        imgContainer.remove();
                    };
                    
                    imgContainer.appendChild(img);
                    imgContainer.appendChild(removeBtn);
                    photoPreviewContainer.appendChild(imgContainer);
                });
            });
        });
    });
    
    // Reset the file input so the change event fires again if selecting the same file
    input.value = '';
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
    journalEntryTypes,
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
    handleImport,
    openJournalEntryModal,
    handlePhotoSelection
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