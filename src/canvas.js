'use strict';

// 一个非常轻量的全屏字符画布：按单元格绘制，最后一次性输出，避免闪烁。

const { reset, fg, bg, bold, dim } = require('./ansi');

// 只有确定是"全角"的字符按 2 列计算；
// 制表符/方块/箭头（U+2500–U+27BF 之类）统一按 1 列，保证大多数终端对齐一致。
const WIDE_RE = new RegExp(
  '^[' +
    '\\u1100-\\u115F' +
    '\\u2E80-\\u303E' +
    '\\u3041-\\u33FF' +
    '\\u3400-\\u4DBF' +
    '\\u4E00-\\u9FFF' +
    '\\uA000-\\uA4CF' +
    '\\uAC00-\\uD7A3' +
    '\\uF900-\\uFAFF' +
    '\\uFE30-\\uFE6F' +
    '\\uFF00-\\uFF60' +
    '\\uFFE0-\\uFFE6' +
    '\\u{1F000}-\\u{1FAFF}' +
    '\\u{20000}-\\u{3FFFD}' +
    ']$',
  'u'
);

function charWidth(ch) {
  return WIDE_RE.test(ch) ? 2 : 1;
}

function stringWidth(str) {
  let w = 0;
  for (const ch of String(str)) w += charWidth(ch);
  return w;
}

function wrapText(str, width) {
  const out = [];
  let line = '';
  let w = 0;
  for (const ch of String(str)) {
    const cw = charWidth(ch);
    if (w + cw > width) {
      out.push(line);
      line = '';
      w = 0;
    }
    line += ch;
    w += cw;
  }
  out.push(line);
  return out;
}

function padEnd(str, width, padChar) {
  const pad = (padChar === undefined ? ' ' : padChar);
  const diff = width - stringWidth(str);
  return diff > 0 ? str + pad.repeat(diff) : str;
}

function truncate(str, width) {
  let w = 0;
  let out = '';
  for (const ch of String(str)) {
    const cw = charWidth(ch);
    if (w + cw > width) break;
    out += ch;
    w += cw;
  }
  return out;
}

class Canvas {
  constructor(w, h, theme) {
    this.w = Math.max(20, w);
    this.h = Math.max(10, h);
    this.theme = theme;
    this.defaultStyle = { bg: theme.palette.bg };
    this.cells = new Array(this.w * this.h).fill(null);
  }

  styleKey(st) {
    return `${st.fg || ''}|${st.bg || ''}|${st.bold ? 1 : 0}|${st.dim ? 1 : 0}`;
  }

  set(x, y, ch, style, cont) {
    if (y < 0 || y >= this.h || x < 0 || x >= this.w) return;
    this.cells[y * this.w + x] = { ch, style: style || this.defaultStyle, cont: !!cont };
  }

  text(x, y, str, style) {
    let cx = x;
    for (const ch of String(str)) {
      if (cx >= this.w) break;
      const cw = charWidth(ch);
      if (cw === 2) {
        this.set(cx, y, ch, style, false);
        this.set(cx + 1, y, '', style, true);
      } else {
        this.set(cx, y, ch, style, false);
      }
      cx += cw;
    }
    return cx;
  }

  textRight(xEnd, y, str, style) {
    return this.text(xEnd - stringWidth(str) + 1, y, str, style);
  }

  textCenter(y, str, style, offset) {
    const x = Math.round((this.w - stringWidth(str)) / 2) + (offset || 0);
    return this.text(x, y, str, style);
  }

  fillRect(x, y, w, h, style) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        this.set(xx, yy, ' ', style, false);
      }
    }
  }

  hline(y, x1, x2, ch, style) {
    const c = ch || '─';
    for (let x = x1; x <= x2; x++) this.set(x, y, c, style, false);
  }

  vline(x, y1, y2, ch, style) {
    const c = ch || '│';
    for (let y = y1; y <= y2; y++) this.set(x, y, c, style, false);
  }

  // 圆角边框；title 会嵌在顶边中间
  box(x, y, w, h, style, title) {
    if (w < 2 || h < 2) return;
    this.set(x, y, '╭', style, false);
    this.set(x + w - 1, y, '╮', style, false);
    this.set(x, y + h - 1, '╰', style, false);
    this.set(x + w - 1, y + h - 1, '╯', style, false);
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      this.set(xx, y, '─', style, false);
      this.set(xx, y + h - 1, '─', style, false);
    }
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      this.set(x, yy, '│', style, false);
      this.set(x + w - 1, yy, '│', style, false);
    }
    if (title) {
      const label = ` ${title} `;
      const tx = x + Math.round((w - stringWidth(label)) / 2);
      this.text(tx, y, label, style);
    }
  }

  render() {
    const rows = [];
    for (let y = 0; y < this.h; y++) {
      let prevKey = null;
      let line = '';
      for (let x = 0; x < this.w; x++) {
        const c = this.cells[y * this.w + x];
        if (c && c.cont) continue;
        const st = c ? c.style : this.defaultStyle;
        const key = this.styleKey(st);
        if (key !== prevKey) {
          let codes = '';
          if (prevKey !== null) codes += reset;
          if (st.fg) codes += fg(st.fg);
          if (st.bg) codes += bg(st.bg);
          if (st.bold) codes += bold;
          if (st.dim) codes += dim;
          line += codes;
          prevKey = key;
        }
        line += c ? c.ch : ' ';
      }
      rows.push(line + reset);
    }
    return rows.join('\n');
  }
}

module.exports = { Canvas, charWidth, stringWidth, wrapText, padEnd, truncate };
