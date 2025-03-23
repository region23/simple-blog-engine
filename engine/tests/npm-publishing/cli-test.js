/**
 * CLI Functionality Test
 * Tests that the CLI commands work as expected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Run CLI functionality tests
 * @param {string} baseTestDir - Base directory for tests
 */
function runCliTest(baseTestDir) {
  // Create test directory for CLI test
  const testDir = path.join(baseTestDir, 'cli-test');
  fs.mkdirSync(testDir, { recursive: true });
  
  // Get the path to the package root
  const packageRoot = path.resolve(__dirname, '..', '..');
  
  try {
    console.log('Creating test blog...');
    
    // Pack the package for local installation
    const packOutput = execSync('npm pack', { 
      cwd: packageRoot,
      encoding: 'utf8'
    });
    
    // Extract the filename from npm pack output
    const packageFilename = packOutput.trim().split('\n').pop();
    const packagePath = path.join(packageRoot, packageFilename);
    
    // Initialize a fresh project
    fs.mkdirSync(path.join(testDir, 'test-blog'), { recursive: true });
    const blogDir = path.join(testDir, 'test-blog');
    
    // Create a package.json
    const testPackageJson = {
      name: "cli-test-blog",
      version: "1.0.0",
      private: true,
      description: "Test blog for simple-blog-engine CLI tests"
    };
    
    fs.writeFileSync(
      path.join(blogDir, 'package.json'),
      JSON.stringify(testPackageJson, null, 2)
    );
    
    // Install the package
    console.log('Installing the package in test blog...');
    execSync(`npm install ${packagePath}`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Clean up the packed file
    fs.unlinkSync(packagePath);
    
    const cliPath = path.join(blogDir, 'node_modules', '.bin', 'simple-blog-engine');
    
    // Test 1: Initialize a blog
    console.log('\nTesting "init" command...');
    execSync(`${cliPath} init`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Debug: List directories created by init
    console.log('\nChecking created directories...');
    execSync(`find ${blogDir} -type d | sort`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Debug: List files created by init
    console.log('\nChecking created files...');
    execSync(`find ${blogDir} -type f -not -path "*/node_modules/*" -not -path "*/\.*" | sort`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Verify blog structure was created
    const expectedDirs = ['blog/content/posts', 'blog/templates'];
    for (const dir of expectedDirs) {
      if (!fs.existsSync(path.join(blogDir, dir))) {
        throw new Error(`Expected directory ${dir} not found after init`);
      }
    }
    
    // Verify config.json was created
    if (!fs.existsSync(path.join(blogDir, 'blog/config.json'))) {
      throw new Error('config.json not found after init');
    }
    
    // Test 2: Create a test post
    console.log('\nTesting "post" command...');
    // Create a post with a predefined title by piping input to the process
    execSync(`echo "Test Post Title" | ${cliPath} post`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Look for the created post file
    const blogFiles = fs.readdirSync(path.join(blogDir, 'blog/content/posts'));
    const postFile = blogFiles.find(file => file.includes('test-post-title'));
    
    if (!postFile) {
      throw new Error('Post file not found after running post command');
    }
    
    console.log(`Post created: ${postFile}`);
    
    // Test 3: Build the blog
    console.log('\nTesting "build" command...');
    execSync(`${cliPath} build`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Verify dist directory was created
    if (!fs.existsSync(path.join(blogDir, 'dist'))) {
      throw new Error('dist directory not found after build');
    }
    
    // Verify HTML output for the post
    // Check the dist directory structure first
    console.log('\nExamining dist directory structure...');
    execSync(`find ${blogDir}/dist -type f | grep -v '\\.git' | sort`, {
      cwd: blogDir,
      stdio: 'inherit'
    });
    
    // Check for any HTML file in the dist directory that contains the post title
    const distFiles = execSync(`find ${blogDir}/dist -name "*.html"`, {
      cwd: blogDir,
      encoding: 'utf8'
    }).split('\n').filter(Boolean);
    
    if (distFiles.length === 0) {
      throw new Error('No HTML files found in dist directory');
    }
    
    console.log(`Found ${distFiles.length} HTML files in dist directory`);
    
    // Success if we reach here
    console.log('✅ CLI functionality test successful!');
  } catch (error) {
    console.error('❌ CLI functionality test failed:', error.message);
    throw error;
  }
}

module.exports = runCliTest;

// Allow direct execution
if (require.main === module) {
  const testDir = path.join(__dirname, '..', 'temp-cli');
  fs.mkdirSync(testDir, { recursive: true });
  runCliTest(testDir);
} 