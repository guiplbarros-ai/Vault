import matter from 'gray-matter';
import type { NoteFrontmatter } from '../types/index.js';
import { getFormattedDateTime } from './date.js';

export function createFrontmatter(
  title: string,
  tagType: string
): NoteFrontmatter {
  const now = getFormattedDateTime();
  
  return {
    title,
    created_at: now,
    updated_at: now,
    tags: ['origem/chat', tagType],
    source: 'chat-cursor'
  };
}

export function serializeFrontmatter(frontmatter: NoteFrontmatter): string {
  return matter.stringify('', frontmatter).trim();
}

export function parseFrontmatter(content: string): {
  data: Partial<NoteFrontmatter>;
  content: string;
} {
  const parsed = matter(content);
  return {
    data: parsed.data as Partial<NoteFrontmatter>,
    content: parsed.content
  };
}

export function updateFrontmatterTimestamp(content: string): string {
  const { data, content: body } = parseFrontmatter(content);
  data.updated_at = getFormattedDateTime();
  return matter.stringify(body, data);
}

