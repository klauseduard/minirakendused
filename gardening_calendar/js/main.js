/**
 * Main Entry Point for Gardening Calendar Application
 * 
 * This file imports and initializes all modules in the correct order,
 * replacing the individual loader files with a single entry point.
 */

// Import all modules
import * as dataModule from './modules/data.js';
import * as storageModule from './modules/storage.js';
import * as uiModule from './modules/ui.js';
import * as weatherModule from './modules/weather.js';
import * as climateModule from './modules/climate.js';
import * as calendarModule from './modules/calendar.js';
import * as searchModule from './modules/search.js';
import * as journalModule from './modules/journal.js';
import * as customEntriesModule from './modules/custom-entries.js';
import * as socialModule from './modules/social.js';

// Global state for sharing data between modules
window.GardeningApp = {
    activeMonth: 'april',
    currentLang: 'en',
    modules: {
        data: dataModule,
        storage: storageModule,
        ui: uiModule,
        weather: weatherModule,
        climate: climateModule,
        calendar: calendarModule,
        search: searchModule,
        journal: journalModule,
        customEntries: customEntriesModule,
        social: socialModule
    },
    state: {
        currentMonth: null,
        location: null,
        weather: null
    }
};

// Export modules for backward compatibility (replacing individual loaders)
// Data module exports
window.translations = dataModule.translations;
window.calendarData = dataModule.calendarData;
window.categoryIcons = dataModule.categoryIcons;
window.categoryNames = dataModule.categoryNames;
window.journalEntryTypes = dataModule.journalEntryTypes;
window.customEntryTypes = dataModule.customEntryTypes;

// Storage module exports
window.getSelectedItems = storageModule.getSelectedItems;
window.isItemSelected = storageModule.isItemSelected;
window.toggleItemSelection = storageModule.toggleItemSelection;
window.saveUserPreference = storageModule.saveUserPreference;
window.getUserPreference = storageModule.getUserPreference;

// UI module exports
window.showModal = uiModule.showModal;
window.hideModal = uiModule.hideModal;
window.showConfirmation = uiModule.showConfirmation;
window.showNotification = uiModule.showNotification;
window.scrollToElement = uiModule.scrollToElement;
window.generatePrompt = uiModule.generatePrompt;
window.copyPrompt = uiModule.copyPrompt;

// Weather module exports
window.fetchWeatherData = weatherModule.fetchWeatherData;
window.geocodeLocation = weatherModule.geocodeLocation;
window.renderWeatherData = weatherModule.renderWeatherData;
window.convertTemperature = weatherModule.convertTemperature;
window.convertPrecipitation = weatherModule.convertPrecipitation;

// Climate module exports
window.showClimateZone = climateModule.showClimateZone;
window.renderClimateZoneUI = climateModule.renderClimateZoneUI;
window.getCurrentClimateZone = climateModule.getCurrentClimateZone;

// Calendar module exports
window.renderCalendar = calendarModule.renderCalendar;
window.updateSelectAllCheckbox = calendarModule.updateSelectAllCheckbox;

// Search module exports
window.searchCalendar = searchModule.searchCalendar;
window.highlightText = searchModule.highlightText;
window.escapeRegExp = searchModule.escapeRegExp;

// Journal module exports
window.renderJournal = journalModule.renderJournal;
window.getJournalEntries = journalModule.getJournalEntries;
window.saveJournalEntries = journalModule.saveJournalEntries;
window.createJournalEntry = journalModule.createJournalEntry;
window.updateJournalEntry = journalModule.updateJournalEntry;
window.deleteJournalEntry = journalModule.deleteJournalEntry;

// Custom entries module exports
window.initCustomEntries = customEntriesModule.initCustomEntries;
window.openCustomPlantModal = customEntriesModule.openPlantModal;
window.openCustomTaskModal = customEntriesModule.openTaskModal;
window.loadCustomEntries = customEntriesModule.loadCustomEntries;

// Social module exports
window.initSocialSharing = socialModule.initSocialSharing;
window.shareContent = socialModule.shareContent;

/**
 * Initialize all modules in the correct order
 */
function initApp() {
    console.log('Initializing Gardening Calendar App...');
    
    // Step 1: Dispatch data module loaded event
    document.dispatchEvent(new CustomEvent('dataModuleLoaded'));
    console.log('Data module initialized');
    
    // Step 2: Initialize UI module
    uiModule.initUI();
    document.dispatchEvent(new CustomEvent('uiModuleLoaded'));
    console.log('UI module initialized');
    
    // Step 3: Initialize storage module
    storageModule.initStorage();
    document.dispatchEvent(new CustomEvent('storageModuleLoaded'));
    console.log('Storage module initialized');
    
    // Step 4: Initialize weather module
    weatherModule.initWeather();
    document.dispatchEvent(new CustomEvent('weatherModuleLoaded'));
    console.log('Weather module initialized');
    
    // Step 5: Initialize climate module (depends on weather)
    climateModule.initClimateZone();
    document.dispatchEvent(new CustomEvent('climateModuleLoaded'));
    console.log('Climate module initialized');
    
    // Step 6: Initialize custom entries module (moved before calendar)
    customEntriesModule.initCustomEntries(window.GardeningApp.activeMonth);
    document.dispatchEvent(new CustomEvent('customEntriesModuleLoaded'));
    console.log('Custom Entries module initialized');
    
    // Step 7: Initialize calendar module (now after custom entries are loaded)
    calendarModule.initCalendar(window.GardeningApp.activeMonth);
    document.dispatchEvent(new CustomEvent('calendarModuleLoaded'));
    console.log('Calendar module initialized');
    
    // Step 8: Initialize search module
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchModule.initSearch({
            searchBox,
            onSearch: (searchTerm) => {
                searchModule.searchCalendar(
                    searchTerm, 
                    window.GardeningApp.activeMonth, 
                    calendarModule.renderCalendar
                );
            }
        });
    }
    document.dispatchEvent(new CustomEvent('searchModuleLoaded'));
    console.log('Search module initialized');
    
    // Step 9: Initialize journal module
    journalModule.initJournal();
    document.dispatchEvent(new CustomEvent('journalModuleLoaded'));
    console.log('Journal module initialized');
    
    // Step 10: Initialize social sharing module - only for footer
    socialModule.initSocialSharing({
        selector: '#footerShareContainer',
        defaultTitle: 'Spring Gardening and Planting Calendar',
        defaultDescription: 'A helpful tool for planning your gardening activities!'
    });
    
    document.dispatchEvent(new CustomEvent('socialModuleLoaded'));
    console.log('Social sharing module initialized');
    
    // Set up navigation and remaining event listeners
    setupNavigation();
    
    // Check for hash in URL to navigate to specific section on load
    if (window.location.hash) {
        const sectionId = window.location.hash.substring(1); // Remove the # symbol
        const navButton = document.querySelector(`.quick-jump-btn[data-section="${sectionId}"]`);
        if (navButton) {
            // Simulate a click on the navigation button
            setTimeout(() => navButton.click(), 100);
        }
    } else {
        // Ensure calendar content has grid display on initial load
        const calendarContent = document.getElementById('calendarContent');
        if (calendarContent) {
            calendarContent.style.display = 'grid';
        }
    }
    
    console.log('Gardening Calendar App initialization complete');
}

/**
 * Set up navigation and global event listeners
 */
function setupNavigation() {
    // Handle location input clear button
    const locationInput = document.getElementById('locationInput');
    const clearLocationBtn = document.getElementById('clearLocationBtn');
    
    if (locationInput && clearLocationBtn) {
        locationInput.addEventListener('input', function() {
            clearLocationBtn.style.opacity = this.value ? '0.7' : '0.2';
        });
        
        clearLocationBtn.addEventListener('click', function() {
            locationInput.value = '';
            locationInput.focus();
            clearLocationBtn.style.opacity = '0.2';
        });
        
        clearLocationBtn.style.opacity = locationInput.value ? '0.7' : '0.2';
    }
    
    // Navigation menu functionality
    const quickJumpMenu = document.getElementById('quickJumpMenu');
    if (quickJumpMenu) {
        quickJumpMenu.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-jump-btn');
            if (!btn) return;
            
            // Set active state
            quickJumpMenu.querySelectorAll('.quick-jump-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get target section
            const sectionId = btn.dataset.section;
            
            // Handle Journal separately - completely different view
            if (sectionId === 'garden-journal') {
                // First, store the current state of calendarContent
                const calendarContent = document.getElementById('calendarContent');
                if (calendarContent) {
                    // Save the current grid layout for later restoration
                    calendarContent.setAttribute('data-original-display', calendarContent.style.display || 'grid');
                }
                
                // Hide ALL main page content
                document.querySelectorAll('.main-layout > *:not(#garden-journal):not(.scroll-to-top)').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Also explicitly hide all category cards
                document.querySelectorAll('.category-card').forEach(card => {
                    card.style.display = 'none';
                });
                
                // Show ONLY journal section
                const journalSection = document.getElementById('garden-journal');
                if (journalSection) {
                    journalSection.style.display = 'block';
                    // Force rendering of journal
                    journalModule.renderJournal();
                }
            } else {
                // Coming back to main view - hide journal
                const journalSection = document.getElementById('garden-journal');
                if (journalSection) {
                    journalSection.style.display = 'none';
                }
                
                // Show all regular sections
                document.querySelectorAll('.main-layout > section:not(#garden-journal)').forEach(section => {
                    if (section.id === 'calendarContent') {
                        section.style.display = 'grid';
                    } else {
                        section.style.display = 'block';
                    }
                });
                
                // Make sure the custom entries toolbar is visible
                const customEntriesToolbar = document.querySelector('.custom-entries-toolbar');
                if (customEntriesToolbar) {
                    customEntriesToolbar.style.display = 'flex';
                }
                
                // Restore all category cards visibility
                document.querySelectorAll('.category-card').forEach(card => {
                    card.style.display = 'flex';  // Cards use flex layout internally
                });
                
                // Ensure calendar content has grid display
                const calendarContent = document.getElementById('calendarContent');
                if (calendarContent) {
                    // Restore the original display type (should be grid)
                    const originalDisplay = calendarContent.getAttribute('data-original-display') || 'grid';
                    calendarContent.style.display = originalDisplay;
                    
                    // Always explicitly set grid template for consistency
                    calendarContent.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
                }
                
                // Re-render the calendar if clicking on calendar section
                if (sectionId === 'monthly-calendar') {
                    const activeMonth = window.GardeningApp.activeMonth || 'april';
                    calendarModule.renderCalendar(activeMonth);
                }
                
                // Scroll to the target section with offset for header
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    uiModule.scrollToElement(targetSection, 200);
                }
            }
        });
    }
    
    // Listen for month button clicks to update activeMonth
    document.querySelectorAll('.month-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.GardeningApp.activeMonth = button.dataset.month;
        });
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Notify that main.js has loaded
console.log('Main module loaded'); 