'use strict';

// 启动页：正面居中的「公告板」，右上角可切换主题

const { stringWidth, wrapText } = require('../canvas');
const { THEMES, ORDER } = require('../../shared/themes');
const FLOW = require('../../shared/flow');

const MENU = FLOW.BOARD_MENU; // 菜单项与动作由共享层定义，网页版完全一致

// 右上角的主题切换器（可点击）
function drawToggle(app, cv) {
  const p = app.theme.palette;
  const label = '主题 ';
  let total = stringWidth(label);
  ORDER.forEach((id, i) => {
    total += stringWidth(THEMES[id].chip) + (i ? 2 : 0);
  });
  let x = Math.max(1, cv.w - 2 - total);
  const y = 0;

  cv.text(x, y, label, { fg: p.dim });
  x += stringWidth(label);

  app.hit = {};
  ORDER.forEach((id, i) => {
    if (i) x += 2;
    const sel = app.themeId === id;
    const st = sel
      ? { fg: p.selectFg, bg: p.accent, bold: true }
      : { fg: p.dim, bg: p.accentSoft };
    cv.text(x, y, THEMES[id].chip, st);
    app.hit[id] = { x1: x, x2: x + stringWidth(THEMES[id].chip) - 1, y };
    x += stringWidth(THEMES[id].chip);
  });
}

function draw(app, cv) {
  const t = app.theme;
  const p = t.palette;
  const W = cv.w;
  const H = cv.h;

  const bw = Math.max(30, Math.min(66, W - 6));
  const inner = Math.max(10, bw - 4);
  const bx = Math.max(1, Math.round((W - bw) / 2));

  // 正文折行
  let body = [];
  for (const line of t.boardLines) {
    if (line === '') {
      body.push('');
      continue;
    }
    body = body.concat(wrapText(line, inner));
  }

  // 窄屏时自动精简：先省落款，再省一条提示，保证菜单永远完整可见
  const hintsH = H >= 26 ? 2 : 1;
  const footH = H >= 25 ? 2 : H >= 22 ? 1 : 0;
  const BOARD_FIXED = 9; // 上下边框 + 两排图钉 + 标题 + 副标题 + 分隔 + 两个空行
  const chrome = 2 + BOARD_FIXED + footH + 2 + MENU.length + hintsH;

  const maxBody = Math.max(1, Math.min(body.length, H - 2 - chrome));
  body = body.slice(0, maxBody);
  const bh = BOARD_FIXED + body.length;

  let y = Math.max(2, Math.floor((H - (chrome + body.length)) / 2));

  // 顶部小装饰
  cv.textCenter(y, '── 「 公 告 板 」 ──', { fg: p.frameDim });
  y += 2;

  // 板身
  cv.box(bx, y, bw, bh, { fg: p.frame });
  const pin = t.boardPin;
  cv.text(bx + 2, y + 1, pin, { fg: p.accent });
  cv.text(bx + bw - 3, y + 1, pin, { fg: p.accent });
  cv.text(bx + 2, y + bh - 2, pin, { fg: p.accent });
  cv.text(bx + bw - 3, y + bh - 2, pin, { fg: p.accent });

  cv.textCenter(y + 2, t.boardTitle, { fg: p.title, bold: true });
  cv.textCenter(y + 3, t.boardSub, { fg: p.dim });
  const dots = ('· '.repeat(Math.max(1, Math.ceil((bw - 6) / 2)))).slice(0, bw - 6);
  cv.textCenter(y + 4, dots, { fg: p.frameDim });

  body.forEach((line, i) => {
    if (line === '') return;
    cv.textCenter(y + 6 + i, line, { fg: p.text });
  });

  // 落款 + 难度 + 菜单
  let cy = y + bh + 1;
  if (footH >= 1 && cy < H) {
    cv.textCenter(cy, t.boardFoot, { fg: p.dim });
    cy += 1;
  }
  if (footH >= 2 && cy < H) {
    cv.textCenter(cy, `〔 ${t.modeName} · ${t.modeTag} 〕`, { fg: p.accent, bold: true });
    cy += 1;
  }

  const menuY = cy + 1;
  MENU.forEach((item, i) => {
    const my = menuY + i;
    if (my >= H - hintsH) return;
    const sel = i === app.boardIndex;
    const st = sel
      ? { fg: p.selectFg, bg: p.selectBg, bold: true }
      : { fg: p.text };
    cv.fillRect(bx, my, bw, 1, st);
    const lx = Math.round((W - stringWidth(item.label)) / 2);
    cv.text(lx, my, item.label, st);
    cv.text(lx - 2, my, sel ? '>' : ' ', st);
  });

  // 底部提示
  if (hintsH >= 2) {
    cv.textCenter(H - 2, '↑ ↓ 选择 · Enter 确认 · Tab / ← → 切换主题（也可以直接点右上角）', { fg: p.dim });
    cv.textCenter(H - 1, t.hint, { fg: p.frameDim });
  } else {
    cv.textCenter(H - 1, '↑ ↓ 选择 · Enter 确认 · Tab 切换主题（也可点右上角）', { fg: p.dim });
  }

  // 主题切换器画在最上层，保证可点击区域不被覆盖
  drawToggle(app, cv);
}

function input(app, evt) {
  // 鼠标：命中测试属于终端渲染层的坐标，命中后交给共享层切主题
  if (evt.type === 'mouse') {
    const hits = app.hit || {};
    for (const id of ORDER) {
      const h = hits[id];
      if (h && evt.y === h.y && evt.x >= h.x1 && evt.x <= h.x2) {
        FLOW.setTheme(app, id);
        return;
      }
    }
    return;
  }
  FLOW.boardKey(app, evt.name);
}

module.exports = { draw, input };
