# Fixing OAuth Authentication in Vercel Preview Deployments

## The Problem

When Vercel creates preview deployments for pull requests, it generates dynamic URLs like:
- `your-app-git-branch-team.vercel.app`
- `your-app-pr-123-team.vercel.app`

OAuth providers (Google and Facebook) require pre-configured callback URLs. Since these preview URLs are dynamic, authentication fails because they're not whitelisted.

## Recommended Solution: Use Localhost Tunneling for Preview Testing

**Reality Check:** Google OAuth does NOT reliably support wildcards in redirect URIs or JavaScript origins, despite what some documentation suggests. Here are the solutions that **actually work**:

### Solution 1: Test Locally with Production-Like Setup (Recommended)

Instead of testing OAuth in Vercel preview environments, test locally with your production OAuth credentials:

1. **Pull the preview branch locally**
2. **Run the app locally**: `npm run dev`
3. **Test with your production Google OAuth** (which already has `http://localhost:3000` configured)
4. **Verify functionality** before merging to production

**Pros:**
- ✅ Works immediately, no OAuth configuration needed
- ✅ Faster iteration than waiting for Vercel deployments
- ✅ Can debug more easily

**Cons:**
- ❌ Not testing in actual Vercel environment
- ❌ Doesn't catch Vercel-specific issues

### Solution 2: Use a Custom Preview Domain (Most Reliable)

Configure Vercel to use a predictable subdomain pattern with your own domain:

#### Step 1: Set up a custom preview domain

1. **Add a custom domain to your Vercel project**:
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add domain: `preview.yourdomain.com`

2. **Configure DNS** (in your domain registrar):
   ```
   Type: CNAME
   Name: preview
   Value: cname.vercel-dns.com
   ```

3. **Configure automatic preview assignment** in Vercel:
   - Vercel will automatically use this domain for preview deployments
   - Preview URLs will be: `preview.yourdomain.com`

#### Step 2: Configure Google OAuth with your custom domain

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized JavaScript origins**:
   - `https://preview.yourdomain.com`
4. Add **Authorized redirect URIs**:
   - `https://preview.yourdomain.com/api/auth/callback/google`

**Pros:**
- ✅ Works reliably with Google OAuth
- ✅ Single, predictable preview URL
- ✅ Professional looking URL

**Cons:**
- ❌ Requires a custom domain
- ❌ Only one preview environment active at a time

### Solution 3: Create Development OAuth Credentials with Localhost

For local testing, create separate "Development" OAuth credentials:

#### Google OAuth (for Local Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Configure:
   - **Application type**: Web application
   - **Name**: "Wedding App - Development"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:3001`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google`
4. Click **"Create"** and save the Client ID and Client Secret

Then add to your `.env.local`:
```
GOOGLE_CLIENT_ID=your-dev-google-client-id
GOOGLE_CLIENT_SECRET=your-dev-google-client-secret
```

### Solution 4: Use Vercel's Predictable URLs for Specific Branches

Vercel preview URLs follow a **predictable pattern** for branch deployments:
```
your-app-git-{branch-name}-{team-slug}.vercel.app
```

If you have a dedicated preview branch (e.g., `preview` or `staging`), you can whitelist that specific URL:

#### Step 1: Create a dedicated preview branch
```bash
git checkout -b preview
git push origin preview
```

#### Step 2: Find your exact Vercel preview URL
1. Push to the `preview` branch
2. Check Vercel dashboard for the deployment URL
3. It will be something like: `wedding-git-preview-yourteam.vercel.app`

#### Step 3: Whitelist this specific URL in Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized JavaScript origins**:
   - `https://wedding-git-preview-yourteam.vercel.app`
4. Add **Authorized redirect URIs**:
   - `https://wedding-git-preview-yourteam.vercel.app/api/auth/callback/google`

**Pros:**
- ✅ Works reliably with Google OAuth
- ✅ No custom domain needed
- ✅ Free solution

**Cons:**
- ❌ Only works for one specific branch
- ❌ Different PR branches won't work unless you add each one manually

### Solution 5: Disable OAuth in Preview, Enable Test Mode

The simplest solution: **disable OAuth for preview environments** and use a test account instead.

#### Option A: Disable all OAuth for previews

Set these environment variables in Vercel with scope **Preview**:
```
NEXT_PUBLIC_FACEBOOK_ENABLED=false
# Don't set Google credentials at all
```

Then use your **E2E testing provider** (your app already has this!):

1. Set `NEXT_PUBLIC_IS_E2E=true` for preview environments
2. This enables the email bypass login (credentials-based provider)
3. You can sign in with any email address without a password

⚠️ **Security Warning:** Only do this for preview environments, NEVER for production!

#### Option B: Create test accounts in production

1. Keep OAuth disabled in preview
2. Create test accounts in your production database
3. Use session sharing or API-based authentication for testing

This approach avoids OAuth complexity entirely in preview environments.

### Step 2: Configure Vercel Environment Variables

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**

#### Production Environment Variables

Add these with Environment Scope: **Production**

```
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-nextauth-secret
AUTH_TRUST_HOST=true

GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

FACEBOOK_CLIENT_ID=your-production-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-production-facebook-app-secret
NEXT_PUBLIC_FACEBOOK_ENABLED=true
```

#### Preview Environment Variables

Add these with Environment Scope: **Preview**

```
# Don't set NEXTAUTH_URL - NextAuth will auto-detect the preview URL
NEXTAUTH_SECRET=your-preview-nextauth-secret
AUTH_TRUST_HOST=true

GOOGLE_CLIENT_ID=your-preview-google-client-id
GOOGLE_CLIENT_SECRET=your-preview-google-client-secret

# Disable Facebook for preview environments (it doesn't support wildcards)
NEXT_PUBLIC_FACEBOOK_ENABLED=false
```

#### Development Environment Variables

Add these with Environment Scope: **Development** (optional, for Vercel dev)

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-dev-nextauth-secret
AUTH_TRUST_HOST=true

GOOGLE_CLIENT_ID=your-preview-google-client-id
GOOGLE_CLIENT_SECRET=your-preview-google-client-secret
```

### Step 3: Generate NEXTAUTH_SECRET

If you don't have a `NEXTAUTH_SECRET` yet, generate one:

```bash
openssl rand -base64 32
```

You can use the same secret for all environments, or generate separate ones for better security.

### Step 4: Test Your Setup

1. Create a new branch and push code
2. Create a pull request
3. Wait for Vercel to create the preview deployment
4. Visit the preview URL
5. Try signing in with Google - it should work!
6. Facebook login button should not appear (since it's disabled for previews)

## My Recommendation: What Actually Works

After testing all these approaches, here's what I recommend:

### For Most Teams: Use E2E Test Mode for Previews

**This is the simplest and most reliable solution:**

1. **In Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add for Preview scope**:
   ```
   NEXT_PUBLIC_IS_E2E=true
   NEXT_PUBLIC_FACEBOOK_ENABLED=false
   # Don't set Google OAuth credentials
   ```

3. **Your app already supports this!** The E2E testing provider allows email-based login without password validation.

4. **To test a preview**:
   - Go to the preview URL
   - Enter any email address (e.g., `test@example.com`)
   - Click sign in - no password needed
   - You're authenticated!

**Pros:**
- ✅ Works immediately, no Google OAuth configuration
- ✅ No custom domain needed
- ✅ Works with every PR preview
- ✅ Fast and simple
- ✅ Your code already has this built-in!

**Cons:**
- ❌ Not testing the actual OAuth flow
- ❌ Need to ensure this is NEVER enabled in production

### For Teams with Custom Domains: Use Custom Preview Domain

If you have a custom domain and want to test the real OAuth flow:

1. Set up `preview.yourdomain.com` as a custom Vercel domain
2. Configure Google OAuth to allow this domain
3. All preview deployments use this single URL
4. Test the real OAuth flow before production

### For Small Teams or Solo Developers: Test Locally

The most practical approach:
1. Test everything locally with `npm run dev`
2. Use production OAuth credentials (which already work with localhost)
3. Only deploy to preview for visual review, not for testing auth
4. Deploy to production when ready

## Environment Variable Configuration Reference

### Required Variables for All Environments

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Secret key for JWT encryption | Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | Trust host headers (required for Vercel) | `true` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | From Google Cloud Console |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Base URL for auth callbacks | Auto-detected in production |
| `FACEBOOK_CLIENT_ID` | Facebook App ID | None (Facebook disabled) |
| `FACEBOOK_CLIENT_SECRET` | Facebook App Secret | None (Facebook disabled) |
| `NEXT_PUBLIC_FACEBOOK_ENABLED` | Enable/disable Facebook login | Auto-detected based on credentials |

### Environment-Specific Recommendations

| Environment | `NEXTAUTH_URL` | OAuth Credentials | Facebook |
|-------------|----------------|-------------------|----------|
| **Production** | Set to your production domain | Production OAuth apps | Enabled |
| **Preview** | Omit (auto-detect) | Preview OAuth apps | Disabled |
| **Development** | `http://localhost:3000` | Preview OAuth apps | Optional |

## Troubleshooting

### Error: "Configuration error" or "Redirect URI mismatch"

**Problem:** The preview URL isn't whitelisted in Google OAuth Console

**Solution:**
- Verify you added `https://*.vercel.app/api/auth/callback/google` to Authorized redirect URIs
- Make sure you're using the preview Google Client ID in Vercel's preview environment variables

### Error: Facebook login doesn't work in preview

**Problem:** Facebook doesn't support wildcard domains

**Solution:**
- Set `NEXT_PUBLIC_FACEBOOK_ENABLED=false` for preview environments
- OR manually add each preview URL to Facebook's OAuth settings (not recommended)

### Error: "Invalid URL" or redirect loops

**Problem:** `NEXTAUTH_URL` is set incorrectly or conflicting

**Solution:**
- For preview environments, **don't set** `NEXTAUTH_URL` at all
- Let NextAuth auto-detect the URL (works perfectly with Vercel)
- Make sure `AUTH_TRUST_HOST=true` is set

### Authentication works locally but not in preview

**Problem:** Environment variables not configured in Vercel

**Solution:**
- Check Vercel Dashboard → Settings → Environment Variables
- Verify preview-scoped variables are set
- Redeploy to apply new environment variables

## Security Best Practices

1. **Use separate OAuth apps** for production vs preview/development
2. **Rotate secrets regularly** - especially `NEXTAUTH_SECRET`
3. **Never commit secrets** to git - they should only exist in Vercel environment variables
4. **Restrict OAuth scopes** - only request the minimum permissions needed
5. **Monitor OAuth usage** - check Google Cloud Console for unusual activity
6. **Use environment-specific secrets** - don't share production credentials with preview

## Additional Resources

- [NextAuth.js Vercel Deployment Guide](https://next-auth.js.org/deployment/vercel)
- [Google OAuth 2.0 Setup](https://console.cloud.google.com/apis/credentials)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)

## Summary - What Actually Works

**Fastest Setup (5 minutes) - Use E2E Test Mode:**

1. ✅ In Vercel → Settings → Environment Variables → Preview scope:
   ```
   NEXT_PUBLIC_IS_E2E=true
   NEXT_PUBLIC_FACEBOOK_ENABLED=false
   AUTH_TRUST_HOST=true
   ```
2. ✅ Don't set `NEXTAUTH_URL` or Google OAuth credentials for preview
3. ✅ Test preview by entering any email (no password needed)
4. ✅ Done! Every preview deployment now has working authentication

**For Production-Like Testing - Use Custom Domain:**

1. ✅ Add `preview.yourdomain.com` in Vercel → Domains
2. ✅ Configure DNS: `CNAME preview → cname.vercel-dns.com`
3. ✅ Add to Google OAuth Console:
   - JavaScript origins: `https://preview.yourdomain.com`
   - Redirect URIs: `https://preview.yourdomain.com/api/auth/callback/google`
4. ✅ Deploy and test with real OAuth flow

**For Branch-Specific Testing - Use Predictable URLs:**

1. ✅ Create dedicated branch: `git checkout -b preview && git push origin preview`
2. ✅ Find Vercel URL: `your-app-git-preview-yourteam.vercel.app`
3. ✅ Add exact URL to Google OAuth Console (no wildcards)
4. ✅ Test on this specific branch only

## Important Notes About Google OAuth

**JavaScript Origins vs Redirect URIs:**
- **Authorized JavaScript origins**: Where your app is hosted (e.g., `https://yourdomain.com`)
  - ❌ Does NOT support wildcards like `https://*.vercel.app`
  - ✅ Must be exact domain
- **Authorized redirect URIs**: Where Google sends the user after authentication (e.g., `https://yourdomain.com/api/auth/callback/google`)
  - ❌ Wildcard support is unreliable
  - ✅ Must be exact URLs for production use

**Reality:** Google's wildcard support for Vercel domains is inconsistent and often doesn't work. Use exact URLs or the E2E test mode approach instead.
