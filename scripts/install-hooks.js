#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Git hooks directory
const gitHooksDir = path.join(__dirname, '..', '.git', 'hooks');
const preCommitHookPath = path.join(gitHooksDir, 'pre-commit');

// Content of the pre-commit hook
const preCommitHook = `#!/bin/sh
# Pre-commit hook to update version.ts based on commit message

# Stash any changes not being committed
git stash -q --keep-index

# Run the update-version script
node --experimental-modules scripts/update-version.js

# Add the updated version.ts file to the commit
git add src/version.ts

# Restore stashed changes
git stash pop -q

# Exit with success status
exit 0
`;

try {
  // Ensure the hooks directory exists
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  // Write the pre-commit hook
  fs.writeFileSync(preCommitHookPath, preCommitHook);

  // Make the hook executable
  try {
    execSync(`chmod +x ${preCommitHookPath}`);
    console.log('Git pre-commit hook installed successfully!');
  } catch (error) {
    console.log('Could not make the hook executable automatically.');
    console.log(`Please run: chmod +x ${preCommitHookPath}`);
  }

  // Add a script to package.json
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  packageJson.scripts['update-version'] = 'node scripts/update-version.js';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('Added "update-version" script to package.json');

  console.log('\nTo update the version manually, run:');
  console.log('  npm run update-version');
} catch (error) {
  console.error('Error installing Git hooks:', error.message);
  process.exit(1);
}
