/**
 * Journal UI Module
 * Handles all DOM manipulations and UI rendering for journal entries.
 * This is the main entry point for journal functionality.
 */

// Import from journal-logic.js for data functions
import { 
  journalEntryTypes,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  exportJournal,
  handleImport,
  fileToBase64,
  compressImage,
  generateThumbnail,
  weatherCodeToIconTextColor,
  removeImageFromEntry
} from './journal-logic.js';

// Import storage functions
import { getJournalEntries, saveJournalEntries } from './journal-storage.js';

// Import social functionality
import { shareContent } from './social.js';

// Re-export logic functions that might be needed by other modules
export { 
  removeImageFromEntry
};

/**
 * Show the export options modal
 */
export function showExportOptionsModal() {
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

/**
 * Show the import options modal
 * @param {Array} importData - The journal entries to import
 */
export function showImportOptionsModal(importData) {
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

/**
 * Function to handle photo selection for journal entries
 * @param {HTMLInputElement} input - The file input element
 */
export function handlePhotoSelection(input) {
  if (!input.files || input.files.length === 0) return;
  
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  
  Array.from(input.files).forEach(file => {
    if (!file.type.match('image.*')) {
      alert('Please select image files only.');
      return;
    }
    
    fileToBase64(file).then(base64 => {
      compressImage(base64, 800, 0.7).then(compressed => {
        generateThumbnail(compressed, 150).then(thumbnail => {
          // Create image container
          const imgContainer = document.createElement('div');
          imgContainer.className = 'photo-preview';
          
          // Create and set up image
          const img = document.createElement('img');
          img.src = thumbnail;
          img.loading = "lazy";
          img.dataset.fullImage = compressed;
          img.onclick = () => showImageLightbox(compressed);
          
          // Create remove button
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '&times;';
          removeBtn.className = 'photo-remove-btn';
          removeBtn.onclick = () => {
            imgContainer.remove();
          };
          
          // Add elements to container
          imgContainer.appendChild(img);
          imgContainer.appendChild(removeBtn);
          photoPreviewContainer.appendChild(imgContainer);
          
          // Log success
          console.log('Photo added successfully:', {
            thumbnail: thumbnail.substring(0, 50) + '...',
            fullSize: compressed.substring(0, 50) + '...'
          });
        });
      }).catch(error => {
        console.error('Error processing image:', error);
        alert('Error processing image. Please try again with a different image.');
      });
    });
  });
  
  // Reset the file input so the change event fires again if selecting the same file
  input.value = '';
}

/**
 * Open the journal entry modal for creating or editing an entry
 * @param {string|null} entryId - ID of the entry to edit, or null for a new entry
 */
export function openJournalEntryModal(entryId = null) {
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
        entry.images.forEach((imgData, index) => {
          // Create container for the image preview
          const imgContainer = document.createElement('div');
          imgContainer.className = 'photo-preview';
          // Store the original index for removal
          imgContainer.dataset.originalIndex = index.toString();
          
          // Create image element
          const img = document.createElement('img');
          
          // Handle different image data formats (string or object)
          let imageSource, fullImageSource;
          if (typeof imgData === 'string') {
            // If it's just a string, use it for both thumbnail and full image
            imageSource = imgData;
            fullImageSource = imgData;
          } else if (typeof imgData === 'object') {
            // If it's an object with data and thumbnail properties
            imageSource = imgData.thumbnail || imgData.data || '';
            fullImageSource = imgData.data || imgData.thumbnail || '';
          } else {
            // Skip invalid image data
            console.warn('Invalid image data format:', imgData);
            return;
          }
          
          // Set image source and storage
          img.src = imageSource;
          img.loading = "lazy";
          img.dataset.fullImage = fullImageSource;
          
          // Set click handler for lightbox view
          img.onclick = () => showImageLightbox(fullImageSource, entry.id, index);
          
          // Add remove button
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '&times;';
          removeBtn.className = 'photo-remove-btn';
          removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to remove this image?')) {
              // When editing in the modal, we don't need to call removeImageFromEntry directly
              // Just remove from the preview, the save function will handle the updates
              imgContainer.remove();
            }
          };
          
          // Add elements to the container
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

/**
 * Render the main journal view
 */
export function renderJournal() {
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

/**
 * Render the timeline view of journal entries
 */
export function renderTimeline() {
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
      
      entry.images.forEach((img, index) => {
        // Handle both string format and object format for backward compatibility
        const imgSrc = typeof img === 'string' ? img : (img.data || img.thumbnail);
        html += `<div class="journal-image" style="width: 100px; height: 100px; cursor: pointer;" data-full-img="${imgSrc}" data-entry-id="${entry.id}" data-img-index="${index}">
          <img src="${typeof img === 'string' ? img : (img.thumbnail || img.data)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" loading="lazy" alt="Journal image">
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

/**
 * Render gallery view with all journal images
 */
export function renderGallery() {
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
      
      html += `<div class="gallery-image" style="cursor: pointer;" data-full-img="${img.src}" data-entry-id="${img.entryId}">
        <div style="position: relative; padding-bottom: 100%;">
          <img src="${img.thumbnail}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" loading="lazy" alt="Garden photo">
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

/**
 * Render calendar view of journal entries
 */
export function renderJournalCalendar() {
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

/**
 * Show image in a lightbox
 * @param {string} imgSrc - Source of the image
 * @param {string|null} entryId - ID of the entry, if applicable
 */
export function showImageLightbox(imgSrc, entryId = null, imgIndex = null) {
  // Check if we already have a lightbox
  let lightbox = document.getElementById('imageLightbox');
  
  // If not, create one
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'imageLightbox';
    lightbox.className = 'image-lightbox';
    lightbox.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;
    
    // Close on click
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        lightbox.remove();
      }
    });
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('imageLightbox')) {
        document.getElementById('imageLightbox').remove();
      }
    });
    
    document.body.appendChild(lightbox);
  }
  
  // Create container for image and buttons
  const contentContainer = document.createElement('div');
  contentContainer.style.cssText = `
    position: relative;
    max-width: 90%;
    max-height: 90%;
  `;
  
  // Create image element
  const img = document.createElement('img');
  img.src = imgSrc;
  img.loading = "lazy";
  img.style.cssText = `
    max-width: 100%;
    max-height: 80vh;
    border: 2px solid white;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  `;
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: -15px;
    right: -15px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: white;
    color: black;
    font-size: 20px;
    line-height: 28px;
    text-align: center;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  `;
  closeBtn.onclick = function(e) {
    e.stopPropagation();
    lightbox.remove();
  };
  
  // Add image and close button to container
  contentContainer.appendChild(img);
  contentContainer.appendChild(closeBtn);
  
  // Add remove button if we have an entry ID and image index
  if (entryId && imgIndex !== null) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove Image';
    removeBtn.style.cssText = `
      margin-top: 15px;
      padding: 8px 16px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
    `;
    removeBtn.onclick = function(e) {
      e.stopPropagation();
      
      if (confirm('Are you sure you want to remove this image? This action cannot be undone.')) {
        // Remove the image
        const updatedEntry = removeImageFromEntry(entryId, imgIndex);
        
        if (updatedEntry) {
          // Close the lightbox
          lightbox.remove();
          
          // Refresh the journal views
          renderJournal();
          
          // Show feedback
          alert('Image removed successfully.');
        }
      }
    };
    
    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      justify-content: center;
      margin-top: 15px;
      gap: 15px;
    `;
    buttonsContainer.appendChild(removeBtn);
    
    // Add buttons container to lightbox
    lightbox.innerHTML = '';
    lightbox.appendChild(contentContainer);
    lightbox.appendChild(buttonsContainer);
  } else {
    // Just show the image without remove button
    lightbox.innerHTML = '';
    lightbox.appendChild(contentContainer);
  }
}

/**
 * Show delete confirmation modal
 * @param {string} entryId - ID of the entry to delete
 */
export function showDeleteConfirmModal(entryId) {
  const modal = document.getElementById('deleteConfirmModal');
  const cancelBtn = document.getElementById('deleteConfirmCancelBtn');
  const confirmBtn = document.getElementById('deleteConfirmBtn');
  const closeBtn = document.getElementById('deleteModalCloseBtn');
  
  // Set up confirm button action
  confirmBtn.onclick = () => {
    // Delete the entry
    if (deleteJournalEntry(entryId)) {
      // Update the journal display
      renderJournal();
      // Show success message
      alert('Journal entry deleted successfully.');
    }
    // Hide modal
    modal.style.display = 'none';
  };
  
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
                // If editing an existing entry, we need to handle the original image indices
                if (entryId) {
                    const entries = getJournalEntries();
                    const entry = entries.find(e => e.id === entryId);
                    
                    if (entry && entry.images && entry.images.length > 0) {
                        // Initialize images array
                        entryData.images = [];
                        
                        // Get all preview containers
                        const previewElements = photoPreviewContainer.querySelectorAll('.photo-preview');
                        
                        previewElements.forEach(preview => {
                            const img = preview.querySelector('img');
                            if (!img || !img.src) return;
                            
                            // If this preview has an original index, use the original image data
                            const originalIndex = preview.dataset.originalIndex;
                            if (originalIndex !== undefined && !isNaN(parseInt(originalIndex, 10))) {
                                const index = parseInt(originalIndex, 10);
                                if (index >= 0 && index < entry.images.length) {
                                    entryData.images.push(entry.images[index]);
                                    return;
                                }
                            }
                            
                            // Otherwise use the current image data
                            const fullImage = img.dataset.fullImage || img.src;
                            const thumbnail = img.src;
                            
                            if (fullImage) {
                                entryData.images.push({
                                    data: fullImage,
                                    thumbnail: thumbnail
                                });
                            }
                        });
                    } else {
                        // Handle as a new entry with new images
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
                                
                                // Store images
                                entryData.images.push({
                                    data: fullImage,
                                    thumbnail: thumbnail
                                });
                            });
                        }
                    }
                } else {
                    // New entry - collect images simply
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
                            
                            // Store images
                            entryData.images.push({
                                data: fullImage,
                                thumbnail: thumbnail
                            });
                        });
                    }
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
    const viewDropdownContainer = document.getElementById('journalViewDropdownContainer');
    const viewDropdown = document.getElementById('journalViewDropdown');

    function isMobile() {
        return window.innerWidth <= 600;
    }

    function updateMobileJournalUI() {
        if (isMobile()) {
            if (fabBtn) fabBtn.style.display = 'flex';
            if (viewDropdownContainer) viewDropdownContainer.style.display = 'block';
        } else {
            if (fabBtn) fabBtn.style.display = 'none';
            if (viewDropdownContainer) viewDropdownContainer.style.display = 'none';
        }
    }
    window.addEventListener('resize', updateMobileJournalUI);
    updateMobileJournalUI();
    
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
        if (fabBtn && viewDropdownContainer && journalSection) {
            const isJournalVisible = journalSection.style.display !== 'none';
            if (isMobile()) {
                fabBtn.style.display = isJournalVisible ? 'flex' : 'none';
                viewDropdownContainer.style.display = isJournalVisible ? 'block' : 'none';
            } else {
                fabBtn.style.display = 'none';
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

/**
 * Open a journal entry view modal
 * @param {Object} entry - The journal entry to view
 */
export function openViewModal(entry) {
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
                        <img src="${typeof photo === 'string' ? photo : (photo.data || photo.thumbnail)}" loading="lazy" alt="Garden journal photo">
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
            
            ${entry.type === 'harvest' && (entry.metrics?.weight || entry.metrics?.quantity) ? `
            <div class="entry-view-field">
                <span class="field-label">Harvest Details:</span>
                <span class="field-value">
                    ${entry.metrics?.weight ? `Weight: ${entry.metrics.weight}` : ''}
                    ${entry.metrics?.weight && entry.metrics?.quantity ? ' • ' : ''}
                    ${entry.metrics?.quantity ? `Quantity: ${entry.metrics.quantity}` : ''}
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

/**
 * Share a journal entry
 * @param {Object} entry - The journal entry to share
 */
export function shareJournalEntry(entry) {
    if (!entry) return;
    
    // Use the shareContent function from social module
    shareContent('journal', { entry });
}

/**
 * Render a timeline entry
 * @param {Object} entry - The journal entry to render
 * @param {number} index - The index of the entry
 * @returns {HTMLElement} The rendered entry element
 */
export function renderTimelineEntry(entry, index) {
    const entryType = journalEntryTypes[entry.type] || { icon: '📝', label: 'Note' };
    
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
                        <img src="${typeof photo === 'string' ? photo : (photo.data || photo.thumbnail)}" loading="lazy" alt="Garden journal photo">
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
        
        ${entry.type === 'harvest' && (entry.metrics?.weight || entry.metrics?.quantity) ? `
        <div class="entry-harvest-metrics">
            ${entry.metrics?.weight ? `<span><strong>Weight:</strong> ${entry.metrics.weight}</span>` : ''}
            ${entry.metrics?.quantity ? `<span><strong>Quantity:</strong> ${entry.metrics.quantity}</span>` : ''}
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
        openJournalEntryModal(entry.id);
    });
    
    entryEl.querySelector('.entry-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showDeleteConfirmModal(entry.id);
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

// All UI rendering functions will be migrated here:
// - renderJournal()
// - renderTimeline()
// - renderGallery()
// - renderJournalCalendar()
// - Modal handlers
// - Etc. 