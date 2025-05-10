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
    
    // Desktop Navigation menu functionality
    setupDesktopNavigation();
    
    // Mobile Bottom Navigation
    setupMobileNavigation();
    
    // Listen for month button clicks to update activeMonth
    document.querySelectorAll('.month-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.GardeningApp.activeMonth = button.dataset.month;
        });
    });

    // Hide scroll-to-top button when bottom nav is visible (mobile)
    const scrollToTopBtn = document.getElementById('scrollToTop');
    function updateScrollToTopVisibility() {
        if (window.innerWidth <= 600) {
            if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
        } else {
            // Existing logic (show/hide based on scroll)
            if (scrollToTopBtn) scrollToTopBtn.style.display = window.scrollY > 200 ? 'block' : 'none';
        }
    }
    window.addEventListener('resize', updateScrollToTopVisibility);
    window.addEventListener('orientationchange', updateScrollToTopVisibility);
    updateScrollToTopVisibility();
}

/**
 * Set up desktop quick-jump navigation menu
 */
function setupDesktopNavigation() {
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
                document.querySelectorAll('.main-layout > *:not(#garden-journal):not(.scroll-to-top):not(.bottom-nav)').forEach(el => {
                    el.style.display = 'none';
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
                showAllMainSections();
                
                // Re-render the calendar if clicking on calendar section
                if (sectionId === 'monthly-calendar') {
                    const activeMonth = window.GardeningApp.activeMonth || 'april';
                    calendarModule.renderCalendar(activeMonth);
                }
                
                // Scroll to the target section with offset for header
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    uiModule.scrollToElement(targetSection, 80);
                }
            }
        });
    }
}

/**
 * Set up mobile bottom navigation bar
 */
function setupMobileNavigation() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        const navButtons = bottomNav.querySelectorAll('.bottom-nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active from all
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Get target section
                const sectionId = btn.dataset.section;
                const section = document.getElementById(sectionId);
                
                // Handle different sections appropriately
                if (sectionId === 'garden-journal') {
                    // First, store the current state of calendarContent
                    const calendarContent = document.getElementById('calendarContent');
                    if (calendarContent) {
                        calendarContent.setAttribute('data-original-display', calendarContent.style.display || 'grid');
                    }
                    
                    // Hide ALL main page content except journal
                    document.querySelectorAll('.main-layout > *:not(#garden-journal):not(.scroll-to-top):not(.bottom-nav)').forEach(el => {
                        el.style.display = 'none';
                    });
                    
                    // Show ONLY journal section
                    const journalSection = document.getElementById('garden-journal');
                    if (journalSection) {
                        journalSection.style.display = 'block';
                        // Force rendering of journal
                        journalModule.renderJournal();
                    }
                } else if (sectionId === 'monthly-calendar') {
                    // Return to main view and show calendar content
                    showAllMainSections();
                    
                    // Make sure calendar content is visible
                    const calendarContent = document.getElementById('calendarContent');
                    if (calendarContent) {
                        calendarContent.style.display = 'grid';
                    }
                    
                    // Hide journal
                    const journalSection = document.getElementById('garden-journal');
                    if (journalSection) {
                        journalSection.style.display = 'none';
                    }
                    
                    // Render the active month
                    const activeMonth = window.GardeningApp.activeMonth || 'april';
                    calendarModule.renderCalendar(activeMonth);
                } else if (sectionId === 'weather-info' || sectionId === 'search-section') {
                    // Return to main view for these sections
                    showAllMainSections();
                    
                    // Hide journal
                    const journalSection = document.getElementById('garden-journal');
                    if (journalSection) {
                        journalSection.style.display = 'none';
                    }
                }
                
                // Scroll the section into view
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
        
        // Optionally, highlight the nav button for the current section on scroll
        window.addEventListener('scroll', () => {
            // Skip scroll-based activation when in journal mode
            const journalSection = document.getElementById('garden-journal');
            if (journalSection && journalSection.style.display === 'block') {
                return;
            }
            
            let visibleSections = [];
            
            // Check which sections are visible
            navButtons.forEach(btn => {
                const sectionId = btn.dataset.section;
                // Skip journal since it's a special case
                if (sectionId === 'garden-journal') return;
                
                const section = document.getElementById(sectionId);
                if (section) {
                    const rect = section.getBoundingClientRect();
                    // Consider a section visible if a significant portion is in view
                    if (rect.top < window.innerHeight/2 && rect.bottom > 100) {
                        visibleSections.push({btn, distance: Math.abs(rect.top)});
                    }
                }
            });
            
            // Sort by closest to top
            visibleSections.sort((a, b) => a.distance - b.distance);
            
            // Reset all buttons
            navButtons.forEach(b => b.classList.remove('active'));
            
            // Activate the closest visible section's button
            if (visibleSections.length > 0) {
                visibleSections[0].btn.classList.add('active');
            }
        });
    }
}

/**
 * Helper function to show all main sections
 */
function showAllMainSections() {
    // Show all main sections except journal
    document.querySelectorAll('.main-layout > section:not(#garden-journal)').forEach(el => {
        if (el.id === 'calendarContent') {
            // Use stored display value if available
            const originalDisplay = el.getAttribute('data-original-display');
            el.style.display = originalDisplay || 'grid';
        } else {
            el.style.display = 'block';
        }
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Notify that main.js has loaded
console.log('Main module loaded');

// --- MOBILE COLLAPSIBLE QUICK NAVIGATION (mobile-usability branch) ---
// Removed: All quick navigation hamburger and menu logic (no longer needed)
// --- END MOBILE COLLAPSIBLE QUICK NAVIGATION --- 