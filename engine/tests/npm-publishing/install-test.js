/**
 * Installation Test
 * Tests that the package can be correctly installed and the CLI is available
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Run installation tests
 * @param {string} baseTestDir - Base directory for tests
 */
function runInstallationTest(baseTestDir) {
  // Create test directory for installation test
  const testDir = path.join(baseTestDir, 'install-test');
  fs.mkdirSync(testDir, { recursive: true });
  
  // Get the path to the package root (2 levels up from this file)
  const packageRoot = path.resolve(__dirname, '..', '..');
  
  try {
    console.log('Packing the package...');
    // Change to package root and run npm pack
    const packOutput = execSync('npm pack', { 
      cwd: packageRoot,
      encoding: 'utf8'
    });
    
    // Extract the filename from npm pack output
    const packageFilename = packOutput.trim().split('\n').pop();
    const packagePath = path.join(packageRoot, packageFilename);
    
    console.log(`Package created: ${packageFilename}`);
    
    // Move the package to the test directory
    fs.copyFileSync(packagePath, path.join(testDir, packageFilename));
    fs.unlinkSync(packagePath); // Remove the original file
    
    // Create a test package.json
    const testPackageJson = {
      name: "blog-engine-test",
      version: "1.0.0",
      private: true,
      description: "Test package for simple-blog-engine",
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(testPackageJson, null, 2)
    );
    
    // Install the package locally
    console.log('Installing the package...');
    execSync(`npm install ${packageFilename}`, {
      cwd: testDir,
      stdio: 'inherit'
    });
    
    // Verify the CLI command is available
    console.log('Verifying CLI command...');
    const nodeModulesBin = path.join(testDir, 'node_modules', '.bin');
    const cliExists = fs.existsSync(path.join(nodeModulesBin, 'simple-blog-engine'));
    
    if (!cliExists) {
      throw new Error('CLI command not found in node_modules/.bin');
    }
    
    // Test running the CLI to get version
    const cliPath = path.join(nodeModulesBin, 'simple-blog-engine');
    const versionOutput = execSync(`${cliPath} --version`, {
      encoding: 'utf8'
    }).trim();
    
    console.log(`CLI version: ${versionOutput}`);
    
    // Verify expected version is returned
    if (!versionOutput.match(/^\d+\.\d+\.\d+$/)) {
      throw new Error(`Invalid version format: ${versionOutput}`);
    }
    
    console.log('✅ Installation test successful!');
  } catch (error) {
    console.error('❌ Installation test failed:', error.message);
    throw error;
  }
}

module.exports = runInstallationTest;

// Allow direct execution
if (require.main === module) {
  const testDir = path.join(__dirname, '..', 'temp-install');
  fs.mkdirSync(testDir, { recursive: true });
  runInstallationTest(testDir);
} 