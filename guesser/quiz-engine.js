/**
 * quiz-engine.js — データクイズ自動生成 & 判定エンジン（選択肢画像対応版）
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./data.js'));
    return;
  }
  root.GenshinQuizEngine = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (source) {
  'use strict';

  const getChars = () => source.CHARACTERS || (typeof CHARACTERS !== 'undefined' ? CHARACTERS : []);
  const getWeapons = () => source.WEAPONS || (typeof WEAPONS !== 'undefined' ? WEAPONS : []);

  // 属性キーごとの画像ディレクトリ対応表（files/ 配下）
  const ATTR_ICON_DIRS = {
    element: 'elements',
    country: 'country',
    talentBook: 'talentBook',
    talentBoss: 'materials/boss',
    talentWeekly: 'talent_weekly',
    localSpecialty: 'local_specialty',
    enemyMaterial: 'enemy material',
    weaponBreakMaterial: 'WEAPON_BREAK',
    eliteMaterial: 'weapons Enemy material',
    weaponEnemyMaterial: 'weapons Enemy material',
  };

  function resolveIconUrl(rawUrl, imageBase) {
    if (!rawUrl) return '';
    return imageBase === 'files' ? rawUrl.replace(/^\.\.\//, '') : rawUrl;
  }

  function getAttrIconUrl(attrKey, value, imageBase = '../files') {
    const dir = ATTR_ICON_DIRS[attrKey];
    if (!dir || !value) return '';
    return `${imageBase}/${dir}/${encodeURIComponent(value)}.png`;
  }

  // -------------------------------------------------------------------------
  // ハードモード用：属性値（素材・元素・国など）の読み仮名辞書
  // -------------------------------------------------------------------------
  const ATTR_READINGS = {
    '炎': ['ほのお', '炎元素', 'ほのおげんそ'],
    '水': ['みず', '水元素', 'みずげんそ'],
    '風': ['かぜ', '風元素', 'かぜげんそ'],
    '雷': ['かみなり', '雷元素', 'かみなりげんそ'],
    '草': ['くさ', '草元素', 'くさげんそ'],
    '氷': ['こおり', '氷元素', 'こおりげんそ'],
    '岩': ['いわ', '岩元素', 'いわげんそ'],
    '片手剣': ['かたてけん'],
    '両手剣': ['りょうてけん'],
    '長柄武器': ['ながえぶき', 'やり', '槍'],
    '弓': ['ゆみ'],
    '法器': ['ほうき'],
    'モンド': ['もんど'],
    '璃月': ['りーゆえ', 'りゆえ'],
    '稲妻': ['いなずま'],
    'スメール': ['すめーる'],
    'フォンテーヌ': ['ふぉんてーぬ'],
    'ナタ': ['なた'],
    'ナドクライ': ['などくらい', 'など・くらい'],
    'スネージナヤ': ['すねーじなや'],
    '自由': ['じゆう'], '詩文': ['しぶん'], '抗争': ['こうそう'],
    '繁栄': ['はんえい'], '勤労': ['きんろう'], '黄金': ['おうごん'],
    '浮世': ['うきよ'], '風雅': ['ふうが'], '天光': ['てんこう'],
    '忠言': ['ちゅうげん'], '篤行': ['とくこう'], '創意': ['そうい'],
    '公平': ['こうへい'], '正義': ['せいぎ'], '秩序': ['ちつじょ'],
    '焚燼': ['ふんじん'], '紛争': ['ふんそう'], '角逐': ['かくちく'],
    '流浪': ['るろう'], '楽園': ['らくえん'], '月光': ['げっこう'],
    '堅忍': ['けんにん'], '慈愛': ['じあい'], '栄光': ['えいこう'], '不屈': ['ふくつ'],
    '東風の吐息': ['とうふうのといき'], '東風の爪': ['とうふうのつめ'], '東風の羽根': ['とうふうのはね'],
    '北風のしっぽ': ['きたかぜのしっぽ'], '北風のリング': ['きたかぜのりんぐ'], '北風の魂箱': ['きたかぜのこんばこ', 'きたかぜのたましいばこ'],
    '魔王の刃・残片': ['まおうのやいばざんぺん'], '吞天の鯨・只角': ['どんてんのくじらただつの', 'どんてんのくじら'], '武煉の魂・孤影': ['ぶれんのたましいこえい'],
    '龍王の冠': ['りゅうおうのかんむり'], '血玉の枝': ['けつぎょくのえだ'], '鍍金の鱗': ['ときんのうろこ'],
    '獄炎の蝶': ['ごくえんのちょう'], '溶滅の刻': ['ようめつのとき'], '灰燼の心': ['かいじんのこころ'],
    '万劫の真意': ['ばんごうのしんい'], '凶将の手眼': ['きょうしょうのしゅがん'], '禍神の禊涙': ['かじんのみそぎなみだ'],
    '傀儡の糸': ['くぐつのいと'], '空行の虚鈴': ['くうぎょうのきょれい'], '無心の淵鏡': ['むしんのえんきょう'],
    '原初のオアシスの初咲き': ['げんしょのおあしすのはつざき'], '太古の樹海の一瞬': ['たいこのじゅかいのいっしゅん'], '天地に生える蕨': ['てんちにはえるわらび'],
    '光なき一塊': ['ひかりなきひとかたまり'], '光なき糸': ['ひかりなきいと'], '光なき渦の眼': ['ひかりなきうずのめ'],
    '残火の灯燭': ['ざんかのとうしょく'], '絹織りの羽': ['きぬおりのはね'], '否定と裁決': ['ひていとさいけつ'],
    '昇揚のサンプル「ルーク」': ['しょうようのさんぷるるーく'], '昇揚のサンプル「ナイト」': ['しょうようのさんぷるないと'], '昇揚のサンプル「王族」': ['しょうようのさんぷるおうぞく'],
    '蝕滅の羽鱗': ['しょくめつのうりん'], '蝕滅の陽炎': ['しょくめつのかげろう'], '蝕滅の焔角': ['しょくめつのえんかく'],
    '狂人の誓約': ['きょうじんのせいやく'], '賢医の仮面': ['けんいのかめん'], '異端の薬瓶': ['いたんのくすりびん'],
    '偽りの樹脂': ['いつわりのじゅし'], '歪曲した枯れ枝': ['わいきょくしたかれえだ'], '冒涜の新芽': ['ぼうとくのしんめ'],
    '無相の風': ['むそうのかぜ'], '爆炎樹': ['ばくえんじゅ'], '無相の雷': ['むそうのかみなり'],
    '急凍樹': ['きゅうとうじゅ'], '純水精霊': ['じゅんすいせいれい'], '無相の岩': ['むそうのいわ'],
    '無相の氷': ['むそうのこおり'], '風食ウェネト': ['ふうしょくうぇねと'],
    '秘源機兵・統御デバイス': ['ひげんきへいとうぎょでばいす'], '重量級陸巡艦「バトルシップ」': ['じゅうりょうきゅうりくじゅんかんばとるしっぷ'],
    '集光の月ヤモリ': ['しゅうこうのつきやもり'], '霜夜の空を巡る霊主': ['そうやのそらをめぐるれいしゅ'],
    'エンシェントヴィシャップ・岩': ['えんしぇんとヴぃしゃっぷいわ'], 'アビサルヴィシャップ': ['あびさるヴぃしゃっぷ'],
    '黄金王獣': ['おうごんおうじゅう'], '遺跡サーペント': ['いせきさーぺんと'], '無相の草': ['むそうのくさ'],
    '深罪の浸礼者': ['しんざいのしんれいしゃ'], '山隠れの猊獣': ['やまがくれのげいじゅう'], '鉄甲熔炎帝王': ['てっこうようえんていおう'],
    '秘源機兵・機構デバイス': ['ひげんきへいきこうでばいす'], '昏き魘夢の主': ['くらきえんむのぬし'], '恒常からくり陣形': ['こうじょうからくりじんけい'],
    '無相の水': ['むそうのみず'], '魔偶剣鬼': ['まぐうけんき'], '無相の炎': ['むそうのほのお'], '雷音権現': ['らいおんごんげん'],
    '氷風組曲コッペリア': ['ひょうふうくみきょくこっぺりあ'], '氷風組曲コペリウス': ['ひょうふうくみきょくこぺりうす'],
    '迷える霊覚の修権者': ['まよえるれいかくのしゅうけんしゃ'], 'マッシュラプトル': ['まっしゅらぷとる'], '迅電樹': ['じんでんじゅ'],
    '半永久統制マトリックス': ['はんえいきゅうとうせいまとりっくす'], '兆載永劫ドレイク': ['ちょうさいえいごうどれいく'],
    '実験用フィールド生成装置': ['じっけんようふぃーるどせいせいそうち'], '水形タルパ': ['すいけいたるぱ'], '千年真珠の海駿': ['せんねんしんじゅのかいしゅん'],
    '魔像レガトゥス': ['まぞうれがとぅす'], '深淵なるミミック・パピラ': ['しんえんなるみみっくぱぴら'],
    '暴君・金焔のクク竜': ['ぼうくんきんえんのくくりゅう'], '山の王・貪食のユムカ竜': ['やまのおうどんしょくのゆむかりゅう'],
    '輝ける溶岩の龍像': ['かがやけるようがんのりゅうぞう'], 'ボコボコダック': ['ぼこぼこだっく'], '集光の幻月蝶': ['しゅうこうのげんげつちょう'],
    '守護者・堕天': ['しゅごしゃだてん'], '合成獣・フリューゲルレーヴェ': ['ごうせいじゅうふりゅーげるれーヴぇ'],
    '不滅の副産物': ['ふめつのふくさんぶつ'], '游雪のブレードガーディアン': ['ゆうせつのぶれーどがーでぃあん'], '波濤の投錨者': ['はとうのとうびょうしゃ'],
    '蒲公英の種': ['たんぽぽのたね'], 'セシリアの花': ['せしりあのはな'], '風車アスター': ['ふうしゃあすたー'],
    'イグサ': ['いぐさ'], 'ヴァルベリー': ['ヴぁるべりー'], '慕風のマッシュルーム': ['ぼふうのまっしゅるーむ'],
    'ドドリアン': ['どどりあん'], 'ググプラム': ['ぐぐぷらむ'], 'フェザーモス': ['ふぇざーもす'],
    '夜泊石': ['やはくせき'], '清心': ['せいしん'], '石珀': ['せきはく'], '瑠璃百合': ['るりゆり'],
    '霓裳花': ['げいしょうか'], '絶雲の唐辛子': ['ぜつうんのとうがらし'], '瑠璃袋': ['るりぶくろ'],
    '星螺': ['せいら'], '清水玉': ['せいすいぎょく'], '緋櫻毬': ['ひおうきゅう'], 'ウミレイシ': ['うみれいし'],
    '鳴草': ['なるくさ'], '天雲草の実': ['てんうんそうのみ'], '珊瑚真珠': ['さんごしんじゅ'], '晶化骨髄': ['しょうかこつずい'],
    '血石華': ['けっせきか'], 'オニカブトムシ': ['おにかぶとむし'], 'ユウトウタケ': ['ゆうとうたけ'],
    'サウマラタ蓮': ['さうまたらはす', 'さうまらたはす', 'さうまらたれん'], 'ルッカデヴァータダケ': ['るっかでヴぁーただけ'],
    'カルパラタ蓮': ['かるぱらたはす', 'かるぱらたれん'], '砂脂蛹': ['さしよう'], '悼霊花': ['とうれいか'],
    '赤念の実': ['せきねんのみ'], 'パティサラ': ['ぱてぃさら'], 'サングイト': ['さんぐいと'], '聖金虫': ['せいきんちゅう'],
    'レインボーローズ': ['れいんぼーろーず'], 'ルミドゥースベル': ['るみどぅーすべる'], 'ロマリタイムフラワー': ['ろまりたいむふらわー'],
    'ルエトワール': ['るえとわーる'], '蒼晶螺': ['そうしょうら'], '湖光の鈴蘭': ['ここうのすずらん'],
    '初露の源': ['しょろのみなもと'], '探測ユニット・子機': ['たんそくゆにっとこき'], '琉鱗石': ['りゅうりんせき'],
    '枯れ紫菖': ['かれししょう'], '波しぶきのエラ': ['なみしぶきのえら'], '蛍光ツノキノコ': ['けいこうつのきのこ'],
    'サウリアンサキュレント': ['さうりあんさきゅれんと'], 'ケネパベリー': ['けねぱべりー'], '岩裂の花': ['がんれつのはな'],
    'シャクギク': ['しゃくぎく'], '月落銀': ['げつらくぎん'], '携行型ベアリング': ['けいこうがたべありんぐ'],
    '琥珀香': ['こはくこう'], 'ヴィンテル草': ['ヴぃんてるそう'], 'フロストランプ': ['ふろすとらんぷ'],
    'フロック草': ['ふろっくそう'], 'フロストフラワー': ['ふろすとふらわー'], 'ザラトイアリャーク': ['ざらといありゃーく'],
    '晶石カサキノコ': ['しょうせきかさきのこ'], 'フェイヨモギ': ['ふぇいよもぎ'],
    '破損した仮面': ['はそんしたかめん'], '牢固な矢先': ['ろうこなやさき'], 'スライムの液体': ['すらいむのえきたい'],
    '宝探しの鴉マーク': ['たからさがしのからすまーく'], '新兵の記章': ['しんぺいのきしょう'], '占いの絵巻': ['うらないのえまき'],
    'トリックフラワーの蜜': ['とりっくふらわーのみつ'], '破損した徽章': ['はそんしたきしょう'], '破損した駆動軸': ['はそんしたくどうじく'],
    'キノコンの胞子': ['きのこんのほうし'], '古びた鍔': ['ふるびたつば'], 'フライムの乾核': ['ふらいむのかんかく'],
    '色褪せた赤い絹': ['いろあせたあかいきぬ'], '整合の歯車': ['せいごうのはぐるま'], '異海の露': ['いかいのつゆ'],
    '従戦士の木笛': ['じゅうせんしのきぶえ'], '未熟な牙': ['みじゅくなきば'], '異種合成魔獣': ['いしゅごうせいまじゅう'],
    '幻造蛍屑': ['げんぞうけいせつ'], '幻光の屑': ['げんこうのくず'], '合成獣のコア': ['ごうせいじゅうのこあ'],
    '今昔劇画の鬼人': ['こんじゃくげきがのきじん'], '凛風奔狼の郷愁': ['りんぷうほんろうのきょうしゅう'],
    '孤雲寒林の神体': ['こうんかんりんのしんたい'], '漆黒の隕鉄の塊': ['しっこくのいんてつのかたまり'],
    '獅牙戦士の理想': ['しさせんしのりそう'], '遠海夷地の金枝': ['えんかいいちのきんし'],
    '霧海雲間の転還': ['むかいうんかんのてんかん'], '高塔の王の砕けた夢': ['こうとうのおうのくだけたゆめ'],
    '鳴神御霊の勇武': ['なるかみみたまのゆうぶ'], '烈日権威の往日': ['れつじつけんいのおうじつ'],
    '静謐な森のしずくの金符': ['せいひつなもりのしずくのきんぷ'], 'オアシスガーデンの真諦': ['おあしすがーでんのしんてい'],
    '無垢な海の金盃': ['むくなうみのきんぱい'], '悠久の弦の響き': ['ゆうきゅうのげんのひびき'],
    '純聖な雫の精髄': ['じゅんせいなしずくのせいずい'], '灼心を捧げる栄光': ['しゃくしんをささげるえいこう'],
    '狂乱の聖主の神面': ['きょうらんのせいしゅのしんめん'], '神秘なる煙の啓示': ['しんぴなるけむりのけいじ'],
    '奇妙な装置の宿願': ['きみょうなそうちのしゅくがん'], '長夜の灯火の輝光': ['ちょうやのとうかのきこう'],
    '極北の末裔の煌光': ['きょくほくのまつえいのこうこう'], '蔵に眠る霊薬の狂宴': ['くらにねむるれいやくのきょうえん'],
    '蒼星軍勢の征服': ['そうせいぐんぜいのせいふく'], '氷の皇帝の訣別': ['こおりのこうていのけつべつ'],
    '地脈の旧枝': ['ちみゃくのきゅうし'], '重い角笛': ['おもいつのぶえ'], '猟兵の刀': ['りょうへいのかたな'],
    '霧虚ろの花粉': ['きりうつろのかふん'], '混沌の装置': ['こんとんのそうち'], '混沌の機関': ['こんとんのきかん'],
    '暗晦の彫刻': ['あんかいのちょうこく'], '壊れたプリズム': ['こわれたぷりずむ'], '毀れた背骨': ['こわれたせぼね'],
    '濁水のひとしずく': ['だくすいのひとしずく'], '古びた従者の懐中時計': ['ふるびたじゅうしゃのかいちゅうどけい'],
    '秘源のベアリング': ['ひげんのべありんぐ'], '折光の胚芽': ['せっこうのはいが'], '霜夜の残光': ['そうやのざんこう'],
    '暗き霧の欠片': ['くらききりのかけら'], '生命の虚ろな根': ['せいめいのうつろなね'], '隠獣の指爪': ['いんじゅうのしそう'],
    '隙間のコア': ['すきまのこあ'], '燃え盛る石': ['もえさかるいし'], '暗黒の裂眼': ['あんこくのれつがん'],
    '脆い骨片': ['もろいこっぺん'], '混沌ストレージ': ['こんとんすとれーじ'], '砕けた剣の柄': ['くだけたけんのつか'],
    '冷えた鱗甲の欠片': ['ひえたりんこうのかけら'], '失光の骨片': ['しっこうのこっぺん'], '暗色のプリズム': ['あんしょくのぷりずむ'],
    'キノコンの衰菌核': ['きのこんのすいきんかく'], '翼状の羽鰭': ['よくじょうのはねびれ'], '光を失った焔剣の柄': ['ひかりをうしなったえんけんのつか'],
    '何処かで摘まれた咲きかけの花': ['どこかでつまれたさきかけのはな'], '砕けた意志の欠片': ['くだけたいしのかけら'],
    '沈積増生物': ['ちんせきぞうせいぶつ'], '欠損した月の鉄': ['けっそんしたつきのてつ'], '氷雪の欠片': ['ひょうせつのかけら'],
    '会心率': ['かいしんりつ'], '会心ダメージ': ['かいしんだめーじ'], '攻撃力': ['こうげきりょく'],
    'HP': ['hp', 'えいちぴー'], '防御力': ['ぼうぎょりょく'], '元素熟知': ['げんそじゅくち'],
    '元素チャージ効率': ['げんそちゃーじこうりつ', 'ちゃーじこうりつ'], '与える治療効果': ['あたえるちりょうこうか', 'ちりょうこうか'],
    '炎元素ダメージ': ['ほのおげんそだめーじ'], '水元素ダメージ': ['みずげんそだめーじ'], '風元素ダメージ': ['かぜげんそだめーじ'],
    '雷元素ダメージ': ['かみなりげんそだめーじ'], '草元素ダメージ': ['くさげんそだめーじ'], '氷元素ダメージ': ['こおりげんそだめーじ'],
    '岩元素ダメージ': ['いわげんそだめーじ'], '物理ダメージ': ['ぶつりだめーじ'],
  };

  function katakanaToHiragana(src) {
    return String(src || '').replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
  }

  function normalizeText(src) {
    return String(src || '')
      .trim()
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .replace(/[\s　・･「」『』]/g, '')
      .toLowerCase();
  }

  function seededRandom(seedStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6D2B79F5;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickRandom(arr, rng = Math.random) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffle(arr, rng = Math.random) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function isValidAttrValue(val) {
    return val !== null && val !== undefined && val !== '' && val !== 'なし' && val !== 'その他' && val !== '例外';
  }

  const CHAR_CONDITION_ATTRS = [
    { key: 'element', label: '元素', format: v => `${v}元素`, iconDir: 'elements' },
    { key: 'weapon', label: '武器種', format: v => `武器種が「${v}」` },
    { key: 'country', label: '所属国', format: v => `所属が「${v}」`, iconDir: 'country' },
    { key: 'rarity', label: 'レアリティ', format: v => `★${v}` },
    { key: 'bodyLabel', label: '体型', format: v => `体型が「${v}」` },
    { key: 'energy', label: '元素爆発エネルギー', format: v => `必要エネルギーが「${v}」` },
    { key: 'talentBook', label: '天賦本', format: v => `天賦本が「${v}」`, iconDir: 'talentBook' },
    { key: 'talentBoss', label: '突破ボス素材', format: v => `突破ボス素材が「${v}」`, iconDir: 'materials/boss' },
    { key: 'talentWeekly', label: '週ボス素材', format: v => `週ボス素材が「${v}」`, iconDir: 'talent_weekly' },
    { key: 'localSpecialty', label: '特産品', format: v => `特産品が「${v}」`, iconDir: 'local_specialty' },
    { key: 'enemyMaterial', label: '敵素材', format: v => `敵素材が「${v}」`, iconDir: 'enemy material' },
    { key: 'ascensionStat', label: '突破ステータス', format: v => `突破ステータスが「${v}」` },
    { key: 'birthMonth', label: '誕生月', format: v => `誕生月が「${v}」` },
  ];

  const WEAPON_CONDITION_ATTRS = [
    { key: 'weaponType', label: '武器種', format: v => `武器種が「${v}」` },
    { key: 'rarity', label: 'レアリティ', format: v => `★${v}` },
    { key: 'baseAtk', label: '最大基礎攻撃力', format: v => `基礎攻撃力が「${v}」` },
    { key: 'ascensionStat', label: '突破ステータス', format: v => `突破ステータスが「${v}」` },
    { key: 'weaponBreakMaterial', label: '武器突破素材', format: v => `武器突破素材が「${v}」`, iconDir: 'WEAPON_BREAK' },
    { key: 'eliteMaterial', label: '精鋭敵素材', format: v => `精鋭敵素材が「${v}」`, iconDir: 'weapons Enemy material' },
    { key: 'enemyMaterial', label: '一般敵素材', format: v => `一般敵素材が「${v}」`, iconDir: 'enemy material' },
  ];

  const CHAR_DERIVED_TEMPLATES = [
    { key: 'talentBook', ask: '天賦本（シリーズ名）', iconDir: 'talentBook' },
    { key: 'talentBoss', ask: '突破ボス素材', iconDir: 'materials/boss' },
    { key: 'talentWeekly', ask: '週ボス素材', iconDir: 'talent_weekly' },
    { key: 'localSpecialty', ask: '特産品', iconDir: 'local_specialty' },
    { key: 'enemyMaterial', ask: '敵素材', iconDir: 'enemy material' },
    { key: 'ascensionStat', ask: '突破ステータス' },
    { key: 'element', ask: '元素', iconDir: 'elements' },
    { key: 'weapon', ask: '武器種' },
    { key: 'country', ask: '国（所属）', iconDir: 'country' },
  ];

  const WEAPON_DERIVED_TEMPLATES = [
    { key: 'weaponBreakMaterial', ask: '武器突破素材', iconDir: 'WEAPON_BREAK' },
    { key: 'eliteMaterial', ask: '精鋭敵素材', iconDir: 'weapons Enemy material' },
    { key: 'enemyMaterial', ask: '一般敵素材', iconDir: 'enemy material' },
    { key: 'ascensionStat', ask: '突破ステータス' },
    { key: 'weaponType', ask: '武器種' },
  ];

  function generateUniqueFilterQuestion(entityType, rng = Math.random, imageBase = '../files') {
    const pool = entityType === 'weapon'
      ? getWeapons().filter(w => w.rarity >= 3)
      : getChars();
    const attrs = entityType === 'weapon' ? WEAPON_CONDITION_ATTRS : CHAR_CONDITION_ATTRS;
    const entityLabel = entityType === 'weapon' ? '武器' : 'キャラクター';

    for (let attempt = 0; attempt < 100; attempt++) {
      const target = pickRandom(pool, rng);
      const validAttrs = attrs.filter(a => isValidAttrValue(target[a.key]));
      if (validAttrs.length < 2) continue;

      const shuffledAttrs = shuffle(validAttrs, rng);
      let chosen = [shuffledAttrs[0], shuffledAttrs[1]];
      let matches = pool.filter(item =>
        chosen.every(a => String(item[a.key]) === String(target[a.key]))
      );

      if (matches.length !== 1 && shuffledAttrs.length >= 3) {
        chosen = [shuffledAttrs[0], shuffledAttrs[1], shuffledAttrs[2]];
        matches = pool.filter(item =>
          chosen.every(a => String(item[a.key]) === String(target[a.key]))
        );
      }

      if (matches.length !== 1) continue;

      const nearMisses = shuffle(
        pool.filter(item => item.id !== target.id && String(item[chosen[0].key]) === String(target[chosen[0].key])),
        rng
      );
      const others = shuffle(
        pool.filter(item => item.id !== target.id && String(item[chosen[0].key]) !== String(target[chosen[0].key])),
        rng
      );
      const dummyItems = [...nearMisses, ...others].slice(0, 3);
      if (dummyItems.length < 3) continue;

      const condText = chosen.map(a => a.format(target[a.key])).join('、かつ ');
      const hintIcons = chosen
        .filter(a => a.iconDir)
        .map(a => ({
          label: `${a.label}: ${target[a.key]}`,
          url: `${imageBase}/${a.iconDir}/${encodeURIComponent(target[a.key])}.png`,
        }));

      const choiceDetails = shuffle([target, ...dummyItems], rng).map(item => ({
        label: item.name,
        iconUrl: resolveIconUrl(item.iconUrl, imageBase),
      }));

      return {
        kind: 'data',
        subType: 'filter',
        entityType,
        answerType: 'entity',
        question: `${condText} の${entityLabel}はどれ？`,
        answer: target.name,
        answerItem: target,
        dummyChoices: dummyItems.map(d => d.name),
        choices: choiceDetails.map(c => c.label),
        choiceDetails,
        hintIcons,
        explanation: `正解は「${target.name}」です（${chosen.map(a => `${a.label}:${target[a.key]}`).join(' / ')}）。`,
      };
    }
    return null;
  }

  function generateDerivedQuestion(entityType, rng = Math.random, imageBase = '../files') {
    const pool = entityType === 'weapon'
      ? getWeapons().filter(w => w.rarity >= 3)
      : getChars();
    const templates = entityType === 'weapon' ? WEAPON_DERIVED_TEMPLATES : CHAR_DERIVED_TEMPLATES;

    for (let attempt = 0; attempt < 80; attempt++) {
      const target = pickRandom(pool, rng);
      const tpl = pickRandom(templates, rng);
      const ansVal = target[tpl.key];
      if (!isValidAttrValue(ansVal)) continue;

      const allValues = [...new Set(pool.map(x => x[tpl.key]).filter(isValidAttrValue))];
      const wrongValues = shuffle(allValues.filter(v => v !== ansVal), rng).slice(0, 3);
      if (wrongValues.length < 3) continue;

      const iconPath = resolveIconUrl(target.iconUrl, imageBase);
      const choiceDetails = shuffle([String(ansVal), ...wrongValues.map(String)], rng).map(val => ({
        label: val,
        iconUrl: getAttrIconUrl(tpl.key, val, imageBase),
      }));

      return {
        kind: 'data',
        subType: 'derived',
        entityType,
        answerType: 'attribute',
        attrKey: tpl.key,
        attrPool: allValues.map(v => ({
          name: String(v),
          readings: ATTR_READINGS[v] || [],
          iconUrl: getAttrIconUrl(tpl.key, v, imageBase),
        })),
        question: `「${target.name}」の ${tpl.ask} はどれ？`,
        answer: String(ansVal),
        acceptAnswers: ATTR_READINGS[ansVal] || [],
        dummyChoices: wrongValues.map(String),
        choices: choiceDetails.map(c => c.label),
        choiceDetails,
        hintIcons: iconPath ? [{ label: target.name, url: iconPath }] : [],
        explanation: `${target.name} の${tpl.ask}は「${ansVal}」です。`,
      };
    }
    return null;
  }

  function generateDataQuestion(genreMode = 'mix', rng = Math.random, imageBase = '../files') {
    let entityType = genreMode;
    if (genreMode !== 'character' && genreMode !== 'weapon') {
      entityType = rng() < 0.6 ? 'character' : 'weapon';
    }
    const q = rng() < 0.6
      ? generateUniqueFilterQuestion(entityType, rng, imageBase)
      : generateDerivedQuestion(entityType, rng, imageBase);

    return q || generateUniqueFilterQuestion(entityType, rng, imageBase) || generateDerivedQuestion(entityType, rng, imageBase);
  }

  function getDailyQuizQuestion(dateStr, imageBase = 'files') {
    const rng = seededRandom('daily-home-quiz-' + dateStr);
    return generateDataQuestion('mix', rng, imageBase);
  }

  function checkQuizAnswer(questionObj, userInput, difficulty) {
    const raw = String(userInput || '').trim();
    if (!raw) return false;

    if (difficulty === 'easy' || difficulty === 'normal') {
      return raw === questionObj.answer;
    }

    if (questionObj.kind === 'data' && questionObj.answerType === 'entity') {
      return normalizeText(raw) === normalizeText(questionObj.answer);
    }

    const normInput = katakanaToHiragana(normalizeText(raw));
    const candidates = [questionObj.answer, ...(questionObj.acceptAnswers || [])];
    return candidates.some(c => katakanaToHiragana(normalizeText(c)) === normInput);
  }

  function searchQuizSuggestions(questionObj, query) {
    const qHira = katakanaToHiragana(String(query || '').trim().toLowerCase());
    if (!qHira) return [];

    if (questionObj.kind === 'data' && questionObj.answerType === 'entity') {
      const pool = questionObj.entityType === 'weapon' ? getWeapons() : getChars();
      const matched = [];
      for (const item of pool) {
        const names = item.displayNames && item.displayNames.length ? item.displayNames : [item.name];
        let hitName = null;
        let priority = 99;
        for (const n of names) {
          const h = katakanaToHiragana(n.toLowerCase());
          if (h === qHira) { hitName = n; priority = 1; break; }
          if (h.startsWith(qHira) && priority > 2) { hitName = n; priority = 2; }
          if (h.includes(qHira) && priority > 3) { hitName = n; priority = 3; }
        }
        if (hitName) {
          matched.push({ name: item.name, sub: hitName !== item.name ? hitName : '', iconUrl: item.iconUrl, priority });
        }
      }
      matched.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'ja'));
      return matched.slice(0, 8);
    }

    if (questionObj.kind === 'data' && questionObj.answerType === 'attribute') {
      const pool = questionObj.attrPool || [];
      return pool
        .filter(entry => {
          const all = [entry.name, ...(entry.readings || [])];
          return all.some(n => katakanaToHiragana(n.toLowerCase()).includes(qHira));
        })
        .map(entry => ({ name: entry.name, sub: '', iconUrl: entry.iconUrl || '' }))
        .slice(0, 8);
    }

    if (questionObj.kind === 'variety') {
      const pool = questionObj.varietyAnswerPool || [];
      return pool
        .filter(entry => {
          const all = [entry.answer, ...(entry.acceptAnswers || [])];
          return all.some(n => katakanaToHiragana(String(n).toLowerCase()).includes(qHira));
        })
        .map(entry => ({ name: entry.answer, sub: '', iconUrl: '' }))
        .slice(0, 8);
    }

    return [];
  }

  return {
    generateDataQuestion,
    getDailyQuizQuestion,
    checkQuizAnswer,
    searchQuizSuggestions,
    ATTR_READINGS,
  };
});
