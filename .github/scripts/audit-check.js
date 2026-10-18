#!/usr/bin/env node

/**
 * Security Audit Check
 *
 * Fails CI if new moderate/high severity vulnerabilities are found,
 * while allowing documented accepted risks from SECURITY.md
 */

const { execSync } = require('child_process');

// Accepted vulnerabilities (documented in SECURITY.md)
const ACCEPTED_GHSAS = [
  // xlsx - HIGH severity
  'GHSA-4r6h-8v6p-xvw6', // Prototype Pollution
  'GHSA-5pgg-2g8v-p4x9', // ReDoS

  // postcss - MODERATE & HIGH severity (bundled with Next.js)
  // Fix requires major version upgrade to Next.js 16.x (breaking change)
  'GHSA-qx2v-qp2m-jg93', // XSS via Unescaped </style> in CSS Stringify Output
  'GHSA-6g55-p6wh-862q', // Arbitrary file read via attacker-controlled sourceMappingURL
  'GHSA-r28c-9q8g-f849', // Path traversal in sourceMappingURL auto-loading
  'GHSA-fxqj-rqcc-2cmp', // Incomplete fix of source map reading vulnerability

  // uuid - MODERATE severity (via exceljs)
  // Fix requires downgrading exceljs to 3.4.0 (breaking change)
  'GHSA-w5hq-g745-h8pq', // Missing buffer bounds check in v3/v5/v6 when buf is provided

  // braces, postcss-selector-parser, sprintf-js - transitive dev/build deps, no non-breaking fix
  'GHSA-vfj7-8cjw-p6xm', // braces: stack exhaustion via deeply nested patterns
  'GHSA-rj75-hqrm-r3gf', // postcss-selector-parser: quadratic complexity CPU exhaustion
  'GHSA-hp3w-g68c-fv3c', // sprintf-js: DoS via unbounded precision specifiers
];

const SEVERITY_LEVELS = ['moderate', 'high', 'critical'];

console.log('🔍 Running security audit...\n');

try {
  // Run npm audit with JSON output
  const auditOutput = execSync('npm audit --json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const auditData = JSON.parse(auditOutput);

  // Check if there are any vulnerabilities
  if (!auditData.vulnerabilities || Object.keys(auditData.vulnerabilities).length === 0) {
    console.log('✅ No vulnerabilities found!\n');
    process.exit(0);
  }

  // Filter for moderate/high/critical severity
  const relevantVulns = [];

  for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
    if (SEVERITY_LEVELS.includes(vulnData.severity)) {
      // Get all advisory IDs (GHSAs)
      const advisories = vulnData.via.filter(v => typeof v === 'object' && v.source);

      for (const advisory of advisories) {
        const ghsaId = advisory.url?.match(/GHSA-[a-z0-9-]+/i)?.[0];

        if (ghsaId && !ACCEPTED_GHSAS.includes(ghsaId)) {
          relevantVulns.push({
            package: packageName,
            severity: vulnData.severity,
            ghsa: ghsaId,
            title: advisory.title,
            url: advisory.url,
            range: vulnData.range
          });
        }
      }
    }
  }

  // Report findings
  console.log('📊 Audit Summary:');
  console.log(`   Total vulnerabilities: ${Object.keys(auditData.vulnerabilities).length}`);
  console.log(`   Accepted (documented): ${ACCEPTED_GHSAS.length} GHSAs`);
  console.log(`   New moderate/high/critical: ${relevantVulns.length}\n`);

  if (relevantVulns.length === 0) {
    console.log('✅ All moderate/high severity vulnerabilities are documented and accepted');
    console.log('   See SECURITY.md for details\n');
    process.exit(0);
  }

  // New vulnerabilities found - fail the build
  console.error('❌ NEW VULNERABILITIES DETECTED\n');
  console.error('The following moderate/high severity vulnerabilities are not in the accepted list:\n');

  // Group by severity
  const bySeverity = {};
  for (const vuln of relevantVulns) {
    if (!bySeverity[vuln.severity]) {
      bySeverity[vuln.severity] = [];
    }
    bySeverity[vuln.severity].push(vuln);
  }

  // Print by severity (critical first, then high, then moderate)
  for (const severity of ['critical', 'high', 'moderate']) {
    const vulns = bySeverity[severity];
    if (!vulns) continue;

    console.error(`${severity.toUpperCase()} Severity:`);
    for (const vuln of vulns) {
      console.error(`  - ${vuln.package} (${vuln.ghsa})`);
      console.error(`    ${vuln.title}`);
      console.error(`    ${vuln.url}`);
      console.error(`    Range: ${vuln.range}\n`);
    }
  }

  console.error('Action required:');
  console.error('1. Run "npm audit fix" to attempt automatic fixes');
  console.error('2. If no fix is available, assess the risk and either:');
  console.error('   a) Add the GHSA to ACCEPTED_GHSAS in .github/scripts/audit-check.js');
  console.error('   b) Document the accepted risk in SECURITY.md');
  console.error('   c) Find an alternative package\n');

  process.exit(1);

} catch (error) {
  if (error.status === 1 && error.stdout) {
    // npm audit returns exit code 1 when vulnerabilities are found
    // Re-run the script logic with the stdout
    try {
      const auditData = JSON.parse(error.stdout);

      // Check if there are any vulnerabilities
      if (!auditData.vulnerabilities || Object.keys(auditData.vulnerabilities).length === 0) {
        console.log('✅ No vulnerabilities found!\n');
        process.exit(0);
      }

      // Filter for moderate/high/critical severity
      const relevantVulns = [];

      for (const [packageName, vulnData] of Object.entries(auditData.vulnerabilities)) {
        if (SEVERITY_LEVELS.includes(vulnData.severity)) {
          const advisories = vulnData.via.filter(v => typeof v === 'object' && v.source);

          for (const advisory of advisories) {
            const ghsaId = advisory.url?.match(/GHSA-[a-z0-9-]+/i)?.[0];

            if (ghsaId && !ACCEPTED_GHSAS.includes(ghsaId)) {
              relevantVulns.push({
                package: packageName,
                severity: vulnData.severity,
                ghsa: ghsaId,
                title: advisory.title,
                url: advisory.url,
                range: vulnData.range
              });
            }
          }
        }
      }

      // Report findings
      console.log('📊 Audit Summary:');
      console.log(`   Total vulnerabilities: ${Object.keys(auditData.vulnerabilities).length}`);
      console.log(`   Accepted (documented): ${ACCEPTED_GHSAS.length} GHSAs`);
      console.log(`   New moderate/high/critical: ${relevantVulns.length}\n`);

      if (relevantVulns.length === 0) {
        console.log('✅ All moderate/high severity vulnerabilities are documented and accepted');
        console.log('   See SECURITY.md for details\n');
        process.exit(0);
      }

      // New vulnerabilities found - fail the build
      console.error('❌ NEW VULNERABILITIES DETECTED\n');
      console.error('The following moderate/high severity vulnerabilities are not in the accepted list:\n');

      // Group by severity
      const bySeverity = {};
      for (const vuln of relevantVulns) {
        if (!bySeverity[vuln.severity]) {
          bySeverity[vuln.severity] = [];
        }
        bySeverity[vuln.severity].push(vuln);
      }

      // Print by severity
      for (const severity of ['critical', 'high', 'moderate']) {
        const vulns = bySeverity[severity];
        if (!vulns) continue;

        console.error(`${severity.toUpperCase()} Severity:`);
        for (const vuln of vulns) {
          console.error(`  - ${vuln.package} (${vuln.ghsa})`);
          console.error(`    ${vuln.title}`);
          console.error(`    ${vuln.url}`);
          console.error(`    Range: ${vuln.range}\n`);
        }
      }

      console.error('Action required:');
      console.error('1. Run "npm audit fix" to attempt automatic fixes');
      console.error('2. If no fix is available, assess the risk and either:');
      console.error('   a) Add the GHSA to ACCEPTED_GHSAS in .github/scripts/audit-check.js');
      console.error('   b) Document the accepted risk in SECURITY.md');
      console.error('   c) Find an alternative package\n');

      process.exit(1);
    } catch (parseError) {
      console.error('Error parsing npm audit output:', parseError.message);
      console.error('Raw output:', error.stdout);
      process.exit(1);
    }
  } else {
    console.error('Error running npm audit:', error.message);
    process.exit(1);
  }
}
