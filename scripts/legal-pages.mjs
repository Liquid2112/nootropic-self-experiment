// Renders docs/privacy-policy.md, docs/terms-of-use.md and docs/support.md
// into static pages under landing/, served
// at /privacy, /support and /terms. Run after editing either doc:
//   node scripts/legal-pages.mjs
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { marked } from 'marked';

const pages = [
  { src: 'docs/privacy-policy.md', out: 'landing/privacy.html', title: 'Privacy Policy' },
  { src: 'docs/terms-of-use.md', out: 'landing/terms.html', title: 'Terms of Use' },
  { src: 'docs/support.md', out: 'landing/support.html', title: 'Support' },
];

const slug = (t) =>
  t.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
    },
  },
});

for (const { src, out, title } of pages) {
  let md = readFileSync(src, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  if (/DATE_TBD|GOVERNING_STATE_TBD/.test(md)) {
    // Guard: never publish a page with unfilled placeholders.
    if (existsSync(out)) rmSync(out);
    console.log(`skip ${src}: placeholders not filled`);
    continue;
  }
  const body = marked.parse(md);
  writeFileSync(
    out,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Placebo</title>
<link rel="icon" href="/favicon.png">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light dark;--bg:light-dark(#F7F4EE,#15131C);--ink:light-dark(#15131C,#F7F4EE);--muted:light-dark(#6D6878,#A9A3B3);--line:light-dark(#E7E1D6,#34303F)}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 Inter,system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}
h1,h2,h3{font-family:"Bricolage Grotesque",Inter,sans-serif;letter-spacing:-.02em;line-height:1.15}
h1{font-size:40px}h2{font-size:26px;margin-top:40px}h3{font-size:20px}
a{color:inherit}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}td,th{border:1px solid var(--line);padding:6px 10px;text-align:left}
.back{font-weight:600;text-decoration:none;color:var(--muted)}
</style>
</head>
<body><main><a class="back" href="/">← Placebo</a>
${body}</main></body>
</html>
`,
  );
  console.log(`wrote ${out}`);
}
