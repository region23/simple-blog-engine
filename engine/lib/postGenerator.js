/**
 * Post Generator Module
 * 
 * Handles creation of new blog post templates with proper frontmatter
 */

const fs = require('fs');
const path = require('path');
const { slugify } = require('transliteration');

/**
 * Generate a slug from post title
 * @param {string} title - The post title to slugify
 * @returns {string} - Slugified title
 */
function generateSlug(title) {
  return slugify(title, {
    lowercase: true, 
    separator: '-',
    trim: true
  });
}

/**
 * Format current date in YYYY-MM-DD format for frontmatter
 * @returns {string} - Formatted current date
 */
function getCurrentDate() {
  const date = new Date();
  return date.toISOString().split('T')[0];
}

/**
 * Format current date in DDMMYY format for filename suffix
 * @returns {string} - Formatted date for filename
 */
function getDateSuffix() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `_${day}${month}${year}`;
}

/**
 * Check if a post with given slug already exists
 * @param {string} postsDir - Directory containing posts
 * @param {string} slug - Post slug to check
 * @returns {boolean} - True if exists, false otherwise
 */
function postExists(postsDir, slug) {
  return fs.existsSync(path.join(postsDir, `${slug}.md`));
}

/**
 * Create frontmatter content for new post
 * @param {string} title - Post title
 * @param {string} date - Formatted date
 * @returns {string} - Frontmatter content
 */
function createFrontmatter(title, date) {
  return `---
title: "${title}"
date: "${date}"
tags: []
summary: ""
---

# ${title}

`;
}

/**
 * Create a new blog post file
 * @param {string} title - Post title
 * @param {string} blogDir - Root blog directory
 * @returns {Object} - Result with path and success status
 */
function createPost(title, blogDir = './blog') {
  try {
    // Generate slug from title
    const slug = generateSlug(title);
    
    // Setup paths
    const postsDir = path.join(blogDir, 'content', 'posts');
    const date = getCurrentDate();
    
    // Ensure posts directory exists
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }
    
    // Check if post exists and adjust filename if needed
    let filename = `${slug}.md`;
    if (postExists(postsDir, slug)) {
      const dateSuffix = getDateSuffix();
      filename = `${slug}${dateSuffix}.md`;
    }
    
    // Create full post path
    const postPath = path.join(postsDir, filename);
    
    // Generate content with frontmatter
    const content = createFrontmatter(title, date);
    
    // Write the file
    fs.writeFileSync(postPath, content, 'utf8');
    
    return {
      success: true,
      path: postPath,
      slug: slug
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createPost,
  generateSlug
}; 