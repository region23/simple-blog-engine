/**
 * CSS Generator Module
 * Generates CSS variables based on config.json appearance settings
 */

const fs = require('fs');
const path = require('path');
const { getConfig } = require('./configManager');

/**
 * Generate CSS variables content from config appearance settings
 * @returns {string} - CSS variables content
 */
function generateCssVariables() {
  const config = getConfig();
  const appearance = config.appearance || {};
  
  let cssVariables = '/**\n * Generated CSS Variables\n * Auto-generated from config.json appearance settings\n */\n\n';
  
  // Add :root variables
  cssVariables += ':root {\n';
  
  // Add color variables
  if (appearance.colors) {
    cssVariables += '  /* Color variables */\n';
    Object.entries(appearance.colors).forEach(([key, value]) => {
      cssVariables += `  --${key}-color: ${value};\n`;
    });
    cssVariables += '\n';
  }
  
  // Add font variables
  if (appearance.fonts) {
    cssVariables += '  /* Font variables */\n';
    if (appearance.fonts.main) {
      cssVariables += `  --font-sans: '${appearance.fonts.main}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,\n`;
      cssVariables += '    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";\n';
    }
    
    if (appearance.fonts.code) {
      cssVariables += `  --font-mono: '${appearance.fonts.code}', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;\n`;
    }
    cssVariables += '\n';
  }
  
  // Add standard spacing and other variables
  cssVariables += '  /* Spacing */\n';
  cssVariables += '  --space-xs: 0.5rem;\n';
  cssVariables += '  --space-sm: 1rem;\n';
  cssVariables += '  --space-md: 1.5rem;\n';
  cssVariables += '  --space-lg: 2rem;\n';
  cssVariables += '  --space-xl: 3rem;\n\n';
  
  cssVariables += '  /* Borders */\n';
  cssVariables += '  --radius-sm: 4px;\n';
  cssVariables += '  --radius-md: 8px;\n';
  cssVariables += '  --radius-lg: 12px;\n\n';
  
  cssVariables += '  /* Transitions */\n';
  cssVariables += '  --transition-fast: 0.15s ease;\n';
  cssVariables += '  --transition-normal: 0.3s ease;\n';
  
  cssVariables += '}\n\n';
  
  // Add dark mode variables
  if (appearance.darkMode) {
    cssVariables += '/* Dark mode overrides */\n';
    cssVariables += '.dark-mode {\n';
    
    Object.entries(appearance.darkMode).forEach(([key, value]) => {
      // Map background to background-color, text to text-color, etc.
      const cssVar = key.endsWith('color') ? `--${key}` : `--${key}-color`;
      cssVariables += `  ${cssVar}: ${value};\n`;
    });
    
    cssVariables += '}\n';
  }
  
  return cssVariables;
}

/**
 * Write CSS variables to a file
 * @returns {Promise<void>}
 */
async function writeCssVariables() {
  const config = getConfig();
  const css = generateCssVariables();
  
  try {
    // Try to use the configured cssDir from config, or fallback to a default
    const cssDir = config.paths.cssDir || path.join(__dirname, '../css');
    
    // Create css directory if it doesn't exist
    if (!fs.existsSync(cssDir)) {
      fs.mkdirSync(cssDir, { recursive: true });
    }
    
    // Write CSS variables file
    const cssVariablesPath = path.join(cssDir, 'generated.css');
    fs.writeFileSync(cssVariablesPath, css);
    
    console.log(`CSS variables written to: ${cssVariablesPath}`);
  } catch (error) {
    console.error('Error writing CSS variables:', error);
  }
}

module.exports = {
  generateCssVariables,
  writeCssVariables
}; 