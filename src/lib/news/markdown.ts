import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import gfm from 'remark-gfm'

export interface ArticleFrontmatter {
  title: string
  slug: string
  description: string
  author: string
  date: string
  category: string
  image: string
  readTime: string
  locale: string
}

export interface Article {
  frontmatter: ArticleFrontmatter
  content: string
}

const contentDirectory = path.join(process.cwd(), 'src/content/news')

export async function getArticle(slug: string, locale: string): Promise<Article> {
  const fullPath = path.join(contentDirectory, locale, `${slug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')

  const { data, content } = matter(fileContents)

  // Convert markdown to HTML
  const processedContent = await remark()
    .use(gfm)
    .use(html, { sanitize: false })
    .process(content)

  const contentHtml = processedContent.toString()

  return {
    frontmatter: data as ArticleFrontmatter,
    content: contentHtml,
  }
}

export function getAllArticles(locale: string): ArticleFrontmatter[] {
  const localeDir = path.join(contentDirectory, locale)

  if (!fs.existsSync(localeDir)) {
    return []
  }

  const fileNames = fs.readdirSync(localeDir)

  const articles = fileNames
    .filter(fileName => fileName.endsWith('.md'))
    .map(fileName => {
      const fullPath = path.join(localeDir, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return data as ArticleFrontmatter
    })
    .sort((a, b) => {
      // Sort by date descending (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  return articles
}
