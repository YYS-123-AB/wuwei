import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const STATUS_LIST = ['airing', 'finished', 'upcoming', 'movie', 'ova', 'oad'];
const STATUS_CN = {
  airing: '新番连载',
  finished: '已完结',
  upcoming: '即将开播',
  movie: '剧场版',
  ova: 'OVA',
  oad: 'OAD'
};

const GENRE_LIST = ['热血', '恋爱', '日常', '搞笑', '奇幻', '科幻', '悬疑', '校园', '运动', '治愈', '异世界', '机战'];

const CN_NAMES = [
  '进击的巨人', '鬼灭之刃', '咒术回战', '间谍过家家', '电锯人',
  '葬送的芙莉莲', '药屋少女的呢喃', '我推的孩子', '排球少年', '蓝色监狱',
  '文豪野犬', '辉夜大小姐想让我告白', '关于我转生变成史莱姆这档事', '无职转生', 'Re:从零开始的异世界生活',
  '孤独摇滚', '莉可丽丝', '赛博朋克：边缘行者', '孤独摇滚', 'SPY×FAMILY',
  '夏日重现', '明日酱的水手服', '派对浪客诸葛孔明', '恋爱要在世界征服后', '测不准的阿波连同学',
  '杜鹃的婚约', '朋友游戏', '夏日口袋', '处刑少女的生存之道', '小鸟之翼',
  '境界触发者', '王者天下', '银魂', '家庭教师', '海贼王',
  '火影忍者', '全职猎人', '钢之炼金术师', '死亡笔记', 'Code Geass',
  'CLANNAD', 'Angel Beats', '魔法少女小圆', '命运石之门', '空之境界',
  '化物语', '进击的巨人 最终季', '鬼灭之刃 无限列车', '咒术回战 怀玉', '我的英雄学院',
  '黑色五叶草', 'Dr.STONE 石纪元', '约定的梦幻岛', '地缚少年花子君', '异度侵入',
  '动物狂想曲', '别对映像研出手', '昨日之歌', '听我的电波吧', '隐瞒之事',
  '神之塔', '水果篮子 最终季', '无限滑板', '堀与宫村', '奇蛋物语',
  '86 不存在的战区', '致不灭的你', '薇薇：萤石眼之歌', '剃须，然后捡到女高中生', '东京复仇者',
  '青梅竹马绝对不会输的恋爱喜剧', '现实主义勇者的王国再建记', '我们的重制人生', '见面之后5秒开始战斗', '贾希大人不气馁',
  '平家物语', '更衣人偶坠入爱河', '擅长捉弄的高木同学', '失格纹的最强贤者', '最游记RELOAD',
  '幻想三国志', '蔷薇王的葬列', '东京24区', '瓦尼塔斯的手记', '白金终局',
  '食锈末世录', '少女前线', '怪人开发部的黑井津小姐', '相爱相杀', '擅长逃跑的少主殿下',
  '骸骨骑士大人异世界冒险中', '群青的号角', '小书痴的下克上', '盾之勇者成名录', '平凡职业造就世界最强',
  '在地下城寻求邂逅是否搞错了什么', '刀剑神域', '加速世界', '记录的地平线', '游戏人生'
];

const JP_NAMES = [
  '進撃の巨人', '鬼滅の刃', '呪術廻戦', 'SPY×FAMILY', 'チェンソーマン',
  '葬送のフリーレン', '薬屋のひとりごと', '【推しの子】', 'ハイキュー!!', 'ブルーロック',
  '文豪ストレイドッグス', 'かぐや様は告らせたい', '転生したらスライムだった件', '無職転生', 'Re:ゼロから始める異世界生活',
  'ぼっち・ざ・ろっく!', 'リコリス・リコイル', 'サイバーパンク：エッジランナーズ', 'ぼっち・ざ・ろっく!', 'SPY×FAMILY',
  'サマータイムレンダ', '明日ちゃんのセーラー服', 'パリピ孔明', '恋は世界征服のあとで', '阿波連さんははかれない',
  'カッコウの許嫁', 'トモダチゲーム', 'サマーポケッツ', '処刑少女の生きる道', 'バードウィング',
  'ワールドトリガー', 'キングダム', '銀魂', '家庭教師ヒットマンREBORN!', 'ONE PIECE',
  'NARUTO', 'HUNTER×HUNTER', '鋼の錬金術師', 'DEATH NOTE', 'コードギアス',
  'CLANNAD', 'Angel Beats!', '魔法少女まどか☆マギカ', 'STEINS;GATE', '空の境界',
  '化物語', '進撃の巨人 The Final Season', '鬼滅の刃 無限列車編', '呪術廻戦 懐玉', '僕のヒーローアカデミア',
  'ブラッククローバー', 'Dr.STONE', '約束のネバーランド', '地縛少年花子くん', 'イド：インベーデッド',
  'ビースターズ', '映像研には手を出すな!', 'イエスタデイをうたって', '波よ聞いてくれ', 'かくしごと',
  '神之塔', 'フルーツバスケット The Final', 'SK∞ エスケーエイト', 'ホリミヤ', 'ワンダーエッグ・プライオリティ',
  '86 -エイティシックス-', '不滅のあなたへ', 'vivy -フローライトアイズソング-', 'ひげを剃る。そして女子高生を拾う。', '東京リベンジャーズ',
  '幼なじみが絶対に負けないラブコメ', '現実主義勇者の王国再建記', 'ぼくたちのリメイク', '出会って5秒でバトル', 'ジャヒー様はくじけない!',
  '平家物語', 'その着せ替え人形は恋をする', 'からかい上手の高木さん', '失格紋の最強賢者', '最遊記RELOAD',
  '幻想三国志 -天元靈心記-', '薔薇王の葬列', '東京24区', 'ヴァニタスの手記', '白金終局',
  '錆喰いビスコ', 'ドールズフロントライン', '怪人開発部の黒井津さん', '殺し愛', '逃げ上手の若君',
  '骸骨騎士様、只今異世界へ', '群青のファンファーレ', '本好きの下剋上', '盾の勇者の成り上がり', 'ありふれた職業で世界最強',
  'ダンジョンに出会いを求めるのは間違っているだろうか', 'ソードアート・オンライン', 'アクセル・ワールド', 'ログ・ホライズン', 'ノーゲーム・ノーライフ'
];

const STUDIOS = [
  'MADHOUSE', 'ufotable', 'MAPPA', 'WIT STUDIO', 'CloverWorks',
  'A-1 Pictures', 'BONES', '京都动画', 'SHAFT', 'Production I.G',
  'SUNRISE', '东映动画', 'TMS Entertainment', 'OLM', 'SILVER LINK.',
  'BN Pictures', 'P.A.WORKS', 'WHITE FOX', 'J.C.STAFF', 'studio 3Hz',
  'TRIGGER', 'LIDENFILMS', 'Avex Pictures', 'bilibili', 'BANDAI NAMCO Pictures'
];

const DIRECTORS = [
  '荒木哲郎', '外崎春雄', '御所園翔太', '古桥一浩', '中山龙',
  '铃木健一', '佐藤雅教', '大沼心', '满仲劝', '石川界人',
  '新房昭之', '山本宽', '石原立也', '武本康弘', '新海诚',
  '细田守', '今石洋之', '神山健治', '冲方丁', '长井龙雪',
  '高松信司', '岸诚二', '藤森雅也', '工藤进', '黑柳利充'
];

const WRITERS = [
  '濑古浩司', 'ufotable', '平林佐和子', '古桥一浩', '大岛里美',
  '笔安一幸', '横手美智子', '花田十辉', '三重野瞳', '柿原优子',
  '新房昭之', '虚渊玄', '麻枝准', '冈田磨里', '山口宏',
  '十川诚志', '吉田玲子', '米村正二', '富冈淳广', '武上纯希'
];

const ORIGINAL_SOURCES = [
  '漫画', '轻小说', '原创', '游戏', '小说', '历史', '真人真事'
];

const CV_NAMES = [
  '梶裕贵', '石川界人', '松冈祯丞', '花江夏树', '山下大辉',
  '村瀬步', '寺岛拓笃', '逢坂良太', '河西健吾', '天崎滉平',
  '朴璐美', '钉宫理惠', '水濑祈', '花泽香菜', '悠木碧',
  '小仓唯', '日高里菜', '高桥李依', '雨宫天', '上田丽奈',
  '东山奈央', '竹达彩奈', '户松遥', '丰崎爱生', '佐藤利奈'
];

const ROLE_NAMES = [
  '艾伦·耶格尔', '炭治郎', '虎杖悠仁', '阿尼亚', '电次',
  '芙莉莲', '猫猫', '星野爱', '日向翔阳', '洁世一',
  '中岛敦', '四宫辉夜', '利姆露', '鲁迪乌斯', '菜月昴',
  '后藤独', '锦木千束', '大卫', '后藤独', '约尔',
  '网代慎平', '明日小路', '诸葛孔明', '相川不动', '阿波连玲奈',
  '海野幸', '片切友一', '鹰原羽依里', '梅诺', '天鹫彩夏',
  '三云修', '信', '坂田银时', '沢田纲吉', '蒙奇·D·路飞',
  '漩涡鸣人', '小杰', '爱德华', '夜神月', '鲁路修',
  '冈崎朋也', '音无结弦', '鹿目圆', '冈部伦太郎', '两仪式',
  '阿良良木历', '艾伦', '炭治郎', '五条悟', '绿谷出久',
  '亚斯塔', '石神千空', '艾玛', '花子君', '酒井户',
  '雷格西', '浅草绿', '歌岛千草', '鼓田美奈丽', '后藤可久士',
  '二十五夜', '本田透', '驰河兰加', '宫村伊澄', '大户爱',
  '辛耶·诺赞', '不死', '薇薇', '沙优', '花垣武道',
  '丸末睛', '相马一也', '桥场恭也', '白柳启', '贾希大人',
  '平德子', '喜多川海梦', '高木同学', '西恩·沃沃塔特', '玄奘三藏',
  '尚衣', '理查', '朱城兰世', '瓦尼塔斯', '架桥明日',
  '赤星毕斯可', 'M16A1', '黑井津灯香', '夏特', '北条时行',
  '亚克', '有村大智', '本须丽乃', '岩谷尚文', '南云始',
  '贝尔·克朗尼', '桐谷和人', '有田春雪', '城惠', '空'
];

const TAGS_LIST = [
  '热血', '战斗', '友情', '胜利', '成长', '恋爱', '青春', '喜剧',
  '日常', '治愈', '奇幻', '冒险', '科幻', '机战', '悬疑', '推理',
  '恐怖', '魔法', '校园', '运动', '音乐', '偶像', '美食', '历史',
  '战争', '穿越', '异世界', '系统', '转生', '后宫', '纯爱', '治愈',
  '催泪', '感动', '暗黑', '致郁', '烧脑', '神作', '经典', '霸权'
];

const CHAR_INTROS = [
  '拥有坚定信念的主角，为了守护重要的人而不断变强。',
  '性格开朗的女主角，总是用笑容温暖周围的人。',
  '神秘的转学生，身上隐藏着不为人知的秘密。',
  '冷酷的竞争对手，其实内心有着温柔的一面。',
  '活泼好动的元气少年，永远充满着无限活力。',
  '温柔体贴的前辈，是大家最可靠的倾诉对象。',
  '才华横溢的天才，却有着奇怪的癖好。',
  '沉默寡言的战士，用行动代替语言证明自己。',
  '天真烂漫的少女，对世界充满了好奇心。',
  '经验丰富的老兵，见证了无数场战争。'
];

const INTRO_TEMPLATES = [
  '在这个充满魔法与奇迹的世界里，{name}因为一场意外卷入了改变命运的事件。为了守护自己所珍视的一切，{name}必须与伙伴们一起面对前所未有的挑战。这是一个关于友情、勇气与成长的故事。',
  '故事发生在一个架空的现代都市。{name}原本过着平凡的学生生活，直到那天遇到了神秘的少女。随着真相逐渐揭开，一个隐藏在世界背后的巨大阴谋开始浮出水面。',
  '遥远的未来，人类文明发展到了新的高度。然而，看似和平的社会下暗流涌动。{name}作为特殊机构的一员，负责处理各种异常事件。当一切线索串联起来，真正的敌人竟然是……',
  '异世界转生？！{name}因为意外穿越到了一个剑与魔法的世界。凭借着前世的知识和独特的技能，{name}开始了在这个新世界的冒险旅程。途中结识了众多志同道合的伙伴。',
  '这是一个青春与梦想的故事。{name}怀揣着对未来的憧憬进入了梦寐以求的学校。在这里，{name}遇到了一生中最重要的伙伴们，一起追逐着那个看似遥不可及的目标。',
  '被称为天才的{name}，其实一直承受着常人难以想象的压力。当旧伤复发，{name}必须在坚持与放弃之间做出选择。所幸，在最黑暗的时刻，挚友伸出了援助之手。'
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRatingDistribution() {
  const d1 = rand(2, 10);
  const d2 = rand(5, 15);
  const d3 = rand(15, 30);
  const d4 = rand(25, 40);
  const d5 = 100 - d1 - d2 - d3 - d4;
  return { '1': d1, '2': d2, '3': d3, '4': d4, '5': Math.max(10, d5) };
}

function generateCV(name, index) {
  return {
    name: CV_NAMES[index % CV_NAMES.length],
    roleName: ROLE_NAMES[index % ROLE_NAMES.length],
    avatar: `https://picsum.photos/seed/cv${name}${index}/200/200`,
    intro: CHAR_INTROS[index % CHAR_INTROS.length]
  };
}

function generateCharacters(count, prefix) {
  const chars = [];
  for (let i = 0; i < count; i++) {
    chars.push({
      name: ROLE_NAMES[(i + prefix) % ROLE_NAMES.length],
      CV: CV_NAMES[(i * 2 + prefix) % CV_NAMES.length],
      avatar: `https://picsum.photos/seed/char${prefix}${i}/300/300`,
      intro: CHAR_INTROS[(i + prefix) % CHAR_INTROS.length]
    });
  }
  return chars;
}

function generateStaffs(count, prefix) {
  const posts = ['原作', '监督', '系列构成', '角色设计', '音乐', '美术监督', '摄影监督', '剪辑', '音响监督', '动画制片人'];
  const staffs = [];
  for (let i = 0; i < Math.min(count, posts.length); i++) {
    const namePool = [...DIRECTORS, ...WRITERS, ...CV_NAMES];
    staffs.push({
      post: posts[i % posts.length],
      name: namePool[(i + prefix) % namePool.length]
    });
  }
  return staffs;
}

function generateAnimeData(count = 100) {
  const animes = [];
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018];
  const quarters = [1, 2, 3, 4];

  for (let i = 0; i < count; i++) {
    const status = STATUS_LIST[i % STATUS_LIST.length];
    const genresCount = rand(1, 4);
    const genres = pickRandom(GENRE_LIST, genresCount);
    const seasonYear = years[i % years.length];
    const seasonQuarter = quarters[i % quarters.length];
    const episodes = status === 'movie' ? 1 : (status === 'upcoming' ? 0 : rand(12, 100));
    const duration = status === 'movie' ? rand(90, 180) : rand(20, 30);
    const mainCVCount = rand(3, 6);
    const mainCVs = [];
    for (let j = 0; j < mainCVCount; j++) {
      mainCVs.push(generateCV(CN_NAMES[i % CN_NAMES.length], i + j));
    }

    const introTemplate = INTRO_TEMPLATES[i % INTRO_TEMPLATES.length];
    const intro = introTemplate.replace(/{name}/g, CN_NAMES[i % CN_NAMES.length]);

    const ratingDist = generateRatingDistribution();
    const rating = (
      ratingDist['1'] * 1 +
      ratingDist['2'] * 2 +
      ratingDist['3'] * 3 +
      ratingDist['4'] * 4 +
      ratingDist['5'] * 5
    ) / 100;

    const charCount = rand(5, 10);
    const staffCount = rand(6, 10);

    animes.push({
      id: i + 1,
      cnName: CN_NAMES[i % CN_NAMES.length],
      jpName: JP_NAMES[i % JP_NAMES.length],
      enName: `Anime ${i + 1}`,
      cover: `https://picsum.photos/seed/animecover${i}/400/560`,
      banner: `https://picsum.photos/seed/animebanner${i}/1920/500`,
      status: status,
      genres: genres,
      seasonYear: seasonYear,
      seasonQuarter: seasonQuarter,
      episodes: episodes,
      durationMin: duration,
      studio: STUDIOS[i % STUDIOS.length],
      director: DIRECTORS[i % DIRECTORS.length],
      writers: [WRITERS[i % WRITERS.length], WRITERS[(i + 3) % WRITERS.length]],
      originalSource: pickOne(ORIGINAL_SOURCES),
      mainCVs: mainCVs,
      intro: intro,
      staffs: generateStaffs(staffCount, i),
      characters: generateCharacters(charCount, i),
      tags: pickRandom(TAGS_LIST, rand(3, 8)),
      rating: Math.round(rating * 10) / 10,
      ratingDistribution: ratingDist,
      hotScore: rand(1000, 1000000),
      relatedIds: {
        sameGenres: [],
        sameQuarter: [],
        sameStudio: []
      },
      firstAirDate: `${seasonYear}-${String((seasonQuarter - 1) * 3 + 1).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
      officialSite: `https://anime${i + 1}-official.example.jp/`
    });
  }

  for (let i = 0; i < count; i++) {
    const anime = animes[i];

    anime.relatedIds.sameGenres = animes
      .filter(a => a.id !== anime.id && a.genres.some(g => anime.genres.includes(g)))
      .map(a => a.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    anime.relatedIds.sameQuarter = animes
      .filter(a => a.id !== anime.id && a.seasonYear === anime.seasonYear && a.seasonQuarter === anime.seasonQuarter)
      .map(a => a.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    anime.relatedIds.sameStudio = animes
      .filter(a => a.id !== anime.id && a.studio === anime.studio)
      .map(a => a.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
  }

  return animes;
}

function tryFetchRemoteData() {
  return new Promise((resolve) => {
    try {
      const req = https.get('https://api.example.com/anime', {
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length >= 10) {
              resolve(parsed);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function main() {
  console.log('📥 开始生成番剧数据...');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log('🌐 尝试获取远程数据（5秒超时）...');
  const remoteData = await tryFetchRemoteData();

  let animes;
  if (remoteData) {
    console.log('✅ 获取到远程数据');
    animes = remoteData;
  } else {
    console.log('⚠️  远程获取失败，生成100部示例番剧数据...');
    animes = generateAnimeData(100);
  }

  const output = JSON.stringify(animes, null, 2);
  fs.writeFileSync(DATA_FILE, output, 'utf-8');

  console.log(`\n🎉 数据生成完成！`);
  console.log(`📁 输出文件: ${DATA_FILE}`);
  console.log(`📊 番剧数量: ${animes.length}`);

  const statusStats = {};
  STATUS_LIST.forEach(s => statusStats[s] = 0);
  animes.forEach(a => statusStats[a.status] = (statusStats[a.status] || 0) + 1);

  console.log(`\n📋 状态分布:`);
  Object.entries(statusStats).forEach(([k, v]) => {
    console.log(`   ${STATUS_CN[k]}: ${v}部`);
  });

  console.log(`\n✅ 任务完成！`);
}

main().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
