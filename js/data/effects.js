// 演出・示唆の 一覧 (設計書 14 章)。演出は データで 持ち、コードに 書かない
// cond の 書き方 (+ で つなぐ):
//   none = 示唆なし / koyaku = 小役のとき / rare = レア役のとき / chance = チャンス目のとき / hint = 高確示唆 (高確で 出やすい)
//   high = 高確濃厚 / omen = 本前兆濃厚 / omenHint = 前兆示唆 / highOrOmen = 高確か 本前兆 濃厚
//   nr = レア役否定が 条件 / nc = チャンス目否定が 条件 / stageUp1・stageUp2 = 上位ステージへ
//   replay = リプレイのとき / f:CHE|CHANCE = その 成立役のとき / exp:N = 本前兆なら 出る・ガセは (100-N)/N に 比例して 間引く
//     (N は 調整用の 数。実際の 期待度は シミュレーションで 測って 設計書 14 章に 書く。例: カード斬り J・Q・K = 約 20・34・70%)
// col (会話・カットイン予告) = 文字や 帯の 色: white < blue < green < red < gold < rainbow
// at: 0 = レバーオン・1 = 第1停止・3 = 第3停止
(function (SBJ) {
    'use strict';
    // 本家の キャラ → こおりくん版 (ゆきだるマン〜ゆきうさ兄弟は この 台の 新しい キャラ。絵は js/ui/art-new.js)
    const CAST = {
        main: 'こおりくん', orin: 'おにおに', clark: 'おかがっぱ', tiffany: 'ゆきだるマン', rosa: 'つららちゃん',
        howard: 'しろくま支配人', mint: 'ペンちゃん', rina: 'かきごおりちゃん', ilel: 'ゆきうさ兄弟', joker: 'ジョーカー',
    };
    SBJ.CAST = CAST;
    // 対戦相手 (期待度の 低い順)。art = シリーズの ドット絵 (なければ 名前だけ)
    SBJ.OPPS = [
        { key: 'orin', name: CAST.orin, color: 'black', art: 'onioni' },
        { key: 'clark', name: CAST.clark, color: 'red', art: 'okagappa' },
        { key: 'tiffany', name: CAST.tiffany, color: 'black', art: 'tiffany' },
        { key: 'rosa', name: CAST.rosa, color: 'red', art: 'rosa' },
        { key: 'howard', name: CAST.howard, color: 'black', art: 'howard' },
        { key: 'mint', name: CAST.mint, color: 'red', art: 'mint' },
        { key: 'rina', name: CAST.rina, color: 'red', art: 'rina' },     // 激アツ (負けでは 出ない)
    ];
    // 当選契機ランプ (準備中・こおりチャンス中のサブ液晶)
    SBJ.LED = {
        MISS: ['白', '点灯'], REP: ['青', '点灯'], PUSHBEL: ['黄', '点灯'], COMBEL: ['黄', '点灯'], THREE: ['黄', '点灯'], BELREP: ['青', '点灯'],
        CBELL: ['黄', '点滅'], SUI: ['緑', '点灯'], CHE: ['赤', '点灯'], REACH: ['紫', '点滅'], PINCH: ['白', '点灯'],
        CHANCE: [['赤', '点滅'], ['緑', '点滅'], ['紫', '点灯']],
    };
    SBJ.OMEN_TEXT = ['なんか 寒くない？', 'ハワイの 風が ふいてる…', 'ざわ…ざわ…', 'カードの 音が する…'];

    // ----- 状態示唆演出 (通常時・RC 高確で 毎ゲーム 22% で 1 つ) -----
    SBJ.FX_RATE = 0.22;
    SBJ.FX = [
        { name: 'キャラ通過', stages: ['casino', 'china', 'japan'], v: [
            { t: CAST.orin + 'が 通過', c: 'none' }, { t: CAST.clark + 'が 通過', c: 'none' },
            { t: CAST.tiffany + 'が 通過 (緑・赤・紫の 横切り)', c: 'hint' }, { t: CAST.rosa + 'が 通過', c: 'hint' }, { t: CAST.howard + 'が 通過', c: 'hint' },
            { t: CAST.rosa + 'が 第3停止で 通過', c: 'high', at: 3 }, { t: 'キャラが 第3停止で 通過', c: 'hint', at: 3 },
            { t: CAST.mint + 'が 通過', c: 'high' }, { t: '右から キャラ通過', c: 'high' }, { t: CAST.rina + '通過 → バトル発展', c: 'omen', normalOnly: true } ] },
        { name: 'ランプルーレット', stages: ['casino', 'china', 'japan'], v: [
            { t: '順回転', c: 'none', lamp: 'normal' }, { t: '順回転・第3停止で ランプ停止', c: 'high', at: 3, lamp: 'normal' },
            { t: '逆回転で ランプ停止', c: 'highOrOmen', lamp: 'reverse' }, { t: '「Good Luck!」に 停止', c: 'omen', lamp: 'good' },
            { t: '「Chance」に 停止', c: 'rare', lamp: 'normal' }, { t: '「Chance」に 停止', c: 'omenHint', lamp: 'normal' }, { t: '「Ready?」に 停止', c: 'omenHint', lamp: 'normal' } ] },
        { name: '巨大' + CAST.mint, stages: ['casino', 'china', 'japan'], v: [
            { t: '頭が 出現', c: 'highOrOmen' }, { t: '頭が 引っ込む', c: 'high' }, { t: '飛び出した!!', c: 'omen' } ] },
        { name: CAST.main + 'の 部位演出', stages: ['casino', 'china', 'japan'], v: [
            { t: '足アップ', c: 'nr+omenHint' }, { t: '顔アップ', c: 'nr+high' } ] },
        { name: 'ひとくち演出', stages: ['casino', 'china', 'japan'], v: [{ t: '第3停止で ひとくち', c: 'nr+high', at: 3 }] },
        { name: '衣装替え・カーテン', stages: ['casino', 'china'], v: [
            { t: 'チャイナ か ハワイへ', c: 'stageUp1' }, { t: 'ジャパン か ハワイへ', c: 'stageUp2' }] },
        { name: 'カジノ内観 (シャンデリア)', stages: ['casino'], v: [
            { t: '第1停止で 弱発光', c: 'none', at: 1 }, { t: '第3停止で 弱発光', c: 'hint', at: 3 },
            { t: '第1停止で 強発光', c: 'omen', at: 1 }, { t: '第3停止で 強発光', c: 'high', at: 3 }] },
        { name: 'カジノ外観 (塔・噴水)', stages: ['casino'], v: [
            { t: '第1停止で 弱発光', c: 'none', at: 1 }, { t: '第3停止で 弱発光', c: 'hint', at: 3 },
            { t: '第1停止で 強発光', c: 'omen', at: 1 }, { t: '第3停止で 強発光', c: 'high', at: 3 }] },
        { name: 'レーザー文字', stages: ['casino'], v: [
            { t: 'CASINO', c: 'none' }, { t: 'RESORT', c: 'koyaku' }, { t: 'CHANCE', c: 'rare' }, { t: 'GREAT', c: 'chance' },
            { t: 'EXELLENT', c: 'omen' }, { t: 'WIN', c: 'omen' }] },
        { name: '花火', stages: ['casino'], v: [
            { t: 'ダイヤ', c: 'none' }, { t: 'クラブ', c: 'koyaku' }, { t: 'ハート', c: 'rare' }, { t: 'スペード', c: 'chance' }, { t: '777', c: 'omen' }] },
        { name: 'チャイナロゴ', stages: ['china'], v: [
            { t: '「福」', c: 'none' }, { t: '「謎」', c: 'high' }, { t: '「熱」', c: 'omen' }, { t: '「当」', c: 'omen' }] },
        { name: 'ホロトランプ', stages: ['china'], v: [{ t: '第3停止で トランプ表示', c: 'nr+high', at: 3 }] },
        { name: '手紙', stages: ['china'], v: [
            { t: '白文字', c: 'none' }, { t: '青文字', c: 'nr+hint' }, { t: '赤文字', c: 'nc+high' }] },
        { name: '祇園の鐘', stages: ['japan'], v: [
            { t: '「！」', c: 'none' }, { t: '「！！」', c: 'omenHint' }, { t: '「！！！」', c: 'omenHint+high' }] },
        { name: '池のコイ', stages: ['japan'], v: [
            { t: '弱パターン (第1停止)', c: 'none', at: 1 }, { t: '弱パターン (第3停止)', c: 'hint', at: 3 },
            { t: '強パターン (第1停止)', c: 'omen', at: 1 }, { t: '強パターン (第3停止)', c: 'high', at: 3 }] },
        { name: '扇子', stages: ['japan'], v: [
            { t: '好機', c: 'rare' }, { t: '赤扇子 + ステップ2', c: 'high' }, { t: '赤扇子 + ステップ3', c: 'nr+omen' }] },
        { name: '傘', stages: ['japan'], v: [
            { t: '傘 1 本', c: 'omen' }, { t: '傘 4 本', c: 'nr+omen' }, { t: '傘が 開く', c: 'nr+omenHint' }] },
        { name: CAST.main + 'の セリフ', stages: ['japan'], v: [
            { t: '「ふふっ」', c: 'nr+omenHint' }, { t: '「チャンスだよ」', c: 'nr+omenHint+high' }, { t: '「ドキドキするね」', c: 'omen' }] },
        { name: '電光掲示板', stages: ['casino', 'china', 'japan', 'hawaii'], v: [
            { t: '「？」', c: 'none' }, { t: 'ゴリラ', c: 'f:SUI|CHANCE' }, { t: 'ワニ', c: 'f:CHE|CHANCE' }, { t: 'ターザン', c: 'chance' },
            { t: 'CHANCE', c: 'omenHint' }, { t: '775', c: 'omenHint' }, { t: '776', c: 'omenHint' }, { t: '777', c: 'omen' }] },

        // ===== 通常時の 会話予告・カットイン予告 (色で 期待度) =====
        { name: '会話予告', kind: 'talk', stages: ['casino', 'china', 'japan'], v: [
            { t: '白', col: 'white', c: 'none' }, { t: '青', col: 'blue', c: 'koyaku' }, { t: '青', col: 'blue', c: 'hint' },
            { t: '緑', col: 'green', c: 'rare' }, { t: '緑', col: 'green', c: 'omenHint' },
            { t: '赤', col: 'red', c: 'chance' }, { t: '赤', col: 'red', c: 'nr+high' },
            { t: '金', col: 'gold', c: 'exp:67' }, { t: '虹', col: 'rainbow', c: 'omen' }] },
        { name: 'カットイン予告', kind: 'cutin', stages: ['casino', 'china', 'japan'], v: [
            { t: CAST.orin, art: 'onioni', col: 'white', c: 'none' }, { t: CAST.clark, art: 'okagappa', col: 'blue', c: 'koyaku' },
            { t: CAST.tiffany, art: 'tiffany', col: 'green', c: 'rare' }, { t: CAST.rosa, art: 'rosa', col: 'green', c: 'omenHint' },
            { t: CAST.howard, art: 'howard', col: 'red', c: 'chance' }, { t: CAST.mint, art: 'mint', col: 'red', c: 'high' },
            { t: CAST.main, art: 'koori', col: 'gold', c: 'exp:80' }, { t: CAST.rina, art: 'rina', col: 'rainbow', c: 'omen' }] },

        // ===== カジノ (内観・外観) =====
        { name: 'スロット', stages: ['casino'], v: [{ t: '砂嵐', c: 'none' }, { t: '「！」', c: 'omenHint' }, { t: '「7」', c: 'omen' }] },
        { name: '2階', stages: ['casino'], v: [{ t: CAST.ilel + 'が 登場 (リプレイ)', c: 'replay' }, { t: CAST.ilel + 'が 登場 (発展)', c: 'omenHint' }] },
        { name: 'ひとくち演出', stages: ['casino'], v: [{ t: '第3停止で ひとくち (レア役)', c: 'chance', at: 3 }] },
        { name: 'モニター', stages: ['casino'], v: [{ t: 'リプレイ', c: 'replay' }, { t: 'バトル!?', c: 'omenHint' }] },
        { name: '観覧車', stages: ['casino'], v: [{ t: CAST.main + 'が 映る', c: 'chance' }, { t: CAST.main + 'と ' + CAST.mint + 'が 映る', c: 'omen' }] },

        // ===== チャイナ =====
        { name: 'チャイナロゴ', stages: ['china'], v: [{ t: '「役」', c: 'koyaku' }, { t: '「稀」', c: 'rare' }, { t: '「兆」', c: 'omenHint' }] },
        { name: 'ネオン看板', stages: ['china'], v: [
            { t: 'スペード', c: 'none' }, { t: '小役', c: 'koyaku' }, { t: '希役', c: 'rare' }, { t: '好機', c: 'rare' }, { t: '兆候', c: 'omenHint' },
            { t: '熱', c: 'omen' }, { t: 'CASINO BATTLE', c: 'omenHint' }, { t: 'STAGE CHANGE', c: 'stageUp2' }] },
        { name: 'ホロ生物', stages: ['china'], v: [{ t: 'カメ', c: 'none' }, { t: 'パンダ', c: 'koyaku' }, { t: 'ゾウ', c: 'rare' }, { t: 'リュウ', c: 'chance' }] },
        { name: '中華飯店', stages: ['china'], v: [{ t: '小籠包', c: 'none' }, { t: '炒飯', c: 'koyaku' }, { t: '北京ダック', c: 'rare' }, { t: '好機来来', c: 'omenHint' }] },
        { name: '看板通過', stages: ['china'], v: [{ t: '中華飯店', c: 'none' }, { t: '美味飯店', c: 'koyaku' }, { t: '絶品飯店', c: 'rare' }, { t: '怪々酒家', c: 'omenHint' }, { t: '熱烈歓迎', c: 'omen' }] },
        { name: '門通過', stages: ['china'], v: [{ t: '中華門', c: 'none' }, { t: '平常門', c: 'koyaku' }, { t: '希少門', c: 'rare' }, { t: '怪奇門', c: 'omenHint' }, { t: '熱烈門', c: 'omen' }] },
        { name: CAST.main + 'の ポーズ', stages: ['china'], v: [{ t: '壱の型 (青)', c: 'none' }, { t: '弐の型 (緑)', c: 'rare' }, { t: '弐の型 (緑)', c: 'omenHint' }, { t: '参の型 (赤)', c: 'chance' }] },

        // ===== ジャパン =====
        { name: '障子', stages: ['japan'], v: [
            { t: '右だけ 閉まる', c: 'none' }, { t: 'ぜんぶ 閉まる', c: 'koyaku' }, { t: 'ぜんぶ 閉まる', c: 'omenHint' },
            { t: '「好機」の 文字', c: 'chance' }, { t: '黒い シルエット', c: 'omenHint' }, { t: 'ピンクの シルエット', c: 'exp:85' }] },
        { name: '俳句', stages: ['japan'], v: [{ t: '「機を 狙う」', c: 'omenHint' }, { t: '「急接近」', c: 'exp:55' }, { t: '「いざ 勝負」', c: 'exp:70' }] },
        { name: '入ります', stages: ['japan'], v: [{ t: 'サイコロに STAGE CHANGE', c: 'high' }] },

        // ===== ステージ共通 =====
        { name: 'トランプ SU', kind: 'stepup', stages: ['casino', 'china', 'japan'], v: [
            { t: 'SU1', su: 1, c: 'none' }, { t: 'SU2', su: 2, c: 'koyaku' }, { t: 'SU3', su: 3, c: 'rare' }, { t: 'SU4', su: 4, c: 'chance' }, { t: 'SU5', su: 5, c: 'omen' }] },
        { name: 'カード斬り', kind: 'slash', stages: ['casino', 'china', 'japan'], v: [
            { t: 'J', c: 'exp:42' }, { t: 'Q', c: 'exp:56' }, { t: 'K', c: 'exp:84' }, { t: 'JOKER', c: 'omen' }] },
        { name: CAST.main + 'ジョーカー', kind: 'cutin', stages: ['casino', 'china', 'japan'], v: [{ t: CAST.main + 'が ジョーカーの 格好で 登場', art: 'koori', col: 'gold', c: 'exp:82' }] },
        { name: 'ビッグクイーン', stages: ['casino', 'china', 'japan'], v: [
            { t: 'クイーンが 微笑む', c: 'f:MISS|REP|PUSHBEL|COMBEL|THREE|BELREP|CHE' }, { t: CAST.rina + 'が 登場', c: 'omen' }] },
        { name: 'ルーレット予告', stages: ['casino', 'china', 'japan'], v: [
            { t: 'ボールが 回る', c: 'f:MISS|REP|PUSHBEL|COMBEL|THREE|BELREP|SUI' }, { t: CAST.rina + 'が 登場', c: 'omen' }] },
        { name: '一人称', stages: ['casino', 'china', 'japan'], v: [
            { t: CAST.tiffany + 'が 見える', c: 'none' }, { t: 'キャラが 見える (小役)', c: 'koyaku+omenHint' }, { t: CAST.mint + 'が 見える', c: 'exp:60' },
            { t: CAST.rina + 'が 見える', c: 'omen' }, { t: '背景が イルミネーション', c: 'omen' }] },
        { name: 'バルコニー', stages: ['casino', 'china', 'japan'], v: [{ t: '弱 (夜風)', c: 'rare' }, { t: '弱 (夜風)', c: 'hint' }, { t: '中 (夜景)', c: 'omenHint' }, { t: '強 (流れ星)', c: 'chance' }] },
        { name: 'チップトス', stages: ['casino', 'china', 'japan'], v: [{ t: 'GOOD', c: 'none' }, { t: 'GREAT', c: 'rare' }, { t: 'GREAT', c: 'omenHint' }, { t: 'EXCELLENT', c: 'chance' }, { t: 'WIN', c: 'omen' }] },
        { name: 'カクテル＆ボード', stages: ['casino', 'china', 'japan'], v: [
            { t: 'カクテル 青', c: 'none' }, { t: 'カクテル 紫', c: 'rare' }, { t: 'CHANCE (青)', c: 'omenHint' }, { t: 'CHANCE (紫)', c: 'high+exp:50' }, { t: 'WIN', c: 'omen' }] },
        { name: 'ロゴ連打', kind: 'logo', stages: ['casino', 'china', 'japan'], v: [{ t: 'ロゴ連打!!', c: 'exp:86' }] },
    ];
    // 重み: なし = 6・高確中の 示唆 = 4・本前兆中の 前兆系 = 3・ほか = 1.5
    SBJ.FX_WEIGHT = { none: 6, hintHigh: 4, omenReal: 3, other: 1.5 };
    SBJ.FX_EXP_K = 0.011;   // exp:N の ガセを 間引く 強さ (シミュレーションで 期待度に 合わせた)

    // ----- その他の 演出の 発生率 -----
    SBJ.HINT_RATE = {
        delay: 1 / 40,                                       // リール始動音の 遅れ (高確中)
        blackout: { real: 1 / 8, high: 1 / 40, other: 1 / 150 },
        reelOff: { real: 1 / 6, high: 1 / 35, other: 1 / 120, lie: 0.35 },
        gameColor: { high: 0.08, other: 0.01 },
        pushLamp: { alt: 0.5, fast: 0.4, onHigh: 0.5, on: 0.25 },
        oddity: 0.25,
        subBgGreen: 0.7,
    };

    // ----- 設定示唆 (重みは 見本の 値。s = 設定) -----
    SBJ.SETTING_HINT = {
        card: s => [   // REG 中の 11 枚役 (20%) の トランプ
            [CAST.orin + '／' + CAST.clark, 50],
            s % 2 === 0 && [CAST.tiffany + '／' + CAST.rosa + ' (偶数設定示唆)', 15],
            [CAST.howard + '／' + CAST.mint + ' (高設定示唆・弱)', 5 + s * 2],
            s >= 2 && [CAST.main + ' (高設定示唆・中)', s * 2],
            s >= 3 && [CAST.rina + ' (高設定示唆・強)', s >= 5 ? 6 : 2],
        ].filter(Boolean),
        end: s => [    // ボーナス終了時の サブ液晶キャラ
            [CAST.tiffany + ' (デフォルト)', 50],
            s >= 2 && [CAST.ilel + ' (設定2以上)', 10],
            s % 2 === 0 && [CAST.rosa + ' (偶数設定示唆)', 10],
            [CAST.mint + ' (高設定示唆・弱)', 4 + s],
            s >= 2 && [CAST.main + ' (高設定示唆・中)', s * 1.5],
            s >= 3 && [CAST.rina + ' (高設定示唆・強)', s >= 5 ? 5 : 1.5],
            s >= 5 && [CAST.main + '＆' + CAST.rina + ' (設定5以上)', 3],
            s === 6 && [CAST.main + '＆' + CAST.rina + '＆' + CAST.mint + ' (設定6濃厚)', 2],
        ].filter(Boolean),
        ending: s => [ // エンディング中に 出る キャラ (2026-11-22 Claude 案。数字は ここで 調整)
            [CAST.orin + '＆' + CAST.clark + ' (デフォルト)', 50],
            s % 2 === 1 && [CAST.howard + ' (奇数設定示唆)', 12],
            s % 2 === 0 && [CAST.rosa + ' (偶数設定示唆)', 12],
            [CAST.mint + ' (高設定示唆・弱)', 4 + s],
            s >= 2 && [CAST.ilel + ' (設定2以上)', 8],
            s >= 4 && [CAST.main + '＆' + CAST.mint + ' (設定4以上)', 4],
            s >= 5 && [CAST.rina + ' (設定5以上)', 3],
            s === 6 && [CAST.main + '＆' + CAST.rina + '＆' + CAST.mint + ' (設定6濃厚)', 2],
        ].filter(Boolean),
        endingRate: 0.12,   // エンディング中 1 ゲームごとに キャラが 出る 割合
        regCard: 0.2,
        trophy: 0.06,
        trophies: [[2, '銅 (設定2以上)'], [3, '銀 (設定3以上)'], [4, '金 (設定4以上)'], [5, 'こおり柄 (設定5以上)'], [6, '虹 (設定6濃厚)']],
        oddity: [[2, '第1停止で 下パネル消灯'], [3, '第2停止で 下パネル消灯'], [3, '第3停止で 下パネル消灯'], [5, CAST.rina + 'ランプ点灯'], [6, '下パネル点滅のみ']],
    };
    // カジノバトルの 会話 (相手の 絵の id → 登場の ひとこと / 最終G の ひとこと)。こおりくんの 返事は koori
    SBJ.TALK = {
        onioni: { open: ['おれ様が 相手だ!', '氷なんか 溶かして やるぜ', 'カードは もらった!'], last: ['これで 終わりだ!', 'まだまだ!'] },
        okagappa: { open: ['お皿が 乾く 前に 決めるよ', '勝負しよっか', 'きゅうりを かけて 勝負!'], last: ['ここで 引く?', 'ドキドキするね'] },
        tiffany: { open: ['雪だるま式に 勝つよ', 'ころがって きたよ!', 'ひんやり 勝負だ'], last: ['とけちゃう…?', '最後の 一枚!'] },
        rosa: { open: ['つららの ように 鋭く いくわ', '勝負よ!', 'ふふ、楽しみね'], last: ['ここが 勝負所よ', '観念なさい'] },
        howard: { open: ['支配人 直々に お相手しよう', 'ようこそ 当カジノへ', '手加減は しないよ'], last: ['見せて もらおう', '…やるな'] },
        rina: { open: ['こおりくん、本気で いくよ!', 'シロップ たっぷりで 勝負!', 'とけても 知らないよ?'], last: ['えへへ、どう?', 'いっけー!'] },
        mint: { open: ['ペンちゃん 参上!', 'すべって 遊ぼう!', 'おさかな かけてね'], last: ['ぺん…!?', 'どきどき ぺん'] },
        koori: { open: ['負けないよ!', 'ひんやり いくよ', 'よろしく ね!', '冷えてるね、今日の ぼく', 'カード 配って!'], last: ['いくよ…!', 'これで 決める!', 'たのむ…!'] },
    };
    // 通常時の 会話予告 (ふたりの かけあい)。色は 演出の 一覧 (col) が きめる
    SBJ.NOTICE_TALK = [
        [['koori', 'なんだか 寒く なって きたね'], ['okagappa', 'お皿が ひえひえだよ']],
        [['onioni', 'おい、勝負しようぜ'], ['koori', 'いいよ、負けないよ']],
        [['koori', 'あのテーブル 気に なる…'], ['tiffany', 'ころがって 行って みる?']],
        [['rosa', '今夜は 当たりそうね'], ['koori', 'ほんと!?']],
        [['howard', 'お客様、ツイて ますな'], ['koori', 'えへへ']],
        [['mint', 'ぺんぺん! いい 予感!'], ['koori', 'ペンちゃんが 来ると 当たるんだよね']],
        [['koori', 'カードの 音が する…'], ['ilel', 'ぴょん、ぴょん']],
        [['rina', 'こおりくん、いく よ!'], ['koori', 'うん!']],
    ];
    SBJ.POSE = ['', 'ピース (1 個以上)', 'ウインク (2 個以上)', '投げキッス (3 個以上)'];
})(globalThis.SBJ || (globalThis.SBJ = {}));
