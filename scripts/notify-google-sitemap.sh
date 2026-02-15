#!/bin/bash

# Notify Google Search Console about sitemap updates
# Run this script after publishing new articles to speed up indexing

BASE_URL="${NEXT_PUBLIC_BASE_URL:-https://nupci.com}"
SITEMAP_URL="${BASE_URL}/sitemap.xml"

echo "🔔 Notifying Google about sitemap update..."
echo "Sitemap URL: $SITEMAP_URL"

# Ping Google
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://www.google.com/ping?sitemap=${SITEMAP_URL}")

if [ "$RESPONSE" -eq 200 ]; then
  echo "✅ Successfully notified Google!"
  echo "Google will crawl your sitemap soon."
else
  echo "⚠️  Notification returned status: $RESPONSE"
  echo "You can also manually submit at:"
  echo "https://search.google.com/search-console"
fi

echo ""
echo "📊 To manually submit in Google Search Console:"
echo "1. Go to: https://search.google.com/search-console"
echo "2. Select your property"
echo "3. Navigate to: Sitemaps (left menu)"
echo "4. Click 'View details' on your sitemap"
echo "5. Google will re-crawl automatically"
