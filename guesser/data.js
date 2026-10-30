/**
 * data.js — Genshin Guesser データ管理
 * 生データ配列と正規化レイヤーを提供する。
 * キャラクターデータは既存 of script.js から抽出・加工。
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
  '流浪': 'nodkrai', '楽園': 'nodkrai', '月光': 'nodkrai',
  '慈愛': 'Snezhnaya', '不屈': 'Snezhnaya', '栄光': 'Snezhnaya',
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
  '原初のオアシスの初咲き': 'Apep', '太古の樹海の一瞬': 'Apep', '天地に生える蕨': 'Apep',
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
  'ドドリアン': 'mondstadt', 'ググプラム': 'mondstadt', 
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
  '月落銀': 'nodkrai', '携行型ベアリング': 'nodkrai', '琥珀香': 'nodkrai','ヴィンテル草': 'nodkrai','フロストランプ': 'nodkrai',
  // スネージナヤ
  'フロストフラワー': 'Snezhnaya', 'フロック草': 'Snezhnaya', 'ザラトイアリャーク': 'Snezhnaya',
};

/** 突破ステータスグループ（同系統） */
const ASCENSION_STAT_GROUPS = {
  '会心率': 'crit', '会心ダメージ': 'crit',
  '攻撃力': 'atk', 
  'HP': 'hp',
  '防御力': 'def',
  '元素熟知': 'em',
  '元素チャージ効率': 'er',
  '与える治療効果': 'heal',
  '炎元素ダメージ': 'element_dmg',   
  '水元素ダメージ': 'element_dmg',
  '風元素ダメージ': 'element_dmg',
  '雷元素ダメージ': 'element_dmg',
  '草元素ダメージ': 'element_dmg',
  '氷元素ダメージ': 'element_dmg',
  '岩元素ダメージ': 'element_dmg',
  '物理ダメージ': 'element_dmg',
};

// ---------------------------------------------------------------------------
// キャラクター読み仮名定義マップ（漢字とひらがな双方でマッチするように追加）
// ---------------------------------------------------------------------------
const CHARACTER_READINGS = {
  "ジン": ["じん"],
  "アンバー": ["あんばー"],
  "リサ": ["りさ"],
  "ガイア": ["がいあ"],
  "バーバラ": ["ばーばら"],
  "ディルック": ["でぃるっく"],
  "レザー": ["れざー"],
  "ウェンティ": ["ふうじん","ばるばとす","ぎんゆうやろう","うぇんてぃ"],
  "クレー": ["どどこ","くれー"],
  "ベネット": ["べねっと"],
  "ノエル": ["のえる"],
  "フィッシュル": ["えみ","ふぃっしゅる"],
  "スクロース": ["すくろーす"],
  "モナ": ["あすとろーぎすと・もな・めぎすとす","あすとろーぎすと","めぎすとす","もな"],
  "ディオナ": ["でぃおな"],
  "アルベド": ["あるべど"],
  "ロサリア": ["ろさりあ"],
  "エウルア": ["えうるあ"],
  "ミカ": ["みか"],
  "ダリア": ["だりあ"],
  "ドゥリン": ["どぅりん"],
  "ファルカ": ["ふぁるか"],
  "ローエン": ["ろーえん"],
  "プルーネ": ["どくなひーだ","ぷるーね"],
  "魈": ["こうまたいせい","しょう"],
  "北斗": ["ほくと"],
  "凝光": ["てんちゅえん","ぎょうこう"],
  "香菱": ["しゃんりん"],
  "行秋": ["ゆくあき"],
  "重雲": ["ちょううん"],
  "七七": ["なな"],
  "刻晴": ["ゆーへん","こくせい"],
  "鍾離": ["もらくす","がんしん","がんおうていくん","しょうり"],
  "辛炎": ["しんえん"],
  "甘雨": ["ここなっつひつじ","あねぎみ","かんう"],
  "胡桃": ["ふーたお"],
  "煙緋": ["えんひ"],
  "申鶴": ["しんかく"],
  "雲菫": ["うんきん"],
  "夜蘭": ["いぇらん"],
  "ヨォーヨ": ["よぉーよ"],
  "白朮": ["しろぽ","ぽ","びゃくじゅつ"],
  "閑雲": ["りゅううんしゃくふうしんくん","かんうん"],
  "嘉明": ["げーみんぐ","がみん"],
  "藍硯": ["らんやん"],
  "兹白": ["しはく"],
  "神里綾華": ["しらさぎのひめぎみ","かみさとあやか", "あやか"],
  "神里綾人": ["かみさとあやと", "あやと"],
  "楓原万葉": ["ござる","かえではらかずは", "かずは"],
  "宵宮": ["よいみや"],
  "早柚": ["さゆ"],
  "雷電将軍": ["まがつみたけなるかみのみこと","らいでんしょうぐん"],
  "九条裟羅": ["くじょうさら", "さら"],
  "珊瑚宮心海": ["さんごのみやここみ", "ここみ"],
  "トーマ": ["みそしる","とーま"],
  "荒瀧一斗": ["うしつかいやろう","あらたきいっと", "いっと"],
  "ゴロー": ["ましんがん","ごろー"],
  "八重神子": ["やえみこ", "みこ"],
  "久岐忍": ["くきしのぶ", "しのぶ"],
  "鹿野院平蔵": ["しかのいんへいぞう", "へいぞう"],
  "綺良々": ["きらら"],
  "千織": ["ちおり"],
  "夢見月瑞希": ["ゆめみづきみずき", "みずき"],
  "ティナリ": ["おてぃなり","てぃなり"],
  "コレイ": ["これい"],
  "ドリー": ["かねだともこ","どりー"],
  "セノ": ["でゅえりすと","せの"],
  "キャンディス": ["きゃんでぃす"],
  "ニィロウ": ["にぃろう"],
  "ナヒーダ": ["そうしん","ぶえる","くらくさなりでび","なひーだ"],
  "レイラ": ["れいら"],
  "放浪者": ["かさっち","にんぎょう","せいきのかみ","くろぬし","かぶきもの","しちようじゃくしょうひみつぬし","くにくずし","ざんひょう","ろくい","ほうろうしゃ", "スカラマシュ"],
  "ファルザン": ["せんぱい","ふぁるざん"],
  "アルハイゼン": ["しょきかん","だいけんじゃ","ぶんじゃく","あるはいぜん"],
  "ディシア": ["しりょうのしし","でぃしあ"],
  "カーヴェ": ["かおだけ","かべ","かーヴぇ"],
  "セトス": ["せとす"],
  "リネ": ["りね"],
  "リネット": ["りねっと"],
  "フレミネ": ["ぺーるす","ふれみね"],
  "ヌヴィレット": ["さいこうしんぱんかん","ぬっちゃん","なきむしすいりゅう","すいりゅう","ぬ","ぬヴぃれっと"],
  "リオセスリ": ["せすり","はむしゃく","りおせすり"],
  "シャルロット": ["しゃるろっと"],
  "フリーナ": ["ふりーな・どぅ・ふぉんてーぬ","ふりーな"],
  "ナヴィア": ["すぴなでぃろーすらかいちょう","なヴぃあ"],
  "シュヴルーズ": ["うごくな","しゅヴるーず"],
  "クロリンデ": ["てーぶるとーくしあたー","けっとうだいりにん","くろりん","くろりんで"],
  "シグウィン": ["かんごしちょう","ろまりたいむ","しぐうぃん"],
  "エミリエ": ["えみりえ"],
  "エスコフィエ": ["かーねるでせーる","えすこふぃえ"],
  "イアンサ": ["ちから","ううぃーぞ","うごけ","いあんさ"],
  "チャスカ": ["ちょうていしゃ","ちょうえつ","ヴーか","ちゃすか"],
  "ムアラニ": ["さめ","さいこうのがいど","だんけつ","うもじゃ","むあらに"],
  "オロルン": ["おろろん","のうか","まご","けんしん","びでぃー","おろるん"],
  "キィニチ": ["ちゅーたん","あはう","まりぽすと","にちにち","かいえん","まりぽ","きぃにち"],
  "カチーナ": ["ふくつ","うっさびーてぃ","かちーな"],
  "シトラリ": ["いつぱぱ","しとらりん","つぃつぃみめ","うくんぼく","きおく","ぐらすばーば","ばあちゃん","ばぁちゃん","しとらり"],
  "マーヴィカ": ["ばいく","はぼりむ","えんじん","きおんごずぃ","しどうしゃ","まーヴぃか"],
  "ヴァレサ": ["きのこ","ヴぁれさ"],
  "イファ": ["かくーく","いふぁ"],
  "シロネン": ["ぎゃう","ぎゃる","しゅくふく","ばれか","しろねん"],
  "タルタリヤ": ["ぶげいますたー","はむこ","せんとうきょう","あいぼう","かに","あやっくす","じゅういちい","こうし","たるたりや"],
  "アルレッキーノ": ["おとうさま","ぺるべーれ","よんい","あるれっきーの"],
  "イネファ": ["びるぎった","いねふぁ"],
  "フリンズ": ["きりる・ちゅーどみろヴぃち・ふりんず","ぽよ","ふぇふぇいのふぇい","らんぷ","ふりんず"],
  "アイノ": ["ぼこぼこだっく","あいの"],
  "ラウマ": ["えいげつし","せいじょ","しか","らうま"],
  "ネフェル": ["まるはだか","ちゃくせき","あねさん","ねふぇる"],
  "ヤフォダ": ["やふぉだ"],
  "コロンビーナ": ["さんい","しょうじょ","げっしん","そうげつ","くーたる","ころんびーなはいぽせれにあ","ころんびーな"],
  "イルーガ": ["ちゃま","ぼっちゃま","いるーが"],
  "リンネア": ["やっふー！","るみ","るみさん","りんねあ"],
  "ニコ": ["てんのつかい","えぬ","まじょN","にこりやん","にこ"],
  "サンドローネ": ["まりあって・ぎよたん","なない","かいらい","さんどろーね"],
  "スカーク": ["ｼｼｮ","ししょ","すかーく"],
  "アーロイ": ["あーろい"],
  "旅人": ["たびびと"],
  "アリョーシャ": ["ありょーしゃ", "ありよし"],
  "オデット": ["ぷりんしぱる","おでっと"],
  "ヴェスナ": ["ヴぇすな"],
  "ヴォジャニーツァ": ["ぷりまどんな","ヴぉじゃにーつぁ"],
  "ミティヤ": ["みてぃあ","みてぃや"],
  "バレリー": ["ばれりー","ヴぁれりー"],
  
};

// ---------------------------------------------------------------------------
// 生データ（2枚目の内容に置き換え）
// ---------------------------------------------------------------------------
const RAW_CHARACTERS = [
  { name: "ジン", country: "モンド", weapon: "片手剣", element: "風", birth_month: "３月", birthday: "3月14日", rarity: ['☆５', '恒常☆５'], body: "長身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の風", local_specialty: "蒲公英の種", ascension_stat: "与える治療効果", distributed: false, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "継続回復系", trace: true, costume: true, enemy_material: ["破損した仮面"], training_road: true, release_version: "1.0", attack: 239, hp: "14.695", defense: 769 },
  { name: "アンバー", country: "モンド", weapon: "弓", element: "炎", birth_month: "８月", birthday: "8月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 40, talent_boss: "爆炎樹", local_specialty: "イグサ", ascension_stat: "攻撃力", distributed: true, talent_book: "自由", talent_weekly: "東風の吐息", special_dish: "復活系", trace: false, costume: true, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.0", attack: 223, hp: "9.461", defense: 601 },
  { name: "リサ", country: "モンド", weapon: "法器", element: "雷", birth_month: "６月", birthday: "6月9日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 80, talent_boss: "無相の雷", local_specialty: "ヴァルベリー", ascension_stat: "元素熟知", distributed: true, talent_book: "詩文", talent_weekly: "東風の爪", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0", attack: 231, hp: "9.570", defense: 573 },
  { name: "ガイア", country: "モンド", weapon: "片手剣", element: "氷", birth_month: "１１月", birthday: "11月30日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "ドドリアン", ascension_stat: "元素チャージ効率", distributed: true, talent_book: "詩文", talent_weekly: "北風の魂箱", special_dish: "回復系", trace: false, costume: true, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0", attack: 223, hp: "11.636", defense: 792 },
  { name: "バーバラ", country: "モンド", weapon: "法器", element: "水", birth_month: "７月", birthday: "7月5日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "純水精霊", local_specialty: "慕風のマッシュルーム", ascension_stat: "HP", distributed: true, talent_book: "自由", talent_weekly: "北風のリング", special_dish: "スタミナ軽減系", trace: false, costume: true, enemy_material: ["占いの絵巻"], training_road: false, release_version: "1.0", attack: 159, hp: "9.787", defense: 669 },
  { name: "ディルック", country: "モンド", weapon: "両手剣", element: "炎", birth_month: "４月", birthday: "4月30日", rarity: ['☆５', '恒常☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "爆炎樹", local_specialty: "イグサ", ascension_stat: "会心率", distributed: false, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "攻撃系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: true, release_version: "1.0", attack: 335, hp: "12.981", defense: 784 },
  { name: "レザー", country: "モンド", weapon: "両手剣", element: "雷", birth_month: "９月", birthday: "9月9日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の雷", local_specialty: "ググプラム", ascension_stat: "物理ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "東風の爪", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0", attack: 234, hp: "11.962", defense: 751 },
  { name: "ウェンティ", country: "モンド", weapon: "弓", element: "風", birth_month: "６月", birthday: "6月16日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 60, talent_boss: "無相の風", local_specialty: "セシリアの花", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "詩文", talent_weekly: "北風のしっぽ", special_dish: "スタミナ軽減系", trace: true, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0", attack: 263, hp: "10.531", defense: 669 },
  { name: "クレー", country: "モンド", weapon: "法器", element: "炎", birth_month: "７月", birthday: "7月27日", rarity: ['☆５'], body: "ロリ", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "慕風のマッシュルーム", ascension_stat: "炎元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "北風のリング", special_dish: "防御系", trace: true, costume: true, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.0", attack: 311, hp: "10.287", defense: 615 },
  { name: "ベネット", country: "モンド", weapon: "片手剣", element: "炎", birth_month: "２月", birthday: "2月29日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "風車アスター", ascension_stat: "元素チャージ効率", distributed: true, talent_book: "抗争", talent_weekly: "東風の羽根", special_dish: "復活系", trace: false, costume: true, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0", attack: 191, hp: "12.397", defense: 771 },
  { name: "ノエル", country: "モンド", weapon: "両手剣", element: "岩", birth_month: "３月", birthday: "3月21日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "無相の岩", local_specialty: "ヴァルベリー", ascension_stat: "防御力", distributed: false, talent_book: "抗争", talent_weekly: "東風の爪", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0", attack: 191, hp: "12.071", defense: 799 },
  { name: "フィッシュル", country: "モンド", weapon: "弓", element: "雷", birth_month: "５月", birthday: "5月27日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "無相の雷", local_specialty: "イグサ", ascension_stat: "攻撃力", distributed: true, talent_book: "詩文", talent_weekly: "北風の魂箱", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.0", attack: 244, hp: "9.189", defense: 594 },
  { name: "スクロース", country: "モンド", weapon: "法器", element: "風", birth_month: "１１月", birthday: "11月26日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "無相の風", local_specialty: "風車アスター", ascension_stat: "風元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "北風の魂箱", special_dish: "復活系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "1.0", attack: 170, hp: "9.244", defense: 703 },
  { name: "モナ", country: "モンド", weapon: "法器", element: "水", birth_month: "８月", birthday: "8月31日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "純水精霊", local_specialty: "慕風のマッシュルーム", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "抗争", talent_weekly: "北風のリング", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.0", attack: 287, hp: "10.409", defense: 653 },
  { name: "ディオナ", country: "モンド", weapon: "弓", element: "氷", birth_month: "１月", birthday: "1月18日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "急凍樹", local_specialty: "ドドリアン", ascension_stat: "氷元素ダメージ", distributed: true, talent_book: "自由", talent_weekly: "魔王の刃・残片", special_dish: "復活系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "1.1", attack: 212, hp: "9.570", defense: 601 },
  { name: "アルベド", country: "モンド", weapon: "片手剣", element: "岩", birth_month: "９月", birthday: "9月13日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドアタッカー"], energy: 40, talent_boss: "無相の岩", local_specialty: "セシリアの花", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "詩文", talent_weekly: "吞天の鯨・只角", special_dish: "シールド系", trace: true, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.2", attack: 251, hp: "13.226", defense: 876 },
  { name: "ロサリア", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "１月", birthday: "1月24日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "ヴァルベリー", ascension_stat: "攻撃力", distributed: false, talent_book: "詩文", talent_weekly: "武煉の魂・孤影", special_dish: "回復系", trace: false, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "1.4", attack: 240, hp: "12.289", defense: 710 },
  { name: "エウルア", country: "モンド", weapon: "両手剣", element: "氷", birth_month: "１０月", birthday: "10月25日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の氷", local_specialty: "蒲公英の種", ascension_stat: "会心ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "龍王の冠", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: true, release_version: "1.5", attack: 342, hp: "13.226", defense: 751 },
  { name: "ミカ", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "８月", birthday: "8月11日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "風食ウェネト", local_specialty: "ググプラム", ascension_stat: "HP", distributed: false, talent_book: "詩文", talent_weekly: "無心の淵鏡", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: false, release_version: "3.5", attack: 223, hp: "12.506", defense: 713 },
  { name: "ダリア", country: "モンド", weapon: "片手剣", element: "水", birth_month: "５月", birthday: "5月25日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 80, talent_boss: "秘源機兵・統御デバイス", local_specialty: "ドドリアン", ascension_stat: "HP", distributed: false, talent_book: "詩文", talent_weekly: "蝕滅の羽鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "5.7", attack: 189, hp: "12.506", defense: 560 },
  { name: "ドゥリン", country: "モンド", weapon: "片手剣", element: "炎", birth_month: "３月", birthday: "3月14日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドサポーター", "オフフィールドアタッカー"], energy: 70, talent_boss: "重量級陸巡艦「バトルシップ」", local_specialty: "フロストランプ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "詩文", talent_weekly: "蝕滅の陽炎", special_dish: "回復系", trace: false, costume: true, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna III (6.2)", attack: 347, hp: "12.430", defense: 822 },
  { name: "ファルカ", country: "モンド", weapon: "両手剣", element: "風", birth_month: "２月", birthday: "2月17日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "集光の月ヤモリ", local_specialty: "ググプラム", ascension_stat: "会心ダメージ", distributed: false, talent_book: "自由", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna V (6.4)", attack: 353, hp: "12.613", defense: 795 },
  { name: "ローエン", country: "モンド", weapon: "長柄武器", element: "氷", birth_month: "４月", birthday: "4月3日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "集光の月ヤモリ", local_specialty: "フェザーモス", ascension_stat: "会心ダメージ", distributed: false, talent_book: "抗争", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "復活系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "Luna VII (6.6)", attack: 344, hp: "12.858", defense: 784 },
  { name: "プルーネ", country: "モンド", weapon: "法器", element: "風", birth_month: "１１月", birthday: "11月20日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター"], energy: 70, talent_boss: "霜夜の空を巡る霊主", local_specialty: "ヴィンテル草", ascension_stat: "攻撃力", distributed: false, talent_book: "抗争", talent_weekly: "賢医の仮面", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "Luna VII (6.6)", attack: 221, hp: "9.679", defense: 580 },
  { name: "魈", country: "璃月", weapon: "長柄武器", element: "風", birth_month: "４月", birthday: "4月17日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "清心", ascension_stat: "会心率", distributed: false, talent_book: "繁栄", talent_weekly: "武煉の魂・孤影", special_dish: "攻撃系", trace: true, costume: false, enemy_material: ["スライムの液体"], training_road: true, release_version: "1.3", attack: 349, hp: "12.736", defense: 799 },
  { name: "北斗", country: "璃月", weapon: "両手剣", element: "雷", birth_month: "２月", birthday: "2月14日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の雷", local_specialty: "夜泊石", ascension_stat: "雷元素ダメージ", distributed: true, talent_book: "黄金", talent_weekly: "東風の吐息", special_dish: "復活系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.0", attack: 225, hp: "13.050", defense: 648 },
  { name: "凝光", country: "璃月", weapon: "法器", element: "岩", birth_month: "８月", birthday: "8月26日", rarity: ['☆４'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の岩", local_specialty: "瑠璃百合", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "繁栄", talent_weekly: "北風の魂箱", special_dish: "復活系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "1.0", attack: 212, hp: "9.787", defense: 573 },
  { name: "香菱", country: "璃月", weapon: "長柄武器", element: "炎", birth_month: "１１月", birthday: "11月2日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 80, talent_boss: "爆炎樹", local_specialty: "絶雲の唐辛子", ascension_stat: "元素熟知", distributed: true, talent_book: "勤労", talent_weekly: "東風の爪", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.0", attack: 225, hp: "10.875", defense: 669 },
  { name: "行秋", country: "璃月", weapon: "片手剣", element: "水", birth_month: "１０月", birthday: "10月9日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 80, talent_boss: "純水精霊", local_specialty: "霓裳花", ascension_stat: "攻撃力", distributed: true, talent_book: "黄金", talent_weekly: "北風のしっぽ", special_dish: "継続回復系", trace: false, costume: true, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0", attack: 201, hp: "10.222", defense: 758 },
  { name: "重雲", country: "璃月", weapon: "両手剣", element: "氷", birth_month: "９月", birthday: "9月7日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 40, talent_boss: "急凍樹", local_specialty: "石珀", ascension_stat: "攻撃力", distributed: false, talent_book: "勤労", talent_weekly: "東風の吐息", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "1.0", attack: 223, hp: "10.984", defense: 648 },
  { name: "七七", country: "璃月", weapon: "片手剣", element: "氷", birth_month: "３月", birthday: "3月3日", rarity: ['☆５', '恒常☆５'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "急凍樹", local_specialty: "瑠璃袋", ascension_stat: "与える治療効果", distributed: false, talent_book: "繁栄", talent_weekly: "北風のしっぽ", special_dish: "攻撃系", trace: true, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "1.0", attack: 287, hp: "12.368", defense: 922 },
  { name: "刻晴", country: "璃月", weapon: "片手剣", element: "雷", birth_month: "１１月", birthday: "11月20日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の雷", local_specialty: "石珀", ascension_stat: "会心ダメージ", distributed: false, talent_book: "繁栄", talent_weekly: "北風のリング", special_dish: "回復系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.0", attack: 323, hp: "13.103", defense: 799 },
  { name: "鍾離", country: "璃月", weapon: "長柄武器", element: "岩", birth_month: "１２月", birthday: "12月31日", rarity: ['☆５'], body: "長身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 40, talent_boss: "無相の岩", local_specialty: "石珀", ascension_stat: "岩元素ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "吞天の鯨・只角", special_dish: "継続回復系", trace: true, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "1.1", attack: 251, hp: "14.695", defense: 738 },
  { name: "辛炎", country: "璃月", weapon: "両手剣", element: "炎", birth_month: "１０月", birthday: "10月16日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 60, talent_boss: "爆炎樹", local_specialty: "瑠璃袋", ascension_stat: "攻撃力", distributed: true, talent_book: "黄金", talent_weekly: "吞天の鯨・只角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.1", attack: 248, hp: "11.201", defense: 799 },
  { name: "甘雨", country: "璃月", weapon: "弓", element: "氷", birth_month: "１２月", birthday: "12月2日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "急凍樹", local_specialty: "清心", ascension_stat: "会心ダメージ", distributed: false, talent_book: "勤労", talent_weekly: "武煉の魂・孤影", special_dish: "回復系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.2", attack: 335, hp: "9.797", defense: 630 },
  { name: "胡桃", country: "璃月", weapon: "長柄武器", element: "炎", birth_month: "７月", birthday: "7月15日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "霓裳花", ascension_stat: "会心ダメージ", distributed: false, talent_book: "勤労", talent_weekly: "魔王の刃・残片", special_dish: "復活系", trace: false, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "1.3", attack: 106, hp: "15.552", defense: 876 },
  { name: "煙緋", country: "璃月", weapon: "法器", element: "炎", birth_month: "７月", birthday: "7月28日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "エンシェントヴィシャップ・岩", local_specialty: "夜泊石", ascension_stat: "炎元素ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "血玉の枝", special_dish: "復活系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.5", attack: 240, hp: "9.352", defense: 587 },
  { name: "申鶴", country: "璃月", weapon: "長柄武器", element: "氷", birth_month: "３月", birthday: "3月10日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "アビサルヴィシャップ", local_specialty: "清心", ascension_stat: "攻撃力", distributed: false, talent_book: "繁栄", talent_weekly: "獄炎の蝶", special_dish: "攻撃系", trace: true, costume: true, enemy_material: ["トリックフラワーの蜜"], training_road: true, release_version: "2.4", attack: 304, hp: "12.993", defense: 830 },
  { name: "雲菫", country: "璃月", weapon: "長柄武器", element: "岩", birth_month: "５月", birthday: "5月21日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "黄金王獣", local_specialty: "瑠璃百合", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "勤労", talent_weekly: "灰燼の心", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "2.4", attack: 191, hp: "10.657", defense: 734 },
  { name: "夜蘭", country: "璃月", weapon: "弓", element: "水", birth_month: "４月", birthday: "4月20日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "遺跡サーペント", local_specialty: "星螺", ascension_stat: "会心率", distributed: false, talent_book: "繁栄", talent_weekly: "鍍金の鱗", special_dish: "シールド系", trace: true, costume: true, enemy_material: ["新兵の記章"], training_road: false, release_version: "2.7", attack: 244, hp: "14.450", defense: 548 },
  { name: "ヨォーヨ", country: "璃月", weapon: "長柄武器", element: "草", birth_month: "３月", birthday: "3月6日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の草", local_specialty: "絶雲の唐辛子", ascension_stat: "HP", distributed: false, talent_book: "勤労", talent_weekly: "空行の虚鈴", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["スライムの液体"], training_road: false, release_version: "3.4", attack: 213, hp: "12.289", defense: 751 },
  { name: "白朮", country: "璃月", weapon: "法器", element: "草", birth_month: "４月", birthday: "4月25日", rarity: ['☆５'], body: "長身男性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 80, talent_boss: "深罪の浸礼者", local_specialty: "瑠璃袋", ascension_stat: "HP", distributed: false, talent_book: "黄金", talent_weekly: "天地に生える蕨", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.6", attack: 192, hp: "13.348", defense: 500 },
  { name: "閑雲", country: "璃月", weapon: "法器", element: "風", birth_month: "４月", birthday: "4月11日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "山隠れの猊獣", local_specialty: "清水玉", ascension_stat: "攻撃力", distributed: false, talent_book: "黄金", talent_weekly: "光なき渦の眼", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "4.4", attack: 334, hp: "10.409", defense: 573 },
  { name: "嘉明", country: "璃月", weapon: "両手剣", element: "炎", birth_month: "１２月", birthday: "12月22日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "鉄甲熔炎帝王", local_specialty: "星螺", ascension_stat: "攻撃力", distributed: false, talent_book: "繁栄", talent_weekly: "光なき一塊", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "4.4", attack: 302, hp: "11.419", defense: 703 },
  { name: "藍硯", country: "璃月", weapon: "法器", element: "風", birth_month: "１月", birthday: "1月6日", rarity: ['☆４'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・機構デバイス", local_specialty: "清水玉", ascension_stat: "攻撃力", distributed: false, talent_book: "勤労", talent_weekly: "蝕滅の陽炎", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "5.3", attack: 251, hp: "9.244", defense: 580 },
  { name: "兹白", country: "璃月", weapon: "片手剣", element: "岩", birth_month: "５月", birthday: "5月15日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "昏き魘夢の主", local_specialty: "瑠璃百合", ascension_stat: "会心ダメージ", distributed: false, talent_book: "黄金", talent_weekly: "昇揚のサンプル「王族」", special_dish: "防御系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna IV (6.3)", attack: 222, hp: "12.919", defense: 957 },
  { name: "神里綾華", country: "稲妻", weapon: "片手剣", element: "氷", birth_month: "９月", birthday: "9月28日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "恒常からくり陣形", local_specialty: "緋櫻毬", ascension_stat: "会心ダメージ", distributed: false, talent_book: "風雅", talent_weekly: "血玉の枝", special_dish: "復活系", trace: true, costume: true, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.0", attack: 342, hp: "12.858", defense: 784 },
  { name: "神里綾人", country: "稲妻", weapon: "片手剣", element: "水", birth_month: "３月", birthday: "3月26日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の水", local_specialty: "緋櫻毬", ascension_stat: "会心ダメージ", distributed: false, talent_book: "風雅", talent_weekly: "凶将の手眼", special_dish: "シールド系", trace: true, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.6", attack: 299, hp: "13.715", defense: 769 },
  { name: "楓原万葉", country: "稲妻", weapon: "片手剣", element: "風", birth_month: "１０月", birthday: "10月29日", rarity: ['☆５'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "魔偶剣鬼", local_specialty: "ウミレイシ", ascension_stat: "元素熟知", distributed: false, talent_book: "勤労", talent_weekly: "鍍金の鱗", special_dish: "回復系", trace: true, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "1.6", attack: 297, hp: "13.348", defense: 807 },
  { name: "宵宮", country: "稲妻", weapon: "弓", element: "炎", birth_month: "６月", birthday: "6月21日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "無相の炎", local_specialty: "鳴草", ascension_stat: "会心率", distributed: false, talent_book: "浮世", talent_weekly: "龍王の冠", special_dish: "回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "2.0", attack: 323, hp: "10.164", defense: 615 },
  { name: "早柚", country: "稲妻", weapon: "両手剣", element: "風", birth_month: "１０月", birthday: "10月19日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "魔偶剣鬼", local_specialty: "晶化骨髄", ascension_stat: "元素熟知", distributed: false, talent_book: "天光", talent_weekly: "鍍金の鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "2.0", attack: 244, hp: "11.854", defense: 745 },
  { name: "雷電将軍", country: "稲妻", weapon: "長柄武器", element: "雷", birth_month: "６月", birthday: "6月26日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー", "オンフィールドサポーター"], energy: 90, talent_boss: "雷音権現", local_specialty: "天雲草の実", ascension_stat: "元素チャージ効率", distributed: false, talent_book: "天光", talent_weekly: "溶滅の刻", special_dish: "", trace: true, costume: false, enemy_material: ["古びた鍔"], training_road: false, release_version: "2.1", attack: 337, hp: "12.907", defense: 789 },
  { name: "九条裟羅", country: "稲妻", weapon: "弓", element: "雷", birth_month: "７月", birthday: "7月14日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "雷音権現", local_specialty: "血石華", ascension_stat: "攻撃力", distributed: false, talent_book: "風雅", talent_weekly: "灰燼の心", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した仮面"], training_road: false, release_version: "2.1", attack: 195, hp: "9.570", defense: 628 },
  { name: "珊瑚宮心海", country: "稲妻", weapon: "法器", element: "水", birth_month: "２月", birthday: "2月22日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "無相の水", local_specialty: "珊瑚真珠", ascension_stat: "水元素ダメージ", distributed: false, talent_book: "浮世", talent_weekly: "獄炎の蝶", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: true, release_version: "2.1", attack: 234, hp: "13.471", defense: 657 },
  { name: "トーマ", country: "稲妻", weapon: "長柄武器", element: "炎", birth_month: "１月", birthday: "1月9日", rarity: ['☆４'], body: "長身男性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "無相の炎", local_specialty: "ユウトウタケ", ascension_stat: "攻撃力", distributed: false, talent_book: "浮世", talent_weekly: "獄炎の蝶", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "2.2", attack: 202, hp: "10.331", defense: 751 },
  { name: "荒瀧一斗", country: "稲妻", weapon: "両手剣", element: "岩", birth_month: "６月", birthday: "6月1日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "黄金王獣", local_specialty: "オニカブトムシ", ascension_stat: "会心率", distributed: false, talent_book: "風雅", talent_weekly: "灰燼の心", special_dish: "復活系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: true, release_version: "2.3", attack: 227, hp: "12.858", defense: 959 },
  { name: "ゴロー", country: "稲妻", weapon: "弓", element: "岩", birth_month: "５月", birthday: "5月18日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "恒常からくり陣形", local_specialty: "珊瑚真珠", ascension_stat: "岩元素ダメージ", distributed: true, talent_book: "天光", talent_weekly: "溶滅の刻", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.3", attack: 183, hp: "9.570", defense: 648 },
  { name: "八重神子", country: "稲妻", weapon: "法器", element: "雷", birth_month: "６月", birthday: "6月27日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドアタッカー"], energy: 90, talent_boss: "アビサルヴィシャップ", local_specialty: "ウミレイシ", ascension_stat: "会心率", distributed: false, talent_book: "天光", talent_weekly: "万劫の真意", special_dish: "復活系", trace: false, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "2.5", attack: 340, hp: "10.372", defense: 569 },
  { name: "久岐忍", country: "稲妻", weapon: "片手剣", element: "雷", birth_month: "７月", birthday: "7月27日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 60, talent_boss: "遺跡サーペント", local_specialty: "鳴草", ascension_stat: "HP", distributed: false, talent_book: "風雅", talent_weekly: "禍神の禊涙", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.7", attack: 212, hp: "12.289", defense: 751 },
  { name: "鹿野院平蔵", country: "稲妻", weapon: "法器", element: "風", birth_month: "７月", birthday: "7月24日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "遺跡サーペント", local_specialty: "オニカブトムシ", ascension_stat: "風元素ダメージ", distributed: false, talent_book: "浮世", talent_weekly: "万劫の真意", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["宝探しの鴉マーク"], training_road: false, release_version: "2.8", attack: 225, hp: "10.657", defense: 684 },
  { name: "綺良々", country: "稲妻", weapon: "片手剣", element: "草", birth_month: "１月", birthday: "1月22日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "深罪の浸礼者", local_specialty: "天雲草の実", ascension_stat: "HP", distributed: true, talent_book: "浮世", talent_weekly: "太古の樹海の一瞬", special_dish: "継続回復系", trace: true, costume: true, enemy_material: ["フライムの乾核"], training_road: false, release_version: "3.7", attack: 223, hp: "12.180", defense: 546 },
  { name: "千織", country: "稲妻", weapon: "片手剣", element: "岩", birth_month: "８月", birthday: "8月17日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 50, talent_boss: "氷風組曲コッペリア", local_specialty: "血石華", ascension_stat: "会心率", distributed: false, talent_book: "天光", talent_weekly: "光なき糸", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: true, release_version: "4.5", attack: 323, hp: "11.438", defense: 953 },
  { name: "夢見月瑞希", country: "稲妻", weapon: "法器", element: "風", birth_month: "３月", birthday: "3月16日", rarity: ['☆５', '恒常☆５'], body: "中身女性", role: ["オンフィールドアタッカー", "オンフィールドライフキーパー"], energy: 60, talent_boss: "迷える霊覚の修権者", local_specialty: "ウミレイシ", ascension_stat: "元素熟知", distributed: false, talent_book: "浮世", talent_weekly: "残火の灯燭", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "5.4", attack: 215, hp: "12.736", defense: 757 },
  { name: "ティナリ", country: "スメール", weapon: "弓", element: "草", birth_month: "１２月", birthday: "12月29日", rarity: ['☆５', '恒常☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "マッシュラプトル", local_specialty: "サウマラタ蓮", ascension_stat: "草元素ダメージ", distributed: false, talent_book: "忠言", talent_weekly: "万劫の真意", special_dish: "防御系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.0", attack: 268, hp: "10.850", defense: 630 },
  { name: "コレイ", country: "スメール", weapon: "弓", element: "草", birth_month: "５月", birthday: "5月8日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "マッシュラプトル", local_specialty: "ルッカデヴァータダケ", ascension_stat: "攻撃力", distributed: true, talent_book: "篤行", talent_weekly: "禍神の禊涙", special_dish: "回復系", trace: false, costume: false, enemy_material: ["牢固な矢先"], training_road: false, release_version: "3.0", attack: 200, hp: "9.787", defense: 601 },
  { name: "ドリー", country: "スメール", weapon: "両手剣", element: "雷", birth_month: "１２月", birthday: "12月21日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "迅電樹", local_specialty: "カルパラタ蓮", ascension_stat: "HP", distributed: true, talent_book: "創意", talent_weekly: "血玉の枝", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.0", attack: 223, hp: "12.397", defense: 723 },
  { name: "セノ", country: "スメール", weapon: "長柄武器", element: "雷", birth_month: "６月", birthday: "6月23日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "迅電樹", local_specialty: "聖金虫", ascension_stat: "会心ダメージ", distributed: false, talent_book: "忠言", talent_weekly: "凶将の手眼", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: true, release_version: "3.1", attack: 318, hp: "12.491", defense: 859 },
  { name: "キャンディス", country: "スメール", weapon: "長柄武器", element: "水", birth_month: "５月", birthday: "5月3日", rarity: ['☆４'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "半永久統制マトリックス", local_specialty: "赤念の実", ascension_stat: "HP", distributed: true, talent_book: "忠言", talent_weekly: "禍神の禊涙", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.1", attack: 213, hp: "10.875", defense: 683 },
  { name: "ニィロウ", country: "スメール", weapon: "片手剣", element: "水", birth_month: "１２月", birthday: "12月3日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 70, talent_boss: "兆載永劫ドレイク", local_specialty: "パティサラ", ascension_stat: "HP", distributed: false, talent_book: "篤行", talent_weekly: "禍神の禊涙", special_dish: "スタミナ軽減系", trace: false, costume: true, enemy_material: ["キノコンの胞子"], training_road: true, release_version: "3.1", attack: 229, hp: "15.185", defense: 729 },
  { name: "ナヒーダ", country: "スメール", weapon: "法器", element: "草", birth_month: "１０月", birthday: "10月27日", rarity: ['☆５'], body: "ロリ", role: ["オフフィールドアタッカー", "オフフィールドサポーター"], energy: 50, talent_boss: "無相の草", local_specialty: "カルパラタ蓮", ascension_stat: "元素熟知", distributed: false, talent_book: "創意", talent_weekly: "傀儡の糸", special_dish: "防御系", trace: true, costume: false, enemy_material: ["キノコンの胞子"], training_road: false, release_version: "3.2", attack: 299, hp: "10.360", defense: 630 },
  { name: "レイラ", country: "スメール", weapon: "片手剣", element: "氷", birth_month: "１２月", birthday: "12月19日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 40, talent_boss: "兆載永劫ドレイク", local_specialty: "サウマラタ蓮", ascension_stat: "HP", distributed: true, talent_book: "創意", talent_weekly: "無心の淵鏡", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["占いの絵巻"], training_road: false, release_version: "3.2", attack: 216, hp: "11.092", defense: 655 },
  { name: "放浪者", country: "スメール", weapon: "法器", element: "風", birth_month: "１月", birthday: "1月3日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "兆載永劫ドレイク", local_specialty: "ルッカデヴァータダケ", ascension_stat: "会心率", distributed: false, talent_book: "篤行", talent_weekly: "空行の虚鈴", special_dish: "治療効果系", trace: true, costume: false, enemy_material: ["古びた鍔"], training_road: true, release_version: "3.3", attack: 328, hp: "10.164", defense: 607 },
  { name: "ファルザン", country: "スメール", weapon: "弓", element: "風", birth_month: "８月", birthday: "8月20日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 80, talent_boss: "半永久統制マトリックス", local_specialty: "赤念の実", ascension_stat: "攻撃力", distributed: true, talent_book: "忠言", talent_weekly: "傀儡の糸", special_dish: "復活系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.3", attack: 197, hp: "9.570", defense: 628 },
  { name: "アルハイゼン", country: "スメール", weapon: "片手剣", element: "草", birth_month: "２月", birthday: "2月11日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "風食ウェネト", local_specialty: "砂脂蛹", ascension_stat: "草元素ダメージ", distributed: false, talent_book: "創意", talent_weekly: "無心の淵鏡", special_dish: "回復系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "3.4", attack: 313, hp: "13.348", defense: 782 },
  { name: "ディシア", country: "スメール", weapon: "両手剣", element: "炎", birth_month: "４月", birthday: "4月7日", rarity: ['☆５', '恒常☆５'], body: "長身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 70, talent_boss: "半永久統制マトリックス", local_specialty: "砂脂蛹", ascension_stat: "HP", distributed: false, talent_book: "篤行", talent_weekly: "傀儡の糸", special_dish: "HP強化系", trace: true, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: true, release_version: "3.5", attack: 266, hp: "15.675", defense: 628 },
  { name: "カーヴェ", country: "スメール", weapon: "両手剣", element: "草", birth_month: "７月", birthday: "7月9日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "無相の草", local_specialty: "悼霊花", ascension_stat: "元素熟知", distributed: false, talent_book: "創意", talent_weekly: "原初のオアシスの初咲き", special_dish: "復活系", trace: false, costume: false, enemy_material: ["キノコンの胞子"], training_road: false, release_version: "3.6", attack: 234, hp: "11.962", defense: 751 },
  { name: "セトス", country: "スメール", weapon: "弓", element: "雷", birth_month: "５月", birthday: "5月31日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "山隠れの猊獣", local_specialty: "サングイト", ascension_stat: "元素熟知", distributed: false, talent_book: "篤行", talent_weekly: "空行の虚鈴", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["色褪せた赤い絹"], training_road: false, release_version: "4.7", attack: 227, hp: "9.787", defense: 560 },
  { name: "リネ", country: "フォンテーヌ", weapon: "弓", element: "炎", birth_month: "２月", birthday: "2月2日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "鉄甲熔炎帝王", local_specialty: "レインボーローズ", ascension_stat: "会心率", distributed: false, talent_book: "公平", talent_weekly: "原初のオアシスの初咲き", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: true, release_version: "4.0", attack: 318, hp: "11.021", defense: 538 },
  { name: "リネット", country: "フォンテーヌ", weapon: "片手剣", element: "風", birth_month: "２月", birthday: "2月2日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "氷風組曲コッペリア", local_specialty: "ルミドゥースベル", ascension_stat: "風元素ダメージ", distributed: true, talent_book: "秩序", talent_weekly: "太古の樹海の一瞬", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.0", attack: 232, hp: "12.397", defense: 712 },
  { name: "フレミネ", country: "フォンテーヌ", weapon: "両手剣", element: "氷", birth_month: "９月", birthday: "9月24日", rarity: ['☆４'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "氷風組曲コペリウス", local_specialty: "ロマリタイムフラワー", ascension_stat: "攻撃力", distributed: true, talent_book: "正義", talent_weekly: "天地に生える蕨", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: false, release_version: "4.0", attack: 255, hp: "12.071", defense: 708 },
  { name: "ヌヴィレット", country: "フォンテーヌ", weapon: "法器", element: "水", birth_month: "１２月", birthday: "12月18日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "千年真珠の海駿", local_specialty: "ルエトワール", ascension_stat: "会心ダメージ", distributed: false, talent_book: "公平", talent_weekly: "太古の樹海の一瞬", special_dish: "攻撃系", trace: false, costume: true, enemy_material: ["異海の露"], training_road: false, release_version: "4.1", attack: 208, hp: "14.695", defense: 576 },
  { name: "リオセスリ", country: "フォンテーヌ", weapon: "法器", element: "氷", birth_month: "１１月", birthday: "11月23日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "実験用フィールド生成装置", local_specialty: "探測ユニット・子機", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "原初のオアシスの初咲き", special_dish: "回復系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: true, release_version: "4.1", attack: 311, hp: "13.593", defense: 763 },
  { name: "シャルロット", country: "フォンテーヌ", weapon: "法器", element: "氷", birth_month: "４月", birthday: "4月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 80, talent_boss: "実験用フィールド生成装置", local_specialty: "蒼晶螺", ascension_stat: "攻撃力", distributed: true, talent_book: "正義", talent_weekly: "光なき糸", special_dish: "スタミナ回復系", trace: false, costume: true, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.2", attack: 173, hp: "10.766", defense: 546 },
  { name: "フリーナ", country: "フォンテーヌ", weapon: "片手剣", element: "水", birth_month: "１０月", birthday: "10月13日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "水形タルパ", local_specialty: "湖光の鈴蘭", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "光なき一塊", special_dish: "HP強化系", trace: false, costume: false, enemy_material: ["トリックフラワーの蜜"], training_road: false, release_version: "4.2", attack: 244, hp: "15.307", defense: 696 },
  { name: "ナヴィア", country: "フォンテーヌ", weapon: "両手剣", element: "岩", birth_month: "８月", birthday: "8月16日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "氷風組曲コペリウス", local_specialty: "初露の源", ascension_stat: "会心ダメージ", distributed: false, talent_book: "公平", talent_weekly: "光なき糸", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: true, release_version: "4.3", attack: 352, hp: "12.650", defense: 793 },
  { name: "シュヴルーズ", country: "フォンテーヌ", weapon: "長柄武器", element: "炎", birth_month: "１月", birthday: "1月10日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "千年真珠の海駿", local_specialty: "ルミドゥースベル", ascension_stat: "HP", distributed: false, talent_book: "秩序", talent_weekly: "光なき渦の眼", special_dish: "治療効果系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "4.3", attack: 194, hp: "11.962", defense: 605 },
  { name: "クロリンデ", country: "フォンテーヌ", weapon: "片手剣", element: "雷", birth_month: "９月", birthday: "9月20日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "千年真珠の海駿", local_specialty: "ルエトワール", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "太古の樹海の一瞬", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: true, release_version: "4.7", attack: 338, hp: "12.956", defense: 784 },
  { name: "シグウィン", country: "フォンテーヌ", weapon: "弓", element: "水", birth_month: "３月", birthday: "3月30日", rarity: ['☆５'], body: "ロリ", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "水形タルパ", local_specialty: "ロマリタイムフラワー", ascension_stat: "HP", distributed: false, talent_book: "公平", talent_weekly: "光なき渦の眼", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["異海の露"], training_road: true, release_version: "4.7", attack: 192, hp: "13.348", defense: 500 },
  { name: "エミリエ", country: "フォンテーヌ", weapon: "長柄武器", element: "草", birth_month: "９月", birthday: "9月22日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 50, talent_boss: "魔像レガトゥス", local_specialty: "湖光の鈴蘭", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "絹織りの羽", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: true, release_version: "4.8", attack: 335, hp: "13.568", defense: 730 },
  { name: "エスコフィエ", country: "フォンテーヌ", weapon: "長柄武器", element: "氷", birth_month: "６月", birthday: "6月8日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・統御デバイス", local_specialty: "蒼晶螺", ascension_stat: "会心率", distributed: false, talent_book: "正義", talent_weekly: "蝕滅の焔角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "5.6", attack: 347, hp: "13.348", defense: 732 },
  { name: "イアンサ", country: "ナタ", weapon: "長柄武器", element: "雷", birth_month: "８月", birthday: "8月8日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 70, talent_boss: "深淵なるミミック・パピラ", local_specialty: "琉鱗石", ascension_stat: "攻撃力", distributed: false, talent_book: "角逐", talent_weekly: "否定と裁決", special_dish: "復活系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.5", attack: 257, hp: "10.657", defense: 638 },
  { name: "チャスカ", country: "ナタ", weapon: "弓", element: "風", birth_month: "１２月", birthday: "12月10日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "深淵なるミミック・パピラ", local_specialty: "枯れ紫菖", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "絹織りの羽", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.2", attack: 347, hp: "9.797", defense: 615 },
  { name: "ムアラニ", country: "ナタ", weapon: "法器", element: "水", birth_month: "８月", birthday: "8月3日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "暴君・金焔のクク竜", local_specialty: "波しぶきのエラ", ascension_stat: "会心率", distributed: false, talent_book: "角逐", talent_weekly: "光なき一塊", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.0", attack: 182, hp: "15.185", defense: 570 },
  { name: "オロルン", country: "ナタ", weapon: "弓", element: "雷", birth_month: "１０月", birthday: "10月14日", rarity: ['☆４'], body: "長身男性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "暴君・金焔のクク竜", local_specialty: "蛍光ツノキノコ", ascension_stat: "攻撃力", distributed: true, talent_book: "焚燼", talent_weekly: "光なき糸", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.2", attack: 244, hp: "9.244", defense: 587 },
  { name: "キィニチ", country: "ナタ", weapon: "両手剣", element: "草", birth_month: "１１月", birthday: "11月11日", rarity: ['☆５'], body: "中身男性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "山の王・貪食のユムカ竜", local_specialty: "サウリアンサキュレント", ascension_stat: "会心ダメージ", distributed: false, talent_book: "焚燼", talent_weekly: "否定と裁決", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.0", attack: 332, hp: "12.858", defense: 802 },
  { name: "カチーナ", country: "ナタ", weapon: "長柄武器", element: "岩", birth_month: "４月", birthday: "4月22日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドアタッカー"], energy: 70, talent_boss: "山の王・貪食のユムカ竜", local_specialty: "ケネパベリー", ascension_stat: "岩元素ダメージ", distributed: true, talent_book: "紛争", talent_weekly: "残火の灯燭", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.0", attack: 216, hp: "11.799", defense: 792 },
  { name: "シトラリ", country: "ナタ", weapon: "法器", element: "氷", birth_month: "１月", birthday: "1月20日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "迷える霊覚の修権者", local_specialty: "ケネパベリー", ascension_stat: "元素熟知", distributed: false, talent_book: "焚燼", talent_weekly: "否定と裁決", special_dish: "復活系", trace: false, costume: true, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.3", attack: 127, hp: "11.634", defense: 763 },
  { name: "マーヴィカ", country: "ナタ", weapon: "両手剣", element: "炎", birth_month: "８月", birthday: "8月28日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー", "オフフィールドアタッカー", "オンフィールドサポーター"], energy: 0, talent_boss: "秘源機兵・機構デバイス", local_specialty: "枯れ紫菖", ascension_stat: "会心ダメージ", distributed: false, talent_book: "角逐", talent_weekly: "蝕滅の焔角", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.3", attack: 359, hp: "12.552", defense: 792 },
  { name: "ヴァレサ", country: "ナタ", weapon: "法器", element: "雷", birth_month: "１１月", birthday: "11月15日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 70, talent_boss: "輝ける溶岩の龍像", local_specialty: "岩裂の花", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "蝕滅の羽鱗", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.5", attack: 356, hp: "12.699", defense: 782 },
  { name: "イファ", country: "ナタ", weapon: "法器", element: "風", birth_month: "３月", birthday: "3月23日", rarity: ['☆４'], body: "長身男性", role: ["オンフィールドライフキーパー"], energy: 60, talent_boss: "輝ける溶岩の龍像", local_specialty: "サウリアンサキュレント", ascension_stat: "元素熟知", distributed: false, talent_book: "紛争", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "防御系", trace: false, costume: false, enemy_material: ["未熟な牙"], training_road: false, release_version: "5.6", attack: 178, hp: "10.081", defense: 605 },
  { name: "シロネン", country: "ナタ", weapon: "片手剣", element: "岩", birth_month: "３月", birthday: "3月13日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・機構デバイス", local_specialty: "シャクギク", ascension_stat: "防御力", distributed: false, talent_book: "焚燼", talent_weekly: "無心の淵鏡", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.1", attack: 275, hp: "12.405", defense: 930 },
  { name: "タルタリヤ", country: "スネージナヤ", weapon: "弓", element: "水", birth_month: "７月", birthday: "7月20日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "純水精霊", local_specialty: "星螺", ascension_stat: "水元素ダメージ", distributed: false, talent_book: "自由", talent_weekly: "魔王の刃・残片", special_dish: "防御系", trace: true, costume: false, enemy_material: ["新兵の記章"], training_road: true, release_version: "1.1", attack: 301, hp: "13.103", defense: 815 },
  { name: "アルレッキーノ", country: "スネージナヤ", weapon: "長柄武器", element: "炎", birth_month: "８月", birthday: "8月22日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "魔像レガトゥス", local_specialty: "レインボーローズ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "秩序", talent_weekly: "残火の灯燭", special_dish: "回復系", trace: false, costume: false, enemy_material: ["新兵の記章"], training_road: false, release_version: "4.6", attack: 342, hp: "13.103", defense: 765 },
  { name: "イネファ", country: "ナドクライ", weapon: "長柄武器", element: "雷", birth_month: "４月", birthday: "4月2日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "秘源機兵・統御デバイス", local_specialty: "蛍光ツノキノコ", ascension_stat: "会心率", distributed: false, talent_book: "紛争", talent_weekly: "蝕滅の陽炎", special_dish: "シールド系", trace: false, costume: false, enemy_material: ["従戦士の木笛"], training_road: false, release_version: "5.8", attack: 330, hp: "12.613", defense: 828 },
  { name: "フリンズ", country: "ナドクライ", weapon: "長柄武器", element: "雷", birth_month: "１０月", birthday: "10月31日", rarity: ['☆５'], body: "長身男性", role: ["オンフィールドアタッカー"], energy: 80, talent_boss: "ボコボコダック", local_specialty: "フロストランプ", ascension_stat: "会心ダメージ", distributed: false, talent_book: "流浪", talent_weekly: "昇揚のサンプル「王族」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna I (6.0)", attack: 352, hp: "12.491", defense: 809 },
  { name: "アイノ", country: "ナドクライ", weapon: "両手剣", element: "水", birth_month: "９月", birthday: "9月21日", rarity: ['☆４'], body: "ロリ", role: ["オフフィールドサポーター"], energy: 50, talent_boss: "ボコボコダック", local_specialty: "携行型ベアリング", ascension_stat: "元素熟知", distributed: true, talent_book: "楽園", talent_weekly: "絹織りの羽", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna I (6.0)", attack: 242, hp: "11.201", defense: 607 },
  { name: "ラウマ", country: "ナドクライ", weapon: "法器", element: "草", birth_month: "３月", birthday: "3月1日", rarity: ['☆５'], body: "長身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "集光の幻月蝶", local_specialty: "月落銀", ascension_stat: "元素熟知", distributed: false, talent_book: "月光", talent_weekly: "蝕滅の羽鱗", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna I (6.0)", attack: 255, hp: "10.654", defense: 669 },
  { name: "ネフェル", country: "ナドクライ", weapon: "法器", element: "草", birth_month: "５月", birthday: "5月9日", rarity: ['☆５'], body: "長身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "霜夜の空を巡る霊主", local_specialty: "月落銀", ascension_stat: "会心ダメージ", distributed: false, talent_book: "楽園", talent_weekly: "昇揚のサンプル「ルーク」", special_dish: "復活系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna II (6.1)", attack: 344, hp: "12.704", defense: 799 },
  { name: "ヤフォダ", country: "ナドクライ", weapon: "弓", element: "風", birth_month: "１月", birthday: "1月5日", rarity: ['☆４'], body: "中身女性", role: ["オフフィールドライフキーパー"], energy: 70, talent_boss: "集光の幻月蝶", local_specialty: "携行型ベアリング", ascension_stat: "与える治療効果", distributed: true, talent_book: "流浪", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna III (6.2)", attack: 223, hp: "9.646", defense: 580 },
  { name: "コロンビーナ", country: "ナドクライ", weapon: "法器", element: "水", birth_month: "１月", birthday: "1月14日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "霜夜の空を巡る霊主", local_specialty: "ヴィンテル草", ascension_stat: "会心率", distributed: false, talent_book: "月光", talent_weekly: "賢医の仮面", special_dish: "HP強化系", trace: false, costume: false, enemy_material: ["スライムの液体"], training_road: false, release_version: "Luna IV (6.3)", attack: 96, hp: "14.695", defense: 515 },
  { name: "イルーガ", country: "ナドクライ", weapon: "長柄武器", element: "岩", birth_month: "１２月", birthday: "12月23日", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター"], energy: 60, talent_boss: "重量級陸巡艦「バトルシップ」", local_specialty: "琥珀香", ascension_stat: "元素熟知", distributed: false, talent_book: "楽園", talent_weekly: "蝕滅の焔角", special_dish: "回復系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna IV (6.3)", attack: 191, hp: "11.962", defense: 814 },
  { name: "リンネア", country: "ナドクライ", weapon: "弓", element: "岩", birth_month: "５月", birthday: "5月23日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー", "オフフィールドライフキーパー"], energy: 60, talent_boss: "守護者・堕天", local_specialty: "フェザーモス", ascension_stat: "会心率", distributed: false, talent_book: "流浪", talent_weekly: "異端の薬瓶", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna VI (6.5)", attack: 144, hp: "9.895", defense: 907 },
  { name: "ニコ", country: "例外", weapon: "法器", element: "炎", birth_month: "９月", birthday: "9月29日", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター", "オフフィールドライフキーパー"], energy: 60, talent_boss: "昏き魘夢の主", local_specialty: "琥珀香", ascension_stat: "攻撃力", distributed: false, talent_book: "楽園", talent_weekly: "偽りの樹脂", special_dish: "スタミナ回復系", trace: false, costume: false, enemy_material: ["破損した徽章"], training_road: false, release_version: "Luna VII (6.6)", attack: 342, hp: "10.409", defense: 563 },
  { name: "サンドローネ", country: "スネージナヤ", weapon: "両手剣", element: "氷", birth_month: "１月", birthday: "1月13日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "守護者・堕天", local_specialty: "探測ユニット・子機", ascension_stat: "会心率", distributed: false, talent_book: "流浪", talent_weekly: "狂人の誓約", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["破損した駆動軸"], training_road: false, release_version: "Luna VIII (6.7)", attack: 342, hp: "13.226", defense: 752 }, 
  { name: "アリョーシャ", country: "スネージナヤ", weapon: "長柄武器", element: "雷", birth_month: "２月", birthday: "2月9日", version: "n.0", rarity: ['☆４'], body: "中身男性", role: ["オフフィールドサポーター","オフフィールドライフキーパー"], energy: 70, talent_boss: "合成獣・フリューゲルレーヴェ", local_specialty: "フロック草", ascension_stat: "元素チャージ効率", distributed: true, talent_book: "堅忍", talent_weekly: "異端の薬瓶", special_dish: "スタミナ軽減系", trace: false, costume: false, enemy_material: ["異種合成魔獣"], training_road: false, release_version: "7.0", attack: 265, hp: "11.962", defense: 703 },
  { name: "オデット", country: "スネージナヤ", weapon: "片手剣", element: "氷", birth_month: "２月", birthday: "2月20日", version: "n.0", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドアタッカー"], energy: 60, talent_boss: "不滅の副産物", local_specialty: "フロストフラワー", ascension_stat: "会心ダメージ", distributed: false, talent_book: "慈愛", talent_weekly: "歪曲した枯れ枝", special_dish: "攻撃系", trace: false, costume: false, enemy_material: ["幻造蛍屑"], training_road: false, release_version: "7.0", attack: 335, hp: "12.981", defense: 787 },
  { name: "ヴェスナ", country: "スネージナヤ", weapon: "片手剣", element: "風", birth_month: "２月", birthday: "2月14日", version: "n.1", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "游雪のブレードガーディアン", local_specialty: "ザラトイアリャーク", ascension_stat: "HP", distributed: false, talent_book: "栄光", talent_weekly: "冒涜の新芽", special_dish: "防御系", trace: false, costume: false, enemy_material: ["幻光の屑"], training_road: false, release_version: "7.1", attack: 354, hp: "13.262", defense: 730 },
  { name: "ヴォジャニーツァ", country: "スネージナヤ", weapon: "法器", element: "水", birth_month: "３月", birthday: "3月29日", version: "n.1", rarity: ['☆５'], body: "中身女性", role: ["オフフィールドサポーター","オフフィールドライフキーパー"], energy: 60, talent_boss: "不滅の副産物", local_specialty: "フロストフラワー", ascension_stat: "HP", distributed: false, talent_book: "不屈", talent_weekly: "狂人の誓約", special_dish: "継続回復系", trace: false, costume: false, enemy_material: ["合成獣のコア"], training_road: false, release_version: "7.1", attack: 108, hp: "14.818", defense: 484 },
  { name: "ミティヤ", country: "スネージナヤ", weapon: "法器", element: "雷", birth_month: "", birthday: "", version: "n.2", rarity: ['☆５'], body: "中身男性", role: [], energy:0 , talent_boss: "", local_specialty: "", ascension_stat: "", distributed: false, talent_book: "", talent_weekly: "", special_dish: "", trace: false, costume: false, enemy_material: [""], training_road: false, release_version: "7.2" },
  { name: "バレリー", country: "スネージナヤ", weapon: "片手剣", element: "雷", birth_month: "", birthday: "", version: "n.2", rarity: ['☆４'], body: "長身男性", role: [], energy:0 , talent_boss: "", local_specialty: "", ascension_stat: "", distributed: false, talent_book: "", talent_weekly: "", special_dish: "", trace: false, costume: false, enemy_material: [""], training_road: false, release_version: "7.2" },
  { name: "旅人", country: "例外", weapon: "片手剣", element: "その他", birth_month: "その他", birthday: "なし", rarity: ['☆５'], body: "中身男性/中身女性", role: ["オンフィールドアタッカー"], energy: 60, talent_boss: "", local_specialty: "風車アスター", ascension_stat: "攻撃力", distributed: true, talent_book: "自由", talent_weekly: "", special_dish: "", trace: false, costume: true, enemy_material: [], training_road: false, release_version: "1.0", displayNames: ["空", "蛍"], enabled: true, attack: 212, hp: "10.875", defense: 683 },
  { name: "スカーク", country: "例外", weapon: "片手剣", element: "氷", birth_month: "１１月", birthday: "11月5日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 0, talent_boss: "深淵なるミミック・パピラ", local_specialty: "岩裂の花", ascension_stat: "会心ダメージ", distributed: false, talent_book: "角逐", talent_weekly: "昇揚のサンプル「ナイト」", special_dish: "回復系", trace: false, costume: false, enemy_material: ["整合の歯車"], training_road: false, release_version: "5.7", attack: 359, hp: "12.417", defense: 806 },
  { name: "アーロイ", country: "例外", weapon: "弓", element: "氷", birth_month: "４月", birthday: "4月4日", rarity: ['☆５'], body: "中身女性", role: ["オンフィールドアタッカー"], energy: 40, talent_boss: "無相の氷", local_specialty: "晶化骨髄", ascension_stat: "氷元素ダメージ", distributed: true, talent_book: "自由", talent_weekly: "溶滅の刻", special_dish: "回復系", trace: false, costume: false, enemy_material: ["フライムの乾核"], training_road: false, release_version: "2.1", enabled: true, attack: 234, hp: "10.899", defense: 676 },
];


const CHARACTER_BASE_STATS = CHARACTER_BASE_STATS_TEXT
  .trim()
  .split('\n')
  .reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;
    const [name, values] = trimmed.split('：');
    if (!name || !values) return acc;
    const [baseAtkRaw, baseHpRaw, baseDefRaw] = values.split('、').map(v => v.trim());
    if (!baseAtkRaw || !baseHpRaw || !baseDefRaw) return acc;
    acc[name.trim()] = { baseAtkRaw, baseHpRaw, baseDefRaw };
    return acc;
  }, {});

function parseBaseStatValue(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  // 入力データは "13.348" のようにドット区切り表記のため、数値比較用にドットを取り除いて扱う。
  const normalized = String(raw).replace(/\./g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

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
  const readings = CHARACTER_READINGS[raw.name] || [];
  const allNames = [raw.name, ...(raw.displayNames || []), ...readings].filter(Boolean);
  const baseStats = CHARACTER_BASE_STATS[raw.name];
  const baseAtk = baseStats ? parseBaseStatValue(baseStats.baseAtkRaw) : null;
  const baseHp = baseStats ? parseBaseStatValue(baseStats.baseHpRaw) : null;
  const baseDef = baseStats ? parseBaseStatValue(baseStats.baseDefRaw) : null;

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
    baseAtk,
    baseHp,
    baseDef,
    baseAtkLabel: baseStats ? baseStats.baseAtkRaw : '',
    baseHpLabel: baseStats ? baseStats.baseHpRaw : '',
    baseDefLabel: baseStats ? baseStats.baseDefRaw : '',
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
  { key: 'rarity',            label: 'レアリティ',    type: 'numeric', defaultOn: true  },
  { key: 'baseAtk',           label: '基礎攻撃力',    type: 'numeric', defaultOn: false  },
  { key: 'baseHp',            label: '基礎HP',       type: 'numeric', defaultOn: false  },
  { key: 'baseDef',           label: '基礎防御力',    type: 'numeric', defaultOn: false  },
  { key: 'country',           label: '国',           type: 'exact',   defaultOn: true  },
  { key: 'body',              label: '体型',         type: 'exact',   defaultOn: true  },
  { key: 'releaseVersionNum', label: '実装Ver',       type: 'numeric', defaultOn: true  },
  { key: 'energy',            label: 'エネルギー',    type: 'numeric', defaultOn: true  },
  { key: 'birthMonth',        label: '誕生月',        type: 'exact',   defaultOn: false },
  { key: 'talentBook',        label: '天賦本',        type: 'group',   group: 'talentBookGroup', defaultOn: true  },
  { key: 'talentWeekly',      label: '週ボス素材',    type: 'group',   group: 'weeklyBossGroup', defaultOn: true  },
  { key: 'talentBoss',        label: '突破ボス',      type: 'exact',   defaultOn: false },
  { key: 'localSpecialty',    label: '特産品',        type: 'group',   group: 'localSpecialtyGroup', defaultOn: true  },
  { key: 'ascensionStat',     label: '突破ステ',      type: 'group',   group: 'ascensionStatGroup', defaultOn: true  },
  { key: 'specialDish',       label: 'オリジナル料理',      type: 'exact',   defaultOn: false },
  { key: 'distributed',       label: '配布',         type: 'exact',   defaultOn: true  },
  { key: 'costume',           label: '別衣装',         type: 'exact',   defaultOn: false },
  { key: 'trace',             label: '軌跡の有無',      type: 'exact',   defaultOn: false },
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
    case 'baseAtk':      return char.baseAtkLabel || String(value);
    case 'baseHp':       return char.baseHpLabel || String(value);
    case 'baseDef':      return char.baseDefLabel || String(value);
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


// ===========================================================================
// 武器モード データ（ユーザー整理版 WEAPONS_DATA）
// ===========================================================================

const WEAPONS_DATA = [
  { name: "アモスの弓", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "シャープシューターの誓い", rarity: 3, weapon_type: "弓", base_atk: 448, ascension_stat: "会心ダメージ", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "チ虎魚の刀", rarity: 3, weapon_type: "片手剣", base_atk: 401, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "ポケット魔導書", rarity: 2, weapon_type: "法器", base_atk: 243, ascension_stat: null, enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "リカーブボウ", rarity: 3, weapon_type: "弓", base_atk: 354, ascension_stat: "HP", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "リングボウ", rarity: 4, weapon_type: "弓", base_atk: 454, ascension_stat: "物理ダメージ", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "傭兵の重剣", rarity: 2, weapon_type: "両手剣", base_atk: 243, ascension_stat: null, enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "冷刃", rarity: 3, weapon_type: "片手剣", base_atk: 401, ascension_stat: "攻撃力", enemy_material: "重い角笛", break_material: null, distributed: false, release_version: "1.0" },
  { name: "匣中日月", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心率", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "匣中滅龍", rarity: 4, weapon_type: "長柄武器", base_atk: 454, ascension_stat: "元素熟知", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "匣中龍吟", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "古華・試作", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "和璞鳶", rarity: 5, weapon_type: "長柄武器", base_atk: 674, ascension_stat: "会心率", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "四風原典", rarity: 5, weapon_type: "法器", base_atk: 608, ascension_stat: "会心率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "天目影打", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "攻撃力", enemy_material: "混沌の機関", break_material: "遠海夷地の金枝", distributed: false, release_version: "2.0" },
  { name: "天空の傲", rarity: 5, weapon_type: "両手剣", base_atk: 674, ascension_stat: "元素チャージ効率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "天空の刃", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "元素チャージ効率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "天空の巻", rarity: 5, weapon_type: "法器", base_atk: 674, ascension_stat: "攻撃力", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "天空の翼", rarity: 5, weapon_type: "弓", base_atk: 674, ascension_stat: "会心率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "天空の脊", rarity: 5, weapon_type: "長柄武器", base_atk: 674, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "弓蔵", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "弾弓", rarity: 3, weapon_type: "弓", base_atk: 354, ascension_stat: "会心率", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "文使い", rarity: 3, weapon_type: "弓", base_atk: 448, ascension_stat: "会心ダメージ", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "斬岩・試作", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "物理ダメージ", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "新米の長槍", rarity: 1, weapon_type: "長柄武器", base_atk: 185, ascension_stat: null, enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "旅道の剣", rarity: 3, weapon_type: "片手剣", base_atk: 448, ascension_stat: "防御力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "旧貴族大剣", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "旧貴族秘法録", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "旧貴族長剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "旧貴族長弓", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: null, distributed: false, release_version: "1.0" },
  { name: "星鎌・試作", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "昭心", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "暗鉄剣", rarity: 3, weapon_type: "片手剣", base_atk: 401, ascension_stat: "元素熟知", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "歴戦の狩猟弓", rarity: 2, weapon_type: "弓", base_atk: 243, ascension_stat: null, enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "死闘の槍", rarity: 4, weapon_type: "長柄武器", base_atk: 454, ascension_stat: "会心率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "流月の針", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "物理ダメージ", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "流浪楽章", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "澹月・試作", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "無鋒の剣", rarity: 1, weapon_type: "片手剣", base_atk: 185, ascension_stat: null, enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "特級の宝玉", rarity: 3, weapon_type: "法器", base_atk: 448, ascension_stat: "会心率", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "狩猟弓", rarity: 1, weapon_type: "弓", base_atk: 185, ascension_stat: null, enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "狼の末路", rarity: 5, weapon_type: "両手剣", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "理屈責め", rarity: 3, weapon_type: "両手剣", base_atk: 401, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "生徒ノート", rarity: 1, weapon_type: "法器", base_atk: 185, ascension_stat: null, enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "異世界旅行記", rarity: 3, weapon_type: "法器", base_atk: 401, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "白影の剣", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "防御力", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "白纓槍", rarity: 3, weapon_type: "長柄武器", base_atk: 401, ascension_stat: "会心率", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "白鉄の大剣", rarity: 3, weapon_type: "両手剣", base_atk: 401, ascension_stat: "防御力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "祭礼の剣", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "祭礼の大剣", rarity: 4, weapon_type: "両手剣", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "祭礼の弓", rarity: 4, weapon_type: "弓", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "祭礼の断片", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "元素熟知", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "笛の剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "絶弦", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "翡玉法珠", rarity: 3, weapon_type: "法器", base_atk: 448, ascension_stat: "元素熟知", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "蒼翠の狩猟弓", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "会心率", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "螭龍の剣", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "会心率", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "西風剣", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "西風大剣", rarity: 4, weapon_type: "両手剣", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "西風猟弓", rarity: 4, weapon_type: "弓", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "西風秘典", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "西風長槍", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "訓練用大剣", rarity: 1, weapon_type: "両手剣", base_atk: 185, ascension_stat: null, enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "鉄尖槍", rarity: 2, weapon_type: "長柄武器", base_atk: 243, ascension_stat: null, enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.0" },
  { name: "鉄影段平", rarity: 3, weapon_type: "両手剣", base_atk: 401, ascension_stat: "HP", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "鉄蜂の刺し", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "鉾槍", rarity: 3, weapon_type: "長柄武器", base_atk: 448, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "銀の剣", rarity: 2, weapon_type: "片手剣", base_atk: 243, ascension_stat: null, enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "金珀・試作", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "HP", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "鍾の剣", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "HP", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "降臨の剣", rarity: 4, weapon_type: "片手剣", base_atk: 440, ascension_stat: "攻撃力", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "雨裁", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "風鷹剣", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "物理ダメージ", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "飛天大御剣", rarity: 3, weapon_type: "両手剣", base_atk: 401, ascension_stat: "物理ダメージ", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "飛天御剣", rarity: 3, weapon_type: "片手剣", base_atk: 354, ascension_stat: "元素チャージ効率", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "魔導緒論", rarity: 3, weapon_type: "法器", base_atk: 354, ascension_stat: "元素熟知", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "鴉羽の弓", rarity: 3, weapon_type: "弓", base_atk: 401, ascension_stat: "元素熟知", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.0" },
  { name: "黎明の神剣", rarity: 3, weapon_type: "片手剣", base_atk: 401, ascension_stat: "会心ダメージ", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "黒剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "会心率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "黒岩の戦弓", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "会心ダメージ", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "黒岩の斬刀", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "霧虚ろの花粉", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "黒岩の突槍", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.0" },
  { name: "黒岩の緋玉", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.0" },
  { name: "黒岩の長剣", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "会心ダメージ", enemy_material: "猟兵の刀", break_material: null, distributed: false, release_version: "1.0" },
  { name: "黒纓槍", rarity: 3, weapon_type: "長柄武器", base_atk: 354, ascension_stat: "HP", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.0" },
  { name: "龍殺しの英傑譚", rarity: 3, weapon_type: "法器", base_atk: null, ascension_stat: "HP", enemy_material: "地脈の旧枝", break_material: null, distributed: false, release_version: "1.0" },
  { name: "龍殺しの英雄譚", rarity: null, weapon_type: null, base_atk: 401, ascension_stat: null, enemy_material: null, break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "龍血を浴びた剣", rarity: 3, weapon_type: "両手剣", base_atk: 354, ascension_stat: "元素熟知", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.0" },
  { name: "旧貴族猟槍", rarity: 4, weapon_type: "長柄武器", base_atk: null, ascension_stat: "攻撃力", enemy_material: "新兵の記章", break_material: "霧海雲間の転還", distributed: false, release_version: "1.1" },
  { name: "浮世の錠", rarity: 5, weapon_type: "法器", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.1" },
  { name: "無工の剣", rarity: 5, weapon_type: "両手剣", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.1" },
  { name: "破天の槍", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.1" },
  { name: "ドラゴンスピア", rarity: 4, weapon_type: "長柄武器", base_atk: 454, ascension_stat: "物理ダメージ", enemy_material: "霧虚ろの花粉", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.2" },
  { name: "冬忍びの実", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.2" },
  { name: "腐食の剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "重い角笛", break_material: "獅牙戦士の理想", distributed: true, release_version: "1.2" },
  { name: "斬山の刃", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "攻撃力", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.2" },
  { name: "雪葬の星銀", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "物理ダメージ", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.2" },
  { name: "千岩古剣", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "猟兵の刀", break_material: "孤雲寒林の神体", distributed: false, release_version: "1.3" },
  { name: "千岩長槍", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.3" },
  { name: "盤岩結緑", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "会心率", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "1.3" },
  { name: "護摩の杖", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "地脈の旧枝", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "1.3" },
  { name: "ダークアレイの狩人", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.4" },
  { name: "ダークアレイの酒と詩", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.4" },
  { name: "ダークアレイの閃光", rarity: 4, weapon_type: "片手剣", base_atk: 620, ascension_stat: "元素熟知", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.4" },
  { name: "終焉を嘆く詩", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "元素チャージ効率", enemy_material: "重い角笛", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "1.4" },
  { name: "風花の頌歌", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "地脈の旧枝", break_material: "獅牙戦士の理想", distributed: true, release_version: "1.4" },
  { name: "松韻の響く頃", rarity: 5, weapon_type: "両手剣", base_atk: 741, ascension_stat: "物理ダメージ", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.5" },
  { name: "ドドコの物語", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "攻撃力", enemy_material: "地脈の旧枝", break_material: "凛風奔狼の郷愁", distributed: true, release_version: "1.6" },
  { name: "幽夜のワルツ", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "物理ダメージ", enemy_material: "重い角笛", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "1.6" },
  { name: "蒼古なる自由への誓い", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "元素熟知", enemy_material: "混沌の装置", break_material: "獅牙戦士の理想", distributed: false, release_version: "1.6" },
  { name: "喜多院十文字槍", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素熟知", enemy_material: "混沌の機関", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.0" },
  { name: "桂木斬長正", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "混沌の機関", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.0" },
  { name: "白辰の輪", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "暗色のプリズム", break_material: "遠海夷地の金枝", distributed: false, release_version: "2.0" },
  { name: "破魔の弓", rarity: 4, weapon_type: "弓", base_atk: 454, ascension_stat: "攻撃力", enemy_material: "暗色のプリズム", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.0" },
  { name: "霧切の廻光", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "混沌の機関", break_material: "遠海夷地の金枝", distributed: false, release_version: "2.0" },
  { name: "飛来の鳴弦", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "暗色のプリズム", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.0" },
  { name: "「漁獲」", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "混沌の機関", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.1" },
  { name: "プレデター", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "暗色のプリズム", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.1" },
  { name: "不滅の月華", rarity: 5, weapon_type: "法器", base_atk: 608, ascension_stat: "HP", enemy_material: "暗色のプリズム", break_material: "遠海夷地の金枝", distributed: false, release_version: "2.1" },
  { name: "草薙の稲光", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "元素チャージ効率", enemy_material: "混沌の機関", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.1" },
  { name: "銜玉の海皇", rarity: 4, weapon_type: "両手剣", base_atk: 454, ascension_stat: "攻撃力", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: true, release_version: "2.1" },
  { name: "冬極の白星", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "会心率", enemy_material: "隠獣の指爪", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.2" },
  { name: "惡王丸", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "隠獣の指爪", break_material: "遠海夷地の金枝", distributed: false, release_version: "2.2" },
  { name: "斬波のひれ長", rarity: 4, weapon_type: "長柄武器", base_atk: 620, ascension_stat: "攻撃力", enemy_material: "隠獣の指爪", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.2" },
  { name: "曚雲の月", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "暗色のプリズム", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.2" },
  { name: "シナバースピンドル", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "防御力", enemy_material: "混沌の装置", break_material: "高塔の王の砕けた夢", distributed: true, release_version: "2.3" },
  { name: "赤角石塵滅砕", rarity: 5, weapon_type: "両手剣", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "隠獣の指爪", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.3" },
  { name: "息災", rarity: 5, weapon_type: "長柄武器", base_atk: 741, ascension_stat: "攻撃力", enemy_material: "霧虚ろの花粉", break_material: "霧海雲間の転還", distributed: false, release_version: "2.4" },
  { name: "神楽の真意", rarity: 5, weapon_type: "法器", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "隠獣の指爪", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.5" },
  { name: "誓いの明瞳", rarity: 4, weapon_type: "法器", base_atk: null, ascension_stat: "攻撃力", enemy_material: "隠獣の指爪", break_material: null, distributed: true, release_version: "2.5" },
  { name: "波乱月白経津", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "会心率", enemy_material: "暗晦の彫刻", break_material: "鳴神御霊の勇武", distributed: false, release_version: "2.6" },
  { name: "若水", rarity: 5, weapon_type: "弓", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "暗晦の彫刻", break_material: "孤雲寒林の神体", distributed: false, release_version: "2.7" },
  { name: "落霞", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "猟兵の刀", break_material: "漆黒の隕鉄の塊", distributed: true, release_version: "2.7" },
  { name: "籠釣瓶一心", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "暗晦の彫刻", break_material: "今昔劇画の鬼人", distributed: false, release_version: "2.8" },
  { name: "ムーンピアサー", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素熟知", enemy_material: "混沌ストレージ", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "3.0" },
  { name: "原木刀", rarity: 4, weapon_type: "片手剣", base_atk: null, ascension_stat: "元素チャージ効率", enemy_material: "混沌ストレージ", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "3.0" },
  { name: "森林のレガリア", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "混沌ストレージ", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "3.0" },
  { name: "満悦の実", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "暗晦の彫刻", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "3.0" },
  { name: "王の近侍", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "キノコンの衰菌核", break_material: "烈日権威の往日", distributed: false, release_version: "3.0" },
  { name: "竭沢", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "キノコンの衰菌核", break_material: null, distributed: false, release_version: "3.0" },
  { name: "狩人の道", rarity: 5, weapon_type: "弓", base_atk: 542, ascension_stat: "会心率", enemy_material: "キノコンの衰菌核", break_material: "烈日権威の往日", distributed: false, release_version: "3.0" },
  { name: "サイフォスの月明かり", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "壊れたプリズム", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "3.1" },
  { name: "マカイラの水色", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "混沌ストレージ", break_material: "烈日権威の往日", distributed: false, release_version: "3.1" },
  { name: "彷徨える星", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "キノコンの衰菌核", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "3.1" },
  { name: "聖顕の鍵", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "HP", enemy_material: "壊れたプリズム", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "3.1" },
  { name: "赤砂の杖", rarity: 5, weapon_type: "長柄武器", base_atk: 542, ascension_stat: "会心率", enemy_material: "混沌ストレージ", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "3.1" },
  { name: "風信の矛", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "暗晦の彫刻", break_material: "凛風奔狼の郷愁", distributed: true, release_version: "3.1" },
  { name: "千夜に浮かぶ夢", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "元素熟知", enemy_material: "壊れたプリズム", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "3.2" },
  { name: "トゥライトゥーラの記憶", rarity: 5, weapon_type: "法器", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "キノコンの衰菌核", break_material: "烈日権威の往日", distributed: false, release_version: "3.3" },
  { name: "東花坊時雨", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "壊れたプリズム", break_material: "鳴神御霊の勇武", distributed: true, release_version: "3.3" },
  { name: "翠光の裁葉", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "毀れた背骨", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "3.4" },
  { name: "鉄彩の花", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "元素熟知", enemy_material: "毀れた背骨", break_material: "獅牙戦士の理想", distributed: true, release_version: "3.5" },
  { name: "葦海の標", rarity: 5, weapon_type: "両手剣", base_atk: 608, ascension_stat: "会心率", enemy_material: "毀れた背骨", break_material: "烈日権威の往日", distributed: false, release_version: "3.5" },
  { name: "碧落の瓏", rarity: 5, weapon_type: "法器", base_atk: 608, ascension_stat: "HP", enemy_material: "何処かで摘まれた咲きかけの花", break_material: "孤雲寒林の神体", distributed: false, release_version: "3.6" },
  { name: "トキの嘴", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "何処かで摘まれた咲きかけの花", break_material: "静謐な森のしずくの金符", distributed: true, release_version: "3.7" },
  { name: "サーンドルの渡し守", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "濁水のひとしずく", break_material: "悠久の弦の響き", distributed: false, release_version: "4.0" },
  { name: "タイダル・シャドー", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "隙間のコア", break_material: "無垢な海の金盃", distributed: false, release_version: "4.0" },
  { name: "フィヨルドの歌", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "会心率", enemy_material: "何処かで摘まれた咲きかけの花", break_material: "無垢な海の金盃", distributed: false, release_version: "4.0" },
  { name: "古祠の瓏", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "会心率", enemy_material: "霧虚ろの花粉", break_material: "孤雲寒林の神体", distributed: false, release_version: "4.0" },
  { name: "始まりの大魔術", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "濁水のひとしずく", break_material: "悠久の弦の響き", distributed: false, release_version: "4.0" },
  { name: "正義の報酬", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "HP", enemy_material: "隙間のコア", break_material: "無垢な海の金盃", distributed: false, release_version: "4.0" },
  { name: "海淵のフィナーレ", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "濁水のひとしずく", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.0" },
  { name: "烈日の後嗣", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "会心率", enemy_material: "何処かで摘まれた咲きかけの花", break_material: "烈日権威の往日", distributed: false, release_version: "4.0" },
  { name: "純水流華", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "隙間のコア", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.0" },
  { name: "話死合い棒", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "会心率", enemy_material: "毀れた背骨", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "4.0" },
  { name: "狼牙", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "会心率", enemy_material: "混沌の装置", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "4.0" },
  { name: "静寂の唄", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "濁水のひとしずく", break_material: "悠久の弦の響き", distributed: false, release_version: "4.0" },
  { name: "プロスペクタードリル", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "古びた従者の懐中時計", break_material: "悠久の弦の響き", distributed: false, release_version: "4.1" },
  { name: "レンジゲージ", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "濁水のひとしずく", break_material: "悠久の弦の響き", distributed: false, release_version: "4.1" },
  { name: "久遠流転の大典", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "隙間のコア", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.1" },
  { name: "果てなき紺碧の唄", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "脆い骨片", break_material: "凛風奔狼の郷愁", distributed: true, release_version: "4.1" },
  { name: "携帯型チェンソー", rarity: 4, weapon_type: "両手剣", base_atk: 454, ascension_stat: "HP", enemy_material: "隙間のコア", break_material: "無垢な海の金盃", distributed: false, release_version: "4.1" },
  { name: "凛流の監視者", rarity: 5, weapon_type: "法器", base_atk: 674, ascension_stat: "会心率", enemy_material: "古びた従者の懐中時計", break_material: "無垢な海の金盃", distributed: false, release_version: "4.1" },
  { name: "船渠剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "HP", enemy_material: "古びた従者の懐中時計", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.1" },
  { name: "水仙十字の剣", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "古びた従者の懐中時計", break_material: "悠久の弦の響き", distributed: false, release_version: "4.2" },
  { name: "静水流転の輝き", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "濁水のひとしずく", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.2" },
  { name: "「スーパーアルティメット覇王魔剣」", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "古びた従者の懐中時計", break_material: "無垢な海の金盃", distributed: true, release_version: "4.3" },
  { name: "裁断", rarity: 5, weapon_type: "両手剣", base_atk: 674, ascension_stat: "会心率", enemy_material: "隙間のコア", break_material: "悠久の弦の響き", distributed: false, release_version: "4.3" },
  { name: "鶴鳴の余韻", rarity: 5, weapon_type: "法器", base_atk: 741, ascension_stat: "攻撃力", enemy_material: "翼状の羽鰭", break_material: "霧海雲間の転還", distributed: false, release_version: "4.4" },
  { name: "有楽御簾切", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "混沌の機関", break_material: "遠海夷地の金枝", distributed: false, release_version: "4.5" },
  { name: "砂中の賢者達の問答", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "HP", enemy_material: "翼状の羽鰭", break_material: "静謐な森のしずくの金符", distributed: true, release_version: "4.5" },
  { name: "赤月のシルエット", rarity: 5, weapon_type: "長柄武器", base_atk: 674, ascension_stat: "会心率", enemy_material: "砕けた剣の柄", break_material: "無垢な海の金盃", distributed: false, release_version: "4.6" },
  { name: "白雨心弦", rarity: 5, weapon_type: "弓", base_atk: 542, ascension_stat: "HP", enemy_material: "翼状の羽鰭", break_material: "純聖な雫の精髄", distributed: false, release_version: "4.7" },
  { name: "築雲", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "砕けた剣の柄", break_material: "漆黒の隕鉄の塊", distributed: true, release_version: "4.7" },
  { name: "赦罪", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "古びた従者の懐中時計", break_material: "悠久の弦の響き", distributed: false, release_version: "4.7" },
  { name: "ルミドゥースの挽歌", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "会心率", enemy_material: "砕けた剣の柄", break_material: "無垢な海の金盃", distributed: false, release_version: "4.8" },
  { name: "アースシェイカー", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "燃え盛る石", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.0" },
  { name: "エズピツァルの笛", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "防御力", enemy_material: "砕けた剣の柄", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.0" },
  { name: "サーフィンタイム", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "砕けた意志の欠片", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.0" },
  { name: "チェーンブレイカー", rarity: 4, weapon_type: "弓", base_atk: 565, ascension_stat: null, enemy_material: "翼状の羽鰭", break_material: "神秘なる煙の啓示", distributed: false, release_version: "5.0" },
  { name: "ヤシュチェの環", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "HP", enemy_material: "砕けた意志の欠片", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.0" },
  { name: "山の王の長牙", rarity: 5, weapon_type: "両手剣", base_atk: 741, ascension_stat: "会心率", enemy_material: "燃え盛る石", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.0" },
  { name: "蒼紋の角杯", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "HP", enemy_material: "秘源のベアリング", break_material: "神秘なる煙の啓示", distributed: true, release_version: "5.0" },
  { name: "虹の行方", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "防御力", enemy_material: "秘源のベアリング", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.0" },
  { name: "ストロングボーン", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "砕けた意志の欠片", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.1" },
  { name: "実りの鉤鉈", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "秘源のベアリング", break_material: null, distributed: false, release_version: "5.1" },
  { name: "岩峰を巡る歌", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "防御力", enemy_material: "秘源のベアリング", break_material: "神秘なる煙の啓示", distributed: false, release_version: "5.1" },
  { name: "鎮山の釘", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "燃え盛る石", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.1" },
  { name: "厄水の災い", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "折光の胚芽", break_material: "狂乱の聖主の神面", distributed: true, release_version: "5.2" },
  { name: "星鷲の紅き羽", rarity: 5, weapon_type: "弓", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "折光の胚芽", break_material: "神秘なる煙の啓示", distributed: false, release_version: "5.2" },
  { name: "波乗りの旋回", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "砕けた意志の欠片", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.2" },
  { name: "花飾りの羽", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "攻撃力", enemy_material: "燃え盛る石", break_material: "神秘なる煙の啓示", distributed: false, release_version: "5.2" },
  { name: "千烈の日輪", rarity: 5, weapon_type: "両手剣", base_atk: 741, ascension_stat: "会心率", enemy_material: "秘源のベアリング", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.3" },
  { name: "祭星者の眺め", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "元素熟知", enemy_material: "砕けた意志の欠片", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.3" },
  { name: "寝正月の初晴", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "元素熟知", enemy_material: "燃え盛る石", break_material: "鳴神御霊の勇武", distributed: false, release_version: "5.4" },
  { name: "玉響停の御噺", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素チャージ効率", enemy_material: "折光の胚芽", break_material: "今昔劇画の鬼人", distributed: true, release_version: "5.4" },
  { name: "ヴィヴィッド・ハート", rarity: 5, weapon_type: "法器", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "冷えた鱗甲の欠片", break_material: "狂乱の聖主の神面", distributed: false, release_version: "5.5" },
  { name: "冷寂の音", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "HP", enemy_material: "冷えた鱗甲の欠片", break_material: "悠久の弦の響き", distributed: true, release_version: "5.6" },
  { name: "香りのシンフォニスト", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "濁水のひとしずく", break_material: "純聖な雫の精髄", distributed: false, release_version: "5.6" },
  { name: "蒼耀", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "会心率", enemy_material: "折光の胚芽", break_material: "神秘なる煙の啓示", distributed: false, release_version: "5.7" },
  { name: "知恵の溶炎", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "冷えた鱗甲の欠片", break_material: "狂乱の聖主の神面", distributed: true, release_version: "5.8" },
  { name: "砕け散る光輪", rarity: 5, weapon_type: "長柄武器", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: "冷えた鱗甲の欠片", break_material: "灼心を捧げる栄光", distributed: false, release_version: "5.8" },
  { name: "万能の鍵", rarity: 4, weapon_type: "両手剣", base_atk: 674, ascension_stat: "元素チャージ効率", enemy_material: "失光の骨片", break_material: "極北の末裔の煌光", distributed: false, release_version: "Luna I (6.0)" },
  { name: "夜を紡ぐ天鏡", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "元素熟知", enemy_material: "霜夜の残光", break_material: "奇妙な装置の宿願", distributed: false, release_version: "Luna I (6.0)" },
  { name: "天光のリュート", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "失光の骨片", break_material: "極北の末裔の煌光", distributed: true, release_version: "Luna I (6.0)" },
  { name: "月紡ぎの曙光", rarity: 4, weapon_type: "片手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "失光の骨片", break_material: "極北の末裔の煌光", distributed: false, release_version: "Luna I (6.0)" },
  { name: "羅網の針", rarity: 4, weapon_type: "弓", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "暗き霧の欠片", break_material: "長夜の灯火の輝光", distributed: false, release_version: "Luna I (6.0)" },
  { name: "烏髄の孤灯", rarity: 4, weapon_type: "法器", base_atk: 454, ascension_stat: "元素熟知", enemy_material: "霜夜の残光", break_material: "奇妙な装置の宿願", distributed: false, release_version: "Luna I (6.0)" },
  { name: "金堀りのシャベル", rarity: 4, weapon_type: "長柄武器", base_atk: null, ascension_stat: "攻撃力", enemy_material: "破損した駆動軸", break_material: null, distributed: false, release_version: "Luna I (6.0)" },
  { name: "血染めの荒れ地", rarity: 5, weapon_type: "長柄武器", base_atk: 674, ascension_stat: "会心率", enemy_material: "暗き霧の欠片", break_material: "長夜の灯火の輝光", distributed: false, release_version: "Luna I (6.0)" },
  { name: "静謐の笛", rarity: 4, weapon_type: "片手剣", base_atk: 454, ascension_stat: "元素チャージ効率", enemy_material: "霜夜の残光", break_material: "奇妙な装置の宿願", distributed: false, release_version: "Luna I (6.0)" },
  { name: "真言の匣", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "失光の骨片", break_material: "オアシスガーデンの真諦", distributed: false, release_version: "Luna II (6.1)" },
  { name: "聖祭者の輝杖", rarity: 4, weapon_type: "長柄武器", base_atk: 620, ascension_stat: "会心率", enemy_material: "暗き霧の欠片", break_material: "長夜の灯火の輝光", distributed: false, release_version: "Luna II (6.1)" },
  { name: "霜辰", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "霜夜の残光", break_material: "奇妙な装置の宿願", distributed: false, release_version: "Luna II (6.1)" },
  { name: "暁を告げる歴史", rarity: 5, weapon_type: "弓", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "重い角笛", break_material: "獅牙戦士の理想", distributed: false, release_version: "Luna III (6.2)" },
  { name: "黒蝕", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "会心率", enemy_material: "霜夜の残光", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "Luna III (6.2)" },
  { name: "虹蛇の雨弦", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "折光の胚芽", break_material: "神秘なる煙の啓示", distributed: true, release_version: "Luna III (6.2)" },
  { name: "三日月の含光", rarity: 5, weapon_type: "片手剣", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "暗き霧の欠片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "Luna IV (6.3)" },
  { name: "帳の夜曲", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "暗黒の裂眼", break_material: "極北の末裔の煌光", distributed: false, release_version: "Luna IV (6.3)" },
  { name: "狼の武勲詩", rarity: 5, weapon_type: "両手剣", base_atk: 608, ascension_stat: "会心率", enemy_material: "暗黒の裂眼", break_material: "凛風奔狼の郷愁", distributed: false, release_version: "Luna V (6.4)" },
  { name: "霜契の金枝", rarity: 5, weapon_type: "弓", base_atk: 542, ascension_stat: "会心ダメージ", enemy_material: "光を失った焔剣の柄", break_material: "長夜の灯火の輝光", distributed: false, release_version: "Luna VI (6.5)" },
  { name: "災憾", rarity: 5, weapon_type: "長柄武器", base_atk: 674, ascension_stat: "会心率", enemy_material: "失光の骨片", break_material: "高塔の王の砕けた夢", distributed: false, release_version: "Luna VII (6.6)" },
  { name: "塵と光の七つの誓約", rarity: 5, weapon_type: "法器", base_atk: null, ascension_stat: "攻撃力", enemy_material: "光を失った焔剣の柄", break_material: null, distributed: false, release_version: "Luna VII (6.6)" },
  { name: "超越の鍵", rarity: 5, weapon_type: "両手剣", base_atk: null, ascension_stat: "会心ダメージ", enemy_material: "欠損した月の鉄", break_material: "極北の末裔の煌光", distributed: false, release_version: "Luna VIII (6.7)" },
  { name: "シンフォニーの鋳影", rarity: 4, weapon_type: "両手剣", base_atk: 510, ascension_stat: "会心率", enemy_material: "砕けた剣の柄", break_material: "純聖な雫の精髄", distributed: false, release_version: "7.0" },
  { name: "千鈞懸黎", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "会心率", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: false, release_version: "7.0" },
  { name: "導炎の源", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "元素熟知", enemy_material: "沈積増生物", break_material: "蒼星軍勢の征服", distributed: false, release_version: "7.0" },
  { name: "救済の剣", rarity: 4, weapon_type: "両手剣", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "生命の虚ろな根", break_material: "蒼星軍勢の征服", distributed: false, release_version: "7.0" },
  { name: "星鋒の剣", rarity: 5, weapon_type: "片手剣", base_atk: 608, ascension_stat: "会心ダメージ", enemy_material: null, break_material: null, distributed: false, release_version: "7.0" },
  { name: "氷の吐息", rarity: 4, weapon_type: "長柄武器", base_atk: 510, ascension_stat: "元素チャージ効率", enemy_material: "沈積増生物", break_material: "蔵に眠る霊薬の狂宴", distributed: false, release_version: "7.0" },
  { name: "白銀の湖を舞う翼", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "生命の虚ろな根", break_material: "蔵に眠る霊薬の狂宴", distributed: false, release_version: "7.0" },
  { name: "胸中の谺", rarity: 4, weapon_type: "法器", base_atk: 565, ascension_stat: "攻撃力", enemy_material: "沈積増生物", break_material: "蒼星軍勢の征服", distributed: false, release_version: "7.0" },
  { name: "遠望の歌", rarity: 4, weapon_type: "長柄武器", base_atk: 565, ascension_stat: "元素熟知", enemy_material: "生命の虚ろな根", break_material: "氷の皇帝の訣別", distributed: false, release_version: "7.0" },
  { name: "諸王の対局", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心率", enemy_material: "壊れたプリズム", break_material: "静謐な森のしずくの金符", distributed: false, release_version: "7.0" },
  { name: "異端を狩る熔刀", rarity: 4, weapon_type: "片手剣", base_atk: null, ascension_stat: null, enemy_material: null, break_material: "灼心を捧げる栄光", distributed: false, release_version: "7.0" },
  { name: "新たなる枝", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "生命の虚ろな根", break_material: "蔵に眠る霊薬の狂宴", distributed: false, release_version: "7.1" },
  { name: "旋流の讃美歌", rarity: 5, weapon_type: "法器", base_atk: 542, ascension_stat: "HP", enemy_material: "沈積増生物", break_material: "蔵に眠る霊薬の狂宴", distributed: false, release_version: "7.1" },
  { name: "銀灯", rarity: 4, weapon_type: "片手剣", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "脆い骨片", break_material: "漆黒の隕鉄の塊", distributed: true, release_version: "7.1" },
  { name: "雪に沈む心", rarity: 4, weapon_type: "法器", base_atk: 510, ascension_stat: "会心ダメージ", enemy_material: "生命の虚ろな根", break_material: "氷の皇帝の訣別", distributed: false, release_version: "7.1" },
  { name: "霜雪の契", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "防御力", enemy_material: "生命の虚ろな根", break_material: "蒼星軍勢の征服", distributed: false, release_version: "7.1" },
  { name: "風に遊ぶ弦", rarity: 4, weapon_type: "弓", base_atk: 510, ascension_stat: "会心率", enemy_material: "沈積増生物", break_material: "氷の皇帝の訣別", distributed: false, release_version: "7.1" },
  { name: "蝶の羽化", rarity: 5, weapon_type: "片手剣", base_atk: 674, ascension_stat: "会心ダメージ", enemy_material: "生命の虚ろな根", break_material: "蒼星軍勢の征服", distributed: false, release_version: "7.1" },
  { name: "秘星の聖典", rarity: 5, weapon_type: "法器", base_atk: null, ascension_stat: null, enemy_material: null, break_material: null, distributed: false, release_version: "7.2" },
  { name: "旧貴族の長弓", rarity: null, weapon_type: null, base_atk: null, ascension_stat: null, enemy_material: null, break_material: "獅牙戦士の理想", distributed: false, release_version: null },
  { name: "旧貴族長槍", rarity: null, weapon_type: null, base_atk: 565, ascension_stat: null, enemy_material: "霧虚ろの花粉", break_material: null, distributed: false, release_version: null },
  { name: "暗黒の裂眼", rarity: null, weapon_type: null, base_atk: null, ascension_stat: null, enemy_material: "重い角笛", break_material: null, distributed: false, release_version: null },
  { name: "異端を狩る熔刀", rarity: null, weapon_type: null, base_atk: null, ascension_stat: null, enemy_material: "冷えた鱗甲の欠片", break_material: null, distributed: false, release_version: null },
  { name: "異端を狩る熔刃", rarity: 4, weapon_type: "片手剣", base_atk: null, ascension_stat: "会心率", enemy_material: "従戦士の木笛", break_material: null, distributed: false, release_version: null },
  { name: "異端を狩る熔刃", rarity: null, weapon_type: null, base_atk: 510, ascension_stat: null, enemy_material: null, break_material: null, distributed: false, release_version: null },
  { name: "黒岩の大剣", rarity: null, weapon_type: null, base_atk: null, ascension_stat: null, enemy_material: null, break_material: "霧海雲間の転還", distributed: false, release_version: null },
  { name: "誓いの明導", rarity: null, weapon_type: null, base_atk: 565, ascension_stat: null, enemy_material: null, break_material: "遠海夷地の金枝", distributed: false, release_version: null },
  { name: "金堀りのシャベル", rarity: null, weapon_type: null, base_atk: 510, ascension_stat: null, enemy_material: "暗き霧の欠片", break_material: "長夜の灯火の輝光", distributed: false, release_version: null },
  { name: "塵と光の七つの誓約", rarity: null, weapon_type: null, base_atk: 741, ascension_stat: null, enemy_material: "光を失った焔剣の柄", break_material: "奇妙な装置の宿願", distributed: false, release_version: null }
];

const WEAPON_BREAK_GROUPS = {
  "今昔劇画の鬼人": "稲妻", "凛風奔狼の郷愁": "モンド", "孤雲寒林の神体": "璃月",
  "漆黒の隕鉄の塊": "璃月", "獅牙戦士の理想": "モンド", "遠海夷地の金枝": "稲妻",
  "霧海雲間の転還": "璃月", "高塔の王の砕けた夢": "モンド", "鳴神御霊の勇武": "稲妻",
  "烈日権威の往日": "スメール", "静謐な森のしずくの金符": "スメール", "オアシスガーデンの真諦": "スメール",
  "無垢な海の金盃": "フォンテーヌ", "悠久の弦の響き": "フォンテーヌ", "純聖な雫の精髄": "フォンテーヌ",
  "灼心を捧げる栄光": "ナタ", "狂乱の聖主の神面": "ナタ", "神秘なる煙の啓示": "ナタ",
  "奇妙な装置の宿願": "ナドクライ", "長夜の灯火の輝光": "ナドクライ", "極北の末裔の煌光": "ナドクライ",
  "蔵に眠る霊薬の狂宴": "スネージナヤ", "蒼星軍勢の征服": "スネージナヤ", "氷の皇帝の訣別": "スネージナヤ",
};

const WEAPON_NAME_ALIASES = {
  "龍殺しの英雄譚": "龍殺しの英傑譚", "旧貴族の長弓": "旧貴族長弓", "誓いの明導": "誓いの明瞳",
  "黒岩の大剣": "黒岩の斬刀", "塵と光と七つの誓約": "塵と光の七つの誓約", "旧貴族長槍": "旧貴族猟槍",
  "金掘りのシャベル": "金堀りのシャベル", "異端を狩る溶刀": "異端を狩る溶刃",
};

function normalizeWeapon(raw) {
  const aliases = Object.keys(WEAPON_NAME_ALIASES).filter(legacy => WEAPON_NAME_ALIASES[legacy] === raw.name);
  const breakGroup = WEAPON_BREAK_GROUPS[raw.break_material] || "モンド";
  const statGroup = ASCENSION_STAT_GROUPS[raw.ascension_stat] || "";

  return {
    id: raw.name,
    name: raw.name,
    displayNames: [raw.name, ...aliases],
    rarity: raw.rarity || 4,
    weaponType: raw.weapon_type || "片手剣",
    baseAtk: raw.base_atk || 510,
    releaseVersionNum: parseReleaseVersion(raw.release_version || "1.0"),
    releaseVersionLabel: raw.release_version || "",
    weaponBreakMaterial: raw.break_material || "",
    weaponBreakMaterialGroup: breakGroup,
    enemyMaterial: raw.enemy_material || "",
    weaponEnemyMaterial: raw.enemy_material || "",
    ascensionStat: raw.ascension_stat || "",
    ascensionStatGroup: statGroup,
    isDistributed: !!raw.distributed,
    iconUrl: `${IMAGE_BASE}/weapons/${encodeURIComponent(raw.name)}.png`,
  };
}

const WEAPONS = WEAPONS_DATA.filter(w => w.name && w.rarity).map(normalizeWeapon);

const WEAPON_HINT_FIELDS = [
  { key: "rarity", label: "レア度", type: "numeric", defaultOn: true },
  { key: "weaponType", label: "武器種", type: "exact", defaultOn: true },
  { key: "baseAtk", label: "基礎攻撃力", type: "numeric", defaultOn: true },
  { key: "weaponBreakMaterial", label: "武器突破素材", type: "group", group: "weaponBreakMaterialGroup", defaultOn: true },
  { key: "enemyMaterial", label: "精鋭敵素材", type: "exact", defaultOn: true },
  { key: "ascensionStat", label: "突破ステータス", type: "group", group: "ascensionStatGroup", defaultOn: true },
  { key: "isDistributed", label: "配布武器", type: "exact", defaultOn: false },
  { key: "releaseVersionNum", label: "実装Ver", type: "numeric", defaultOn: true },
];

function getWeaponDisplayValue(key, value, weapon) {
  if (value === null || value === undefined || value === "") return "—";
  switch (key) {
    case "rarity": return `★${value}`;
    case "isDistributed": return value ? "あり" : "なし";
    case "releaseVersionNum": return weapon ? (weapon.releaseVersionLabel || String(value)) : String(value);
    default: return String(value);
  }
}


if (typeof globalThis !== "undefined") {
  globalThis.CHARACTERS = CHARACTERS;
  globalThis.WEAPONS = WEAPONS;
  globalThis.WEAPONS_DATA = WEAPONS_DATA;
  globalThis.HINT_FIELDS = HINT_FIELDS;
  globalThis.WEAPON_HINT_FIELDS = WEAPON_HINT_FIELDS;
  globalThis.parseReleaseVersion = parseReleaseVersion;
  globalThis.getWeaponDisplayValue = getWeaponDisplayValue;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CHARACTERS,
    WEAPONS,
    WEAPONS_DATA,
    HINT_FIELDS,
    WEAPON_HINT_FIELDS,
    parseReleaseVersion,
  };
}
