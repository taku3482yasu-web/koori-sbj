// エンジン: 状態と ゲームの 進行 (設計書 2・6〜9・12 章)。DOM に ふれない (node でも うごく)
// 抽選は ぜんぶ lever() で 終わらせる。状態遷移は g.post に 積んで settle() (第 3 停止の あと) で 実行する
// 状態: normal・rchigh・prep・bonus・rcPromo・rcJudge・st・ending (前兆は normal / rchigh に 重なる 副状態 S.omen)
(function (SBJ) {
    'use strict';
    const { PARAMS, BONUS_PAT, Cards, Lottery, Battle, KooriChance, ReelControl } = SBJ;
    const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

    function createEngine(opts = {}) {
        const P = opts.params || PARAMS;
        const rng = opts.rng || SBJ.createRng(opts.seed);
        const S = {};
        const isRare = Lottery.isRare;
        const fx = opts.effects === false ? null : SBJ.createHints(S, P, rng);   // 演出 (シミュレーションでは 切れる)

        function reset(setting) {
            const credit = opts.credit != null ? opts.credit : P.startCredit;
            const custom = S.custom || { bb: 'koori', simple: false, sakibare: false };
            const keepSetting = setting || S.setting || opts.setting || 1;
            for (const k of Object.keys(S)) delete S[k];
            Object.assign(S, {
                setting: keepSetting, custom,
                credit, invest: credit,
                mode: 'normal', games: 0, totalIn: 0, totalOut: 0, replayNext: false,
                bonusHigh: false, showHigh: false, china: false, sinceBig: 0, normalG: 0,
                ceilMax: P.ceilShort,                                         // 設定変更 直後は 666G
                regStreak: 0, suikaCnt: 0, suikaTarget: rng.int(P.suikaFirst[0], P.suikaFirst[1]), suikaReady: false, chain: 0,
                pending: null, omen: null, prep: null, bonus: null,
                rcA: false, rcB: 0, firstBigRc: false, rcGot: false,
                rc: null, st: null, stocks: 0, release: 0, stQueue: [],
                goldBar: false, rcRegStreak: 0, joker: 0,
                yuri: false, yuriBase: 0, lastLed: null,
                stats: { big: 0, reg: 0, first: 0, rc: 0, st: 0, sst: 0, joker: 0, miss: 0, freeze: 0, ending: 0, yuriDone: 0 },
            });
        }
        reset(opts.setting);
        const diff = () => S.totalOut - S.totalIn;
        const startYuri = () => { if (!S.yuri) { S.yuri = true; S.yuriBase = diff(); } };

        // ================= 1 ゲーム =================
        function lever() {
            if (!S.replayNext) {
                if (S.credit < P.bet) return { error: 'メダルが 足りないよ' };
                S.credit -= P.bet; S.totalIn += P.bet;
            }
            const wasReplay = S.replayNext;
            S.replayNext = false;
            S.games++;
            const g = { flag: Lottery.drawFlag(S, P, rng), events: [], post: [], nav: null, order: null, modeAtLever: S.mode, wasReplay };
            g.display = g.flag;
            g.rare = isRare(g.flag);
            if (g.flag === 'PUSHBEL') { g.order = rng.pick(PERMS); if (Lottery.navOn(S, P, rng)) g.nav = g.order; }
            switch (S.mode) {
                case 'normal': case 'rchigh': gameNormalLike(g); break;
                case 'prep': gamePrep(g); break;
                case 'bonus': gameBonus(g); break;
                case 'rcPromo': gameRcPromo(g); break;
                case 'rcJudge': gameRcJudge(g); break;
                case 'st': gameST(g); break;
                case 'ending': if (fx && rng.chance(SBJ.SETTING_HINT.endingRate)) g.events.push({ t: 'set', text: 'エンディング: ' + fx.settingChar('ending') }); break;
            }
            return g;
        }

        // ================= 通常時・RC 高確 =================
        function gameNormalLike(g) {
            const fl = g.flag;
            if (Lottery.CHAIN[fl]) S.chain++; else if (fl !== 'REP') S.chain = 0;
            if (S.mode === 'normal') { S.sinceBig++; S.normalG++; }
            if (S.omen) stepOmen(g);       // 前兆中は 新しい 当選抽選を しない
            else {
                const win = S.mode === 'normal' ? Lottery.lotNormal(S, P, rng, g) : Lottery.lotRcHigh(S, P, rng, g);
                if (win) startWin(g, win);
                else if (g.rare && rng.chance(P.gaseRare)) startGase(g, rng.chance(P.omenLong.gase) ? P.omenLong.pre : rng.int(0, 2), fl);
                else if (S.mode === 'normal' && S.bonusHigh && !g.rare && fl !== 'PINCH' && rng.chance(P.gaseHigh)) startGase(g, rng.int(0, 1), null);
            }
            if (fx) {
                if (S.mode === 'normal' && P.dice.includes(S.normalG)) g.dice = fx.makeDice();
                g.hints = fx.makeHints(g);
                g.stage = stageOf();
                g.fx = fx.pickFX(g, g.stage);
                if (S.mode === 'normal') g.subBg = S.regStreak >= P.regCeil ? 'red' : S.regStreak >= 1 && rng.chance(SBJ.HINT_RATE.subBgGreen) ? 'green' : 'blue';
            }
            if (S.mode === 'rchigh') {
                if (S.rcB > 0) S.rcB--;
                if (!S.omen && !S.pending && S.rcB <= 0 && !S.rcA) g.post.push(endRcHigh);
            }
        }
        function startGase(g, pre, trigger) {
            S.omen = { pre, battle: Battle.makeBattle(rng, P, false, S.bonusHigh, trigger), win: false };
            g.events.push({ t: 'omen', text: '…ん？' });
        }
        function startWin(g, win) {
            win.led = fx ? fx.led(g.flag) : null;
            win.trigger = g.flag;
            // ロングフリーズ: 当選した リーチ目役の 1/30 → 半々で SST (2 セット以上) か ジョーカーモード (残り 13 回)
            if (g.flag === 'REACH' && rng.chance(P.freezeReach)) {
                const joker = rng.chance(0.5);
                g.freeze = joker ? 'ジョーカーモード 当選!!' : 'スーパーストックタイム (200G 以上)!!';
                S.stats.freeze++;
                S.pending = joker ? { kind: 'rc', joker: true, led: win.led } : { kind: 'st', super: true, minSets: P.freezeSSTSets, why: 'ロングフリーズ', led: win.led };
                g.post.push(resolveWin);
                return;
            }
            // RC 高確の 当選の 15% は こおりチャンスでは なく 直撃ボーナス (準備中へ)
            if (win.kind === 'rc' && rng.chance(P.rcDirect)) win = { kind: 'bonus', type: 1 + rng.weighted(P.rcDirectW), route: 'rc', led: win.led, trigger: g.flag };
            S.pending = win;
            const now = g.flag === 'REACH' || win.ceil || rng.chance(P.omenNow);
            if (now) {
                g.events.push({ t: 'flash', text: win.ceil ? '天井 到達！' : 'キュイン!!', kyuin: true });
                g.post.push(resolveWin);
            } else {
                const pre = rng.chance(P.omenLong.real) ? P.omenLong.pre : rng.int(P.omenPre[0], P.omenPre[1]);
                S.omen = { pre, battle: Battle.makeBattle(rng, P, true, S.bonusHigh, g.flag), win: true, hawaii: rng.chance(P.hawaiiRate) };   // ハワイ移行 = 本前兆濃厚 (本前兆の 一部だけ)
                g.events.push({ t: 'omen', text: '…ん？' });
            }
        }
        function stepOmen(g) {
            const o = S.omen;
            if (o.pre > 0) { o.pre--; g.events.push({ t: 'omen', text: rng.pick(SBJ.OMEN_TEXT) }); return; }
            const b = o.battle;
            if (!o.win && b.i === 0 && (g.flag === 'REP' || g.flag === 'BELREP')) return;   // リプレイ成立 + バトル発展 = 本前兆濃厚
            g.battle = b.steps[b.i++];
            if (b.i >= b.steps.length) {
                if (o.win && fx && S.pending && S.pending.kind === 'bonus') g.oddity = fx.oddity();   // 告知ゲームの 違和感 (設定示唆)
                g.post.push(o.win ? resolveWin : () => { S.omen = null; });
            }
        }
        function firstType(w) {
            if (w.ceil) return 1;
            if (S.regStreak >= P.regCeil) return rng.chance(P.regCeilBlue) ? 2 : 1;
            return rng.weighted(P.firstSplit);
        }
        function resolveWin() {
            const w = S.pending; S.pending = null; S.omen = null;
            if (!w) return;
            S.lastLed = w.led || null;
            if (w.kind === 'bonus') enterPrep(w.type != null ? w.type : firstType(w), w.route || 'first');
            else if (w.kind === 'rc') { if (w.joker) { S.joker = Math.max(S.joker, P.freezeJoker); S.stats.joker++; } enterRC(); }
            else if (w.kind === 'st') {
                S.bonusHigh = false; S.showHigh = false; S.china = false;
                if (S.mode === 'normal') startYuri();
                enterST(!!w.super, w.why);
                if (w.minSets) S.st.minSets = w.minSets;
            }
        }
        function stageOf() {
            if (S.omen && S.omen.win && S.omen.hawaii) return 'hawaii';
            if (S.mode === 'rchigh') return 'japan';
            if (S.bonusHigh && S.showHigh) return 'japan';
            if (S.china || S.bonusHigh || S.chain >= 3) return 'china';
            return 'casino';
        }

        // ================= ボーナス準備中 =================
        function pushColor(type) {
            const w = P.pushColor[Math.min(type, 5)], keys = Object.keys(w);
            return keys[rng.weighted(keys.map(k => w[k]))];
        }
        function enterPrep(type, route) {
            S.mode = 'prep';
            S.prep = { type, route, g: 0, push: pushColor(type), revealed: false };
        }
        function gamePrep(g) {
            const p = S.prep; p.g++;
            // 初当りの 確定画面中に レア役 → 青7BIG 以上
            if (p.route === 'first' && g.rare && p.type < 2) {
                p.type = 2; p.push = pushColor(2);
                g.events.push({ t: 'flash', text: 'ボーナスレベル UP!' });
            }
            const aimFlag = g.flag === 'REP' || g.flag === 'BELREP' || g.flag === 'THREE';
            if ((aimFlag && p.g >= 2) || p.g >= P.prepMaxG) {
                const t = p.type, r = p.route;
                aimGame(g, t, () => { S.prep = null; if (t === 5) enterST(true, 'ボーナス直撃'); else startBonus(t, r); });
            }
        }
        // 狙えゲーム: 図柄を 揃えて 獲得。停止形の ない 段階 (エピソード・SST) は 揃えずに「確定」を 知らせて 移行
        function aimGame(g, type, after) {
            if (BONUS_PAT[type] == null) { g.award = type; g.post.push(after); return; }
            g.display = BONUS_PAT[type]; g.aim = type; g.nav = null; g.order = null;
            g.post.push(after);
        }
        function revealPush() { if (!S.prep) return null; S.prep.revealed = true; return S.prep.push; }

        // ================= ボーナス (疑似) =================
        function startBonus(type, route) {
            const target = type === 1 ? P.rbigPay[route === 'first' ? 'first' : 'rc'] : type === 6 ? rng.pick(P.spEpPay) : P.bonusPay[type];
            if (type === 0) S.stats.reg++; else S.stats.big++;
            if (route === 'first') {
                S.stats.first++;
                S.normalG = 0;
                if (type === 0) S.regStreak++; else S.regStreak = 0;
                S.bonusHigh = false; S.showHigh = false; S.china = false;
                startYuri();                                  // 通常時の 初当りから 有利区間
            }
            if (type >= 1) { S.sinceBig = 0; S.ceilMax = P.ceil; }
            const stWin = rng.chance(P.bonusST[type]);
            const stSuper = stWin && rng.chance(P.bonusSST[type]);
            if (type === 6) {   // SP エピソード → ジョーカーモード (残り回数は 平均 6 回の 幾何分布)
                S.joker = Math.max(S.joker, 1 + Math.floor(Math.log(1 - rng.next()) / Math.log(1 - 1 / P.jokerMean)));
                S.stats.joker++;
            }
            S.bonus = { type, route, target, paid: 0, stWin, stSuper, revealed: false, g: 0 };
            S.mode = 'bonus';
        }
        function gameBonus(g) {
            const b = S.bonus; b.g++;
            if (fx) { const t = fx.bonusFx(g, b); if (t) g.events.push({ t: 'bbfx', text: t }); }
            // ロングフリーズ: REG 中の レア役の 1/40 → ジョーカーモード
            if (b.type === 0 && g.rare && rng.chance(P.freezeReg)) {
                g.freeze = 'ロングフリーズ!! ジョーカーモード'; S.stats.freeze++;
                S.joker = Math.max(S.joker, P.freezeJoker); S.stats.joker++;
            }
            if (fx && b.type === 0 && g.flag === 'PUSHBEL' && rng.chance(SBJ.SETTING_HINT.regCard)) g.events.push({ t: 'set', text: '11 枚役の トランプ: ' + fx.settingChar('card') });
            if (g.rare && b.stWin && !b.revealed && rng.chance(P.bonusSTReveal)) {
                b.revealed = true;
                g.events.push({ t: 'flash', text: b.stSuper ? 'スーパーストックタイム 確定!!' : 'ストックタイム 確定!' });
            }
        }
        function endBonus() {
            const b = S.bonus; S.bonus = null;
            if (fx) { b.endChar = fx.settingChar('end'); b.trophy = fx.trophy(); }
            if (b.route === 'rc') {
                if (b.type === 0) { S.rcRegStreak++; if (S.rcRegStreak >= P.goldRegStreak && S.joker <= 0) S.goldBar = true; }
                else { S.rcRegStreak = 0; if (S.joker <= 0 && rng.chance(P.goldOther)) S.goldBar = true; }
            }
            if (b.stWin) {
                if (S.release > 0) S.release += b.stSuper ? 2 : 1;   // 放出中は 放出待ちに 足す
                else S.stQueue.push(b.stSuper);
            }
            const firstReg = b.route === 'first' && b.type === 0;
            afterChain(firstReg ? 'normal' : 'rchigh', b.route === 'first' && b.type >= 1);
            return b;
        }
        // ボーナス・ST の あとの 行き先 (上から 優先)
        function afterChain(fallback, firstBig) {
            if (S.release > 0) { S.release--; enterRC(); return; }
            if (S.stQueue.length) { enterST(S.stQueue.shift()); return; }
            if (fallback === 'normal') { S.mode = 'normal'; S.yuri = false; return; }   // 初当り REG: 天井は 引き継ぎ
            enterRcHigh(firstBig);
        }

        // ================= RC 高確 =================
        function enterRcHigh(firstBig) {
            S.mode = 'rchigh';
            S.rcB = rng.int(P.rcB[0], P.rcB[1]);
            S.rcA = S.joker > 0 || rng.chance(P.rcAEnter);
            S.firstBigRc = !!firstBig; S.rcGot = false;
            S.chain = 0;
        }
        function endRcHigh() {
            if (S.mode !== 'rchigh') return;
            if (S.firstBigRc && !S.rcGot) S.ceilMax = P.ceilShort;
            S.mode = 'normal'; S.normalG = 0; S.yuri = false;
        }

        // ================= こおりチャンス =================
        function enterRC() {
            S.stats.rc++; S.rcGot = true;
            const joker = S.joker > 0; if (joker) S.joker--;
            S.rc = KooriChance.start(rng, { games: P.rcGames, joker, gold: S.goldBar });
            S.mode = 'rcPromo';
            if (S.rc.natural) finishPromo();
        }
        function gameRcPromo(g) {
            const rc = S.rc;
            g.rcCard = KooriChance.hit(rc, rng, g.flag, g.rare);
            if (rc.done) g.post.push(finishPromo);
        }
        function finishPromo() {
            if (S.mode !== 'rcPromo') return;
            KooriChance.finish(S.rc, P);
            S.mode = 'rcJudge';
        }
        // 昇格パートで STAND (ゲームを 消費しない)
        function stand() {
            if (S.mode !== 'rcPromo') return false;
            finishPromo();
            return true;
        }
        function gameRcJudge(g) {
            const rc = S.rc;
            const j = KooriChance.judge(rc, rng, P, g.rare);
            g.judge = j.t;
            if (j.t === 'aim') { const r = rc.rank; aimGame(g, r, () => awardRank(r)); }
            else if (j.t === 'super') g.events.push({ t: 'flash', text: '超ジャッジ!! 2 段階 UP' });
            else if (j.t === 'slide') g.events.push({ t: 'slide', text: 'スライド…' });
            else g.events.push({ t: 'up', text: '昇格! → ' + SBJ.BONUS_NAMES[rc.rank] });
        }
        function awardRank(r) {
            S.rc = null;
            if (r === 5) { enterST(true, 'こおりチャンス'); return; }
            if (r === 6) { S.goldBar = false; S.rcRegStreak = 0; }   // 金BAR → SP エピソード
            startBonus(r, 'rc');
        }

        // ================= ストックタイム =================
        function enterST(sup, why) {
            const c = sup ? P.sst : P.st;
            S.mode = 'st';
            S.st = { super: sup, g: 0, len: rng.int(c.len[0], c.len[1]), sets: 1, minSets: 1, why: why || '' };
            S.stocks = 0;
            if (sup) S.stats.sst++; else S.stats.st++;
        }
        function gameST(g) {
            const st = S.st; st.g++;
            const c = st.super ? P.sst : P.st;
            const p = c.stock[g.flag] || (P.stockDoc && c.docExtra[g.flag]) || 0;
            if (p && rng.chance(p)) {
                const n = 1 + rng.weighted(c.n);
                S.stocks += n;
                g.events.push({ t: 'stock', text: 'ストック +' + n, n });
            }
            if (fx) { const t = fx.pose(); if (t) g.events.push({ t: 'pose', text: t }); }
            if (st.g >= st.len) g.post.push(endSTset);
        }
        function endSTset() {
            const st = S.st;
            if (st.super && st.sets < P.sst.maxSets && (st.sets < st.minSets || rng.chance(P.sst.cont))) {
                st.sets++; st.g = 0; st.len = rng.int(P.sst.len[0], P.sst.len[1]);
                return { cont: true };
            }
            const n = Math.max(1, S.stocks);   // 最低 1 個 保証
            S.st = null; S.stocks = 0;
            S.release += n - 1;
            enterRC();
            return { released: n };
        }

        // ================= 有利区間 =================
        // 通常時の 初当りから 開始・通常時に もどったら 終了。差枚 2300 で エンディング・2400 で 完走 (いろいろ リセットして 通常時へ)
        function yuriReset() {
            Object.assign(S, {
                mode: 'normal', yuri: false, bonus: null, prep: null, rc: null, st: null, stocks: 0, release: 0, stQueue: [], joker: 0, goldBar: false,
                rcRegStreak: 0, bonusHigh: false, showHigh: false, china: false, rcA: false, rcB: 0, pending: null, omen: null,
                suikaCnt: 0, suikaReady: false, normalG: 0,
            });
            S.stats.yuriDone++;
        }

        // ================= リール =================
        const decideStop = (g, reel, top0, wins) => ReelControl.decideStop(g, reel, top0, wins);
        const highlight = (g, wins) => ReelControl.highlight(g, wins);
        const pushOK = (g, order) => !!g.order && order.length === 3 && order.every((v, i) => v === g.order[i]);

        // ================= 精算 (第 3 停止の あと) =================
        function settle(g, order) {
            const res = { pay: 0, replay: false, events: [] };
            if (g.aim == null) {
                const f = g.flag, pay = P.pay;
                if (f === 'REP' || f === 'BELREP' || (f === 'CHE' && !g.missed)) { res.replay = true; S.replayNext = true; }
                else if (f === 'PUSHBEL') res.pay = pushOK(g, order) ? pay.pushOK : pay.pushNG;
                else if (f === 'COMBEL') res.pay = pay.COMBEL;
                else if (f === 'THREE') res.pay = pay.THREE;
                else if (f === 'SUI' && !g.missed) res.pay = pay.SUI;
                else if (f === 'CBELL' && !g.missed) res.pay = pay.CBELL;
            }
            if (g.missed) { res.events.push({ t: 'miss', text: '取りこぼし…' }); S.stats.miss++; }
            // 右下がりスイカは 全状態で 数える (取りこぼし・平行スイカ = チャンス目C は 数えない)
            if (g.flag === 'SUI' && !g.missed && g.aim == null) {
                S.suikaCnt++;
                if (S.suikaCnt >= S.suikaTarget) S.suikaReady = true;
            }
            res.pushOK = g.flag === 'PUSHBEL' ? pushOK(g, order) : null;
            S.credit += res.pay; S.totalOut += res.pay;
            if (g.modeAtLever === 'bonus' && S.bonus) S.bonus.paid += res.pay;
            for (const fn of g.post) {
                const r = fn();
                if (r && r.released) res.events.push({ t: 'flash', text: 'ストック ' + r.released + ' 個 放出!!' });
                if (r && r.cont) res.events.push({ t: 'flash', text: 'セット 継続!!' });
            }
            if (S.mode === 'ending' && diff() - S.yuriBase >= P.yuriCap) {
                yuriReset(); res.events.push({ t: 'flash', text: '有利区間 完走!! おつかれさま' }); res.yuriDone = true;
            } else if (S.yuri && S.mode !== 'ending' && S.mode !== 'prep' && S.mode !== 'rcPromo' && S.mode !== 'rcJudge' && diff() - S.yuriBase >= P.yuriEnding) {
                S.mode = 'ending'; S.bonus = null; S.stats.ending++;
                res.events.push({ t: 'flash', text: 'エンディングボーナス!!' });
            }
            if (S.mode === 'bonus' && S.bonus && S.bonus.target > 0 && S.bonus.paid >= S.bonus.target) {
                res.events.push({ t: 'bonusEnd', bonus: endBonus() });
            }
            return res;
        }

        function addCredit(n) { S.credit += n; S.invest += n; }

        return {
            S, P, rng, lever, settle, stand, decideStop, highlight, reset, addCredit, revealPush,
            total: Cards.total,
            promoPreview: () => S.rc ? KooriChance.rank(S.rc, P) : 0,
            yuriDiff: () => S.yuri ? diff() - S.yuriBase : 0,
            // 画面の 確認用 (?debug)
            _dbg: { enterPrep, startBonus, enterST, enterRC, enterRcHigh },
        };
    }
    SBJ.createEngine = createEngine;
})(globalThis.SBJ || (globalThis.SBJ = {}));
