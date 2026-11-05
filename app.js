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
    '不要输出 Markdown、列表、代码块，像真人聊天一样说话。',
    '在回复的最后另起一行输出 [[mood:xxx]] 标注情绪，xxx 只能是 happy / shy / angry / sad / think / sleepy / excited / eat 之一。这一行会被程序隐藏。'
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
      settings: { apiKey: '', model: 'deepseek-chat', hd: true, wander: false, follow: false }
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
      S.settings = Object.assign({ apiKey: '', model: 'deepseek-chat', hd: true, wander: false, follow: false }, o.settings || {});
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

    var chip = $('balanceChip');
    if (chip) {
      if (S.settings.apiKey && S.balance !== undefined && S.balance !== null) {
        chip.hidden = false;
        chip.textContent = '余额 ' + S.balance + ' ' + (S.balanceCur || 'CNY');
      } else {
        chip.hidden = true;
      }
    }
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

  var HD_ONLY = {
    'yawn':   { webm: 'haqian-liantian.webm', fallback: 'work.tired' },
    'look':   { webm: 'dongzhangxiwang.webm', fallback: 'idle' },
    'juggle': { webm: 'sanqiu-paojie.webm',   fallback: 'click.happy' },
    'dance':  { webm: 'youya-nvpuwu.webm',    fallback: 'click.happy' }
  };

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

  function resolveArt(name) {
    if (ART[name]) {
      return { gif: ART[name], webm: ART[name].replace(/\.gif$/, '.webm') };
    }
    var hd = HD_ONLY[name];
    if (hd) {
      return { gif: ART[hd.fallback] || ART['idle'], webm: hd.webm };
    }
    return { gif: ART['idle'], webm: 'daiji-huxi-xiuxian.webm' };
  }

  // 同一个动作不重设 src -> 不会重播；正在播放的动作也不会被自动行为打断
  function setState(name, holdMs, force) {
    var key = (ART[name] || HD_ONLY[name]) ? name : 'idle';
    if (stateLock && !force) return;

    var art = resolveArt(key);
    var img = $('petImg');
    var video = $('petVideo');
    var useHD = !!(S.settings.hd !== false && video && canPlayWebm() && !brokenHD[art.webm]);
    var changed = key !== curState;
    curState = key;

    if (useHD) {
      img.hidden = true;
      video.hidden = false;
      var vsrc = assetUrl(art.webm);
      if (video.getAttribute('src') !== vsrc) {
        video.setAttribute('src', vsrc);
        try {
          var pr = video.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) { /* 自动播放被拦，等下次交互 */ }
      }
    } else {
      if (video) {
        video.hidden = true;
        video.removeAttribute('src');
      }
      img.hidden = false;
      var src = assetUrl(art.gif);
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    }

    if (stateTimer) { clearTimeout(stateTimer); stateTimer = null; }
    if (holdMs && holdMs > 0) {
      stateLock = true;
      stateTimer = setTimeout(function () {
        stateLock = false;
        stateTimer = null;
        autoState();
      }, holdMs);
    } else if (changed) {
      stateLock = false;
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

  /* ---- 随机行为：没在做事的时候自己找乐子 ---- */
  var AMBIENT = ['click.happy', 'click.shy', 'click.angry', 'work.think', 'work.busy',
    'work.done', 'murmur.idle', 'eat.token', 'drag.suspend', 'look', 'yawn', 'juggle', 'dance'];
  var MURMUR = ['唔…', '……', '在忙吗？', '我在发呆。', '要不要休息一下？', '今天也辛苦啦。'];
  var ambientTimer = null;

  function scheduleAmbient() {
    if (ambientTimer) clearTimeout(ambientTimer);
    var wait = 6000 + Math.random() * 12000;
    ambientTimer = setTimeout(function () {
      ambientTick();
      scheduleAmbient();
    }, wait);
  }

  function ambientTick() {
    if (stateLock || sending || document.hidden) return;
    var h = new Date().getHours();
    if (h >= 23 || h < 6 || S.energy < 22) { setState('sleep.loop'); return; }
    if (S.hunger < 25) { setState('eat.token', 3000); say(pick(LINES.hungry)); return; }
    setState(pick(AMBIENT), 2600 + Math.random() * 1800);
    if (Math.random() < 0.3) say(pick(MURMUR));
  }

  /* ---- 自由走动 / 跟随 ---- */
  var wanderTimer = null;
  var lastX = 0;

  function movePet(x, y, fast) {
    var layer = $('petLayer');
    if (!layer) return;
    layer.style.transitionDuration = fast ? '0.22s' : '2.4s';
    layer.style.setProperty('--px', Math.round(x) + 'px');
    layer.style.setProperty('--py', Math.round(y) + 'px');
    var wrap = $('petWrap');
    if (wrap) {
      if (x < lastX - 6) wrap.classList.add('flip');
      else if (x > lastX + 6) wrap.classList.remove('flip');
    }
    lastX = x;
  }

  function stageBox() {
    var stage = $('stage');
    return stage ? stage.getBoundingClientRect() : null;
  }

  function wanderStep() {
    if (!S.settings.wander) return;
    var box = stageBox();
    if (!box) return;
    var maxX = Math.max(0, box.width / 2 - 70);
    var maxY = Math.max(0, box.height / 2 - 80);
    movePet((Math.random() * 2 - 1) * maxX, (Math.random() * 2 - 1) * maxY * 0.7);
  }

  function startWander() {
    if (wanderTimer) { clearInterval(wanderTimer); wanderTimer = null; }
    if (!S.settings.wander) { movePet(0, 0); return; }
    wanderTimer = setInterval(wanderStep, 4200);
  }

  var tiltActive = false;

  function applyFollow(dx, dy) {
    var box = stageBox();
    if (!box) return;
    var maxX = Math.max(0, box.width / 2 - 80);
    movePet(clamp(dx, -1, 1) * maxX * 0.85, clamp(dy, -1, 1) * 42, true);
  }

  function onMouseMove(e) {
    if (!S.settings.follow || tiltActive) return;
    var box = stageBox();
    if (!box || !box.width) return;
    applyFollow(((e.clientX - box.left) / box.width) * 2 - 1,
                ((e.clientY - box.top) / box.height) * 2 - 1);
  }

  var tiltEvents = 0;

  function onTilt(e) {
    if (!S.settings.follow) return;
    var g = Number(e.gamma);
    var b = Number(e.beta);
    if (!isFinite(g) && !isFinite(b)) return;   // 事件来了但没数据
    tiltEvents++;
    tiltActive = true;
    applyFollow((isFinite(g) ? g : 0) / 35, ((isFinite(b) ? b : 45) - 45) / 90);
  }

  function onStageTouch(e) {
    if (!S.settings.follow) return;
    var t = e.touches && e.touches[0];
    if (!t) return;
    var box = stageBox();
    if (!box || !box.width) return;
    applyFollow(((t.clientX - box.left) / box.width) * 2 - 1,
                ((t.clientY - box.top) / box.height) * 2 - 1);
  }

  function enableTilt() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      toast('这个浏览器不提供体感接口');
      return;
    }
    var start = function () {
      window.addEventListener('deviceorientation', onTilt, true);
      window.addEventListener('deviceorientationabsolute', onTilt, true);
      S.settings.follow = true;
      if ($('inpFollow')) $('inpFollow').checked = true;
      save();
      tiltEvents = 0;
      toast('已开启，倾斜手机试试（Android 不会弹授权框）');
      setTimeout(function () {
        if (tiltEvents === 0) {
          toast('没收到方向数据：可能是设备没陀螺仪，或浏览器屏蔽了传感器');
          S.settings.follow = false;
          if ($('inpFollow')) $('inpFollow').checked = false;
          save();
        } else {
          toast('收到体感数据 ' + tiltEvents + ' 次，可以倾斜了');
        }
      }, 2200);
    };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(function (res) {
        if (res === 'granted') start(); else toast('体感权限被拒绝');
      }).catch(function () { toast('体感不可用'); });
    } else {
      start();
    }
  }

  /* ---- 余额 ---- */
  function refreshBalance(silent) {
    if (!S.settings.apiKey) {
      if (!silent) toast('先在设置里填一把 API Key');
      return;
    }
    fetch(API_BASE + '/user/balance', { headers: { Authorization: 'Bearer ' + S.settings.apiKey } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var info = (j && j.balance_infos && j.balance_infos[0]) || null;
        if (!info) throw new Error('没有余额信息');
        S.balance = info.total_balance;
        S.balanceCur = info.currency || 'CNY';
        S.balanceAt = Date.now();
        render();
        if (!silent) toast('余额 ' + S.balance + ' ' + S.balanceCur);
      })
      .catch(function (e) {
        if (!silent) toast('查询失败：' + ((e && e.message) || '网络问题'));
      });
  }

  /* ---- 情绪标签 ---- */
  var MOOD_STATE = {
    happy: 'click.happy', shy: 'click.shy', angry: 'click.angry',
    sad: 'work.tired', think: 'work.think', sleepy: 'sleep.loop',
    excited: 'work.done', eat: 'eat.token'
  };

  function extractMood(text) {
    var m = /\[\[\s*mood\s*:\s*([a-z]+)\s*\]\]/i.exec(String(text));
    var clean = String(text).replace(/\[\[\s*mood\s*:\s*[a-z]+\s*\]\]/gi, '').trim();
    return { mood: m ? m[1].toLowerCase() : '', text: clean };
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
    renderHistory();
    var el = $('chatInput');
    if (el) el.focus();
    setTip(S.settings.apiKey ? '' : '现在是演示模式。填一把 API Key，我就能真的说话了。');
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
      var raw = String(full || '').trim();
      if (!raw) raw = '嗯…我刚刚走神了，你再说一次？';
      var parsed = extractMood(raw);
      var out = parsed.text || raw;
      bubbleEl.textContent = out;
      pushHistory('assistant', out);
      S.chats += 1;
      S.mood = clamp(S.mood + 6, 0, 100);
      S.hunger = clamp(S.hunger - 1.5, 0, 100);
      S.energy = clamp(S.energy - 1, 0, 100);
      addExp(8 + Math.min(20, Math.round(out.length / 8)));
      setState(MOOD_STATE[parsed.mood] || 'click.happy', 3200, true);
      say(out);
      checkAchv();
      scrollChat();
      if (S.chats % 5 === 0) refreshBalance(true);
      save();
    }
  }

  /* ========== 设置 ========== */

  function openSettings() {
    $('inpName').value = S.name;
    $('inpKey').value = S.settings.apiKey;
    $('inpModel').value = S.settings.model || 'deepseek-chat';
    $('inpHd').checked = S.settings.hd !== false;
    if ($('inpWander')) $('inpWander').checked = !!S.settings.wander;
    if ($('inpFollow')) $('inpFollow').checked = !!S.settings.follow;
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
    if ($('inpWander')) S.settings.wander = $('inpWander').checked;
    if ($('inpFollow')) S.settings.follow = $('inpFollow').checked;
    startWander();
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

  function bindInner() {
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
    var ci = $('chatInput');
    if (ci) {
      ci.addEventListener('focus', function () { chatOpen = true; });
      ci.addEventListener('blur', function () { chatOpen = false; });
    }
    var stageEl = $('stage');
    if (stageEl) {
      stageEl.addEventListener('mousemove', onMouseMove);
      stageEl.addEventListener('touchmove', onStageTouch, { passive: true });
    }
    var tiltBtn = $('btnTilt');
    if (tiltBtn) tiltBtn.onclick = enableTilt;
    var balBtn = $('btnBalance');
    if (balBtn) balBtn.onclick = function () { refreshBalance(false); };

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
    $('btnDiagOpen').onclick = runDiag;
    $('btnDiagClose').onclick = function () { $('diag').hidden = true; };
    $('btnDiagRerun').onclick = runDiag;
    $('btnDiagCopy').onclick = copyDiag;
    $('diag').onclick = function (e) { if (e.target === $('diag')) $('diag').hidden = true; };

    $('btnMakeCode').onclick = makeCode;
    $('btnCopyCode').onclick = function () {
      var v = $('inpCode').value;
      if (!v) { toast('先点「生成口令」'); return; }
      toast(copyText(v) ? '口令已复制' : '复制失败，请长按选择');
    };
    $('btnApplyCode').onclick = applyCode;

    $('btnWxClose').onclick = function () {
      $('wxTip').hidden = true;
      document.body.className = '';
    };
    guardAssets();

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


  /* ========== 数据口令（跨设备同步） ========== */

  function utf8ToBin(str) { return unescape(encodeURIComponent(str)); }
  function binToUtf8(bin) { return decodeURIComponent(escape(bin)); }

  function b64urlEncode(str) {
    return btoa(utf8ToBin(str)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    var t = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return binToUtf8(atob(t));
  }

  function codePayload() {
    return {
      v: 1,
      name: S.name,
      exp: S.exp,
      mood: S.mood,
      hunger: S.hunger,
      energy: S.energy,
      streak: S.streak,
      bornAt: S.bornAt,
      chats: S.chats,
      snacks: S.snacks,
      logs: S.logs,
      tokensEaten: S.tokensEaten,
      achv: S.achv,
      history: S.history.slice(-10),
      settings: { model: S.settings.model, hd: S.settings.hd }
    };
  }

  function makeCode() {
    var box = $('codeMsg');
    try {
      var code = 'PET1:' + b64urlEncode(JSON.stringify(codePayload()));
      $('inpCode').value = code;
      box.hidden = false;
      box.className = 'key-msg ok';
      box.textContent = '口令已生成（' + code.length + ' 字符），复制到另一台设备导入即可。不含 API Key。';
    } catch (e) {
      box.hidden = false;
      box.className = 'key-msg err';
      box.textContent = '生成失败：' + (e && e.message ? e.message : '未知错误');
    }
  }

  function applyCode() {
    var box = $('codeMsg');
    var raw = String($('inpCode').value || '').trim();
    box.hidden = false;
    if (!raw) {
      box.className = 'key-msg err';
      box.textContent = '先把口令粘进来。';
      return;
    }
    try {
      var body = raw.indexOf('PET1:') === 0 ? raw.slice(5) : raw;
      var obj = JSON.parse(b64urlDecode(body));
      if (!obj || typeof obj !== 'object' || typeof obj.exp !== 'number') throw new Error('不像本应用的口令');
      var keepKey = S.settings.apiKey;
      S = Object.assign(defaultState(), obj);
      S.settings = Object.assign(defaultState().settings, obj.settings || {});
      S.settings.apiKey = keepKey;
      save();
      render();
      renderHistory();
      autoState();
      checkAchv();
      box.className = 'key-msg ok';
      box.textContent = '导入成功：' + S.name + ' · Lv.' + levelInfo(S.exp).lv + ' · 经验 ' + S.exp;
      toast('宠物已搬过来');
    } catch (e) {
      box.className = 'key-msg err';
      box.textContent = '口令无效：' + (e && e.message ? e.message : '解析失败');
    }
  }

  /* ========== 体检（极端防呆） ========== */

  function probeStorage() {
    try {
      var k = '__pet_probe__';
      localStorage.setItem(k, '1');
      var v = localStorage.getItem(k);
      localStorage.removeItem(k);
      return v === '1' ? { ok: true, msg: '可读写' } : { ok: false, msg: '写入无效（可能被降级为内存）' };
    } catch (e) {
      return { ok: false, msg: '被禁用（无痕/隐私模式）' };
    }
  }

  function probeImage(url, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var im = new Image();
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        resolve({ ok: false, msg: '超时 ' + timeoutMs + 'ms，可能是网络慢或资源被拦' });
      }, timeoutMs);
      im.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ok: true, msg: im.naturalWidth + '×' + im.naturalHeight + ' 已加载' });
      };
      im.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ ok: false, msg: '加载失败（路径或网络问题）' });
      };
      im.src = url;
    });
  }

  function probeVideo(url, timeoutMs) {
    return new Promise(function (resolve) {
      var v = document.createElement('video');
      v.muted = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.preload = 'auto';
      var done = false;
      var finish = function (r) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(r);
      };
      var timer = setTimeout(function () { finish({ ok: false, msg: '加载超时 ' + timeoutMs + 'ms' }); }, timeoutMs);
      v.onloadeddata = function () {
        finish({ ok: true, msg: v.videoWidth + '×' + v.videoHeight + ' 可解码', video: v });
      };
      v.onerror = function () {
        finish({ ok: false, msg: '解码失败，可能不支持 VP9/WebM' });
      };
      try { v.src = url; v.load(); } catch (e) { finish({ ok: false, msg: '无法创建 video' }); }
    });
  }

  function probeAlpha(video) {
    if (!video) return { ok: true, msg: '跳过（无视频）' };
    try {
      var c = document.createElement('canvas');
      c.width = 12;
      c.height = 12;
      var ctx = c.getContext('2d');
      ctx.drawImage(video, 0, 0, 12, 12);
      var d = ctx.getImageData(0, 0, 12, 12).data;
      var transparent = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++;
      if (transparent === 0) return { ok: false, msg: '整帧不透明，会显示成黑底（请关掉高清动作）' };
      return { ok: true, msg: '透明像素 ' + transparent + '/144，透明通道正常' };
    } catch (e) {
      return { ok: true, msg: '无法采样（跨域或未解码），跳过' };
    }
  }

  function probeApi() {
    return new Promise(function (resolve) {
      var done = false;
      var ctl = null;
      var finish = function (r) { if (done) return; done = true; resolve(r); };
      try {
        if (window.AbortController) ctl = new AbortController();
      } catch (e) { ctl = null; }
      var timer = setTimeout(function () {
        if (ctl) { try { ctl.abort(); } catch (e) {} }
        finish({ ok: false, msg: '请求超时 6s' });
      }, 6000);
      try {
        fetch(API_BASE + '/models', { method: 'GET', signal: ctl ? ctl.signal : undefined })
          .then(function (r) {
            clearTimeout(timer);
            finish({ ok: true, msg: '可达（HTTP ' + r.status + '，没带 Key 属正常）' });
          })
          .catch(function (e) {
            clearTimeout(timer);
            finish({ ok: false, msg: '连不上：' + (e && e.message ? e.message : '网络错误') });
          });
      } catch (e) {
        clearTimeout(timer);
        finish({ ok: false, msg: '浏览器不支持 fetch' });
      }
    });
  }

  var lastDiag = [];

  function renderDiag(list) {
    lastDiag = list;
    var box = $('diagList');
    var html = '';
    for (var i = 0; i < list.length; i++) {
      html += '<div class="diag-item ' + (list[i].ok ? 'ok' : 'bad') + '">' +
        '<i class="dot"></i><div><span class="d-k">' + esc(list[i].name) + '</span>' +
        '<span class="d-v">' + esc(list[i].msg) + '</span></div></div>';
    }
    box.innerHTML = html;
  }

  function runDiag() {
    var list = [];
    $('diag').hidden = false;
    renderDiag([{ ok: true, msg: '正在检查…', name: '体检中' }]);

    var st = probeStorage();
    list.push({ name: '本地存储', ok: st.ok, msg: st.msg });
    list.push({
      name: '浏览器内核',
      ok: true,
      msg: (navigator.userAgent || '未知').slice(0, 90)
    });

    var gifUrl = assetUrl(ART['idle']);
    var webmUrl = assetUrl(ART['idle'].replace(/\.gif$/, '.webm'));

    probeImage(gifUrl, 6000).then(function (r) {
      list.push({ name: '动作素材（GIF 回退）', ok: r.ok, msg: r.msg });
      renderDiag(list);

      return probeVideo(webmUrl, 6000).then(function (v) {
        list.push({ name: '高清解码（VP9/WebM）', ok: v.ok, msg: v.msg });
        if (v.ok) {
          var a = probeAlpha(v.video);
          list.push({ name: '透明通道', ok: a.ok, msg: a.msg });
        }
        renderDiag(list);
        return probeApi();
      });
    }).then(function (r) {
      list.push({ name: 'DeepSeek 接口', ok: r.ok, msg: r.msg });
      var cur = S.settings.apiKey ? '已填写' : '未填写（演示模式）';
      list.push({ name: 'API Key', ok: !!S.settings.apiKey, msg: cur });
      var hasTilt = typeof DeviceOrientationEvent !== 'undefined';
      list.push({ name: '体感传感器', ok: hasTilt, msg: hasTilt ? '接口可用（Android 无授权弹窗，iOS 才弹）' : '浏览器不提供 deviceorientation' });
      list.push({ name: '存档', ok: true, msg: 'Lv.' + levelInfo(S.exp).lv + ' · 经验 ' + S.exp + ' · 会话 ' + S.chats });
      renderDiag(list);
    }).catch(function (e) {
      list.push({ name: '体检异常', ok: false, msg: (e && e.message) || '未知' });
      renderDiag(list);
    });
  }

  function copyDiag() {
    var lines = lastDiag.map(function (d) { return (d.ok ? '[OK] ' : '[FAIL] ') + d.name + ': ' + d.msg; });
    lines.push('UA: ' + navigator.userAgent);
    lines.push('URL: ' + location.href);
    lines.push('时间: ' + new Date().toISOString());
    var text = lines.join('\n');
    if (copyText(text)) toast('诊断信息已复制');
    else toast('复制失败，请手动选择文本');
  }

  var PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="124" viewBox="0 0 220 124">' +
    '<ellipse cx="110" cy="96" rx="46" ry="9" fill="rgba(0,0,0,0.25)"/>' +
    '<circle cx="110" cy="58" r="34" fill="none" stroke="#8a8fb0" stroke-width="2" stroke-dasharray="5 5"/>' +
    '<text x="110" y="64" font-size="22" text-anchor="middle" fill="#8a8fb0">?</text></svg>');

  function guardAssets() {
    var img = $('petImg');
    if (!img) return;
    var fired = false;
    img.addEventListener('error', function () {
      if (fired) return;
      fired = true;
      if (S.settings.hd !== false) return; // 高清失败会自动回退，不报错
      img.setAttribute('src', PLACEHOLDER);
      say('素材没加载出来…点右上角「?」做个检查。');
      toast('素材加载失败，可以运行体检看看');
    });
  }

  // 旧缓存页面 + 新脚本时，按钮会全部失效；这里给出可点的自愈入口
  function showVerBar() {
    if (document.getElementById('verBar')) return;
    var bar = document.createElement('div');
    bar.id = 'verBar';
    bar.className = 'ver-bar';
    bar.innerHTML = '<span>页面与脚本版本不一致，点右侧刷新</span><button type="button">刷新</button>';
    bar.getElementsByTagName('button')[0].onclick = function () {
      var base = location.href.split('#')[0].split('?')[0];
      location.replace(base + '?fresh=' + Date.now());
    };
    document.body.appendChild(bar);
  }

  function guardVersion() {
    var need = ['petLayer', 'chatBar', 'stage', 'inpWander', 'inpFollow', 'btnTilt', 'btnBalance'];
    var miss = [];
    for (var i = 0; i < need.length; i++) {
      if (!$(need[i])) miss.push(need[i]);
    }
    if (miss.length) {
      showVerBar();
      return false;
    }
    return true;
  }

  function bind() {
    if (!guardVersion()) return;
    try {
      bindInner();
    } catch (e) {
      toast('界面初始化出错：' + ((e && e.message) || '未知'));
      showVerBar();
    }
  }

  /* ========== 启动 ========== */

  function boot() {
    var ua = navigator.userAgent || '';
    if (/MicroMessenger/i.test(ua)) {
      $('wxTip').hidden = false;
      document.body.className = 'wx-open';
    }

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

    renderHistory();
    startWander();
    scheduleAmbient();
    setTimeout(warmup, 1500);
    setTimeout(function () { refreshBalance(true); }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
