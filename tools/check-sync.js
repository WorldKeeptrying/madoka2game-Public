#!/usr/bin/env node
'use strict';

// 同步守卫：npm run check
//
// 双版本开发最容易出的错是「在一边私自加功能」。
// 这个脚本检查三件事：
//   1. shared/ 在 Node 与浏览器两种环境下都能加载；
//   2. 两个版本拿到的功能清单（菜单项、禁用状态、说明文案）逐字一致；
//   3. 渲染层（src/screens、web/app.js）没有自己定义任何游戏功能。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SHARED = ['themes.js', 'content.js', 'engine.js', 'flow.js'];

let failures = 0;
const ok = (msg) => process.stdout.write('  [ok] ' + msg + '\n');
const bad = (msg) => {
  failures += 1;
  process.stdout.write('  [NG] ' + msg + '\n');
};

// ── 1. Node 侧 ─────────────────────────────────────────────
process.stdout.write('[1] 终端版（Node）加载 shared/\n');
const nodeMods = {};
for (const f of SHARED) {
  try {
    nodeMods[f] = require(path.join(ROOT, 'shared', f));
  } catch (e) {
    bad(`require shared/${f} 失败：${e.message}`);
  }
}
if (Object.keys(nodeMods).length === SHARED.length) ok('4 个共享模块都能被 require');

// ── 2. 浏览器侧 ────────────────────────────────────────────
process.stdout.write('[2] 网页版（浏览器）加载 shared/\n');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('var window = globalThis;', sandbox);
for (const f of SHARED) {
  const code = fs.readFileSync(path.join(ROOT, 'shared', f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
  } catch (e) {
    bad(`浏览器加载 shared/${f} 失败：${e.message}`);
  }
}
const M = sandbox.Madoka || {};
for (const key of ['themes', 'content', 'Game', 'flow']) {
  if (M[key]) ok('window.Madoka.' + key + ' 就绪');
  else bad('window.Madoka.' + key + ' 缺失');
}

// ── 3. 功能清单逐字比对 ────────────────────────────────────
process.stdout.write('[3] 两个版本的功能清单是否一致\n');
if (nodeMods['flow.js'] && M.flow) {
  const FLOWn = nodeMods['flow.js'];
  const FLOWb = M.flow;
  const themesN = nodeMods['themes.js'];
  const GameN = nodeMods['engine.js'].Game;

  const sig = (FLOW, g) =>
    FLOW.playMenu(g)
      .map((i) => `${i.key}|${i.label}|${!!i.disabled}`)
      .join(',');

  let same = true;
  for (const id of themesN.ORDER) {
    for (const mode of ['wish', 'main', 'battle', 'move', 'items']) {
      const a = new GameN(themesN.THEMES[id]);
      const b = new M.Game(M.themes.THEMES[id]);
      a.mode = mode;
      b.mode = mode;
      if (mode === 'battle') {
        a.startBattle('gertrud');
        b.startBattle('gertrud');
      }
      if (sig(FLOWn, a) !== sig(FLOWb, b)) {
        bad(`主题 ${id} / 模式 ${mode} 的菜单不一致`);
        same = false;
      }
    }
  }
  if (same) ok('各主题、各模式下的菜单项与禁用状态完全一致');

  const nBoard = FLOWn.BOARD_MENU.map((i) => i.key + '|' + i.label).join(',');
  const bBoard = FLOWb.BOARD_MENU.map((i) => i.key + '|' + i.label).join(',');
  if (nBoard === bBoard) ok('公告板菜单一致（' + nBoard + '）');
  else bad('公告板菜单不一致');

  const nAbout = JSON.stringify(FLOWn.aboutSections(themesN.THEMES.madoka));
  const bAbout = JSON.stringify(FLOWb.aboutSections(M.themes.THEMES.madoka));
  if (nAbout === bAbout) ok('「庭院的规矩」文案一致');
  else bad('「庭院的规矩」文案不一致');
}

// ── 4. 网页版确实引用了全部共享模块 ────────────────────────
process.stdout.write('[4] web/index.html 是否引用了全部共享模块\n');
const html = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');
for (const f of SHARED) {
  if (html.indexOf('shared/' + f) >= 0) ok('引用 shared/' + f);
  else bad('web/index.html 缺少 shared/' + f);
}

// ── 5. 渲染层不许自带功能 ──────────────────────────────────
process.stdout.write('[5] 渲染层是否私自定义功能\n');
const GUARDS = [
  {
    file: 'src/screens/board.js',
    must: [/require\('\.\.\/\.\.\/shared\/flow'\)/],
    mustNot: [/const MENU = \[/],
  },
  {
    file: 'src/screens/play.js',
    must: [/require\('\.\.\/\.\.\/shared\/flow'\)/, /FLOW\.playMenu\(/, /FLOW\.playMenuTitle\(/],
    mustNot: [/function battleMenu/, /function itemsMenu/, /function playSelect/],
  },
  {
    file: 'src/screens/about.js',
    must: [/FLOW\.aboutSections\(/],
    mustNot: [/庭 院 的 规 矩/],
  },
  {
    file: 'web/app.js',
    must: [/FLOW\.BOARD_MENU/, /FLOW\.playMenu\(/, /FLOW\.playSelect\(/, /FLOW\.aboutSections\(/],
    mustNot: [/function battleMenu/, /缔结契约/, /function playSelect/],
  },
];

for (const guard of GUARDS) {
  const src = fs.readFileSync(path.join(ROOT, guard.file), 'utf8');
  let clean = true;
  for (const re of guard.must) {
    if (!re.test(src)) {
      bad(`${guard.file} 应当使用共享层：${re}`);
      clean = false;
    }
  }
  for (const re of guard.mustNot) {
    if (re.test(src)) {
      bad(`${guard.file} 不应该自己定义功能：${re}`);
      clean = false;
    }
  }
  if (clean) ok(guard.file + ' 只负责渲染');
}

process.stdout.write(
  failures === 0 ? '\n同步检查通过：两个版本功能一致。\n' : `\n同步检查失败：${failures} 项。\n`
);
process.exit(failures === 0 ? 0 : 1);
