// 冒烟测试：用 jsdom 真的把页面跑起来，走一遍引导 -> 摸摸 -> 演示对话 -> 存档
// 用法:
//   npm i -D jsdom
//   node scripts/smoke.mjs                     # 测开发版 index.html
//   node scripts/smoke.mjs dist/index.html     # 测打包产物
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(ROOT, 'index.html');

let html = fs.readFileSync(target, 'utf8');
if (html.includes('<script src="app.js"></script>')) {
  const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').replace(/<\/script>/g, '<\\/script>');
  html = html.replace('<script src="app.js"></script>', '<script>' + js + '</script>');
}

const logs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => logs.push('jsdomError: ' + e.message));
vc.on('error', (m) => logs.push('error: ' + m));

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom;
const doc = window.document;
const $ = (id) => doc.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const assert = (c, m) => { if (c) console.log('ok   ' + m); else { console.log('FAIL ' + m); failed++; } };

await sleep(250);

assert($('wizard').hidden === false, '首次进入显示引导');
assert($('petName').textContent.length > 0, '宠物名渲染: ' + $('petName').textContent);

let guard = 0;
while (!$('wizard').hidden && guard < 12) {
  guard++;
  const btns = $('wizardActions').querySelectorAll('button');
  let idx = 0;
  const title = $('wizardBody').querySelector('.wiz-title');
  if (title && title.textContent.indexOf('四步') >= 0) idx = btns.length - 1; // “我复制好了”
  if ($('wizKey')) idx = btns.length - 1;                                      // “稍后再说”
  btns[idx].click();
  await sleep(80);
}
assert($('wizard').hidden === true, '引导可走完并关闭（' + guard + ' 步）');

$('petWrap').click();
await sleep(120);
assert($('bubble').hidden === false, '点击宠物出现气泡: ' + $('bubbleText').textContent);

$('btnChat').click();
await sleep(80);
assert($('chatSheet').hidden === false, '聊天面板打开');
$('chatInput').value = '今天好累啊';
$('chatForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(1400);
const msgs = $('chatList').querySelectorAll('.msg');
assert(msgs.length >= 2, '演示对话产生消息: ' + msgs.length + ' 条');

const raw = window.localStorage.getItem('dshpet.save.v1');
assert(!!raw, 'localStorage 写入存档');
const S = JSON.parse(raw || '{}');
assert(S.exp > 0, '经验增长: ' + S.exp);
assert(S.chats >= 1, '对话计数: ' + S.chats);

$('btnChatClose').click();
$('btnSettings').click();
await sleep(80);
assert($('settings').hidden === false, '设置打开');
$('btnSettingsClose').click();
await sleep(60);
assert($('settings').hidden === true, '设置关闭');

const level = $('lvBadge').textContent;
assert(/Lv\.\d+/.test(level), '等级显示: ' + level);

/* ---------- 真实请求路径（用 stub 替身，不花 token） ---------- */
if (!window.TextDecoder) window.TextDecoder = TextDecoder;

// 1) 401 错误路径
$('btnSettings').click();
$('inpKey').value = 'sk-fake-key-for-test';
$('btnSettingsClose').click();
$('btnChat').click();
await sleep(60);
window.fetch = () => Promise.resolve({
  ok: false, status: 401,
  text: () => Promise.resolve('{"error":{"message":"Authentication Fails"}}')
});
$('chatInput').value = '在吗';
$('chatForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(300);
assert(!$('chatTip').hidden && $('chatTip').textContent.indexOf('401') >= 0,
  '401 时给出 Key 指引: ' + $('chatTip').textContent);

// 2) 流式成功路径（验证 SSE 解析）
function streamOf(chunks) {
  let i = 0;
  return {
    getReader() {
      return {
        read() {
          if (i >= chunks.length) return Promise.resolve({ done: true });
          const v = new TextEncoder().encode(chunks[i++]);
          return Promise.resolve({ done: false, value: v });
        }
      };
    }
  };
}
const sse = [
  'data: {"choices":[{"delta":{"content":"主人"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"，我在"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"呢。"}}]}\n\ndata: [DONE]\n\n'
];
window.fetch = () => Promise.resolve({ ok: true, status: 200, body: streamOf(sse) });
$('chatInput').value = '你是谁';
$('chatForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(500);
const last = doc.querySelectorAll('.msg.pet');
const lastText = last.length ? last[last.length - 1].textContent : '';
assert(lastText.indexOf('我在') >= 0, '流式回复拼装正确: ' + lastText);
const saved = JSON.parse(window.localStorage.getItem('dshpet.save.v1') || '{}');
assert((saved.history || []).length >= 4, '对话历史写入存档: ' + (saved.history || []).length + ' 条');


console.log('\n文件: ' + path.relative(ROOT, target));
console.log('运行时异常: ' + logs.length);
logs.slice(0, 5).forEach((l) => console.log('  ' + l));
window.close();
setTimeout(() => process.exit(failed ? 1 : 0), 150);
