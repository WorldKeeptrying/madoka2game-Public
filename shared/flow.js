// 共享模块：菜单结构与输入处理
//
// 这里是「有哪些功能」的唯一定义处。终端版（src/screens）和网页版（web/app.js）
// 都只负责把 playMenu() 返回的条目画出来，并把按键交给 playKey() 处理。
// 因此新增 / 删除功能时，改这一个文件，两个版本会同时拥有或同时失去该功能。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const themes = require('./themes');
    const content = require('./content');
    const Game = require('./engine').Game;
    module.exports = factory(themes, content, Game);
  } else {
    root.Madoka = root.Madoka || {};
    root.Madoka.flow = factory(root.Madoka.themes, root.Madoka.content, root.Madoka.Game);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (THEME_MOD, CONTENT, Game) {
  'use strict';

  const THEMES = THEME_MOD.THEMES;
  const ORDER = THEME_MOD.ORDER;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ——————————————————— 公告板 ———————————————————

  const BOARD_MENU = [
    { key: 'start', label: '缔结契约' },
    { key: 'about', label: '庭院的规矩' },
    { key: 'quit', label: '离开这里' },
  ];

  function setTheme(app, id) {
    if (!THEMES[id] || id === app.themeId) return;
    app.themeId = id;
  }

  function cycleTheme(app, dir) {
    const i = ORDER.indexOf(app.themeId);
    const step = dir < 0 ? ORDER.length - 1 : 1;
    setTheme(app, ORDER[(i + step) % ORDER.length]);
  }

  function boardSelect(app) {
    const item = BOARD_MENU[clamp(app.boardIndex, 0, BOARD_MENU.length - 1)];
    if (!item) return;
    if (item.key === 'start') {
      app.game = newGame(app.theme);
      app.screen = 'play';
    } else if (item.key === 'about') {
      app.screen = 'about';
    } else if (item.key === 'quit') {
      app.quit();
    }
  }

  // 键盘（终端与网页共用；鼠标点击由各自的渲染层转成这里的动作）
  function boardKey(app, name) {
    const n = BOARD_MENU.length;
    if (name === 'up') {
      app.boardIndex = (app.boardIndex - 1 + n) % n;
      return;
    }
    if (name === 'down') {
      app.boardIndex = (app.boardIndex + 1) % n;
      return;
    }
    if (name === 'tab' || name === 'left' || name === 'right') {
      cycleTheme(app, name === 'left' ? -1 : 1);
      return;
    }
    if (name >= '1' && name <= String(n)) {
      app.boardIndex = Number(name) - 1;
      return;
    }
    if (name === 'enter' || name === 'space') boardSelect(app);
  }

  // ——————————————————— 「庭院的规矩」 ———————————————————

  function aboutSections(theme) {
    return [
      ['庭 院 的 规 矩', 'title'],
      ['', 'gap'],
      ['《银之庭院》是一个关于「许愿」和「代价」的文字冒险。', 'text'],
      ['你在见泷原走动、探索、战斗，直到天台的那扇门为你打开。', 'text'],
      ['', 'gap'],
      ['── 你会失去的东西 ──', 'head'],
      ['灵魂宝石会随着你的每一次行动变浑浊。', 'text'],
      ['污浊到 100，你就不再是「你」了。', 'text'],
      ['用「悲叹之种」可以擦亮它——但悲叹之种是有限的。', 'text'],
      ['', 'gap'],
      ['── 两块牌子 ──', 'head'],
      ['《欢迎来到 银之庭院》　鹿目圆 · 简单模式', 'text'],
      ['　　伤害更高、污浊更慢、生路更多，专属行动「祈祷」。', 'dim'],
      ['《这里不是 银之庭院》　晓美焰 · 困难模式', 'text'],
      ['　　污浊更快、敌人更狠、生路要靠自己找出来，', 'dim'],
      ['　　专属行动「时间停止」，另有 3 次「时间回溯」。', 'dim'],
      ['', 'gap'],
      ['── 操作 ──', 'head'],
      ['点击 / 方向键选择，Enter 确认，Esc 返回上一层。', 'text'],
      ['公告板右上角可以随时切换主题。', 'text'],
      ['讨伐任意 4 个魔女之后，回见泷原中学，推开天台的铁门。', 'text'],
      ['商店街的巷子深处还有一家电影院——先用「仔细调查」找到它。', 'dim'],
      ['', 'gap'],
      ['本作为致敬《魔法少女小圆》的同人练习作品，非商业用途。', 'dim'],
      [`（当前主题：${theme.label} · ${theme.modeName}）`, 'dim'],
    ];
  }

  function aboutKey(app) {
    app.screen = 'board';
  }

  // ——————————————————— 游戏内菜单 ———————————————————

  function battleMenu(g) {
    const R = g.rules;
    const b = g.battle;
    const special =
      b.specialCd > 0
        ? { key: 'special', label: `${R.special.label}（冷却中：还需 ${b.specialCd} 回合）`, disabled: true }
        : { key: 'special', label: `${R.special.label}（${R.special.hint}）` };
    return [
      { key: 'attack', label: '攻击' },
      { key: 'magic', label: '魔法（伤害更高 · 污浊 +3）' },
      { key: 'guard', label: '集中（本回合受到的伤害减半 · 回一点血）' },
      special,
      { key: 'candy', label: `吃应急糖果（${g.s.candies}）· 生命 +30`, disabled: g.s.candies <= 0 },
      { key: 'flee', label: '撤退', disabled: b.kind === 'boss' },
    ];
  }

  function moveMenu(g) {
    const items = g.visibleExits().map((e) => ({
      key: e.to,
      label: e.label || CONTENT.PLACES[e.to].name,
    }));
    items.push({ key: 'back', label: '（返回）' });
    return items;
  }

  function itemsMenu(g) {
    const s = g.s;
    const items = [
      { key: 'purify', label: `使用悲叹之种（${s.seeds}）· 污浊 -35`, disabled: s.seeds <= 0 },
      { key: 'candy', label: `吃应急糖果（${s.candies}）· 生命 +30`, disabled: s.candies <= 0 },
    ];
    if (g.rules.rewinds > 0) {
      items.push({
        key: 'rewind',
        label: `时间回溯（${s.rewinds}）· 回到上一个安全的时刻`,
        disabled: s.rewinds <= 0,
      });
    }
    items.push({ key: 'status', label: '查看状态' });
    items.push({ key: 'back', label: '（返回）' });
    return items;
  }

  function playMenu(g) {
    switch (g.mode) {
      case 'wish':
        return CONTENT.wishes(g.theme).map((w) => ({ key: 'wish:' + w.id, label: w.label }));
      case 'battle':
        return battleMenu(g);
      case 'move':
        return moveMenu(g);
      case 'items':
        return itemsMenu(g);
      default:
        return g.menu();
    }
  }

  function playMenuTitle(g) {
    switch (g.mode) {
      case 'wish':
        return '许下你的愿望';
      case 'battle':
        return '战斗';
      case 'move':
        return '移动到';
      case 'items':
        return '物品与状态';
      default:
        return '行动';
    }
  }

  // ——————————————————— 输入 ———————————————————

  function selectableIndex(items, from, dir) {
    const n = items.length;
    let i = from;
    for (let step = 0; step < n; step += 1) {
      i = (i + dir + n) % n;
      if (!items[i].disabled) return i;
    }
    return from;
  }

  // 结束画面：任意确认键回到公告板
  function playOverKey(app, g, name) {
    if (name === 'enter' || name === 'space' || name === 'escape' || name === 'q') {
      app.game = null;
      app.screen = 'board';
    }
  }

  function playKey(app, name) {
    const g = app.game;
    if (!g) {
      app.screen = 'board';
      return;
    }
    if (g.mode === 'over') {
      playOverKey(app, g, name);
      return;
    }

    const items = playMenu(g);
    if (!items.length) return;

    if (name === 'up') {
      g.menuIndex = selectableIndex(items, g.menuIndex, -1);
      return;
    }
    if (name === 'down') {
      g.menuIndex = selectableIndex(items, g.menuIndex, 1);
      return;
    }
    if (name === 'escape') {
      if (g.mode === 'move' || g.mode === 'items') {
        g.mode = 'main';
        g.menuIndex = 0;
      }
      return;
    }
    if (name === 'enter' || name === 'space') {
      const item = items[clamp(g.menuIndex, 0, items.length - 1)];
      if (!item || item.disabled) return;
      playSelect(app, g, item.key);
    }
  }

  // 点击某个菜单项时，两个版本都走这里
  function playSelect(app, g, key) {
    if (g.mode === 'wish') {
      g.applyWish(key.slice('wish:'.length));
      return;
    }
    if (g.mode === 'battle') {
      g.battleAct(key);
      if (!g.battle && g.mode === 'battle') g.mode = 'main';
      g.menuIndex = 0;
      return;
    }
    if (g.mode === 'move') {
      if (key === 'back') {
        g.mode = 'main';
        g.menuIndex = 0;
      } else {
        g.moveTo(key);
      }
      return;
    }
    if (g.mode === 'items') {
      if (key === 'back') {
        g.mode = 'main';
        g.menuIndex = 0;
        return;
      }
      if (key === 'purify') g.purify();
      else if (key === 'candy') g.useCandy();
      else if (key === 'rewind') g.rewind();
      else if (key === 'status') g.showStatus();
      g.mode = 'main';
      g.menuIndex = 0;
      g.finishIfOver();
      return;
    }

    if (key === 'move' || key === 'items') {
      g.mode = key;
      g.menuIndex = 0;
      return;
    }
    if (key === 'board') {
      app.game = null;
      app.screen = 'board';
      return;
    }
    g.act(key);
    g.menuIndex = 0;
  }

  function newGame(theme) {
    return new Game(theme);
  }

  return {
    BOARD_MENU,
    boardKey,
    boardSelect,
    setTheme,
    cycleTheme,
    aboutSections,
    aboutKey,
    playMenu,
    playMenuTitle,
    playKey,
    playSelect,
    playOverKey,
    selectableIndex,
    newGame,
  };
});
