// 打包脚本：把 index.html + style.css + app.js + assets/gifs 打成可分发产物
//   node scripts/bundle.mjs             -> dist/（index.html + assets）+ dist/pet.zip + dist/pet-standalone.html
//   node scripts/bundle.mjs --no-inline -> 只出目录版（省 11MB）
// 无第三方依赖。
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const WITH_INLINE = !process.argv.includes('--no-inline');

const read = (p) => fs.readFile(path.join(ROOT, p), 'utf8');
const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

const html = await read('index.html');
const css = await read('style.css');
const js = await read('app.js');

const safeScript = js.replace(/<\/script>/g, '<\\/script>');
const baseHtml = html
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`)
  .replace('<script src="app.js"></script>', `<script>\n/* built ${stamp} */\n${safeScript}\n</script>`);

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

/* ---------- 1. 目录版 ---------- */
await fs.writeFile(path.join(DIST, 'index.html'), baseHtml, 'utf8');
await fs.cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'), { recursive: true });
for (const extra of ['THIRD-PARTY-NOTICES.md', 'README.md', 'DEPLOY.md']) {
  try { await fs.copyFile(path.join(ROOT, extra), path.join(DIST, extra)); } catch (e) { /* 可选 */ }
}

let zipNote = '(未找到 zip 命令，跳过压缩包)';
try {
  execFileSync('zip', ['-qr', 'pet.zip', 'index.html', 'assets', 'THIRD-PARTY-NOTICES.md', 'README.md', 'DEPLOY.md'], {
    cwd: DIST, stdio: 'ignore'
  });
  const z = await fs.stat(path.join(DIST, 'pet.zip'));
  zipNote = 'dist/pet.zip  ' + (z.size / 1048576).toFixed(2) + ' MB';
} catch (e) { /* 保持提示 */ }

const idxStat = await fs.stat(path.join(DIST, 'index.html'));
console.log('目录版: dist/index.html  ' + (idxStat.size / 1024).toFixed(1) + ' KB + dist/assets/gifs/ (14 GIF)');
console.log('压缩包: ' + zipNote);

/* ---------- 2. 单文件版 ---------- */
if (WITH_INLINE) {
  const gifDir = path.join(ROOT, 'assets', 'gifs');
  const files = (await fs.readdir(gifDir)).filter((f) => f.endsWith('.gif')).sort();
  const map = {};
  let bytes = 0;
  for (const f of files) {
    const buf = await fs.readFile(path.join(gifDir, f));
    bytes += buf.length;
    map[f] = 'data:image/gif;base64,' + buf.toString('base64');
  }
  const idle = map['daiji-huxi-xiuxian.gif'];
  if (!idle) throw new Error('缺少 idle 素材 daiji-huxi-xiuxian.gif');

  const inlineHtml = baseHtml
    .replace('src="assets/gifs/daiji-huxi-xiuxian.gif"', `src="${idle}"`)
    .replace(
      '<script>\n/* built',
      `<script>window.__PET_ASSETS__=${JSON.stringify(map)};</script>\n<script>\n/* built`
    );

  const target = path.join(DIST, 'pet-standalone.html');
  await fs.writeFile(target, inlineHtml, 'utf8');
  const st = await fs.stat(target);
  console.log('单文件: dist/pet-standalone.html  ' + (st.size / 1048576).toFixed(2) +
    ' MB（内联 ' + files.length + ' 个 GIF，原始 ' + (bytes / 1048576).toFixed(2) + ' MB）');
}

console.log('\n分发方式：');
console.log('  · 目录版：把 dist/ 或 pet.zip 发给对方，浏览器打开 index.html');
console.log('  · 单文件：只发 pet-standalone.html，file:// 直接打开也能聊天');
