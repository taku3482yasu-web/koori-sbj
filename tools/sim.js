// 機械割 シミュレーション (node tools/sim.js [ゲーム数=4000000] [設定=1-6] [--loose = 適当打ち] [--seed=N])
const SBJ = require('./load.js');
const { createPlayer } = require('./player.js');

function simulate(setting, games, { seed = 1, aim = true } = {}) {
    const rng = SBJ.createRng(seed * 7919 + setting);
    const E = SBJ.createEngine({ setting, credit: 1e12, rng });
    const pl = createPlayer(E, SBJ.createRng(seed * 104729 + setting), { aim });
    let maxLoop = 0, loopStart = 0, maxYuri = 0;
    for (let i = 0; i < games; i++) {
        pl.play();
        maxYuri = Math.max(maxYuri, E.yuriDiff());
        // 1 回の ループ (通常時に もどるまで) の 長さ
        if (E.S.mode === 'normal' && !E.S.omen) loopStart = i; else maxLoop = Math.max(maxLoop, i - loopStart);
    }
    const S = E.S;
    return { setting, games, rate: S.totalOut / S.totalIn, first: S.stats.first, rc: S.stats.rc, st: S.stats.st, sst: S.stats.sst, joker: S.stats.joker, big: S.stats.big, reg: S.stats.reg, miss: S.stats.miss, maxLoop, maxYuri, freeze: S.stats.freeze, ending: S.stats.ending, yuriDone: S.stats.yuriDone };
}
module.exports = { simulate };

if (require.main === module) {
    const args = process.argv.slice(2);
    const games = Number(args.find(a => /^\d+$/.test(a) && Number(a) > 6)) || 4000000;
    const range = args.find(a => /^\d(-\d)?$/.test(a));
    const [lo, hi] = range ? range.split('-').map(Number).concat([]) : [1, 6];
    const seed = Number((args.find(a => a.startsWith('--seed=')) || '--seed=1').slice(7));
    const aim = !args.includes('--loose');
    const BOOK = { 1: 97.8, 2: 98.7, 3: 100.1, 4: 105.7, 5: 110.0, 6: 112.7 };
    console.log(`${games.toLocaleString()} G / 設定 ${lo}〜${hi || lo} / ${aim ? '左 BAR 狙い' : '適当打ち'} / seed ${seed}`);
    for (let s = lo; s <= (hi || lo); s++) {
        const r = simulate(s, games, { seed, aim });
        const per = n => n ? '1/' + (games / n).toFixed(0) : '-';
        console.log(`設定${s}  機械割 ${(r.rate * 100).toFixed(1)}% (本家 ${BOOK[s]}%)  初当り ${per(r.first)}  こおりチャンス ${per(r.rc)}  ST ${r.st} SST ${r.sst} JOKER ${r.joker}  取りこぼし ${per(r.miss)}  最長ループ ${r.maxLoop}G`);
    }
}
