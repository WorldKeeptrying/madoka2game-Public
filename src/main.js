#!/usr/bin/env node
'use strict';

const ansi = require('./ansi');
const { Canvas } = require('./canvas');
const { THEMES } = require('../shared/themes');
const FLOW = require('../shared/flow');
const board = require('./screens/board');
const about = require('./screens/about');
const play = require('./screens/play');

const app = {
  themeId: 'madoka',
  screen: 'board', // board | about | play
  boardIndex: 0,
  game: null,
  hit: {},
  get theme() {
    return THEMES[this.themeId];
  },
  setTheme(id) {
    FLOW.setTheme(this, id);
  },
  quit() {
    shutdown();
  },
};

// ——————————————————————————— 渲染 ———————————————————————————

function size() {
  return {
    w: Math.max(40, process.stdout.columns || 80),
    h: Math.max(20, process.stdout.rows || 24),
  };
}

function render() {
  const { w, h } = size();
  const cv = new Canvas(w, h, app.theme);
  if (app.screen === 'board') board.draw(app, cv);
  else if (app.screen === 'about') about.draw(app, cv);
  else if (app.screen === 'play') play.draw(app, cv);
  process.stdout.write(ansi.home + cv.render());
}

// ——————————————————————————— 输入解析 ———————————————————————————

const KEYMAP = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
  Z: 'back',
};

const SGR_MOUSE = /^\u001b\[<(\d+);(\d+);(\d+)([Mm])/;
const X10_MOUSE = /^\u001b\[M([\s\S])([\s\S])([\s\S])/;
const CSI = /^\u001b\[([0-9;?]*)([A-Za-z~])/;

function parseInput(buf) {
  const events = [];
  let i = 0;
  while (i < buf.length) {
    const ch = buf[i];
    if (ch === '\u001b') {
      const rest = buf.slice(i);
      let m = SGR_MOUSE.exec(rest);
      if (m) {
        events.push({ type: 'mouse', button: Number(m[1]), x: Number(m[2]) - 1, y: Number(m[3]) - 1 });
        i += m[0].length;
        continue;
      }
      m = X10_MOUSE.exec(rest);
      if (m) {
        const button = m[1].charCodeAt(0) - 32;
        if (button === 32 || button === 0) {
          events.push({
            type: 'mouse',
            button: 0,
            x: m[2].charCodeAt(0) - 33,
            y: m[3].charCodeAt(0) - 33,
          });
        }
        i += m[0].length;
        continue;
      }
      m = CSI.exec(rest);
      if (m) {
        const name = KEYMAP[m[2]];
        if (name) events.push({ type: 'key', name });
        i += m[0].length;
        continue;
      }
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') events.push({ type: 'key', name: 'enter' });
    else if (ch === '\t') events.push({ type: 'key', name: 'tab' });
    else if (ch === ' ') events.push({ type: 'key', name: 'space' });
    else if (ch === '\u0003') events.push({ type: 'key', name: 'ctrlc' });
    else if (ch === '\u007f' || ch === '\b') events.push({ type: 'key', name: 'back' });
    else events.push({ type: 'key', name: ch.toLowerCase() });
    i += 1;
  }
  return events;
}

function handle(evt) {
  if (evt.type === 'key' && evt.name === 'ctrlc') {
    shutdown();
    return;
  }
  if (app.screen === 'board') board.input(app, evt);
  else if (app.screen === 'about') about.input(app, evt);
  else if (app.screen === 'play') play.input(app, evt);
}

// ——————————————————————————— 启动 / 退出 ———————————————————————————

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    process.stdout.write(ansi.mouseOff + ansi.showCursor + ansi.clear + ansi.altOff);
  } catch (e) {
    /* ignore */
  }
  process.exit(0);
}

function startup() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write(
      '《银之庭院》需要在交互式终端里运行。\n' +
        '请在终端中执行： npm start   （Windows 建议使用 Windows Terminal / PowerShell 7）\n'
    );
    process.exit(1);
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdout.write(ansi.altOn + ansi.hideCursor + ansi.clear + ansi.mouseOn);
  process.stdout.write(ansi.setTitle('银之庭院 · 魔法少女小圆 风格文字冒险'));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.stdout.on('error', shutdown);
  process.stdout.on('resize', render);

  process.stdin.on('data', (chunk) => {
    if (shuttingDown) return;
    for (const evt of parseInput(String(chunk))) {
      handle(evt);
      if (shuttingDown) return;
    }
    render();
  });

  render();
}

startup();
