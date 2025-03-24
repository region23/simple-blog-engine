/**
 * Site Builder Module
 * Orchestrates the site building process
 */

const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const util = require('util');

const { loadConfig, getConfig } = require('./configManager');
const { readFile, writeFile, ensureDirectoryExists, listFiles, copyDirectory, copyFile, listDirectories } = require('./fileHandler');
const { renderMarkdown, extractFrontmatter, calculateReadingTime, formatDate, updateConfig: updateMarkdownConfig } = require('./markdownProcessor');
const { writeCssVariables } = require('./cssGenerator');
const { 
  generatePage, 
  generatePostContent, 
  generatePostCard, 
  generatePagination,
  loadTemplate,
  processTemplate,
  renderComponent,
  updateConfig: updateTemplateConfig
} = require('./templateEngine');

// Default options for site building
const DEFAULT_OPTIONS = {
  verbose: false,
  clean: false
};

// Helper for logging when verbose mode is enabled
function log(message, options) {
  if (options && options.verbose) {
    console.log(message);
  }
}

/**
 * Write content to a file and ensure its directory exists
 * @param {string} filePath - Path to write to
 * @param {string} content - Content to write
 */
async function writeOutput(filePath, content) {
  await ensureDirectoryExists(path.dirname(filePath));
  await writeFile(filePath, content);
}

/**
 * Process a markdown file into a post object
 * @param {string} filePath - Path to the markdown file
 * @param {string} filename - Filename of the markdown file
 * @returns {Object|null} - Processed post object or null if error
 */
async function processPostFile(filePath, filename) {
  try {
    const content = await readFile(filePath);
    const config = getConfig();
    
    // Extract frontmatter and content
    const { content: markdownContent, data } = extractFrontmatter(content);
    
    // Set default values for missing required fields
    const postData = { ...data };
    
    // If date is missing, use file modification date
    if (!postData.date) {
      const stats = fs.statSync(filePath);
      postData.date = stats.mtime.toISOString().split('T')[0];
      console.warn(`Warning: Missing date in ${filename}, using file modification date`);
    }
    
    // If title is missing, use filename
    if (!postData.title) {
      postData.title = filename.replace('.md', '').replace(/-/g, ' ');
      console.warn(`Warning: Missing title in ${filename}, using normalized filename`);
    }
    
    // If author is missing, use defaultAuthor from config
    if (!postData.author && config.content && config.content.defaultAuthor) {
      postData.author = config.content.defaultAuthor;
    }
    
    // Generate HTML from markdown
    const html = renderMarkdown(markdownContent);
    
    // Calculate reading time
    const readingTime = calculateReadingTime(markdownContent);
    
    // Should we show reading time?
    const showReadingTime = config.content && config.content.showReadingTime !== undefined 
      ? config.content.showReadingTime 
      : true;
    
    // Format the date
    const formattedDate = formatDate(postData.date);
    
    // Generate post URL
    const fileName = filename.replace('.md', '').replace(/ /g, '_');
    const url = `/posts/${fileName}/`;
    
    // Return complete post object
    return {
      file: fileName,
      title: postData.title,
      date: postData.date,
      author: postData.author || '',
      tags: postData.tags || [],
      summary: postData.summary || '',
      content: markdownContent,
      html,
      readingTime,
      showReadingTime,
      formattedDate,
      url,
      ...postData
    };
  } catch (error) {
    console.error(`Error processing file ${filename}:`, error);
    return null;
  }
}

/**
 * Load all markdown posts from the content directory
 * @param {Object} options - Options for loading posts
 * @returns {Promise<Array>} - Array of processed post objects
 */
async function loadAllPosts(options = {}) {
  const config = getConfig();
  const postsDir = config.paths.postsDir || path.join(config.paths.contentDir, 'posts');
  
  log(`Loading posts from ${postsDir}`, options);
  
  if (options.debug) {
    console.log(`Debug: Loading posts from ${postsDir}`);
    // Check if directory exists and list contents
    try {
      const stats = fs.statSync(postsDir);
      if (!stats.isDirectory()) {
        console.log(`Debug: Posts path is not a directory: ${postsDir}`);
      } else {
        console.log(`Debug: Posts directory exists: ${postsDir}`);
        const contents = fs.readdirSync(postsDir);
        console.log(`Debug: Directory contains ${contents.length} items:`, contents);
      }
    } catch (err) {
      console.log(`Debug: Error accessing posts directory: ${err.message}`);
    }
  }
  
  try {
    // Get list of markdown files in the posts directory
    const files = await listFiles(postsDir, '.md');
    
    if (options.debug) {
      console.log(`Debug: Found ${files?.length || 0} markdown files in ${postsDir}`);
    }
    
    if (!files || files.length === 0) {
      console.warn('No markdown files found in posts directory');
      return [];
    }
    
    log(`Found ${files.length} markdown files`, options);
    
    // Process each file
    const posts = await Promise.all(
      files.map(async filename => {
        const filePath = path.join(postsDir, filename);
        return processPostFile(filePath, filename);
      })
    );
    
    // Filter out any null results (failed processing)
    const validPosts = posts.filter(post => post !== null);
    
    // Sort posts by date (newest first)
    validPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return validPosts;
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * Extract and organize tags from posts
 * @param {Array} posts - Array of post objects
 * @returns {Object} - Object with tags as keys and arrays of posts as values
 */
function extractTags(posts) {
  return posts.reduce((tags, post) => {
    if (post.tags && Array.isArray(post.tags)) {
      post.tags.forEach(tag => {
        if (!tags[tag]) {
          tags[tag] = [];
        }
        tags[tag].push(post);
      });
    }
    return tags;
  }, {});
}

/**
 * Generate static assets (copy css, js, images)
 * @param {Object} options - Build options
 */
async function generateStaticAssets(options = {}) {
  const config = getConfig();
  
  try {
    // Copy engine static directories: images, but NOT css or js (will be handled separately)
    const staticDirs = ['images'];
    
    await Promise.all(staticDirs.map(async (dir) => {
      const sourcePath = path.join(__dirname, '../', dir);
      const destPath = path.join(config.paths.outputDir, dir);
      
      if (fs.existsSync(sourcePath)) {
        log(`Copying engine ${dir} directory...`, options);
        await copyDirectory(sourcePath, destPath);
      }
    }));
    
    // Create JS directory in output
    const destJsDir = path.join(config.paths.outputDir, 'js');
    await ensureDirectoryExists(destJsDir);
    
    // First, copy JS files from the blog (if they exist)
    const blogJsDir = path.join(process.cwd(), 'blog/js');
    
    if (fs.existsSync(blogJsDir)) {
      log(`Copying blog JS files...`, options);
      const jsFiles = await listFiles(blogJsDir, { fullPath: true, filter: /\.js$/ });
      
      for (const file of jsFiles) {
        const fileName = path.basename(file);
        await copyFile(file, path.join(destJsDir, fileName));
        log(`Copied ${fileName} to ${destJsDir}`, options);
      }
    }
    
    // Then, copy engine JS files from defaults
    const engineJsDir = path.join(__dirname, '../defaults/js');
    
    if (fs.existsSync(engineJsDir)) {
      log(`Copying engine JS files...`, options);
      
      // First, copy JS files from the root of defaults/js
      const engineJsFiles = await listFiles(engineJsDir, { fullPath: true, filter: /\.js$/, recursive: false });
      
      for (const file of engineJsFiles) {
        const fileName = path.basename(file);
        const destFile = path.join(destJsDir, fileName);
        
        // Only copy if the file doesn't already exist in the output directory
        if (!fs.existsSync(destFile)) {
          await copyFile(file, destFile);
          log(`Copied engine ${fileName} to ${destJsDir}`, options);
        }
      }
      
      // Then, copy JS files from subdirectories of defaults/js
      const subdirectories = await listDirectories(engineJsDir);
      
      for (const subdir of subdirectories) {
        const subdirName = path.basename(subdir);
        const destSubdir = path.join(destJsDir, subdirName);
        
        // Create subdirectory in destination if it doesn't exist
        await ensureDirectoryExists(destSubdir);
        
        // Get JS files from the subdirectory
        const subdirJsFiles = await listFiles(subdir, { fullPath: true, filter: /\.js$/ });
        
        for (const file of subdirJsFiles) {
          const fileName = path.basename(file);
          const destFile = path.join(destSubdir, fileName);
          
          // Only copy if the file doesn't already exist in the output directory
          if (!fs.existsSync(destFile)) {
            await copyFile(file, destFile);
            log(`Copied engine ${subdirName}/${fileName} to ${destSubdir}`, options);
          }
        }
      }
    }
    
    // Create CSS directory in output
    const destCssDir = path.join(config.paths.outputDir, 'css');
    await ensureDirectoryExists(destCssDir);
    
    // Copy blog CSS files - these are the primary source for styling
    const blogCssDir = path.join(process.cwd(), 'blog/css');
    
    if (fs.existsSync(blogCssDir)) {
      log(`Copying blog CSS files...`, options);
      
      // List files for debugging
      const allFiles = await listFiles(blogCssDir);
      log(`Found files in ${blogCssDir}: ${JSON.stringify(allFiles)}`, options);
      
      // Copy CSS files from the root blog/css directory
      const cssFiles = await listFiles(blogCssDir, { fullPath: true, filter: /\.css$/ });
      log(`CSS files to copy: ${JSON.stringify(cssFiles)}`, options);
      
      for (const file of cssFiles) {
        const fileName = path.basename(file);
        await copyFile(file, path.join(destCssDir, fileName));
        log(`Copied ${fileName} to ${destCssDir}`, options);
      }
    }
    
    // Copy blog images
    const blogImagesDir = path.join(process.cwd(), 'blog/images');
    const destImagesDir = path.join(config.paths.outputDir, 'images');
    
    if (fs.existsSync(blogImagesDir)) {
      log(`Copying blog images...`, options);
      await copyDirectory(blogImagesDir, destImagesDir);
    }
    
    // Copy root files 
    const rootFiles = ['.htaccess', '_redirects', 'favicon.ico', '.nojekyll'];
    
    await Promise.all(rootFiles.map(async (file) => {
      const sourcePath = path.join(__dirname, '../', file);
      const destPath = path.join(config.paths.outputDir, file);
      
      if (fs.existsSync(sourcePath)) {
        log(`Copying ${file}...`, options);
        const content = await readFile(sourcePath);
        await writeFile(destPath, content);
      }
    }));
  } catch (error) {
    console.error('Error generating static assets:', error);
    throw error;
  }
}

/**
 * Generate paginated content
 * @param {Array} items - Array of items to paginate
 * @param {Object} options - Pagination options
 * @returns {Array} - Array of page objects with itemsForPage and pagination properties
 */
function paginateItems(items, options) {
  const { 
    perPage = 10, 
    basePath = '/',
    pageTitle = (page) => page === 1 ? 'Последние записи' : `Страница ${page}`
  } = options;
  
  // Calculate total pages
  const totalPages = Math.ceil(items.length / perPage);
  const pages = [];
  
  // Generate page objects
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const itemsForPage = items.slice(start, end);
    
    // Generate pagination
    const pagination = totalPages > 1 ? generatePagination({
      currentPage: page,
      totalPages,
      basePath
    }) : '';
    
    pages.push({
      page,
      title: pageTitle(page),
      itemsForPage,
      pagination,
      isFirstPage: page === 1
    });
  }
  
  return pages;
}

/**
 * Build the home page with paginated posts
 * @param {Array} posts - Array of post objects
 * @param {Object} options - Build options
 */
async function buildHomePage(posts, options = {}) {
  const config = getConfig();
  
  try {
    log('Building home page...', options);
    
    // Generate paginated content
    const pages = paginateItems(posts, {
      perPage: config.content.postsPerPage,
      basePath: '/'
    });
    
    // Generate each page
    await Promise.all(pages.map(async ({ page, title, itemsForPage, pagination, isFirstPage }) => {
      // Generate post cards
      const postCards = itemsForPage.map(post => generatePostCard(post)).join('');
      
      // Generate page content
      const content = `
        <div class="posts-list">
          <h1 class="page-title">Последние публикации</h1>
          ${postCards}
          ${pagination}
        </div>
      `;
      
      // Generate full page HTML
      const html = generatePage({
        title: isFirstPage ? config.site.title : `Страница ${page} | ${config.site.title}`,
        description: config.site.description,
        content,
        config
      });
      
      // Write to file
      const pageDir = isFirstPage ? 
        config.paths.outputDir : 
        path.join(config.paths.outputDir, 'page', String(page));
      
      await writeOutput(path.join(pageDir, 'index.html'), html);
    }));
  } catch (error) {
    console.error('Error building home page:', error);
    throw error;
  }
}

/**
 * Build individual post pages
 * @param {Array} posts - Array of post objects
 * @param {Object} options - Build options
 */
async function buildPostPages(posts, options = {}) {
  const config = getConfig();
  
  try {
    log(`Building ${posts.length} post pages...`, options);
    
    await Promise.all(posts.map(async (post) => {
      // Generate post content
      const postContent = generatePostContent(post, config);
      
      // Generate full page HTML
      const html = generatePage({
        title: post.title,
        description: post.summary || '',
        content: postContent,
        config,
        meta: {
          canonical: `${config.site.url}${post.url}`
        },
        bodyClass: 'post-page'
      });
      
      // Create directory and write file
      const postDir = path.join(config.paths.outputDir, 'posts', post.file);
      await writeOutput(path.join(postDir, 'index.html'), html);
    }));
  } catch (error) {
    console.error('Error building post pages:', error);
    throw error;
  }
}

/**
 * Build tag pages
 * @param {Array} posts - Array of post objects
 * @param {Object} options - Build options
 */
async function buildTagPages(posts, options = {}) {
  const config = getConfig();
  
  try {
    const tags = extractTags(posts);
    const tagCount = Object.keys(tags).length;
    log(`Building ${tagCount} tag pages...`, options);
    
    await Promise.all(Object.entries(tags).map(async ([tag, tagPosts]) => {
      // Generate post cards
      const postCards = tagPosts.map(post => generatePostCard(post)).join('');
      
      // Generate page content
      const content = `
        <div class="posts-list">
          <h1 class="page-title">Записи с тегом: ${tag}</h1>
          ${postCards}
        </div>
      `;
      
      // Generate full page HTML
      const html = generatePage({
        title: `${tag} | ${config.site.title}`,
        description: `Записи с тегом ${tag}`,
        content,
        config
      });
      
      // Create directory and write file
      const tagDir = path.join(config.paths.outputDir, 'tags', tag.replace(/ /g, '_'));
      await writeOutput(path.join(tagDir, 'index.html'), html);
    }));

    // Build the main tags index page
    await buildTagsIndexPage(tags, options);
  } catch (error) {
    console.error('Error building tag pages:', error);
    throw error;
  }
}

/**
 * Build tags index page
 * @param {Object} tags - Object with tags as keys and arrays of posts as values
 * @param {Object} options - Build options
 */
async function buildTagsIndexPage(tags, options = {}) {
  const config = getConfig();
  
  try {
    log('Building tags index page...', options);
    
    // Create tag links with post counts
    const tagLinks = Object.entries(tags)
      .sort(([tagA], [tagB]) => tagA.localeCompare(tagB))
      .map(([tag, posts]) => {
        return `<a href="/tags/${tag.replace(/ /g, '_')}/" class="tag">${tag} (${posts.length})</a>`;
      })
      .join('\n');
    
    // Generate page content using the tags template
    const content = `
      <div class="tags-page">
        <h1 class="page-title">Теги</h1>
        <div class="tags">
          ${tagLinks}
        </div>
      </div>
    `;
    
    // Generate full page HTML
    const html = generatePage({
      title: 'Теги | ' + config.site.title,
      description: 'Все теги блога',
      content,
      config
    });
    
    // Create directory and write file
    const tagsDir = path.join(config.paths.outputDir, 'tags');
    await writeOutput(path.join(tagsDir, 'index.html'), html);
  } catch (error) {
    console.error('Error building tags index page:', error);
    throw error;
  }
}

/**
 * Build the about page if one exists in the content/about directory
 * @param {Object} options - Build options
 */
async function buildAboutPage(options = {}) {
  const config = getConfig();
  const aboutDir = config.paths.aboutDir || path.join(config.paths.contentDir, 'about');
  const outputDir = config.paths.outputDir;
  
  log('Building about page...', options);
  
  try {
    // Try to find an index.md file in the about directory
    const aboutPath = path.join(aboutDir, 'index.md');
    let aboutContent;
    
    try {
      aboutContent = await readFile(aboutPath);
    } catch (error) {
      // No about page found, skip
      log('No about page found, skipping...', options);
      return;
    }
    
    // Extract frontmatter and render markdown
    const { content, data } = extractFrontmatter(aboutContent);
    const htmlContent = renderMarkdown(content);
    
    // Generate the page
    const page = generatePage({
      title: data.title || 'About',
      description: data.description || config.site.description,
      content: htmlContent,
      config
    });
    
    // Write to output
    const outputPath = path.join(outputDir, 'about', 'index.html');
    await writeOutput(outputPath, page);
    
    log('About page built successfully', options);
  } catch (error) {
    console.error('Error building about page:', error);
  }
}

/**
 * Build 404 error page
 * @param {Object} options - Build options
 */
async function buildErrorPage(options = {}) {
  const config = getConfig();
  
  try {
    log('Building 404 error page...', options);
    
    // Generate content using the error template
    const content = renderComponent('error', {});
    
    // Generate full page HTML
    const html = generatePage({
      title: '404 - Страница не найдена',
      description: 'Страница не найдена',
      content,
      config
    });
    
    // Write to file
    await writeOutput(path.join(config.paths.outputDir, '404.html'), html);
  } catch (error) {
    console.error('Error building error page:', error);
    throw error;
  }
}

/**
 * Build sitemap.xml
 * @param {Array} posts - Array of post objects
 * @param {Object} options - Build options
 */
async function buildSitemap(posts, options = {}) {
  const config = getConfig();
  
  try {
    log('Building sitemap.xml...', options);
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add home page
    sitemap += `  <url>\n    <loc>${config.site.url}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;
    
    // Add about page
    sitemap += `  <url>\n    <loc>${config.site.url}/about/</loc>\n    <priority>0.8</priority>\n  </url>\n`;
    
    // Add posts
    posts.forEach(post => {
      const date = new Date(post.date).toISOString().split('T')[0];
      sitemap += `  <url>\n    <loc>${config.site.url}${post.url}</loc>\n    <lastmod>${date}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    
    // Add tag pages
    const tags = extractTags(posts);
    Object.keys(tags).forEach(tag => {
      sitemap += `  <url>\n    <loc>${config.site.url}/tags/${tag.replace(/ /g, '_')}/</loc>\n    <priority>0.5</priority>\n  </url>\n`;
    });
    
    sitemap += '</urlset>';
    
    // Write to file
    await writeOutput(path.join(config.paths.outputDir, 'sitemap.xml'), sitemap);
  } catch (error) {
    console.error('Error building sitemap:', error);
    throw error;
  }
}

/**
 * Main function to build the complete static site
 * @param {Object} options - Build options
 * @returns {Promise<void>}
 */
async function buildSite(options = {}) {
  // Parse options
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const {
    configPath = path.join(process.cwd(), 'blog/config.json'),
    verbose = false,
    clean = false,
    outputDir,
    debug = false
  } = mergedOptions;
  
  console.log('Starting site build...');
  
  try {
    // Load configuration
    const config = await loadConfig({
      configPath,
      useCache: false,
      outputDir
    });
    
    if (debug) {
      console.log('Debug: Configuration paths after loading:');
      console.log(`- Content directory: ${config.paths.contentDir}`);
      console.log(`- Posts directory: ${config.paths.postsDir}`);
      console.log(`- About directory: ${config.paths.aboutDir}`);
      console.log(`- Templates directory: ${config.paths.templatesDir}`);
      console.log(`- Output directory: ${config.paths.outputDir}`);
      
      // Check if directories exist
      console.log('Debug: Checking if directories exist:');
      for (const [name, dirPath] of Object.entries({
        'Content': config.paths.contentDir,
        'Posts': config.paths.postsDir,
        'About': config.paths.aboutDir,
        'Templates': config.paths.templatesDir
      })) {
        try {
          fs.accessSync(dirPath, fs.constants.R_OK);
          console.log(`- ${name} directory exists: ${dirPath}`);
        } catch (err) {
          console.log(`- ${name} directory does not exist or is not readable: ${dirPath}`);
        }
      }
    }
    
    // Initialize the CSS
    await writeCssVariables();
    
    // Load all posts
    const posts = await loadAllPosts({ verbose, debug });
    
    if (debug) {
      console.log(`Debug: Loaded ${posts.length} posts`);
    }
    
    // Extract unique tags from posts
    const tags = extractTags(posts);
    
    // Build all pages in parallel
    await Promise.all([
      // Copy static assets
      generateStaticAssets({ verbose }),
      
      // Build main pages
      buildHomePage(posts, { verbose }),
      buildPostPages(posts, { verbose }),
      
      // Build tag pages
      buildTagPages(posts, { verbose }),
      buildTagsIndexPage(tags, { verbose }),
      
      // Build other pages
      buildAboutPage({ verbose }),
      
      // Build sitemap
      buildSitemap(posts, { verbose })
    ]);
    
    console.log('Site build completed successfully!');
  } catch (error) {
    console.error('Error building site:', error);
    await buildErrorPage();
    throw error;
  }
}

module.exports = {
  buildSite,
  // Export internal functions for testing or direct use
  loadAllPosts,
  extractTags,
  generateStaticAssets,
  buildHomePage,
  buildPostPages,
  buildTagPages,
  buildTagsIndexPage,
  buildAboutPage,
  buildErrorPage,
  buildSitemap
}; 