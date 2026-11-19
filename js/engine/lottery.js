// 小役抽選と 状態ごとの 内部抽選 (設計書 4・6・9 章)。S (状態) を 受け取って 結果を 返す
(function (SBJ) {
    'use strict';
    const RARE = { CHE: 1, SUI: 1, CBELL: 1, CHANCE: 1, REACH: 1 };
    const isRare = f => !!RARE[f];
    // 小役連の カウント対象。リプレイは 途切れさせない
    const CHAIN = { PUSHBEL: 1, COMBEL: 1, CHE: 1, SUI: 1, CBELL: 1 };

    function bonusLike(S) { return S.mode === 'bonus' || S.mode === 'ending' || S.mode === 'rcPromo' || S.mode === 'rcJudge' || (S.mode === 'st' && S.st.super); }

    // レバーオンで 成立役を 1 つ
    function drawFlag(S, P, rng) {
        const s = S.setting - 1;
        const reachD = S.mode === 'st' ? P.REACH_D.st : S.mode === 'rchigh' ? P.REACH_D.rchigh : P.REACH_D.normal;
        const t = [
            ['REACH', 1 / reachD], ['CHANCE', 1 / P.CHANCE_D], ['CBELL', 1 / P.CBELL_D], ['CHE', 1 / P.CHE_D], ['SUI', 1 / P.SUI_D[s]],
            ['PINCH', 1 / P.PINCH_D], ['THREE', 1 / P.THREE_D], ['COMBEL', 1 / P.COMBEL_D], ['BELREP', 1 / P.BELREP_D], ['REP', 1 / P.REP_D - 1 / P.BELREP_D],
            ['PUSHBEL', bonusLike(S) ? P.BONUS_BELL : 1 / P.PUSH_D],
        ];
        let r = rng.next();
        for (const [n, p] of t) { if ((r -= p) < 0) return n; }
        return 'MISS';
    }
    // 押し順ナビ: ボーナス・準備中・こおりチャンス・SST は 常に、通常 ST は 70%、通常時・RC 高確は なし
    function navOn(S, P, rng) {
        if (S.mode === 'bonus' || S.mode === 'ending' || S.mode === 'rcPromo' || S.mode === 'rcJudge' || S.mode === 'prep') return true;
        if (S.mode === 'st') return S.st.super || rng.chance(P.navST);
        return false;
    }
    // 通常時 (低確・ボーナス高確)。当選なら { kind, ... } を 返す
    function lotNormal(S, P, rng, g) {
        const s = S.setting - 1, f = P.SET_F[s], fl = g.flag;
        if (S.sinceBig >= S.ceilMax) return { kind: 'bonus', type: 1, ceil: true, why: '天井' };
        if (S.suikaReady) return suikaFire(S, P, rng);
        if (fl === 'SUI' && rng.chance(P.ST_DIRECT[s])) return { kind: 'st', why: 'スイカ直撃' };
        if (S.bonusHigh) {
            const p = P.highWin[fl];
            if (rng.chance(p != null ? p : P.HIGH_BASE[s])) return { kind: 'bonus' };
            if (fl === 'PINCH' && rng.chance(P.pinchFall)) { S.bonusHigh = false; S.showHigh = false; S.china = false; g.events.push({ t: 'hint', text: 'ピンチ目…' }); }
            return null;
        }
        if (fl === 'PINCH' && S.china && rng.chance(P.pinchFall)) S.china = false;
        if (fl === 'REACH' && rng.chance(P.reachDirect)) return { kind: 'bonus' };
        // ボーナス高確への 移行 (契機が 重なったら 足して 1 回)。チャイナ中は 小役連の 移行率 1.6 倍
        const at100 = S.normalG > 0 && S.normalG % 100 === 0;
        let p = 0;
        if (at100) p += (S.normalG === 100 ? P.highAt100 : P.highBigGames.includes(S.normalG) ? P.highAtBig : P.highAtOther) * f;
        if (fl === 'CHANCE') p += P.CHANCE_HIGH[s];
        else if (fl === 'CHE') p += P.highCHE * f;
        else if (fl === 'SUI') p += P.highSUI * f;
        else if (fl === 'CBELL') p += P.highCBELL * f;
        else if (fl === 'REACH') p += 1;
        const cf = S.china ? P.chinaChain : 1;
        if (S.chain === 3) p += P.chain3 * f * cf; else if (S.chain >= 4) p += P.chain4 * f * cf;
        if (p > 0 && rng.chance(p)) { S.bonusHigh = true; S.showHigh = rng.chance(P.showHigh); }
        else if (at100) S.china = true;      // 100G 刻みで 高確に 上がらなければ チャイナ
        return null;
    }
    // スイカ規定回数に 達して いたら ストックタイム (つぎの 通常時・RC 高確の ゲームで)
    function suikaFire(S, P, rng) {
        S.suikaReady = false; S.suikaCnt = 0; S.suikaTarget = rng.int(P.suikaNext[0], P.suikaNext[1]);
        return { kind: 'st', why: 'スイカ規定回数' };
    }
    // RC 高確 (高確 B = リーチ目役だけ・高確 A = 全役)
    function lotRcHigh(S, P, rng, g) {
        const fl = g.flag;
        if (S.suikaReady) return suikaFire(S, P, rng);
        if (fl === 'REACH') return { kind: 'rc' };
        if (!S.rcA) return null;
        const other = S.joker > 0 ? P.rcOtherJoker : P.RC_OTHER[S.setting - 1];
        if (fl === 'PINCH') {
            if (rng.chance(other)) return { kind: 'rc' };
            if (S.joker <= 0) { S.rcA = false; g.events.push({ t: 'hint', text: 'ピンチ目…' }); }
            return null;
        }
        let p = P.rcAWin[fl];
        if (p == null) p = S.chain >= 4 ? P.rcAChain4 : other;
        return rng.chance(p) ? { kind: 'rc' } : null;
    }
    SBJ.Lottery = { drawFlag, navOn, lotNormal, lotRcHigh, isRare, CHAIN };
})(globalThis.SBJ || (globalThis.SBJ = {}));
