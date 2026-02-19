# How to Create New Articles

This guide explains how to create new articles for the news section of the wedding platform.

## Directory Structure

Articles are organized by language in the following structure:

```
src/content/news/
├── en/           # English articles
├── es/           # Spanish articles
├── de/           # German articles
├── fr/           # French articles
└── it/           # Italian articles
```

## Article File Format

Each article is a Markdown file (`.md`) with frontmatter metadata.

### File Naming Convention

Use lowercase with hyphens for the filename:
- `ai-whatsapp-invitations.md`
- `save-the-date-importance.md`
- `vendor-list-management.md`

### Required Frontmatter Fields

Every article must include the following frontmatter at the top of the file:

```markdown
---
title: "Your Article Title Here"
slug: "article-url-slug"
description: "A brief description of the article (1-2 sentences)"
author: "Author Name or Team"
date: "YYYY-MM-DD"
category: "Category Name"
image: "/images/news/image-filename.png"
readTime: "X min read"
locale: "language-code"
---
```

### Frontmatter Field Descriptions

- **title**: The main headline of the article (use title case)
- **slug**: URL-friendly identifier (should match filename without .md extension)
- **description**: Brief summary for SEO and previews (keep under 160 characters)
- **author**: Author name (e.g., "Nupci Editorial Team", "John Doe")
- **date**: Publication date in ISO format (YYYY-MM-DD)
- **category**: Article category (e.g., "Technology", "Communication", "Professional Tools")
- **image**: Path to the article's featured image (must be in `/images/news/` directory)
- **readTime**: Estimated reading time (e.g., "5 min read", "7 min read")
- **locale**: Two-letter language code matching the directory (en, es, de, fr, it)

## Creating a New Article

### Step 1: Prepare Your Content

1. Write your article content in Markdown format
2. Prepare a featured image and upload it to `/public/images/news/` (or similar image directory)
3. Calculate approximate reading time (average reading speed: 200-250 words/minute)

### Step 2: Create the Article File

1. Choose the appropriate language directory (e.g., `src/content/news/en/`)
2. Create a new `.md` file with a descriptive, URL-friendly name
3. Add the frontmatter metadata at the top of the file
4. Add your article content below the frontmatter

### Example Article Structure

```markdown
---
title: "Transform Your Wedding Invitations with AI"
slug: "ai-whatsapp-invitations"
description: "Discover how AI virtual assistants revolutionize wedding invitations through WhatsApp."
author: "Nupci Editorial Team"
date: "2026-02-19"
category: "Technology"
image: "/images/news/1771539005089.png"
readTime: "7 min read"
locale: "en"
---

Your article content starts here...

## First Section Heading

Content for the first section...

## Second Section Heading

More content...
```

### Step 3: Multi-Language Support

For articles that should appear in multiple languages:

1. Create the same article in each language directory
2. Keep the **slug** identical across all language versions
3. Update the **locale** field to match the directory (en, es, de, fr, it)
4. Translate the **title**, **description**, **readTime**, and all content
5. Keep the same **image** path across all versions
6. Use the same **date** for all language versions

### Example Multi-Language Setup

**English** (`src/content/news/en/ai-whatsapp-invitations.md`):
```markdown
---
title: "Transform Your Wedding Invitations with AI"
slug: "ai-whatsapp-invitations"
locale: "en"
readTime: "7 min read"
---
```

**Spanish** (`src/content/news/es/ai-whatsapp-invitations.md`):
```markdown
---
title: "Transforma tus Invitaciones de Boda con IA"
slug: "ai-whatsapp-invitations"
locale: "es"
readTime: "7 min de lectura"
---
```

## Markdown Formatting Tips

### Headings

Use hierarchical headings:
```markdown
## Main Section (h2)
### Subsection (h3)
#### Detail Section (h4)
```

### Lists

Unordered lists:
```markdown
- Item one
- Item two
- Item three
```

Ordered lists:
```markdown
1. First step
2. Second step
3. Third step
```

### Emphasis

```markdown
**Bold text**
*Italic text*
```

### Links

```markdown
[Link text](https://example.com)
```

### Code Blocks

```markdown
\`\`\`language
code here
\`\`\`
```

### Blockquotes

```markdown
> This is a quote
```

## Categories

Common categories used:
- **Communication**: Articles about guest communication, invitations, announcements
- **Technology**: Articles about AI, automation, digital tools
- **Professional Tools**: Articles about vendor management, planning platforms
- **Planning Tips**: General wedding planning advice
- **Trends**: Current trends in the wedding industry

## Images

### Image Guidelines

1. Upload images to `/public/images/news/` or the appropriate image directory
2. Use descriptive filenames or timestamps (e.g., `1771539005089.png`)
3. Recommended image dimensions: 1200x630px (social media friendly)
4. Supported formats: PNG, JPG, WebP
5. Optimize images for web (compress to reduce file size)

### Image Path Format

In frontmatter:
```yaml
image: "/images/news/your-image.png"
```

In article content:
```markdown
![Alt text description](/images/news/your-image.png)
```

## Best Practices

### Writing Tips

1. **Start strong**: Hook readers with the opening paragraph
2. **Use subheadings**: Break content into scannable sections
3. **Keep paragraphs short**: 2-4 sentences for readability
4. **Add value**: Provide actionable insights, not just information
5. **Include examples**: Make abstract concepts concrete
6. **End with a call-to-action**: Guide readers to next steps

### SEO Optimization

1. **Title**: Keep under 60 characters, include main keyword
2. **Description**: Keep under 160 characters, compelling summary
3. **Headings**: Use keywords naturally in h2 and h3 tags
4. **Image alt text**: Describe images for accessibility and SEO
5. **Internal links**: Link to related articles or pages when relevant

### Content Quality

1. **Fact-check**: Verify statistics and claims
2. **Proofread**: Check for spelling and grammar errors
3. **Consistency**: Maintain consistent tone and style
4. **Citations**: Attribute sources for data and quotes
5. **Accessibility**: Use clear language, avoid jargon

## Checklist for Publishing

Before publishing a new article, verify:

- [ ] Frontmatter is complete with all required fields
- [ ] Title is compelling and under 60 characters
- [ ] Description is informative and under 160 characters
- [ ] Slug matches filename (without .md)
- [ ] Date is in correct format (YYYY-MM-DD)
- [ ] Locale matches directory (en, es, de, fr, it)
- [ ] Image exists in `/images/news/` directory
- [ ] Image path is correct in frontmatter
- [ ] Read time is accurate
- [ ] Content is well-structured with headings
- [ ] Spelling and grammar are correct
- [ ] Links work correctly
- [ ] Multi-language versions created (if applicable)
- [ ] Content provides value to readers

## Troubleshooting

### Common Issues

**Article not appearing on site:**
- Check that frontmatter is properly formatted (correct YAML syntax)
- Verify file is in the correct directory
- Ensure locale matches directory

**Image not displaying:**
- Verify image file exists in specified path
- Check image filename matches exactly (case-sensitive)
- Ensure image path starts with `/`

**Formatting issues:**
- Check for unclosed markdown syntax
- Verify frontmatter ends with `---`
- Ensure proper spacing around headings and lists

## Example Complete Article

```markdown
---
title: "Why a Curated Vendor List is Essential"
slug: "vendor-list-management"
description: "Discover how maintaining a quality vendor database transforms wedding planning success."
author: "Nupci Editorial Team"
date: "2026-02-14"
category: "Professional Tools"
image: "/images/news/vendor-list.png"
readTime: "6 min read"
locale: "en"
---

In the competitive world of wedding planning, the quality of your vendor network can make or break your reputation. A thoughtfully curated list of reliable providers isn't just a convenience; it's the foundation of exceptional service delivery.

## The Hidden Cost of Poor Vendor Management

Every wedding planner has experienced it: scrambling to find a last-minute vendor, dealing with unreliable service providers, or watching a couple's dream celebration compromised by subpar professionals.

### Essential Elements of a Quality Vendor Database

**Comprehensive Contact Information**
- Multiple contact methods (phone, email, social media)
- Key contact persons for different roles
- Response time tracking

**Performance Metrics**
- Quality ratings from past events
- Reliability scores
- Client satisfaction feedback

## Conclusion

Your vendor list is your expertise made tangible. When supported by the right tools, this expertise becomes systematized, scalable, and consistently deliverable.

**Ready to elevate your vendor relationship management?** Discover how professional platforms can transform your vendor network.
```

## Additional Resources

- [Markdown Guide](https://www.markdownguide.org/)
- [YAML Frontmatter Documentation](https://jekyllrb.com/docs/front-matter/)
- [SEO Best Practices](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

---

**Questions or Need Help?**

If you need assistance creating articles or have questions about the content structure, please reach out to the development team or content manager.
