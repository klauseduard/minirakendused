// Gardening Calendar - Journal Module

// Initialize journal functionality
function initJournal() {
    // Check if journal section exists
    const journalSection = document.getElementById('garden-journal');
    if (!journalSection) return;
    
    // Initialize journal components
    initJournalTabs();
    initJournalButtons();
    
    // Render journal
    renderJournal();
}

// Initialize journal tabs
function initJournalTabs() {
    const tabs = document.querySelectorAll('.journal-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get view type
            const viewType = this.getAttribute('data-view');
            
            // Hide all views
            document.getElementById('journalTimeline').style.display = 'none';
            document.getElementById('journalGallery').style.display = 'none';
            document.getElementById('journalCalendar').style.display = 'none';
            
            // Show selected view
            document.getElementById(`journal${viewType.charAt(0).toUpperCase() + viewType.slice(1)}`).style.display = 'block';
        });
    });
}

// Initialize journal buttons
function initJournalButtons() {
    // Add journal entry button
    const addButtons = [
        document.getElementById('addJournalEntryBtn'),
        document.getElementById('emptyJournalAddBtn')
    ];
    
    addButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                showJournalEntryForm();
            });
        }
    });
    
    // Export journal button
    const exportBtn = document.getElementById('exportJournalBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportJournal);
    }
    
    // Import journal button
    const importBtn = document.getElementById('importJournalBtn');
    if (importBtn) {
        importBtn.addEventListener('click', importJournal);
    }
}

// Render the journal content
function renderJournal() {
    const entries = getJournalEntries();
    const emptyMessage = document.getElementById('emptyJournalMessage');
    const timeline = document.getElementById('journalTimeline');
    const gallery = document.getElementById('journalGallery');
    const calendar = document.getElementById('journalCalendar');
    
    // Show/hide empty message
    if (entries.length === 0) {
        emptyMessage.style.display = 'block';
        timeline.style.display = 'none';
        gallery.style.display = 'none';
        calendar.style.display = 'none';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    // Render timeline view
    renderTimelineView(entries, timeline);
    
    // Render gallery view
    renderGalleryView(entries, gallery);
    
    // Render calendar view
    renderCalendarView(entries, calendar);
    
    // Show currently active view
    const activeTab = document.querySelector('.journal-tab.active');
    if (activeTab) {
        const viewType = activeTab.getAttribute('data-view');
        document.getElementById(`journal${viewType.charAt(0).toUpperCase() + viewType.slice(1)}`).style.display = 'block';
    } else {
        // Default to timeline view
        document.querySelector('.journal-tab[data-view="timeline"]').classList.add('active');
        timeline.style.display = 'block';
    }
}

// Get journal entries from localStorage
function getJournalEntries() {
    try {
        return JSON.parse(localStorage.getItem('gardening_journal_entries') || '[]');
    } catch (e) {
        console.error('Error parsing journal entries:', e);
        return [];
    }
}

// Save journal entries to localStorage
function saveJournalEntries(entries) {
    localStorage.setItem('gardening_journal_entries', JSON.stringify(entries));
}

// Render timeline view
function renderTimelineView(entries, timeline) {
    let html = '';
    
    entries.forEach(entry => {
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString();
        
        html += `
            <div class="journal-entry" data-entry-id="${entry.id}">
                <div class="entry-header">
                    <div class="entry-date">${formattedDate}</div>
                    <div class="entry-actions">
                        <button class="entry-edit-btn" data-entry-id="${entry.id}">✏️</button>
                        <button class="entry-delete-btn" data-entry-id="${entry.id}">🗑️</button>
                    </div>
                </div>
                <div class="entry-title">${entry.title}</div>
                <div class="entry-content">${entry.content.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    });
    
    timeline.innerHTML = html;
    
    // Add event listeners
    addTimelineEventListeners(timeline);
}

// Add event listeners to timeline elements
function addTimelineEventListeners(timeline) {
    timeline.querySelectorAll('.entry-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const entryId = this.getAttribute('data-entry-id');
            editJournalEntry(entryId);
        });
    });
    
    timeline.querySelectorAll('.entry-delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const entryId = this.getAttribute('data-entry-id');
            deleteJournalEntryWithConfirm(entryId);
        });
    });
}

// Render gallery view
function renderGalleryView(entries, gallery) {
    // Simplified gallery view
    gallery.innerHTML = '<div class="no-photos-message">Photo gallery view</div>';
}

// Render calendar view
function renderCalendarView(entries, calendar) {
    // Simplified calendar view
    calendar.innerHTML = '<div class="calendar-view-placeholder">Calendar view</div>';
}

// Show journal entry form
function showJournalEntryForm(entry = null) {
    console.log("Journal entry form would show here", entry);
    alert("Journal entry form would be shown here" + (entry ? " to edit entry" : " to add new entry"));
}

// Edit journal entry
function editJournalEntry(entryId) {
    const entries = getJournalEntries();
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
        showJournalEntryForm(entry);
    }
}

// Delete journal entry with confirmation
function deleteJournalEntryWithConfirm(entryId) {
    if (confirm('Are you sure you want to delete this journal entry? This cannot be undone.')) {
        const entries = getJournalEntries();
        const updatedEntries = entries.filter(entry => entry.id !== entryId);
        saveJournalEntries(updatedEntries);
        renderJournal();
    }
}

// Export journal
function exportJournal() {
    const entries = getJournalEntries();
    const json = JSON.stringify(entries, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `garden_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import journal
function importJournal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const importData = JSON.parse(event.target.result);
                if (Array.isArray(importData) && importData.length > 0) {
                    handleImport(importData);
                } else {
                    alert('No valid journal entries found in the file.');
                }
            } catch (error) {
                console.error('Error parsing import file:', error);
                alert('Error importing file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Handle import
function handleImport(importData) {
    if (confirm(`Found ${importData.length} journal entries to import. Would you like to merge with existing entries?`)) {
        // Merge with existing entries
        const existingEntries = getJournalEntries();
        const mergedEntries = [...existingEntries];
        
        importData.forEach(importEntry => {
            const existingIndex = mergedEntries.findIndex(e => e.id === importEntry.id);
            
            if (existingIndex >= 0) {
                // Update existing entry
                mergedEntries[existingIndex] = importEntry;
            } else {
                // Add new entry
                mergedEntries.push(importEntry);
            }
        });
        
        saveJournalEntries(mergedEntries);
    } else {
        // Replace existing entries
        saveJournalEntries(importData);
    }
    
    renderJournal();
}

export { initJournal }; 