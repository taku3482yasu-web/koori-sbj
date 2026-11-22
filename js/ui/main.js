// 入力と ゲームの 流れ (設計書 11 章「1 ゲームの 画面の 流れ」)
// レバー → 各ストップ (止める 位置は エンジン) → 第3停止後の 演出 (最大 1.1 秒) → 精算・状態遷移・メッセージ
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const SAVE = 'koori-sbj-save-v1';
    let E = SBJ.createEngine({ setting: Number(params.get('setting')) || 1, seed: params.get('seed') ? Number(params.get('seed')) : undefined });
    const S = () => E.S;
    let introP = null;   // 登場カットインと 会話 (終わるまで 精算を 待つ)
    let G = null, phase = 'idle', order = [], wins = [null, null, null], auto = false, autoLv = 0, lastPay = 0, holding = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fast = () => auto && autoLv === 2;
    const nap = ms => sleep(fast() ? ms * 0.3 : ms);   // オート 高速の ときは 演出の 待ちを 短く
    const pick = a => a[Math.floor(Math.random() * a.length)];

    // ----- 設定・演出カスタムだけ 保存 (メダルや 状態は 保存しない) -----
    try {
        const v = JSON.parse(localStorage.getItem(SAVE) || 'null');
        if (v && !params.get('setting')) { E.reset(v.setting || 1); }
        if (v && v.custom) Object.assign(S().custom, v.custom);
    } catch (e) { /* なし */ }
    const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ setting: S().setting, custom: S().custom })); } catch (e) { /* なし */ } };

    // ----- メダル・状態・データの 保存 (2026-11-22)。ゲームと ゲームの あいだ (idle) で 保存し、ひらいた ときに 戻す -----
    //   確認用の URL (?rc=1 など) で ひらいた ときは 戻さないし 保存も しない
    const STATE = 'koori-sbj-state-v1';
    const DEBUG_URL = ['rc', 'bonus', 'sst', 'st', 'prep', 'rchigh', 'battle', 'seed', 'setting', 'credit', 'freeze', 'ending'].some(k => params.get(k));
    let hist = [], histG = 0, slump = { step: 1, pts: [0] }, cnt = { n: 0 };
    function saveState() {
        if (DEBUG_URL) return;
        try { localStorage.setItem(STATE, JSON.stringify({ S: S(), hist, histG, slump, cnt })); } catch (e) { /* なし */ }
    }
    if (!DEBUG_URL) {
        try {
            const v = JSON.parse(localStorage.getItem(STATE) || 'null');
            if (v && v.S && v.S.stats) {
                for (const k of Object.keys(S())) delete S()[k];
                Object.assign(S(), v.S);
                hist = v.hist || []; histG = v.histG || 0; slump = v.slump || slump; cnt = v.cnt || cnt;
            }
        } catch (e) { /* こわれて いたら 最初から */ }
    }
    function clearData() { hist = []; histG = 0; slump = { step: 1, pts: [0] }; cnt = { n: 0 }; Panel.setCounter(cnt); }
    Panel.setCounter(cnt);

    // ----- 図鑑・実績 (js/ui/collection.js)。gameEv = その ゲームで 起きた こと (実績の 判定に 使う) -----
    let gameEv = {};
    const toastQ = [];
    const nextToast = () => {   // 実績の おしらせを 1 つずつ
        const t = $('toast'), name = toastQ[0];
        t.textContent = '★ 実績: ' + name; t.classList.add('show'); Sound.se.win();
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => { toastQ.shift(); if (toastQ.length) nextToast(); }, 350); }, 2400);
    };
    Zukan.init({ noRecord: DEBUG_URL, onUnlock: name => { toastQ.push(name); if (toastQ.length === 1) nextToast(); } });
    const seeSet = text => {   // 設定示唆の 文字 → 図鑑の key
        let m;
        if ((m = /^11 枚役の トランプ: (.+)$/.exec(text))) Zukan.see('card:' + m[1]);
        else if ((m = /^エンディング: (.+)$/.exec(text))) Zukan.see('ending:' + m[1]);
    };
    // 1 ゲームごとに 差枚を 記録 (2000 点を こえたら 1 つ おきに 間引く)
    function recordSlump() {
        const d = S().totalOut - S().totalIn;
        if (S().games % slump.step === 0) slump.pts.push(d);
        if (slump.pts.length > 2000) { slump.pts = slump.pts.filter((_, i) => i % 2 === 0); slump.step *= 2; }
    }
    const HIST_COL = { REG: '#567', 赤7BIG: '#c33', 青7BIG: '#36c', スーパーBIG: '#a3c', エピソードボーナス: '#c90', スーパーストックタイム: '#d4a', SPエピソード: '#c90', こおりチャンス: '#2a9', ストックタイム: '#e70', スーパーストックタイム突入: '#d4a', エンディング: '#5a5' };
    function addHist(label) { hist.push({ at: histG, n: S().games, label, col: HIST_COL[label] || '#666' }); histG = 0; if (hist.length > 100) hist.shift(); }
    let dataTab = 'sum';
    function renderData() {
        $('dataSum').hidden = dataTab !== 'sum'; $('dataHist').hidden = dataTab !== 'hist'; $('slump').hidden = dataTab !== 'graph';
        if (dataTab === 'hist') Panel.hist(hist);
        if (dataTab === 'graph') Panel.graph(slump, S().games);
    }

    const BGM_OF = { normal: 'normal', rchigh: 'normal', prep: 'bonus', bonus: 'bonus', rcPromo: 'rc', rcJudge: 'rc', st: 'st', ending: 'ending' };
    function refresh(when) {
        LCD.render(E, G, when);
        Panel.update(E, G, lastPay);
        Panel.sub(E, G);
        Sound.bgm(BGM_OF[S().mode]);
        renderData();
    }

    // ================= レバー =================
    function doLever() {
        if (phase !== 'idle') return;
        Sound.unlock();
        const g = E.lever();
        if (g.error) { if (auto) { E.addCredit(50); return doLever(); } LCD.flash(g.error); return; }
        G = g; order = []; wins = [null, null, null]; phase = 'freeze'; lastPay = 0; histG++;
        gameEv = {};
        if (g.modeAtLever === 'normal' || g.modeAtLever === 'rchigh') { cnt.n++; cnt[g.flag] = (cnt[g.flag] || 0) + 1; }
        if (g.fx) Zukan.see('fx:' + g.fx.name + '|' + g.fx.text);
        if (g.battle && g.battle.phase === 'start') { Zukan.see('bk:' + g.battle.kind); Zukan.see('opp:' + SBJ.OPPS[g.battle.opp].name); }
        if (g.freeze) Zukan.see('win:ロングフリーズ');
        if (g.oddity) { Zukan.see('odd:' + g.oddity); guessNote('ハワイの 違和感: ' + g.oddity); }
        const h = g.hints || {};
        LCD.fxClear();
        $('lowerPanel').classList.remove('off', 'blink');
        $('blackout').classList.toggle('show', !!h.blackout);
        $('btnPush').classList.remove('lamp-on', 'lamp-fast', 'lamp-alt');
        if (h.pushLamp) $('btnPush').classList.add('lamp-' + h.pushLamp);
        if (g.fx && g.fx.lamp) runRoulette(g.fx.lamp, g.fx.at === 3);
        const start = () => {
            phase = 'spin';
            ReelsView.startAll();
            document.querySelectorAll('.stop').forEach(b => b.classList.add('lit'));
            Sound.se.lever();
            if (auto) autoStops();
        };
        if (g.freeze) {   // ロングフリーズ: リールが 回り 始める 前に 2.6 秒の 暗転
            $('freezeTxt').textContent = g.freeze; $('freeze').classList.add('show'); Sound.se.freeze(); vib([300, 100, 300, 100, 600]);
            setTimeout(() => { $('freeze').classList.remove('show'); LCD.flash(g.freeze, '#ff4'); Sound.se.fanfare('rainbow'); start(); }, fast() ? 900 : E.P.freezeMs);
        } else if (h.delay) setTimeout(start, 550);   // リール始動音の 遅れ (高確濃厚)
        else start();
        if (S().custom.sakibare && (g.aim != null || g.award != null) && g.modeAtLever === 'rcJudge') Sound.se.saki();
        renderNav(g);
        LCD.render(E, G, 'lever');
        Scene.onLever(E, g);
        introP = null;
        if (g.battle && g.battle.phase === 'start' && g.battle.talk) introP = Talk.intro(g.battle, fast() ? 0.25 : auto);
        else if (g.battle && g.battle.phase === 'final') Talk.last(g.battle);
        leverEvents(g);
        showFx(g, 0);
        Panel.update(E, G, lastPay);
        Panel.sub(E, G);
        $('rcBtns').classList.remove('show');
    }
    function renderNav(g) {
        for (let i = 0; i < 3; i++) $('nav' + i).textContent = '';
        if (g.nav) g.nav.forEach((reel, k) => { $('nav' + reel).textContent = ['①', '②', '③'][k]; });
    }
    function leverEvents(g) {
        for (const ev of g.events) {
            if (ev.t === 'set') { seeSet(ev.text); guessNote(ev.text); }
            if (ev.t === 'pose') Zukan.see('pose:' + ev.text.replace(SBJ.CAST.main + 'の ', ''));
            if (ev.t === 'flash' && /天井/.test(ev.text)) gameEv.ceil = true;
            if (ev.t === 'flash') { LCD.flash(ev.text, '#ff5'); if (ev.kyuin) Sound.se.kokuchi(); }
            else if (ev.t === 'omen' || ev.t === 'hint') LCD.flash(ev.text, '#cdf');
            else if (ev.t === 'up') { LCD.flash(ev.text, '#5ff'); Sound.se.win(); }
            else if (ev.t === 'slide') LCD.flash(ev.text, '#aaa');
            else if (ev.t === 'stock') { LCD.flash(ev.text, '#ff5'); Sound.se.stock(); }
            else if (ev.t === 'bbfx' || ev.t === 'set' || ev.t === 'pose') {
                LCD.fxBar(`<b>${ev.t === 'bbfx' ? 'ボーナス演出' : ev.t === 'set' ? '設定示唆' : 'ストック示唆'}</b>${ev.text}`);
                if (ev.t === 'bbfx') Anim.bbfx(ev.text); else if (ev.t === 'pose') Anim.pose(ev.text); else Anim.endChar(ev.text);
            }
        }
        if (g.aim != null) { LCD.cutin(g.aim >= 3 ? 'rainbow' : 'red'); Sound.se.kakutei(); vib(120); }
        if (g.award != null) { LCD.cutin('rainbow'); Sound.se.fanfare('rainbow'); }
        if (g.battle && g.battle.phase === 'start') Sound.se.card();
    }
    // 演出の 文字 (at = 0 レバー・1〜3 = 第n停止)
    function showFx(g, at) {
        const lines = [];
        if (g.fx && (g.fx.at || 0) === at) { lines.push(`<b>${g.fx.name}</b>${g.fx.text}`); Anim.play(g.fx); }
        const od = g.oddity;
        if (od && ((at === 1 && /第1/.test(od)) || (at === 2 && /第2/.test(od)) || (at === 3 && /第3/.test(od)) || (at === 0 && !/第\d/.test(od)))) {
            if (/下パネル消灯/.test(od)) $('lowerPanel').classList.add('off');
            if (/点滅のみ/.test(od)) $('lowerPanel').classList.add('blink');
            lines.push(`<b>違和感</b>${od}`);
        }
        if (lines.length) LCD.fxBar(lines.join('　'));
    }
    function runRoulette(kind, stopAt3) {
        const ls = [...document.querySelectorAll('.rl')], good = ls.findIndex(l => l.classList.contains('good'));
        let k = 0;
        const n = 14 + Math.floor(Math.random() * 6);
        const iv = setInterval(() => {
            ls.forEach(l => l.classList.remove('on'));
            let idx = kind === 'reverse' ? (ls.length * 10 - k) % ls.length : k % ls.length;
            const end = k > n && (!stopAt3 || phase === 'settle' || phase === 'idle');
            if (end && kind === 'good') idx = good;
            ls[idx].classList.add('on'); Sound.se.tick();
            k++;
            if (end) clearInterval(iv);
        }, 70);
    }

    // ================= ストップ =================
    function doStop(i) {
        if (phase !== 'spin' || !ReelsView.canStop(i)) return;
        holding = true;
        const d = E.decideStop(G, i, ReelsView.top0(i), wins);
        wins[i] = d.window;
        ReelsView.stopAt(i, d.k);
        order.push(i);
        document.querySelector(`.stop[data-i="${i}"]`).classList.remove('lit');
        $('nav' + i).textContent = '';
    }
    ReelsView.onStop(i => {
        Sound.se.stop();
        const n = order.indexOf(i) + 1;
        if (G && G.hints && G.hints.reelOff && n <= G.hints.reelOff) ReelsView.off(i);
        if (G) showFx(G, ReelsView.stoppedCount());
        if (ReelsView.allStopped()) {
            if (G) Scene.onStop3(E, G, SBJ.Lottery.isRare(G.flag) && !G.missed && G.aim == null);
            onAllStopped();
        }
    });

    // ================= 第3停止後 → 精算 =================
    async function onAllStopped() {
        phase = 'settle';
        const g = G, modeBefore = g.modeAtLever;
        if (introP) { await introP; introP = null; }
        const wait = await reveal(g);
        if (wait) await nap(wait);
        const res = E.settle(g, order);
        $('blackout').classList.remove('show');
        lastPay = res.pay;
        if (g.aim === 6) ReelsView.goldMiddle();
        ReelsView.mark(E.highlight(g, wins));
        if (res.pay > 0) { Sound.se.pay(res.pay); Scene.onPay(E); }
        recordSlump();
        await afterEvents(res, modeBefore);
        refresh('idle');
        phase = 'idle';
        if (S().mode === 'rcPromo') $('rcBtns').classList.add('show');
        if (S().joker > 0) Zukan.see('win:ジョーカーモード');
        if (res.yuriDone) Zukan.see('win:有利区間 完走');
        Zukan.check(S(), gameEv);
        saveState();
        if (auto) setTimeout(autoStep, fast() ? 40 : 260);
    }
    // カードの 公開・勝敗・カットイン (最終G の カットインは 第3停止を 長押し した ときだけ・オートは 常に)
    async function reveal(g) {
        if (g.battle && g.battle.phase !== 'start') {
            const b = g.battle;
            let showCut = false;
            if (b.phase === 'final') {
                await nap(350);
                showCut = holding || auto;
                if (showCut) { LCD.cutin(b.cutin); Sound.se.kyuin(); await nap(450); }
            }
            $('main').innerHTML = LCD.battleHTML(E, b, true); Sound.se.card();
            if (b.surprise) LCD.flash(SBJ.OPPS[b.opp].name + '「なっ…!?」', '#ff8');
            if (b.phase === 'final') {
                await nap(500);
                if (b.win) { LCD.flash('WIN!!', '#ff4'); Sound.se.jan(); Zukan.see('oppwin:' + SBJ.OPPS[b.opp].name); Zukan.battleWin(); }
                else { LCD.flash(b.kind === 'bj' && b.total > 21 ? 'BUST… LOSE' : 'LOSE…', '#99a'); Sound.se.lose(); if (b.highHint && showCut) setTimeout(() => LCD.flash('…まだ 終わらない!?', '#5f8'), 900); }
                return fast() ? 350 : 1100;
            }
            return fast() ? 120 : 350;
        }
        if (g.modeAtLever === 'rcPromo' && g.rcCard) {
            const c = g.rcCard, rc = S().rc;
            LCD.render(E, G, 'reveal');
            if (c === 'none') LCD.flash('スカ…', '#aaa');
            else if (c.wild) { LCD.flash('ワイルドカード!! → ' + c.wv, '#ff5'); Sound.se.big(); }
            else Sound.se.card();
            if (rc && E.total(rc.cards) > 21) { LCD.flash('BUST!!', '#f66'); Sound.se.lose(); return 900; }
            if (rc && E.total(rc.cards) === 21) { LCD.flash('21!!', '#ff4'); Sound.se.big(); return 900; }
            return 300;
        }
        return 0;
    }
    async function afterEvents(res, modeBefore) {
        const msgs = [];
        for (const ev of res.events) {
            if (ev.t === 'flash') msgs.push([ev.text, '#ff5']);
            if (ev.t === 'bonusEnd') {
                msgs.push([`${SBJ.BONUS_NAMES[ev.bonus.type]} 終了　${ev.bonus.paid} 枚`, '#fff']);
                if (ev.bonus.endChar) { msgs.push(['サブ液晶: ' + ev.bonus.endChar, '#cdf']); setTimeout(() => Anim.endChar(ev.bonus.endChar), 1000); Zukan.see('end:' + ev.bonus.endChar); guessNote('ボーナス終了画面: ' + ev.bonus.endChar); }
                if (ev.bonus.trophy) { msgs.push([ev.bonus.trophy, '#fd4']); Zukan.see('trophy:' + ev.bonus.trophy.replace('こおりトロフィー: ', '')); guessNote(ev.bonus.trophy); }
                gameEv.paid = Math.max(gameEv.paid || 0, ev.bonus.paid);
            }
        }
        const m = S().mode;
        if (m !== modeBefore) {   // 当たり履歴
            if (m === 'bonus') addHist(SBJ.BONUS_NAMES[S().bonus.type]);
            else if (m === 'rcPromo' && (modeBefore === 'normal' || modeBefore === 'rchigh')) addHist('こおりチャンス');
            else if (m === 'st' && modeBefore !== 'st') addHist(S().st.super ? 'スーパーストックタイム突入' : 'ストックタイム');
            else if (m === 'ending') addHist('エンディング');
            if (hist.length && hist[hist.length - 1].n === S().games) Zukan.see('win:' + hist[hist.length - 1].label);
        }
        if (m === 'bonus' && S().bonus) Zukan.see('win:' + SBJ.BONUS_NAMES[S().bonus.type]);   // ST の 放出など 履歴に のらない ボーナスも
        if (m !== modeBefore || (modeBefore === 'bonus' && res.events.some(e => e.t === 'bonusEnd'))) {
            if (m === 'prep') { Sound.se.fanfare('bonus'); vib([200, 80, 200]); await Scene.win('bonus'); msgs.push(['ボーナス 確定!!', '#ff4']); }
            else if (m === 'bonus') { msgs.push([SBJ.BONUS_NAMES[S().bonus.type] + ' スタート!', '#ff4']); Sound.se.big(); }
            else if (m === 'rcPromo') { Sound.se.fanfare('rc'); vib([150, 80, 150]); if (modeBefore === 'normal' || modeBefore === 'rchigh') await Scene.win('blue'); msgs.push(['こおりチャンス 突入!!', '#6cf']); }
            else if (m === 'rcJudge' && modeBefore !== 'rcJudge') judgeMsgs(msgs);
            else if (m === 'st') { if (modeBefore !== 'st') { Sound.se.fanfare('rainbow'); vib([200, 80, 200, 80, 400]); await Scene.win('rainbow'); } msgs.push([(S().st.super ? 'スーパー' : '') + 'ストックタイム 突入!!' + (S().st.why ? ' (' + S().st.why + ')' : ''), '#ff4']); }
            else if (m === 'rchigh' && modeBefore !== 'rchigh') msgs.push(['こおりチャンス 高確率へ', '#6cf']);
            else if (m === 'normal' && modeBefore === 'rchigh') msgs.push(['通常ステージへ…', '#aaa']);
        }
        for (const [t, c] of msgs) { LCD.flash(t, c); await sleep(fast() ? 250 : auto ? 700 : 1000); }
    }
    function judgeMsgs(msgs) {
        const rc = S().rc;
        if (!rc) return;
        if (rc.natural) gameEv.natural = true;
        if (rc.five) gameEv.five = true;
        if (rc.gold && rc.rank === 6) gameEv.gold = true;
        if (rc.natural) msgs.push(['ナチュラル ブラックジャック!!', '#ff4']);
        else if (rc.bust) msgs.push(['バースト… でも ジャッジで 挽回!', '#ccc']);
        else if (rc.five) msgs.push(['ファイブカード!! 1 段階 UP', '#ff4']);
        if (rc.gold && rc.rank === 6) msgs.push(['金BAR 出現!!!', '#fd4']);
        if (!S().custom.simple) msgs.push(['ジャッジパート　' + (rc.rank === 6 ? '金BAR' : LCD.LADDER[rc.rank]) + ' から', '#fff']);
    }

    // ================= STAND / PUSH =================
    async function doStand() {
        if (phase !== 'idle' || S().mode !== 'rcPromo') return;
        phase = 'settle';
        E.stand(); $('rcBtns').classList.remove('show');
        LCD.render(E, G, 'idle');
        const msgs = []; judgeMsgs(msgs);
        for (const [t, c] of msgs) { LCD.flash(t, c); await sleep(fast() ? 250 : auto ? 700 : 1000); }
        Zukan.check(S(), gameEv);
        refresh('idle'); phase = 'idle'; saveState();
    }
    function doPush() {
        Sound.unlock();
        if (S().mode === 'prep' && S().prep) {
            const c = E.revealPush(); LCD.render(E, G, 'idle');
            LCD.flash(({ white: '白: 全ボーナスの 可能性', red: '赤: 赤7BIG 以上!', blue: '青: 青7BIG 以上!', redblue: '赤＆青: スーパーBIG!!', yellow: '黄: エピソードボーナス!!', rainbow: '虹: スーパーストックタイム!!!' })[c], '#fff');
        } else LCD.flash(pick(['…', 'ひんやり', 'こおりくん「まだまだ！」']), '#cdf');
    }

    // ================= オート (目押しする: 左は BAR を 枠上〜上段・中は スイカ) =================
    function autoStep() {
        if (!auto || phase !== 'idle') return;
        if (S().mode === 'rcPromo' && E.total(S().rc.cards) >= 17) { doStand().then(() => setTimeout(autoStep, 200)); return; }
        doLever();
    }
    function autoStops() {
        const ord = G.nav ? G.nav.slice() : [0, 1, 2];
        let k = 0;
        const SUI_OK = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 16, 17, 18, 19, 0];
        const next = () => {
            if (k >= 3 || phase !== 'spin') return;
            const r = ord[k];
            const want = G.nav ? null : r === 0 ? [13, 14] : (r === 1 && wins[0] && wins[0][0] === 'SUI') ? SUI_OK : null;
            if (want && !want.includes(ReelsView.top0(r))) { requestAnimationFrame(next); return; }
            doStop(r); k++; setTimeout(next, fast() ? 40 : 140);
        };
        setTimeout(next, fast() ? 50 : 200);
    }

    // ================= 入力 =================
    addEventListener('keyup', () => { holding = false; });
    addEventListener('pointerup', () => { holding = false; });
    addEventListener('pointercancel', () => { holding = false; });
    $('btnLever').onclick = doLever;
    document.querySelectorAll('.stop').forEach(b => { b.onpointerdown = e => { e.preventDefault(); doStop(+b.dataset.i); }; });
    $('btnHit').onclick = () => { if (S().mode === 'rcPromo') doLever(); };
    $('btnStand').onclick = doStand;
    $('btnPush').onclick = doPush;
    $('btnCustom').onclick = () => { $('custom').classList.toggle('show'); $('btnCustom').classList.toggle('on'); };
    $('cBB').value = S().custom.bb; $('cSimple').checked = S().custom.simple; $('cSaki').checked = S().custom.sakibare;
    $('cBB').onchange = () => { S().custom.bb = $('cBB').value; save(); };
    $('cSimple').onchange = () => { S().custom.simple = $('cSimple').checked; save(); LCD.render(E, G, 'idle'); };
    $('cSaki').onchange = () => { S().custom.sakibare = $('cSaki').checked; save(); };
    // 光を 弱める (はじめは 端末の「視差効果を 減らす」に あわせる)
    if (S().custom.calm == null) { try { S().custom.calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { S().custom.calm = false; } }
    const applyCalm = () => document.body.classList.toggle('calm', !!S().custom.calm);
    $('cCalm').checked = !!S().custom.calm; applyCalm();
    $('cCalm').onchange = () => { S().custom.calm = $('cCalm').checked; applyCalm(); save(); };
    // 図鑑・演出 確認
    $('btnZukan').onclick = () => Zukan.open();
    $('btnJump').onclick = () => { $('jump').classList.toggle('show'); $('btnJump').classList.toggle('on'); };
    document.querySelectorAll('#jumpBtns a').forEach(a => { a.onclick = e => { e.preventDefault(); location.href = a.getAttribute('href') + '&setting=' + S().setting; }; });
    if (DEBUG_URL) { $('jump').classList.add('show'); $('btnJump').classList.add('on'); $('jumpNote').textContent = 'いまは 確認用の 画面だよ (メダル・データ・図鑑は 保存しない)。'; }
    $('btnCoin').onclick = () => { E.addCredit(50); Panel.update(E, G, lastPay); if (phase === 'idle') saveState(); };
    // オート: 押すたびに オフ → オート → オート 高速 (演出を 短く) → オフ
    $('btnAuto').onclick = () => {
        autoLv = (autoLv + 1) % 3; auto = autoLv > 0;
        $('btnAuto').classList.toggle('on', auto); $('btnAuto').classList.toggle('fast', autoLv === 2);
        $('btnAuto').textContent = autoLv === 2 ? 'オート 高速' : 'オート';
        ReelsView.setTurbo(autoLv === 2 ? 3 : 1);
        if (auto) autoStep();
    };
    // データの タブ・リセット (2 回 押すと リセット)
    document.querySelectorAll('#dataTabs [data-t]').forEach(b => { b.onclick = () => { dataTab = b.dataset.t; document.querySelectorAll('#dataTabs [data-t]').forEach(x => x.classList.toggle('on', x === b)); renderData(); }; });
    let resetArm = 0;
    $('btnReset').onclick = () => {
        if (phase !== 'idle') return;
        if (!resetArm) { resetArm = setTimeout(() => { resetArm = 0; $('btnReset').classList.remove('armed'); $('btnReset').textContent = 'リセット'; }, 3000); $('btnReset').classList.add('armed'); $('btnReset').textContent = 'もう一度 押す'; return; }
        clearTimeout(resetArm); resetArm = 0; $('btnReset').classList.remove('armed'); $('btnReset').textContent = 'リセット';
        E.reset(S().setting); G = null; clearData(); saveState(); refresh('idle'); LCD.flash('データ リセット', '#fff');
    };
    // 音量 (演出カスタム)
    $('vol').value = Math.round(Sound.vol * 100); $('bgmVol').value = Math.round(Sound.bgmVol / 1.1 * 100);
    $('vol').oninput = () => { Sound.unlock(); Sound.setVol($('vol').value / 100); };
    $('bgmVol').oninput = () => { Sound.unlock(); Sound.setBgmVol($('bgmVol').value / 100 * 1.1); };
    $('btnDebug').onclick = () => { const d = $('debug'); d.style.display = d.style.display === 'block' ? 'none' : 'block'; $('btnDebug').classList.toggle('on'); Panel.update(E, G, lastPay); };
    const muteIcon = () => { $('btnMute').textContent = Sound.muted ? '🔇' : '🔊'; $('btnBgm').classList.toggle('on', Sound.bgmOn); };
    $('btnBgm').onclick = () => { Sound.unlock(); Sound.setBgm(!Sound.bgmOn); muteIcon(); };
    $('btnMute').onclick = () => { Sound.unlock(); Sound.setMute(!Sound.muted); muteIcon(); };
    muteIcon();
    // ----- 設定・設定当て モード (2026-11-23)。S.guess = { day, hints: [見た 設定示唆], answered: 予想 } -----
    const rand6 = () => 1 + Math.floor(Math.random() * 6);
    const showSetting = () => {
        const gs = S().guess;
        $('setting').value = gs && !gs.answered ? 'guess' : S().setting;
        $('guessBar').hidden = !gs;
        if (gs) $('guessBar').firstChild.textContent = gs.answered ? `${gs.day} 日目: 答えは 設定${S().setting} (予想 ${gs.answered})。` : `設定当て ${gs.day} 日目: 設定は ないしょ。`;
        $('btnGuess').hidden = !!(gs && gs.answered);
    };
    showSetting();
    $('setting').onchange = () => {
        if (phase !== 'idle') { showSetting(); return; }
        const v = $('setting').value;
        if (v === 'guess') { E.reset(rand6()); S().guess = { day: 1, hints: [], answered: null }; LCD.flash('設定当て モード スタート!', '#fff'); }
        else { E.reset(+v); LCD.flash('設定変更 (' + S().setting + ')', '#fff'); }
        G = null; clearData(); save(); saveState(); refresh('idle'); showSetting();
    };
    // 設定示唆を 見たら 設定当ての メモに のこす
    const guessNote = t => { const gs = S().guess; if (gs && !gs.answered && t && gs.hints.length < 60) gs.hints.push(t); };
    const GUESS_REC = 'koori-sbj-guess';
    const guessRec = () => { try { return JSON.parse(localStorage.getItem(GUESS_REC) || 'null') || { n: 0, hit: 0, near: 0 }; } catch (e) { return { n: 0, hit: 0, near: 0 }; } };
    function guessSummary() {
        const st = S().stats, n = cnt.n || 0, sui = cnt.SUI || 0, gs = S().guess, r = guessRec();
        const per = (a, b) => (b ? '1/' + (a / b).toFixed(1) : '-');
        return `<p>${gs.day} 日目　総回転 ${S().games}G　初当り ${st.first} 回 (${per(S().games, st.first)})<br>` +
            `通常時の スイカ ${sui} 回 (${per(n, sui)})　※ 設定1 1/${E.P.SUI_D[0]} 〜 設定6 1/${E.P.SUI_D[5]}<br>` +
            `差枚 ${S().totalOut - S().totalIn}</p>` +
            `<p><b>見た 設定示唆</b><br>${gs.hints.length ? gs.hints.map(h => '・' + h).join('<br>') : 'まだ ないよ'}</p>` +
            `<p style="opacity:.7">これまでの 成績: ${r.n} 回中 ぴったり ${r.hit} 回・1 ちがい ${r.near} 回</p>`;
    }
    $('btnGuess').onclick = () => { if (!S().guess) return; $('guessBody').innerHTML = guessSummary(); $('guessPick').hidden = false; $('guessBox').hidden = false; };
    $('guessCancel').onclick = () => { $('guessBox').hidden = true; };
    document.querySelectorAll('#guessPick button').forEach(b => { b.onclick = () => {
        const gs = S().guess; if (!gs || gs.answered) return;
        const g = +b.dataset.g, ans = S().setting, r = guessRec();
        gs.answered = g; r.n++; if (g === ans) r.hit++; else if (Math.abs(g - ans) === 1) r.near++;
        try { localStorage.setItem(GUESS_REC, JSON.stringify(r)); } catch (e) { /* なし */ }
        $('guessPick').hidden = true;
        $('guessBody').innerHTML = `<p class="guessRes ${g === ans ? 'hit' : ''}">${g === ans ? 'せいかい!!' : Math.abs(g - ans) === 1 ? 'おしい!' : 'ざんねん…'}<br>設定は <b>${ans}</b> でした (予想 ${g})</p>` + guessSummary();
        if (g === ans) { Sound.se.jan(); vib([80, 60, 80]); } else Sound.se.lose();
        showSetting(); saveState();
    }; });
    // つぎの 日へ: 60% で 設定変更 (同じ 数字も ある。天井は 666G に)・40% で 据え置き (状態は そのまま)。どちらかは ないしょ
    $('btnNextDay').onclick = () => {
        if (phase !== 'idle' || !S().guess) return;
        const day = S().guess.day + 1;
        if (Math.random() < 0.6) E.reset(rand6());
        else Object.assign(S(), { credit: E.P.startCredit, invest: E.P.startCredit, games: 0, totalIn: 0, totalOut: 0, stats: Object.fromEntries(Object.keys(S().stats).map(k => [k, 0])) });
        S().guess = { day, hints: [], answered: null };
        G = null; clearData(); saveState(); refresh('idle'); showSetting(); LCD.flash(day + ' 日目 スタート!', '#fff');
    };

    // ----- 振動 (スマホ)・全画面 -----
    function vib(pat) { try { if (S().custom.vib !== false && navigator.vibrate) navigator.vibrate(pat); } catch (e) { /* なし */ } }
    $('cVib').checked = S().custom.vib !== false;
    $('cVib').onchange = () => { S().custom.vib = $('cVib').checked; save(); if (S().custom.vib) vib(40); };
    const fsOK = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
    if (!fsOK || matchMedia('(display-mode: standalone)').matches) $('btnFull').hidden = true;
    $('btnFull').onclick = () => {
        const d = document, el = d.documentElement;
        if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        else { const pr = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (pr && pr.catch) pr.catch(() => {}); }
    };

    // ----- キー配置 (演出カスタム) -----
    const KEYMAP = {
        std: { lever: [' ', 'enter'], stop: [['z', 'arrowleft', '1'], ['x', 'arrowdown', '2'], ['c', 'arrowright', '3']], hit: ['h'], stand: ['s'], help: 'Space / Enter: レバー　Z X C (または ← ↓ →、1 2 3): ストップ　H: HIT　S: STAND' },
        left: { lever: [' ', 'f'], stop: [['a'], ['s'], ['d']], hit: ['w'], stand: ['e'], help: 'Space / F: レバー　A S D: ストップ　W: HIT　E: STAND (左手だけで 打てる)' },
        right: { lever: [' ', 'enter'], stop: [['j', 'arrowleft'], ['k', 'arrowdown'], ['l', 'arrowright']], hit: ['i'], stand: ['o'], help: 'Space / Enter: レバー　J K L (または ← ↓ →): ストップ　I: HIT　O: STAND' },
    };
    const keys = () => KEYMAP[S().custom.keys] || KEYMAP.std;
    $('cKeys').value = S().custom.keys || 'std';
    const keyHelp = () => { $('helpKeys').textContent = keys().help; };
    keyHelp();
    $('cKeys').onchange = () => { S().custom.keys = $('cKeys').value; save(); keyHelp(); };
    addEventListener('keydown', e => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || !$('guide').hidden || !$('zukan').hidden || !$('guessBox').hidden || !$('updates').hidden) return;
        const k = e.key.toLowerCase(), m = keys();
        if (m.lever.includes(k)) { e.preventDefault(); if (!e.repeat) doLever(); return; }
        const i = m.stop.findIndex(a => a.includes(k));
        if (i >= 0) { if (k.startsWith('arrow')) e.preventDefault(); if (!e.repeat) doStop(i); return; }
        if (m.hit.includes(k)) { if (S().mode === 'rcPromo') doLever(); }
        else if (m.stand.includes(k)) doStand();
    });

    // 画面の 確認用: ?rc=1 (こおりチャンス)・?bonus=2 (青7BIG)・?st=1 (ST)・?sst=1・?prep=3・?rchigh=1・?battle=bj・?credit=5000・?seed=3・?setting=6
    const D = E._dbg;
    if (params.get('credit')) E.addCredit(Number(params.get('credit')));
    if (params.get('rc')) D.enterRC();
    else if (params.get('bonus')) D.startBonus(Number(params.get('bonus')), 'rc');
    else if (params.get('sst')) D.enterST(true, '確認');
    else if (params.get('st')) D.enterST(false, '確認');
    else if (params.get('prep')) D.enterPrep(Number(params.get('prep')), 'rc');
    else if (params.get('rchigh')) D.enterRcHigh(true);
    else if (params.get('ending')) D.enterEnding();
    else if (params.get('freeze')) D.nextFreeze();   // つぎの レバーで ロングフリーズ
    else if (params.get('battle')) {   // ?battle=bj|poker|roulette (勝ちの 前兆)
        const kind = params.get('battle');
        let b; do { b = SBJ.Battle.makeBattle(E.rng, E.P, true, false, null); } while (['bj', 'poker', 'roulette'].includes(kind) && b.kind !== kind);
        S().pending = { kind: 'bonus' }; S().omen = { pre: 0, battle: b, win: true };
    }
    window.__game = { get E() { return E; }, get hist() { return hist; }, get slump() { return slump; } };
    Scene.init();
    Updates.init();
    refresh('idle');
    // ホーム画面に 追加したとき ネットが なくても 遊べるように (http で ひらいた ときだけ。ダブルクリックの file:// では しない)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    if (S().mode === 'rcPromo') $('rcBtns').classList.add('show');   // ?rc=1 や 保存から 再開した とき

    // ================= あそびかた (はじめての ときだけ 自動で 出す) =================
    const GUIDE = [
        ['ゲームの 流れ', '通常時は レバー → ストップで 回す。前兆に 入ると <b>カジノバトル</b> (BJ・ポーカー・ルーレット)。勝てば <b>ボーナス</b> か <b>こおりチャンス</b>!<br>レア役 (チェリー・スイカ など) は チャンス。'],
        ['打ち方', 'ナビ (①②③) が 出たら その 順に 押す。ナビが ない ときは 左リールから。<br>左リールの <b>BAR</b> を 枠上〜上段に 狙う。左上段に スイカが 止まったら 中リールに スイカを 狙う。'],
        ['こおりチャンス (前半)', '2 枚の カードから スタート。<b>HIT</b> で カードを 引き、<b>STAND</b> で 止める。ベル → カード・レア役 → ワイルドカード。<br>合計が <b>21</b> に 近いほど いい ボーナスから ジャッジ。22 以上は バースト。'],
        ['こおりチャンス (後半)', 'ジャッジパートで REG → 赤7BIG → 青7BIG → SBIG → エピソード → SST と 段階が 上がる。<b>狙え!</b> が 出たら そこで 決まり。'],
        ['ストックタイム', 'ST では ストックを ためて ボーナスを ループさせる。ストックの 数は 画面に 出ないけど、こおりくんの ポーズ (ピース・ウインク・投げキッス) で 示唆。'],
        ['PUSH ボタン', 'ボーナス準備中に 押すと 色で ボーナスの 種類を 示唆。白 → 赤 → 青 → 赤＆青 → 黄 → 虹 の 順に アツい。'],
        ['べんりな ボタン', 'オート: 押すたびに オート → オート 高速 → オフ。データの タブで 当たり履歴と スランプグラフ。演出カスタムで 音量と「光を 弱める」。メダルと データは 自動で 保存。<br><b>図鑑</b>: 見た 当たり・バトル・演出・設定示唆と 実績を 集める。<b>演出 確認</b>: こおりチャンスや ロングフリーズを すぐ 見られる (保存は しない)。<br>データ欄には 天井までの G 数と 小役カウンター。'],
    ];
    // リール配列表 (reels.js から)・役の 一覧 (params.js から)
    {
        const st = SBJ.STRIPS, P = E.P;
        const rows = st[0].map((_, i) => `<tr><th>${i + 1}</th>${st.map(r => `<td>${Symbols.html(r[i])}</td>`).join('')}</tr>`).join('');
        GUIDE.push(['リール配列表', `<div class="strips"><table><tr><th></th><th>左</th><th>中</th><th>右</th></tr>${rows}</table></div><small>番号が 1 ふえると 画面で 1 つ 下。左の BAR (14 番) を 枠上〜上段に 狙う。</small>`]);
        const d = x => '1/' + x;
        const yaku = [
            ['押し順ベル', d(P.PUSH_D), `正解 ${P.pay.pushOK} 枚・不正解 ${P.pay.pushNG} 枚`], ['共通ベル', d(P.COMBEL_D), P.pay.COMBEL + ' 枚'],
            ['リプレイ', d(P.REP_D), '再遊技'], ['ベルリプレイ', d(P.BELREP_D), '再遊技'], ['チェリー', d(P.CHE_D), '再遊技 (レア役)'],
            ['スイカ', `${d(P.SUI_D[0])}〜${d(P.SUI_D[5])}`, P.pay.SUI + ' 枚 (レア役・設定差)'], ['チャンスベル', d(P.CBELL_D), P.pay.CBELL + ' 枚 (レア役)'],
            ['チャンス目', d(P.CHANCE_D), '0 枚 (レア役)'], ['リーチ目役', d(P.REACH_D.normal), '0 枚 (激アツ)'], ['ピンチ目', d(P.PINCH_D), '0 枚 (高確 転落の ピンチ)'], ['3枚役', d(P.THREE_D), P.pay.THREE + ' 枚'],
        ];
        GUIDE.push(['役の 一覧 (通常時)', `<table class="yaku">${yaku.map(([n, p, pay]) => `<tr><th>${n}</th><td>${p}</td><td>${pay}</td></tr>`).join('')}</table><small>1 ゲーム ${P.bet} 枚がけ。天井は ボーナス間 ${P.ceil}G (設定変更の あとなどは ${P.ceilShort}G)。</small>`]);
    }
    let gi = 0;
    const showGuide = i => { gi = i; $('gNum').textContent = (i + 1) + ' / ' + GUIDE.length; $('guide').querySelector('.gpage').innerHTML = `<h3>${GUIDE[i][0]}</h3>${GUIDE[i][1]}`; $('gPrev').disabled = i === 0; $('gNext').textContent = i === GUIDE.length - 1 ? 'とじる' : 'つぎへ'; $('guide').hidden = false; };
    const closeGuide = () => { $('guide').hidden = true; try { if ($('gHide').checked) localStorage.setItem('koori-sbj-guide', '1'); } catch (e) { /* なし */ } };
    $('gPrev').onclick = () => gi > 0 && showGuide(gi - 1);
    $('gNext').onclick = () => (gi < GUIDE.length - 1 ? showGuide(gi + 1) : closeGuide());
    $('guide').onclick = e => { if (e.target === $('guide')) closeGuide(); };
    $('btnGuide').onclick = () => { $('gHide').checked = true; showGuide(0); };
    let seen = false; try { seen = localStorage.getItem('koori-sbj-guide') === '1'; } catch (e) { /* なし */ }
    if (!seen && !DEBUG_URL) { $('gHide').checked = true; showGuide(0); }
})();
