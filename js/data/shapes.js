// 停止形と 成立役 → 狙う 停止形 (設計書 5 章)
// 各リールの [上段, 中段, 下段]。'ANY' = 何でも、'!X' = X 以外
(function (SBJ) {
    'use strict';
    const A = 'ANY';
    // 左リールの 3 つの 停止パターン (上・中・下)
    const P1 = ['REP', 'BAR', 'CHE'], P2 = ['BEL', 'REP', 'BAR'], P3 = ['SUI', 'BEL', 'REP'];
    SBJ.ANY = A;
    SBJ.P1 = P1; SBJ.P2 = P2; SBJ.P3 = P3;

    // noP13 = 左に P1・P3 を 出さない (ベル・リプレイ)。ボーナス図柄は BAR 中段が P1 そのものに なるので つけない
    SBJ.SHAPES = {
        BELL:     { name: 'ベル',         reels: [['BEL', A, A], ['BEL', A, A], ['BEL', A, A]], noP13: true },
        REPLAY:   { name: 'リプレイ',     reels: [[A, 'REP', A], [A, 'REP', A], [A, 'REP', A]], noP13: true },
        CHE:      { name: 'チェリー',     reels: [P1, [A, 'CHE', A], ['BEL', A, A]] },
        SUI:      { name: 'スイカ',       reels: [P3, [A, 'SUI', A], [A, A, 'SUI']] },
        CBELL:    { name: 'チャンスベル', reels: [P2, [A, 'BEL', A], ['BEL', A, A]] },
        CHANCE_A: { name: 'チャンス目A',  reels: [P1, [A, 'CHE', A], ['!BEL', A, A]] },
        CHANCE_B: { name: 'チャンス目B',  reels: [P2, [A, 'REP', A], [A, 'SUI', A]] },
        CHANCE_C: { name: 'チャンス目C',  reels: [P3, ['SUI', A, A], ['SUI', A, A]] },
        REACH_A:  { name: 'リーチ目A',    reels: [P2, [A, 'REP', A], [A, 'CHE', A]] },
        // リーチ目B = 左 P3 で、ほかの どの 形にも ならない (形の 一覧には 入れず reel-control.js で あつかう)
        PINCH:    { name: 'ピンチ目',     reels: [['BEL', 'B7', 'REP'], [A, 'CHE', A], [A, A, 'BEL']] },
        // ボーナス (狙えゲーム・中段)。★ EP・SST は 仮決め (設計書 13 章 未決)。金BAR (SP エピソード) は 中段 BAR 揃いを 金色で 見せる (REG と 同じ 形)
        REG:  { name: 'レギュラー',               reels: [[A, 'BAR', A], [A, 'BAR', A], [A, 'BAR', A]] },
        RBIG: { name: '赤7ビッグ',                reels: [[A, 'R7', A], [A, 'R7', A], [A, 'R7', A]] },
        BBIG: { name: '青7ビッグ',                reels: [[A, 'B7', A], [A, 'B7', A], [A, 'B7', A]] },
        SBIG: { name: 'スーパービッグ',           reels: [[A, 'R7', A], [A, 'B7', A], [A, 'R7', A]] },
        EP:   { name: 'エピソード',               reels: [[A, 'BAR', A], [A, 'B7', A], [A, 'BAR', A]] },   // ★
        SST:  { name: 'スーパーストックタイム',   reels: [[A, 'B7', A], [A, 'R7', A], [A, 'B7', A]] },     // ★
    };
    // 成立役 → 狙う 停止形 (MISS = どの 形にも しない・REACH_B = 左 P3 で どの 形にも しない)
    SBJ.FLAG_SHAPES = {
        REP: ['REPLAY'], BELREP: ['BELL'], PUSHBEL: ['BELL'], COMBEL: ['BELL'], THREE: ['BELL'],
        CHE: ['CHE'], SUI: ['SUI'], CBELL: ['CBELL'], CHANCE: ['CHANCE_A', 'CHANCE_B', 'CHANCE_C'],
        REACH: ['REACH_A', 'REACH_B'], PINCH: ['PINCH'], MISS: ['MISS'],
    };
    // 4 コマで 作れなければ 取りこぼし に なる 役 (レア役 + ピンチ目)
    SBJ.CAN_MISS = { CHE: 1, SUI: 1, CBELL: 1, CHANCE: 1, REACH: 1, PINCH: 1 };
    // ボーナスの 段階 → 停止形 (0 REG・1 赤7BIG・2 青7BIG・3 スーパーBIG・4 エピソード・5 SST・6 金BAR = 中段 BAR 揃いを 金色で)
    SBJ.BONUS_PAT = ['REG', 'RBIG', 'BBIG', 'SBIG', 'EP', 'SST', 'REG'];
})(globalThis.SBJ || (globalThis.SBJ = {}));
