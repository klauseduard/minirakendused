/**
 * UI Utilities Module for Gardening Calendar
 * Handles common UI operations like modals, dialogs, and scroll effects
 */

// Focus trap utility for accessibility
const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Shows a custom confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Function} onConfirm - Callback function when user confirms
 * @param {Function} onCancel - Callback function when user cancels
 * @param {string} confirmText - Text for confirm button (optional)
 * @param {string} cancelText - Text for cancel button (optional)
 */
export function showConfirmDialog(title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel') {
    const confirmModal = document.getElementById('customConfirmModal');
    const confirmTitle = document.getElementById('confirmModalTitle');
    const confirmMessage = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalOkBtn');
    const cancelBtn = document.getElementById('confirmModalCancelBtn');
    
    // Set content
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    
    // Set up event handlers
    const handleConfirm = () => {
        confirmModal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKeyDown);
        if (typeof onConfirm === 'function') onConfirm();
    };
    
    const handleCancel = () => {
        confirmModal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKeyDown);
        if (typeof onCancel === 'function') onCancel();
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter') {
            handleConfirm();
        }
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeyDown);
    
    // Show the modal
    confirmModal.style.display = 'flex';
    
    // Focus the confirm button
    setTimeout(() => confirmBtn.focus(), 50);
    
    // Close when clicking outside
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            handleCancel();
        }
    }, { once: true });
}

/**
 * Creates and shows a modal dialog
 * @param {string} title - Modal title
 * @param {string|HTMLElement} content - Modal content (HTML string or DOM element)
 * @param {Object} options - Additional options
 * @returns {Object} Modal control object with close method
 */
export function showModal(title, content, options = {}) {
    const defaults = {
        width: '90%',
        maxWidth: '600px',
        closeOnEscape: true,
        closeOnOutsideClick: true,
        onClose: null,
        showCloseButton: true,
        id: 'dynamic-modal-' + Date.now()
    };
    
    const settings = { ...defaults, ...options };
    
    // Remove existing modal with same ID if it exists
    const existingModal = document.getElementById(settings.id);
    if (existingModal) existingModal.remove();
    
    // Create modal elements
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'weather-modal-overlay';
    modalOverlay.id = settings.id;
    modalOverlay.style.display = 'flex';
    modalOverlay.setAttribute('tabindex', '-1');
    
    const modalElement = document.createElement('div');
    modalElement.className = 'weather-modal';
    modalElement.style.width = settings.width;
    modalElement.style.maxWidth = settings.maxWidth;
    modalElement.setAttribute('role', 'dialog');
    modalElement.setAttribute('aria-modal', 'true');
    modalElement.setAttribute('aria-labelledby', `${settings.id}-title`);
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'weather-modal-title';
    modalTitle.id = `${settings.id}-title`;
    modalTitle.textContent = title;
    
    modalElement.appendChild(modalTitle);
    
    if (settings.showCloseButton) {
        const closeButton = document.createElement('button');
        closeButton.className = 'weather-modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close modal');
        modalElement.appendChild(closeButton);
        
        closeButton.addEventListener('click', closeModal);
    }
    
    const contentContainer = document.createElement('div');
    contentContainer.style.margin = '20px 0';
    
    if (typeof content === 'string') {
        contentContainer.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        contentContainer.appendChild(content);
    }
    
    modalElement.appendChild(contentContainer);
    modalOverlay.appendChild(modalElement);
    document.body.appendChild(modalOverlay);
    
    // Trap focus inside modal
    const focusableElements = modalElement.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    // Remember previously focused element
    const previouslyFocused = document.activeElement;
    
    // Set focus to first focusable element
    setTimeout(() => {
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            modalOverlay.focus();
        }
    }, 50);
    
    modalOverlay.addEventListener('keydown', function(e) {
        // Close on escape
        if (e.key === 'Escape' && settings.closeOnEscape) {
            closeModal();
            return;
        }
        
        // Trap focus
        if (e.key === 'Tab') {
            // If no focusable elements, just trap the tab
            if (focusableElements.length === 0) {
                e.preventDefault();
                return;
            }
            
            // Shift + Tab
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable || document.activeElement === modalOverlay) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } 
            // Tab
            else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });
    
    // Close when clicking outside
    if (settings.closeOnOutsideClick) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
    
    function closeModal() {
        modalOverlay.remove();
        
        // Restore focus
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
        
        // Call onClose callback
        if (typeof settings.onClose === 'function') {
            settings.onClose();
        }
    }
    
    // Return control object
    return {
        close: closeModal,
        element: modalElement,
        overlay: modalOverlay
    };
}

/**
 * Shows a notification message that automatically dismisses
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
 * @param {number} duration - Duration in milliseconds
 */
export function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notification if present
    const existingNotification = document.querySelector('.ui-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `ui-notification ui-notification-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '2000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease-in-out';
    
    // Style based on type
    const colors = {
        success: { bg: '#dff5e0', text: '#2e7d32' },
        error: { bg: '#ffdede', text: '#c62828' },
        info: { bg: '#e3f2fd', text: '#0277bd' },
        warning: { bg: '#fff8e1', text: '#ef6c00' }
    };
    
    const style = colors[type] || colors.info;
    notification.style.backgroundColor = style.bg;
    notification.style.color = style.text;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    return notification;
}

/**
 * Initialize scroll to top button functionality
 */
export function initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    
    if (!scrollToTopBtn) return;
    
    // Show button when page is scrolled down
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.style.display = 'block';
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
            setTimeout(() => {
                if (!scrollToTopBtn.classList.contains('visible')) {
                    scrollToTopBtn.style.display = 'none';
                }
            }, 300);
        }
    });
    
    // Scroll to top when button is clicked
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Add header animation on scroll
 */
export function initHeaderScroll() {
    const header = document.querySelector('header');
    
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

/**
 * Smooth scroll to an element
 * @param {string|Element} target - Target element or selector
 * @param {number} offset - Offset from the target in pixels
 */
export function scrollToElement(target, offset = 0) {
    let element;
    
    if (typeof target === 'string') {
        element = document.querySelector(target);
    } else if (target instanceof Element) {
        element = target;
    }
    
    if (element) {
        const rect = element.getBoundingClientRect();
        const targetPosition = rect.top + window.pageYOffset - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Initialize prompt generator modal
 */
export function initPromptGenerator() {
    const promptGeneratorModal = document.getElementById('promptGeneratorModal');
    const closePromptGeneratorBtn = document.getElementById('closePromptGeneratorBtn');
    const aiAdviceBtn = document.getElementById('aiAdviceBtn');
    const customNotes = document.getElementById('customNotes');
    const includeCalendar = document.getElementById('includeCalendar');
    const includeRelevantPlantsOnly = document.getElementById('includeRelevantPlantsOnly');
    const generatedPrompt = document.getElementById('generatedPrompt');
    const generatePromptBtn = document.getElementById('generatePromptBtn');
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    
    if (!promptGeneratorModal || !aiAdviceBtn) return;
    
    // Store the previously focused element
    let previousActiveElement = null;
    
    // Open the prompt generator modal
    function openPromptGenerator() {
        // Track the previously focused element
        previousActiveElement = document.activeElement;
        
        promptGeneratorModal.style.display = 'flex';
        if (customNotes) customNotes.focus();
    }
    
    // Close the prompt generator modal
    function closePromptGenerator() {
        promptGeneratorModal.style.display = 'none';
        
        // Reset the generated prompt
        if (generatedPrompt) {
            generatedPrompt.textContent = 'Click "Generate Prompt" to create a customized gardening prompt based on your location, weather, and calendar data.';
        }
        
        // Hide AI assistants section
        const promptDestinationSection = document.getElementById('promptDestinationSection');
        if (promptDestinationSection) {
            promptDestinationSection.style.display = 'none';
        }
        
        // Clear custom notes
        if (customNotes) customNotes.value = '';
        
        // Reset checkboxes to default state
        if (includeCalendar) includeCalendar.checked = true;
        if (includeRelevantPlantsOnly) includeRelevantPlantsOnly.checked = true;
        
        // Restore focus
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
            previousActiveElement.focus();
        }
    }
    
    // Add event listener for the AI advice button
    aiAdviceBtn.addEventListener('click', openPromptGenerator);
    
    // Add event listener for the close button
    if (closePromptGeneratorBtn) {
        closePromptGeneratorBtn.addEventListener('click', closePromptGenerator);
    }
    
    // Close modal on escape or clicking outside
    promptGeneratorModal.addEventListener('click', (e) => {
        if (e.target === promptGeneratorModal) {
            closePromptGenerator();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && promptGeneratorModal.style.display === 'flex') {
            closePromptGenerator();
        }
    });
    
    // Generate prompt function
    function generatePrompt() {
        // Track prompt generation in Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', 'generate_ai_prompt', {
                'include_calendar': includeCalendar.checked,
                'include_relevant_plants_only': includeRelevantPlantsOnly.checked
            });
        }
        
        // Get current location info
        let locationInfo = '';
        const weatherLocationInfo = document.querySelector('.weather-location-info');
        if (weatherLocationInfo) {
            locationInfo = weatherLocationInfo.textContent.trim();
        }

        // Get climate zone
        let climateZone = '';
        const climateZoneCode = document.getElementById('climateZoneCode');
        if (climateZoneCode) {
            climateZone = climateZoneCode.textContent.trim();
        }

        // Get current weather
        let currentWeather = '';
        const weatherCurrent = document.querySelector('.weather-current');
        if (weatherCurrent) {
            currentWeather = weatherCurrent.textContent.trim();
        }

        // Get forecast summary (next 7 days)
        let forecastSummary = '';
        const forecastTable = document.querySelector('.weather-forecast-table tbody');
        if (forecastTable) {
            const next7Days = Array.from(forecastTable.querySelectorAll('tr')).slice(0, 7);
            forecastSummary = next7Days.map(row => {
                const cells = row.querySelectorAll('td');
                const date = cells[0].textContent;
                
                // Extract weather condition and clean it up
                let weatherText = cells[6].textContent.trim();
                // Split by newline and get only the weather condition text (usually the second line)
                let weatherParts = weatherText.split('\n').map(part => part.trim()).filter(part => part);
                // Find the weather condition (not a temperature and not containing "selected")
                let weatherCondition = weatherParts.find(part => 
                    !part.includes('°') && !part.toLowerCase().includes('selected')
                ) || "Not available";
                
                // Clean temperature information
                const nightMinTemp = cells[1].textContent.trim().replace(/selected/gi, '');
                const nightMaxTemp = cells[2].textContent.trim().replace(/selected/gi, '');
                const dayMinTemp = cells[3].textContent.trim().replace(/selected/gi, '');
                const dayMaxTemp = cells[4].textContent.trim().replace(/selected/gi, '');
                const precipitation = cells[5].textContent.trim().replace(/selected/gi, '');
                
                // Build detailed forecast string
                let dayForecast = `- ${date}:\n  Weather: ${weatherCondition}`;
                
                // Only add temps if they're not just "-"
                if (nightMinTemp !== '-' && nightMaxTemp !== '-') {
                    dayForecast += `\n  Night: ${nightMinTemp} to ${nightMaxTemp}`;
                }
                
                if (dayMinTemp !== '-' && dayMaxTemp !== '-') {
                    dayForecast += `\n  Day: ${dayMinTemp} to ${dayMaxTemp}`;
                }
                
                dayForecast += `\n  Precipitation: ${precipitation}`;
                
                return dayForecast;
            }).join('\n\n');
        }
        
        // Helper function to check if a plant is suitable for current weather
        function isPlantSuitableForWeather(plant, weatherData) {
            // Get temperature range for next 7 days
            const next7Days = weatherData.daily.temperature_2m_max.slice(0, 7);
            const maxTemp = Math.max(...next7Days);
            const minTemp = Math.min(...weatherData.daily.temperature_2m_min.slice(0, 7));
            const avgPrecip = weatherData.daily.precipitation_sum.slice(0, 7).reduce((a, b) => a + b, 0) / 7;

            // Basic suitability rules (these could be made more sophisticated)
            const coldSensitive = ['tomato', 'pepper', 'eggplant', 'cucumber', 'zucchini', 'pumpkin', 'melon', 'basil'];
            const heatSensitive = ['lettuce', 'spinach', 'arugula', 'peas'];
            const moistureSensitive = ['tomato', 'rosemary', 'thyme', 'sage'];

            // Ensure we have a string to work with
            const plantText = typeof plant === 'string' ? plant : '';
            const plantLower = plantText.toLowerCase();

            // Skip checks if we don't have valid plant text
            if (!plantLower) return true;

            // Check temperature suitability
            if (coldSensitive.some(p => plantLower.includes(p)) && minTemp < 10) return false;
            if (heatSensitive.some(p => plantLower.includes(p)) && maxTemp > 30) return false;
            
            // Check moisture suitability
            if (moistureSensitive.some(p => plantLower.includes(p)) && avgPrecip > 10) return false;

            return true;
        }

        // Get current month's planting calendar with only selected items
        let plantingCalendar = '';
        
        // Only include plant information if the includeCalendar checkbox is checked
        if (includeCalendar.checked) {
            // Get active month
            const activeMonth = document.querySelector('.month-btn.active')?.dataset.month || 'april';
            // Access the global functions and data
            const getSelectedItems = window.getSelectedItems || (() => ({}));
            const calendarData = window.calendarData || {};
            const currentLang = window.currentLang || 'en';
            const lastWeatherData = window.lastWeatherData;
            
            // Retrieve the user's selected items
            const selections = getSelectedItems();
            // Get only the selections for the current active month
            const currentSelections = selections[activeMonth];
            
            if (currentSelections && Object.keys(currentSelections).length > 0) {
                const plantItems = [];
                
                // For debugging - log what's in currentSelections
                console.log('Selected items for prompt:', JSON.stringify(currentSelections));
                
                // Process each category of selections
                Object.entries(currentSelections).forEach(([category, selectedItems]) => {
                    if (selectedItems && selectedItems.length > 0) {
                        // Deep clone the items to avoid modification issues
                        let itemsToProcess = JSON.parse(JSON.stringify(selectedItems));
                        
                        // Make sure we're only working with the actual selected items
                        // by matching their IDs with what's in calendarData
                        const availableItems = calendarData[activeMonth]?.[category] || [];
                        
                        // Filter to ensure we only have valid selected items
                        itemsToProcess = itemsToProcess.filter(selectedItem => {
                            // Check if this item exists in calendarData for this month and category
                            return availableItems.some(item => {
                                // Deep comparison by checking if the items are equivalent
                                if (typeof selectedItem === 'object' && typeof item === 'object') {
                                    return selectedItem.en === item.en;
                                }
                                return false;
                            });
                        });
                        
                        // Filter based on weather suitability if that option is checked
                        if (includeRelevantPlantsOnly.checked && lastWeatherData) {
                            itemsToProcess = itemsToProcess.filter(item => {
                                // Extract a text representation of the item for weather suitability check
                                const plantName = typeof item === 'object' ? 
                                    (item[currentLang] || item.en || JSON.stringify(item)) : String(item);
                                return isPlantSuitableForWeather(plantName, lastWeatherData);
                            });
                        }
                        
                        if (itemsToProcess.length > 0) {
                            // Format each item to display readable text
                            const formattedItems = itemsToProcess.map(item => {
                                if (typeof item === 'object') {
                                    // Get the name in the current language or fall back to English
                                    return (item[currentLang] || item.en || JSON.stringify(item))
                                        .replace(/selected/gi, '') // Remove any "selected" text
                                        .trim();
                                }
                                return String(item).replace(/selected/gi, '').trim();
                            });
                            
                            // Remove any empty or duplicate items
                            const uniqueItems = [...new Set(formattedItems.filter(Boolean))];
                            
                            // Add the category with its items to the plantItems array
                            if (uniqueItems.length > 0) {
                                // Get category name from global data if available
                                const categoryNames = window.categoryNames || {};
                                plantItems.push(`${categoryNames[category] || category}:\n${uniqueItems.join('\n')}`);
                            }
                        }
                    }
                });
                
                // Create the final calendar section if we have any items
                if (plantItems.length > 0) {
                    plantingCalendar = 'Selected Plants and Tasks:\n\n' + plantItems.join('\n\n');
                } else {
                    // If filtering for weather resulted in no suitable plants
                    if (includeRelevantPlantsOnly.checked) {
                        plantingCalendar = 'Note: The user has selected plants in the calendar, but none are suitable for the current weather forecast based on filtering criteria.\n';
                    } else {
                        plantingCalendar = 'No plants or tasks have been selected in the calendar yet.\n';
                    }
                }
            } else {
                // If no selections found for active month
                plantingCalendar = 'No plants or tasks have been selected in the calendar yet.\n';
            }
        } else {
            // User has unchecked "Include selected plants and tasks"
            plantingCalendar = '';
        }

        // Get user's custom notes
        const notes = customNotes.value.trim();

        // Get current date
        const currentDate = new Date();
        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = currentDate.toLocaleDateString(undefined, dateOptions);
        const currentSeason = (() => {
            const month = currentDate.getMonth();
            if (month >= 2 && month <= 4) return "Spring";
            if (month >= 5 && month <= 7) return "Summer";
            if (month >= 8 && month <= 10) return "Fall";
            return "Winter";
        })();

        // Construct the prompt
        const prompt = `I need advice for my garden based on the following information:

Current Date: ${formattedDate} (${currentSeason})

Location and Climate:
${locationInfo.replace(/Location:/g, "Location:").replace(/Latitude:/g, "\nLatitude:").replace(/Longitude:/g, "\nLongitude:")}

Köppen Climate Zone: ${climateZone}
${includeRelevantPlantsOnly.checked && includeCalendar.checked ? '(Recommendations filtered for current weather conditions)' : ''}

Current Weather and Forecast:
${currentWeather}

7-Day Forecast:
${forecastSummary}
${plantingCalendar ? '\n' + plantingCalendar + '\n' : ''}
${notes ? `Additional Notes:\n${notes}\n\n` : ''}Based on this information, please provide:
1. Immediate tasks I should focus on this week
2. What I should plant now or prepare for planting
3. Potential weather-related precautions
4. Long-term planning suggestions
${includeCalendar.checked ? '5. Any specific care instructions for my selected plants' : '5. General gardening tips for this season and climate'}

IMPORTANT: This is a current gardening request for the date specified above. Please use the weather forecast and season information provided and do not base your recommendations on outdated or previous years' gardening calendars. The forecast and plants listed are current and specific to my location and climate.`;

        if (generatedPrompt) {
            generatedPrompt.textContent = prompt;
        }
        
        // Show AI assistants section
        const promptDestinationSection = document.getElementById('promptDestinationSection');
        if (promptDestinationSection) {
            promptDestinationSection.style.display = 'block';
        }
    }

    // Copy prompt to clipboard
    function copyPrompt() {
        if (!generatedPrompt) return;
        
        navigator.clipboard.writeText(generatedPrompt.textContent)
            .then(() => {
                if (copyPromptBtn) {
                    const originalText = copyPromptBtn.textContent;
                    copyPromptBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyPromptBtn.textContent = originalText;
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('Failed to copy text:', err);
                alert('Failed to copy to clipboard. Please select and copy the text manually.');
            });
    }
    
    // Send prompt to AI assistant
    function sendToAiAssistant(assistant) {
        if (!generatedPrompt) return;
        
        // Track which AI assistant was selected in Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', 'send_to_ai_assistant', {
                'assistant': assistant
            });
        }
        
        const prompt = encodeURIComponent(generatedPrompt.textContent);
        let url = '';
        
        switch(assistant) {
            case 'chatgpt':
                url = `https://chat.openai.com?prompt=${prompt}`;
                break;
            case 'claude':
                url = `https://claude.ai/new?q=${prompt}`;
                break;
            case 'gemini':
                url = `https://gemini.google.com/app`;
                break;
            case 'copilot':
                url = `https://copilot.microsoft.com/?q=${prompt}`;
                break;
            case 'mistral':
                url = `https://chat.mistral.ai/chat`;
                break;
            case 'deepseek':
                url = `https://chat.deepseek.com`;
                break;
            default:
                alert('Selected AI assistant is not supported.');
                return;
        }
        
        // Open in a new tab
        window.open(url, '_blank');
    }
    
    // Add event listeners for prompt generation and copying
    if (generatePromptBtn) {
        generatePromptBtn.addEventListener('click', generatePrompt);
    }
    
    if (copyPromptBtn) {
        copyPromptBtn.addEventListener('click', copyPrompt);
    }
    
    // AI assistant buttons
    const aiAssistantsGrid = document.querySelector('.ai-assistants-grid');
    if (aiAssistantsGrid) {
        aiAssistantsGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.ai-assistant-btn');
            if (btn) {
                const assistant = btn.dataset.assistant;
                if (assistant) {
                    sendToAiAssistant(assistant);
                }
            }
        });
    }
}

/**
 * Initialize UI module
 */
export function initUI() {
    initScrollToTop();
    initHeaderScroll();
    initPromptGenerator();
    
    // Initialize any other UI elements or behaviors
    
    console.log('UI module initialized');
} 