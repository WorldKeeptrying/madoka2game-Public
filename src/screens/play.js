'use strict';

// 终端版的游戏画面：只负责把共享层给出的状态与菜单画出来。
// 菜单有哪些项、点了会怎样，全部由 shared/flow.js 定义（网页版共用）。

const { stringWidth, wrapText } = require('../canvas');
const FLOW = require('../../shared/flow');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 战斗特效：记录上一次渲染时的血量，靠前后对比判定「受击」与「命中」
let lastFx = { game: null, hp: null, ehp: null };

// ——————————————————————————— 绘制 ———————————————————————————

function toneStyle(p, tone) {
  switch (tone) {
    case 'title':
      return { fg: p.title, bold: true };
    case 'good':
      return { fg: p.good };
    case 'bad':
      return { fg: p.bad };
    case 'warn':
      return { fg: p.warn };
    case 'dim':
      return { fg: p.dim };
    default:
      return { fg: p.text };
  }
}

function drawBar(cv, x, y, label, ratio, valueText, color, p) {
  cv.text(x, y, label, { fg: p.dim });
  const bx = x + 12;
  const width = Math.max(6, Math.min(28, cv.w - bx - 16));
  const filled = Math.round(width * clamp(ratio, 0, 1));
  cv.text(bx, y, '█'.repeat(filled), { fg: color });
  cv.text(bx + filled, y, '░'.repeat(width - filled), { fg: p.frameDim });
  cv.text(bx + width + 2, y, valueText, { fg: p.text });
}

function corruptColor(p, v) {
  if (v >= 70) return p.meterHigh;
  if (v >= 40) return p.meterMid;
  return p.meterLow;
}

function drawLog(cv, g, x, y, w, h, p) {
  const rows = [];
  for (let i = g.s.log.length - 1; i >= 0 && rows.length < h; i -= 1) {
    const entry = g.s.log[i];
    const wrapped = entry.text === '' ? [''] : wrapText(entry.text, w);
    const room = h - rows.length;
    const take = wrapped.slice(Math.max(0, wrapped.length - room));
    for (let j = take.length - 1; j >= 0; j -= 1) {
      rows.push({ text: take[j], tone: entry.tone });
    }
  }
  rows.reverse();
  const startY = y + h - rows.length;
  rows.forEach((r, i) => cv.text(x, startY + i, r.text, toneStyle(p, r.tone)));
}

function drawEnding(app, cv) {
  const g = app.game;
  const p = app.theme.palette;
  const ending = app.theme.endings[g.s.over] || app.theme.endings.dead;
  const W = cv.w;
  const H = cv.h;

  const bw = Math.max(32, Math.min(72, W - 6));
  const inner = Math.max(10, bw - 4);
  const bx = Math.max(1, Math.round((W - bw) / 2));

  let lines = [];
  for (const l of ending.lines) {
    lines = lines.concat(l === '' ? [''] : wrapText(l, inner));
  }
  lines = lines.slice(0, Math.max(1, H - 8));
  const bh = lines.length + 4;
  const y = Math.max(1, Math.floor((H - bh) / 2));

  cv.box(bx, y, bw, bh, { fg: p.frame }, ending.title);
  lines.forEach((l, i) => cv.text(bx + 2, y + 2 + i, l, { fg: p.text }));
  if (y + bh + 1 < H) {
    cv.textCenter(y + bh + 1, '按 Enter 回到公告板', { fg: p.dim });
  }
}

function draw(app, cv) {
  const g = app.game;
  if (!g) {
    app.screen = 'board';
    return;
  }
  if (g.mode === 'over') {
    drawEnding(app, cv);
    return;
  }

  const t = app.theme;
  const p = t.palette;
  const W = cv.w;
  const H = cv.h;

  // —— 战斗特效：受击时生命条变血红，命中时敌人血条变主题色 ——
  const freshFx = lastFx.game !== g;
  lastFx.game = g;
  const curHp = g.s.hp;
  const curEhp = g.battle ? g.battle.hp : null;
  const hitFx = !freshFx && lastFx.hp !== null && curHp < lastFx.hp;
  const flashFx = !freshFx && lastFx.ehp !== null && curEhp !== null && curEhp < lastFx.ehp;
  lastFx.hp = curHp;
  lastFx.ehp = curEhp;

  const pl = g.place;
  const lineStyle = { fg: p.frameDim };
  const headStyle = { fg: p.frame, bold: true };

  // 顶栏
  const placeText = pl ? ` ${pl.name}${pl.subtitle ? ' · ' + pl.subtitle : ''}` : ' 见泷原';
  cv.text(1, 0, placeText, headStyle);
  cv.textRight(W - 2, 0, `${t.label} · ${t.modeName}`, { fg: p.dim });
  cv.hline(1, 0, W - 1, '─', lineStyle);

  // 状态条
  drawBar(cv, 2, 2, '生命', g.s.hp / g.s.maxHp, `${Math.round(g.s.hp)} / ${g.s.maxHp}`, hitFx ? p.bad : p.good, p);
  drawBar(
    cv,
    2,
    3,
    '灵魂宝石',
    g.s.corrupt / 100,
    `污浊 ${Math.round(g.s.corrupt)} / 100`,
    corruptColor(p, g.s.corrupt),
    p
  );
  if (g.battle) {
    const b = g.battle;
    drawBar(cv, 2, 4, '敌人', b.hp / b.maxHp, `${b.name} ${Math.max(0, b.hp)}/${b.maxHp}`, flashFx ? p.accent : p.bad, p);
  } else {
    const bits = [`悲叹之种 ×${g.s.seeds}`, `应急糖果 ×${g.s.candies}`, `讨伐魔女 ${g.s.witches}/4`];
    if (g.rules.rewinds > 0) bits.push(`回溯 ×${g.s.rewinds}`);
    cv.text(14, 4, bits.join('　'), { fg: p.dim });
  }
  cv.hline(5, 0, W - 1, '─', lineStyle);

  // 正文（日志）
  const items = FLOW.playMenu(g);
  const menuH = items.length;
  const menuTop = Math.max(7, H - 2 - menuH);
  const sepY = menuTop - 1;
  const logTop = 6;
  const logH = Math.max(1, sepY - logTop);
  drawLog(cv, g, 3, logTop, Math.max(10, W - 6), logH, p);

  // 菜单分隔（嵌入标题）
  const title = ` ${FLOW.playMenuTitle(g)} `;
  const rightLen = Math.max(0, W - stringWidth(title) - 2);
  cv.text(0, sepY, '──' + title + '─'.repeat(rightLen), lineStyle);

  // 菜单
  items.forEach((item, i) => {
    const y = menuTop + i;
    if (y >= H - 1) return;
    const sel = i === g.menuIndex;
    const disabled = !!item.disabled;
    const st = sel
      ? { fg: p.selectFg, bg: p.selectBg, bold: true }
      : disabled
      ? { fg: p.frameDim }
      : { fg: p.text };
    const text = `${sel ? '> ' : '  '}${item.label}`;
    cv.fillRect(2, y, Math.max(4, W - 4), 1, st);
    cv.text(3, y, text, st);
  });

  // 底部提示
  cv.textCenter(H - 1, '↑ ↓ 选择 · Enter 确认 · Esc 返回上一层', { fg: p.dim });
}

function input(app, evt) {
  if (evt.type !== 'key') return;
  if (!app.game) {
    app.screen = 'board';
    return;
  }
  FLOW.playKey(app, evt.name);
}

module.exports = { draw, input };
