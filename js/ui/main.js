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
    let G = null, phase = 'idle', order = [], wins = [null, null, null], auto = false, lastPay = 0, holding = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const pick = a => a[Math.floor(Math.random() * a.length)];

    // ----- 設定・演出カスタムだけ 保存 (メダルや 状態は 保存しない) -----
    try {
        const v = JSON.parse(localStorage.getItem(SAVE) || 'null');
        if (v && !params.get('setting')) { E.reset(v.setting || 1); }
        if (v && v.custom) Object.assign(S().custom, v.custom);
    } catch (e) { /* なし */ }
    const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ setting: S().setting, custom: S().custom })); } catch (e) { /* なし */ } };

    const BGM_OF = { normal: 'normal', rchigh: 'normal', prep: 'bonus', bonus: 'bonus', rcPromo: 'rc', rcJudge: 'rc', st: 'st', ending: 'ending' };
    function refresh(when) {
        LCD.render(E, G, when);
        Panel.update(E, G, lastPay);
        Panel.sub(E, G);
        Sound.bgm(BGM_OF[S().mode]);
    }

    // ================= レバー =================
    function doLever() {
        if (phase !== 'idle') return;
        Sound.unlock();
        const g = E.lever();
        if (g.error) { if (auto) { E.addCredit(50); return doLever(); } LCD.flash(g.error); return; }
        G = g; order = []; wins = [null, null, null]; phase = 'freeze'; lastPay = 0;
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
            $('freezeTxt').textContent = g.freeze; $('freeze').classList.add('show'); Sound.se.freeze();
            setTimeout(() => { $('freeze').classList.remove('show'); LCD.flash(g.freeze, '#ff4'); Sound.se.fanfare('rainbow'); start(); }, E.P.freezeMs);
        } else if (h.delay) setTimeout(start, 550);   // リール始動音の 遅れ (高確濃厚)
        else start();
        if (S().custom.sakibare && (g.aim != null || g.award != null) && g.modeAtLever === 'rcJudge') Sound.se.saki();
        renderNav(g);
        LCD.render(E, G, 'lever');
        Scene.onLever(E, g);
        introP = null;
        if (g.battle && g.battle.phase === 'start' && g.battle.talk) introP = Talk.intro(g.battle, auto);
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
        if (g.aim != null) { LCD.cutin(g.aim >= 3 ? 'rainbow' : 'red'); Sound.se.kakutei(); }
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
        if (wait) await sleep(wait);
        const res = E.settle(g, order);
        $('blackout').classList.remove('show');
        lastPay = res.pay;
        if (g.aim === 6) ReelsView.goldMiddle();
        ReelsView.mark(E.highlight(g, wins));
        if (res.pay > 0) { Sound.se.pay(res.pay); Scene.onPay(E); }
        await afterEvents(res, modeBefore);
        refresh('idle');
        phase = 'idle';
        if (S().mode === 'rcPromo') $('rcBtns').classList.add('show');
        if (auto) setTimeout(autoStep, 260);
    }
    // カードの 公開・勝敗・カットイン (最終G の カットインは 第3停止を 長押し した ときだけ・オートは 常に)
    async function reveal(g) {
        if (g.battle && g.battle.phase !== 'start') {
            const b = g.battle;
            let showCut = false;
            if (b.phase === 'final') {
                await sleep(350);
                showCut = holding || auto;
                if (showCut) { LCD.cutin(b.cutin); Sound.se.kyuin(); await sleep(450); }
            }
            $('main').innerHTML = LCD.battleHTML(E, b, true); Sound.se.card();
            if (b.surprise) LCD.flash(SBJ.OPPS[b.opp].name + '「なっ…!?」', '#ff8');
            if (b.phase === 'final') {
                await sleep(500);
                if (b.win) { LCD.flash('WIN!!', '#ff4'); Sound.se.jan(); }
                else { LCD.flash(b.kind === 'bj' && b.total > 21 ? 'BUST… LOSE' : 'LOSE…', '#99a'); Sound.se.lose(); if (b.highHint && showCut) setTimeout(() => LCD.flash('…まだ 終わらない!?', '#5f8'), 900); }
                return 1100;
            }
            return 350;
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
                if (ev.bonus.endChar) { msgs.push(['サブ液晶: ' + ev.bonus.endChar, '#cdf']); setTimeout(() => Anim.endChar(ev.bonus.endChar), 1000); }
                if (ev.bonus.trophy) msgs.push([ev.bonus.trophy, '#fd4']);
            }
        }
        const m = S().mode;
        if (m !== modeBefore || (modeBefore === 'bonus' && res.events.some(e => e.t === 'bonusEnd'))) {
            if (m === 'prep') { Sound.se.fanfare('bonus'); await Scene.win('bonus'); msgs.push(['ボーナス 確定!!', '#ff4']); }
            else if (m === 'bonus') { msgs.push([SBJ.BONUS_NAMES[S().bonus.type] + ' スタート!', '#ff4']); Sound.se.big(); }
            else if (m === 'rcPromo') { Sound.se.fanfare('rc'); if (modeBefore === 'normal' || modeBefore === 'rchigh') await Scene.win('blue'); msgs.push(['こおりチャンス 突入!!', '#6cf']); }
            else if (m === 'rcJudge' && modeBefore !== 'rcJudge') judgeMsgs(msgs);
            else if (m === 'st') { if (modeBefore !== 'st') { Sound.se.fanfare('rainbow'); await Scene.win('rainbow'); } msgs.push([(S().st.super ? 'スーパー' : '') + 'ストックタイム 突入!!' + (S().st.why ? ' (' + S().st.why + ')' : ''), '#ff4']); }
            else if (m === 'rchigh' && modeBefore !== 'rchigh') msgs.push(['こおりチャンス 高確率へ', '#6cf']);
            else if (m === 'normal' && modeBefore === 'rchigh') msgs.push(['通常ステージへ…', '#aaa']);
        }
        for (const [t, c] of msgs) { LCD.flash(t, c); await sleep(auto ? 700 : 1000); }
    }
    function judgeMsgs(msgs) {
        const rc = S().rc;
        if (!rc) return;
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
        for (const [t, c] of msgs) { LCD.flash(t, c); await sleep(auto ? 700 : 1000); }
        refresh('idle'); phase = 'idle';
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
            doStop(r); k++; setTimeout(next, 140);
        };
        setTimeout(next, 200);
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
    $('btnCoin').onclick = () => { E.addCredit(50); Panel.update(E, G, lastPay); };
    $('btnAuto').onclick = () => { auto = !auto; $('btnAuto').classList.toggle('on', auto); if (auto) autoStep(); };
    $('btnDebug').onclick = () => { const d = $('debug'); d.style.display = d.style.display === 'block' ? 'none' : 'block'; $('btnDebug').classList.toggle('on'); Panel.update(E, G, lastPay); };
    const muteIcon = () => { $('btnMute').textContent = Sound.muted ? '🔇' : '🔊'; $('btnBgm').classList.toggle('on', Sound.bgmOn); };
    $('btnBgm').onclick = () => { Sound.unlock(); Sound.setBgm(!Sound.bgmOn); muteIcon(); };
    $('btnMute').onclick = () => { Sound.unlock(); Sound.setMute(!Sound.muted); muteIcon(); };
    muteIcon();
    $('setting').value = S().setting;
    $('setting').onchange = () => {
        if (phase !== 'idle') { $('setting').value = S().setting; return; }
        E.reset(+$('setting').value); G = null; save(); refresh('idle'); LCD.flash('設定変更 (' + S().setting + ')', '#fff');
    };
    addEventListener('keydown', e => {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
        const k = e.key.toLowerCase();
        if (k === ' ' || k === 'enter') { e.preventDefault(); if (!e.repeat) doLever(); }
        else if (k === 'z' || k === 'arrowleft' || k === '1') { if (!e.repeat) doStop(0); }
        else if (k === 'x' || k === 'arrowdown' || k === '2') { e.preventDefault(); if (!e.repeat) doStop(1); }
        else if (k === 'c' || k === 'arrowright' || k === '3') { if (!e.repeat) doStop(2); }
        else if (k === 'h') { if (S().mode === 'rcPromo') doLever(); }
        else if (k === 's') doStand();
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
    else if (params.get('battle')) {   // ?battle=bj|poker|roulette (勝ちの 前兆)
        const kind = params.get('battle');
        let b; do { b = SBJ.Battle.makeBattle(E.rng, E.P, true, false, null); } while (['bj', 'poker', 'roulette'].includes(kind) && b.kind !== kind);
        S().pending = { kind: 'bonus' }; S().omen = { pre: 0, battle: b, win: true };
    }
    window.__game = { get E() { return E; } };
    Scene.init();
    refresh('idle');
})();
