// シミュレーション用の 打ち手 (設計書 10 章の 打ち方)
// 左 BAR (13 番) を 枠上〜上段に 狙う・左上段スイカなら 中に スイカを 狙う・ナビ通り・こおりチャンスは 17 以上で STAND
// aim = false で 適当打ち (どこでも 押す・ナビなしは 左から)
const SBJ = require('./load.js');
const { STRIPS } = SBJ;
const N = STRIPS[0].length;
// 中に スイカを 狙う ときの すべり 0 の 上段 (4 コマ以内に 中段 スイカが 来る 位置)
const SUI_CENTER = [];
for (let t = 0; t < N; t++) for (let k = 0; k <= 4; k++) if (STRIPS[1][(((t - k) % N) + N + 1) % N] === 'SUI') { SUI_CENTER.push(t); break; }

function createPlayer(E, rng, opt = {}) {
    const aim = opt.aim !== false;
    const standAt = opt.standAt || 17;
    function topFor(reel, wins) {
        if (!aim) return rng.int(0, N - 1);
        if (reel === 0) return rng.pick([13, 14]);                                   // BAR を 上段 / 枠上
        if (reel === 1 && wins[0] && wins[0][0] === 'SUI') return rng.pick(SUI_CENTER);
        return rng.int(0, N - 1);
    }
    // 1 ゲーム。戻り値 { g, res } (メダル切れは null)
    function play() {
        const S = E.S;
        if (S.mode === 'rcPromo' && E.total(S.rc.cards) >= standAt) E.stand();
        const g = E.lever();
        if (g.error) return null;
        const order = g.nav ? g.nav.slice() : [0, 1, 2];
        const wins = [null, null, null];
        for (const r of order) wins[r] = E.decideStop(g, r, topFor(r, wins), wins).window;
        const res = E.settle(g, order);
        return { g, res, wins, order };
    }
    return { play };
}
module.exports = { createPlayer, SUI_CENTER };
