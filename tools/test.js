// テスト (node tools/test.js [--quick]) — 設計書 13 章の 自動テスト
// 停止形・停止不能・左の 3 パターン・スイカの 目押し・BJ バトルの 法則・こおりチャンス・無限ループ・機械割
const SBJ = require('./load.js');
const { createPlayer } = require('./player.js');
const { simulate } = require('./sim.js');
const { ReelControl: RC, Cards, Battle, KooriChance, FLAG_SHAPES, BONUS_PAT, P1, P2, P3, PARAMS: P } = SBJ;
const sameShape = (a, b) => a === b;
const quick = process.argv.includes('--quick');
let ok = 0, ng = 0;
function check(name, cond, info) { if (cond) ok++; else { ng++; console.log('✗', name, info === undefined ? '' : info); } }
const eqW = (a, b) => a && b && a.every((x, i) => x === b[i]);

// ----- 1. 停止形 (30 万 G × 目押し / 適当打ち) -----
function verifyShapes(aim, games) {
    const E = SBJ.createEngine({ setting: 1 + (aim ? 0 : 5), credit: 1e12, seed: aim ? 11 : 12 });
    const pl = createPlayer(E, SBJ.createRng(aim ? 21 : 22), { aim });
    let bad = 0, stuck = 0, leftOut = 0, first = null;
    for (let i = 0; i < games; i++) {
        const { g, wins } = pl.play();
        stuck += g.stuck || 0;
        const m = RC.matchedShapes(wins);
        let good;
        if (g.missed) good = m.length === 0;
        else if (g.aim != null) good = m.length === 1 && m[0] === BONUS_PAT[g.aim];
        else if (g.display === 'MISS') good = m.length === 0 && !RC.isP13(wins[0]);
        else if (g.display === 'REACH') good = (m.length === 1 && m[0] === 'REACH_A') || (m.length === 0 && eqW(wins[0], P3));
        else good = m.length === 1 && FLAG_SHAPES[g.display].includes(m[0]) && !(SBJ.SHAPES[m[0]].noP13 && RC.isP13(wins[0]));
        if (!good) { bad++; if (!first) first = { flag: g.flag, display: g.display, aim: g.aim, wins, m }; }
        // 左 BAR 狙いなら 左は P1・P2・P3 の どれか (ボーナス図柄の 狙えゲームは のぞく)
        if (aim && g.aim == null && !eqW(wins[0], P1) && !eqW(wins[0], P2) && !eqW(wins[0], P3)) leftOut++;
    }
    return { bad, stuck, leftOut, first };
}
const G1 = quick ? 30000 : 300000;
for (const aim of [true, false]) {
    const r = verifyShapes(aim, G1);
    check(`停止形 ${aim ? '目押し' : '適当打ち'}: 狙った 形だけに 一致`, r.bad === 0, r.bad + ' 回 ' + JSON.stringify(r.first));
    check(`停止不能 0 回 (${aim ? '目押し' : '適当打ち'})`, r.stuck === 0, r.stuck);
    if (aim) check('左 BAR 狙いで 左は 3 パターンに おさまる', r.leftOut === 0, r.leftOut);
}

// ----- 2. スイカ: 左上段スイカで 中に スイカを 狙うと 取れる・狙わないと こぼれる -----
{
    const { SUI_CENTER } = require('./player.js');
    let got = 0, gotNo = 0, n = 0;
    for (let i = 0; i < 2000; i++) {
        const g = { flag: 'SUI', display: 'SUI', events: [], post: [] };
        const w = [null, null, null];
        w[0] = RC.decideStop(g, 0, 13 + (i % 2), w).window;
        if (g.missed || !eqW(w[0], P3)) continue;
        n++;
        const ga = { ...g }, wa = w.slice();
        wa[1] = RC.decideStop(ga, 1, SUI_CENTER[i % SUI_CENTER.length], wa).window; wa[2] = RC.decideStop(ga, 2, i % 20, wa).window;
        if (!ga.missed) got++;
        const gb = { ...g }, wb = w.slice();
        const notSui = [...Array(20).keys()].filter(t => !SUI_CENTER.includes(t));
        wb[1] = RC.decideStop(gb, 1, notSui[i % notSui.length], wb).window; wb[2] = RC.decideStop(gb, 2, i % 20, wb).window;
        if (!gb.missed) gotNo++;
    }
    check('スイカ: 中に 狙えば かならず 取れる', n > 0 && got === n, `${got}/${n}`);
    check('スイカ: 狙わないと こぼれる', gotNo === 0, `${gotNo}/${n}`);
}

// ----- 3. BJ バトル -----
{
    const rng = SBJ.createRng(5);
    let bad15 = 0, bad4 = 0, greenLow = 0, seq = 0, n = 0, penLose = 0, rbLose = 0, noTalk = 0;
    for (let i = 0; i < (quick ? 20000 : 100000); i++) {
        const win = rng.chance(0.5), high = rng.chance(0.5);
        const b = Battle.makeBattle(rng, P, win, high, rng.pick([null, 'CHE', 'SUI']));
        const fin0 = b.steps[b.steps.length - 1];
        if (!win && fin0.cutin === 'green' && !high) greenLow++;
        if (!win && b.opp >= 5) penLose++;
        // 登場カットイン・会話・最終G の ひとこと: 虹 (勝利濃厚) は 負けに 出ない・どの バトルにも 付く
        const st0 = b.steps[0], finT = b.steps[b.steps.length - 1].talk;
        if (!st0.talk || !finT) noTalk++;
        else if (!win && [st0.talk.cut, ...st0.talk.lines.map(l => l.color), finT.color].includes('rainbow')) rbLose++;
        if (b.kind !== 'bj') continue;
        n++;
        if (!win && b.dealer === 15) bad15++;
        if (!win && b.hits === 4) bad4++;
        const fin = b.steps[b.steps.length - 1];
        // カードの 並び: 最後の HIT の 前までは 相手に 届かない・最後は 勝ち = 相手より 大きく 21 以下 / 負け = バースト
        const cs = fin.cards;
        let good = Cards.total(cs.slice(0, 2)) < b.dealer && Cards.total(b.steps[0].dealerCards) === b.dealer;
        for (let k = 3; k < cs.length; k++) if (Cards.total(cs.slice(0, k)) >= b.dealer) good = false;
        const t = Cards.total(cs);
        if (win ? !(t > b.dealer && t <= 21) : !(t > 21)) good = false;
        if (b.steps.length !== b.hits + 1) good = false;
        if (!good) seq++;
    }
    check('BJ バトル: 相手 15 は 負けに 出ない', bad15 === 0, bad15);
    check('BJ バトル: HIT 4 回は 負けに 出ない', bad4 === 0, bad4);
    check('カジノバトル: 緑カットインの 負けは 低確で 出ない', greenLow === 0, greenLow);
    check('カジノバトル: ペンちゃん・かきごおりちゃんは 負けに 出ない', penLose === 0, penLose);
    check('カジノバトル: 会話と カットインが どの バトルにも 付く', noTalk === 0, noTalk);
    check('カジノバトル: 虹色の 会話・カットインは 負けに 出ない', rbLose === 0, rbLose);
    check('BJ バトル: カードの 並びが 7 章の 条件どおり', seq === 0, `${seq}/${n}`);
}

// ----- 4. トランプと こおりチャンス -----
{
    const c = (r) => ({ r, s: 0 });
    check('A + K = 21', Cards.total([c(1), c(13)]) === 21);
    check('A + A = 12', Cards.total([c(1), c(1)]) === 12);
    check('A + 9 + 5 = 15 (A は 1)', Cards.total([c(1), c(9), c(5)]) === 15);
    check('ワイルド: 合計 14 なら 7', Cards.wildFor([c(10), c(4)]).wv === 7);
    check('ワイルド: 合計 8 なら 11', Cards.wildFor([c(5), c(3)]).wv === 11);
    const rc = (cards, extra = {}) => Object.assign({ cards: cards.map(c), bust: false, five: false, natural: false, joker: false, gold: false }, extra);
    const rank = (x) => KooriChance.rank(x, P);
    check('17 以下 → REG', rank(rc([10, 7])) === 0);
    check('18 → 赤7BIG', rank(rc([10, 8])) === 1);
    check('19 → 赤7BIG', rank(rc([10, 9])) === 1);
    check('20 → 青7BIG', rank(rc([10, 10])) === 2);
    check('21 → スーパーBIG', rank(rc([10, 5, 6])) === 3);
    check('ナチュラル → エピソード', rank(rc([1, 13], { natural: true })) === 4);
    check('バースト → REG', rank(rc([10, 9, 5], { bust: true })) === 0);
    check('ファイブカード 20 → +1', rank(rc([2, 3, 4, 5, 6], { five: true })) === 3);
    check('ジョーカー 20 → +1', rank(rc([10, 10], { joker: true })) === 3);
    check('ナチュラル + ジョーカー (jokerNatural で 切りかえ)', rank(rc([1, 13], { natural: true, joker: true })) === (P.jokerNatural ? 5 : 4));
    check('ジョーカーでも 最大 5', rank(rc([10, 5, 6], { joker: true, five: true })) === 5);
    const x = rc([10, 6]); x.gold = true; KooriChance.finish(x, P); check('金BAR 中の REG → 金BAR (6)', x.rank === 6 && x.forceAim);
    // 終了条件: 6G (レア役で 延長)・5 枚・21・バースト
    const rng = SBJ.createRng(9);
    let bad = 0;
    for (let i = 0; i < 20000; i++) {
        const r = KooriChance.start(rng, { games: P.rcGames });
        if (r.natural) continue;
        let rares = 0;
        while (!r.done) {
            const flag = rng.pick(['PUSHBEL', 'COMBEL', 'REP', 'MISS', 'CHE', 'SUI', 'REP']);
            const rare = flag === 'CHE' || flag === 'SUI';
            if (rare) rares++;
            KooriChance.hit(r, rng, flag, rare);
            if (r.games > P.rcGames + rares) { bad++; break; }
        }
        const t = Cards.total(r.cards);
        const why = r.bust ? t > 21 : r.five ? r.cards.length === 5 && t <= 21 : (t === 21 || r.games === P.rcGames + rares);
        if (!why) bad++;
    }
    check('こおりチャンス: 終了条件 (バースト・5 枚・21・6G + 延長)', bad === 0, bad);
}

// ----- 5. 無限ループと 機械割 -----
{
    const games = quick ? 600000 : 4000000;
    const res = [1, 6].map(s => simulate(s, games, { seed: 3 }));
    for (const r of res) check(`無限ループ なし (設定${r.setting} 最長 ${r.maxLoop}G < 10000G)`, r.maxLoop < 10000, r.maxLoop);
    const r6 = res[1];
    check(`ロングフリーズが 起きる (${r6.freeze} 回)`, r6.freeze > 0, r6.freeze);
    check(`エンディング・有利区間 完走が 起きる (${r6.ending} / ${r6.yuriDone} 回)`, r6.ending > 0 && r6.yuriDone > 0);
    check(`有利区間の 差枚は 2400 を 大きく 超えない (最大 ${r6.maxYuri})`, r6.maxYuri <= P.yuriCap + 20, r6.maxYuri);
    if (!quick) {
        // 完成の 判定: 設定 1 = 約 98〜100%・設定 6 = 約 111〜113% (1 回ごとに ±1〜2% ぶれるので 少し ひろめ)
        check(`機械割 設定1 ${(res[0].rate * 100).toFixed(1)}% (97〜101%)`, res[0].rate > 0.97 && res[0].rate < 1.01, res[0].rate);
        check(`機械割 設定6 ${(res[1].rate * 100).toFixed(1)}% (110〜114%)`, res[1].rate > 1.10 && res[1].rate < 1.14, res[1].rate);
    }
}

console.log(`${ok} / ${ok + ng} 成功`);
process.exit(ng ? 1 : 0);
