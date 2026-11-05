// 从 GitHub API 拉取 dsh-pet 的透明 GIF 素材（raw.githubusercontent 在部分网络被重置，故走 api.github.com blob）
// 用法: node scripts/fetch-assets.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const OWNER = 'PC2005-cloud';
const REPO = 'dsh-pet';
const REF = 'main';
const DIR = 'dsh-pet/assets/preview';
const OUT = new URL('../assets/gifs/', import.meta.url).pathname;

const names = [
  'daiji-huxi-xiuxian',
  'dianji-huiying-kaixin-yuedong',
  'dianji-huiying-haixiu-jingya',
  'dianji-huiying-aojiao-shengqi-ceshen-zhanshi',
  'gongzuozhuangtai-manglu-dianan',
  'gongzuozhuangtai-sikao-maopao',
  'gongzuozhuangtai-chuitou-tanqi-maohan',
  'gongzuozhuangtai-queyue-qingzhu',
  'shuijiao-kaishi',
  'shuijiao-xunhuan',
  'shuijiao-qilai',
  'chi-token',
  'suisuinian-cazhuo-suisuinian',
  'beishubiao-tuozhuai-xuankong-fankui',
];

const api = (p) => `https://api.github.com/repos/${OWNER}/${REPO}/${p}`;
const headers = { 'User-Agent': 'pet-asset-fetch', Accept: 'application/vnd.github+json' };

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

await fs.mkdir(OUT, { recursive: true });
const listing = await getJson(api(`contents/${DIR}?ref=${REF}`));
const byName = new Map(listing.map((f) => [f.name, f]));

let ok = 0;
let bytes = 0;
for (const name of names) {
  const file = byName.get(`${name}.gif`);
  if (!file) {
    console.log('MISS', name);
    continue;
  }
  const blob = await getJson(api(`git/blobs/${file.sha}`));
  const buf = Buffer.from(blob.content, 'base64');
  if (buf.subarray(0, 3).toString('latin1') !== 'GIF') {
    console.log('BADHDR', name);
    continue;
  }
  await fs.writeFile(path.join(OUT, `${name}.gif`), buf);
  ok += 1;
  bytes += buf.length;
  console.log('OK', name, buf.length);
  await new Promise((r) => setTimeout(r, 150));
}
console.log('DONE', ok, 'files', (bytes / 1048576).toFixed(2) + 'MB');
