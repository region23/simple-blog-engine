/**
 * Theme toggle functionality
 * Handles dark/light mode toggling with localStorage persistence
 */
(function() {
  // DOM elements - lazy initialize them when needed
  let themeToggle, sunIcon, moonIcon;
  
  /**
   * Set theme to either dark or light mode
   * @param {boolean} isDark - Whether to enable dark mode
   */
  function setTheme(isDark) {
    // Get icons if not already initialized
    if (!sunIcon || !moonIcon) {
      sunIcon = document.querySelector('.sun-icon');
      moonIcon = document.querySelector('.moon-icon');
    }
    
    // Apply theme
    if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
      
      // Update icons visibility
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
      
      // Update icons visibility
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }
  
  /**
   * Initialize theme based on user preferences
   * Checks localStorage first, then system preference
   */
  function initializeTheme() {
    // Check localStorage preference
    const storedPreference = localStorage.getItem('darkMode');
    
    // Check system preference if no stored preference
    const prefersDark = window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply theme based on preferences
    if (storedPreference === 'true' || (prefersDark && storedPreference === null)) {
      setTheme(true);
    } else {
      setTheme(false);
    }
  }
  
  /**
   * Set up event listeners for theme toggle
   */
  function setupEventListeners() {
    // Initialize theme toggle button
    themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        setTheme(!isDarkMode);
      });
    }
    
    // Listen for system preference changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Use newer addEventListener if available, otherwise use deprecated addListener
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', (event) => {
        // Only change if user hasn't explicitly set a preference
        if (localStorage.getItem('darkMode') === null) {
          setTheme(event.matches);
        }
      });
    } else if (darkModeMediaQuery.addListener) {
      // Fallback for older browsers
      darkModeMediaQuery.addListener((event) => {
        if (localStorage.getItem('darkMode') === null) {
          setTheme(event.matches);
        }
      });
    }
  }
  
  /**
   * Initialize theme functionality on DOM content loaded
   */
  document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
  });
})(); 