'use strict';
// 临时脚本：验证人鱼魔女的强度确实落在「影之魔女 < 人鱼魔女 < 魔女之夜」之间
const { THEMES } = require('./shared/themes');
const { Game } = require('./shared/engine');

function autoAct(g) {
  const b = g.battle;
  const hpRatio = g.s.hp / g.s.maxHp;
  if (hpRatio < 0.35 && g.s.candies > 0) return 'candy';
  if (b.specialCd === 0) {
    if (g.theme.id === 'madoka' && hpRatio < 0.6) return 'special';
    if (g.theme.id === 'homura') return 'special';
  }
  if (hpRatio < 0.3) return 'guard';
  if (g.s.corrupt > 72) return 'attack';
  return 'magic';
}

function fight(g) {
  let turns = 0;
  while (g.battle && g.mode === 'battle' && turns < 300) {
    g.battleAct(autoAct(g));
    turns += 1;
  }
  return turns;
}

function run(id, witchKey) {
  const g = new Game(THEMES[id]);
  g.applyWish('protect');
  g.s.seeds = 4;
  g.s.candies = 2;
  g.startBattle(witchKey);
  const turns = fight(g);
  return {
    over: g.s.over,
    turns,
    hp: Math.round(g.s.hp),
    corrupt: Math.round(g.s.corrupt),
  };
}

const N = 60;
const targets = [
  ['elsa', '影之魔女'],
  ['oktavia', '人鱼的魔女'],
  ['walpurgis', '魔女之夜'],
];

for (const id of ['madoka', 'homura']) {
  for (const [key, label] of targets) {
    const runs = [];
    for (let i = 0; i < N; i += 1) runs.push(run(id, key));
    const win = runs.filter((r) => !r.over || r.over === 'win').length;
    const avgT = (runs.reduce((s, r) => s + r.turns, 0) / runs.length).toFixed(1);
    const avgHp = (runs.reduce((s, r) => s + r.hp, 0) / runs.length).toFixed(0);
    const avgC = (runs.reduce((s, r) => s + r.corrupt, 0) / runs.length).toFixed(0);
    console.log(
      `${id.padEnd(7)} vs ${label}: 胜 ${Math.round((win / N) * 100)}% | 平均回合 ${avgT} 剩余血 ${avgHp} 污浊 ${avgC}`
    );
  }
}

// 使魔强度抽样
const { ENEMIES } = require('./shared/content');
console.log(
  '\n使魔：',
  ['rose_familiar', 'snack_familiar', 'box_familiar', 'shadow_familiar', 'accomp_familiar', 'concert_familiar']
    .map((k) => `${ENEMIES[k].name} ${ENEMIES[k].hp}/${ENEMIES[k].atk}`)
    .join('  ')
);
console.log(
  '魔女：',
  ['gertrud', 'elly', 'charlotte', 'elsa', 'oktavia', 'walpurgis']
    .map((k) => `${ENEMIES[k].name} ${ENEMIES[k].hp}/${ENEMIES[k].atk}`)
    .join('  ')
);
