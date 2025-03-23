/**
 * Main build script for the static site generator
 */

const { buildSite } = require('./siteBuilder');

// Run the site builder
buildSite()
  .then(() => {
    console.log('Build completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  }); 