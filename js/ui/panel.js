// データ表示・内部状態・サブ液晶
const Panel = (() => {
    const $ = id => document.getElementById(id);
    function update(E, G, lastPay) {
        const S = E.S, st = S.stats, diff = S.totalOut - S.totalIn;
        $('credit').textContent = S.credit;
        $('pay').textContent = lastPay;
        $('gameNo').textContent = S.sinceBig;
        $('dataSum').textContent =
            `総回転 ${S.games}G　BIG間 ${S.sinceBig}G\n` +
            `BIG ${st.big}　REG ${st.reg}　初当り ${st.first}${st.first ? ' (1/' + (S.games / st.first).toFixed(0) + ')' : ''}\n` +
            `こおりチャンス ${st.rc}　ST ${st.st}　SST ${st.sst}　JOKER ${st.joker}\n` +
            `差枚 ${diff >= 0 ? '+' : ''}${diff}　機械割 ${S.totalIn ? (S.totalOut / S.totalIn * 100).toFixed(1) : '-'}%`;
        if ($('debug').style.display === 'block') debug(E, G);
    }
    function debug(E, G) {
        const S = E.S;
        $('debug').textContent =
            `設定 ${S.setting}　モード ${S.mode}\n` +
            `成立役 ${G ? SBJ.FLAG_NAME[G.flag] : '-'}${G && G.order ? ' (正解 ' + G.order.map(x => x + 1).join('-') + ')' : ''}\n` +
            `ボーナス高確 ${S.bonusHigh ? 'ON' : 'OFF'}　チャイナ ${S.china ? 'ON' : 'OFF'}　小役連 ${S.chain}　通常G ${S.normalG}\n` +
            `天井 ${S.sinceBig}/${S.ceilMax}　REG連 ${S.regStreak}/${E.P.regCeil}　スイカ ${S.suikaCnt}/${S.suikaTarget}${S.suikaReady ? ' (到達)' : ''}\n` +
            `RC高確 A:${S.rcA ? 'ON' : 'OFF'} B:${S.rcB}G　前兆 ${S.omen ? (S.omen.win ? '本前兆' : 'ガセ') : 'なし'}\n` +
            `ストック ${S.stocks}　放出待ち ${S.release}　ST待ち ${S.stQueue.length}\n` +
            `RC経由REG連 ${S.rcRegStreak}　金BAR ${S.goldBar ? 'ON' : 'OFF'}　JOKER残り ${S.joker}\n` +
            `有利区間 ${S.yuri ? E.yuriDiff() + '/' + E.P.yuriCap : 'OFF'}`;
    }
    const LED_COLOR = { 白: '#fff', 青: '#39f', 黄: '#ff4', 緑: '#3f6', 赤: '#f33', 紫: '#b5f' };
    function sub(E, G) {
        const S = E.S;
        $('subLcd').className = (G && G.subBg && G.subBg !== 'blue') ? G.subBg : (S.mode === 'normal' && S.regStreak >= E.P.regCeil ? 'red' : '');
        $('subG').className = (G && G.hints && G.hints.gameColor) || '';
        $('subG').textContent = S.sinceBig + 'G';
        let info = '';
        if (G && G.dice) info = `DICE CHECK ${G.dice.at}G　<span class="die ${G.dice.red ? 'red' : ''}">${G.dice.a}</span><span class="die ${G.dice.red ? 'red' : ''}">${G.dice.b}</span>`;
        else if ((S.mode === 'prep' || S.mode === 'rcPromo' || S.mode === 'rcJudge') && S.lastLed) {
            info = `当選契機ランプ<span class="led ${/点滅/.test(S.lastLed) ? 'blink' : ''}" style="background:${LED_COLOR[S.lastLed[0]]}"></span>${S.lastLed}`;
        } else if (S.mode === 'normal') info = S.regStreak >= E.P.regCeil ? '次回 BIG 濃厚' : '';
        $('subInfo').innerHTML = info;
    }
    // 当たり履歴 (新しい 順)。h = [{ at: そこまでの G 数, kind, label, col, n: 総回転 }]
    function hist(list) {
        const el = $('dataHist');
        if (!list.length) { el.textContent = 'まだ 当たりが ないよ'; return; }
        el.innerHTML = list.slice().reverse().map((h, i) => `<div class="hrow"><span>${list.length - i}</span><b>${h.at}G</b><span class="hk" style="background:${h.col}">${h.label}</span><span style="opacity:.6">(${h.n}G目)</span></div>`).join('');
    }
    // スランプグラフ (差枚の うつりかわり)。d = { step, pts }
    function graph(d, games) {
        const cv = $('slump'), c = cv.getContext('2d'), W = cv.width, H = cv.height, pts = d.pts;
        c.clearRect(0, 0, W, H);
        const L = 70, R = 10, T = 12, B = 30;
        let lo = Math.min(0, ...pts), hi = Math.max(0, ...pts);
        if (hi - lo < 200) { const m = (hi + lo) / 2; hi = m + 100; lo = m - 100; }
        const span = hi - lo, unit = span > 4000 ? 1000 : span > 1600 ? 500 : span > 600 ? 200 : 100;
        const y = v => T + (hi - v) / (hi - lo) * (H - T - B);
        const n = Math.max(1, (pts.length - 1) * d.step), x = i => L + i * d.step / n * (W - L - R);
        c.font = '18px monospace'; c.fillStyle = '#889'; c.strokeStyle = '#ffffff18'; c.lineWidth = 1;
        for (let v = Math.ceil(lo / unit) * unit; v <= hi; v += unit) { c.beginPath(); c.moveTo(L, y(v)); c.lineTo(W - R, y(v)); c.stroke(); c.fillText((v > 0 ? '+' : '') + v, 2, y(v) + 6); }
        c.strokeStyle = '#fff6'; c.beginPath(); c.moveTo(L, y(0)); c.lineTo(W - R, y(0)); c.stroke();
        c.fillText('0G', L, H - 8); c.textAlign = 'right'; c.fillText(games + 'G', W - R, H - 8); c.textAlign = 'left';
        if (pts.length < 2) return;
        c.strokeStyle = '#ffd34a'; c.lineWidth = 3; c.beginPath();
        pts.forEach((v, i) => (i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))));
        c.stroke();
    }
    return { update, debug, sub, hist, graph };
})();
