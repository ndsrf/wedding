# Fixing OAuth Authentication in Vercel Preview Deployments

## The Problem

When Vercel creates preview deployments for pull requests, it generates dynamic URLs like:
- `your-app-git-branch-team.vercel.app`
- `your-app-pr-123-team.vercel.app`

OAuth providers (Google and Facebook) require pre-configured callback URLs. Since these preview URLs are dynamic, authentication fails because they're not whitelisted.

## Recommended Solution: Separate OAuth Apps for Preview

The best approach is to use **separate OAuth credentials** for production vs preview environments.

### Step 1: Create Preview OAuth Apps

#### Google OAuth (for Previews)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Configure:
   - **Application type**: Web application
   - **Name**: "Wedding App - Preview/Development"
   - **Authorized JavaScript origins**:
     - `https://*.vercel.app`
   - **Authorized redirect URIs**:
     - `https://*.vercel.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
4. Click **"Create"** and save the Client ID and Client Secret

**Note:** Google supports wildcard domains for `.vercel.app`, making this perfect for preview deployments!

#### Facebook OAuth (for Previews) - Optional

Facebook does **NOT support wildcard domains**, so you have two choices:

**Option A: Disable Facebook for Preview Environments** (Easiest)
- Simply don't configure Facebook credentials for preview
- Set `NEXT_PUBLIC_FACEBOOK_ENABLED=false` in Vercel preview environment variables
- Your code already handles this gracefully - the Facebook login button won't show

**Option B: Create a Facebook Test App**
1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Create a test app or development app
3. You'll need to manually add each preview URL to "Valid OAuth Redirect URIs" in Settings → Basic → Add Platform → Website
4. This is tedious and not recommended

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

## Alternative Solution: Add Wildcard to Existing Google App

If you want to use the **same Google OAuth app** for both production and preview:

1. Go to your existing Google OAuth Client
2. Edit **Authorized redirect URIs**
3. Add: `https://*.vercel.app/api/auth/callback/google`
4. Save

This allows all Vercel preview deployments to use your production Google OAuth app.

**Pros:** Simple, one OAuth app for everything
**Cons:** Less secure (preview and production share credentials)

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

## Summary

**Quick Setup:**
1. ✅ Create a preview Google OAuth app with wildcard redirect URI: `https://*.vercel.app/api/auth/callback/google`
2. ✅ Add preview OAuth credentials to Vercel with environment scope: **Preview**
3. ✅ Set `NEXT_PUBLIC_FACEBOOK_ENABLED=false` for preview environments
4. ✅ Ensure `AUTH_TRUST_HOST=true` is set for all environments
5. ✅ Don't set `NEXTAUTH_URL` for preview environments (let NextAuth auto-detect)

That's it! Your preview deployments should now support Google OAuth authentication.
