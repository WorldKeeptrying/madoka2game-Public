// 共享模块：游戏状态与规则引擎（不关心如何绘制，绘制在 src/screens 或 web 里）
// 同时支持 Node（CommonJS）与浏览器（window.Madoka.Game），
// 终端版与网页版用的是同一份文件，改这里两边一起生效。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./content'));
  } else {
    root.Madoka = root.Madoka || {};
    root.Madoka.Game = factory(root.Madoka.content).Game;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CONTENT) {
'use strict';

// 游戏状态与规则引擎（不关心如何绘制，屏幕相关的都在前端渲染层里）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 战斗伤害修正：根据攻击发生时毫秒数的个位（0-9，近似均匀分布），
// 在「基础攻击力判定」上加 / 减若干点，制造有起伏的伤害波动。
//   毫秒个位 2、3、4 → +3；0、1、9 → -5；5 → +5；6 → +4；7 → 平稳(0)；8 → -3
// 十个档位之和为 0，长期期望为中性，因此不破坏平衡；且只在玩家攻击时调用。
function timeAttackBonus() {
  const MAP = [-5, -5, 3, 3, 3, 5, 4, 0, -3, -5];
  return MAP[new Date().getMilliseconds() % 10];
}

class Game {
  constructor(theme) {
    this.theme = theme;
    this.rules = theme.rules;
    this.mode = 'wish'; // wish | main | move | items | battle | over
    this.menuIndex = 0;
    this.battle = null;
    this.anchor = null;
    this.s = {
      place: 'school',
      hp: theme.rules.hp,
      maxHp: theme.rules.hp,
      corrupt: 0,
      seeds: theme.rules.startSeeds,
      candies: 1,
      witches: 0,
      rewinds: theme.rules.rewinds,
      corruptMul: 1,
      flags: {},
      revealed: {},
      over: null,
      steps: 0,
      log: [],
    };
  }

  get place() {
    return CONTENT.PLACES[this.s.place];
  }

  chance(p) {
    return Math.random() < p;
  }

  // —— 日志 ——
  say(lines, tone) {
    const arr = Array.isArray(lines) ? lines : [lines];
    for (const line of arr) this.s.log.push({ text: line, tone: tone || 'text' });
    while (this.s.log.length > 240) this.s.log.shift();
  }

  // —— 数值 ——
  heal(n) {
    const before = this.s.hp;
    this.s.hp = clamp(this.s.hp + n, 0, this.s.maxHp);
    const d = this.s.hp - before;
    if (d > 0) this.say(`生命 +${d}。`, 'good');
    else this.say('你已经没有更完整的样子了。', 'dim');
  }

  damage(n) {
    this.s.hp = clamp(this.s.hp - n, 0, this.s.maxHp);
    if (this.s.hp <= 0 && !this.s.over) this.s.over = 'dead';
  }

  corrupt(n) {
    const amount = n > 0
      ? n * this.s.corruptMul * this.rules.corruptMul
      : n * (this.rules.purifyMul || 1);
    const before = this.s.corrupt;
    this.s.corrupt = clamp(this.s.corrupt + amount, 0, 100);
    const d = Math.round(this.s.corrupt - before);
    if (d !== 0) {
      this.say(d > 0 ? `灵魂宝石变浑浊了（污浊 +${d}）。` : `灵魂宝石被擦亮了一些（污浊 ${d}）。`, d > 0 ? 'warn' : 'good');
    }
    if (this.s.corrupt >= 100 && !this.s.over) this.s.over = 'witch';
  }

  item(id, n) {
    const count = n || 1;
    if (id === 'seed') {
      this.s.seeds += count;
      this.say(`获得 悲叹之种 ×${count}。`, 'good');
    } else if (id === 'candy') {
      this.s.candies += count;
      this.say(`获得 应急糖果 ×${count}。`, 'good');
    }
  }

  // —— 主菜单 ——
  menu() {
    const s = this.s;
    const pl = this.place;
    const m = [];

    if (pl.witch && !s.flags['witch_' + pl.witch]) {
      m.push({ key: 'witch', label: '追着气息走进结界' });
    }
    for (const ev of pl.events || []) {
      if (ev.when && !ev.when(s)) continue;
      if (ev.once && s.flags['done_' + pl.id + '_' + ev.id]) continue;
      m.push({ key: 'event:' + ev.id, label: ev.label });
    }
    m.push({ key: 'move', label: '移动' });
    m.push({ key: 'search', label: '探索四周' });
    m.push({ key: 'look', label: '仔细调查' });
    m.push({ key: 'items', label: '物品与状态' });
    m.push({ key: 'board', label: '离开这座城市（回到公告板）' });
    return m;
  }

  act(key) {
    if (this.s.over) return;
    const pl = this.place;
    if (key === 'witch') {
      this.startBattle(pl.witch);
    } else if (key.startsWith('event:')) {
      const id = key.slice('event:'.length);
      const ev = (pl.events || []).find((e) => e.id === id);
      if (ev) {
        ev.run(this);
        this.s.flags['done_' + pl.id + '_' + id] = true;
      }
    } else if (key === 'search') {
      this.search();
    } else if (key === 'look') {
      this.look();
    }
    this.finishIfOver();
  }

  // —— 移动 ——
  visibleExits() {
    const pl = this.place;
    return (pl.exits || []).filter((e) => {
      if (!e.hidden) return true;
      if (this.rules.showHidden) return true;
      return !!this.s.revealed[pl.id + '>' + e.to];
    });
  }

  moveTo(id) {
    const pl = CONTENT.PLACES[id];
    if (!pl) return;
    this.s.place = id;
    this.mode = 'main';
    this.menuIndex = 0;
    this.corrupt(2);
    if (this.s.over) {
      this.finishIfOver();
      return;
    }
    this.say('', 'dim');
    this.say(`【${pl.name}】 ${pl.subtitle || ''}`, 'title');
    this.say(pl.intro, 'text');
    if (pl.witch && !this.s.flags['witch_' + pl.witch]) {
      this.say(['有什么东西在这里结了巢。甜味压在舌头上，散不掉。'], 'bad');
    }
    if (pl.safe) {
      this.setAnchor();
      this.say(['（这里很安全。可以在这里喘口气。）'], 'dim');
    }
  }

  // —— 探索 / 调查 ——
  search() {
    const pl = this.place;
    this.s.steps += 1;
    this.corrupt(3);
    if (this.s.over) return;

    if (pl.witch && !this.s.flags['witch_' + pl.witch] && this.chance(0.45)) {
      this.say(['空气忽然变甜了。', '有什么东西，正在这下面呼吸。'], 'bad');
      this.startBattle(pl.witch);
      return;
    }
    if (pl.familiars && this.chance(0.5)) {
      this.startBattle(pick(pl.familiars));
      return;
    }
    const finds = pl.finds || [];
    if (finds.length && this.chance(0.6)) {
      const f = pick(finds);
      if (f.text) this.say(f.text, 'dim');
      if (f.item) this.item(f.item, f.n || 1);
      if (f.corrupt) this.corrupt(f.corrupt);
      return;
    }
    this.say(pl.idle || ['你走了一圈，什么也没有发生。'], 'dim');
  }

  look() {
    const pl = this.place;
    this.corrupt(1);
    if (this.s.over) return;
    const hidden = (pl.exits || []).filter(
      (e) => e.hidden && !this.s.revealed[pl.id + '>' + e.to]
    );
    if (hidden.length && !this.rules.showHidden) {
      for (const e of hidden) this.s.revealed[pl.id + '>' + e.to] = true;
      this.say(['你顺着墙根一寸一寸地看过去——']);
      this.say(
        [`原来这里还有一条路：${hidden.map((e) => e.label || CONTENT.PLACES[e.to].name).join('、')}。`],
        'good'
      );
      return;
    }
    this.say(pl.lookText || ['你把每个角落都看过了，没有新的发现。'], 'dim');
  }

  // —— 物品 ——
  purify() {
    if (this.s.seeds <= 0) {
      this.say(['你没有悲叹之种。'], 'dim');
      return;
    }
    this.s.seeds -= 1;
    this.say(['你把悲叹之种按在灵魂宝石上。', '黑色的东西被一点点吸了出去。'], 'dim');
    this.corrupt(-35);
  }

  useCandy() {
    if (this.s.candies <= 0) {
      this.say(['你没有应急糖果了。'], 'dim');
      return;
    }
    this.s.candies -= 1;
    this.say(['你拆开糖果，含在嘴里。很甜，甜得有点想哭。'], 'dim');
    this.heal(30);
  }

  setAnchor() {
    const snap = Object.assign({}, this.s);
    delete snap.log;
    this.anchor = JSON.parse(JSON.stringify(snap));
  }

  rewind() {
    if (this.s.rewinds <= 0) {
      this.say(['时间不听你的了。'], 'dim');
      return;
    }
    if (!this.anchor) {
      this.say(['你找不到可以回到的那一刻。'], 'dim');
      return;
    }
    const used = this.s.rewinds - 1;
    const snap = JSON.parse(JSON.stringify(this.anchor));
    snap.rewinds = used;
    snap.hp = snap.maxHp;
    snap.corrupt = 30;
    snap.over = null;
    snap.log = this.s.log;
    this.s = snap;
    this.mode = 'main';
    this.menuIndex = 0;
    this.battle = null;
    this.say('', 'dim');
    this.say('—— 世界倒着退了回去。这一次，别再走错。 ——', 'title');
    this.say(`剩余的回溯：${this.s.rewinds}`, 'dim');
  }

  showStatus() {
    const s = this.s;
    const mood =
      s.corrupt >= 75 ? '（快要听不见自己的声音了）'
      : s.corrupt >= 45 ? '（有什么在宝石里面翻身）'
      : s.corrupt >= 20 ? '（有点浑浊，还看得清）'
      : '（很干净，像刚下过雨）';
    const remain = 4 - s.witches;
    this.say('', 'dim');
    this.say('──── 状态 ────', 'title');
    this.say(`生命         ${Math.round(s.hp)} / ${s.maxHp}`);
    this.say(`灵魂宝石污浊 ${Math.round(s.corrupt)} / 100  ${mood}`);
    this.say(`悲叹之种 ×${s.seeds}　应急糖果 ×${s.candies}`);
    this.say(`已讨伐魔女 ${s.witches} / 4${remain > 0 ? `（还差 ${remain} 个，天台的门才会开）` : '（天台的门已经开了）'}`);
    if (this.rules.rewinds > 0) this.say(`时间回溯 ×${s.rewinds}`);
  }

  // —— 战斗 ——
  startBattle(key) {
    const e = CONTENT.ENEMIES[key];
    if (!e || this.s.over) return;
    const hpMul = e.kind === 'familiar' ? this.rules.enemyHpMul : this.rules.witchHpMul;
    const maxHp = Math.max(1, Math.round(e.hp * hpMul));
    this.battle = {
      key,
      name: e.name,
      kind: e.kind,
      hp: maxHp,
      maxHp,
      atk: Math.max(1, Math.round(e.atk * this.rules.enemyAtkMul)),
      turn: 0,
      guard: false,
      freeze: 0,
      bonusDmg: false,
      specialCd: 0,
      aura: e.aura || 0, // 结界本身的效果（例如人鱼魔女的管弦乐）
    };
    this.mode = 'battle';
    this.menuIndex = 0;
    this.say('', 'dim');
    this.say(`【遭遇】${e.name}`, 'title');
    if (e.intro) this.say(e.intro, e.kind === 'familiar' ? 'text' : 'bad');
  }

  battleAct(key) {
    const b = this.battle;
    if (!b || this.s.over) return;
    const R = this.rules;

    const bonus = b.bonusDmg;
    b.bonusDmg = false;

    if (key === 'attack') {
      const dmg = Math.max(1, Math.round((rnd(8, 12) + timeAttackBonus()) * R.dmgMul * (bonus ? 2 : 1)));
      this.say(
        bonus
          ? `停住的时间里，你从容地挥出一击——${dmg} 点伤害。`
          : `你挥出武器，对「${b.name}」造成 ${dmg} 点伤害。`,
        'good'
      );
      b.hp -= dmg;
      this.corrupt(2);
    } else if (key === 'magic') {
      const dmg = Math.max(1, Math.round((rnd(13, 19) + timeAttackBonus()) * R.dmgMul * (bonus ? 2 : 1)));
      this.say(`你把光压进掌心，猛地推出去——${dmg} 点伤害。`, 'good');
      this.say(['灵魂宝石暗了一圈。'], 'warn');
      b.hp -= dmg;
      this.corrupt(3);
    } else if (key === 'guard') {
      // 集中本身不回血；只有真正挡下攻击时，才会把挡下的部分转化为一点恢复
      b.guard = true;
      this.say(['你收拢呼吸，把所有的光都收回到自己身上。'], 'dim');
    } else if (key === 'candy') {
      this.useCandy();
    } else if (key === 'special') {
      b.specialCd = this.rules.specialCd || 3;
      if (R.special.key === 'pray') {
        this.say(['你闭上眼睛，很认真地许了一个很小的愿。'], 'good');
        this.heal(28);
        this.corrupt(-12);
      } else {
        b.freeze = 2;
        b.bonusDmg = true;
        this.say(['你按下了盾牌上的那颗齿轮——时间停住了。'], 'good');
        this.say(['敌人有两回动不了，而你有一次加倍的攻击。'], 'dim');
      }
    } else if (key === 'flee') {
      if (this.chance(R.escapeChance)) {
        this.say(['你退出了结界。身后的甜味还在追。'], 'dim');
        this.corrupt(3);
        this.endBattle();
        this.finishIfOver();
        return;
      }
      this.say(['退路被堵住了！'], 'bad');
      this.corrupt(3);
    }

    if (this.s.over) {
      this.finishIfOver();
      return;
    }
    if (b.hp <= 0) {
      this.winBattle();
      this.finishIfOver();
      return;
    }

    // 敌人回合
    if (b.freeze > 0) {
      b.freeze -= 1;
      this.say(`时间停着。「${b.name}」的动作僵在半空。`, 'good');
    } else {
      const raw = rnd(b.atk - 2, b.atk + 2);
      let dmg = Math.max(1, Math.round(raw));
      if (b.guard) {
        const blocked = dmg - Math.max(1, Math.round(dmg / 2));
        dmg = Math.max(1, Math.round(dmg / 2));
        this.heal(Math.max(1, Math.round(blocked * 0.6)));
      }
      b.guard = false;
      this.say(`「${b.name}」的反击：${dmg} 点伤害。`, 'bad');
      this.damage(dmg);
      this.corrupt(1);
    }

    // 结界本身的效果：就算敌人被冻住，这场演奏也不会停
    if (b.aura) {
      this.say(['音乐还在响。你听得越久，宝石就越浑浊。'], 'warn');
      this.corrupt(b.aura);
    }

    b.turn += 1;
    if (b.specialCd > 0) b.specialCd -= 1;
    this.finishIfOver();
  }

  winBattle() {
    const b = this.battle;
    const e = CONTENT.ENEMIES[b.key];
    this.say(['——'], 'dim');
    this.say(e.kind === 'familiar' ? '使魔散成了灰。' : `「${b.name}」被击碎了。`, 'good');
    if (e.outro && e.outro.length && e.outro[0] !== '——') this.say(e.outro, 'dim');

    if (e.kind === 'familiar') {
      if (this.chance(this.rules.familiarSeedChance)) this.item('seed', 1);
    } else {
      this.s.witches += 1;
      this.s.flags['witch_' + b.key] = true;
      const seeds = (e.reward && e.reward.seeds ? e.reward.seeds : 1) + (this.rules.seedBonus || 0);
      if (seeds > 0) this.item('seed', seeds);
      this.say(`已讨伐魔女：${this.s.witches} / 4`, 'title');
      if (this.s.witches >= 4) {
        this.say(['见泷原中学天台的那扇铁门，忽然不那么烫了。'], 'title');
      }
    }

    if (b.key === 'walpurgis') {
      this.s.over = 'win';
      this.battle = null;
      this.finishIfOver();
      return;
    }
    this.endBattle();
  }

  endBattle() {
    this.battle = null;
    this.mode = 'main';
    this.menuIndex = 0;
  }

  // —— 愿望 ——
  applyWish(id) {
    const list = CONTENT.wishes(this.theme);
    const w = list.find((x) => x.id === id) || list[0];
    w.apply(this);
    this.say('', 'dim');
    this.say(`你许下了愿望：${w.label}`, 'title');
    this.say(w.note, 'good');
    this.say('', 'dim');
    this.say(this.theme.prologue, 'text');
    this.mode = 'main';
    this.moveTo('school');
  }

  // —— 结束判定 ——
  finishIfOver() {
    if (!this.s.over) return false;
    if (this.mode !== 'over') {
      this.mode = 'over';
      this.battle = null;
      this.menuIndex = 0;
      const ending = this.theme.endings[this.s.over] || this.theme.endings.dead;
      this.say('', 'dim');
      this.say('—— ' + ending.title + ' ——', 'title');
      this.say(ending.lines, 'dim');
    }
    return true;
  }
}

  return { Game };
});
