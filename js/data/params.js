// 数値 ぜんぶ (設計書 4・6〜10 章)。コードに 直書きしない。
// ★ = 設計書で 未決・仮決めの ところ。設計書は 2026-11-19 11:59 の 版 (見本 = artifact version 1795056839)
(function (SBJ) {
    'use strict';
    SBJ.PARAMS = {
        bet: 3,
        startCredit: 500,

        // ----- 4 章 小役抽選 -----
        PUSH_D: 4.35,           // 押し順ベル 分母 (通常)
        BONUS_BELL: 0.64,       // ボーナス中・エンディング中・こおりチャンス中・SST中の 押し順ベル 確率
        COMBEL_D: 40,           // 共通ベル
        THREE_D: 40,            // 3枚役
        BELREP_D: 40,           // ベルリプレイ
        REP_D: 7.3,             // リプレイ (ベルリプレイ分を 引いた 値に する)
        CHE_D: 75,
        SUI_D: [99.9, 91.1, 87.7, 86.7, 85.0, 83.9],
        CBELL_D: 150,
        CHANCE_D: 99.9,
        REACH_D: { normal: 1500, rchigh: 170, st: 59 },
        PINCH_D: 45,

        // 払い出し (★ チャンスベル 1 枚・チャンス目 / リーチ目 / ピンチ目 0 枚 は 2026-11-19 ユーザー「今のまま」)
        pay: { pushOK: 11, pushNG: 1, COMBEL: 11, THREE: 3, SUI: 10, CBELL: 1 },

        navST: 0.7,             // 通常 ST の ナビ 率

        // ----- 6 章 通常時 -----
        SET_F: [1.00, 1.03, 1.06, 1.22, 1.32, 1.45],
        highAt100: 0.35, highAtBig: 0.22, highAtOther: 0.12, highBigGames: [200, 400, 600, 800],
        CHANCE_HIGH: [0.40, 0.42, 0.44, 0.52, 0.56, 0.60],
        highCHE: 0.05, highSUI: 0.08, highCBELL: 0.12,
        reachDirect: 0.30,       // 低確の リーチ目役で ボーナス 直撃
        chain3: 0.12, chain4: 0.26,
        chinaChain: 1.6,         // チャイナ中は 小役連の 移行率 1.6 倍
        showHigh: 0.60,
        highWin: { CHE: 0.20, SUI: 0.25, CBELL: 0.15, CHANCE: 0.50, REACH: 1, PINCH: 0 },
        HIGH_BASE: [1 / 62, 1 / 61, 1 / 60, 1 / 52, 1 / 49, 1 / 46],
        pinchFall: 0.75,         // ボーナス高確・チャイナの 転落 (ピンチ目 成立時)
        ceil: 999, ceilShort: 666,
        regCeil: 3, regCeilBlue: 0.10,
        suikaFirst: [10, 30], suikaNext: [60, 120],    // スイカ規定回数 (設定変更時 / 以降)
        ST_DIRECT: [0.004, 0.006, 0.008, 0.011, 0.013, 0.016],
        firstSplit: [45.7, 49.4, 4.9],      // REG・赤7BIG・青7BIG
        omenNow: 0.25,                      // その場で 告知
        omenPre: [1, 3],                    // 前振りの G 数
        omenLong: { real: 0.35, gase: 0.08, pre: 4 },   // 当選Gから 6G目で バトル発展 (前振り 4G)
        gaseRare: 0.18, gaseHigh: 1 / 70,
        dice: [150, 450, 750],              // ダイスチェックの 通常G

        // ----- 7 章 カジノバトル -----
        battle: {
            kinds: ['bj', 'poker', 'roulette'], kindW: [50, 25, 25],
            dealerWin: { hands: [20, 18, 15], w: [45, 35, 20] },
            dealerLose: { hands: [20, 18], w: [88, 12] },
            hitsWin: [25, 35, 28, 12],      // 1〜4 回
            hitsLose: [40, 40, 20],         // 1〜3 回
            otherHitsWin: [30, 40, 30], otherHitsLose: [50, 40, 10],   // ポーカー・ルーレットの G 数
            colorMatchWin: 0.60, colorMatchLose: 0.92,
            hitColorWin: [40, 35, 20, 5], hitColorLose: [65, 30, 5, 0],   // 青・緑・赤・金
            surpriseWin: 0.25, surpriseLose: 0.06,
            cutinWin: [20, 30, 35, 15],                   // 白・緑・赤・虹
            cutinLoseHigh: [45, 45, 10, 0], cutinLoseLow: [85, 0, 15, 0],
            // 対戦相手の 重み (期待度の 低い順・ペンちゃんは 負けでは 出ない)。見本の 値
            oppWin: [5, 10, 18, 25, 27, 15, 6], oppLose: [40, 30, 18, 9, 3, 0, 0],   // 7 人目 = かきごおりちゃん (激アツ)
            triggerOpp: { CHE: 4, SUI: 3 }, triggerWin: 0.40, triggerLose: 0.06,   // チェリー契機 → しろくま支配人・スイカ契機 → つららちゃん
            pokerCalled: 0.40,
            pokerHandWin: [25, 35, 40], pokerHandLose: [80, 20],   // フォーカード・スリーカード・ワンペア
            intros: ['ビッグクイーン', 'ルーレット', '一人称', '部位'],
            // 相手が きまった あとの 登場カットインと 会話。文字の 色で 期待度 (白 < 青 < 緑 < 赤 < 金 < 虹=勝利濃厚)
            talkColors: ['white', 'blue', 'green', 'red', 'gold', 'rainbow'],
            cutWin: [8, 16, 24, 30, 16, 6], cutLose: [50, 30, 14, 5, 1, 0],      // 登場カットインの 帯の 色
            talkWin: [10, 18, 24, 28, 15, 5], talkLose: [52, 30, 13, 4, 1, 0],   // 会話の 文字の 色 (1 行ずつ 抽選)
            finalTalkWin: [8, 15, 25, 30, 17, 5], finalTalkLose: [55, 28, 12, 4, 1, 0],   // 最終G の ひとこと
        },

        hawaiiRate: 0.4,        // 本前兆の うち ハワイへ 移行する 割合 (ガセ前兆では 移行しない)

        // ----- 8 章 こおりチャンス -----
        rcGames: 6,
        rcRankBy: { bustOr17: 0, t18_19: 1, t20: 2, t21: 3, natural: 4 },
        jokerNatural: true,     // ジョーカー中の ナチュラルにも +1 (設計書どおり。見本は しない。2026-11-19 ユーザー「新しい設計書に 合わせて」)
        JUDGE_AIM: 0.55, JUDGE_STAY: 0.30,

        // ----- 9 章 ボーナス・RC 高確・ST -----
        prepMaxG: 8,
        // PUSH の 色: 段階ごとの 重み (white・red・blue・redblue・yellow・rainbow)
        pushColor: [
            { white: 1 },
            { red: 60, white: 40 },
            { blue: 60, red: 25, white: 15 },
            { redblue: 70, blue: 21, red: 9 },
            { yellow: 70, blue: 21, red: 9 },
            { rainbow: 70, blue: 21, red: 9 },
        ],
        bonusPay: [60, null, 300, 400, 400, 0, null],   // 赤7BIG・SPエピソードは 下
        rbigPay: { first: 100, rc: 200 },
        spEpPay: [200, 500],                            // SPエピソード: 半々
        bonusST: [0.02, 0.06, 0.25, 0.40, 1, 0, 1],
        bonusSST: [0.05, 0.06, 0.10, 0.15, 0.25, 0, 0.50],
        bonusSTReveal: 0.5,
        rcB: [30, 40],
        rcAEnter: 0.33,
        rcAWin: { CHANCE: 0.66, CHE: 0.25, SUI: 0.25, CBELL: 0.20 },
        rcAChain4: 0.301,
        RC_OTHER: [0.0080, 0.0083, 0.0087, 0.0095, 0.0105, 0.0115],
        rcOtherJoker: 0.03,
        rcDirect: 0.15, rcDirectW: [55, 30, 10, 4, 1],  // RC高確の 当選の 15% は 直撃ボーナス (赤7BIG〜SST)
        // ST の チャンスベル・SST の リプレイ と チャンスベルの ストック抽選は 設計書に あるが 見本に ない。設計書どおり 入れる (stockDoc)
        // (入れても 機械割は 設定1 約 98.7%・設定6 約 112.6% で 目安の はんい)
        stockDoc: true,
        st: { len: [50, 58], stock: { CHE: 0.08, SUI: 0.08, CHANCE: 0.30, REACH: 0.15 }, docExtra: { CBELL: 0.06 }, n: [80, 12, 5, 2, 1] },
        sst: { len: [100, 110], cont: 0.20, maxSets: 7, stock: { CHE: 0.15, SUI: 0.15, CHANCE: 0.40, REACH: 0.30 }, docExtra: { REP: 0.01, CBELL: 0.12 }, n: [60, 22, 10, 5, 2, 1] },
        stPose: 0.1,
        goldRegStreak: 3, goldOther: 0.01,
        jokerMean: 6,
        // ロングフリーズ
        freezeReach: 1 / 30, freezeReg: 1 / 40, freezeJoker: 13, freezeSSTSets: 2, freezeMs: 2600,
        // 有利区間
        yuriEnding: 2300, yuriCap: 2400,
    };
    SBJ.BONUS_NAMES = ['REG', '赤7BIG', '青7BIG', 'スーパーBIG', 'エピソードボーナス', 'スーパーストックタイム', 'SPエピソード'];
    SBJ.FLAG_NAME = {
        BELREP: 'ベルリプレイ', REP: 'リプレイ', PUSHBEL: '押し順ベル', COMBEL: '共通ベル', CHE: 'チェリー', SUI: 'スイカ',
        CBELL: 'チャンスベル', CHANCE: 'チャンス目', REACH: 'リーチ目役', PINCH: 'ピンチ目', THREE: '3枚役', MISS: 'ハズレ',
    };
})(globalThis.SBJ || (globalThis.SBJ = {}));
