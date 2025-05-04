// Gardening Calendar - UI Module

// Initialize UI components
function initUI() {
    // Set up quick jump navigation
    initQuickJumpNav();
    
    // Set up prompt generator modal
    initPromptGeneratorModal();
}

// Initialize quick jump navigation
function initQuickJumpNav() {
    const quickJumpButtons = document.querySelectorAll('.quick-jump-btn');
    
    quickJumpButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            
            if (section) {
                // Scroll to section with smooth behavior
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Track in analytics
                if (typeof gtag === 'function') {
                    gtag('event', 'quick_jump', {
                        'section': sectionId
                    });
                }
            }
        });
    });
}

// Initialize prompt generator modal
function initPromptGeneratorModal() {
    const aiAdviceBtn = document.getElementById('aiAdviceBtn');
    const promptGeneratorModal = document.getElementById('promptGeneratorModal');
    const closePromptGeneratorBtn = document.getElementById('closePromptGeneratorBtn');
    
    if (aiAdviceBtn && promptGeneratorModal && closePromptGeneratorBtn) {
        // Open modal
        aiAdviceBtn.addEventListener('click', function() {
            promptGeneratorModal.style.display = 'flex';
            
            // Track in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'open_prompt_generator');
            }
        });
        
        // Close modal
        closePromptGeneratorBtn.addEventListener('click', function() {
            promptGeneratorModal.style.display = 'none';
        });
        
        // Close when clicking outside the modal
        promptGeneratorModal.addEventListener('click', function(e) {
            if (e.target === promptGeneratorModal) {
                promptGeneratorModal.style.display = 'none';
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && promptGeneratorModal.style.display === 'flex') {
                promptGeneratorModal.style.display = 'none';
            }
        });
        
        // Set up prompt generation and copy buttons
        setupPromptGeneration();
    }
}

// Set up prompt generation and copy functionality
function setupPromptGeneration() {
    const generatePromptBtn = document.getElementById('generatePromptBtn');
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    const promptTextarea = document.getElementById('promptTextarea');
    const customNotes = document.getElementById('customNotes');
    const includeCalendar = document.getElementById('includeCalendar');
    
    if (generatePromptBtn && promptTextarea) {
        // Generate prompt button
        generatePromptBtn.addEventListener('click', function() {
            // Generate the prompt based on selections
            const prompt = generateGardeningPrompt(
                customNotes?.value || '',
                includeCalendar?.checked || false
            );
            
            // Show the generated prompt
            promptTextarea.value = prompt;
            
            // Track in analytics
            if (typeof gtag === 'function') {
                gtag('event', 'generate_prompt', {
                    'include_calendar': includeCalendar?.checked || false,
                    'has_custom_notes': (customNotes?.value?.length > 0) || false
                });
            }
        });
        
        // Copy prompt button
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', function() {
                if (promptTextarea.value) {
                    promptTextarea.select();
                    document.execCommand('copy');
                    
                    // Show success feedback
                    const originalText = this.textContent;
                    this.textContent = 'Copied!';
                    setTimeout(() => {
                        this.textContent = originalText;
                    }, 2000);
                    
                    // Track in analytics
                    if (typeof gtag === 'function') {
                        gtag('event', 'copy_prompt');
                    }
                }
            });
        }
    }
}

// Generate gardening prompt based on user inputs
function generateGardeningPrompt(customNotes, includeCalendar) {
    let prompt = "I need advice for my garden. ";
    
    // Add location and climate info if available
    const locationInfo = document.querySelector('.location-info');
    if (locationInfo) {
        const locationName = locationInfo.querySelector('.location-name')?.textContent;
        if (locationName && locationName !== 'Your location') {
            prompt += `I'm gardening in ${locationName}. `;
        }
    }
    
    // Add climate zone if available
    const climateZone = document.getElementById('climateZoneCode')?.textContent;
    if (climateZone && climateZone !== 'Unknown') {
        prompt += `My climate zone is ${climateZone} (Köppen classification). `;
    }
    
    // Add weather information if available
    const weatherInfo = document.querySelector('.weather-display');
    if (weatherInfo && !weatherInfo.querySelector('.weather-placeholder')) {
        prompt += "Here's my current weather: ";
        
        const currentTemp = weatherInfo.querySelector('.current-temp')?.textContent;
        if (currentTemp) {
            prompt += `Temperature: ${currentTemp}. `;
        }
        
        const weatherDesc = weatherInfo.querySelector('.weather-desc')?.textContent;
        if (weatherDesc) {
            prompt += `Conditions: ${weatherDesc}. `;
        }
    }
    
    // Add selected plants and tasks if requested
    if (includeCalendar) {
        const selectedTasks = JSON.parse(localStorage.getItem('gardening_selected_tasks') || '[]');
        
        if (selectedTasks.length > 0) {
            prompt += "\n\nI have the following plants and tasks on my gardening calendar:\n";
            
            const taskDetails = [];
            document.querySelectorAll('.task-checkbox input[type="checkbox"]:checked').forEach(checkbox => {
                const taskText = checkbox.parentElement.querySelector('.task-text')?.textContent;
                const month = checkbox.getAttribute('data-month');
                const category = checkbox.getAttribute('data-category');
                
                if (taskText && month && category) {
                    const monthDisplay = month.replace('_', ' ');
                    taskDetails.push(`- ${taskText} (${monthDisplay}, ${category})`);
                }
            });
            
            prompt += taskDetails.join('\n');
        }
    }
    
    // Add custom notes
    if (customNotes.trim()) {
        prompt += `\n\nAdditional information about my garden:\n${customNotes.trim()}`;
    }
    
    // Add final question
    prompt += "\n\nCan you provide advice for my garden, including what I should focus on now, potential problems to watch for, and any specific care tips for the plants I mentioned?";
    
    return prompt;
}

export { initUI }; 