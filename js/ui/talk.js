// カジノバトルの 登場カットインと 会話 (相手が きまった 開始G・最終G の ひとこと)
// 帯と 文字の 色が 期待度: 白 < 青 < 緑 < 赤 < 金 < 虹 (勝利濃厚)。色は エンジン (battle.js) が きめる
const Talk = (() => {
    const $ = id => document.getElementById(id);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const KIND = { bj: 'ブラックジャック', poker: 'ポーカー', roulette: 'ルーレット' };
    function box() {
        let t = $('talk');
        if (!t) { t = document.createElement('div'); t.id = 'talk'; $('lcd').appendChild(t); }
        return t;
    }
    const face = (art, size) => (typeof Art !== 'undefined' && Art.has(art) ? Art.img(art, size, '') : '');
    function bubble(who, opp, line, side) {
        const art = who === 'koori' ? 'koori' : SBJ.OPPS[opp].art;
        const name = who === 'koori' ? SBJ.CAST.main : SBJ.OPPS[opp].name;
        return `<div class="tline ${side}">${face(art, 44)}<div class="tbub"><small>${name}</small><span class="tc-${line.color}">${line.text}</span></div></div>`;
    }
    // 開始G: 登場カットイン → 相手の ひとこと → こおりくんの 返事。終わったら resolve
    async function intro(b, fast) {
        if (!b || !b.talk) return;
        const t = box(), k = typeof fast === 'number' ? fast : fast ? 0.55 : 1, opp = SBJ.OPPS[b.opp];
        t.className = 'show';
        t.innerHTML = `<div class="tcut band-${b.talk.cut}"><div class="tband"></div><div class="tface">${face(opp.art, 112)}</div>
            <div class="tname"><small>${b.intro ? b.intro + 'から 発展 / ' : ''}${KIND[b.kind] || ''}</small><b>${opp.name}</b><em>が あらわれた!</em></div></div>`;
        if (typeof Sound !== 'undefined') Sound.se.kyuin();
        await sleep(1100 * k);
        for (let i = 0; i < b.talk.lines.length; i++) {
            const ln = b.talk.lines[i];
            t.innerHTML = bubble(ln.who, b.opp, ln, ln.who === 'koori' ? 'left' : 'right');
            if (typeof Sound !== 'undefined') Sound.se.tick();
            await sleep(950 * k);
        }
        t.className = ''; t.innerHTML = '';
    }
    // 最終G: ひとこと (バトル画面の 上に 重ねる)
    function last(b) {
        if (!b || !b.talk) return;
        const t = box();
        t.className = 'show over';
        t.innerHTML = bubble(b.talk.who, b.opp, b.talk, b.talk.who === 'koori' ? 'left' : 'right');
        clearTimeout(last.t);
        last.t = setTimeout(() => { t.className = ''; t.innerHTML = ''; }, 1500);
    }
    // 通常時の 会話予告 (ふたりの かけあい・文字の 色が 期待度)
    async function notice(fx) {
        const t = box(), lines = fx.lines || [];
        for (let i = 0; i < lines.length; i++) {
            const [art, text] = lines[i];
            const name = art === 'koori' ? SBJ.CAST.main : (SBJ.OPPS.find(o => o.art === art) || {}).name || (art === 'ilel' ? SBJ.CAST.ilel : '');
            t.className = 'show over';
            t.innerHTML = `<div class="tline ${i % 2 ? 'right' : 'left'} low">${face(art, 44)}<div class="tbub"><small>${name}</small><span class="tc-${fx.col}">${text}</span></div></div>`;
            if (typeof Sound !== 'undefined') Sound.se.tick();
            await sleep(1000);
        }
        t.className = ''; t.innerHTML = '';
    }
    // 通常時の カットイン予告 (帯の 色が 期待度)
    function cut(fx) {
        const t = box();
        t.className = 'show over';
        t.innerHTML = `<div class="tcut band-${fx.col} small"><div class="tband"></div><div class="tface">${face(fx.art || 'koori', 96)}</div><div class="tname"><b>${fx.text}</b></div></div>`;
        if (typeof Sound !== 'undefined') Sound.se.kyuin();
        clearTimeout(cut.t);
        cut.t = setTimeout(() => { t.className = ''; t.innerHTML = ''; }, 1500);
    }
    return { intro, last, notice, cut };
})();
