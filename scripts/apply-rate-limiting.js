/**
 * Apply Rate Limiting to All API Routes
 * This script systematically applies rate limiting middleware to API routes
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Statistics
let processed = 0;
let skipped = 0;
let failed = 0;
const failedFiles = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Check if file should be excluded from rate limiting
function shouldSkip(filePath) {
  const excluded = [
    'app/api/health/route.ts',
    'app/api/webhooks/stripe/route.ts',
    'app/api/cron/calculate-usage/route.ts',
    'app/api/upload/cron/route.ts',
    'app/api/auth/[...nextauth]/route.ts',
  ];

  return excluded.some(pattern => filePath.includes(pattern.replace(/\//g, path.sep)));
}

// Check if file already has rate limiting
function hasRateLimiting(content) {
  return content.includes('rateLimited') || content.includes('withRateLimit');
}

// Apply rate limiting transformation
async function applyRateLimiting(filePath) {
  try {
    log(`Processing: ${filePath}`, colors.cyan);

    // Read file
    let content = await readFile(filePath, 'utf8');

    // Check if already has rate limiting
    if (hasRateLimiting(content)) {
      log(`  ✓ Already has rate limiting`, colors.yellow);
      skipped++;
      return;
    }

    // Create backup
    await writeFile(`${filePath}.backup`, content);

    // Find HTTP methods in file
    const methods = [];
    if (content.match(/export\s+async\s+function\s+GET/)) methods.push('GET');
    if (content.match(/export\s+async\s+function\s+POST/)) methods.push('POST');
    if (content.match(/export\s+async\s+function\s+PUT/)) methods.push('PUT');
    if (content.match(/export\s+async\s+function\s+DELETE/)) methods.push('DELETE');
    if (content.match(/export\s+async\s+function\s+PATCH/)) methods.push('PATCH');

    if (methods.length === 0) {
      log(`  ⚠ No exported HTTP methods found`, colors.yellow);
      skipped++;
      return;
    }

    // 1. Add import if not present
    if (!content.includes('from "@/middleware/with-rate-limit"')) {
      // Find the last import statement
      const imports = content.match(/^import\s+.*$/gm) || [];
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        content = content.replace(
          lastImport,
          `${lastImport}\nimport { rateLimited } from "@/middleware/with-rate-limit";`
        );
      } else {
        // Add at the beginning
        content = `import { rateLimited } from "@/middleware/with-rate-limit";\n\n${content}`;
      }
    }

    // 2. Update NextResponse import to include NextRequest
    if (content.includes('from "next/server"') && !content.includes('NextRequest')) {
      content = content.replace(
        /import\s+{\s*NextResponse\s*}\s+from\s+["']next\/server["']/,
        'import { NextRequest, NextResponse } from "next/server"'
      );
    }

    // 3. Convert exported functions to internal handlers
    methods.forEach(method => {
      const pattern = new RegExp(`export\\s+async\\s+function\\s+${method}`, 'g');
      content = content.replace(pattern, `async function handle${method}`);

      // Update request parameter type
      content = content.replace(
        new RegExp(`async\\s+function\\s+handle${method}\\s*\\(\\s*req:\\s*Request`, 'g'),
        `async function handle${method}(req: NextRequest`
      );
    });

    // 4. Add rate-limited exports at the end
    const exports = methods.map(method =>
      `export const ${method} = rateLimited(handle${method});`
    ).join('\n');

    // Add exports before the last closing brace or at the end
    const exportComment = '\n// Apply rate limiting to all endpoints\n';
    content = content.trimEnd() + '\n' + exportComment + exports + '\n';

    // Write updated content
    await writeFile(filePath, content);

    log(`  ✓ Applied rate limiting (${methods.join(', ')})`, colors.green);
    processed++;

  } catch (error) {
    log(`  ✗ Failed: ${error.message}`, colors.red);
    failed++;
    failedFiles.push({ file: filePath, error: error.message });

    // Restore backup if it exists
    try {
      const backup = await readFile(`${filePath}.backup`, 'utf8');
      await writeFile(filePath, backup);
      log(`    Restored from backup`, colors.yellow);
    } catch (restoreError) {
      log(`    Could not restore backup`, colors.red);
    }
  }
}

// Recursively find all route.ts files
async function findRouteFiles(dir, files = []) {
  const items = await readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const itemStat = await stat(fullPath);

    if (itemStat.isDirectory()) {
      await findRouteFiles(fullPath, files);
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Apply Rate Limiting Script

Usage: node scripts/apply-rate-limiting.js [OPTIONS]

OPTIONS:
    -h, --help      Show this help message
    --dry-run       Show what would be changed without applying
    --rollback      Restore all files from .backup files

WHAT IT DOES:
    1. Adds rate limiting imports to each route file
    2. Converts exported functions to internal handlers
    3. Wraps handlers with rateLimited() middleware
    4. Preserves all existing functionality

EXAMPLES:
    node scripts/apply-rate-limiting.js           # Apply rate limiting
    node scripts/apply-rate-limiting.js --dry-run # Preview changes
    node scripts/apply-rate-limiting.js --rollback # Undo changes
    `);
    process.exit(0);
  }

  if (args.includes('--rollback')) {
    log('Rolling back changes...', colors.yellow);
    const apiDir = path.join(process.cwd(), 'app', 'api');
    const allFiles = await findRouteFiles(apiDir);

    for (const file of allFiles) {
      try {
        const backupPath = `${file}.backup`;
        if (fs.existsSync(backupPath)) {
          const backup = await readFile(backupPath, 'utf8');
          await writeFile(file, backup);
          fs.unlinkSync(backupPath);
          log(`  Restored: ${file}`, colors.green);
        }
      } catch (error) {
        log(`  Failed to restore: ${file}`, colors.red);
      }
    }
    log('Rollback complete', colors.green);
    process.exit(0);
  }

  log('╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║      NextCRM Rate Limiting Application Script           ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  const apiDir = path.join(process.cwd(), 'app', 'api');

  if (!fs.existsSync(apiDir)) {
    log('Error: app/api directory not found', colors.red);
    log('Please run this script from the project root directory', colors.red);
    process.exit(1);
  }

  // Find all route files
  log('\nFinding API route files...', colors.cyan);
  const routeFiles = await findRouteFiles(apiDir);
  log(`Found ${routeFiles.length} route files\n`, colors.cyan);

  // Dry run mode
  if (args.includes('--dry-run')) {
    log('DRY RUN MODE - No files will be modified\n', colors.yellow);
    for (const file of routeFiles) {
      const relativePath = path.relative(process.cwd(), file);
      if (shouldSkip(file)) {
        log(`  [SKIP] ${relativePath}`, colors.yellow);
      } else {
        const content = await readFile(file, 'utf8');
        if (hasRateLimiting(content)) {
          log(`  [HAS]  ${relativePath}`, colors.green);
        } else {
          log(`  [TODO] ${relativePath}`, colors.cyan);
        }
      }
    }
    process.exit(0);
  }

  // Process each file
  for (const file of routeFiles) {
    const relativePath = path.relative(process.cwd(), file);

    if (shouldSkip(file)) {
      log(`Skipping (excluded): ${relativePath}`, colors.yellow);
      skipped++;
      continue;
    }

    await applyRateLimiting(file);
  }

  // Summary
  log('\n╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log(`║  Processed: ${processed.toString().padStart(3)}                                    ║`, colors.green);
  log(`║  Skipped:   ${skipped.toString().padStart(3)}                                    ║`, colors.yellow);
  log(`║  Failed:    ${failed.toString().padStart(3)}                                    ║`, colors.red);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  if (failed > 0) {
    log('\nFailed files:', colors.red);
    failedFiles.forEach(({ file, error }) => {
      log(`  ${path.relative(process.cwd(), file)}: ${error}`, colors.red);
    });
  }

  // Cleanup backups if all successful
  if (failed === 0 && processed > 0) {
    log('\nCleaning up backup files...', colors.cyan);
    for (const file of routeFiles) {
      const backupPath = `${file}.backup`;
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    }
    log('Cleanup complete', colors.green);
  } else if (failed > 0) {
    log('\nBackup files retained for failed operations', colors.yellow);
  }

  log('\nRate limiting application complete!', colors.green);
}

// Run the script
main().catch(error => {
  log(`Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
