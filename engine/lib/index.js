/**
 * Markdown Blog Engine
 * Main entry point exporting all public APIs
 */

const siteBuilder = require('./siteBuilder');
const markdownProcessor = require('./markdownProcessor');
const templateEngine = require('./templateEngine');
const configManager = require('./configManager');
const fileHandler = require('./fileHandler');
const cssGenerator = require('./cssGenerator');
const postGenerator = require('./postGenerator');

module.exports = {
  // Site building
  buildSite: siteBuilder.buildSite,
  
  // Markdown processing
  renderMarkdown: markdownProcessor.renderMarkdown,
  extractFrontmatter: markdownProcessor.extractFrontmatter,
  calculateReadingTime: markdownProcessor.calculateReadingTime,
  
  // Template management
  renderTemplate: templateEngine.processTemplate,
  generatePage: templateEngine.generatePage,
  
  // Configuration
  loadConfig: configManager.loadConfig,
  getConfig: configManager.getConfig,
  
  // File handling
  readFile: fileHandler.readFile,
  writeFile: fileHandler.writeFile,
  ensureDirectoryExists: fileHandler.ensureDirectoryExists,
  
  // CSS processing
  generateCSS: cssGenerator.generateCSS,
  
  // Post generation
  createPost: postGenerator.createPost,
  generateSlug: postGenerator.generateSlug
}; 