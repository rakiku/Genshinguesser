/**
 * data.js — Genshin Guesser データ管理
 * 生データ配列と正規化レイヤーを提供する。
 * キャラクターデータは既存の script.js から抽出・加工。
 */

// ---------------------------------------------------------------------------
// 画像ベースURL（相対パスで親ディレクトリの files/ フォルダを参照）
// ---------------------------------------------------------------------------
const IMAGE_BASE = '../files';

// ---------------------------------------------------------------------------
// グループ定義 — 黄色（惜しい）判定に使用
// ---------------------------------------------------------------------------

/** 天賦本グループ（秘境ごと） */
const TALENT_BOOK_GROUPS = {
  '自由': 'mondstadt', '詩文': 'mondstadt', '抗争': 'mondstadt',
  '繁栄': 'liyue',     '勤労': 'liyue',     '黄金': 'liyue',
  '浮世': 'inazuma',   '風雅': 'inazuma',   '天光': 'inazuma',
  '忠言': 'sumeru',    '篤行': 'sumeru',    '創意': 'sumeru',
  '公平': 'fontaine',  '正義': 'fontaine',  '秩序': 'fontaine',
  '焚燼': 'natlan',    '紛争': 'natlan',    '角逐': 'natlan',
  '流浪': 'khaenriah', '楽園': 'khaenriah', '月光': 'khaenriah',
};

/** 週ボス素材グループ（同一週ボスからのドロップ） */
const WEEKLY_BOSS_GROUPS = {
  '東風の吐息': 'Stormterror', '東風の爪': 'Stormterror', '東風の羽根': 'Stormterror',
  '北風のしっぽ': 'Boreas', '北風のリング': 'Boreas', '北風の魂箱': 'Boreas',
  '魔王の刃・残片': 'childe','吞天の鯨・只角': 'Childe', '武煉の魂・孤影': 'Childe',
  '龍王の冠': 'azhdaha','血玉の枝': 'Azhdaha','鍍金の鱗': 'Azhdaha',
  '獄炎の蝶': 'La Signora', '溶滅の刻': 'La Signora','灰燼の心': 'La Signora',
  '万劫の真意': 'raiden', '凶将の手眼': 'raiden','禍神の禊涙': 'raiden',  
  '傀儡の糸': 'Shouki no Kami', '空行の虚鈴': 'Shouki no Kami', '無心の淵鏡': 'Shouki no Kami',
  '原初のオアシスの初咲き': 'Apep', '太古の樹海の一瞬': 'Apep', '天地に映える蕨': 'Apep',
  '光なき一塊': 'All-Devouring Narwhal', '光なき糸': 'All-Devouring Narwhal', '光なき渦の眼': 'All-Devouring Narwhal',
  '残火の灯燭': 'The Knave', '絹織りの羽': 'The Knave', '否定と裁決': 'The Knave',
  '昇揚のサンプル「ルーク」': 'The Game Before the Gate', '昇揚のサンプル「ナイト」': 'The Game Before the Gate', '昇揚のサンプル「王族」': 'The Game Before the Gate',
  '蝕滅の羽鱗': 'Lord of Eroded Primal Fire', '蝕滅の陽炎': 'Lord of Eroded Primal Fire', '蝕滅の焔角': 'Lord of Eroded Primal Fire',
  '狂人の誓約': 'The Doctor', '賢医の仮面': 'The Doctor', '異端の薬瓶': 'The Doctor',
  '偽りの樹脂': 'Il Dottore', '歪曲した枯れ枝': 'Il Dottore', '冒涜の新芽': 'Il Dottore',
};

/** 特産品グループ（同じ国の特産品）— 国名をキー */
const LOCAL_SPECIALTY_GROUPS = {
  // モンド
  '蒲公英の種': 'mondstadt', 'セシリアの花': 'mondstadt', '風車アスター': 'mondstadt',
  'イグサ': 'mondstadt', 'ヴァルベリー': 'mondstadt', '慕風のマッシュルーム': 'mondstadt',
  'ドドリアン': 'mondstadt', 'ググプラム': 'mondstadt', 'フロストランプ': 'mondstadt',
  'フェザーモス': 'mondstadt', 
  // 璃月
  '夜泊石': 'liyue', '清心': 'liyue', '石珀': 'liyue', '瑠璃百合': 'liyue',
  '霓裳花': 'liyue', '絶雲の唐辛子': 'liyue', '瑠璃袋': 'liyue',
  '星螺': 'liyue', '清水玉': 'liyue',
  // 稲妻
  '緋櫻毬': 'inazuma', 'ウミレイシ': 'inazuma', '鳴草': 'inazuma',
  '天雲草の実': 'inazuma', '珊瑚真珠': 'inazuma', '晶化骨髄': 'inazuma',
  '血石華': 'inazuma', 'オニカブトムシ': 'inazuma', 'ユウトウタケ': 'inazuma',
  // スメール
  'サウマラタ蓮': 'sumeru', 'ルッカデヴァータダケ': 'sumeru', 'カルパラタ蓮': 'sumeru',
  '砂脂蛹': 'sumeru', '悼霊花': 'sumeru', '赤念の実': 'sumeru',
  'パティサラ': 'sumeru', 'サングイト': 'sumeru', '聖金虫': 'sumeru',
  // フォンテーヌ
  'レインボーローズ': 'fontaine', 'ルミドゥースベル': 'fontaine', 'ロマリタイムフラワー': 'fontaine',
  'ルエトワール': 'fontaine', '蒼晶螺': 'fontaine', '湖光の鈴蘭': 'fontaine',
  '初露の源': 'fontaine', '探測ユニット・子機': 'fontaine',
  // ナタ
  '琉鱗石': 'natlan', '枯れ紫菖': 'natlan', '波しぶきのエラ': 'natlan',
  '蛍光ツノキノコ': 'natlan', 'サウリアンサキュレント': 'natlan', 'ケネパベリー': 'natlan',
  '岩裂の花': 'natlan', 'シャクギク': 'natlan',
  // ナドクライ
  '月落銀': 'khaenriah', '携行型ベアリング': 'khaenriah', '琥珀香': 'khaenriah','ヴィンテル草': 'khaenriah',
};

/** 突破ステータスグループ（同系統） */
const ASCENSION_STAT_GROUPS = {
  '会心率': 'crit', '会心ダメージ': 'crit',
  '攻撃力': 'atk', 
  '物理ダメージ': 'physical_damage',
  'HP': 'hp',
  '防御力': 'def',
  '元素熟知': 'em',
  '元素チャージ効率': 'er',
  '与える治療効果': 'heal',
  '炎元素ダメージ': 'pyro_dmg',
  '水元素ダメージ': 'hydro_dmg',
  '風元素ダメージ': 'anemo_dmg',
  '雷元素ダメージ': 'electro_dmg',
  '草元素ダメージ': 'dendro_dmg',
  '氷元素ダメージ': 'cryo_dmg',
  '岩元素ダメージ': 'geo_dmg',
};

// ---------------------------------------------------------------------------
// 生データ（script.js の characters 配列を参照してここにコピー）
// ---------------------------------------------------------------------------
const RAW_CHARACTERS = [
  { name: "ジン", country: "モンド", weapon: "片手剣", element: "風", birth_month: "３月", birthday: "3月14日", rarity: ['☆５', '恒常☆５'], body: "長身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の風", local_specialty: "蒲公英の種", ascension_stat: "与える治療効果", distributed: false, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "継続回復系", trace: true, costume: true, enemy_material: ["破損した仮面"], training_road: true, release_version: "1.0" },
  { name: "アンバー", country: "モンド", weapon: "弓", element: "炎", birth_month: "８月", birthday: "8月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 40, talent_boss: "爆炎樹", local_specialty: "イグサ", ascension_stat: "攻撃力", distributed: true, talent_book: "自由", talent_weekly: "東風の吐息", special_dish: "復活系", trace: false, costume: true, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.0" },
  { name: "リサ", country: "モンド", weapon: "法器", element: "雷", birth_month: "６月", birthday: "6月9日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 80, talent_boss: "無相の雷", local_specialty: "ヴァルベリー", ascension_stat: "元素熟知", distributed: true, talent_book: "詩文", talent_weekly: "東風の爪", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0" },
  { name: "ガイア", country: "モンド", weapon: "片手剣", element: "氷", birth_month: "１１月", birthday: "11月30日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "ドドリアン", ascension_stat: "元素チャージ効率", distributed: true, talent_book: "詩文", talent_weekly: "北風の魂箱", special_dish: "回復系", trace: false, costume: true, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0" },
  { name: "バーバラ", country: "モンド", weapon: "法器", element: "水", birth_month: "７月", birthday: "7月5日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "純水精霊", local_specialty: "慕風のマッシュルーム", ascension_stat: "HP", distributed: true, talent_book: "自由", talent_weekly: "北風のリング", special_dish: "スタミナ軽減系", trace: false, costume: true, enemy_material: ["占いの絵巻"], training_road: false, release_version: "1.0" },
  { name: "ディルック", country: "モンド", weapon: "両手剣", element: "炎", birth_month: "４月", birthday: "4月30日", rarity: ['☆５', '恒常☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "爆炎樹", local_specialty: "イグサ", ascension_stat: "会心率", distributed: false, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "攻撃系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: true, release_version: "1.0" },
  { name: "レザー", country: "モンド", weapon: "両手剣", element: "雷", birth_month: "９月", birthday: "9月9日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の雷", local_specialty: "ググプラム", ascension_stat: "物理ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "東風の爪", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0" },
  { name: "ウェンティ", country: "モンド", weapon: "弓", element: "風", birth_month: "６月", birthday: "6月16日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 60, talent_boss: "無相の風", local_specialty: "セシリアの花", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "詩文", talent_weekly: "北風のしっぽ", special_dish: "スタミナ軽減系", trace: true, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0" },
  { name: "クレー", country: "モンド", weapon: "法器", element: "炎", birth_month: "７月", birthday: "7月27日", rarity: ['☆５'], body: "ロリ", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "慕風のマッシュルーム", ascension_stat: "炎元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "北風のリング", special_dish: "防御系", trace: true, costume: true, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.0" },
  { name: "ベネット", country: "モンド", weapon: "片手剣", element: "炎", birth_month: "２月", birthday: "2月29日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "風車アスター", ascension_stat: "元素チャージ効率", distributed: true, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "復活系", trace: false, costume: true, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0" },
  { name: "ノエル", country: "モンド", weapon: "両手剣", element: "岩", birth_month: "３月", birthday: "3月21日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "無相の岩", local_specialty: "ヴァルベリー", ascension_stat: "防御力", distributed: false, talent_book: "抗争", talent_weekly: "東風の爪", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0" },
  { name: "フィッシュル", country: "モンド", weapon: "弓", element: "雷", birth_month: "５月", birthday: "5月27日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "無相の雷", local_specialty: "イグサ", ascension_stat: "攻撃力", distributed: true, talent_book: "詩文", talent_weekly: "北風の魂箱", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.0" },
  { name: "スクロース", country: "モンド", weapon: "法器", element: "風", birth_month: "１１月", birthday: "11月26日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "無相の風", local_specialty: "風車アスター", ascension_stat: "風元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "北風の魂箱", special_dish: "復活系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "1.0" },
  { name: "モナ", country: "モンド", weapon: "法器", element: "水", birth_month: "８月", birthday: "8月31日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "純水精霊", local_specialty: "慕風のマッシュルーム", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "抗争", talent_weekly: "北風のリング", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.0" },
  { name: "ディオナ", country: "モンド", weapon: "弓", element: "氷", birth_month: "１月", birthday: "1月18日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "急凍樹", local_specialty: "ドドリアン", ascension_stat: "氷元素ダメージ", distributed: true, talent_book: "自由", talent_weekly: "魔王の刃・残片", special_dish: "復活系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.1" },
  { name: "アルベド", country: "モンド", weapon: "片手剣", element: "岩", birth_month: "９月", birthday: "9月13日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドアタッカー"], energy: 40, talent_boss: "無相の岩", local_specialty: "セシリアの花", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "詩文", talent_weekly: "吞天の鯨・只角", special_dish: "シールド系", trace: true, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.2" },
  { name: "ロサリア", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "１月", birthday: "1月24日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "ヴァルベリー", ascension_stat: "攻撃力", distributed: false, talent_book: "詩文", talent_weekly: "武煉の魂・孤影", special_dish: "回復系", trace: false, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "1.4" },
  { name: "エウルア", country: "モンド", weapon: "両手剣", element: "氷", birth_month: "１０月", birthday: "10月25日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の氷", local_specialty: "蒲公英の種", ascension_stat: "会心ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "龍王の冠", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: true, release_version: "1.5" },
  { name: "ミカ", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "８月", birthday: "8月11日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "風食ウェネト", local_specialty: "ググプラム", ascension_stat: "HP", distributed: false, talent_book: "詩文", talent_weekly: "無心の淵鏡", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: false, release_version: "3.5" },
  { name: "ダリア", country: "モンド", weapon: "片手剣", element: "水", birth_month: "５月", birthday: "5月25日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 80, talent_boss: "秘源機兵・統御デバイス", local_specialty: "ドドリアン", ascension_stat: "HP", distributed: false, talent_book: "詩文", talent_weekly: "蝕滅の羽鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "5.7" },
  { name: "ドゥリン", country: "モンド", weapon: "片手剣", element: "炎", birth_month: "３月", birthday: "3月14日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドアタッカー"], energy: 70, talent_boss: "重量級陸巡艦「バトルシップ」", local_specialty: "フロストランプ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "詩文", talent_weekly: "蝕滅の陽炎", special_dish: "回復系", trace: false, costume: true, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna III (6.2)" },
  { name: "ファルカ", country: "モンド", weapon: "両手剣", element: "風", birth_month: "２月", birthday: "2月17日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "集光の月ヤモリ", local_specialty: "ググプラム", ascension_stat: "会心ダメージ", distributed: false, talent_book: "自由", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna V (6.4)" },
  { name: "ローエン", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "４月", birthday: "4月3日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "集光の月ヤモリ", local_specialty: "フェザーモス", ascension_stat: "会心ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "復活系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "Luna VII (6.6)" },
  { name: "プルーネ", country: "モンド", weapon: "法器", element: "風", birth_month: "１１月", birthday: "11月20日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター"], energy: 70, talent_boss: "霜夜の空を巡る霊主", local_specialty: "ヴィンテル草", ascension_stat: "攻撃力", distributed: false, talent_book: "抗争", talent_weekly: "賢医の仮面", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "Luna VII (6.6)" },
  { name: "魈", country: "璃月", weapon: "長柄武器", element: "風", birth_month: "４月", birthday: "4月17日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "清心", ascension_stat: "会心率", distributed: false, talent_book: "繁栄", talent_weekly: "武煉の魂・孤影", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: true, release_version: "1.3" },
  { name: "北斗", country: "璃月", weapon: "両手剣", element: "雷", birth_month: "２月", birthday: "2月14日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の雷", local_specialty: "夜泊石", ascension_stat: "雷元素ダメージ", distributed: true, talent_book: "黄金", talent_weekly: "東風の吐息", special_dish: "復活系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0" },
  { name: "凝光", country: "璃月", weapon: "法器", element: "岩", birth_month: "８月", birthday: "8月26日", rarity: ['☆４'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の岩", local_specialty: "瑠璃百合", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "繁栄", talent_weekly: "北風の魂箱", special_dish: "復活系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "1.0" },
  { name: "香菱", country: "璃月", weapon: "長柄武器", element: "炎", birth_month: "１１月", birthday: "11月2日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 80, talent_boss: "爆炎樹", local_specialty: "絶雲の唐辛子", ascension_stat: "元素熟知", distributed: true, talent_book: "勤労", talent_weekly: "東風の爪", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0" },
  { name: "行秋", country: "璃月", weapon: "片手剣", element: "水", birth_month: "１０月", birthday: "10月9日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 80, talent_boss: "純水精霊", local_specialty: "霓裳花", ascension_stat: "攻撃力", distributed: true, talent_book: "黄金", talent_weekly: "北風のしっぽ", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0" },
  { name: "重雲", country: "璃月", weapon: "両手剣", element: "氷", birth_month: "９月", birthday: "9月7日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 40, talent_boss: "急凍樹", local_specialty: "石珀", ascension_stat: "攻撃力", distributed: false, talent_book: "勤労", talent_weekly: "東風の吐息", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0" },
  { name: "七七", country: "璃月", weapon: "片手剣", element: "氷", birth_month: "３月", birthday: "3月3日", rarity: ['☆５', '恒常☆５'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "急凍樹", local_specialty: "瑠璃袋", ascension_stat: "与える治療効果", distributed: false, talent_book: "繁栄", talent_weekly: "北風のしっぽ", special_dish: "攻撃系", trace: true, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.0" },
  { name: "刻晴", country: "璃月", weapon: "片手剣", element: "雷", birth_month: "１１月", birthday: "11月20日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の雷", local_specialty: "石珀", ascension_stat: "会心ダメージ", distributed: false, talent_book: "繁栄", talent_weekly: "北風のリング", special_dish: "回復系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.0" },
  { name: "鍾離", country: "璃月", weapon: "長柄武器", element: "岩", birth_month: "１２月", birthday: "12月31日", rarity: ['☆５'], body: "長身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 40, talent_boss: "無相の岩", local_specialty: "石珀", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "吞天の鯨・只角", special_dish: "継続回復系", trace: true, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.1" },
  { name: "辛炎", country: "璃月", weapon: "両手剣", element: "炎", birth_month: "１０月", birthday: "10月16日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "瑠璃袋", ascension_stat: "攻撃力", distributed: true, talent_book: "黄金", talent_weekly: "吞天の鯨・只角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.1" },
  { name: "甘雨", country: "璃月", weapon: "弓", element: "氷", birth_month: "１２月", birthday: "12月2日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "清心", ascension_stat: "会心ダメージ", distributed: false, talent_book: "勤労", talent_weekly: "武煉の魂・孤影", special_dish: "回復系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.2" },
  { name: "胡桃", country: "璃月", weapon: "長柄武器", element: "炎", birth_month: "７月", birthday: "7月15日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "霓裳花", ascension_stat: "会心ダメージ", distributed: false, talent_book: "勤労", talent_weekly: "魔王の刃・残片", special_dish: "復活系", trace: false, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.3" },
  { name: "煙緋", country: "璃月", weapon: "法器", element: "炎", birth_month: "７月", birthday: "7月28日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "夜泊石", ascension_stat: "炎元素ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "血玉の枝", special_dish: "復活系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.5" },
  { name: "申鶴", country: "璃月", weapon: "長柄武器", element: "氷", birth_month: "３月", birthday: "3月10日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "アビサルヴィシャップ", local_specialty: "清心", ascension_stat: "攻撃力", distributed: false, talent_book: "繁栄", talent_weekly: "獄炎の蝶", special_dish: "攻撃系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "2.4" },
  { name: "雲菫", country: "璃月", weapon: "長柄武器", element: "岩", birth_month: "５月", birthday: "5月21日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "黄金王獣", local_specialty: "瑠璃百合", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "勤労", talent_weekly: "灰燼の心", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "2.4" },
  { name: "夜蘭", country: "璃月", weapon: "弓", element: "水", birth_month: "４月", birthday: "4月20日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "遺跡サーペント", local_specialty: "星螺", ascension_stat: "会心率", distributed: false, talent_book: "繁栄", talent_weekly: "鍍金の鱗", special_dish: "シールド系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "2.7" },
  { name: "ヨォーヨ", country: "璃月", weapon: "長柄武器", element: "草", birth_month: "３月", birthday: "3月6日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の草", local_specialty: "絶雲の唐辛子", ascension_stat: "HP", distributed: false, talent_book: "勤労", talent_weekly: "空行の虚鈴", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "3.4" },
  { name: "白朮", country: "璃月", weapon: "法器", element: "草", birth_month: "４月", birthday: "4月25日", rarity: ['☆５'], body: "長身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 80, talent_boss: "深罪の浸礼者", local_specialty: "瑠璃袋", ascension_stat: "HP", distributed: false, talent_book: "黄金", talent_weekly: "天地に映える蕨", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.6" },
  { name: "閑雲", country: "璃月", weapon: "法器", element: "風", birth_month: "４月", birthday: "4月11日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "山隠れの猊獣", local_specialty: "清水玉", ascension_stat: "攻撃力", distributed: false, talent_book: "黄金", talent_weekly: "光なき渦の眼", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: false, release_version: "4.4" },
  { name: "嘉明", country: "璃月", weapon: "両手剣", element: "炎", birth_month: "１２月", birthday: "12月22日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "鉄甲熔炎帝王", local_specialty: "星螺", ascension_stat: "攻撃力", distributed: false, talent_book: "繁栄", talent_weekly: "光なき一塊", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "4.4" },
  { name: "藍硯", country: "璃月", weapon: "法器", element: "風", birth_month: "１月", birthday: "1月6日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・機構デバイス", local_specialty: "清水玉", ascension_stat: "攻撃力", distributed: false, talent_book: "勤労", talent_weekly: "蝕滅の陽炎", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "5.3" },
  { name: "兹白", country: "璃月", weapon: "片手剣", element: "岩", birth_month: "５月", birthday: "5月15日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "昏き魘夢の主", local_specialty: "瑠璃百合", ascension_stat: "会心ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "昇揚のサンプル「王族」", special_dish: "防御系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna IV (6.3)" },
  { name: "神里綾華", country: "稲妻", weapon: "片手剣", element: "氷", birth_month: "９月", birthday: "9月28日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "恒常からくり陣形", local_specialty: "緋櫻毬", ascension_stat: "会心ダメージ", distributed: false, talent_book: "風雅", talent_weekly: "血玉の枝", special_dish: "復活系", trace: true, costume: true, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.0" },
  { name: "神里綾人", country: "稲妻", weapon: "片手剣", element: "水", birth_month: "３月", birthday: "3月26日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の水", local_specialty: "緋櫻毬", ascension_stat: "会心ダメージ", distributed: false, talent_book: "風雅", talent_weekly: "凶将の手眼", special_dish: "シールド系", trace: true, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.6" },
  { name: "楓原万葉", country: "稲妻", weapon: "片手剣", element: "風", birth_month: "１０月", birthday: "10月29日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "魔偶剣鬼", local_specialty: "ウミレイシ", ascension_stat: "元素熟知", distributed: false, talent_book: "勤労", talent_weekly: "鍍金の鱗", special_dish: "回復系", trace: true, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.6" },
  { name: "宵宮", country: "稲妻", weapon: "弓", element: "炎", birth_month: "６月", birthday: "6月21日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "無相の炎", local_specialty: "鳴草", ascension_stat: "会心率", distributed: false, talent_book: "浮世", talent_weekly: "龍王の冠", special_dish: "回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "2.0" },
  { name: "早柚", country: "稲妻", weapon: "両手剣", element: "風", birth_month: "１０月", birthday: "10月19日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "魔偶剣鬼", local_specialty: "晶化骨髄", ascension_stat: "元素熟知", distributed: false, talent_book: "天光", talent_weekly: "鍍金の鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "2.0" },
  { name: "雷電将軍", country: "稲妻", weapon: "長柄武器", element: "雷", birth_month: "６月", birthday: "6月26日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー", "オンフィールドサポーター"], energy: 90, talent_boss: "雷音権現", local_specialty: "天雲草の実", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "天光", talent_weekly: "溶滅の刻", special_dish: "", trace: true, costume: false, enemy_material: ["古びた鍔"], training_road: false, release_version: "2.1" },
  { name: "九条裟羅", country: "稲妻", weapon: "弓", element: "雷", birth_month: "７月", birthday: "7月14日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "雷音権現", local_specialty: "血石華", ascension_stat: "攻撃力", distributed: false, talent_book: "風雅", talent_weekly: "灰燼の心", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "2.1" },
  { name: "珊瑚宮心海", country: "稲妻", weapon: "法器", element: "水", birth_month: "２月", birthday: "2月22日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "無相の水", local_specialty: "珊瑚真珠", ascension_stat: "水元素ダメージ", distributed: false, talent_book: "浮世", talent_weekly: "獄炎の蝶", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: true, release_version: "2.1" },
  { name: "トーマ", country: "稲妻", weapon: "長柄武器", element: "炎", birth_month: "１月", birthday: "1月9日", rarity: ['☆４'], body: "長身男性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の炎", local_specialty: "ユウトウタケ", ascension_stat: "攻撃力", distributed: false, talent_book: "浮世", talent_weekly: "獄炎の蝶", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "2.2" },
  { name: "荒瀧一斗", country: "稲妻", weapon: "両手剣", element: "岩", birth_month: "６月", birthday: "6月1日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "黄金王獣", local_specialty: "オニカブトムシ", ascension_stat: "会心率", distributed: false, talent_book: "風雅", talent_weekly: "灰燼の心", special_dish: "復活系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: true, release_version: "2.3" },
  { name: "ゴロー", country: "稲妻", weapon: "弓", element: "岩", birth_month: "５月", birthday: "5月18日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "恒常からくり陣形", local_specialty: "珊瑚真珠", ascension_stat: "岩元素ダメージ", distributed: true, talent_book: "天光", talent_weekly: "溶滅の刻", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.3" },
  { name: "八重神子", country: "稲妻", weapon: "法器", element: "雷", birth_month: "６月", birthday: "6月27日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 90, talent_boss: "アビサルヴィシャップ", local_specialty: "ウミレイシ", ascension_stat: "会心率", distributed: false, talent_book: "天光", talent_weekly: "万劫の真意", special_dish: "復活系", trace: false, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.5" },
  { name: "久岐忍", country: "稲妻", weapon: "片手剣", element: "雷", birth_month: "７月", birthday: "7月27日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 60, talent_boss: "遺跡サーペント", local_specialty: "鳴草", ascension_stat: "HP", distributed: false, talent_book: "風雅", talent_weekly: "禍神の禊涙", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.7" },
  { name: "鹿野院平蔵", country: "稲妻", weapon: "法器", element: "風", birth_month: "７月", birthday: "7月24日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "遺跡サーペント", local_specialty: "オニカブトムシ", ascension_stat: "風元素ダメージ", distributed: false, talent_book: "浮世", talent_weekly: "万劫の真意", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "2.8" },
  { name: "綺良々", country: "稲妻", weapon: "片手剣", element: "草", birth_month: "１月", birthday: "1月22日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "深罪の浸礼者", local_specialty: "天雲草の実", ascension_stat: "HP", distributed: true, talent_book: "浮世", talent_weekly: "太古の樹海の一瞬", special_dish: "継続回復系", trace: true, costume: true, enemy_material: ["フライムの乾核"], training_road: false, release_version: "3.7" },
  { name: "千織", country: "稲妻", weapon: "片手剣", element: "岩", birth_month: "８月", birthday: "8月17日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 50, talent_boss: "氷風組曲コッペリア", local_specialty: "血石華", ascension_stat: "会心率", distributed: false, talent_book: "天光", talent_weekly: "光なき糸", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "4.5" },
  { name: "夢見月瑞希", country: "稲妻", weapon: "法器", element: "風", birth_month: "３月", birthday: "3月16日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "迷える霊覚の修権者", local_specialty: "ウミレイシ", ascension_stat: "元素熟知", distributed: false, talent_book: "浮世", talent_weekly: "残火の灯燭", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["古びた鍔"], training_road: false, release_version: "5.4" },
  { name: "ティナリ", country: "スメール", weapon: "弓", element: "草", birth_month: "１２月", birthday: "12月29日", rarity: ['☆５', '恒常☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "マッシュラプトル", local_specialty: "サウマラタ蓮", ascension_stat: "草元素ダメージ", distributed: false, talent_book: "忠言", talent_weekly: "万劫の真意", special_dish: "防御系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.0" },
  { name: "コレイ", country: "スメール", weapon: "弓", element: "草", birth_month: "５月", birthday: "5月8日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "マッシュラプトル", local_specialty: "ルッカデヴァータダケ", ascension_stat: "攻撃力", distributed: true, talent_book: "篤行", talent_weekly: "禍神の禊涙", special_dish: "回復系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "3.0" },
  { name: "ドリー", country: "スメール", weapon: "両手剣", element: "雷", birth_month: "１２月", birthday: "12月21日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "迅電樹", local_specialty: "カルパラタ蓮", ascension_stat: "HP", distributed: true, talent_book: "創意", talent_weekly: "血玉の枝", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.0" },
  { name: "セノ", country: "スメール", weapon: "長柄武器", element: "雷", birth_month: "６月", birthday: "6月23日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "迅電樹", local_specialty: "聖金虫", ascension_stat: "会心ダメージ", distributed: false, talent_book: "忠言", talent_weekly: "凶将の手眼", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "3.1" },
  { name: "キャンディス", country: "スメール", weapon: "長柄武器", element: "水", birth_month: "５月", birthday: "5月3日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "半永久統制マトリックス", local_specialty: "赤念の実", ascension_stat: "HP", distributed: true, talent_book: "忠言", talent_weekly: "禍神の禊涙", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.1" },
  { name: "ニィロウ", country: "スメール", weapon: "片手剣", element: "水", birth_month: "１２月", birthday: "12月3日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 70, talent_boss: "兆載永劫ドレイク", local_specialty: "パティサラ", ascension_stat: "HP", distributed: false, talent_book: "篤行", talent_weekly: "禍神の禊涙", special_dish: "スタミナ軽減系", trace: false, costume: true, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.1" },
  { name: "ナヒーダ", country: "スメール", weapon: "法器", element: "草", birth_month: "１０月", birthday: "10月27日", rarity: ['☆５'], body: "ロリ", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 50, talent_boss: "無相の草", local_specialty: "カルパラタ蓮", ascension_stat: "元素熟知", distributed: false, talent_book: "創意", talent_weekly: "傀儡の糸", special_dish: "防御系", trace: true, costume: false, enemy_material: ["キノコンの胞子"], training_road: false, release_version: "3.2" },
  { name: "レイラ", country: "スメール", weapon: "片手剣", element: "氷", birth_month: "１２月", birthday: "12月19日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 40, talent_boss: "兆載永劫ドレイク", local_specialty: "サウマラタ蓮", ascension_stat: "HP", distributed: true, talent_book: "創意", talent_weekly: "無心の淵鏡", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: false, release_version: "3.2" },
  { name: "放浪者", country: "スメール", weapon: "法器", element: "風", birth_month: "１月", birthday: "1月3日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "兆載永劫ドレイク", local_specialty: "ルッカデヴァータダケ", ascension_stat: "会心率", distributed: false, talent_book: "篤行", talent_weekly: "空行の虚鈴", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "3.3" },
  { name: "ファルザン", country: "スメール", weapon: "弓", element: "風", birth_month: "８月", birthday: "8月20日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "半永久統制マトリックス", local_specialty: "赤念の実", ascension_stat: "攻撃力", distributed: true, talent_book: "忠言", talent_weekly: "傀儡の糸", special_dish: "復活系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.3" },
  { name: "アルハイゼン", country: "スメール", weapon: "片手剣", element: "草", birth_month: "２月", birthday: "2月11日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "風食ウェネト", local_specialty: "砂脂蛹", ascension_stat: "草元素ダメージ", distributed: false, talent_book: "創意", talent_weekly: "無心の淵鏡", special_dish: "回復系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.4" },
  { name: "ディシア", country: "スメール", weapon: "両手剣", element: "炎", birth_month: "４月", birthday: "4月7日", rarity: ['☆５', '恒常☆５'], body: "長身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 70, talent_boss: "半永久統制マトリックス", local_specialty: "砂脂蛹", ascension_stat: "HP", distributed: false, talent_book: "篤行", talent_weekly: "傀儡の糸", special_dish: "HP強化系", trace: true, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: true, release_version: "3.5" },
  { name: "カーヴェ", country: "スメール", weapon: "両手剣", element: "草", birth_month: "７月", birthday: "7月9日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の草", local_specialty: "悼霊花", ascension_stat: "元素熟知", distributed: false, talent_book: "創意", talent_weekly: "原初のオアシスの初咲き", special_dish: "復活系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: false, release_version: "3.6" },
  { name: "セトス", country: "スメール", weapon: "弓", element: "雷", birth_month: "５月", birthday: "5月31日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "山隠れの猊獣", local_specialty: "サングイト", ascension_stat: "元素熟知", distributed: false, talent_book: "篤行", talent_weekly: "空行の虚鈴", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "4.7" },
  { name: "リネ", country: "フォンテーヌ", weapon: "弓", element: "炎", birth_month: "２月", birthday: "2月2日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "鉄甲熔炎帝王", local_specialty: "レインボーローズ", ascension_stat: "会心率", distributed: false, talent_book: "公平", talent_weekly: "原初のオアシスの初咲き", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: false, release_version: "4.0" },
  { name: "リネット", country: "フォンテーヌ", weapon: "片手剣", element: "風", birth_month: "２月", birthday: "2月2日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "氷風組曲コッペリア", local_specialty: "ルミドゥースベル", ascension_stat: "風元素ダメージ", distributed: true, talent_book: "秩序", talent_weekly: "太古の樹海の一瞬", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.0" },
  { name: "フレミネ", country: "フォンテーヌ", weapon: "両手剣", element: "氷", birth_month: "９月", birthday: "9月24日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "氷風組曲コペリウス", local_specialty: "ロマリタイムフラワー", ascension_stat: "攻撃力", distributed: true, talent_book: "正義", talent_weekly: "天地に映える蕨", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: false, release_version: "4.0" },
  { name: "ヌヴィレット", country: "フォンテーヌ", weapon: "法器", element: "水", birth_month: "１２月", birthday: "12月18日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "千年真珠の海駿", local_specialty: "ルエトワール", ascension_stat: "会心ダメージ", distributed: false, talent_book: "公平", talent_weekly: "太古の樹海の一瞬", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["異海の露"], training_road: false, release_version: "4.1" },
  { name: "リオセスリ", country: "フォンテーヌ", weapon: "法器", element: "氷", birth_month: "１１月", birthday: "11月23日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "実験用フィールド生成装置", local_specialty: "探測ユニット・子機", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "原初のオアシスの初咲き", special_dish: "回復系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.1" },
  { name: "シャルロット", country: "フォンテーヌ", weapon: "法器", element: "氷", birth_month: "４月", birthday: "4月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "実験用フィールド生成装置", local_specialty: "蒼晶螺", ascension_stat: "攻撃力", distributed: true, talent_book: "正義", talent_weekly: "光なき糸", special_dish: "スタミナ回復系", trace: false, costume: true, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.2" },
  { name: "フリーナ", country: "フォンテーヌ", weapon: "片手剣", element: "水", birth_month: "１０月", birthday: "10月13日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "水形タルパ", local_specialty: "湖光の鈴蘭", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "光なき一塊", special_dish: "HP強化系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "4.2" },
  { name: "ナヴィア", country: "フォンテーヌ", weapon: "両手剣", element: "岩", birth_month: "８月", birthday: "8月16日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "氷風組曲コペリウス", local_specialty: "初露の源", ascension_stat: "会心ダメージ", distributed: false, talent_book: "公平", talent_weekly: "光なき糸", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: false, release_version: "4.3" },
  { name: "シュヴルーズ", country: "フォンテーヌ", weapon: "長柄武器", element: "炎", birth_month: "１月", birthday: "1月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "千年真珠の海駿", local_specialty: "ルミドゥースベル", ascension_stat: "HP", distributed: false, talent_book: "秩序", talent_weekly: "光なき渦の眼", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.3" },
  { name: "クロリンデ", country: "フォンテーヌ", weapon: "片手剣", element: "雷", birth_month: "９月", birthday: "9月20日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "千年真珠の海駿", local_specialty: "ルエトワール", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "太古の樹海の一瞬", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: false, release_version: "4.7" },
  { name: "シグウィン", country: "フォンテーヌ", weapon: "弓", element: "水", birth_month: "３月", birthday: "3月30日", rarity: ['☆５'], body: "ロリ", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "水形タルパ", local_specialty: "ロマリタイムフラワー", ascension_stat: "HP", distributed: false, talent_book: "公平", talent_weekly: "光なき渦の眼", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: false, release_version: "4.7" },
  { name: "エミリエ", country: "フォンテーヌ", weapon: "長柄武器", element: "草", birth_month: "９月", birthday: "9月22日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 50, talent_boss: "魔像レガトゥス", local_specialty: "湖光の鈴蘭", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "絹織りの羽", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.8" },
  { name: "エスコフィエ", country: "フォンテーヌ", weapon: "長柄武器", element: "氷", birth_month: "６月", birthday: "6月8日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・統御デバイス", local_specialty: "蒼晶螺", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "蝕滅の焔角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "5.6" },
  { name: "イアンサ", country: "ナタ", weapon: "長柄武器", element: "雷", birth_month: "８月", birthday: "8月8日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "深淵なるミミック・パピラ", local_specialty: "琉鱗石", ascension_stat: "攻撃力", distributed: false, talent_book: "角逐", talent_weekly: "否定と裁決", special_dish: "復活系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.5" },
  { name: "チャスカ", country: "ナタ", weapon: "弓", element: "風", birth_month: "１２月", birthday: "12月10日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "深淵なるミミック・パピラ", local_specialty: "枯れ紫菖", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "絹織りの羽", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.2" },
  { name: "ムアラニ", country: "ナタ", weapon: "法器", element: "水", birth_month: "８月", birthday: "8月3日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "暴君・金焔のクク竜", local_specialty: "波しぶきのエラ", ascension_stat: "会心率", distributed: false, talent_book: "角逐", talent_weekly: "光なき一塊", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.0" },
  { name: "オロルン", country: "ナタ", weapon: "弓", element: "雷", birth_month: "１０月", birthday: "10月14日", rarity: ['☆４'], body: "長身男性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "暴君・金焔のクク竜", local_specialty: "蛍光ツノキノコ", ascension_stat: "攻撃力", distributed: true, talent_book: "焚燼", talent_weekly: "光なき糸", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.2" },
  { name: "キィニチ", country: "ナタ", weapon: "両手剣", element: "草", birth_month: "１１月", birthday: "11月11日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "山の王・貪食のユムカ竜", local_specialty: "サウリアンサキュレント", ascension_stat: "会心ダメージ", distributed: false, talent_book: "焚燼", talent_weekly: "否定と裁決", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.0" },
  { name: "カチーナ", country: "ナタ", weapon: "長柄武器", element: "岩", birth_month: "４月", birthday: "4月22日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "山の王・貪食のユムカ竜", local_specialty: "ケネパベリー", ascension_stat: "岩元素ダメージ", distributed: true, talent_book: "紛争", talent_weekly: "残火の灯燭", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.0" },
  { name: "シトラリ", country: "ナタ", weapon: "法器", element: "氷", birth_month: "１月", birthday: "1月20日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "迷える霊覚の修権者", local_specialty: "ケネパベリー", ascension_stat: "元素熟知", distributed: false, talent_book: "焚燼", talent_weekly: "否定と裁決", special_dish: "復活系", trace: false, costume: true, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.3" },
  { name: "マーヴィカ", country: "ナタ", weapon: "両手剣", element: "炎", birth_month: "８月", birthday: "8月28日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー", "オフフィールドアタッカー", "オンフィールドサポーター"], energy: 0, talent_boss: "秘源機兵・機構デバイス", local_specialty: "枯れ紫菖", ascension_stat: "会心ダメージ", distributed: false, talent_book: "角逐", talent_weekly: "蝕滅の焔角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.3" },
  { name: "ヴァレサ", country: "ナタ", weapon: "法器", element: "雷", birth_month: "１１月", birthday: "11月15日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "輝ける溶岩の龍像", local_specialty: "岩裂の花", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "蝕滅の羽鱗", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.5" },
  { name: "イファ", country: "ナタ", weapon: "法器", element: "風", birth_month: "３月", birthday: "3月23日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドライフキーパー"], energy: 60, talent_boss: "輝ける溶岩の龍像", local_specialty: "サウリアンサキュレント", ascension_stat: "元素熟知", distributed: false, talent_book: "紛争", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "防御系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.6" },
  { name: "シロネン", country: "ナタ", weapon: "片手剣", element: "岩", birth_month: "３月", birthday: "3月13日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・機構デバイス", local_specialty: "シャクギク", ascension_stat: "防御力", distributed: false, talent_book: "焚燼", talent_weekly: "無心の淵鏡", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.1" },
  { name: "タルタリヤ", country: "スネージナヤ", weapon: "弓", element: "水", birth_month: "７月", birthday: "7月20日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "純水精霊", local_specialty: "星螺", ascension_stat: "水元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "魔王の刃・残片", special_dish: "防御系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: true, release_version: "1.1" },
  { name: "アルレッキーノ", country: "スネージナヤ", weapon: "長柄武器", element: "炎", birth_month: "８月", birthday: "8月22日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "魔像レガトゥス", local_specialty: "レインボーローズ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "残火の灯燭", special_dish: "回復系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: false, release_version: "4.6" },
  { name: "イネファ", country: "ナドクライ", weapon: "長柄武器", element: "雷", birth_month: "４月", birthday: "4月2日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・統御デバイス", local_specialty: "蛍光ツノキノコ", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "蝕滅の陽炎", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.8" },
  { name: "フリンズ", country: "ナドクライ", weapon: "長柄武器", element: "雷", birth_month: "１０月", birthday: "10月31日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "ボコボコダック", local_specialty: "フロストランプ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "流浪", talent_weekly: "昇揚のサンプル「王族」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna I (6.0)" },
  { name: "アイノ", country: "ナドクライ", weapon: "両手剣", element: "水", birth_month: "９月", birthday: "9月21日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター"], energy: 50, talent_boss: "ボコボコダック", local_specialty: "携行型ベアリング", ascension_stat: "元素熟知", distributed: true, talent_book: "楽園", talent_weekly: "絹織りの羽", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna I (6.0)" },
  { name: "ラウマ", country: "ナドクライ", weapon: "法器", element: "草", birth_month: "３月", birthday: "3月1日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "集光の幻月蝶", local_specialty: "月落銀", ascension_stat: "元素熟知", distributed: false, talent_book: "月光", talent_weekly: "蝕滅の羽鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna I (6.0)" },
  { name: "ネフェル", country: "ナドクライ", weapon: "法器", element: "草", birth_month: "５月", birthday: "5月9日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "霜夜の空を巡る霊主", local_specialty: "月落銀", ascension_stat: "会心ダメージ", distributed: false, talent_book: "楽園", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna II (6.1)" },
  { name: "ヤフォダ", country: "ナドクライ", weapon: "弓", element: "風", birth_month: "１月", birthday: "1月5日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 70, talent_boss: "集光の幻月蝶", local_specialty: "携行型ベアリング", ascension_stat: "与える治療効果", distributed: true, talent_book: "流浪", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna III (6.2)" },
  { name: "コロンビーナ", country: "ナドクライ", weapon: "法器", element: "水", birth_month: "１月", birthday: "1月14日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "霜夜の空を巡る霊主", local_specialty: "ヴィンテル草", ascension_stat: "会心率", distributed: false, talent_book: "月光", talent_weekly: "賢医の仮面", special_dish: "HP強化系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "Luna IV (6.3)" },
  { name: "イルーガ", country: "ナドクライ", weapon: "長柄武器", element: "岩", birth_month: "１２月", birthday: "12月23日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "重量級陸巡艦「バトルシップ」", local_specialty: "琥珀香", ascension_stat: "元素熟知", distributed: false, talent_book: "楽園", talent_weekly: "蝕滅の焔角", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna IV (6.3)" },
  { name: "リンネア", country: "ナドクライ", weapon: "弓", element: "岩", birth_month: "５月", birthday: "5月23日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "守護者・堕天", local_specialty: "フェザーモス", ascension_stat: "会心率", distributed: false, talent_book: "流浪", talent_weekly: "異端の薬瓶", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna VI (6.5)" },
  { name: "ドゥリン", country: "モンド", weapon: "片手剣", element: "炎", birth_month: "３月", birthday: "3月14日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドアタッカー"], energy: 70, talent_boss: "重量級陸巡艦「バトルシップ」", local_specialty: "フロストランプ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "詩文", talent_weekly: "蝕滅の陽炎", special_dish: "回復系", trace: false, costume: true, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna III (6.2)" },
  { name: "ニコ", country: "例外", weapon: "法器", element: "炎", birth_month: "９月", birthday: "9月29日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "昏き魘夢の主", local_specialty: "琥珀香", ascension_stat: "攻撃力", distributed: false, talent_book: "楽園", talent_weekly: "偽りの樹脂", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna VII (6.6)" },
  { name: "サンドローネ", country: "スネージナヤ", weapon: "両手剣", element: "氷", birth_month: "１月", birthday: "1月13日", version: "n.0", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "守護者・堕天", local_specialty: "探測ユニット・子機", ascension_stat: "会心率", distributed: false, talent_book: "流浪", talent_weekly: "狂人の誓約", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna VIII (6.7)" }, 
  // 旅人（特殊：出題対象外）
  { name: "旅人", country: "例外", weapon: "片手剣", element: "その他", birth_month: "その他", birthday: "なし", rarity: ['☆５'], body: "中身男性/中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "", local_specialty: "風車アスター", ascension_stat: "攻撃力", distributed: true, talent_book: "自由", talent_weekly: "", special_dish: "", trace: false, costume: true, enemy_material: [], training_road: false, release_version: "1.0", displayNames: ["空", "蛍"], enabled: false },
  { name: "スカーク", country: "例外", weapon: "片手剣", element: "氷", birth_month: "１１月", birthday: "11月5日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 0, talent_boss: "深淵なるミミック・パピラ", local_specialty: "岩裂の花", ascension_stat: "会心ダメージ", distributed: false, talent_book: "角逐", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "5.7" },
  { name: "アーロイ", country: "例外", weapon: "弓", element: "氷", birth_month: "４月", birthday: "4月4日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の氷", local_specialty: "晶化骨髄", ascension_stat: "氷元素ダメージ", distributed: true, talent_book: "自由", talent_weekly: "溶滅の刻", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.1", enabled: false },
];

// ---------------------------------------------------------------------------
// 正規化関数
// ---------------------------------------------------------------------------

/**
 * release_version 文字列から数値を抽出する。
 * 例: "1.0" → 1.0 / "Luna III (6.2)" → 6.2
 * @param {string} str
 * @returns {number}
 */
function parseReleaseVersion(str) {
  if (!str) return 0;
  // "Luna X (N.N)" パターン
  const lunaMatch = str.match(/\((\d+\.\d+)\)/);
  if (lunaMatch) return parseFloat(lunaMatch[1]);
  // "N.N" パターン
  const simple = parseFloat(str);
  return isNaN(simple) ? 0 : simple;
}

/**
 * rarity 配列からレアリティ数値とバナー種を抽出する。
 * @param {string[]} rarityArr
 * @returns {{ rarity: number, bannerType: string }}
 */
function parseRarity(rarityArr) {
  if (!Array.isArray(rarityArr) || rarityArr.length === 0) {
    return { rarity: 4, bannerType: 'limited' };
  }
  const str = rarityArr.join('/');
  const rarity = str.includes('５') ? 5 : 4;
  let bannerType = 'limited';
  if (rarityArr.some(r => r.includes('恒常'))) bannerType = 'standard';
  else if (rarityArr.length === 1 && rarity === 4) {
    // ★4は配布キャラも多いが distributed フラグで判断
    bannerType = 'pool';
  }
  return { rarity, bannerType };
}

/**
 * body 文字列を正規化コードに変換する。
 * @param {string|string[]} body
 * @returns {string}
 */
function normalizeBody(body) {
  const raw = Array.isArray(body) ? body[0] : (body || '');
  const map = {
    'ロリ': 'loli',
    '中身女性': 'medium_female',
    '中身男性': 'medium_male',
    '長身女性': 'tall_female',
    '長身男性': 'tall_male',
  };
  return map[raw] || 'other';
}

/**
 * 生データを正規化して最終キャラクターオブジェクトを返す。
 * @param {object} raw
 * @returns {object}
 */
function normalizeCharacter(raw) {
  const { rarity, bannerType } = parseRarity(raw.rarity);
  const releaseVersionNum = parseReleaseVersion(raw.release_version);
  const bodyCode = normalizeBody(raw.body);
  const energyNum = typeof raw.energy === 'string' ? parseInt(raw.energy, 10) : (raw.energy || 0);

  // 黄色判定グループキー
  const talentBookGroup = TALENT_BOOK_GROUPS[raw.talent_book] || raw.talent_book || '';
  const weeklyBossGroup = WEEKLY_BOSS_GROUPS[raw.talent_weekly] || raw.talent_weekly || '';
  const localSpecialtyGroup = LOCAL_SPECIALTY_GROUPS[raw.local_specialty] || raw.local_specialty || '';
  const ascensionStatGroup = ASCENSION_STAT_GROUPS[raw.ascension_stat] || raw.ascension_stat || '';

  // 配布フラグを bannerType に反映
  let finalBannerType = bannerType;
  if (raw.distributed) finalBannerType = 'distributed';

  // 検索用サジェスト名（displayNames または name）
  const allNames = [raw.name, ...(raw.displayNames || [])].filter(Boolean);

  return {
    id: raw.name,
    name: raw.name,
    displayNames: allNames,
    country: raw.country || '',
    element: raw.element || '',
    weapon: raw.weapon || '',
    rarity,
    bannerType: finalBannerType,
    body: bodyCode,
    bodyLabel: Array.isArray(raw.body) ? raw.body[0] : (raw.body || ''),
    energy: energyNum,
    releaseVersionNum,
    releaseVersionLabel: raw.release_version || '',
    birthMonth: raw.birth_month || '',
    birthday: raw.birthday || '',
    role: Array.isArray(raw.role) ? raw.role : [raw.role || ''],
    talentBook: raw.talent_book || '',
    talentBookGroup,
    talentWeekly: raw.talent_weekly || '',
    weeklyBossGroup,
    talentBoss: raw.talent_boss || '',
    localSpecialty: raw.local_specialty || '',
    localSpecialtyGroup,
    ascensionStat: raw.ascension_stat || '',
    ascensionStatGroup,
    specialDish: raw.special_dish || '',
    distributed: !!raw.distributed,
    costume: !!raw.costume,
    trace: !!raw.trace,
    trainingRoad: !!raw.training_road,
    enemyMaterial: Array.isArray(raw.enemy_material) ? raw.enemy_material[0] || '' : '',
    enabled: raw.enabled !== false,
    iconUrl: `${IMAGE_BASE}/characters/${encodeURIComponent(raw.name)}.png`,
  };
}

// ---------------------------------------------------------------------------
// 正規化済みキャラクターリスト（出題対象のみ）
// ---------------------------------------------------------------------------
const CHARACTERS = RAW_CHARACTERS.map(normalizeCharacter).filter(c => c.enabled);

// ---------------------------------------------------------------------------
// ヒント項目定義
// ---------------------------------------------------------------------------
/** 比較に使う全フィールドの定義（order が表示・共有順） */
const HINT_FIELDS = [
  { key: 'element',           label: '元素',         type: 'exact',   defaultOn: true  },
  { key: 'weapon',            label: '武器種',        type: 'exact',   defaultOn: true  },
  { key: 'rarity',            label: 'レアリティ',    type: 'exact',   defaultOn: true  },
  { key: 'bannerType',        label: 'バナー種',      type: 'exact',   defaultOn: true  },
  { key: 'country',           label: '国',           type: 'exact',   defaultOn: true  },
  { key: 'body',              label: '体型',         type: 'exact',   defaultOn: true  },
  { key: 'releaseVersionNum', label: '実装Ver',       type: 'numeric', defaultOn: true  },
  { key: 'energy',            label: 'エネルギー',    type: 'numeric', defaultOn: true  },
  { key: 'birthMonth',        label: '誕生月',        type: 'exact',   defaultOn: false },
  { key: 'talentBook',        label: '天賦本',        type: 'group',   group: 'talentBookGroup', defaultOn: true  },
  { key: 'talentWeekly',      label: '週ボス素材',    type: 'group',   group: 'weeklyBossGroup', defaultOn: true  },
  { key: 'talentBoss',        label: '天賦ボス',      type: 'exact',   defaultOn: false },
  { key: 'localSpecialty',    label: '特産品',        type: 'group',   group: 'localSpecialtyGroup', defaultOn: true  },
  { key: 'ascensionStat',     label: '突破ステ',      type: 'group',   group: 'ascensionStatGroup', defaultOn: true  },
  { key: 'specialDish',       label: '特殊料理',      type: 'exact',   defaultOn: false },
  { key: 'distributed',       label: '配布',         type: 'exact',   defaultOn: true  },
  { key: 'costume',           label: '別衣装',         type: 'exact',   defaultOn: false },
  { key: 'trace',             label: '軌跡',      type: 'exact',   defaultOn: false },
  { key: 'trainingRoad',      label: '鍛錬の道',    type: 'exact',   defaultOn: false },
  { key: 'enemyMaterial',     label: '敵素材',        type: 'exact',   defaultOn: false },
];

/**
 * 各フィールドの表示用ラベル変換
 * @param {string} key - フィールドキー
 * @param {*} value - 値
 * @param {object} char - キャラクターオブジェクト（body の表示名参照等）
 * @returns {string}
 */
function getDisplayValue(key, value, char) {
  if (value === null || value === undefined || value === '') return '—';
  switch (key) {
    case 'rarity':       return `★${value}`;
    case 'bannerType':   return { limited: '限定', standard: '恒常', distributed: '配布', pool: 'ガチャ' }[value] || value;
    case 'body':         return char.bodyLabel || value;
    case 'distributed':  return value ? 'あり' : 'なし';
    case 'costume':      return value ? 'あり' : 'なし';
    case 'trace':        return value ? 'あり' : 'なし';
    case 'trainingRoad': return value ? 'あり' : 'なし';
    case 'releaseVersionNum': return char.releaseVersionLabel || String(value);
    default:             return String(value);
  }
}
