// リール制御: 押した 位置から 最大 4 コマ すべらせて 成立役の 停止形を 作る (設計書 5 章)
// 画面に ふれない。decideStop は 結果 (成立役) を 変えない (取りこぼしの 払い出しだけ 例外)
(function (SBJ) {
    'use strict';
    const { STRIPS, SHAPES, FLAG_SHAPES, CAN_MISS, BONUS_PAT, P1, P2, P3, ANY } = SBJ;
    const L = i => STRIPS[i].length;
    const mod = (i, n) => ((n % L(i)) + L(i)) % L(i);
    const eqW = (x, y) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
    const isP13 = w => eqW(w, P1) || eqW(w, P3);
    // 上段が top の ときの 窓 [上, 中, 下]
    // 窓 → 上段の 番号 (先読みの おぼえ用。配列の 中で 窓は 1 か所に きまる)
    const topIndex = STRIPS.map((st, j) => { const m = new Map(); for (let t = 0; t < st.length; t++) m.set([st[t], st[(t + 1) % st.length], st[(t + 2) % st.length]].join(), t); return m; });
    const topOf = (j, w) => topIndex[j].get(w.join());
    function windowAt(reel, top) { const st = STRIPS[reel]; top = mod(reel, top); return [st[top], st[(top + 1) % st.length], st[(top + 2) % st.length]]; }
    const cellOK = (req, sym) => req === ANY || (req[0] === '!' ? sym !== req.slice(1) : req === sym);
    const winOK = (req, w) => req.every((r, i) => cellOK(r, w[i]));
    function shapeMatch(name, W) {
        const sh = SHAPES[name];
        for (let j = 0; j < 3; j++) if (!winOK(sh.reels[j], W[j])) return false;
        return true;
    }
    const SHAPE_KEYS = Object.keys(SHAPES);
    function matchedShapes(W) { const m = []; for (const n of SHAPE_KEYS) if (shapeMatch(n, W)) m.push(n); return m; }

    // 狙い t に対して ここまでの 停止 W (止まって いない リールは null) が 矛盾しないか
    // MISS = ハズレ (左に P1・P3 を 出さない・揃ったら どの 形にも 一致しない)
    // MISS_LOOSE = 取りこぼし後 (どの 形にも 一致しない だけ)・REACH_B = 左 P3 で どの 形にも 一致しない
    function fullOK(t, W) {
        if (t === 'MISS' || t === 'MISS_LOOSE' || t === 'REACH_B') {
            if (t === 'MISS' && isP13(W[0])) return false;
            if (t === 'REACH_B' && !eqW(W[0], P3)) return false;
            return matchedShapes(W).length === 0;
        }
        const sh = SHAPES[t];
        if (sh.noP13 && isP13(W[0])) return false;
        const m = matchedShapes(W);
        return m.length === 1 && m[0] === t;
    }
    // 止まって いない リールを どこかに 止めれば 狙いの 形に できるか (先読み)。結果は おぼえて おく
    const memo = new Map();
    function targetOK(t, W, tops) {
        if (W[0] && W[1] && W[2]) return fullOK(t, W);
        const key = t + '|' + tops.join(',');
        let v = memo.get(key);
        if (v !== undefined) return v;
        const j = W.findIndex(w => !w);
        v = false;
        for (let top = 0; top < L(j) && !v; top++) {
            const W2 = W.slice(), t2 = tops.slice();
            W2[j] = windowAt(j, top); t2[j] = top;
            v = targetOK(t, W2, t2);
        }
        memo.set(key, v);
        return v;
    }
    function targets(g) {
        if (g.aim != null) return [BONUS_PAT[g.aim]];
        if (g.missed) return ['MISS_LOOSE'];
        return FLAG_SHAPES[g.display];
    }
    // reel を 押した。top0 = すべり 0 で 止まる ときの 上段の コマ番号。wins = 止まった リールの 窓 (止まって いなければ null)
    // 戻り値 { k: すべり コマ数, top: 止まる 上段番号, window }
    function decideStop(g, reel, top0, wins) {
        const tops = wins.map((w, j) => w ? topOf(j, w) : '_');
        // left = true: 左リールは P1・P2・P3 に 止まれる なら そこを 優先 (左 BAR 狙いで 左が 3 パターンに おさまる)
        const tryRange = (ts, maxK, left) => {
            for (let k = 0; k <= maxK; k++) {
                const top = mod(reel, top0 - k), w = windowAt(reel, top);
                if (left && !(eqW(w, P1) || eqW(w, P2) || eqW(w, P3))) continue;
                const W = wins.slice(); W[reel] = w;
                const T = tops.slice(); T[reel] = top;
                if (ts.some(t => targetOK(t, W, T))) return k;
            }
            return -1;
        };
        const try4 = ts => { let k = reel === 0 ? tryRange(ts, 4, true) : -1; if (k < 0) k = tryRange(ts, 4, false); return k; };
        let k = try4(targets(g));
        if (k < 0 && g.aim == null && CAN_MISS[g.display] && !g.missed) {
            g.missed = true;                                   // 取りこぼし (内部の 抽選は そのまま)
            k = try4(targets(g));
        }
        if (k < 0) k = tryRange(targets(g), L(reel) - 1);     // 救済 (ベル・リプレイ・ボーナス図柄): リール 1 周 まで
        if (k < 0) { k = 0; g.stuck = (g.stuck || 0) + 1; }  // 停止不能 (テストで 0 回を 確かめる)
        return { k, top: mod(reel, top0 - k), window: windowAt(reel, top0 - k) };
    }
    // 入賞した 停止形の 光らせる マス [リール, 段] (ANY と ! で ない マス)
    function highlight(g, W) {
        if (g.missed || !W[0] || !W[1] || !W[2]) return [];
        const list = g.aim != null ? [BONUS_PAT[g.aim]] : (FLAG_SHAPES[g.display] || []).filter(n => SHAPES[n]);
        const name = list.find(n => shapeMatch(n, W));
        if (!name) return [];
        const out = [];
        SHAPES[name].reels.forEach((rq, j) => rq.forEach((r, row) => { if (r !== ANY && r[0] !== '!') out.push([j, row]); }));
        return out;
    }
    SBJ.ReelControl = { decideStop, highlight, windowAt, matchedShapes, shapeMatch, targetOK, isP13, mod };
})(globalThis.SBJ || (globalThis.SBJ = {}));
