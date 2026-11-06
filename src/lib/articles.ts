import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { ArticleFrontmatterSchema, type ArticleFrontmatter } from "./schema";

export type Article = ArticleFrontmatter & {
  slug: string;
  html: string;
  /** Raw Markdown body (used to build the assistant knowledge base). */
  markdown: string;
  readingMinutes: number;
  headings: { id: string; text: string }[];
};

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function render(markdown: string) {
  const headings: { id: string; text: string }[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const external = /^https?:\/\//.test(href);
    const t = title ? ` title="${title}"` : "";
    return `<a href="${href}"${t}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
  };
  const html = marked.parse(markdown, { renderer, async: false }) as string;
  return { html, headings };
}

let cache: Article[] | null = null;

export function getArticles(): Article[] {
  if (cache) return cache;
  if (!fs.existsSync(ARTICLES_DIR)) return (cache = []);
  cache = fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const parsed = ArticleFrontmatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Invalid frontmatter in content/articles/${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      }
      const { html, headings } = render(content);
      const words = content.split(/\s+/).filter(Boolean).length;
      return { ...parsed.data, slug: file.replace(/\.md$/, ""), html, headings, markdown: content, readingMinutes: Math.max(1, Math.round(words / 220)) };
    })
    .filter((a) => !a.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}

export function getArticle(slug: string) {
  return getArticles().find((a) => a.slug === slug);
}
