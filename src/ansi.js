'use strict';

// 极简 ANSI 转义序列工具（真彩色 / 光标 / 鼠标）

const ESC = '\u001b';

function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const reset = `${ESC}[0m`;
const bold = `${ESC}[1m`;
const dim = `${ESC}[2m`;
const italic = `${ESC}[3m`;
const underline = `${ESC}[4m`;

function fg(hex) {
  const [r, g, b] = parseHex(hex);
  return `${ESC}[38;2;${r};${g};${b}m`;
}

function bg(hex) {
  const [r, g, b] = parseHex(hex);
  return `${ESC}[48;2;${r};${g};${b}m`;
}

module.exports = {
  ESC,
  reset,
  bold,
  dim,
  italic,
  underline,
  fg,
  bg,
  parseHex,
  clear: `${ESC}[2J${ESC}[3J${ESC}[H`,
  home: `${ESC}[H`,
  hideCursor: `${ESC}[?25l`,
  showCursor: `${ESC}[?25t`,
  at: (row, col) => `${ESC}[${row};${col}H`,
  mouseOn: `${ESC}[?1000h${ESC}[?1006h`,
  mouseOff: `${ESC}[?1000l${ESC}[?1006l`,
  altOn: `${ESC}[?1049h`,
  altOff: `${ESC}[?1049l`,
  setTitle: (t) => `${ESC}]0;${t}\u0007`,
};
