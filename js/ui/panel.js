// データ表示・内部状態・サブ液晶
const Panel = (() => {
    const $ = id => document.getElementById(id);
    function update(E, G, lastPay) {
        const S = E.S, st = S.stats, diff = S.totalOut - S.totalIn;
        $('credit').textContent = S.credit;
        $('pay').textContent = lastPay;
        $('gameNo').textContent = S.sinceBig;
        $('data').textContent =
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
    return { update, debug, sub };
})();
