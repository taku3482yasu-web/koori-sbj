// ① カジノバトル (前兆の 連続演出) の 組み立て (設計書 7 章)
// ブラックジャック 50%・ポーカー 25%・ルーレット 25%。勝敗は 組み立てた 時点で きまって いる
// steps[0] = 開始、steps[1..] = 毎G (最後が final)
(function (SBJ) {
    'use strict';
    const { Cards } = SBJ;
    const COLORS = ['blue', 'green', 'red', 'gold'];
    const CUTINS = ['white', 'green', 'red', 'rainbow'];

    // こおりくんの 手札: 最後の HIT の 前までは 相手の 合計に 届かない。勝ち = 最後に 相手より 大きく 21 以下・負け = 最後に バースト
    function genHand(rng, win, dealer, hits) {
        for (let tries = 0; tries < 50000; tries++) {
            const cs = [Cards.newCard(rng), Cards.newCard(rng)];
            let t = Cards.total(cs);
            if (t >= dealer) continue;
            let ok = true;
            for (let i = 0; i < hits; i++) {
                cs.push(Cards.newCard(rng)); t = Cards.total(cs);
                if (i < hits - 1 && t >= dealer) { ok = false; break; }
            }
            if (ok && (win ? (t > dealer && t <= 21) : t > 21)) return cs;
        }
        return null;
    }
    // 相手の 2 枚 (色 = black ♠♣ / red ♥♦)
    function dealerCards(rng, t, color) {
        const suits = color === 'red' ? [1, 2] : [0, 3];
        for (let i = 0; i < 2000; i++) {
            const a = { r: rng.int(1, 13), s: rng.pick(suits) }, b = { r: rng.int(1, 13), s: rng.pick(suits) };
            if (Cards.total([a, b]) === t) return [a, b];
        }
        return [{ r: 10, s: suits[0] }, { r: t - 10, s: suits[1] }];
    }
    const finalCutin = (rng, B, win, high) => CUTINS[rng.weighted(win ? B.cutinWin : (high ? B.cutinLoseHigh : B.cutinLoseLow))];

    // win = 当選 (本前兆) か。high = ボーナス高確 滞在中 (負けの 緑カットイン用)。trigger = 契機の 成立役
    function makeBattle(rng, P, win, high, trigger) {
        const B = P.battle;
        const kind = B.kinds[rng.weighted(B.kindW)];
        let opp = rng.weighted(win ? B.oppWin : B.oppLose);
        // チェリー契機 → しろくま支配人・スイカ契機 → つららちゃん (勝利期待度 50% 以上)
        const to = B.triggerOpp[trigger];
        if (to != null && rng.chance(win ? B.triggerWin : B.triggerLose)) opp = to;
        const intro = rng.pick(B.intros);
        if (kind !== 'bj') return makeOther(rng, P, kind, win, high, opp, intro);

        let dealer, hits, hand;
        for (let t = 0; t < 100 && !hand; t++) {
            dealer = win ? B.dealerWin.hands[rng.weighted(B.dealerWin.w)] : B.dealerLose.hands[rng.weighted(B.dealerLose.w)];
            hits = 1 + rng.weighted(win ? B.hitsWin : B.hitsLose);
            hand = genHand(rng, win, dealer, hits);
        }
        const oppColor = SBJ.OPPS[opp].color;
        const match = rng.chance(win ? B.colorMatchWin : B.colorMatchLose);
        const dColor = match ? oppColor : (oppColor === 'black' ? 'red' : 'black');
        const dCards = dealerCards(rng, dealer, dColor);
        const base = { kind, opp, dealer, dealerCards: dCards, dealerColor: dColor, colorMatch: match };
        const steps = [{ ...base, phase: 'start', intro, cards: hand.slice(0, 2), total: Cards.total(hand.slice(0, 2)) }];
        let lv = rng.weighted(win ? B.hitColorWin : B.hitColorLose);
        for (let i = 0; i < hits; i++) {
            const cs = hand.slice(0, 3 + i);
            const last = i === hits - 1;
            // 驚きアクション: つぎの HIT の 色が 1 段階 UP (つぎが ある とき だけ)
            const surprise = !last && rng.chance(win ? B.surpriseWin : B.surpriseLose);
            const step = { ...base, phase: last ? 'final' : 'hit', cards: cs, card: hand[2 + i], total: Cards.total(cs), color: COLORS[Math.min(3, lv)], surprise, hitNo: i + 1 };
            if (last) { step.win = win; step.cutin = finalCutin(rng, B, win, high); step.highHint = !win && step.cutin === 'green'; }
            steps.push(step);
            if (surprise) lv++;
        }
        return { kind, opp, win, dealer, hits, steps, i: 0 };
    }

    // ポーカー・ルーレット
    function makeOther(rng, P, kind, win, high, opp, intro) {
        const B = P.battle, C = SBJ.CAST, oppName = SBJ.OPPS[opp].name;
        const n = 1 + rng.weighted(win ? B.otherHitsWin : B.otherHitsLose);
        const steps = [];
        if (kind === 'poker') {
            // 注意を 促す セリフ・幸運を 祈る セリフ = 約 50%
            const caution = rng.chance(win ? 0.5 : 0.25);
            steps.push({ kind, phase: 'start', intro, opp, line: caution ? rng.pick([oppName + '「気をつけな…」', C.main + '「幸運を 祈ってて」']) : oppName + '「さあ 勝負だ」' });
            for (let i = 0; i < n; i++) {
                const st = { kind, opp, phase: i === n - 1 ? 'final' : 'hit', hitNo: i + 1, act: 'RAISE!' };
                if (st.phase === 'final') {
                    st.win = win; st.cutin = finalCutin(rng, B, win, high); st.highHint = !win && st.cutin === 'green';
                    st.called = win && rng.chance(B.pokerCalled);   // 相手が コール = 勝利濃厚
                    // 相手の 役: フォーカード = 基本・スリーカード = チャンス・ワンペア = 勝利濃厚
                    st.oppHand = win ? ['フォーカード', 'スリーカード', 'ワンペア'][rng.weighted(B.pokerHandWin)] : ['フォーカード', 'スリーカード'][rng.weighted(B.pokerHandLose)];
                }
                steps.push(st);
            }
        } else {
            const other = win ? rng.chance(0.5) : rng.chance(0.3);   // 別の セリフ = 約 50%
            steps.push({ kind, phase: 'start', intro, opp, line: other ? C.main + '「今日の ぼくは 冷えてるよ」' : C.main + '「回すよー」' });
            for (let i = 0; i < n; i++) {
                const st = { kind, opp, phase: i === n - 1 ? 'final' : 'hit', hitNo: i + 1 };
                // base = ふつう・half = 約 50%・up = 期待度 UP・win = 勝利濃厚 (勝ちの ときだけ)
                const pool = [[oppName + '「入るかな？」', 'base'], [oppName + '「まだだ…」', 'base'], [C.main + 'が つまずいた!', 'half'], ['チップ乱入!!', 'up']];
                if (win && opp === 2) pool.push([C.tiffany + '「いける！」', 'win']);
                if (win && opp === 3) pool.push([C.rosa + '「ここが 勝負所よ！」', 'win']);
                if (win) pool.push([oppName + '「諦めるな…！」', 'win']);
                st.say = pool[rng.weighted(pool.map(x => x[1] === 'base' ? (win ? 2 : 6) : x[1] === 'up' ? (win ? 3 : 1) : 2))][0];
                if (st.phase === 'final') { st.win = win; st.cutin = finalCutin(rng, B, win, high); st.highHint = !win && st.cutin === 'green'; st.ball = win ? 'WIN' : 'LOSE'; }
                steps.push(st);
            }
        }
        return { kind, opp, win, steps, i: 0 };
    }
    SBJ.Battle = { makeBattle, genHand };
})(globalThis.SBJ || (globalThis.SBJ = {}));
