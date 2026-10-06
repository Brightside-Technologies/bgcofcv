// Read-only SEO audit of the public website. No site files are modified.
const fs = require('fs');
const path = require('path');
const { parseDOM } = require('htmlparser2');
const base = 'https://www.bgcofcv.org';
const output = path.join(__dirname, 'evidence');
fs.mkdirSync(output, { recursive: true });
const text = n => (n.type === 'text' ? n.data : (n.children || []).map(text).join('')).replace(/\s+/g, ' ').trim();
function nodes(n, predicate) {
  const result = [];
  function visit(node) { if (predicate(node)) result.push(node); (node.children || []).forEach(visit); }
  visit(n); return result;
}
async function get(url, method = 'GET') {
  const start = Date.now();
  try {
    const r = await fetch(url, { method, signal: AbortSignal.timeout(25000) });
    const body = method === 'GET' ? await r.text() : '';
    return { requested: url, url: r.url, status: r.status, redirected: r.redirected, elapsedMs: Date.now() - start, headers: Object.fromEntries(r.headers), body };
  } catch (e) { return { requested: url, error: e.message }; }
}
async function batch(values, task, size = 5) {
  const result = [];
  for (let i = 0; i < values.length; i += size) result.push(...await Promise.all(values.slice(i, i + size).map(task)));
  return result;
}
function analyze(r) {
  if (!r.body || !r.headers['content-type']?.includes('text/html')) return r;
  const dom = { children: parseDOM(r.body) };
  const tags = name => nodes(dom, n => n.name === name);
  const metas = tags('meta');
  const meta = name => metas.filter(n => n.attribs.name === name || n.attribs.property === name).map(n => n.attribs.content || '');
  const absolute = href => { try { return new URL(href, r.url).href; } catch { return null; } };
  const main = tags('main')[0] || dom;
  const bodyText = text(main);
  const images = tags('img').map(n => ({ src: absolute(n.attribs.src), alt: n.attribs.alt ?? null, width: n.attribs.width || null, height: n.attribs.height || null, loading: n.attribs.loading || null, srcset: n.attribs.srcset || null }));
  const links = tags('a').map(n => ({ url: absolute(n.attribs.href), text: text(n) }));
  const assets = [...images.map(n => n.src), ...tags('script').filter(n => n.attribs.src).map(n => absolute(n.attribs.src)), ...tags('link').filter(n => n.attribs.rel === 'stylesheet').map(n => absolute(n.attribs.href)), ...Array.from(r.body.matchAll(/url\(([^)]+)\)/g), m => absolute(m[1].replace(/["']/g, '')))];
  const result = { ...r, title: tags('title').map(text), description: meta('description'), canonical: tags('link').filter(n => n.attribs.rel === 'canonical').map(n => n.attribs.href), robots: meta('robots'), ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'), ogUrl: meta('og:url'), h1: tags('h1').map(text), headings: nodes(main, n => /^h[1-6]$/.test(n.name || '')).map(n => ({ tag: n.name, text: text(n) })), structuredData: tags('script').filter(n => n.attribs.type === 'application/ld+json').map(text), images, links, assets, wordCount: bodyText.split(/\s+/).length, bodyText, analytics: Array.from(new Set(r.body.match(/(?:UA-\d+-\d+|G-[A-Z0-9]+)/g) || [])), iframeCount: tags('iframe').length };
  fs.writeFileSync(path.join(output, (new URL(r.url).pathname.replace(/[^a-z0-9]/gi, '_') || 'home') + '.html'), r.body);
  delete result.body;
  return result;
}
(async () => {
  const [robot, sitemap, home] = await Promise.all(['/robots.txt', '/sitemap.xml', '/'].map(p => get(base + p)));
  const rawSitemap = sitemap.body || '';
  const sitemapUrls = Array.from(rawSitemap.matchAll(/<loc>(.*?)<\/loc>/g), m => m[1]);
  fs.writeFileSync(path.join(output, 'robots.txt'), robot.body || JSON.stringify(robot));
  fs.writeFileSync(path.join(output, 'sitemap.xml'), rawSitemap);
  const first = analyze(home);
  const pagesToCheck = Array.from(new Set([...sitemapUrls, ...first.links.map(n => n.url)])).filter(u => u && u.startsWith(base) && !/\.(pdf|jpg|png|jpeg|css|js|ico)(?:$|\?)/i.test(u)).map(u => u.split('#')[0]);
  const pages = [first, ...await batch(Array.from(new Set(pagesToCheck)).filter(u => u !== base + '/').slice(0, 55), async u => analyze(await get(u)))];
  const allLinks = Array.from(new Set(pages.flatMap(p => (p.links || []).map(l => l.url)).filter(u => u && u.startsWith(base)).map(u => u.split('#')[0])));
  const checked = new Set(pages.flatMap(p => [p.requested, p.url]));
  const links = await batch(allLinks.filter(u => !checked.has(u)), u => get(u, 'HEAD'));
  const assetUrls = Array.from(new Set(pages.flatMap(p => p.assets || []).filter(u => u && u.startsWith(base))));
  const assets = await batch(assetUrls, u => get(u, 'HEAD'));
  const variants = await batch(['http://bgcofcv.org/', 'http://www.bgcofcv.org/', 'https://bgcofcv.org/', base + '/index.html', base + '/our-clubs.html', base + '/our-clubs/', base + '/our-clubs', base + '/seo-audit-nonexistent-page-20261002', base + '/admin/', base + '/dev_admin/'], u => get(u, 'HEAD'));
  delete robot.body; delete sitemap.body;
  const report = { auditDate: '2026-10-02', collectedAt: new Date().toISOString(), robot, sitemap, sitemapUrls, pages, links, assets, variants };
  fs.writeFileSync(path.join(output, 'crawl.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pages: pages.map(p => ({ url: p.url, status: p.status, title: p.title, description: p.description, canonical: p.canonical, h1: p.h1, schemaCount: p.structuredData?.length, words: p.wordCount, ogImage: p.ogImage, analytics: p.analytics })), robot, sitemap: { status: sitemap.status, urls: sitemapUrls }, brokenLinks: links.filter(r => r.status >= 400 || r.error), brokenAssets: assets.filter(r => r.status >= 400 || r.error), homeAssets: assets.filter(r => first.assets.includes(r.requested)).map(r => ({ url: r.url, status: r.status, bytes: r.headers?.['content-length'] })), variants }, null, 2));
})();
