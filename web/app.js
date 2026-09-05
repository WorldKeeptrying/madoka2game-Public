'use strict';

// 网页版渲染层。
// 这里只负责「怎么画」：菜单有哪些项、点了会发生什么，全部由 shared/flow.js 决定，
// 与终端版（src/screens）完全一致 —— 改功能请改 shared/。

(function () {
  const M = window.Madoka;
  const THEMES = M.themes.THEMES;
  const ORDER = M.themes.ORDER;
  const FLOW = M.flow;

  const $ = (id) => document.getElementById(id);
  const SCREENS = ['board', 'about', 'play', 'ending', 'bye'];

  const app = {
    themeId: 'madoka',
    screen: 'board',
    boardIndex: 0,
    game: null,
    get theme() {
      return THEMES[this.themeId];
    },
    setTheme(id) {
      FLOW.setTheme(this, id);
    },
    // 浏览器没法自己退出，所以「离开这里」变成一张告别页
    quit() {
      app.screen = 'bye';
      render();
    },
  };

  // 暴露出来方便在控制台调试
  window.madokaApp = app;

  // ————————————————————————— 主题 —————————————————————————

  function kebab(s) {
    return String(s).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  }

  function applyPalette() {
    const p = app.theme.palette;
    const root = document.documentElement;
    root.setAttribute('data-theme', app.themeId);
    Object.keys(p).forEach((key) => {
      root.style.setProperty('--c-' + kebab(key), p[key]);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.bg);
  }

  // ————————————————————————— 渲染 —————————————————————————

  function render() {
    applyPalette();

    // 游戏结束后自动切到结局页（和终端版 g.mode === 'over' 的分支对应）
    if (app.screen === 'play' && app.game && app.game.mode === 'over') {
      app.screen = 'ending';
    }
    if (!app.game) resetPlayView();

    SCREENS.forEach((name) => {
      $('screen-' + name).classList.toggle('hidden', app.screen !== name);
    });

    if (app.screen === 'board') renderBoard();
    else if (app.screen === 'about') renderAbout();
    else if (app.screen === 'play') renderPlay();
    else if (app.screen === 'ending') renderEnding();
  }

  function makeItem(opt) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-item' + (opt.cursor ? ' is-cursor' : '');
    if (opt.disabled) b.disabled = true;

    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = opt.cursor ? '>' : '';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = opt.label;

    b.appendChild(mark);
    b.appendChild(label);
    if (!opt.disabled && opt.onClick) b.addEventListener('click', opt.onClick);
    return b;
  }

  function renderBoard() {
    const t = app.theme;

    $('board-title').textContent = t.boardTitle;
    $('board-sub').textContent = t.boardSub;

    const body = $('board-body');
    body.textContent = '';
    t.boardLines.forEach((line) => {
      const p = document.createElement('p');
      if (line === '') {
        p.className = 'is-blank';
        p.innerHTML = '&nbsp;';
      } else {
        p.textContent = line;
      }
      body.appendChild(p);
    });
    $('board-foot').textContent = t.boardFoot;
    $('board-mode').textContent = `〔 ${t.modeName} · ${t.modeTag} 〕`;
    $('board-hint').textContent = t.hint;

    const menu = $('board-menu');
    menu.textContent = '';
    FLOW.BOARD_MENU.forEach((item, i) => {
      menu.appendChild(
        makeItem({
          label: item.label,
          cursor: i === app.boardIndex,
          onClick: () => {
            app.boardIndex = i;
            FLOW.boardSelect(app);
            render();
          },
        })
      );
    });

    ORDER.forEach((id) => {
      const btn = document.querySelector('.chip[data-theme="' + id + '"]');
      if (btn) btn.classList.toggle('is-active', app.themeId === id);
    });
  }

  function renderAbout() {
    const box = $('about-body');
    box.textContent = '';
    FLOW.aboutSections(app.theme).forEach(([text, tone]) => {
      const p = document.createElement('p');
      p.className = tone === 'gap' ? 'gap' : tone;
      p.textContent = tone === 'gap' ? '\u00a0' : text;
      box.appendChild(p);
    });
  }

  function setBar(fillId, textId, ratio, text, color) {
    const fill = $(fillId);
    fill.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%';
    fill.style.background = color;
    $(textId).textContent = text;
  }

  function gemColor(v) {
    const p = app.theme.palette;
    if (v >= 70) return p.meterHigh;
    if (v >= 40) return p.meterMid;
    return p.meterLow;
  }

  // —— 战斗特效：靠前后状态对比触发（不触碰 shared 规则）——
  let fxPrev = { game: null, hp: null, ehp: null };

  function triggerFx(className) {
    const ov = $('fx-overlay');
    if (!ov) return;
    ov.classList.remove('fx-hit', 'fx-flash-pink', 'fx-flash-purple');
    // 强制 reflow，保证同一个动画类可以反复触发
    void ov.offsetWidth;
    ov.classList.add(className);
  }

  function updateBattleFx(g) {
    const fresh = fxPrev.game !== g;
    fxPrev.game = g;
    const hp = g.s.hp;
    const ehp = g.battle ? g.battle.hp : null;

    // 生命下降 → 被攻击，血红色闪烁
    if (!fresh && fxPrev.hp !== null && hp < fxPrev.hp) {
      triggerFx('fx-hit');
    }
    // 敌人血量下降 → 命中，按主题选粉色 / 紫色闪光
    if (!fresh && fxPrev.ehp !== null && ehp !== null && ehp < fxPrev.ehp) {
      triggerFx(app.themeId === 'homura' ? 'fx-flash-purple' : 'fx-flash-pink');
    }
    fxPrev.hp = hp;
    fxPrev.ehp = ehp;
  }

  // ————————————————————————— 音效 —————————————————————————
  // 音效只属于「怎么响」，不定义任何功能；操作的结果（日志/状态）由 shared 产生，
  // 这里仅根据结果放对应音效。终端版是纯字符界面、无法播放音频，因此不接入。
  // 音频文件位于 src/music/，从 web/ 用相对路径引入（Chrome 支持 wav 与 flac）。

  const SFX = {
    ghost: '../src/music/ghost（敌人出现时音效）.wav',
    explosion: '../src/music/explosion（敌人被击败 音效）.wav',
    inventory: '../src/music/Menu1B（打开道具栏音效）.wav',
    item: '../src/music/（使用道具的音效）.flac',
    menu: '../src/music/Item1A（菜单项目缺省值音效，所有未定义的菜单项都要回落到当前音效）.wav',
    atkMadoka: '../src/music/（鹿目圆普攻音效）.flac',
    magicMadoka: '../src/music/（鹿目圆魔法音效）.flac',
    pray: '../src/music/（鹿目圆特殊技能 “祈祷” 音效）.wav',
    atkHomura: '../src/music/（晓美焰普攻音效）.wav',
    magicHomura: '../src/music/（晓美焰魔法音效）.wav',
    timestop: '../src/music/（晓美焰特殊技能 时间停止 音效）.wav',
  };

  const audioCache = {};
  function playSound(key) {
    const src = SFX[key];
    if (!src) return;
    try {
      let a = audioCache[key];
      if (!a) {
        a = audioCache[key] = new Audio(src);
        a.preload = 'auto';
      }
      a.currentTime = 0;
      a.volume = 0.9;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* 自动播放策略等原因失败则忽略 */ });
    } catch (e) { /* 忽略 */ }
  }

  // 通过 shared 日志增量 + 状态变化判断该放哪段音效（同时覆盖鼠标与键盘）
  let sfxState = { game: null, logLen: 0, battle: null, mode: null };
  function updateSfx(g) {
    if (g === sfxState.game) {
      const logs = g.s.log.slice(sfxState.logLen);
      let played = false;

      // 敌人出现
      if (sfxState.battle === null && g.battle) { playSound('ghost'); played = true; }

      // 敌人被击败
      if (!played) {
        for (const e of logs) {
          if (e.text.indexOf('被击碎了') >= 0 || e.text.indexOf('散成了灰') >= 0) {
            playSound('explosion');
            played = true;
            break;
          }
        }
      }

      if (!played) {
        for (const e of logs) {
          const t = e.text;
          if (t.indexOf('你挥出武器') >= 0 || t.indexOf('从容地挥出一击') >= 0) {
            playSound(g.theme.id === 'homura' ? 'atkHomura' : 'atkMadoka');
            played = true;
            break;
          }
          if (t.indexOf('你把光压进掌心') >= 0) {
            playSound(g.theme.id === 'homura' ? 'magicHomura' : 'magicMadoka');
            played = true;
            break;
          }
          if (t.indexOf('许了一个很小的愿') >= 0) { playSound('pray'); played = true; break; }
          if (t.indexOf('你按下了盾牌上的那颗齿轮') >= 0) { playSound('timestop'); played = true; break; }
          if (t.indexOf('你拆开糖果') >= 0 || t.indexOf('你把悲叹之种按在灵魂宝石上') >= 0) {
            playSound('item');
            played = true;
            break;
          }
        }
      }

      // 打开道具栏
      if (sfxState.mode !== 'items' && g.mode === 'items') { playSound('inventory'); played = true; }

      // 未定义到的菜单动作：回落默认音效
      if (!played && logs.length > 0) playSound('menu');
    }
    sfxState.game = g;
    sfxState.logLen = g.s.log.length;
    sfxState.battle = g.battle;
    sfxState.mode = g.mode;
  }

  function renderPlay() {
    const g = app.game;
    if (!g) {
      app.screen = 'board';
      renderBoard();
      return;
    }

    const t = app.theme;
    updateBattleFx(g);
    updateSfx(g);
    const pl = g.place;
    $('place-name').textContent = pl ? pl.name + (pl.subtitle ? ' · ' + pl.subtitle : '') : '见泷原';
    $('theme-tag').textContent = `${t.label} · ${t.modeName}`;

    setBar(
      'bar-hp',
      'bar-hp-text',
      g.s.hp / g.s.maxHp,
      `${Math.round(g.s.hp)} / ${g.s.maxHp}`,
      t.palette.good
    );
    setBar(
      'bar-gem',
      'bar-gem-text',
      g.s.corrupt / 100,
      `污浊 ${Math.round(g.s.corrupt)} / 100`,
      gemColor(g.s.corrupt)
    );

    if (g.battle) {
      $('row-enemy').classList.remove('hidden');
      $('row-items').classList.add('hidden');
      setBar(
        'bar-enemy',
        'bar-enemy-text',
        g.battle.hp / g.battle.maxHp,
        `${g.battle.name} ${Math.max(0, g.battle.hp)}/${g.battle.maxHp}`,
        t.palette.bad
      );
    } else {
      $('row-enemy').classList.add('hidden');
      $('row-items').classList.remove('hidden');
      const bits = [
        `悲叹之种 ×${g.s.seeds}`,
        `应急糖果 ×${g.s.candies}`,
        `讨伐魔女 ${g.s.witches}/4`,
      ];
      if (g.rules.rewinds > 0) bits.push(`回溯 ×${g.s.rewinds}`);
      $('stat-text').textContent = bits.join('　');
    }

    renderLog(g);
    renderActions(g);
  }

  // 日志是增量追加的，避免整屏重绘导致的滚动跳动
  let logLen = 0;
  let lastGame = null;
  let logSig = '';
  let actionSig = '';
  // 页面上最多保留的日志行数：更早的记录自动隐藏，避免 DOM 无限膨胀
  const LOG_LIMIT = 80;

  function resetPlayView() {
    const log = $('log');
    if (log) log.textContent = '';
    logLen = 0;
    lastGame = null;
    logSig = '';
    actionSig = '';
  }

  function renderLog(g) {
    const log = $('log');
    if (lastGame !== g) {
      log.textContent = '';
      logLen = 0;
      logSig = '';
      lastGame = g;
    }
    const entries = g.s.log;
    const sig = entries.length ? entries[0].text : '';

    // 引擎日志达到上限（240）后会从头部弹出旧条目：长度不再增长、内容整体前移。
    // 这种「滚动」只靠长度差看不出增减，会漏掉新记录导致显示卡住。
    // 因此用首条内容的指纹来识别：长度没变、首条却已不是上次那条 → 整体重绘一次。
    if (logLen > 0 && entries.length > 0 && entries.length === logLen && sig !== logSig) {
      log.textContent = '';
      logLen = 0;
    }
    if (entries.length < logLen) {
      log.textContent = '';
      logLen = 0;
    }
    logSig = sig;

    // 从该位置开始追加（重绘时只补最后 LOG_LIMIT 条，避免一次性建大量节点）
    let start = logLen;
    if (start === 0 && entries.length > LOG_LIMIT) start = entries.length - LOG_LIMIT;

    for (let i = start; i < entries.length; i += 1) {
      const e = entries[i];
      const div = document.createElement('div');
      div.className = 'log-line tone-' + (e.tone || 'text');
      div.textContent = e.text === '' ? '\u00a0' : e.text;
      log.appendChild(div);
    }
    logLen = entries.length;

    // 只保留最近 LOG_LIMIT 条显示记录，更早的自动隐藏
    while (log.childNodes.length > LOG_LIMIT) log.removeChild(log.firstChild);

    log.scrollTop = log.scrollHeight;
  }

  function renderActions(g) {
    const items = FLOW.playMenu(g);
    const sig = JSON.stringify([
      g.mode,
      items.map((i) => [i.key, i.label, !!i.disabled]),
      g.menuIndex,
      g.s.over,
    ]);
    if (sig === actionSig) return;
    actionSig = sig;

    const box = $('actions');
    box.textContent = '';
    items.forEach((item, i) => {
      box.appendChild(
        makeItem({
          label: item.label,
          cursor: i === g.menuIndex,
          disabled: !!item.disabled,
          onClick: () => {
            g.menuIndex = i;
            FLOW.playSelect(app, g, item.key);
            render();
          },
        })
      );
    });
  }

  function renderEnding() {
    const g = app.game;
    if (!g) {
      app.screen = 'board';
      renderBoard();
      return;
    }
    const ending = app.theme.endings[g.s.over] || app.theme.endings.dead;
    $('ending-title').textContent = ending.title;
    const box = $('ending-body');
    box.textContent = '';
    ending.lines.forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line === '' ? '\u00a0' : line;
      box.appendChild(p);
    });
  }

  // ————————————————————————— 输入 —————————————————————————

  const KEYMAP = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    Enter: 'enter',
    Escape: 'escape',
    Tab: 'tab',
    ' ': 'space',
    Spacebar: 'space',
  };

  function onKey(e) {
    let name = KEYMAP[e.key];
    if (!name && /^[1-9]$/.test(e.key)) name = e.key;
    if (!name) return;

    // 防止空格 / 回车被聚焦的按钮当成二次点击
    const active = document.activeElement;
    if ((name === 'enter' || name === 'space') && active && active.tagName === 'BUTTON') {
      active.blur();
    }
    e.preventDefault();

    if (app.screen === 'board') FLOW.boardKey(app, name);
    else if (app.screen === 'about') FLOW.aboutKey(app);
    else if (app.screen === 'play') {
      // 防御：万一还停在 play 画面而游戏已经结束，先切到结局页
      if (app.game && app.game.mode === 'over') {
        app.screen = 'ending';
        render();
        return;
      }
      FLOW.playKey(app, name);
    } else if (app.screen === 'ending') FLOW.playKey(app, name);
    else if (app.screen === 'bye' && (name === 'enter' || name === 'space' || name === 'escape')) {
      app.screen = 'board';
    }
    render();
  }

  function init() {
    const chips = document.querySelectorAll('.chip[data-theme]');
    Array.prototype.forEach.call(chips, (btn) => {
      btn.addEventListener('click', () => {
        FLOW.setTheme(app, btn.getAttribute('data-theme'));
        render();
      });
    });

    $('about-back').addEventListener('click', () => {
      FLOW.aboutKey(app);
      render();
    });

    $('ending-back').addEventListener('click', () => {
      FLOW.playOverKey(app, app.game, 'enter');
      render();
    });

    $('bye-back').addEventListener('click', () => {
      app.screen = 'board';
      render();
    });

    document.addEventListener('keydown', onKey);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
