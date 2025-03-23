/**
 * Configuration Manager Module
 * Handles loading and validating configuration for the static site generator
 */

const path = require('path');
const { readFile } = require('./fileHandler');

// Version of the configuration schema
const CONFIG_VERSION = '1.0.0';

// Configuration schema for validation
const CONFIG_SCHEMA = {
  _version: { type: 'string', required: true },
  site: {
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    language: { type: 'string', required: true }
  },
  content: {
    postsPerPage: { type: 'number', required: true, min: 1 }
  },
  paths: {
    contentDir: { type: 'string', required: true },
    templatesDir: { type: 'string', required: true },
    outputDir: { type: 'string', required: true },
    cssDir: { type: 'string', required: true }
  }
};

// Default configuration
const DEFAULT_CONFIG = {
  _version: CONFIG_VERSION,
  site: {
    title: 'Markdown Blog',
    description: 'A static blog built with markdown-blog-engine',
    language: 'en'
  },
  content: {
    postsPerPage: 10
  },
  paths: {
    contentDir: './blog/content',
    templatesDir: './blog/templates',
    outputDir: './dist',
    cssDir: './blog/css'
  }
};

// Cache for loaded configuration
let configCache = null;

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} - New merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === 'object' && 
        source[key] !== null && 
        !Array.isArray(source[key])
      ) {
        // If property exists in target and is an object, merge recursively
        if (target[key] && typeof target[key] === 'object') {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          // Otherwise just copy from source
          output[key] = { ...source[key] };
        }
      } else {
        // For non-objects, just copy the value
        output[key] = source[key];
      }
    }
  }
  
  return output;
}

/**
 * Validate a config value against schema
 * @param {any} value - Config value to validate
 * @param {Object} schema - Schema definition for the value
 * @param {string} path - Path in the config for error reporting
 * @returns {Array} - Array of validation errors, empty if valid
 */
function validateValue(value, schema, path) {
  const errors = [];
  
  // Check required
  if (schema.required && (value === undefined || value === null)) {
    errors.push(`${path} is required`);
    return errors;
  }
  
  // Skip further validation if value is not provided
  if (value === undefined || value === null) {
    return errors;
  }
  
  // Check type
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path} should be of type ${schema.type}, got ${actualType}`);
    }
  }
  
  // Check min value for numbers
  if (schema.type === 'number' && schema.min !== undefined && value < schema.min) {
    errors.push(`${path} should be at least ${schema.min}`);
  }
  
  // Check min length for strings and arrays
  if ((schema.type === 'string' || schema.type === 'array') && 
      schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${path} should have length of at least ${schema.minLength}`);
  }
  
  return errors;
}

/**
 * Validate configuration against schema
 * @param {Object} config - Configuration to validate
 * @returns {Object} - Validation result {valid: boolean, errors: string[]}
 */
function validateConfig(config) {
  const errors = [];
  
  // Helper function to validate section recursively
  function validateSection(sectionConfig, sectionSchema, path) {
    for (const key in sectionSchema) {
      const propertyPath = path ? `${path}.${key}` : key;
      const schema = sectionSchema[key];
      
      // If schema is a nested object with properties
      if (typeof schema === 'object' && !schema.type) {
        // Create section if it doesn't exist
        if (!sectionConfig[key]) {
          sectionConfig[key] = {};
        }
        validateSection(sectionConfig[key], schema, propertyPath);
      } else {
        // Validate leaf property
        const propertyErrors = validateValue(sectionConfig[key], schema, propertyPath);
        errors.push(...propertyErrors);
        
        // Set default value if needed
        if (
          schema.required && 
          (sectionConfig[key] === undefined || sectionConfig[key] === null) && 
          DEFAULT_CONFIG[path] && DEFAULT_CONFIG[path][key] !== undefined
        ) {
          sectionConfig[key] = DEFAULT_CONFIG[path][key];
          console.log(`Warning: ${propertyPath} not specified, using default: ${sectionConfig[key]}`);
        }
      }
    }
  }
  
  // Validate each section
  for (const section in CONFIG_SCHEMA) {
    if (!config[section]) {
      config[section] = {};
    }
    validateSection(config[section], CONFIG_SCHEMA[section], section);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Add derived properties to config
 * @param {Object} config - Configuration object
 * @returns {Object} - Configuration with derived properties
 */
function addDerivedProperties(config) {
  const newConfig = { ...config };
  
  // Add path-related properties
  if (newConfig.paths) {
    newConfig.paths = { 
      ...newConfig.paths,
      postsDir: path.join(newConfig.paths.contentDir, 'posts'),
      aboutDir: path.join(newConfig.paths.contentDir, 'about')
    };
  }
  
  return newConfig;
}

/**
 * Migrate config from one version to another
 * @param {Object} config - Config object
 * @param {string} fromVersion - Current version
 * @param {string} toVersion - Target version
 * @returns {Object} - Migrated config
 */
function migrateConfig(config, fromVersion, toVersion) {
  // No migrations yet, but this allows for future version changes
  if (fromVersion === toVersion) {
    return config;
  }
  
  console.log(`Migrating configuration from version ${fromVersion} to ${toVersion}`);
  
  // Add migration logic here when needed for future versions
  // Example:
  // if (fromVersion === '1.0.0' && compareVersions(toVersion, '1.1.0') >= 0) {
  //   config = migrate_1_0_0_to_1_1_0(config);
  //   fromVersion = '1.1.0';
  // }
  
  // Always set the new version
  config._version = toVersion;
  
  return config;
}

/**
 * Resolves paths in config to be absolute or relative to cwd
 * @param {Object} config - Config object with paths
 * @param {string} basePath - Base path for resolving relative paths
 * @returns {Object} - Config with resolved paths
 */
function resolvePaths(config, basePath) {
  const result = { ...config };
  
  // Resolve paths.contentDir and paths.outputDir if they exist
  if (result.paths) {
    if (result.paths.contentDir && !path.isAbsolute(result.paths.contentDir)) {
      // Check if path already contains the base directory to avoid duplication
      const contentPath = path.resolve(basePath, result.paths.contentDir);
      // If contentDir is something like './blog/content' but basePath already ends with 'blog',
      // we want to avoid creating paths like 'blog/blog/content'
      if (path.basename(basePath) === 'blog' && result.paths.contentDir.startsWith('./blog/')) {
        result.paths.contentDir = path.resolve(path.dirname(basePath), result.paths.contentDir);
      } else {
        result.paths.contentDir = contentPath;
      }
    }
    
    if (result.paths.outputDir && !path.isAbsolute(result.paths.outputDir)) {
      result.paths.outputDir = path.resolve(basePath, result.paths.outputDir);
    }
    
    if (result.paths.templatesDir && !path.isAbsolute(result.paths.templatesDir)) {
      // Apply same logic to templatesDir to prevent duplication
      const templatesPath = path.resolve(basePath, result.paths.templatesDir);
      if (path.basename(basePath) === 'blog' && result.paths.templatesDir.startsWith('./blog/')) {
        result.paths.templatesDir = path.resolve(path.dirname(basePath), result.paths.templatesDir);
      } else {
        result.paths.templatesDir = templatesPath;
      }
    }
    
    if (result.paths.cssDir && !path.isAbsolute(result.paths.cssDir)) {
      // Apply same logic to cssDir to prevent duplication
      const cssPath = path.resolve(basePath, result.paths.cssDir);
      if (path.basename(basePath) === 'blog' && result.paths.cssDir.startsWith('./blog/')) {
        result.paths.cssDir = path.resolve(path.dirname(basePath), result.paths.cssDir);
      } else {
        result.paths.cssDir = cssPath;
      }
    }
  }
  
  return result;
}

/**
 * Load configuration from file
 * @param {Object} options - Options for loading config
 * @param {string} options.configPath - Path to config file
 * @param {boolean} options.useCache - Whether to use cached config
 * @param {string} options.outputDir - Override for output directory
 * @returns {Promise<Object>} - Loaded and validated config
 */
async function loadConfig(options = {}) {
  const {
    configPath = path.join(process.cwd(), 'blog/config.json'),
    useCache = true,
    outputDir
  } = typeof options === 'string' ? { configPath: options } : options;
  
  // Use cache if available and requested
  if (useCache && configCache) {
    return configCache;
  }
  
  try {
    // Start with default config
    let config = { ...DEFAULT_CONFIG };
    
    // Load user config if available
    try {
      const configData = await readFile(configPath);
      const userConfig = JSON.parse(configData);
      
      // Check if user config has version
      const userVersion = userConfig._version || '1.0.0';
      
      // Migrate if necessary
      const migratedConfig = migrateConfig(userConfig, userVersion, CONFIG_VERSION);
      
      // Merge with defaults
      config = deepMerge(config, migratedConfig);
    } catch (error) {
      console.warn(`Could not load config from ${configPath}:`, error.message);
      console.warn('Using default configuration');
    }
    
    // Resolve paths relative to config file location
    const basePath = path.dirname(configPath);
    config = resolvePaths(config, basePath);
    
    // Override output directory if specified
    if (outputDir) {
      config.paths.outputDir = path.isAbsolute(outputDir) 
        ? outputDir 
        : path.resolve(process.cwd(), outputDir);
    }
    
    // Add computed properties
    config = addDerivedProperties(config);
    
    // Validate config
    const { valid, errors } = validateConfig(config);
    if (!valid) {
      console.error('Configuration validation errors:');
      errors.forEach(error => console.error(`- ${error}`));
      throw new Error('Invalid configuration');
    }
    
    // Cache valid config
    configCache = config;
    
    return config;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
}

/**
 * Get the current configuration
 * @param {boolean} useCache - Whether to return cached config or throw if not loaded
 * @returns {Object} - Current configuration
 */
function getConfig(useCache = true) {
  if (configCache === null && !useCache) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return configCache || DEFAULT_CONFIG;
}

/**
 * Clear configuration cache
 */
function clearConfigCache() {
  configCache = null;
}

module.exports = {
  loadConfig,
  getConfig,
  clearConfigCache,
  validateConfig,
  CONFIG_VERSION
}; 