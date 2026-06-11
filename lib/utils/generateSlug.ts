import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `${slugify(clientName)}-${nanoid(6)}` — random suffix guarantees uniqueness. */
export function generateSlug(clientName: string): string {
  const base = slugify(clientName) || 'case-study';
  return `${base}-${nanoid()}`;
}
