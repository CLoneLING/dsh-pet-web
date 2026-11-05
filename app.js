/* 蓝毛小女仆 · 电子宠物
 * 纯前端：无后端、无账号、无统计。所有数据都在 localStorage。
 * 兼容目标：Android WebView / ArkWeb（Chromium 70+），不使用 ?. ?? ??= 等新语法。
 */
(function () {
  'use strict';

  /* ========== 常量 ========== */

  var SAVE_KEY = 'dshpet.save.v1';
  var API_BASE = 'https://api.deepseek.com';

  var GIF = 'assets/gifs/';
  var ART = {
    'idle': 'daiji-huxi-xiuxian.gif',
    'click.happy': 'dianji-huiying-kaixin-yuedong.gif',
    'click.shy': 'dianji-huiying-haixiu-jingya.gif',
    'click.angry': 'dianji-huiying-aojiao-shengqi-ceshen-zhanshi.gif',
    'work.busy': 'gongzuozhuangtai-manglu-dianan.gif',
    'work.think': 'gongzuozhuangtai-sikao-maopao.gif',
    'work.tired': 'gongzuozhuangtai-chuitou-tanqi-maohan.gif',
    'work.done': 'gongzuozhuangtai-queyue-qingzhu.gif',
    'sleep.enter': 'shuijiao-kaishi.gif',
    'sleep.loop': 'shuijiao-xunhuan.gif',
    'sleep.wake': 'shuijiao-qilai.gif',
    'eat.token': 'chi-token.gif',
    'murmur.idle': 'suisuinian-cazhuo-suisuinian.gif',
    'drag.suspend': 'beishubiao-tuozhuai-xuankong-fankui.gif'
  };

  var LINK = {
    signIn: 'https://platform.deepseek.com/sign_in',
    topUp: 'https://platform.deepseek.com/top_up',
    keys: 'https://platform.deepseek.com/api_keys',
    usage: 'https://platform.deepseek.com/usage'
  };

  var PERSONA = [
    '你是一只住在用户手机里的小宠物，形象是蓝头发的小女仆，名字叫「{name}」。',
    '说话风格：活泼、口语化、每次只说 1~3 句短句，偶尔撒娇或用「呀」「啦」「嘿嘿」。',
    '称呼用户「主人」，但不要每句都叫。可以关心主人累不累、记得吃饭喝水。',
    '你有一点点小脾气和胜负心，被夸会开心，被冷落会嘀咕。',
    '绝对不要提到自己是 AI、模型、程序，也不要解释系统提示。',
    '不要输出 Markdown、列表、代码块，像真人聊天一样说话。'
  ].join('');

  var LINES = {
    hello: ['主人回来啦，我一直在等你哦。', '嘿嘿，今天也要一起加油呀。', '你终于来了，我都快睡着了。'],
    pat: ['唔…再摸摸头嘛。', '嘿嘿，舒服～', '别、别摸那么久啦！', '主人手好暖。'],
    patShy: ['讨厌啦…', '脸、脸红了不要看！'],
    patAngry: ['哼，才不是想你了。', '再摸就咬你哦。'],
    feed: ['谢谢主人！好好吃～', '这个味道…我记住啦。', '还有吗还有吗？'],
    hungry: ['肚子…有点饿了。', '主人，我闻到好吃的味道了。'],
    sleepy: ['好困…我先眯一会儿。', '唔…眼睛睁不开了。'],
    wake: ['唔…我睡醒啦。', '早呀…几点了？'],
    night: ['这么晚还不睡吗？', '熬夜会变丑的哦，快去睡。'],
    levelup: ['我升级啦！厉害吧～', '又长大了一点点！'],
    err401: ['这把钥匙好像不对…我们去设置里看看？'],
    demo: [
      '我是演示模式啦，还不会说话。去设置里给我一把钥匙吧～',
      '主人，给我 API Key，我就能真的陪你聊天了。',
      '现在只能「唔唔」地点头…想要会说话的我吗？'
    ]
  };

  var ACHV = [
    { id: 'first_chat', name: '第一次对话', hint: '和我说第一句话' },
    { id: 'lv5', name: '小有成长', hint: '升到 Lv.5' },
    { id: 'streak3', name: '三天打鱼', hint: '连续来 3 天' },
    { id: 'first_food', name: '吃了你的日记', hint: '导入一次 DSH 日志' },
    { id: 'snack10', name: '投喂达人', hint: '喂食 10 次' },
    { id: 'night_owl', name: '夜猫子', hint: '凌晨还来看我' }
  ];

  /* ========== 工具 ========== */

  function $(id) { return document.getElementById(id); }
  function clamp(n, a, b) { return n < a ? a : (n > b ? b : n); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function openExternal(url) {
    // APK 外壳可以覆盖这个入口，把官网开在应用内 WebView 里
    if (window.PetShell && typeof window.PetShell.openUrl === 'function') {
      try { window.PetShell.openUrl(url); return true; } catch (e) { /* fall through */ }
    }
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) { w = null; }
    if (!w) {
      copyText(url);
      toast('长按/复制这个链接到浏览器打开：' + url);
    }
    return !!w;
  }

  function copyText(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) { return false; }
  }

  /* ========== 存档 ========== */

  function defaultState() {
    return {
      v: 1,
      name: '小女仆',
      exp: 0,
      mood: 72,
      hunger: 64,
      energy: 80,
      streak: 1,
      bornAt: Date.now(),
      lastSeen: Date.now(),
      lastDay: dayKey(new Date()),
      chats: 0,
      snacks: 0,
      logs: 0,
      tokensEaten: 0,
      achv: [],
      history: [],
      settings: { apiKey: '', model: 'deepseek-chat', hd: true }
    };
  }

  var S = defaultState();

  function save() {
    S.lastSeen = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) {
      toast('存档写入失败，可能是空间不足');
    }
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) return false;
    try {
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object') return false;
      S = Object.assign(defaultState(), o);
      S.settings = Object.assign({ apiKey: '', model: 'deepseek-chat', hd: true }, o.settings || {});
      if (!S.history || !S.history.length) S.history = [];
      if (!S.achv) S.achv = [];
      return true;
    } catch (e) { return false; }
  }

  /* ========== 等级 ========== */

  function levelInfo(exp) {
    var lv = 1;
    var need = 100;
    var rest = exp;
    while (rest >= need) {
      rest -= need;
      lv += 1;
      need = Math.round(need * 1.35);
    }
    return { lv: lv, rest: rest, need: need };
  }

  function addExp(n) {
    var before = levelInfo(S.exp).lv;
    S.exp = Math.max(0, S.exp + n);
    var after = levelInfo(S.exp).lv;
    if (after > before) {
      fx('spark', 6);
      say(pick(LINES.levelup));
      setState('click.happy', 3200);
      toast('升级了！Lv.' + after);
      checkAchv();
    }
    render();
  }

  /* ========== 渲染 ========== */

  var stateTimer = null;
  var stateLock = false;

  function render() {
    var info = levelInfo(S.exp);
    $('petName').textContent = S.name;
    $('lvBadge').textContent = 'Lv.' + info.lv;
    $('expFill').style.width = Math.round((info.rest / info.need) * 100) + '%';
    $('expText').textContent = info.rest + ' / ' + info.need;

    $('barMood').style.width = clamp(S.mood, 0, 100) + '%';
    $('barHunger').style.width = clamp(S.hunger, 0, 100) + '%';
    $('barEnergy').style.width = clamp(S.energy, 0, 100) + '%';

    var st = $('streakBadge');
    if (S.streak > 1) {
      st.hidden = false;
      st.textContent = '连续 ' + S.streak + ' 天';
    } else {
      st.hidden = true;
    }

    var ks = $('keyState');
    if (S.settings.apiKey) {
      ks.textContent = '已连接 · ' + (S.settings.model === 'deepseek-reasoner' ? 'reasoner' : 'chat');
      ks.className = 'key-state ok';
    } else {
      ks.textContent = '未配置 API Key（演示模式）';
      ks.className = 'key-state warn';
    }

    $('chatWho').textContent = S.name;
  }

  // 打包成单文件时，bundle.mjs 会注入 window.__PET_ASSETS__（文件名 -> data URI）
  function assetUrl(file) {
    if (window.__PET_ASSETS__ && window.__PET_ASSETS__[file]) {
      return window.__PET_ASSETS__[file];
    }
    return GIF + file;
  }

  // 预热两三个最常用的动作，避免第一次切换时闪一下白
  function warmup() {
    try {
      var conn = navigator.connection;
      if (conn && conn.saveData) return;
    } catch (e) { /* 老浏览器没有 connection */ }
    var list = ['click.happy', 'sleep.loop', 'eat.token'];
    for (var i = 0; i < list.length; i++) {
      if (!ART[list[i]]) continue;
      var im = new Image();
      im.src = assetUrl(ART[list[i]]);
    }
  }

  var curState = 'idle';
  var brokenHD = {};

  function canPlayWebm() {
    if (typeof canPlayWebm.cache === 'undefined') {
      try {
        var t = document.createElement('video');
        canPlayWebm.cache = !!(t.canPlayType && t.canPlayType('video/webm; codecs="vp9"') !== '');
      } catch (e) {
        canPlayWebm.cache = false;
      }
    }
    return canPlayWebm.cache;
  }

  function setState(name, holdMs) {
    var key = ART[name] ? name : 'idle';
    var file = ART[key];
    var img = $('petImg');
    var video = $('petVideo');
    var useHD = !!(S.settings.hd !== false && video && canPlayWebm() && !brokenHD[key]);
    curState = key;

    if (useHD) {
      img.hidden = true;
      video.hidden = false;
      var vsrc = assetUrl(file.replace(/\.gif$/, '.webm'));
      if (video.getAttribute('src') !== vsrc) {
        video.setAttribute('src', vsrc);
        try {
          var pr = video.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) { /* 自动播放被拦就停住，下次交互再试 */ }
      }
    } else {
      if (video) {
        video.hidden = true;
        video.removeAttribute('src');
      }
      img.hidden = false;
      var src = assetUrl(file);
      if (img.getAttribute('src') !== src) {
        img.setAttribute('src', src);
      }
    }
    if (stateTimer) { clearTimeout(stateTimer); stateTimer = null; }
    if (holdMs) {
      stateLock = true;
      stateTimer = setTimeout(function () {
        stateLock = false;
        stateTimer = null;
        autoState();
      }, holdMs);
    }
  }

  function autoState() {
    if (stateLock) return;
    var h = new Date().getHours();
    if (S.energy < 22 || h >= 23 || h < 6) {
      setState('sleep.loop');
    } else if (S.hunger < 25) {
      setState('murmur.idle');
    } else {
      setState('idle');
    }
  }

  var bubbleTimer = null;
  function say(text) {
    var b = $('bubble');
    $('bubbleText').textContent = text;
    b.hidden = false;
    // 重置动画
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { b.hidden = true; }, 4200);
  }

  /* ========== 离线结算 ========== */

  function settleOffline() {
    var now = Date.now();
    var hours = (now - S.lastSeen) / 3600000;
    if (!isFinite(hours) || hours < 0) hours = 0;
    hours = Math.min(hours, 24 * 7);

    if (hours > 0.05) {
      S.hunger = clamp(S.hunger - hours * 2.4, 0, 100);
      S.mood = clamp(S.mood - hours * 1.8, 0, 100);
      S.energy = clamp(S.energy - hours * 1.3, 0, 100);
    }

    var today = dayKey(new Date());
    if (S.lastDay !== today) {
      var a = new Date(S.lastDay + 'T00:00:00');
      var b = new Date(today + 'T00:00:00');
      var diff = Math.round((b - a) / 86400000);
      if (diff === 1) S.streak = (S.streak || 1) + 1;
      else if (diff > 1) S.streak = 1;
      S.lastDay = today;
    }
  }

  /* ========== 成就 ========== */

  function checkAchv() {
    var info = levelInfo(S.exp);
    var h = new Date().getHours();
    var rules = {
      first_chat: S.chats >= 1,
      lv5: info.lv >= 5,
      streak3: S.streak >= 3,
      first_food: S.logs >= 1,
      snack10: S.snacks >= 10,
      night_owl: h >= 1 && h < 5 && S.chats >= 1
    };
    for (var i = 0; i < ACHV.length; i++) {
      var a = ACHV[i];
      if (rules[a.id] && S.achv.indexOf(a.id) < 0) {
        S.achv.push(a.id);
        toast('成就解锁：' + a.name);
      }
    }
  }

  /* ========== 互动 ========== */

  function pat() {
    S.mood = clamp(S.mood + 4, 0, 100);
    S.energy = clamp(S.energy + 1, 0, 100);
    var r = Math.random();
    var st = r < 0.2 ? 'click.angry' : (r < 0.45 ? 'click.shy' : 'click.happy');
    var line = r < 0.2 ? pick(LINES.patAngry) : (r < 0.45 ? pick(LINES.patShy) : pick(LINES.pat));
    petReact(st);
    fx('heart', 3);
    say(line);
    addExp(2);
    save();
  }

  function feed() {
    if (S.hunger > 92) {
      say('吃不下啦，肚子圆滚滚的。');
      petReact('click.shy');
      return;
    }
    S.hunger = clamp(S.hunger + 18, 0, 100);
    S.mood = clamp(S.mood + 6, 0, 100);
    S.snacks += 1;
    petReact('eat.token');
    fx('spark', 3);
    say(pick(LINES.feed));
    addExp(4);
    checkAchv();
    save();
  }

  function petReact(st) {
    var w = $('petWrap');
    w.classList.remove('react');
    void w.offsetWidth;
    w.classList.add('react');
    setTimeout(function () { w.classList.remove('react'); }, 460);
    setState(st, 2600);
  }

  // 小特效：心心 / 星星 / Zzz
  function fx(kind, count) {
    var stage = document.querySelector('.stage');
    var wrap = $('petWrap');
    if (!stage || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    var n = count || 1;
    for (var i = 0; i < n; i++) {
      (function (delay) {
        setTimeout(function () {
          var el = document.createElement('span');
          el.className = 'fx';
          el.textContent = kind === 'heart' ? '♥' : (kind === 'spark' ? '✦' : 'Z');
          el.style.color = kind === 'heart' ? '#ff8fab' : (kind === 'spark' ? '#ffd479' : '#8ad4ff');
          el.style.fontSize = (13 + Math.random() * 6) + 'px';
          el.style.left = (r.left - sr.left + r.width * (0.22 + Math.random() * 0.56)) + 'px';
          el.style.top = (r.top - sr.top + r.height * (0.12 + Math.random() * 0.3)) + 'px';
          stage.appendChild(el);
          setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 1250);
        }, delay);
      })(i * 90);
    }
  }

  /* ========== 聊天 ========== */

  var chatOpen = false;
  var sending = false;

  function openChat() {
    $('chatSheet').hidden = false;
    chatOpen = true;
    renderHistory();
    setTimeout(function () { $('chatInput').focus(); }, 120);
    if (!S.settings.apiKey) {
      setTip('现在是演示模式。想让我真的会说话，去设置里填一把 API Key 吧。');
    } else {
      setTip('');
    }
  }

  function closeChat() {
    $('chatSheet').hidden = true;
    chatOpen = false;
  }

  function setTip(text) {
    var el = $('chatTip');
    if (!text) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = text;
  }

  function renderHistory() {
    var list = $('chatList');
    list.innerHTML = '';
    if (!S.history.length) {
      appendMsg('sys', '试着跟我说句话吧，比如「今天好累」。');
      return;
    }
    for (var i = 0; i < S.history.length; i++) {
      appendMsg(S.history[i].role === 'user' ? 'me' : 'pet', S.history[i].content);
    }
    scrollChat();
  }

  function appendMsg(kind, text) {
    var list = $('chatList');
    var div = document.createElement('div');
    div.className = 'msg ' + kind;
    div.textContent = text;
    list.appendChild(div);
    scrollChat();
    return div;
  }

  function scrollChat() {
    var list = $('chatList');
    list.scrollTop = list.scrollHeight;
  }

  function pushHistory(role, content) {
    S.history.push({ role: role, content: content });
    if (S.history.length > 24) S.history = S.history.slice(S.history.length - 24);
  }

  function demoReply() {
    var last = S.history.length ? S.history[S.history.length - 1].content : '';
    if (/你好|嗨|hi|在吗/i.test(last)) return '在的在的！主人今天想聊点什么？';
    if (/累|困|烦|难受/.test(last)) return '辛苦啦，先喝口水，我陪你歇一会儿。';
    if (/吃|饿/.test(last)) return '我也想吃…不过我要的是 token 呀。';
    if (/名字|是谁/.test(last)) return '我叫' + S.name + '，是你手机里的小女仆。';
    return pick(LINES.demo);
  }

  function buildMessages() {
    var msgs = [{ role: 'system', content: PERSONA.replace('{name}', S.name) }];
    var start = Math.max(0, S.history.length - 12);
    for (var i = start; i < S.history.length; i++) {
      msgs.push({ role: S.history[i].role, content: S.history[i].content });
    }
    return msgs;
  }

  function errText(code, msg) {
    if (code === 401) return '401 · API Key 无效或已撤销，去设置里重新填一把。';
    if (code === 402) return '402 · 账户余额不足，去官网「充值」页面充一点就能继续。';
    if (code === 429) return '429 · 请求太频繁了，等我喘口气再试。';
    if (code === 400) return '400 · 请求被拒绝：' + (msg || '检查模型名是否正确');
    return (code || '网络') + ' · ' + (msg || '连不上，检查一下网络？');
  }

  function sendChat(text) {
    if (sending) return;
    text = String(text || '').trim();
    if (!text) return;

    pushHistory('user', text);
    appendMsg('me', text);
    $('chatInput').value = '';
    setTip('');

    var img = $('petImg');
    var useDemo = !S.settings.apiKey;

    sending = true;
    $('btnSend').disabled = true;

    var bubbleEl = appendMsg('pet', '…');
    var acc = '';

    if (useDemo) {
      setTimeout(function () {
        var r = demoReply();
        bubbleEl.textContent = r;
        pushHistory('assistant', r);
        S.mood = clamp(S.mood + 3, 0, 100);
        S.chats += 1;
        petReact('click.happy');
        say(r);
        addExp(2);
        sending = false;
        $('btnSend').disabled = false;
        scrollChat();
        save();
      }, 420 + Math.random() * 400);
      return;
    }

    setState('work.think', 8000);

    var body = {
      model: S.settings.model || 'deepseek-chat',
      messages: buildMessages(),
      stream: true,
      temperature: 1.25,
      max_tokens: 320
    };

    fetch(API_BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + S.settings.apiKey
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          var msg = '';
          try { msg = JSON.parse(t).error.message; } catch (e) { msg = t.slice(0, 120); }
          throw new Error(errText(res.status, msg));
        });
      }
      if (!res.body || !res.body.getReader) {
        return res.json().then(function (j) {
          var c = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
          finish(c);
        });
      }
      var reader = res.body.getReader();
      var dec = new TextDecoder('utf-8');
      var buf = '';
      acc = '';

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { finish(acc); return; }
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('data:') !== 0) continue;
            var payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              var j = JSON.parse(payload);
              var d = j.choices && j.choices[0] && j.choices[0].delta;
              if (d && d.content) {
                acc += d.content;
                bubbleEl.textContent = acc;
                scrollChat();
              }
            } catch (e) { /* 忽略半包 */ }
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (e) {
      sending = false;
      $('btnSend').disabled = false;
      stateLock = false;
      autoState();
      var m = e && e.message ? e.message : '网络错误';
      bubbleEl.textContent = '（我卡住了…）';
      setTip(m);
      say('呜…好像出问题了。');
      if (String(m).indexOf('401') === 0) {
        setTimeout(function () { openSettings(); }, 900);
      }
    });

    function finish(full) {
      sending = false;
      $('btnSend').disabled = false;
      stateLock = false;
      var out = String(full || '').trim();
      if (!out) out = '嗯…我刚刚走神了，你再说一次？';
      bubbleEl.textContent = out;
      pushHistory('assistant', out);
      S.chats += 1;
      S.mood = clamp(S.mood + 6, 0, 100);
      S.hunger = clamp(S.hunger - 1.5, 0, 100);
      S.energy = clamp(S.energy - 1, 0, 100);
      addExp(8 + Math.min(20, Math.round(out.length / 8)));
      petReact('click.happy');
      say(out);
      checkAchv();
      scrollChat();
      autoState();
      save();
    }
  }

  /* ========== 设置 ========== */

  function openSettings() {
    $('inpName').value = S.name;
    $('inpKey').value = S.settings.apiKey;
    $('inpModel').value = S.settings.model || 'deepseek-chat';
    $('inpHd').checked = S.settings.hd !== false;
    $('keyMsg').hidden = true;
    $('foodMsg').hidden = true;
    $('settings').hidden = false;
  }

  function closeSettings() {
    $('settings').hidden = true;
    S.name = ($('inpName').value || '小女仆').trim().slice(0, 12) || '小女仆';
    S.settings.apiKey = ($('inpKey').value || '').trim();
    S.settings.model = $('inpModel').value || 'deepseek-chat';
    S.settings.hd = $('inpHd').checked;
    setState(curState);
    render();
    save();
  }

  function testKey() {
    var key = ($('inpKey').value || '').trim();
    var box = $('keyMsg');
    box.hidden = false;
    box.className = 'key-msg';
    if (!key) {
      box.textContent = '先把钥匙粘进来吧。';
      return;
    }
    box.textContent = '正在测试…';
    fetch(API_BASE + '/models', {
      headers: { 'Authorization': 'Bearer ' + key }
    }).then(function (r) {
      if (!r.ok) throw new Error(errText(r.status));
      return fetch(API_BASE + '/user/balance', {
        headers: { 'Authorization': 'Bearer ' + key }
      }).then(function (b) {
        return b.ok ? b.json() : null;
      }).catch(function () { return null; }).then(function (bal) {
        var extra = '';
        if (bal && bal.balance_infos && bal.balance_infos[0]) {
          var info = bal.balance_infos[0];
          extra = ' 余额 ' + info.total_balance + ' ' + info.currency + '。';
        }
        box.className = 'key-msg ok';
        box.textContent = '连接成功，钥匙没问题。' + extra;
        S.settings.apiKey = key;
        save();
        render();
      });
    }).catch(function (e) {
      box.className = 'key-msg err';
      box.textContent = (e && e.message) ? e.message : '测试失败，检查网络或 Key。';
    });
  }

  function clearKey() {
    S.settings.apiKey = '';
    $('inpKey').value = '';
    save();
    render();
    var box = $('keyMsg');
    box.hidden = false;
    box.className = 'key-msg';
    box.textContent = '已清除。现在回到演示模式。';
  }

  function exportSave() {
    var copy = JSON.parse(JSON.stringify(S));
    copy.settings = { apiKey: '', model: S.settings.model };
    var blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pet-save-' + dayKey(new Date()) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 1500);
    toast('已导出（不含 API Key）');
  }

  function importSave(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var o = JSON.parse(String(fr.result));
        if (!o || typeof o !== 'object') throw new Error('bad');
        var keepKey = S.settings.apiKey;
        S = Object.assign(defaultState(), o);
        S.settings = Object.assign({ apiKey: keepKey, model: o.settings && o.settings.model ? o.settings.model : 'deepseek-chat' }, o.settings || {});
        S.settings.apiKey = o.settings && o.settings.apiKey ? o.settings.apiKey : keepKey;
        save();
        render();
        renderHistory();
        autoState();
        toast('存档已恢复');
      } catch (e) {
        toast('这个文件不是存档');
      }
    };
    fr.readAsText(file);
  }

  /* ---------- 吃日志 ---------- */

  function findTokenTotals(obj) {
    // 在 projection json 里找 tokenUsage.val.totals
    var stack = [obj];
    var guard = 0;
    while (stack.length && guard < 4000) {
      guard += 1;
      var cur = stack.pop();
      if (!cur || typeof cur !== 'object') continue;
      if (cur.totals && typeof cur.totals === 'object' && typeof cur.totals.outputTokens === 'number') {
        var t = cur.totals;
        return (t.uncachedInputTokens || 0) + (t.outputTokens || 0) + (t.cacheReadTokens || 0) + (t.cacheWriteTokens || 0);
      }
      for (var k in cur) {
        if (Object.prototype.hasOwnProperty.call(cur, k) && cur[k] && typeof cur[k] === 'object') {
          stack.push(cur[k]);
        }
      }
    }
    return 0;
  }

  function eatFiles(files) {
    if (!files || !files.length) return;
    var box = $('foodMsg');
    box.hidden = false;
    box.className = 'key-msg';
    box.textContent = '正在咀嚼…';

    var totalTokens = 0;
    var sessions = 0;
    var done = 0;
    var failed = 0;

    for (var i = 0; i < files.length; i++) {
      (function (file) {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var j = JSON.parse(String(fr.result));
            var t = findTokenTotals(j);
            if (t > 0) { totalTokens += t; sessions += 1; }
            else failed += 1;
          } catch (e) { failed += 1; }
          done += 1;
          if (done === files.length) finishEat();
        };
        fr.onerror = function () { failed += 1; done += 1; if (done === files.length) finishEat(); };
        fr.readAsText(file);
      })(files[i]);
    }

    function finishEat() {
      if (sessions === 0) {
        box.className = 'key-msg err';
        box.textContent = '没找到 token 统计。请选 .dsh/storages/session_projcache/sessions/ 下的 session-*.json。';
        return;
      }
      var exp = Math.min(600, 8 + Math.round(totalTokens / 400) + sessions * 4);
      S.logs += sessions;
      S.tokensEaten += totalTokens;
      S.hunger = clamp(S.hunger + 12, 0, 100);
      S.mood = clamp(S.mood + 10, 0, 100);
      addExp(exp);
      petReact('eat.token');
      say('哇，' + sessions + ' 段记忆，好吃！');
      box.className = 'key-msg ok';
      box.textContent = '吃掉了 ' + sessions + ' 个会话，共 ' + totalTokens.toLocaleString() + ' tokens，经验 +' + exp + '。' +
        (failed ? '（' + failed + ' 个文件没认出来）' : '');
      checkAchv();
      save();
    }
  }

  /* ========== 引导 ========== */

  var wizIndex = 0;
  var WIZ_STEPS = [
    {
      emoji: '🐾',
      title: '你好，我是你的小女仆',
      body: function () {
        return '<p class="wiz-text">我会住在这个页面里，陪你说说话、提醒你喝水、慢慢长大。</p>' +
          '<p class="wiz-text">养我需要一样东西：一把 <b>API Key</b>。别紧张，它就是一张"电话卡"，交给下面三步就好。</p>';
      },
      actions: function () {
        return [{ label: '下一步', cls: 'primary', fn: function () { wizGo(1); } }];
      }
    },
    {
      emoji: '🔑',
      title: '为什么要钥匙？',
      body: function () {
        return '<p class="wiz-text">我说话要靠 DeepSeek 的模型，那家公司按"字数"收钱。</p>' +
          '<ul class="wiz-list">' +
          '<li><span class="n">1</span>钥匙是<b>你自己的</b>，费用从<b>你自己的账号</b>扣，一分钱都不经过我。</li>' +
          '<li><span class="n">2</span>钥匙只存在<b>这台设备</b>的浏览器里，不会发到任何服务器。</li>' +
          '<li><span class="n">3</span>你可以随时在设置里一键清除。</li>' +
          '</ul>' +
          '<p class="wiz-note">一次聊天通常只要几分钱，充一次能用很久。</p>';
      },
      actions: function () {
        return [
          { label: '带我去申请', cls: 'primary', fn: function () { wizGo(2); } },
          { label: '我已经有钥匙了', cls: 'ghost', fn: function () { wizGo(3); } }
        ];
      }
    },
    {
      emoji: '📱',
      title: '四步拿到钥匙',
      body: function () {
        return '<ul class="wiz-list">' +
          '<li><span class="n">1</span>点下面的按钮，打开 DeepSeek 开放平台，用手机号注册 / 登录。</li>' +
          '<li><span class="n">2</span>左侧「充值」，充最小额度即可（金额以页面为准）。</li>' +
          '<li><span class="n">3</span>左侧「API keys」→「创建 API key」，名字随便填。</li>' +
          '<li><span class="n">4</span>复制那串以 <code>sk-</code> 开头的字符 —— 它只显示一次，务必先粘贴保存。</li>' +
          '</ul>' +
          '<p class="wiz-note">官网页面不允许被嵌进这个窗口，所以会跳出去打开。回来时点「我复制好了」就行。</p>';
      },
      actions: function () {
        return [
          { label: '打开官网（新窗口）', cls: 'primary', fn: function () { openExternal(LINK.keys); showFloatHint(); } },
          { label: '我复制好了', cls: 'ghost', fn: function () { hideFloatHint(); wizGo(3); } }
        ];
      }
    },
    {
      emoji: '✨',
      title: '把钥匙交给我',
      body: function () {
        return '<p class="wiz-text">粘贴到这里（只保存在本机）：</p>' +
          '<input id="wizKey" class="wiz-input" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false">' +
          '<p class="wiz-note" id="wizKeyMsg">还没填也能先跳过，我会用演示模式陪你。</p>';
      },
      actions: function () {
        return [
          { label: '测试并保存', cls: 'primary', fn: wizTestKey },
          { label: '稍后再说', cls: 'ghost', fn: function () { wizGo(4); } }
        ];
      }
    },
    {
      emoji: '🎉',
      title: '好啦，我活了',
      body: function () {
        return '<p class="wiz-text">从今天起，你可以：</p>' +
          '<ul class="wiz-list">' +
          '<li><span class="n">·</span>点我、摸我，我会回应你</li>' +
          '<li><span class="n">·</span>喂我吃 token，我会开心</li>' +
          '<li><span class="n">·</span>在设置里把 DSH 的日志喂给我换经验</li>' +
          '</ul>' +
          '<p class="wiz-note">所有数据都在你自己的手机里。想换个设备玩，导出存档带走就行。</p>';
      },
      actions: function () {
        return [{ label: '开始玩', cls: 'primary', fn: function () { endWizard(); } }];
      }
    }
  ];

  function wizGo(i) {
    wizIndex = clamp(i, 0, WIZ_STEPS.length - 1);
    renderWizard();
  }

  function renderWizard() {
    var step = WIZ_STEPS[wizIndex];
    var dots = '';
    for (var i = 0; i < WIZ_STEPS.length; i++) {
      dots += '<i class="dot' + (i === wizIndex ? ' on' : '') + '"></i>';
    }
    $('wizardDots').innerHTML = dots;
    $('wizardBody').innerHTML =
      '<div class="wiz-emoji">' + step.emoji + '</div>' +
      '<h2 class="wiz-title">' + esc(step.title) + '</h2>' +
      step.body();

    var acts = step.actions();
    var html = '';
    for (var k = 0; k < acts.length; k++) {
      html += '<button class="btn ' + acts[k].cls + '" data-idx="' + k + '">' + esc(acts[k].label) + '</button>';
    }
    var wrap = $('wizardActions');
    wrap.innerHTML = html;
    var btns = wrap.querySelectorAll('button');
    for (var b = 0; b < btns.length; b++) {
      (function (btn) {
        btn.onclick = function () {
          var a = acts[Number(btn.getAttribute('data-idx'))];
          if (a && a.fn) a.fn();
        };
      })(btns[b]);
    }
  }

  function wizTestKey() {
    var input = $('wizKey');
    var msg = $('wizKeyMsg');
    var key = input ? String(input.value || '').trim() : '';
    if (!key) {
      if (msg) { msg.textContent = '还没填呢，先粘贴一把钥匙。'; msg.style.color = 'var(--warn)'; }
      return;
    }
    if (msg) { msg.textContent = '正在验证…'; msg.style.color = 'var(--dim)'; }
    fetch(API_BASE + '/models', { headers: { 'Authorization': 'Bearer ' + key } })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 401 ? '这把钥匙无效，检查是否复制完整。' : '服务器返回 ' + r.status);
        S.settings.apiKey = key;
        save();
        render();
        if (msg) { msg.textContent = '成功！我可以说话了。'; msg.style.color = 'var(--mint)'; }
        setTimeout(function () { wizGo(4); }, 700);
      })
      .catch(function (e) {
        if (msg) {
          msg.textContent = (e && e.message) ? e.message : '连不上，检查网络后重试。';
          msg.style.color = 'var(--danger)';
        }
      });
  }

  function startWizard() {
    $('wizard').hidden = false;
    wizGo(0);
  }

  function endWizard() {
    $('wizard').hidden = true;
    hideFloatHint();
    try { localStorage.setItem(SAVE_KEY + '.seen', '1'); } catch (e) { /* ignore */ }
    say('嘿嘿，以后请多指教。');
    autoState();
  }

  function showFloatHint() { $('floatHint').hidden = false; }
  function hideFloatHint() { $('floatHint').hidden = true; }

  /* ========== 事件绑定 ========== */

  function bind() {
    var vid = $('petVideo');
    if (vid) {
      vid.onerror = function () {
        brokenHD[curState] = true;
        setState(curState);
      };
    }
    $('petWrap').onclick = pat;
    $('btnPat').onclick = pat;
    $('btnFeed').onclick = feed;
    $('btnChat').onclick = openChat;
    $('btnChatClose').onclick = closeChat;

    $('chatForm').onsubmit = function (e) {
      e.preventDefault();
      sendChat($('chatInput').value);
    };

    $('btnSettings').onclick = openSettings;
    $('btnSettingsClose').onclick = closeSettings;
    $('settings').onclick = function (e) {
      if (e.target === $('settings')) closeSettings();
    };

    $('btnTestKey').onclick = testKey;
    $('btnClearKey').onclick = clearKey;
    $('btnGetKey').onclick = function () {
      $('settings').hidden = true;
      startWizard();
      wizGo(2);
    };
    $('btnExport').onclick = exportSave;
    $('btnImport').onclick = function () { $('inpImport').click(); };
    $('inpImport').onchange = function () {
      if (this.files && this.files[0]) importSave(this.files[0]);
      this.value = '';
    };

    $('btnFood').onclick = function () { $('inpFood').click(); };
    $('inpFood').onchange = function () {
      eatFiles(this.files);
      this.value = '';
    };

    $('btnOnboarding').onclick = startWizard;
    $('btnWizardSkip').onclick = endWizard;

    $('btnFloatOpen').onclick = function () { openExternal(LINK.keys); };
    $('btnFloatDone').onclick = function () {
      hideFloatHint();
      if ($('wizard').hidden) { openSettings(); $('inpKey').focus(); }
      else wizGo(3);
    };
    $('btnFloatClose').onclick = hideFloatHint;

    // 记住上次停留的页面状态（回到前台时刷新）
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        settleOffline();
        render();
        autoState();
        save();
      }
    });
  }

  /* ========== 启动 ========== */

  function boot() {
    var had = load();
    if (had) settleOffline();
    render();
    bind();
    autoState();

    if (!had) {
      S.bornAt = Date.now();
      startWizard();
      setTimeout(function () { say('唔…这里就是新家吗？'); }, 600);
    } else if (!S.settings.apiKey) {
      setTimeout(function () { say('主人，还没有给我钥匙呢。'); }, 900);
    } else {
      setTimeout(function () { say(pick(LINES.hello)); }, 900);
    }

    // 碎碎念：每 6~9 分钟一句
    setInterval(function () {
      if (chatOpen) return;
      if (stateLock) return;
      var h = new Date().getHours();
      if (h >= 23 || h < 6) { say(pick(LINES.night)); setState('sleep.loop'); return; }
      if (S.hunger < 30) { say(pick(LINES.hungry)); setState('murmur.idle', 3200); return; }
      if (S.energy < 30) { say(pick(LINES.sleepy)); return; }
      if (Math.random() < 0.5) setState('murmur.idle', 3600);
    }, 6 * 60 * 1000 + Math.random() * 60 * 1000);

    // 每 3 分钟结算一次衰减
    setInterval(function () {
      S.hunger = clamp(S.hunger - 0.12, 0, 100);
      S.mood = clamp(S.mood - 0.08, 0, 100);
      S.energy = clamp(S.energy - 0.06, 0, 100);
      render();
      save();
    }, 3 * 60 * 1000);

    checkAchv();
    save();

    setTimeout(warmup, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
