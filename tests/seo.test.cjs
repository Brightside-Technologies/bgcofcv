// Integration checks against real production Jekyll output.
// Run after building: npm test. Compatible with the project's Node 14 runtime.
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + '\n  ' + error.message); }
}
const { parseDOM } = require('htmlparser2');
const dist = path.resolve(__dirname, '../dist');
const origin = 'https://www.bgcofcv.org';
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)]);
}
function elements(dom, name) {
  const matches = [];
  function visit(n) { if (n.name === name) matches.push(n); (n.children || []).forEach(visit); }
  dom.forEach(visit); return matches;
}
function content(n) { return n.type === 'text' ? n.data : (n.children || []).map(content).join(' '); }
function read(file) { return parseDOM(fs.readFileSync(path.join(dist, file), 'utf8'), { decodeEntities: true }); }
function meta(dom, key) { return elements(dom, 'meta').filter(n => n.attribs.name === key || n.attribs.property === key).map(n => n.attribs.content); }
function canonical(dom) { return elements(dom, 'link').filter(n => n.attribs.rel === 'canonical').map(n => n.attribs.href); }
const publicFiles = walk(dist).filter(f => f.endsWith('.html') && !/[\\/](?:admin|dev_admin)[\\/]/.test(f)).map(f => path.relative(dist, f).replace(/\\/g, '/'));
assert(publicFiles.length >= 29, 'Build the production site before running these tests');

// Removing a description fallback or emitting raw Markdown must fail this check.
test('every public page has one useful plain-text description', () => {
  for (const file of publicFiles) {
    const descriptions = meta(read(file), 'description');
    assert.equal(descriptions.length, 1, file);
    assert(descriptions[0].trim().length >= 30, file + ': empty or unhelpful description');
    assert(!/[<>]|\*\*|\]\(/.test(descriptions[0]), file + ': unprocessed markup');
  }
});

// Reintroducing index.html or mismatching social/sitemap URLs breaks canonical agreement.
test('canonical URLs agree with social URLs and the sitemap', () => {
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  const urls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), m => m[1]);
  assert.equal(new Set(urls).size, urls.length, 'duplicate sitemap URLs');
  for (const file of publicFiles) {
    const dom = read(file), values = canonical(dom);
    assert.equal(values.length, 1, file);
    assert.equal(new URL(values[0]).origin, origin, file);
    assert.equal(meta(dom, 'og:url')[0], values[0], file);
    assert.equal(meta(dom, 'twitter:url')[0], values[0], file);
    assert(urls.includes(values[0]), file + ': canonical missing from sitemap');
  }
  assert.deepEqual(canonical(read('index.html')), [origin + '/']);
  assert.deepEqual(canonical(read('our-clubs.html')), [origin + '/our-clubs']);
  assert(!urls.includes(origin + '/our-clubs.html'));
});

// Domain concatenation and failure to fall back to hero images are real regressions.
test('social images resolve to actual first-party image files', () => {
  for (const file of publicFiles) {
    const dom = read(file);
    for (const key of ['og:image', 'twitter:image']) {
      const values = meta(dom, key);
      assert.equal(values.length, 1, file + ': ' + key);
      const url = new URL(values[0]);
      assert.equal(url.origin, origin, file);
      assert(/\.(png|jpg|jpeg|webp)$/i.test(url.pathname), file + ': not an image');
      assert(fs.existsSync(path.join(dist, decodeURIComponent(url.pathname))), file + ': missing social image');
    }
  }
});

test('homepage exposes its identity and program introduction as readable text', () => {
  const dom = read('index.html');
  assert.equal(elements(dom, 'h1').length, 1);
  const main = elements(dom, 'main')[0];
  const text = content(main);
  for (const phrase of ['Boys & Girls Clubs of Coachella Valley', 'Indio', 'Coachella', 'La Quinta', 'Mecca']) assert(text.includes(phrase), phrase);
  const links = elements([main], 'a').map(n => n.attribs.href);
  assert(links.includes(origin + '/our-clubs'));
  assert(links.includes(origin + '/programs'));
});

test('homepage preserves the original content images and reserves image space', () => {
  const dom = read('index.html');
  const images = elements(dom, 'img').filter(n => (n.attribs.src || '').startsWith(origin) || (n.attribs.src || '').startsWith('/'));
  const restored = ['impact-report-img.png', 'club-locations.png', 'mission-vision-core-beliefs.png'];
  for (const name of restored) {
    const matches = images.filter(img => new URL(img.attribs.src, origin).pathname === '/assets/images/' + name);
    assert.equal(matches.length, 1, name + ': original image missing or duplicated');
    assert.equal(matches[0].attribs.loading, 'lazy', name);
  }
  for (const img of images) {
    const url = new URL(img.attribs.src, origin);
    assert(Number(img.attribs.width) > 0 && Number(img.attribs.height) > 0, url.pathname + ': missing dimensions');
    assert(fs.existsSync(path.join(dist, url.pathname)), url.pathname + ': missing file');
  }
});

test('program resources do not resolve to the three broken internal paths', () => {
  for (const file of ['program-categories/arts.html', 'program-categories/my-future.html']) {
    for (const link of elements(read(file), 'a')) {
      const url = new URL(link.attribs.href, origin + '/' + file);
      assert(!(url.origin === origin && /imagemakersbgca|myclubmylife|netsmartz\.org/.test(url.pathname)), url.href);
    }
  }
});

test('home and clubhouse titles describe their locations', () => {
  const title = file => content(elements(read(file), 'title')[0]);
  assert(!title('index.html').startsWith('Home |'));
  for (const [file, city] of [['indio', 'Indio'], ['coachella', 'Coachella'], ['laquinta', 'La Quinta'], ['mecca', 'Mecca']]) assert(title('our-clubs/' + file + '.html').startsWith(city + ' Clubhouse'), city);
});

test('organization and branch structured data are valid and describe visible contacts', () => {
  const data = file => elements(read(file), 'script').filter(n => n.attribs.type === 'application/ld+json').flatMap(n => {
    const parsed = JSON.parse(content(n)); return parsed['@graph'] || [parsed];
  });
  const organization = data('index.html').find(n => n['@type'] === 'Organization');
  assert(organization, 'missing homepage Organization');
  assert.equal(organization.url, origin + '/');
  assert.equal(organization.address.addressLocality, 'Palm Desert');
  for (const city of ['indio', 'coachella', 'laquinta', 'mecca']) {
    const file = 'our-clubs/' + city + '.html';
    const graph = data(file);
    const branch = graph.find(n => n['@type'] === 'Organization');
    assert(branch?.parentOrganization?.['@id'] === origin + '/#organization', city);
    assert(branch.telephone && branch.address?.streetAddress, city);
    const breadcrumb = graph.find(n => n['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumb?.itemListElement.length, 3, city);
    assert.equal(breadcrumb.itemListElement[2].item, canonical(read(file))[0], city);
  }
});

test('CMS remains reachable but is excluded from indexing and sitemap discovery', () => {
  assert(meta(read('admin/index.html'), 'robots').some(v => v.includes('noindex')));
  const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
  assert(!sitemap.includes('/admin/'));
  const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
  assert(!/Disallow:\s*\/admin/.test(robots), 'crawler must be able to read noindex');
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exitCode = failed ? 1 : 0;
