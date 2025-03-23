/**
 * Template Engine Module
 * Handles HTML template loading and rendering for the static site generator
 */

const fs = require('fs');
const path = require('path');
const { getConfig } = require('./configManager');

// Template cache to improve performance
const templateCache = {};

// Default configuration
const DEFAULT_CONFIG = {
  cacheTemplates: true,
  templatesDir: 'templates',
  defaultLanguage: 'ru-RU'
};

// Module configuration
let config = { ...DEFAULT_CONFIG };

/**
 * Update template engine configuration
 * @param {Object} newConfig - New configuration options
 */
function updateConfig(newConfig = {}) {
  config = { ...DEFAULT_CONFIG, ...newConfig };
  
  // Clear cache if disabled
  if (!config.cacheTemplates) {
    clearCache();
  }
}

/**
 * Clear the template cache
 */
function clearCache() {
  Object.keys(templateCache).forEach(key => delete templateCache[key]);
}

/**
 * Load a template file
 * @param {string} templateName - Name of the template
 * @returns {string} - Template content
 */
function loadTemplate(templateName) {
  const config = getConfig();
  const templatePath = path.join(config.paths.templatesDir || path.join(process.cwd(), 'blog/templates'), `${templateName}.html`);
  
  // Try loading from user templates first
  try {
    // Return from cache if available and caching is enabled
    if (config.cacheTemplates && templateCache[templatePath]) {
      return templateCache[templatePath];
    }
    
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // Cache template if caching is enabled
    if (config.cacheTemplates) {
      templateCache[templatePath] = template;
    }
    
    return template;
  } catch (error) {
    // If template not found in user templates, try engine defaults
    const engineDefaultPath = path.join(__dirname, '..', 'defaults', 'templates', `${templateName}.html`);
    
    try {
      const template = fs.readFileSync(engineDefaultPath, 'utf-8');
      
      if (config.cacheTemplates) {
        templateCache[templatePath] = template;
      }
      
      return template;
    } catch (defaultError) {
      console.error(`Error loading template ${templateName}:`, error);
      console.error(`Also tried engine default at ${engineDefaultPath}:`, defaultError);
      return ''; // Return empty string on error
    }
  }
}

/**
 * Get nested property from object using a path string (e.g. "user.profile.name")
 * @param {Object} obj - Object to get value from
 * @param {string} path - Path to property
 * @returns {*} - Value or undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
}

/**
 * Process {{#each items}} blocks in template
 * @param {string} template - Template string with #each blocks
 * @param {Object} data - Data object with values
 * @returns {string} - Processed template with #each blocks resolved
 */
function processEachBlocks(template, data) {
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  
  return template.replace(eachRegex, (match, itemsPath, blockContent) => {
    const items = getNestedValue(data, itemsPath.trim());
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return '';
    }
    
    return items.map(item => {
      // Process the block content with the item as context
      // Also pass the original data as context under _parent
      return processTemplate(blockContent, {
        ...item,
        _parent: data,
        _index: items.indexOf(item)
      });
    }).join('');
  });
}

/**
 * Process {{#if condition}} blocks in template
 * @param {string} template - Template string with #if blocks
 * @param {Object} data - Data object with values
 * @returns {string} - Processed template with #if blocks resolved
 */
function processIfBlocks(template, data) {
  const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
  
  return template.replace(ifRegex, (match, condition, ifContent, elseContent = '') => {
    let result = false;
    
    // If condition is a path to a value
    if (condition.trim().indexOf(' ') === -1) {
      result = !!getNestedValue(data, condition.trim());
    } else {
      // For more complex conditions in the future, could use a safe eval approach
      try {
        // For now, just handle simple equality/inequality operations
        const [left, operator, right] = condition.trim().split(/\s+/);
        const leftValue = getNestedValue(data, left) || left;
        const rightValue = getNestedValue(data, right) || right;
        
        switch (operator) {
          case '==':
            result = leftValue == rightValue;
            break;
          case '===':
            result = leftValue === rightValue;
            break;
          case '!=':
            result = leftValue != rightValue;
            break;
          case '!==':
            result = leftValue !== rightValue;
            break;
          default:
            result = !!getNestedValue(data, condition.trim());
        }
      } catch (e) {
        result = false;
      }
    }
    
    return result ? processTemplate(ifContent, data) : processTemplate(elseContent, data);
  });
}

/**
 * Replace variables in template with actual values
 * @param {string} template - Template string with variables
 * @param {Object} data - Data object with values to replace variables
 * @returns {string} - Processed template with variables replaced
 */
function processTemplate(template, data) {
  if (!template) return '';
  
  // Process control structures first
  let processed = template;
  processed = processEachBlocks(processed, data);
  processed = processIfBlocks(processed, data);
  
  // Then process simple variable replacements
  return processed.replace(/\{\{([^#/][^}]*)\}\}/g, (match, key) => {
    key = key.trim();
    const value = getNestedValue(data, key);
    
    if (value === undefined) {
      return ''; // Empty string for undefined values
    } else if (typeof value === 'function') {
      return value(); // Execute functions
    } else {
      return value;
    }
  });
}

/**
 * Generic component renderer that handles loading template and processing with data
 * @param {string} templateName - Template name to use
 * @param {Object} data - Data to use for template variables
 * @param {Function} preprocessor - Optional function to preprocess data before rendering
 * @returns {string} - Rendered HTML
 */
function renderComponent(templateName, data = {}, preprocessor = null) {
  // Load the template
  const template = loadTemplate(templateName);
  
  // Apply preprocessor if provided
  const processedData = preprocessor ? preprocessor(data) : data;
  
  // Process template with data
  return processTemplate(template, processedData);
}

/**
 * Generate the base HTML structure
 * @param {Object} options - Template options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @param {string} options.content - Main content HTML
 * @param {Object} options.config - Site configuration
 * @param {Object} options.meta - Additional meta information
 * @param {string} options.bodyClass - CSS class for body tag
 * @returns {string} - Complete HTML document
 */
function generatePage({ title, description, content, config, meta = {}, bodyClass = '' }) {
  // Generate header and footer
  const header = generateHeader(config);
  const footer = generateFooter(config);
  
  return renderComponent('base', {
    language: config.site.language || config.defaultLanguage,
    site_title: config.site.title,
    title_prefix: title ? `${title} | ` : '',
    description: description || config.site.description,
    canonical: meta.canonical ? `<link rel="canonical" href="${meta.canonical}">` : '',
    header: header,
    content: content,
    footer: footer,
    body_class: bodyClass
  });
}

/**
 * Generate the header HTML
 * @param {Object} config - Site configuration
 * @returns {string} - Header HTML
 */
function generateHeader(config) {
  return renderComponent('header', {
    site_title: config.site.title,
    site_description: config.site.description,
    navigation: config.navigation
  });
}

/**
 * Generate the footer HTML
 * @param {Object} config - Site configuration
 * @returns {string} - Footer HTML
 */
function generateFooter(config) {
  // Generate social links HTML
  const socialLinks = config.social && config.social.links ? 
    config.social.links.map(link => 
      `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.platform}</a>`
    ).join('') : '';

  // Get current year for copyright
  const currentYear = new Date().getFullYear();
  
  // Use copyright from config or generate a fallback
  const copyright = config.site.copyright || `© ${currentYear} ${config.site.title}`;
  
  return renderComponent('footer', {
    site_title: config.site.title,
    copyright: copyright,
    current_year: currentYear,
    social_links: socialLinks
  });
}

/**
 * Generate HTML for a blog post
 * @param {Object} post - Post data
 * @param {Object} config - Site configuration
 * @returns {string} - Post HTML content
 */
function generatePostContent(post, config) {
  // Only show reading time if post.showReadingTime is true
  const readingTimeDisplay = (post.showReadingTime && post.readingTime) 
    ? `<span class="reading-time">${post.readingTime} мин. чтения</span>` 
    : '';
    
  return renderComponent('post', {
    title: post.title,
    date: post.date,
    formatted_date: post.formattedDate,
    author: post.author || '',
    reading_time: readingTimeDisplay,
    tags: post.tags && post.tags.length > 0 ? generateTagsList(post.tags) : '',
    content: post.html
  });
}

/**
 * Generate HTML for post card (used in listings)
 * @param {Object} post - Post data
 * @returns {string} - Post card HTML
 */
function generatePostCard(post) {
  // Only show reading time if post.showReadingTime is true
  const readingTimeDisplay = (post.showReadingTime && post.readingTime) 
    ? `<span class="reading-time">${post.readingTime} мин. чтения</span>` 
    : '';
    
  return renderComponent('post-card', {
    url: post.url,
    title: post.title,
    date: post.date,
    formatted_date: post.formattedDate,
    author: post.author || '',
    reading_time: readingTimeDisplay,
    tags: post.tags && post.tags.length > 0 ? generateTagsList(post.tags) : '',
    summary: post.summary ? `<p class="post-summary">${post.summary}</p>` : ''
  });
}

/**
 * Generate HTML for tags list
 * @param {Array} tags - Array of tags
 * @returns {string} - Tags HTML
 */
function generateTagsList(tags) {
  if (!tags || tags.length === 0) return '';
  
  // Generate individual tag links
  const tagLinks = tags.map(tag => 
    `<a href="/tags/${encodeURIComponent(tag)}/" class="tag">${tag}</a>`
  ).join('');
  
  return renderComponent('tags', {
    tag_links: tagLinks
  });
}

/**
 * Calculate pagination range
 * @param {Object} options - Pagination options
 * @returns {Object} - Pagination data
 */
function calculatePagination({ currentPage, totalPages, range = 2 }) {
  // Calculate range of pages to show
  let startPage = Math.max(1, currentPage - range);
  let endPage = Math.min(totalPages, currentPage + range);
  
  // Ensure we always show at least 5 pages if available
  if (endPage - startPage < 4 && totalPages > 4) {
    if (startPage === 1) {
      endPage = Math.min(startPage + 4, totalPages);
    } else if (endPage === totalPages) {
      startPage = Math.max(endPage - 4, 1);
    }
  }
  
  return {
    startPage,
    endPage,
    showFirst: startPage > 1,
    showFirstEllipsis: startPage > 2,
    showLast: endPage < totalPages,
    showLastEllipsis: endPage < totalPages - 1
  };
}

/**
 * Generate pagination HTML
 * @param {Object} pagination - Pagination data
 * @param {number} pagination.currentPage - Current page number
 * @param {number} pagination.totalPages - Total number of pages
 * @param {string} pagination.basePath - Base path for pagination links
 * @returns {string} - Pagination HTML
 */
function generatePagination({ currentPage, totalPages, basePath }) {
  if (totalPages <= 1) return '';
  
  // Calculate pagination range
  const { 
    startPage, 
    endPage, 
    showFirst, 
    showFirstEllipsis, 
    showLast, 
    showLastEllipsis 
  } = calculatePagination({ currentPage, totalPages });
  
  // Previous page link
  let prevLink;
  if (currentPage > 1) {
    const prevUrl = currentPage === 2 ? basePath : `${basePath}page/${currentPage - 1}/`;
    prevLink = `<a href="${prevUrl}" class="pagination-item pagination-prev">← Предыдущая</a>`;
  } else {
    prevLink = '<span class="pagination-item pagination-prev disabled">← Предыдущая</span>';
  }
  
  // Page number links
  let pageLinks = '';
  
  // First page link if not in range
  if (showFirst) {
    pageLinks += `<a href="${basePath}" class="pagination-item">1</a>`;
    if (showFirstEllipsis) {
      pageLinks += '<span class="pagination-ellipsis">...</span>';
    }
  }
  
  // Page links
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      pageLinks += `<span class="pagination-item pagination-current">${i}</span>`;
    } else {
      const pageUrl = i === 1 ? basePath : `${basePath}page/${i}/`;
      pageLinks += `<a href="${pageUrl}" class="pagination-item">${i}</a>`;
    }
  }
  
  // Last page link if not in range
  if (showLast) {
    if (showLastEllipsis) {
      pageLinks += '<span class="pagination-ellipsis">...</span>';
    }
    pageLinks += `<a href="${basePath}page/${totalPages}/" class="pagination-item">${totalPages}</a>`;
  }
  
  // Next page link
  let nextLink;
  if (currentPage < totalPages) {
    nextLink = `<a href="${basePath}page/${currentPage + 1}/" class="pagination-item pagination-next">Следующая →</a>`;
  } else {
    nextLink = '<span class="pagination-item pagination-next disabled">Следующая →</span>';
  }
  
  return renderComponent('pagination', {
    prev_link: prevLink,
    current_page: currentPage,
    total_pages: totalPages,
    next_link: nextLink
  });
}

module.exports = {
  updateConfig,
  loadTemplate,
  processTemplate,
  renderComponent,
  generatePage,
  generateHeader,
  generateFooter,
  generatePostContent,
  generatePostCard,
  generatePagination,
  generateTagsList
}; 