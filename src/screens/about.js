'use strict';

// 「庭院的规矩」——玩法说明页（正文居中排版）
// 文案内容来自共享层 shared/flow.js，网页版显示的是同一份。

const { wrapText } = require('../canvas');
const FLOW = require('../../shared/flow');

function draw(app, cv) {
  const p = app.theme.palette;
  const W = cv.w;
  const H = cv.h;
  const bw = Math.max(30, Math.min(76, W - 6));
  const inner = Math.max(10, bw - 4);
  const bx = Math.max(1, Math.round((W - bw) / 2));

  const lines = [];
  for (const [text, tone] of FLOW.aboutSections(app.theme)) {
    if (tone === 'gap' || text === '') {
      lines.push({ text: '', tone: 'gap' });
      continue;
    }
    const wrapped = wrapText(text, inner);
    wrapped.forEach((w, i) => lines.push({ text: w, tone: i === 0 ? tone : 'text' }));
  }

  const visible = Math.max(1, Math.min(lines.length, H - 6));
  const shown = lines.slice(0, visible);
  let y = Math.max(1, Math.floor((H - visible) / 2));

  for (const line of shown) {
    if (line.tone === 'title') {
      cv.textCenter(y, line.text, { fg: p.title, bold: true });
    } else if (line.tone === 'head') {
      cv.textCenter(y, line.text, { fg: p.accent });
    } else if (line.tone === 'dim') {
      cv.textCenter(y, line.text, { fg: p.dim });
    } else {
      cv.textCenter(y, line.text, { fg: p.text });
    }
    y += 1;
  }

  cv.textCenter(H - 2, '按任意键回到公告板', { fg: p.dim });
}

function input(app) {
  FLOW.aboutKey(app);
}

module.exports = { draw, input };
