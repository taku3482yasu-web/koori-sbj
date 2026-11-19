// ② こおりチャンス: 前半 = BJ 昇格パート (HIT / STAND)・後半 = ジャッジパート (設計書 8 章)
(function (SBJ) {
    'use strict';
    const { Cards } = SBJ;
    const isBellCard = f => f === 'PUSHBEL' || f === 'COMBEL';

    // 突入: 2 枚 配る
    function start(rng, opt) {
        let cards;
        do { cards = [Cards.newCard(rng), Cards.newCard(rng)]; } while (Cards.total(cards) > 21);
        return { cards, games: 0, maxGames: opt.games, bust: false, five: false, natural: Cards.total(cards) === 21, joker: !!opt.joker, gold: !!opt.gold, rank: 0, forceAim: false, done: false };
    }
    // HIT した ゲームの 成立役で カード: ベル系 → ふつうの カード・レア役 → ワイルド (1G 延長)・それ以外 → スカ
    // 戻り値 = 引いた カード ('none' = スカ)。終わったら rc.done = true
    function hit(rc, rng, flag, isRare) {
        rc.games++;
        let c = null;
        if (isRare) { c = Cards.wildFor(rc.cards); rc.maxGames++; }
        else if (isBellCard(flag)) c = Cards.newCard(rng);
        if (c) rc.cards.push(c);
        const t = Cards.total(rc.cards);
        if (t > 21) { rc.bust = true; rc.done = true; }
        else if (rc.cards.length >= 5) { rc.five = true; rc.done = true; }
        else if (t === 21 || rc.games >= rc.maxGames) rc.done = true;
        return c || 'none';
    }
    // 終わった ときの 報酬の 段階
    function rank(rc, P) {
        const R = P.rcRankBy;
        const t = Cards.total(rc.cards);
        let r = rc.natural ? R.natural : rc.bust || t <= 17 ? R.bustOr17 : t <= 19 ? R.t18_19 : t === 20 ? R.t20 : R.t21;
        if (rc.five && !rc.bust) r++;     // ファイブカード +1
        if (rc.joker && (!rc.natural || P.jokerNatural)) r++;   // ジョーカーモード +1 (ナチュラルにも つけるかは P.jokerNatural)
        return Math.min(5, r);
    }
    // 昇格パートを 終える → ジャッジへ
    function finish(rc, P) {
        rc.rank = rank(rc, P);
        if (rc.gold && rc.rank === 0) rc.rank = 6;   // 金BAR
        if (rc.rank >= 5) rc.forceAim = true;
        rc.startRank = rc.rank;
        rc.done = true;
    }
    // ジャッジ 1 ゲーム: { t: 'aim' | 'super' | 'slide' | 'up' }
    function judge(rc, rng, P, isRare) {
        if (rc.forceAim) return { t: 'aim' };
        if (isRare) {
            rc.rank = Math.min(5, rc.rank + 2);
            if (rc.rank >= 5) rc.forceAim = true;
            return { t: 'super' };
        }
        const x = rng.next();
        if (x < P.JUDGE_AIM) return { t: 'aim' };
        if (x < P.JUDGE_AIM + P.JUDGE_STAY) return { t: 'slide' };
        rc.rank++;
        if (rc.rank >= 5) rc.forceAim = true;
        return { t: 'up' };
    }
    SBJ.KooriChance = { start, hit, rank, finish, judge };
})(globalThis.SBJ || (globalThis.SBJ = {}));
