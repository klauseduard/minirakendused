// Gardening Calendar Application
// Main JavaScript Entry Point

// Import modules
import { initTranslations, translateUI, getTranslation } from './translations.js';
import { initCalendar, renderCalendar } from './calendar.js';
import { initWeather } from './weather.js';
import { initLocation } from './location.js';
import { initJournal } from './journal.js';
import { initUI } from './ui.js';

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initUI();
    initTranslations();
    initCalendar();
    initWeather();
    initLocation();
    initJournal();
    
    // Initialize Analytics (already handled by inline script)
    
    // Set up scroll-to-top button
    const scrollToTopBtn = document.getElementById('scrollToTop');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}); 