/**
 * Markdown Processor Module
 * Handles markdown parsing, rendering, and frontmatter extraction
 */

const { marked } = require('marked');
const frontmatter = require('gray-matter');
const { markedSmartypants } = require('marked-smartypants');
const { gfmHeadingId } = require('marked-gfm-heading-id');

// Default configuration
const DEFAULT_CONFIG = {
  readingTime: {
    wordsPerMinute: 200,
    minMinutes: 1
  },
  dateFormat: {
    locale: 'ru-RU',
    options: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  },
  renderer: {
    // Can be extended with custom renderers
  },
  cacheRendering: true,
  markedOptions: {
    gfm: true,
    breaks: true,
    smartLists: true
  }
};

// Module state
let config = { ...DEFAULT_CONFIG };

// Cache for markdown rendering results
const renderCache = new Map();
const CACHE_MAX_SIZE = 50;

/**
 * Updates the module configuration
 * @param {Object} newConfig - New configuration to merge with defaults
 */
function updateConfig(newConfig = {}) {
  config = {
    ...DEFAULT_CONFIG,
    ...newConfig,
    readingTime: { ...DEFAULT_CONFIG.readingTime, ...(newConfig.readingTime || {}) },
    dateFormat: { ...DEFAULT_CONFIG.dateFormat, ...(newConfig.dateFormat || {}) },
    renderer: { ...DEFAULT_CONFIG.renderer, ...(newConfig.renderer || {}) },
    markedOptions: { ...DEFAULT_CONFIG.markedOptions, ...(newConfig.markedOptions || {}) }
  };
  
  // Re-configure marked with new settings
  configureMarked();
  
  // Clear cache if disabled
  if (!config.cacheRendering) {
    clearCache();
  }
}

/**
 * Clear the rendering cache
 */
function clearCache() {
  renderCache.clear();
}

/**
 * Add to cache with LRU policy
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 */
function addToCache(key, value) {
  if (!config.cacheRendering) return;
  
  // Implement simple LRU by removing oldest entries when max size is reached
  if (renderCache.size >= CACHE_MAX_SIZE) {
    const firstKey = renderCache.keys().next().value;
    renderCache.delete(firstKey);
  }
  
  renderCache.set(key, value);
}

/**
 * Creates the custom renderer object
 * @returns {Object} - Marked renderer object
 */
function createRenderer() {
  return {
    // Code blocks with syntax highlighting
    code(code, language) {
      return `<pre><code class="language-${language || 'text'}">${code}</code></pre>`;
    },
    
    // Links with proper handling
    link(href, title, text) {
      if (!href) href = '';
      const titleAttr = title ? ` title="${title}"` : '';
      // External links get target="_blank"
      const targetAttr = href.startsWith && href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
    },
    
    // Image handling
    image(href, title, text) {
      if (!href) href = '';
      const titleAttr = title ? ` title="${title}"` : '';
      return `<figure><img src="${href}" alt="${text || ''}"${titleAttr}><figcaption>${text || ''}</figcaption></figure>`;
    },
    
    // Apply any custom renderers from config
    ...config.renderer
  };
}

/**
 * Configure Marked renderer with standard options
 */
function configureMarked() {
  // Set marked options
  marked.use({
    renderer: createRenderer(),
    ...config.markedOptions
  });

  // Add extensions
  marked.use(markedSmartypants());
  marked.use(gfmHeadingId());
}

/**
 * Process Markdown content to HTML
 * @param {string} markdown - Markdown content to render
 * @returns {string} - HTML content
 */
function renderMarkdown(markdown) {
  if (!markdown) return '';
  
  // Check cache first
  if (config.cacheRendering && renderCache.has(markdown)) {
    return renderCache.get(markdown);
  }
  
  try {
    const html = marked.parse(markdown);
    
    // Cache the result
    if (config.cacheRendering) {
      addToCache(markdown, html);
    }
    
    return html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return `<p>Error rendering content.</p>`;
  }
}

/**
 * Extract frontmatter and content from markdown file
 * @param {string} content - Raw markdown content
 * @returns {Object} - Object with frontmatter data and content
 */
function extractFrontmatter(content) {
  try {
    const { content: markdownContent, data } = frontmatter(content);
    return { content: markdownContent, data };
  } catch (error) {
    console.error('Error extracting frontmatter:', error);
    return { content, data: {} };
  }
}

/**
 * Calculate estimated reading time
 * @param {string} text - Text to calculate reading time for
 * @returns {number} - Estimated reading time in minutes
 */
function calculateReadingTime(text) {
  if (!text) return config.readingTime.minMinutes;
  
  // Get the global config to access content settings
  const globalConfig = require('./configManager').getConfig();
  
  // Use wordsPerMinute from content config if available, otherwise use default
  const wordsPerMinute = globalConfig.content && globalConfig.content.wordsPerMinute 
    ? globalConfig.content.wordsPerMinute 
    : config.readingTime.wordsPerMinute;
  
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  
  return Math.max(config.readingTime.minMinutes, minutes);
}

/**
 * Format date for display
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(
    config.dateFormat.locale, 
    config.dateFormat.options
  );
}

/**
 * Extract headings from the markdown content for generating TOC
 * @param {string} markdown - Markdown content
 * @returns {Array} - Array of heading objects with text and id
 */
function extractHeadings(markdown) {
  if (!markdown) return [];
  
  // Parse the markdown to HTML
  const html = renderMarkdown(markdown);
  
  // Extract headings with regex
  const headingRegex = /<h([1-6])\s+id="([^"]+)"[^>]*>(.*?)<\/h\1>/g;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, '') // Remove any HTML tags inside heading
    });
  }
  
  return headings;
}

/**
 * Generate a table of contents from markdown headings
 * @param {string} markdown - Markdown content
 * @param {Object} options - Options for TOC generation
 * @returns {string} - HTML for table of contents
 */
function generateTableOfContents(markdown, options = {}) {
  const {
    minLevel = 2,
    maxLevel = 4,
    className = 'table-of-contents'
  } = options;
  
  const headings = extractHeadings(markdown).filter(
    h => h.level >= minLevel && h.level <= maxLevel
  );
  
  if (headings.length === 0) return '';
  
  let toc = `<nav class="${className}"><h3>Содержание</h3><ul>`;
  let currentLevel = minLevel;
  let levelStack = [];
  
  headings.forEach(heading => {
    // Close lists for higher levels
    while (currentLevel > heading.level) {
      toc += '</ul></li>';
      currentLevel = levelStack.pop();
    }
    
    // Open new lists for lower levels
    while (currentLevel < heading.level) {
      levelStack.push(currentLevel);
      currentLevel = heading.level;
      toc = toc.slice(0, -5) + '<ul>'; // Replace last </li> with <ul>
    }
    
    // Add heading
    toc += `<li><a href="#${heading.id}">${heading.text}</a></li>`;
  });
  
  // Close any remaining open lists
  while (levelStack.length > 0) {
    toc += '</ul></li>';
    currentLevel = levelStack.pop();
  }
  
  toc += '</ul></nav>';
  return toc;
}

// Initialize Marked configuration
configureMarked();

module.exports = {
  renderMarkdown,
  extractFrontmatter,
  calculateReadingTime,
  formatDate,
  updateConfig,
  clearCache,
  extractHeadings,
  generateTableOfContents
}; 