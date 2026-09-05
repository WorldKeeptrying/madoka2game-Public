// 共享模块：见泷原的地图、魔女、事件与愿望
// 同时支持 Node（CommonJS）与浏览器（window.Madoka.content），
// 终端版与网页版用的是同一份文件，改这里两边一起生效。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Madoka = root.Madoka || {};
    root.Madoka.content = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
'use strict';

// 见泷原的地图、魔女、事件与愿望。
// 所有 run(g) 中的 g 都是 Game 实例（见 engine.js）。

const PLACES = {
  school: {
    id: 'school',
    name: '见泷原中学',
    subtitle: '三年二班 · 放学后',
    safe: true,
    intro: [
      '放学铃响过很久了，走廊尽头的光是橘色的，',
      '像是有人正一点点把今天关掉。',
      '黑板上留着值日生没擦净的一行字：明天也要加油。',
    ],
    exits: [
      { to: 'shopping', label: '樱之丘商店街' },
      { to: 'park', label: '水名公园' },
      { to: 'subway', label: '通往地下通道的楼梯口', hidden: true },
    ],
    events: [
      {
        id: 'desk',
        label: '翻一翻自己的课桌',
        once: true,
        run(g) {
          g.say([
            '桌洞里塞着没写完的试卷、半块橡皮，',
            '还有一张折了四折的纸条。',
          ]);
          g.say(['上面是自己的笔迹：「如果真的有奇迹，我想用它做点什么。」'], 'dim');
          g.item('candy', 1);
        },
      },
      {
        id: 'nurse',
        label: '在保健室的床上躺一会儿',
        run(g) {
          g.say([
            '窗帘拉着，消毒水的味道盖过了一切。',
            '你把武器放在床边，闭上眼睛。',
          ]);
          g.heal(45);
          g.corrupt(5);
        },
      },
      {
        id: 'rooftop',
        label: '推开天台那扇铁门',
        when: (s) => s.witches >= 4,
        run(g) {
          g.say(['铁门后面不是天台。']);
          g.say([
            '是倒过来的天空，',
            '和一座正在缓慢旋转的、由齿轮与裙摆搭成的城市。',
          ], 'bad');
          g.startBattle('walpurgis');
        },
      },
    ],
    lookText: [
      '你把讲台、扫帚柜和窗台都看了一遍。',
      '窗外，见泷原的灯火正一盏一盏亮起来。',
    ],
    finds: [
      { item: 'candy', n: 1, text: ['失物招领的箱子里有一包没拆封的糖果。'] },
      { text: ['走廊尽头的灭火器上贴着一张便条：「别一个人去天台。」'] },
    ],
    idle: ['走廊很长。你走到底，又走回来。'],
  },

  shopping: {
    id: 'shopping',
    name: '樱之丘商店街',
    subtitle: '傍晚 · 还亮着灯',
    safe: true,
    intro: [
      '卷帘门一家家落下，只有便利店和咖啡店还醒着。',
      '路灯把每个人的影子拉得很长，长得像另一个人。',
    ],
    exits: [
      { to: 'school', label: '见泷原中学' },
      { to: 'shrine', label: '见泷原神社' },
      { to: 'factory', label: '铁道口那边的旧工厂', hidden: true },
      { to: 'cinema', label: '巷子深处还亮着灯的电影院', hidden: true },
    ],
    events: [
      {
        id: 'kyubey',
        label: '和那只白色的生物说话',
        run(g) {
          if (g.theme.id === 'madoka') {
            g.say([
              '白色的生物蹲在电线杆上，尾巴慢慢地摇。',
              '「你的灵魂宝石很干净呢。真少见。」',
            ]);
            g.say(['「没关系，等你决定好要成为什么样的人，我随时都在。」'], 'dim');
            if (!g.s.flags.kyubeyGift) {
              g.s.flags.kyubeyGift = true;
              g.item('seed', 1);
            } else {
              g.say(['它只是看着你，什么也没再给。'], 'dim');
            }
          } else {
            g.say([
              '白色的生物蹲在电线杆上，尾巴慢慢地摇。',
              '「我们又见面了……不对，是你又见到我了。」',
            ]);
            g.say(['「这一次的你，还是不肯相信我吗？」'], 'dim');
            g.say(['它报出了一个魔女的名字。你不确定那是真是假。'], 'warn');
            if (g.s.seeds === 0) {
              g.say(['它从嘴里吐出一枚温热的种子，推到你脚边。'], 'dim');
              g.item('seed', 1);
            }
          }
        },
      },
      {
        id: 'cafe',
        label: '在咖啡店里坐一会儿',
        run(g) {
          g.say([
            '你把武器靠在桌边，点了一杯很甜的东西。',
            '窗外的天一点点暗下去，店里有人在放很老的歌。',
          ]);
          g.heal(35);
          g.corrupt(5);
        },
      },
    ],
    lookText: [
      '你沿着店铺一家家看过去。',
      '有一家店的橱窗里，摆着一个和你很像的人偶。',
    ],
    finds: [
      { item: 'seed', n: 1, text: ['排水沟里卡着一枚黑色的种子，还在轻轻发烫。'] },
      { text: ['便利店门口的募捐箱上写着：「请救救见泷原的孩子们。」'] },
    ],
    idle: ['街上人不多。你走了两圈，什么也没发生。'],
  },

  park: {
    id: 'park',
    name: '水名公园',
    subtitle: '蔷薇花坛 · 无风的午后',
    witch: 'gertrud',
    familiars: ['rose_familiar'],
    intro: [
      '蔷薇开得不合时令，红得几乎发黑。',
      '没有风，花瓣却一直在落。',
      '空气里有一股甜得发腻的香味，压在舌头上化不开。',
    ],
    exits: [
      { to: 'school', label: '见泷原中学' },
      { to: 'shrine', label: '见泷原神社' },
    ],
    events: [
      {
        id: 'roses',
        label: '把手伸进蔷薇花丛',
        run(g) {
          g.say(['花刺扎进指头，血珠还没渗出来，就被花吸了进去。']);
          g.say(['花丛深处，有一枚黑色的种子。'], 'dim');
          g.item('seed', 1);
          g.corrupt(6);
        },
      },
      {
        id: 'swing',
        label: '坐上那架秋千',
        run(g) {
          g.say([
            '秋千自己晃了起来，像有人在你背后轻轻推。',
            '你想起某个早已想不起名字的下午。',
          ]);
          g.corrupt(-8);
          g.say(['心里好像被谁擦干净了一小块。'], 'good');
        },
      },
    ],
    lookText: [
      '花坛边的铭牌上写着：「请勿采摘」。',
      '下面多了一行歪歪扭扭的补写：「也请勿被采摘」。',
    ],
    finds: [
      { item: 'seed', n: 1, text: ['长椅底下滚落着一枚黑色的种子。'] },
      { item: 'candy', n: 1, text: ['沙坑里埋着一颗糖，包装纸还没拆。'] },
      { text: ['一只没有眼睛的白猫从你脚边跑过去了。'] },
    ],
    idle: ['你在公园里转了一圈。蔷薇的味道更浓了。'],
  },

  shrine: {
    id: 'shrine',
    name: '见泷原神社',
    subtitle: '石阶尽头 · 无人参拜',
    witch: 'charlotte',
    familiars: ['snack_familiar'],
    intro: [
      '绘马架上挂满了愿望，字迹都被雨泡开了。',
      '香火早就断了，可空气里还留着一点奶油一样的甜味。',
    ],
    exits: [
      { to: 'shopping', label: '樱之丘商店街' },
      { to: 'park', label: '水名公园' },
      { to: 'subway', label: '被木板钉住的侧门', hidden: true },
    ],
    events: [
      {
        id: 'omikuji',
        label: '抽一支签',
        run(g) {
          const roll = Math.random();
          g.say(['你摇了摇签筒。竹签落地的声音很响。']);
          if (roll < 0.2) {
            g.say(['「大吉」——愿望会实现的。只要你付得起。'], 'good');
            g.item('seed', 1);
            g.heal(15);
          } else if (roll < 0.5) {
            g.say(['「中吉」——路上会有人帮你，也会有人骗你。'], 'dim');
            g.item('candy', 1);
          } else if (roll < 0.8) {
            g.say(['「小吉」——今天适合停下来，看看天。'], 'good');
            g.corrupt(-12);
          } else {
            g.say(['「凶」——签纸上有血迹，是你自己的。'], 'bad');
            g.corrupt(12);
            if (g.chance(0.5)) {
              g.say(['什么东西被甜味引来了。'], 'bad');
              g.startBattle('snack_familiar');
            }
          }
        },
      },
      {
        id: 'ema',
        label: '看看别人写下的绘马',
        run(g) {
          g.say([
            '「希望大家都能活到毕业。」',
            '「希望妈妈不要再哭了。」',
            '「希望我还是我。」——这张的字迹，是你自己的。',
          ], 'dim');
          g.corrupt(-6);
          g.say(['你把那张绘马翻了过来，背面是空的。'], 'dim');
        },
      },
    ],
    lookText: [
      '赛钱箱是空的。你往里看，里面堆着很多没拆的糖果纸。',
    ],
    finds: [
      { item: 'candy', n: 1, text: ['供台上摆着一盘糖果，你拿了一颗。'] },
      { item: 'seed', n: 1, text: ['手水钵的底部沉着一枚种子。水很凉。'] },
      { text: ['社殿后面有一道很新的拖痕，像是有人被拖走了。'] },
    ],
    idle: ['神社很安静。只有糖果纸在地上翻动的声音。'],
  },

  subway: {
    id: 'subway',
    name: '地下通道',
    subtitle: '末班车之后',
    witch: 'elly',
    familiars: ['box_familiar'],
    intro: [
      '荧光灯坏了一半，另一半在嗡嗡作响。',
      '墙上贴满了寻人启事，照片上的脸都被人撕掉了。',
      '越往里走，空气越甜。',
    ],
    exits: [
      { to: 'school', label: '见泷原中学' },
      { to: 'factory', label: '废弃工厂' },
      { to: 'shrine', label: '一段向上的、很窄的台阶', hidden: true },
    ],
    events: [
      {
        id: 'vending',
        label: '踢一踢那台贩卖机',
        run(g) {
          g.say(['机器晃了两下，掉出一罐还是温的咖啡。']);
          g.item('candy', 1);
          g.heal(15);
        },
      },
      {
        id: 'graffiti',
        label: '看墙上的涂鸦',
        run(g) {
          g.say([
            '整面墙都被人用红漆写满了同一句话：',
            '「不要相信红色的门。」',
          ], 'dim');
          g.say(['可是这里，一扇红色的门也没有。'], 'warn');
        },
      },
    ],
    lookText: [
      '你沿着墙根一路看过去。',
      '有一张寻人启事上的照片，是你自己。',
    ],
    finds: [
      { item: 'seed', n: 1, text: ['排水口里卡着一枚还在跳动的种子。'] },
      { text: ['地上有半张车票，日期是明天。'] },
    ],
    idle: ['通道里只有你的脚步声，和另一串跟着你的脚步声。'],
  },

  factory: {
    id: 'factory',
    name: '废弃工厂',
    subtitle: '铁道口的另一侧',
    witch: 'elsa',
    familiars: ['shadow_familiar'],
    intro: [
      '铁皮墙上有弹孔一样的洞，风穿过去，发出很像哭的声音。',
      '地上有一圈又一圈干掉的黑色痕迹，一圈比一圈大。',
    ],
    exits: [
      { to: 'subway', label: '地下通道' },
      { to: 'shopping', label: '穿过铁道口的近路', hidden: true },
    ],
    events: [
      {
        id: 'machine',
        label: '撬开那台生锈的机械',
        run(g) {
          g.say(['齿轮早就锈死了，你费了很大劲才掰开外壳。']);
          g.say(['里面塞满了黑色的种子，像一窝卵。'], 'bad');
          g.item('seed', 2);
          g.corrupt(10);
        },
      },
      {
        id: 'puddle',
        label: '看积水里的倒影',
        run(g) {
          if (g.s.corrupt >= 60) {
            g.say(['水面里的人也在看着你。']);
            g.say(['她的眼睛，比你的要黑得多。'], 'bad');
            g.corrupt(5);
          } else {
            g.say(['水面里是你自己的脸。']);
            g.say(['还好，还认得出来。'], 'good');
            g.corrupt(-6);
          }
        },
      },
    ],
    lookText: [
      '厂房中央堆着很多纸箱，箱子上写着「易碎」。',
      '你打开一个，里面是空的，只有很多很多的牙印。',
    ],
    finds: [
      { item: 'seed', n: 1, text: ['传送带下面滚出一枚种子，表面还带着齿痕。'] },
      { item: 'candy', n: 1, text: ['更衣室的柜子里有一盒没吃完的糖。'] },
      { text: ['墙上用指甲刻着很多道痕，数不清多少道了。'] },
    ],
    idle: ['工厂里很空。有什么东西在很远的地方呼吸。'],
  },

  cinema: {
    id: 'cinema',
    name: '夜晚的电影院',
    subtitle: '末场放映 · 无人离席',
    witch: 'oktavia',
    familiars: ['concert_familiar', 'accomp_familiar'],
    intro: [
      '霓虹招牌只剩三个字母还亮着，剩下的拼不出名字。',
      '放映机的光柱穿过灰尘，落在空空的观众席上。',
      '',
      '银幕上在放一场演奏会。台下坐满了人，没有一个人说话。',
      '音乐从很深、很深的地方传上来——',
      '你才听了三秒钟，就觉得心里有样东西被轻轻拿走了。',
    ],
    exits: [{ to: 'shopping', label: '樱之丘商店街' }],
    events: [
      {
        id: 'screen',
        label: '看银幕上到底在放什么',
        run(g) {
          g.say([
            '银幕上是一个很老的童话。',
            '一个女孩把声音交了出去，换来两条腿，',
            '去见那个她救起来的王子。',
            '',
            '可是王子娶了邻国的公主。',
            '天亮的时候，她变成了海面上的泡沫。',
          ], 'dim');
          g.say(['观众席上爆发出很长的掌声。然后，重播。'], 'bad');
          g.corrupt(6);
        },
      },
      {
        id: 'seat',
        label: '坐进观众席中间',
        run(g) {
          g.say(['你坐下来。邻座的轮廓一直在哭，没有声音。']);
          g.say(['乐团忽然转过头，一起看着你。', '它们把你的名字，唱了出来。'], 'bad');
          g.item('seed', 1);
          g.corrupt(8);
        },
      },
      {
        id: 'projector',
        label: '溜进后面的放映室',
        once: true,
        run(g) {
          g.say([
            '机器还在转。胶片是首尾相接的——',
            '它没有开始，也没有结尾。',
          ]);
          g.say([
            '胶片盒上贴着一行外国字，你只认得其中两个词：',
            '「命运」，和「轮」。',
          ], 'dim');
          g.say([
            '你忽然明白过来：',
            '她不是被困在这里的。',
            '她是自己把这一天，重新放了一遍又一遍。',
          ], 'warn');
          g.corrupt(-10);
        },
      },
    ],
    lookText: [
      '你把每一排座椅都看了一遍。',
      '第七排靠中间的位置上，放着一件叠得很整齐的蓝色外套。',
    ],
    finds: [
      { item: 'seed', n: 1, text: ['座椅缝隙里卡着一枚种子，还在跟着低音一起震。'] },
      { item: 'candy', n: 1, text: ['售票台上摆着一份没人来领的儿童套餐，糖还没化。'] },
      { text: ['地上的票根被水泡过，两个名字糊在了一起，分不清是谁和谁。'] },
    ],
    idle: ['电影一直在放。你不知道自己已经看了多久。'],
  },
};

const ENEMIES = {
  rose_familiar: {
    name: '蔷薇的使魔',
    kind: 'familiar',
    hp: 24,
    atk: 5,
    intro: ['花瓣聚成一团，长出牙齿和一条细长的舌头。'],
  },
  snack_familiar: {
    name: '零食的使魔',
    kind: 'familiar',
    hp: 28,
    atk: 6,
    intro: ['糖果纸哗啦哗啦地立起来，变成了很多只小手。'],
  },
  box_familiar: {
    name: '箱之使魔',
    kind: 'familiar',
    hp: 32,
    atk: 6,
    intro: ['纸箱自己合上了。你听见里面有人在数数。'],
  },
  shadow_familiar: {
    name: '影之使魔',
    kind: 'familiar',
    hp: 36,
    atk: 7,
    intro: ['你的影子从地上站起来，比你要高一些。'],
  },
  accomp_familiar: {
    name: '伴奏使魔',
    kind: 'familiar',
    hp: 34,
    atk: 7,
    intro: ['看不见的乐手在你背后坐下，替你打起了拍子。'],
  },
  concert_familiar: {
    name: '演奏使魔',
    kind: 'familiar',
    hp: 40,
    atk: 8,
    intro: [
      '观众席的轮廓一个接一个站起来，手里多出了乐器。',
      '它们转过身，开始只为你一个人演奏。',
    ],
  },

  gertrud: {
    name: '蔷薇园的魔女',
    kind: 'witch',
    hp: 95,
    atk: 9,
    reward: { seeds: 2 },
    intro: [
      '结界的深处有一座花园。园丁不在，玫瑰在尖叫。',
      '她悬在半空，像一枚结得太久的果实。',
    ],
    outro: [
      '花园安静下来了。玫瑰一片一片地碎成灰。',
      '你从她身上取走了悲叹之种。',
    ],
  },
  elly: {
    name: '箱之魔女',
    kind: 'witch',
    hp: 125,
    atk: 10,
    reward: { seeds: 2 },
    intro: [
      '纸板搭成的房间里，摆着很多很多个「出口」。',
      '每一个后面，都是同一间房间。',
    ],
    outro: [
      '纸墙塌了。你终于找到了那个真的出口。',
      '临走前，你从废墟里捡起了悲叹之种。',
    ],
  },
  charlotte: {
    name: '零食的魔女',
    kind: 'witch',
    hp: 155,
    atk: 12,
    reward: { seeds: 3 },
    intro: [
      '奶油、蛋糕、糖果纸，全都堆成了一座小山。',
      '山顶上坐着一个很小的、一直在吃东西的东西。',
      '它抬头看了你一眼，笑得很甜。',
    ],
    outro: [
      '小山塌了下去，甜味散得干干净净。',
      '你捡起悲叹之种的时候，手是抖的。',
    ],
  },
  elsa: {
    name: '影之魔女',
    kind: 'witch',
    hp: 185,
    atk: 13,
    reward: { seeds: 3 },
    intro: [
      '这里没有光，所以也没有影子。',
      '可你还是看见了一个影子——它正在慢慢地转过身来。',
    ],
    outro: [
      '影子散开了。它原来是由很多很多句「救救我」组成的。',
      '你没有听清任何一句，但你全捡了起来。',
    ],
  },
  oktavia: {
    name: '人鱼的魔女',
    kind: 'witch',
    hp: 195,
    atk: 14,
    aura: 1, // 结界里那场停不下来的演奏：每回合额外污浊
    reward: { seeds: 4 },
    intro: [
      '银幕被从里面掀开了。',
      '',
      '后面不是后台，是一座演奏厅——',
      '一座她曾经在这里，为某个人动容过的演奏厅。',
      '',
      '她坐在最高的位置上，背后是一枚缓缓转动的、',
      '挂满了回忆、却通不到任何未来的轮。',
      '',
      '「不要停下来。」她说。',
      '「停下来，我就得想起来了。」',
    ],
    outro: [
      '演奏停了。',
      '命运之轮转完最后一格，轻轻地碎在地上。',
      '',
      '散场的时候没有人鼓掌。',
      '你从空荡荡的台上，捡起了她留下来的东西。',
    ],
  },
  walpurgis: {
    name: '魔女之夜',
    kind: 'boss',
    hp: 215,
    atk: 14,
    reward: { seeds: 0 },
    intro: [
      '它来了。',
      '不是走来的，是整个世界被它拖着走。',
      '齿轮、裙摆、笑声，混在一起，从天上一直压到地面。',
    ],
    outro: ['——'],
  },
};

// 契约时可选的三个愿望（第三个随主题而变）
function wishes(theme) {
  const third =
    theme.id === 'homura'
      ? {
          id: 'time',
          label: '「我想让那一天，重新来过。」',
          note: '时间回溯 +1',
          apply(g) {
            g.s.rewinds += 1;
          },
        }
      : {
          id: 'time',
          label: '「我想让重要的东西，一直留在身边。」',
          note: '悲叹之种 +2',
          apply(g) {
            g.s.seeds += 2;
          },
        };

  return [
    {
      id: 'protect',
      label: '「我想成为，能保护大家的人。」',
      note: '最大生命 +30',
      apply(g) {
        g.s.maxHp += 30;
        g.s.hp += 30;
      },
    },
    {
      id: 'sky',
      label: '「我想再看一次，那天的天空。」',
      note: '灵魂宝石变脏的速度 -20%',
      apply(g) {
        g.s.corruptMul *= 0.8;
      },
    },
    third,
  ];
}

  return { PLACES, ENEMIES, wishes };
});
