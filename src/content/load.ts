import { load as parseYaml } from 'js-yaml';
import { marked } from 'marked';
import type { MechanismDef } from '../types';

const files = import.meta.glob<string>('./*.md', { query: '?raw', import: 'default', eager: true });

function parse(raw: string, path: string): MechanismDef {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${path}: missing frontmatter`);
  const fm = parseYaml(m[1]) as Omit<MechanismDef, 'bodyHtml'>;
  if (!fm.id || !fm.title || !Array.isArray(fm.sequence)) throw new Error(`${path}: needs id, title, sequence`);
  const bodyHtml = marked.parse(m[2], { async: false }) as string;
  return { ...fm, bodyHtml };
}

export const mechanisms: MechanismDef[] = Object.entries(files)
  .map(([path, raw]) => parse(raw, path))
  .sort((a, b) => a.title.localeCompare(b.title));

export function getMechanism(id: string): MechanismDef | undefined {
  return mechanisms.find((m) => m.id === id);
}
