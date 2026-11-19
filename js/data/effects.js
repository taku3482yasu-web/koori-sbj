// 演出・示唆の 一覧 (設計書 14 章)。演出は データで 持ち、コードに 書かない
// cond の 書き方 (+ で つなぐ):
//   none = 示唆なし / koyaku = 小役のとき / rare = レア役のとき / chance = チャンス目のとき / hint = 高確示唆 (高確で 出やすい)
//   high = 高確濃厚 / omen = 本前兆濃厚 / omenHint = 前兆示唆 / highOrOmen = 高確か 本前兆 濃厚
//   nr = レア役否定が 条件 / nc = チャンス目否定が 条件 / stageUp1・stageUp2 = 上位ステージへ
// at: 0 = レバーオン・1 = 第1停止・3 = 第3停止
(function (SBJ) {
    'use strict';
    // 本家の キャラ → こおりくん版 ((仮) は 仮キャラ)
    const CAST = {
        main: 'こおりくん', orin: 'おにおに', clark: 'おかがっぱ', tiffany: 'ゆきだるマン(仮)', rosa: 'つららちゃん(仮)',
        howard: 'しろくま支配人(仮)', mint: 'ペンちゃん(仮)', rina: 'かきごおりちゃん(仮)', ilel: 'ゆきうさ兄弟(仮)', joker: 'ジョーカー',
    };
    SBJ.CAST = CAST;
    // 対戦相手 (期待度の 低い順)。art = シリーズの ドット絵 (なければ 名前だけ)
    SBJ.OPPS = [
        { key: 'orin', name: CAST.orin, color: 'black', art: 'onioni' },
        { key: 'clark', name: CAST.clark, color: 'red', art: 'okagappa' },
        { key: 'tiffany', name: CAST.tiffany, color: 'black' },
        { key: 'rosa', name: CAST.rosa, color: 'red' },
        { key: 'howard', name: CAST.howard, color: 'black' },
        { key: 'mint', name: CAST.mint, color: 'red' },
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
            { t: '逆回転で ランプ停止', c: 'highOrOmen', lamp: 'reverse' }, { t: '「Good Luck!」に 停止', c: 'omen', lamp: 'good' } ] },
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
            { t: '775', c: 'omenHint' }, { t: '776', c: 'omenHint' }, { t: '777', c: 'omen' }] },
    ];
    // 重み: なし = 6・高確中の 示唆 = 4・本前兆中の 前兆系 = 3・ほか = 1.5
    SBJ.FX_WEIGHT = { none: 6, hintHigh: 4, omenReal: 3, other: 1.5 };

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
        regCard: 0.2,
        trophy: 0.06,
        trophies: [[2, '銅 (設定2以上)'], [3, '銀 (設定3以上)'], [4, '金 (設定4以上)'], [5, 'こおり柄 (設定5以上)'], [6, '虹 (設定6濃厚)']],
        oddity: [[2, '第1停止で 下パネル消灯'], [3, '第2停止で 下パネル消灯'], [3, '第3停止で 下パネル消灯'], [5, CAST.rina + 'ランプ点灯'], [6, '下パネル点滅のみ']],
    };
    SBJ.POSE = ['', 'ピース (1 個以上)', 'ウインク (2 個以上)', '投げキッス (3 個以上)'];
})(globalThis.SBJ || (globalThis.SBJ = {}));
