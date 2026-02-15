# reCAPTCHA Setup Guide

The contact form on the website is protected by Google reCAPTCHA v3 to prevent spam submissions.

## Why You Don't See the CAPTCHA

reCAPTCHA v3 is **invisible** - it works in the background without requiring users to click checkboxes or identify images. Instead, it:
- Runs silently when users visit the contact page
- Analyzes user behavior to detect bots
- Shows a small badge in the bottom-right corner (when properly configured)
- Scores each submission from 0.0 (likely bot) to 1.0 (likely human)

## Required Setup for Vercel Deployment

To enable reCAPTCHA protection on your Vercel deployment, you need to:

### 1. Get reCAPTCHA Keys from Google

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"+"** to create a new site
3. Fill in the form:
   - **Label**: Your site name (e.g., "Nupci Contact Form")
   - **reCAPTCHA type**: Select **reCAPTCHA v3**
   - **Domains**: Add your domain (e.g., `nupci.com`, `yourdomain.vercel.app`)
     - For testing, you can also add `localhost`
   - Accept the terms and click **Submit**
4. You'll receive two keys:
   - **Site Key** (starts with `6L...`) - This is public and goes in the frontend
   - **Secret Key** (starts with `6L...`) - This is private and goes in the backend

### 2. Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these two variables:

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Your site key from step 1 | Production, Preview, Development |
   | `RECAPTCHA_SECRET_KEY` | Your secret key from step 1 | Production, Preview, Development |

4. Click **Save**

### 3. Redeploy Your Application

After adding the environment variables:
1. Go to the **Deployments** tab in Vercel
2. Click on the latest deployment
3. Click the **⋯** menu and select **Redeploy**
4. Or simply push a new commit to trigger a deployment

### 4. Verify It's Working

Once deployed with the environment variables:

1. **Check the browser console** when visiting `/contact`:
   ```
   ✅ reCAPTCHA v3 initialized with site key
   ✅ reCAPTCHA is ready on contact page
   ```

2. **Look for the reCAPTCHA badge** in the bottom-right corner of the page:
   - You should see a small floating badge that says "protected by reCAPTCHA"

3. **Check the form**:
   - Below the submit button, you should see: "🛡️ Protected by reCAPTCHA"

4. **Submit a test form**:
   - Fill out the contact form and submit
   - If reCAPTCHA is working, the form should submit successfully
   - Check your server logs - you should see the reCAPTCHA verification

### 5. Troubleshooting

**"reCAPTCHA not initialized" in console:**
- The environment variables are not set in Vercel
- Solution: Add the variables as described in step 2 and redeploy

**"reCAPTCHA verification failed" on form submission:**
- Your domain is not added to the allowed domains in reCAPTCHA admin
- Solution: Add your Vercel domain to the reCAPTCHA site configuration

**No badge visible:**
- Environment variable is not set or has incorrect value
- Check browser console for errors
- Verify the site key is correct (starts with `6L...`)

**Forms are being blocked (score too low):**
- The current threshold is 0.5 (configurable in `src/app/(public)/api/contact/route.ts`)
- Lower the threshold if legitimate users are being blocked
- Check reCAPTCHA admin console for score analytics

## How the Score Threshold Works

The implementation uses a score threshold of **0.5**:
- **1.0** = Very likely a legitimate user
- **0.5** = Medium confidence (our threshold)
- **0.0** = Very likely a bot

You can adjust this threshold in `src/app/(public)/api/contact/route.ts`:
```typescript
if (data.success && data.score >= 0.5) {  // Change this value
  return true;
}
```

## Testing in Development

For local development:
1. Add the same environment variables to your `.env` file
2. Make sure to add `localhost` to your reCAPTCHA domain list
3. Restart your development server (`npm run dev`)

## Security Notes

- ⚠️ **Never commit** the `RECAPTCHA_SECRET_KEY` to git
- ✅ The site key (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`) is safe to expose in the frontend
- 🔒 All verification happens server-side - clients cannot bypass it
- 📊 Monitor your reCAPTCHA admin console for suspicious activity

## Additional Resources

- [Google reCAPTCHA Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
