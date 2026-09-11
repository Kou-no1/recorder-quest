// 追加曲は8つの技能レベルに5曲ずつ配置する。
// mode: "play" は独自入力したパブリックドメイン相当の単旋律をサイト内で再生。
// mode: "book" は教科書・歌集の楽譜を開いて練習し、楽譜や音源を転載しない。
export const SONG_LEVELS = [
  { id: 1, title: "ソ・ラ・シの3音", description: "左手の3音で、息とタンギングをそろえよう。", color: "#159a77" },
  { id: 2, title: "低いド〜ソ", description: "右手を使い、やさしい息で低い音をつなごう。", color: "#228fae" },
  { id: 3, title: "1オクターブ", description: "低いドから高いドまで、音の階段を使おう。", color: "#5377df" },
  { id: 4, title: "リズムと跳躍", description: "8分音符、付点、離れた音への移動に挑戦。", color: "#ed8b29" },
  { id: 5, title: "半音と曲想", description: "運指表を確かめ、曲に合う息とリズムを選ぼう。", color: "#da6584" },
  { id: 6, title: "高音とサミング", description: "親指の小さなすきまと、安定した高音を育てよう。", color: "#6b63ce" },
  { id: 7, title: "二重奏・輪奏", description: "自分のパートを保ちながら、友達の音も聴こう。", color: "#288eac" },
  { id: 8, title: "ステージ曲", description: "曲全体を見通し、聴く人へ表現を届けよう。", color: "#df9b20" },
];

const bookSteps = [
  "教科書または歌集で楽譜を開き、使う音とリズムを見つける",
  "難しい2音または2拍だけを、ゆっくり3回練習する",
  "息つぎと表現を一つ決め、まとまりを意識して演奏する",
];

const playSteps = [
  "お手本を聴きながら、音名を指で追う",
  "難しい2音を選び、指だけ動かしてからゆっくり吹く",
  "できる速さで最後まで演奏し、よかった所を一つ見つける",
];

const song = (id, level, title, options = {}) => ({
  id: `curriculum-${id}`,
  collection: "40曲チャレンジ",
  songLevel: level,
  title,
  kind: options.kind || "なじみの曲",
  grade: options.grade || "3〜6年生",
  world: options.world ?? Math.min(11, level + 2),
  meter: options.meter || 4,
  mode: options.notes ? "play" : "book",
  notes: options.notes || "",
  source: options.source || "学校で親しまれている曲",
  sourceUrl: options.sourceUrl || "",
  bookPage: options.bookPage || "",
  rightsNote: options.notes
    ? "歌詞・市販の編曲は使わず、練習用の単旋律を独自に入力しています。"
    : "楽譜とお手本音は収録していません。学校で使用している教科書・歌集を開いて練習します。",
  goal: options.goal || "曲のまとまりを感じて、自分の音で演奏する",
  focus: options.focus || "音色・リズム・指づかい",
  requiredNotes: options.requiredNotes || "楽譜で確かめよう",
  steps: options.notes ? playSteps : bookSteps,
});

const KYOUGEI = "https://www.kyogei.co.jp/textbook/es/es-r6/songlist";

export const CURRICULUM_SONGS = [
  // Level 1: 教育芸術社3年の導入教材4曲＋伝承曲1曲
  song("01", 1, "きれいな ソラシ", { kind: "3年教科書", grade: "3年生", world: 1, source: "教育芸術社『小学生の音楽3』27ページ", sourceUrl: KYOUGEI, bookPage: "3年 27ページ", requiredNotes: "ソ・ラ・シ", goal: "3つの音を、やさしい息でつなぐ" }),
  song("02", 1, "坂道", { kind: "3年教科書", grade: "3年生", world: 1, source: "教育芸術社『小学生の音楽3』28ページ", sourceUrl: KYOUGEI, bookPage: "3年 28ページ", requiredNotes: "ソ・ラ・シを中心に楽譜で確認", goal: "上がる旋律と下がる旋律を吹き分ける" }),
  song("03", 1, "雨上がり", { kind: "3年教科書", grade: "3年生", world: 1, source: "教育芸術社『小学生の音楽3』29ページ", sourceUrl: KYOUGEI, bookPage: "3年 29ページ", requiredNotes: "楽譜で確認", goal: "拍にのって、音の動きをそろえる" }),
  song("04", 1, "リコーダーと友だち", { kind: "3年教科書", grade: "3年生", world: 1, source: "教育芸術社『小学生の音楽3』22ページ", sourceUrl: KYOUGEI, bookPage: "3年 22ページ", requiredNotes: "シを中心に楽譜で確認", goal: "構え・息・タンギングを一つずつ確かめる" }),
  song("05", 1, "ホット・クロス・バンズ", { kind: "伝承曲", grade: "3年生〜", world: 1, source: "イギリスの伝承曲／練習用単旋律", notes: "B5 A5 G5:2 B5 A5 G5:2 G5 G5 G5 G5 A5 A5 A5 A5 B5 A5 G5:2", requiredNotes: "ソ・ラ・シ", goal: "3音だけで、同じ形と違う形を見つける" }),

  // Level 2: 低音域で親しまれている民謡・童謡
  song("06", 2, "メリーさんのひつじ", { kind: "3年教科書・アメリカ民謡", grade: "3年生〜", world: 3, source: "アメリカ民謡／教育芸術社3年50ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "E5 D5 C5 D5 E5 E5 E5:2 D5 D5 D5:2 E5 G5 G5:2 E5 D5 C5 D5 E5 E5 E5 E5 D5 D5 E5 D5 C5:4", requiredNotes: "低いド・レ・ミ・ソ", goal: "同じ音を舌で区切り、低音を安定させる" }),
  song("07", 2, "かっこう", { kind: "ドイツ民謡", grade: "3年生〜", world: 3, source: "ドイツ民謡／練習用単旋律", notes: "G5 E5 G5 E5 D5 C5 D5:2 C5:4 D5 D5 E5 F5 G5 G5 G5:2 G5 E5 G5 E5 D5 C5 D5:2 C5:4", requiredNotes: "低いド〜ソ", goal: "離れた2音を、途中の音を混ぜずに吹く" }),
  song("08", 2, "ちょうちょう", { kind: "ドイツ民謡", grade: "3年生〜", world: 3, source: "ドイツ民謡／練習用単旋律", notes: "G5 E5 E5:2 F5 D5 D5:2 C5 D5 E5 F5 G5 G5 G5:2 G5 E5 E5 E5 F5 D5 D5 D5 C5 E5 G5 G5 E5 E5 E5:2 D5 D5 D5 D5 D5 E5 F5:2 E5 E5 E5 E5 E5 F5 G5:2 G5 E5 E5 E5 F5 D5 D5 D5 C5 E5 G5 G5 E5 E5 E5:2", requiredNotes: "低いド〜ソ", goal: "1拍と2拍の音を区別する" }),
  song("09", 2, "ぶん ぶん ぶん", { kind: "ボヘミア民謡", grade: "3年生〜", world: 3, source: "ボヘミア民謡／教育芸術社1年26ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "G5 G5 E5 E5 F5 F5 D5:2 C5 D5 E5 F5 G5 G5 G5:2 G5 G5 E5 E5 F5 F5 D5:2 C5 E5 G5 G5 C5:4", requiredNotes: "低いド〜ソ", goal: "同じ音の繰り返しを、拍に合わせて吹く" }),
  song("10", 2, "小ぎつね", { kind: "ドイツ民謡", grade: "3年生〜", world: 3, source: "ドイツ民謡／教育芸術社2年56ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "G5 E5 E5 F5 D5 D5 C5 D5 E5 F5 G5 G5 G5:2 G5 E5 E5 F5 D5 D5 C5 E5 G5 G5 C5:4", requiredNotes: "低いド〜ソ", goal: "右手の指を穴の近くで待たせる" }),

  // Level 3: 教科書の共通教材。学校の楽譜を開いて扱う。
  song("11", 3, "春の小川", { kind: "3年共通教材", grade: "3年生〜", world: 4, source: "教育芸術社『小学生の音楽3』10ページ", sourceUrl: KYOUGEI, bookPage: "3年 10ページ", requiredNotes: "低いド〜高いドを中心に楽譜で確認", goal: "流れるような旋律のまとまりを感じる" }),
  song("12", 3, "茶つみ", { kind: "3年共通教材", grade: "3年生〜", world: 4, source: "教育芸術社『小学生の音楽3』12ページ", sourceUrl: KYOUGEI, bookPage: "3年 12ページ", requiredNotes: "楽譜で確認", goal: "言葉のリズムと旋律の動きを結びつける" }),
  song("13", 3, "ふじ山", { kind: "3年共通教材", grade: "3年生〜", world: 4, source: "教育芸術社『小学生の音楽3』40ページ", sourceUrl: KYOUGEI, bookPage: "3年 40ページ", requiredNotes: "楽譜で確認", goal: "旋律の山を見つけ、息をつなげる" }),
  song("14", 3, "うさぎ", { kind: "日本古謡・3年共通教材", grade: "3年生〜", world: 4, meter: 2, source: "日本古謡／教育芸術社3年44ページ", sourceUrl: KYOUGEI, bookPage: "3年 44ページ", requiredNotes: "日本の音階を楽譜で確認", goal: "日本の旋律らしい間と響きを味わう" }),
  song("15", 3, "さくら さくら", { kind: "日本古謡・4年共通教材", grade: "4年生〜", world: 4, source: "日本古謡／教育芸術社4年10ページ", sourceUrl: KYOUGEI, bookPage: "4年 10ページ", requiredNotes: "半音を含むため運指表と楽譜で確認", goal: "日本の音階と、音の余韻を感じて吹く" }),

  // Level 4: なじみのある教科書曲と、独自入力できる古い旋律
  song("16", 4, "エーデルワイス", { kind: "3・6年教科書", grade: "3年生〜", world: 5, meter: 3, source: "教育芸術社3年68ページ・6年64ページ", sourceUrl: KYOUGEI, bookPage: "3年 68ページ／6年 64ページ", requiredNotes: "高いレなどを楽譜で確認", goal: "3拍子のまとまりと息つぎをそろえる" }),
  song("17", 4, "大きな古時計", { kind: "歌集の定番曲", grade: "4年生〜", world: 5, source: "『みんなのうた』（埼玉県音楽教育連盟）目次掲載", bookPage: "歌集でページを確認", requiredNotes: "付点・広い音域を楽譜で確認", goal: "時計の動きを感じる拍と、長いフレーズを表す" }),
  song("18", 4, "茶色の小びん", { kind: "4年教科書・古い旋律", grade: "4年生〜", world: 5, source: "J.ウィナー作曲／教育芸術社4年54・56ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "E5 G5 G5 E5 G5 A5 G5:2 D5 F5 F5 D5 F5 G5 E5:2 E5 G5 G5 E5 G5 A5 B5 C6 B5 A5 G5 E5 D5 C5:2", requiredNotes: "低いド〜高いド", goal: "はずむリズムと音の跳躍をそろえる" }),
  song("19", 4, "ハッピー バースデイ トゥ ユー", { kind: "4年教科書・なじみの曲", grade: "3年生〜", world: 5, meter: 3, source: "P.S.ヒル・M.J.ヒル作曲／教育芸術社4年79ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "G5:0.5 G5:0.5 A5:2 G5 C6:2 B5:3 G5:0.5 G5:0.5 A5:2 G5 D6:2 C6:3 G5:0.5 G5:0.5 G6:2 E6 C6 B5 A5 F6:0.5 F6:0.5 E6:2 C6 D6 C6:3", requiredNotes: "ソ〜高いソ", goal: "アウフタクトから3拍子へ自然に入る" }),
  song("20", 4, "パフ", { kind: "3年教科書", grade: "3年生〜", world: 5, source: "教育芸術社『小学生の音楽3』56ページ", sourceUrl: KYOUGEI, bookPage: "3年 56ページ", requiredNotes: "高い音と長いフレーズを楽譜で確認", goal: "物語の場面を思い浮かべて演奏する" }),

  // Level 5: 半音や複雑なリズムを含む教科書曲
  song("21", 5, "リボンのおどり（ラ バンバ）", { kind: "5年教科書・メキシコ民謡", grade: "5年生〜", world: 7, source: "教育芸術社『小学生の音楽5』24ページ", sourceUrl: KYOUGEI, bookPage: "5年 24ページ", requiredNotes: "半音を含むため楽譜と運指表で確認", goal: "リズムの重なりと、踊るような拍を感じる" }),
  song("22", 5, "こげよ マイケル", { kind: "5年教科書・スピリチュアル", grade: "5年生〜", world: 7, source: "スピリチュアル／教育芸術社5年36ページ／練習用単旋律", sourceUrl: KYOUGEI, notes: "G5:2 E5:2 G5 A5 B5:4 A5:2 G5:2 E5:2 D5:4 G5:2 E5:2 G5 A5 B5:2 A5 G5 E5:4 D5:4", requiredNotes: "低いレ・ミ・ソ・ラ・シ", goal: "長い音を保ち、フレーズの終わりをそろえる" }),
  song("23", 5, "キリマンジャロ", { kind: "5年教科書", grade: "5年生〜", world: 7, source: "教育芸術社『小学生の音楽5』42ページ", sourceUrl: KYOUGEI, bookPage: "5年 42ページ", requiredNotes: "半音と細かなリズムを楽譜で確認", goal: "曲想の変化に合わせて奏法を変える" }),
  song("24", 5, "カントリー・ロード", { kind: "歌集の定番曲", grade: "5年生〜", world: 7, source: "『みんなのうた』（埼玉県音楽教育連盟）目次掲載", bookPage: "歌集でページを確認", requiredNotes: "半音と跳躍を楽譜で確認", goal: "前へ進むような拍と、旋律の盛り上がりを表す" }),
  song("25", 5, "威風堂々", { kind: "5年教科書・ステージ曲", grade: "5年生〜", world: 7, source: "エルガー作曲／教育芸術社5年62ページ", sourceUrl: KYOUGEI, bookPage: "5年 62ページ", requiredNotes: "半音・高音を含むため楽譜と運指表で確認", goal: "堂々とした曲想を、拍と息づかいで表す" }),

  // Level 6: 6年教材を中心とした高音・サミング
  song("26", 6, "ラバーズ コンチェルト", { kind: "6年教科書", grade: "6年生〜", world: 6, source: "教育芸術社『小学生の音楽6』18ページ", sourceUrl: KYOUGEI, bookPage: "6年 18ページ", requiredNotes: "高音と半音を楽譜で確認", goal: "高い音の息をそろえ、旋律をなめらかにつなぐ" }),
  song("27", 6, "星の世界", { kind: "6年教科書・古い旋律", grade: "6年生〜", world: 6, meter: 3, source: "C.C.コンバース作曲／教育芸術社6年26ページ", sourceUrl: KYOUGEI, bookPage: "6年 26ページ", requiredNotes: "高音と3拍子を楽譜で確認", goal: "3拍子の流れにのせて、高音を響かせる" }),
  song("28", 6, "君をのせて", { kind: "歌集の定番曲", grade: "5〜6年生", world: 6, source: "『みんなのうた』（埼玉県音楽教育連盟）目次掲載", bookPage: "歌集でページを確認", requiredNotes: "高音・半音・息つぎを楽譜で確認", goal: "長い旋律の方向を考え、息をつないで表現する" }),
  song("29", 6, "メヌエット", { kind: "6年教科書・古典曲", grade: "6年生〜", world: 6, meter: 3, source: "J.クリーガー作曲／教育芸術社6年52ページ", sourceUrl: KYOUGEI, bookPage: "6年 52ページ", requiredNotes: "高音・半音を楽譜で確認", goal: "3拍子の拍感と、対称的なフレーズを感じる" }),
  song("30", 6, "木星", { kind: "6年教科書・ステージ曲", grade: "6年生〜", world: 6, source: "ホルスト作曲／教育芸術社6年68ページ", sourceUrl: KYOUGEI, bookPage: "6年 68ページ", requiredNotes: "広い音域と半音を楽譜で確認", goal: "長い旋律の頂点と息つぎを計画する" }),

  // Level 7: 教科書の二重奏・輪奏・合奏教材
  song("31", 7, "メリーさんのひつじ（二重奏）", { kind: "3年教科書・二重奏", grade: "3年生〜", world: 8, source: "教育芸術社『小学生の音楽3』50ページ", sourceUrl: KYOUGEI, bookPage: "3年 50ページ", requiredNotes: "2つのパートを楽譜で確認", goal: "相手の音を聴きながら、自分の旋律を保つ" }),
  song("32", 7, "雨の公園（輪奏）", { kind: "4年教科書・輪奏", grade: "4年生〜", world: 8, source: "教育芸術社『小学生の音楽4』79ページ", sourceUrl: KYOUGEI, bookPage: "4年 79ページ", requiredNotes: "輪奏の入りを楽譜で確認", goal: "決めた拍だけ待ち、自分の入口から始める" }),
  song("33", 7, "林の朝（輪唱）", { kind: "4年教科書・輪唱", grade: "4年生〜", world: 8, source: "教育芸術社『小学生の音楽4』75ページ", sourceUrl: KYOUGEI, bookPage: "4年 75ページ", requiredNotes: "輪唱の旋律を楽譜で確認", goal: "相手につられず、同じ速さで旋律を保つ" }),
  song("34", 7, "そよ風のデュエット", { kind: "6年教科書・二重奏", grade: "6年生〜", world: 8, source: "教育芸術社『小学生の音楽6』67ページ", sourceUrl: KYOUGEI, bookPage: "6年 67ページ", requiredNotes: "2つのパートと高音を楽譜で確認", goal: "旋律の受け渡しと、音量のバランスを整える" }),
  song("35", 7, "静かな湖畔（輪唱）", { kind: "歌集の定番曲・輪唱", grade: "4年生〜", world: 8, source: "『みんなのうた』（埼玉県音楽教育連盟）目次掲載", bookPage: "歌集でページを確認", requiredNotes: "輪唱の旋律と入口を楽譜で確認", goal: "友達の声部を聴きながら、自分の旋律を保つ" }),

  // Level 8: 歌集でも親しまれる発表向け候補。収録版の楽譜を使用する。
  song("36", 8, "Believe", { kind: "5年教科書・歌集候補", grade: "5〜6年生", world: 11, source: "教育芸術社『小学生の音楽5』8ページ", sourceUrl: KYOUGEI, bookPage: "5年 8ページ", requiredNotes: "広い音域と半音を楽譜で確認", goal: "言葉のまとまりを旋律の表現に生かす" }),
  song("37", 8, "翼をください", { kind: "6年教科書・歌集の定番曲", grade: "6年生〜", world: 11, source: "教育芸術社『小学生の音楽6』8ページ／『みんなのうた』目次掲載", sourceUrl: KYOUGEI, bookPage: "6年 8ページ／歌集", requiredNotes: "広い音域と半音を楽譜で確認", goal: "フレーズの方向を考え、伸びやかに表現する" }),
  song("38", 8, "マイ バラード", { kind: "5年教科書・歌集候補", grade: "5〜6年生", world: 11, source: "教育芸術社『小学生の音楽5』68ページ", sourceUrl: KYOUGEI, bookPage: "5年 68ページ", requiredNotes: "広い音域と転調を楽譜で確認", goal: "曲の盛り上がりを考え、仲間と音を合わせる" }),
  song("39", 8, "旅立ちの日に", { kind: "6年教科書・歌集候補", grade: "6年生〜", world: 11, source: "教育芸術社『小学生の音楽6』66ページ", sourceUrl: KYOUGEI, bookPage: "6年 66ページ", requiredNotes: "広い音域と半音を楽譜で確認", goal: "曲全体の構成を捉え、思いを演奏に表す" }),
  song("40", 8, "勇気100%", { kind: "歌集の定番曲・発展曲", grade: "6年生〜発展", world: 11, source: "『みんなのうた』（埼玉県音楽教育連盟）目次掲載", bookPage: "歌集でページを確認", requiredNotes: "速い動き・半音・高音を楽譜で確認", goal: "正確さを保ちながら、元気な曲想をステージで届ける" }),
];
