# CI/CD Scripts

This directory contains scripts used by GitHub Actions workflows.

## audit-check.js

Security audit script that enforces vulnerability policies.

### Purpose

- Runs `npm audit` and checks for moderate/high/critical severity vulnerabilities
- **Allows** documented accepted risks (listed in `ACCEPTED_GHSAS`)
- **Fails** the build if any new moderate/high/critical vulnerabilities are found
- Provides clear feedback on what needs to be done

### How It Works

1. Runs `npm audit --json` to get structured vulnerability data
2. Filters for moderate, high, and critical severity issues
3. Extracts GHSA identifiers from each advisory
4. Compares against the `ACCEPTED_GHSAS` allowlist
5. Exits 0 (success) if all findings are accepted, or 1 (failure) if new issues are found

### When a New Vulnerability Is Detected

The script will fail the build and provide instructions:

```
❌ NEW VULNERABILITIES DETECTED

The following moderate/high severity vulnerabilities are not in the accepted list:

HIGH Severity:
  - package-name (GHSA-xxxx-xxxx-xxxx)
    Vulnerability title
    https://github.com/advisories/GHSA-xxxx-xxxx-xxxx
    Range: >=1.0.0

Action required:
1. Run "npm audit fix" to attempt automatic fixes
2. If no fix is available, assess the risk and either:
   a) Add the GHSA to ACCEPTED_GHSAS in .github/scripts/audit-check.js
   b) Document the accepted risk in SECURITY.md
   c) Find an alternative package
```

### Adding Accepted Vulnerabilities

If you've assessed a vulnerability and determined it's acceptable:

1. **Document the risk** in `/SECURITY.md`:
   - Add the vulnerability to the appropriate severity section
   - Include the GHSA ID, package name, and CVE links
   - Explain why it's accepted (usage context, mitigations)
   - Note any future remediation plans

2. **Update the allowlist** in this script:
   - Add the GHSA ID to the `ACCEPTED_GHSAS` array
   - Add a comment explaining which package/issue it's for

Example:
```javascript
const ACCEPTED_GHSAS = [
  // xlsx - HIGH severity
  'GHSA-4r6h-8v6p-xvw6', // Prototype Pollution
  'GHSA-5pgg-2g8v-p4x9', // ReDoS

  // your-package - MODERATE severity
  'GHSA-your-new-ghsa', // Brief description
];
```

3. **Commit both changes together** so the documentation stays in sync

### Testing Locally

Run the script locally before pushing:

```bash
node .github/scripts/audit-check.js
```

This will show the same output as the CI pipeline would see.

### Maintenance

- **Review quarterly**: Check if accepted vulnerabilities have fixes available
- **Update when dependencies change**: Run after major version updates
- **Remove obsolete entries**: When upgrading packages, remove their old GHSAs from the list
