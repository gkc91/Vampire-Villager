#!/usr/bin/env node
/**
 * Hardcoded metin taraması (04-i18n.md).
 * JSX metin düğümlerinde ve kullanıcıya görünen özniteliklerde düz metin arar.
 * Her kullanıcı metni i18n anahtarından gelmelidir.
 *
 * Bir satırı bilerek geçmek için satır sonuna `// i18n-ok` yaz.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'src');

/** En az iki harf içeren (Türkçe dahil) diziler metin sayılır. */
const LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşü]{2,}/;
const TEXT_ATTRS = /\b(placeholder|title|alt|aria-label)\s*=\s*"([^"]*)"/g;
const JSX_TEXT = />\s*([^<>{}][^<>{}]*?)\s*</g;
/** Kod parçalarını metinden ayırmak için: gerçek metinde bu karakterler olmaz. */
const CODE_HINTS = /[=;()`$\[\]|&]/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');

  // JSX metin düğümleri (satır sınırlarını aşabilir)
  let match;
  JSX_TEXT.lastIndex = 0;
  while ((match = JSX_TEXT.exec(source)) !== null) {
    const text = match[1].trim();
    if (!text || !LETTERS.test(text) || CODE_HINTS.test(text)) continue;
    const line = source.slice(0, match.index).split('\n').length;
    if (lines[line - 1]?.includes('i18n-ok')) continue;
    problems.push({ file, line, text });
  }

  lines.forEach((line, index) => {
    if (line.includes('i18n-ok')) return;

    let match;

    TEXT_ATTRS.lastIndex = 0;
    while ((match = TEXT_ATTRS.exec(line)) !== null) {
      const value = match[2].trim();
      if (value && LETTERS.test(value) && value !== 'true' && value !== 'false') {
        problems.push({ file, line: index + 1, text: `${match[1]}="${value}"` });
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`\n${problems.length} hardcoded string:\n`);
  for (const p of problems) {
    console.error(`  ${relative(ROOT, p.file)}:${p.line}  ${p.text}`);
  }
  console.error('\nHer metin i18n anahtarından gelmeli (tr + en birlikte).\n');
  process.exit(1);
}

console.log('i18n: hardcoded string yok.');
