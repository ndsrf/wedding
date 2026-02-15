# Sitemap Management Guide

## 🔄 How the Sitemap Auto-Updates

Your sitemap is **dynamically generated** and automatically includes:

- ✅ All static pages (home, about, contact, docs, news, privacy)
- ✅ All AMP versions of static pages
- ✅ **All news articles** (fetched from markdown files)
- ✅ AMP versions of all news articles
- ✅ All 5 supported locales (en, es, fr, it, de)

### Automatic Updates

When you **add a new article**:

1. Create your markdown file in `/content/news/[locale]/[article-slug].md`
2. The sitemap will **automatically include it** within 1 hour
3. No manual updates needed!

**How it works:** The `sitemap.ts` file calls `getAllArticles()` which scans your markdown files dynamically.

---

## ⏱️ Revalidation Settings

The sitemap regenerates every **1 hour** (3600 seconds):

```typescript
export const revalidate = 3600
```

### Adjust Revalidation Period

Edit `src/app/sitemap.ts` and change the `revalidate` value:

```typescript
// Update every 30 minutes
export const revalidate = 1800

// Update every 6 hours
export const revalidate = 21600

// Update on every request (not recommended for production)
export const revalidate = 0
```

**Recommended:** Keep at 3600 (1 hour) for a good balance between freshness and performance.

---

## 🚀 Notify Google About Updates

### Option 1: Automatic (Recommended)

Google will discover updates automatically within 24-48 hours through:
- Regular crawling schedule
- Sitemap revalidation

### Option 2: Manual Notification Script

After publishing new articles, run:

```bash
bash scripts/notify-google-sitemap.sh
```

This pings Google to re-crawl your sitemap immediately.

### Option 3: Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Navigate to **Sitemaps** (left menu)
3. Your sitemap will show when it was last read
4. Google re-crawls automatically, but you can also:
   - Remove and re-submit the sitemap
   - Use the URL Inspection tool to request indexing of specific URLs

---

## 📝 Adding New Pages (Non-News)

If you add a **new static page** (not a news article):

### 1. Update the Sitemap

Edit `src/app/sitemap.ts`:

```typescript
const staticPages = [
  '',           // Home
  '/about',
  '/contact',
  '/docs',
  '/news',
  '/privacy',
  '/your-new-page',  // ← Add here
]
```

### 2. Add AMP Version (if applicable)

If your new page has an AMP version, it will be automatically included (the loop handles both versions).

### 3. Deploy and Notify

After deploying, optionally run:
```bash
bash scripts/notify-google-sitemap.sh
```

---

## 🔍 Verify Sitemap Contents

### Check Locally (Development)

```bash
npm run dev
# Visit: http://localhost:3000/sitemap.xml
```

### Check Production

```bash
curl https://nupci.com/sitemap.xml
# Or visit in browser: https://nupci.com/sitemap.xml
```

### Validate Sitemap

Use Google's validator:
https://www.xml-sitemaps.com/validate-xml-sitemap.html

---

## 🐛 Troubleshooting

### Sitemap doesn't show new article

**Possible causes:**

1. **Cache not expired yet**
   - Wait up to 1 hour for revalidation
   - Or deploy again to force regeneration

2. **Article file issue**
   - Verify markdown file exists in correct location
   - Check file has proper frontmatter (title, date, etc.)
   - Look for errors in server logs

3. **Build issue**
   - Rebuild the application: `npm run build`
   - Check for build errors

### Force Sitemap Regeneration

```bash
# Option 1: Clear Next.js cache
rm -rf .next
npm run build

# Option 2: Deploy to production
git push origin main

# Option 3: Set revalidate to 0 temporarily
# (Don't forget to change it back!)
```

---

## 📊 Sitemap Structure

Your sitemap includes URLs in this format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Regular pages -->
  <url>
    <loc>https://nupci.com/en</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- AMP versions -->
  <url>
    <loc>https://nupci.com/en/amp</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- News articles -->
  <url>
    <loc>https://nupci.com/en/news/article-slug</loc>
    <lastmod>2026-02-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- ... more URLs ... -->
</urlset>
```

---

## 🎯 Best Practices

### When Publishing New Articles

1. ✅ Create the markdown file
2. ✅ Commit and deploy
3. ✅ Wait 1 hour (automatic) OR run notify script
4. ✅ Verify article appears in sitemap
5. ✅ (Optional) Request indexing in Search Console

### Regular Maintenance

- **Weekly:** Check Search Console for coverage issues
- **Monthly:** Verify all pages are indexed
- **After major updates:** Use the notify script

### Performance Tips

- Keep revalidation at 3600 seconds (1 hour)
- Don't set revalidate to 0 in production
- Monitor sitemap size (Google limit: 50MB or 50,000 URLs)

---

## 📈 Monitoring

### Google Search Console Metrics

Check these regularly:

1. **Coverage Report**
   - All pages should be "Valid"
   - Watch for "Excluded" pages

2. **Sitemap Status**
   - Shows last read date
   - Number of URLs discovered
   - Number indexed vs. submitted

3. **Performance Report**
   - Click-through rates
   - Impressions
   - Average position

---

## 🔗 Related Files

- `src/app/sitemap.ts` - Sitemap generator
- `src/app/robots.ts` - Robots.txt with sitemap reference
- `src/lib/news/markdown.ts` - Article fetching logic
- `scripts/notify-google-sitemap.sh` - Manual notification script

---

## ❓ Questions?

The sitemap is designed to be **zero-maintenance** for news articles. Just add markdown files and deploy - everything else is automatic!

For issues or questions, check the troubleshooting section above or review the Google Search Console documentation.
