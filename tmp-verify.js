'use strict';
// 临时脚本：验证新增的电影院 / 人鱼魔女在"两个版本"里都能正常跑通
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const { THEMES, ORDER } = require('./shared/themes');
const { Game } = require('./shared/engine');
const FLOW = require('./shared/flow');
const CONTENT = require('./shared/content');
const { Canvas } = require('./src/canvas');
const board = require('./src/screens/board');
const play = require('./src/screens/play');

// ——————————————— 1. 终端版：把每个地点（含电影院）都画一遍 ———————————————
function makeApp(id, screen) {
  return {
    themeId: id,
    screen: screen || 'play',
    boardIndex: 0,
    game: null,
    hit: {},
    get theme() { return THEMES[this.themeId]; },
    setTheme(x) { FLOW.setTheme(this, x); },
    quit() {},
  };
}

function renderTerminal(app, w, h) {
  const cv = new Canvas(w, h, app.theme);
  if (app.screen === 'board') board.draw(app, cv);
  else play.draw(app, cv);
  return cv.render();
}

let checks = 0;
for (const id of ORDER) {
  for (const placeId of Object.keys(CONTENT.PLACES)) {
    const app = makeApp(id);
    app.game = new Game(THEMES[id]);
    app.game.applyWish('protect');
    app.game.moveTo(placeId);
    if (app.game.s.place !== placeId) throw new Error('无法进入 ' + placeId);
    for (const [w, h] of [[60, 22], [100, 32]]) renderTerminal(app, w, h);
    checks += 1;
  }
}
console.log('[终端版] 全部地点渲染通过：', checks, '处');

// 商店街 → 仔细调查 → 出现电影院
{
  const app = makeApp('homura');
  app.game = new Game(THEMES.homura);
  app.game.applyWish('protect');
  app.game.moveTo('shopping');
  const before = app.game.visibleExits().map((e) => e.to);
  if (before.indexOf('cinema') >= 0) throw new Error('困难模式下电影院不该一开始就可见');
  app.game.look();
  const after = app.game.visibleExits().map((e) => e.to);
  if (after.indexOf('cinema') < 0) throw new Error('仔细调查后应发现电影院');

  const app2 = makeApp('madoka');
  app2.game = new Game(THEMES.madoka);
  app2.game.applyWish('protect');
  app2.game.moveTo('shopping');
  const easy = app2.game.visibleExits().map((e) => e.to);
  if (easy.indexOf('cinema') < 0) throw new Error('简单模式下电影院应直接可见');
  console.log('[终端版] 电影院入口：困难模式需调查、简单模式直接可见 —— 符合预期');
}

// 人鱼魔女：能打、计入讨伐数、有 aura
{
  const app = makeApp('madoka');
  const g = new Game(THEMES.madoka);
  app.game = g;
  g.applyWish('protect');
  g.moveTo('cinema');
  const item = FLOW.playMenu(g).find((i) => i.key === 'witch');
  if (!item) throw new Error('电影院里应该能「追着气息走进结界」');
  FLOW.playSelect(app, g, 'witch');
  if (!g.battle || g.battle.key !== 'oktavia') throw new Error('进结界应遭遇人鱼的魔女');
  if (g.battle.aura !== 1) throw new Error('人鱼的魔女应有 aura');
  const seedsBefore = g.s.seeds;
  let turns = 0;
  while (g.battle && g.mode === 'battle' && turns < 300) {
    FLOW.playSelect(app, g, 'magic');
    turns += 1;
  }
  if (g.s.over) throw new Error('用魔法的打法不该输给人鱼的魔女：' + g.s.over);
  if (g.s.witches !== 1) throw new Error('打完人鱼魔女应计入讨伐数，实际 ' + g.s.witches);
  if (g.s.seeds <= seedsBefore) throw new Error('人鱼魔女应掉落悲叹之种');
  console.log('[终端版] 人鱼的魔女：可挑战 / 计入讨伐 / 掉落种子，', turns, '回合结束');
}

// ——————————————— 2. 网页版：DOM 打桩跑一遍 ———————————————
const html = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');

function makeEl(tag) {
  const cls = new Set();
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    children: [],
    innerHTML: '',
    disabled: false,
    scrollTop: 0,
    scrollHeight: 0,
    attrs: {},
    handlers: {},
    style: { setProperty(k, v) { this[k] = v; } },
  };
  let _className = '';
  let _text = '';
  Object.defineProperty(el, 'className', {
    get: () => _className,
    set: (v) => {
      _className = String(v);
      cls.clear();
      String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c));
    },
  });
  Object.defineProperty(el, 'textContent', {
    get: () => _text,
    set: (v) => { _text = String(v); el.children.length = 0; },
  });
  Object.defineProperty(el, 'classList', {
    get: () => ({
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      contains: (c) => cls.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !cls.has(c) : !!force;
        if (on) cls.add(c); else cls.delete(c);
        return on;
      },
    }),
  });
  el.appendChild = (c) => { el.children.push(c); return c; };
  el.addEventListener = (t, fn) => { (el.handlers[t] = el.handlers[t] || []).push(fn); };
  el.setAttribute = (k, v) => { el.attrs[k] = v; if (k === 'class') el.className = v; };
  el.getAttribute = (k) => (k === 'class' ? el.className : el.attrs[k]);
  el.blur = () => {};
  return el;
}

const ids = {};
const idRe = /id="([^"]+)"/g;
let m;
while ((m = idRe.exec(html))) ids[m[1]] = makeEl('div');
const chips = { madoka: makeEl('button'), homura: makeEl('button') };
chips.madoka.setAttribute('data-theme', 'madoka');
chips.homura.setAttribute('data-theme', 'homura');
const metaTheme = makeEl('meta');
const docHandlers = {};

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('var window = globalThis;', sandbox);
sandbox.document = {
  readyState: 'complete',
  documentElement: makeEl('html'),
  activeElement: null,
  getElementById: (id) => ids[id] || (ids[id] = makeEl('div')),
  createElement: (tag) => makeEl(tag),
  querySelector: (sel) => {
    const hit = /\.chip\[data-theme="(.+)"\]/.exec(sel);
    if (hit) return chips[hit[1]] || null;
    if (sel === 'meta[name="theme-color"]') return metaTheme;
    return null;
  },
  querySelectorAll: (sel) => (sel === '.chip[data-theme]' ? [chips.madoka, chips.homura] : []),
  addEventListener: (t, fn) => { (docHandlers[t] = docHandlers[t] || []).push(fn); },
};

for (const f of ['themes.js', 'content.js', 'engine.js', 'flow.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared', f), 'utf8'), sandbox, { filename: f });
}
vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/app.js'), 'utf8'), sandbox, { filename: 'app.js' });

const app = sandbox.madokaApp;
const click = (el) => (el.handlers.click || []).forEach((fn) => fn({}));
const K = { up: 'ArrowUp', down: 'ArrowDown', enter: 'Enter', escape: 'Escape', tab: 'Tab', space: ' ' };
const key = (k) => (docHandlers.keydown || []).forEach((fn) => fn({ key: k, preventDefault() {} }));
const rnd = (n) => Math.floor(Math.random() * n);
const labels = () => ids['actions'].children.map((c) => c.children[1].textContent);

let steps = 0;
for (let i = 0; i < 4000; i += 1) {
  steps += 1;
  if (app.screen === 'board') {
    const items = ids['board-menu'].children.filter((c) => !c.disabled);
    if (Math.random() < 0.2) click(chips[rnd(2) === 0 ? 'madoka' : 'homura']);
    else if (Math.random() < 0.2) key([K.up, K.down, K.tab, '1', '2', '3'][rnd(6)]);
    else click(items[rnd(items.length)]);
  } else if (app.screen === 'play') {
    const items = ids['actions'].children.filter((c) => !c.disabled);
    if (!items.length) key(K.enter);
    else if (Math.random() < 0.3) key([K.up, K.down, K.enter, K.escape][rnd(4)]);
    else click(items[rnd(items.length)]);
  } else if (app.screen === 'ending') click(ids['ending-back']);
  else if (app.screen === 'about') click(ids['about-back']);
  else if (app.screen === 'bye') click(ids['bye-back']);
  else throw new Error('未知画面 ' + app.screen);
}

// 定向：走到电影院，把人鱼魔女打完
app.screen = 'board';
click(chips.madoka);
click(ids['board-menu'].children[0]);
const g = app.game;
click(ids['actions'].children[0]); // 许愿
g.moveTo('cinema');
key(K.down);
const witchBtn = ids['actions'].children.find((c) => c.children[1].textContent.indexOf('结界') >= 0);
if (!witchBtn) throw new Error('网页版电影院里没有「追着气息走进结界」');
click(witchBtn);
if (!g.battle || g.battle.key !== 'oktavia') throw new Error('网页版没有正确进入人鱼的魔女战斗');
if (ids['bar-enemy-text'].textContent.indexOf('人鱼的魔女') < 0) {
  throw new Error('网页版敌人条没有显示人鱼的魔女：' + ids['bar-enemy-text'].textContent);
}
let guard = 0;
while (g.mode === 'battle' && guard < 300) {
  const items = ids['actions'].children.filter((c) => !c.disabled);
  const magic = items.find((c) => c.children[1].textContent.indexOf('魔法') === 0);
  click(magic || items[0]);
  guard += 1;
}
if (g.mode === 'battle') throw new Error('人鱼的魔女战斗没有结束');
if (g.s.witches !== 1) throw new Error('网页版讨伐数不对：' + g.s.witches + '（over=' + g.s.over + '）');
console.log('[网页版] 随机', steps, '步无异常；电影院 → 人鱼的魔女 → 讨伐计数 均正常（', guard, '回合）');

console.log('\n全部通过。');
