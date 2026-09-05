// 共享模块：两套主题（配色 / 文案 / 数值规则 / 结局）
// 同时支持 Node（CommonJS）与浏览器（window.Madoka.themes），
// 终端版与网页版用的是同一份文件，改这里两边一起生效。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Madoka = root.Madoka || {};
    root.Madoka.themes = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

// 两套主题：鹿目圆（简单模式）/ 晓美焰（困难模式）

const THEMES = {
  madoka: {
    id: 'madoka',
    label: '鹿目圆',
    chip: ' 鹿目圆 ',
    modeName: '简单模式',
    modeTag: '希望尚存',
    hint: '以「鹿目圆」的心往前走。',
    title: '银之庭院 · 鹿目圆',
    palette: {
      bg: '#24101c',
      frame: '#ff9ec7',
      frameDim: '#8a4560',
      title: '#fff0f7',
      text: '#ffdcec',
      dim: '#b57c96',
      accent: '#ff6fae',
      accentSoft: '#5c2138',
      good: '#ffd98a',
      bad: '#ff7a86',
      warn: '#ffb36b',
      seed: '#ffe9a8',
      meterLow: '#ffc0dd',
      meterMid: '#ffb36b',
      meterHigh: '#ff6a78',
      selectFg: '#fff4fa',
      selectBg: '#7d2547',
    },
    // —— 数值规则（简单模式）——
    rules: {
      hp: 120,
      startSeeds: 2,
      rewinds: 0,
      corruptMul: 0.55,
      purifyMul: 1.2,
      dmgMul: 1.15,
      enemyAtkMul: 0.75,
      enemyHpMul: 0.85,
      witchHpMul: 0.9,
      seedBonus: 1,
      familiarSeedChance: 0.55,
      escapeChance: 0.8,
      showHidden: true,
      specialCd: 3,
      special: {
        key: 'pray',
        label: '祈祷',
        hint: '冷却 3 回合 · 恢复生命，并稍稍擦亮灵魂宝石',
      },
    },
    // —— 公告板 ——
    boardTitle: '《欢迎来到 银之庭院》',
    boardSub: '— 这里是给迷路的魔法少女留字的地方 —',
    boardLines: [
      '据说，只要许下真正的心愿，',
      '银色的门就会为你敞开一次。',
      '',
      '这里的天空很轻，悲伤走得很慢，',
      '连迷路都像是在散步。',
      '如果你累了，就坐在门口坐一会儿——',
      '没有人会催你。',
    ],
    boardFoot: '银之庭院 管理室（印章：一颗很小的心）',
    boardPin: '◉',
    // —— 契约后的开场 ——
    prologue: [
      '你许下了愿望。',
      '空气里有什么东西「咔」地一声合上了，像一枚小小的、温热的蛋。',
      '从今往后，你的灵魂住在身体外面。',
      '从今往后，你要自己擦亮它。',
    ],
    // —— 结局 ——
    endings: {
      win: {
        title: '圆环之理',
        lines: [
          '魔女之夜停下来了。',
          '它像一座倒下的钟楼，慢慢地、慢慢地散成光。',
          '那些光没有消失，它们只是换了个地方待着——',
          '待在每一个还在哭的人的身体里。',
          '',
          '你听见很多人在很远的地方叫你的名字。',
          '你答应了一声，然后走进了银色的门。',
          '',
          '欢迎回来。',
        ],
      },
      witch: {
        title: '银之庭院的居民',
        lines: [
          '灵魂宝石彻底黑下去的时候，你一点也不疼。',
          '你只是忽然明白了所有的事情——',
          '包括那些从来没有人告诉过你的。',
          '',
          '于是你开始做一个很长很长的梦。',
          '梦里有一座开满花的庭院，门一直开着，',
          '等着下一个许愿的孩子推门进来。',
        ],
      },
      dead: {
        title: '在傍晚松开了手',
        lines: [
          '你倒下的时候，天还是很亮。',
          '远处有人在放学的路上笑，有人按响了自行车的铃。',
          '世界一点也没有变。',
          '',
          '只是今天，你没有走到明天。',
        ],
      },
    },
  },

  homura: {
    id: 'homura',
    label: '晓美焰',
    chip: ' 晓美焰 ',
    modeName: '困难模式',
    modeTag: '时间不站在你这边',
    hint: '以「晓美焰」的心往前走。',
    title: '银之庭院 · 晓美焰',
    palette: {
      bg: '#12101f',
      frame: '#a98cff',
      frameDim: '#4a3a78',
      title: '#ece4ff',
      text: '#d6cff0',
      dim: '#8b81b3',
      accent: '#b18cff',
      accentSoft: '#33235c',
      good: '#8fe3c2',
      bad: '#ff7a86',
      warn: '#c8a6ff',
      seed: '#e0d0ff',
      meterLow: '#b9a3ff',
      meterMid: '#c8a6ff',
      meterHigh: '#ff6a78',
      selectFg: '#f6f1ff',
      selectBg: '#3b276e',
    },
    rules: {
      hp: 105,
      startSeeds: 1,
      rewinds: 3,
      corruptMul: 1.15,
      purifyMul: 0.9,
      dmgMul: 1.05,
      enemyAtkMul: 1.25,
      enemyHpMul: 1.0,
      witchHpMul: 1.05,
      seedBonus: 0,
      familiarSeedChance: 0.3,
      escapeChance: 0.45,
      showHidden: false,
      specialCd: 3,
      special: {
        key: 'timestop',
        label: '时间停止',
        hint: '冷却 3 回合 · 冻结敌人两回合，下一击伤害翻倍',
      },
    },
    boardTitle: '《这里不是 银之庭院》',
    boardSub: '— 如果你读到这里，说明你已经读过很多次了 —',
    boardLines: [
      '门后面的东西从来不会变。',
      '会变的只是——你还愿意重来多少次。',
      '',
      '别相信任何写着「欢迎」的牌子。',
      '别相信给你指路的人。',
      '尤其是，别相信那个白色的东西。',
      '',
      '（这行字被人用指甲反复刻了很多遍。）',
    ],
    boardFoot: '没有落款。纸张背面有很深的、被反复摩挲的褶皱。',
    boardPin: '◆',
    prologue: [
      '你又一次许下了愿望。',
      '第几次了？你自己也记不清了。',
      '',
      '你知道接下来会发生什么：',
      '谁会在第几天哭，谁会在第几天死，',
      '哪一句话说出去了就再也收不回来。',
      '',
      '没关系。这一次，你会走得更早一点。',
    ],
    endings: {
      win: {
        title: '最后一次循环',
        lines: [
          '魔女之夜散开的时候，你没有笑。',
          '你只是很轻地、很轻地呼出一口气，',
          '像把一个抱了很久很久的东西，终于放了下来。',
          '',
          '天亮了。',
          '有人从后面叫你的名字——是那个你保护了很多次的声音。',
          '',
          '这一次，你回头了。',
        ],
      },
      witch: {
        title: '又一个我，留在了这里',
        lines: [
          '黑掉了。又是这样。',
          '你在变成魔女之前的最后一秒想的是：',
          '没关系，还有下一次。',
          '',
          '可是你已经数不清，「下一次」到底是第几次了。',
          '',
          '庭院的门在身后关上。里面多了一个你。',
        ],
      },
      dead: {
        title: '在黑暗里松开手',
        lines: [
          '这一次也失败了。',
          '你躺在那里，看着自己的血把地面染成很熟悉的颜色。',
          '',
          '没关系。',
          '只要还能回到那个教室，就还可以再来一次。',
          '',
          '你闭上眼睛，等着时间倒回去。',
        ],
      },
    },
  },
};

const ORDER = ['madoka', 'homura'];

  return { THEMES, ORDER };
});
