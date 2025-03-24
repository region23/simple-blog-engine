/**
 * Scroll effects for the site
 * Handles header styling when article titles scroll beneath the header
 */
(function() {
  // Execute when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const articleTitle = document.querySelector('.post-header h1');
    
    // Only proceed if we're on a post page with a title
    if (!articleTitle || !header) return;
    
    // Function to update observer with current header height
    const updateObserver = () => {
      // Create observer options with current header height
      const options = {
        rootMargin: `-${header.offsetHeight}px 0px 0px 0px`,
        threshold: 0 // Single threshold for clean transition
      };
      
      // Create intersection observer
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // When title is intersecting with header (scrolled under it)
          if (!entry.isIntersecting) {
            header.classList.add('title-overlap');
          } else {
            header.classList.remove('title-overlap');
          }
        });
      }, options);
      
      // Start observing the article title
      observer.observe(articleTitle);
      
      return observer;
    };
    
    // Initialize observer
    let observer = updateObserver();
    
    // Update observer on window resize since header height might change
    window.addEventListener('resize', () => {
      if (observer) {
        observer.disconnect();
      }
      observer = updateObserver();
    });
  });
})(); 