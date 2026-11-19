// 演出の アニメーション (設計書 14 章)。液晶の 上の #fxLayer に 部品を 出して、CSS の 動きで 見せる
// どの 演出を 出すかは エンジン (js/engine/hints.js) が きめる。ここは 見せる だけ (結果は 変えない)
const Anim = (() => {
    const C = SBJ.CAST;
    const layer = () => document.getElementById('fxLayer');
    // キャラ名 → 絵の id
    const ART_OF = { [C.main]: 'koori', [C.orin]: 'onioni', [C.clark]: 'okagappa', [C.tiffany]: 'tiffany', [C.rosa]: 'rosa', [C.howard]: 'howard', [C.mint]: 'mint', [C.rina]: 'rina', [C.ilel]: 'ilel' };
    const PASSERS = ['onioni', 'okagappa', 'tiffany', 'rosa', 'howard'];
    function who(text) { for (const [name, id] of Object.entries(ART_OF)) if (text.includes(name)) return id; return null; }
    // 部品を 出す (ms たったら 消す)
    function put(html, cls, ms, style) {
        const L = layer(); if (!L) return null;
        const d = document.createElement('div');
        d.className = 'fx ' + cls;
        if (style) d.style.cssText = style;
        d.innerHTML = html;
        L.appendChild(d);
        // 演出の 間は 後ろの 液晶を うすく する
        const lcd = document.getElementById('lcd');
        lcd.classList.add('fxon');
        clearTimeout(put.t);
        put.t = setTimeout(() => lcd.classList.remove('fxon'), ms - 200);
        setTimeout(() => d.remove(), ms);
        return d;
    }
    const sprite = (id, size) => Art.img(id, size, '');
    const strong = t => /強|！！！|777|WIN|EXELLENT|熱|当|飛び出|Good/.test(t);

    const BY_NAME = {
        'キャラ通過': t => {
            const id = who(t) || PASSERS[Math.floor(Math.random() * PASSERS.length)];
            const fromRight = t.includes('右から');
            put(sprite(id, 64), 'pass' + (fromRight ? ' rtl' : ''), 1600);
            if (t.includes('バトル発展')) setTimeout(() => put('<div class="fx-word">BATTLE!?</div>', 'pop', 1200), 900);
        },
        'ランプルーレット': () => {},   // 上の ランプが 回る (main.js)
        ['巨大' + C.mint]: t => {
            const kind = t.includes('引っ込') ? 'sink' : t.includes('飛び出') ? 'jump' : 'peek';
            put(sprite('mint', 200), 'giant ' + kind, 1900);
        },
        [C.main + 'の 部位演出']: t => put(`<div class="zoomwrap ${t.includes('足') ? 'foot' : 'face'}">${sprite('koori', 360)}</div>`, 'zoom', 1500),
        'ひとくち演出': () => { put(sprite('koori', 80), 'bite', 1300); put('<div class="fx-word">ぱくっ!</div>', 'pop', 1200); },
        '衣装替え・カーテン': () => put('<i class="ctn l"></i><i class="ctn r"></i>', 'curtain', 1600),
        'カジノ内観 (シャンデリア)': t => put('<div class="chand"></div>', 'glow' + (strong(t) ? ' strong' : ''), 1400),
        'カジノ外観 (塔・噴水)': t => put('<div class="tower"></div><div class="fountain"></div>', 'glow outside' + (strong(t) ? ' strong' : ''), 1400),
        'レーザー文字': t => put(`<i class="beam a"></i><i class="beam b"></i><div class="laser-word">${t}</div>`, 'laser', 1600),
        '花火': t => {
            const mark = { ダイヤ: '♦', クラブ: '♣', ハート: '♥', スペード: '♠', '777': '777' }[t] || '✦';
            const sparks = Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30}deg"></i>`).join('');
            put(`<div class="burst">${sparks}</div><div class="fw-mark ${t === 'ハート' || t === 'ダイヤ' || t === '777' ? 'red' : ''}">${mark}</div>`, 'firework', 1600);
        },
        'チャイナロゴ': t => put(`<div class="china-logo">${t.replace(/[「」]/g, '')}</div>`, 'pop china', 1500),
        'ホロトランプ': () => put('<div class="holo">A<span>♠</span></div>', 'holo-in', 1500),
        '手紙': t => put(`<div class="letter ${t.includes('赤') ? 'red' : t.includes('青') ? 'blue' : ''}">✉<span>ひんやり<br>まってるよ</span></div>`, 'slide-up', 1600),
        '祇園の鐘': t => put(`<div class="bell"></div><div class="bang">${(t.match(/！/g) || ['！']).join('')}</div>`, 'temple', 1600),
        '池のコイ': t => put('<div class="koi"></div>', 'swim' + (t.includes('強') ? ' strong' : ''), 1700),
        '扇子': t => put('<div class="fan"></div>', 'fan-open' + (t.includes('赤') ? ' red' : ''), 1500),
        '傘': t => {
            const n = t.includes('4') ? 4 : 1;
            for (let i = 0; i < n; i++) put('<div class="umb"></div>', 'umbrella' + (t.includes('開く') ? ' open' : ''), 1600, `left:${n === 1 ? 50 : 14 + i * 24}%;animation-delay:${i * 0.12}s`);
        },
        [C.main + 'の セリフ']: t => put(`${sprite('koori', 72)}<div class="bubble">${t.replace(/[「」]/g, '')}</div>`, 'talk', 1800),
        '電光掲示板': t => put(`<div class="board"><span>${t}</span></div>`, 'pop board-in', 1600),
    };
    // 状態示唆演出 (fx = { name, text, at })
    // 予告の 種類ごと (会話・カットイン・ステップアップ・カード斬り・ロゴ連打)。一覧に ない ものは 札を 出す
    const BY_KIND = {
        talk: fx => Talk.notice(fx),
        cutin: fx => Talk.cut(fx),
        stepup: fx => {
            const cards = Array.from({ length: fx.su }, (_, i) => `<i class="su su${i + 1}" style="animation-delay:${i * 0.28}s">${['♠', '♣', '♥', '♦', '★'][i]}</i>`).join('');
            put(`<div class="sustack">${cards}</div><div class="su-label" style="animation-delay:${fx.su * 0.28}s">STEP ${fx.su}</div>`, 'stepup', 900 + fx.su * 300);
        },
        slash: fx => {
            const red = /K|JOKER/.test(fx.text);
            put(`<div class="slash-card"><b class="${red ? 'red' : ''}">${fx.text === 'JOKER' ? '🃏' : fx.text}</b><i class="slash-line"></i></div>`, 'slash', 1700);
        },
        logo: () => put(`<div class="logo-rush">${Array.from({ length: 5 }, (_, i) => `<b style="animation-delay:${i * 0.22}s">こおりくんの<br>スーパーブラックジャック</b>`).join('')}</div>`, 'logo', 1800),
    };
    function generic(fx) { put(`<div class="gen-card"><small>${fx.name}</small><b>${fx.text}</b></div>`, 'pop gen', 1400); }
    function play(fx) {
        if (fx.kind && BY_KIND[fx.kind]) return BY_KIND[fx.kind](fx);
        const f = BY_NAME[fx.name];
        if (f) f(fx.text); else generic(fx);
    }
    // ST の ストック数示唆 (ピース・ウインク・投げキッス)
    function pose(text) { put(`${sprite('koori', 72)}<div class="bubble">${text.replace(C.main + 'の ', '')}</div>`, 'talk', 1600); }
    // ボーナス終了の サブ液晶キャラ (設定示唆)
    function endChar(text) { const id = who(text); if (id) put(sprite(id, 80), 'pop corner', 1500); }
    // ボーナス中の 告知演出 (こおりBB・しろくまBB・ジョーカーBB)
    function bbfx(text) {
        if (/トランプ/.test(text)) put('<div class="holo">' + (/！！！/.test(text) ? '!!!' : /！/.test(text) ? '!' : '◎') + '</div>', 'throw', 1200);
        else if (/葉巻/.test(text)) put(sprite('howard', 72) + `<div class="bubble">${(text.match(/\d+/) || [''])[0]} 本</div>`, 'talk', 1500);
        else if (/割り込み/.test(text)) { const id = who(text); if (id) put(sprite(id, 72), 'pass', 1400); }
        else if (/赤月/.test(text)) put('<div class="moon ' + (/赤文字/.test(text) ? 'red' : '') + '"></div>', 'pop', 1400);
        else if (/ジョーカー/.test(text)) put('<div class="china-logo joker">JOKER</div>', 'pop', 1300);
    }
    return { play, pose, endChar, bbfx };
})();
