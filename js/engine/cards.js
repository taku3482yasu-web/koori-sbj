// 乱数 (1 か所に まとめる・シードを 入れられる) と トランプ
(function (SBJ) {
    'use strict';
    // mulberry32。seed が 同じなら 同じ 結果 (テスト・バグの 再現用)
    SBJ.createRng = function (seed) {
        let a = (seed === undefined ? (Math.random() * 2 ** 32) : seed) >>> 0;
        const next = () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const r = {
            next,
            int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
            pick: arr => arr[Math.floor(next() * arr.length)],
            // 重みで えらぶ (添字を 返す)
            weighted(ws) {
                let s = 0; for (const w of ws) s += w;
                let x = next() * s;
                for (let i = 0; i < ws.length; i++) { if ((x -= ws[i]) < 0) return i; }
                return ws.length - 1;
            },
            chance: p => next() < p,
        };
        return r;
    };

    // ----- トランプ -----
    // { r: 1〜13, s: 0♠ 1♥ 2♦ 3♣ }。ワイルド = { wild: true, wv: 1〜11 }
    const newCard = rng => ({ r: rng.int(1, 13), s: rng.int(0, 3) });
    const cardValue = c => c.wild ? c.wv : (c.r >= 10 ? 10 : c.r);
    // 合計 (A は 1 か 11 の 得な 方)
    function total(cards) {
        let t = 0, ace = false;
        for (const c of cards) { t += cardValue(c); if (!c.wild && c.r === 1) ace = true; }
        if (ace && t + 10 <= 21) t += 10;
        return t;
    }
    const isRed = c => !c.wild && (c.s === 1 || c.s === 2);
    // ワイルドカード: 21 を 超えない いちばん 大きい 数 (1〜11)
    function wildFor(cards) {
        for (let v = 11; v >= 1; v--) if (total(cards.concat([{ wild: true, wv: v }])) <= 21) return { wild: true, wv: v };
        return { wild: true, wv: 1 };
    }
    SBJ.Cards = { newCard, cardValue, total, isRed, wildFor };
})(globalThis.SBJ || (globalThis.SBJ = {}));
