// 液晶の 演出 (ステージ・カジノバトル・こおりチャンスの 手札と 報酬・カットイン・メッセージ)
const LCD = (() => {
    const $ = id => document.getElementById(id);
    const { BONUS_NAMES, OPPS, CAST } = SBJ;
    const SUITS = ['♠', '♥', '♦', '♣'];
    const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const LADDER = ['REG', '赤7BIG', '青7BIG', 'SBIG', 'エピソード', 'SST'];
    const STAGE_NAME = { casino: 'カジノステージ', china: 'チャイナステージ', japan: 'ジャパンステージ', hawaii: 'ハワイステージ' };
    const AIM_TEXT = ['BAR を 狙え!', '赤7 を 狙え!!', '青7 を 狙え!!', '赤7・青7・赤7 を 狙え!!', 'BAR・青7・BAR を 狙え!!', '青7・赤7・青7 を 狙え!!!', '金BAR を 狙え!!!'];
    const KIND = { bj: 'ブラックジャック', poker: 'ポーカー', roulette: 'ルーレット' };
    const IDLE = ['今日も 冷えてるねぇ', 'カードを 配るよ', 'こおりくん、待機中…', '一勝負 いかが？'];
    const pick = a => a[Math.floor(Math.random() * a.length)];

    function cardHTML(c) {
        if (!c) return '';
        if (c.wild) return `<div class="card wild">W<span>${c.wv}</span></div>`;
        const red = c.s === 1 || c.s === 2;
        return `<div class="card ${red ? 'red' : ''}">${RANKS[c.r]}<span>${SUITS[c.s]}</span></div>`;
    }
    const backHTML = color => `<div class="card back ${color || ''}"></div>`;
    // キャラ: ドット絵が あれば 絵、なければ 名前の 札
    function chara(art, name, size) { return art && Art.has(art) ? Art.img(art, size, name) : `<span class="namechip">${name}</span>`; }
    const koori = size => chara('koori', CAST.main, size);
    const oppFace = (opp, size) => chara(OPPS[opp].art, OPPS[opp].name, size);

    function stageClass(S) {
        if (S.mode === 'ending') return 'ending';
        if (S.mode === 'bonus' || S.mode === 'prep') return 'bonus';
        if (S.mode === 'rcPromo' || S.mode === 'rcJudge') return 'rc';
        if (S.mode === 'st') return S.st && S.st.super ? 'sst' : 'st';
        if (S.omen || S.pending) return 'hawaii';
        if (S.mode === 'rchigh') return 'japan';
        if (S.bonusHigh && S.showHigh) return 'japan';
        if (S.china || S.bonusHigh || S.chain >= 3) return 'china';
        return 'casino';
    }
    function battleHTML(E, b, revealed) {
        const opp = OPPS[b.opp];
        const head = `<div class="mid">${b.phase === 'start' && b.intro ? '<span class="small">' + b.intro + 'から 発展　</span>' : ''}${KIND[b.kind]}　VS <span class="badge opp">${opp.name}</span></div>`;
        const faces = `<div class="row">${koori(40)}<b>VS</b>${oppFace(b.opp, 40)}</div>`;
        if (b.kind === 'poker') {
            let body = b.phase === 'start' ? `<div class="mid">${b.line}</div>` : `<div class="big" style="color:#ff5">${b.act}${b.hitNo > 1 ? ' ×' + b.hitNo : ''}</div>`;
            if (b.phase === 'final' && revealed) body += `<div class="mid">${b.called ? opp.name + '「…コール」<br>' : ''}${opp.name}の 役: ${b.oppHand}</div>`;
            return head + faces + body;
        }
        if (b.kind === 'roulette') {
            let body = b.phase === 'start' ? `<div class="mid">${b.line}</div>` : `<div class="big">SPIN${b.hitNo > 1 ? ' ×' + b.hitNo : ''}</div>${revealed || b.phase !== 'final' ? '<div class="mid">' + (b.say || '') + '</div>' : ''}`;
            if (b.phase === 'final' && revealed) body += `<div class="big" style="color:${b.ball === 'WIN' ? '#ff4' : '#aaa'}">ボール → ${b.ball}</div>`;
            return head + faces + body;
        }
        const showCards = revealed || b.phase === 'start' ? b.cards : b.cards.slice(0, -1);
        const total = revealed || b.phase === 'start' ? b.total : E.total(b.cards.slice(0, -1));
        const hit = b.phase !== 'start' ? `<span class="hit ${b.color}">HIT!${b.hitNo > 1 ? ' ×' + b.hitNo : ''}</span>` : '';
        return head + `
            <div class="who">${oppFace(b.opp, 34)}<div class="row">${b.dealerCards.map(cardHTML).join('')}<span class="tot">${b.dealer}</span></div></div>
            <div class="who">${koori(34)}<div class="row">${showCards.map(cardHTML).join('')}${!revealed && b.phase !== 'start' ? backHTML(b.color) : ''}<span class="tot">${total}</span></div></div>
            <div class="small">${hit}</div>`;
    }
    function ladderHTML(cur, gold) {
        let h = '<div class="ladder">';
        LADDER.forEach((n, i) => { h += `<div class="lad ${cur === i ? 'cur' : ''}">${n}</div>`; });
        if (gold) h += `<div class="lad gold ${cur === 6 ? 'cur' : ''}">金BAR</div>`;
        return h + '</div>';
    }
    // when = 'lever' (レバーオン)・'reveal' (第3停止後)・'idle'
    function render(E, G, when) {
        const S = E.S, lcd = $('lcd');
        const cls = stageClass(S);
        const simpleRed = (S.mode === 'rcPromo' || S.mode === 'rcJudge') && S.custom.simple && S.rc && (S.rc.rank >= 1 || E.promoPreview() >= 1);
        lcd.className = cls + (simpleRed ? ' red' : '');
        $('stage').textContent = ({ bonus: 'BONUS', rc: 'こおりチャンス', st: 'ストックタイム', sst: 'スーパーストックタイム', ending: 'ENDING' })[cls] || STAGE_NAME[cls];
        $('lampJoker').className = 'lamp' + (S.joker > 0 ? ' on' : '');
        $('lampGold').className = 'lamp' + (S.goldBar ? ' goldon' : '');
        let sub = '', html = '';
        const lever = when === 'lever';
        if (G && lever && G.battle) html = battleHTML(E, G.battle, false);
        else if (G && lever && G.aim != null) html = `<div class="big" style="color:#ff5">狙え!!</div><div class="mid">${AIM_TEXT[G.aim]}</div>`;
        else if (G && lever && G.award != null) html = `${koori(56)}<div class="big" style="color:#ff5">${BONUS_NAMES[G.award]}</div><div class="big">確定!!</div>`;
        else {
            switch (S.mode) {
                case 'normal': case 'rchigh': {
                    // 前兆が 続く 間は 精算後も バトル画面を 出した まま
                    if (G && G.battle && S.omen) { html = battleHTML(E, G.battle, true); break; }
                    html = `${koori(64)}<div class="small">${S.mode === 'rchigh' ? 'こおりチャンスを 狙え!' : pick(IDLE)}</div>`;
                    if (S.mode === 'rchigh') sub = 'RC 高確率';
                    break;
                }
                case 'ending':
                    html = `<div class="big">ENDING BONUS</div><div class="mid">有利区間 完走まで</div><div class="mid">${E.yuriDiff()} / ${E.P.yuriCap} 枚</div>`;
                    break;
                case 'prep':
                    html = `<div class="big">BONUS 確定!!</div>${koori(48)}<div class="small">PUSH で 種類を 示唆・狙え役を 待て…</div>`;
                    break;
                case 'bonus': {
                    const b = S.bonus;
                    html = `<div class="big" style="color:#fff">${BONUS_NAMES[b.type]}</div><div class="mid">獲得 ${b.paid} / ${b.target} 枚</div>${b.revealed ? '<div class="mid" style="color:#ff5">' + (b.stSuper ? 'スーパー' : '') + 'ストックタイム 確定!</div>' : '<div class="small">レア役で ストックタイム 抽選!</div>'}`;
                    break;
                }
                case 'rcPromo': {
                    const rc = S.rc, t = E.total(rc.cards), pr = E.promoPreview();
                    const hidden = lever;
                    const cards = hidden && G && G.rcCard && G.rcCard !== 'none' ? rc.cards.slice(0, -1) : rc.cards;
                    html = `<div class="mid">昇格パート　残り ${Math.max(0, rc.maxGames - rc.games)}G</div>
                        <div class="who">${koori(36)}<div class="row">${cards.map(cardHTML).join('')}${hidden ? backHTML('gold') : ''}<span class="tot">${hidden ? E.total(cards) : t}</span></div></div>
                        ${S.custom.simple ? '' : ladderHTML(hidden ? null : pr, rc.gold)}
                        <div class="small">${hidden ? 'HIT!! ベルで カードを 引け!' : 'HIT か STAND か… 21 に 近いほど 報酬 UP'}</div>`;
                    sub = rc.joker ? 'JOKER +1' : '';
                    break;
                }
                case 'rcJudge': {
                    const rc = S.rc;
                    html = `<div class="mid">ジャッジパート</div>${S.custom.simple ? '<div class="mid">…</div>' : ladderHTML(rc.rank, rc.gold)}<div class="small">狙えカットインで 報酬 獲得! 来なければ 昇格の チャンス</div>`;
                    break;
                }
                case 'st': {
                    const st = S.st;
                    html = `<div class="big">${st.super ? 'スーパー' : ''}ストックタイム</div><div class="mid">${st.g} / ${st.len}G${st.sets > 1 ? '　SET ' + st.sets : ''}</div><div class="mid">ストック ×${Math.max(S.stocks, 0)}</div><div class="small">終了時に ストックを 放出! (最低 1 個 保証)</div>`;
                    break;
                }
            }
        }
        if (S.release > 0 && S.mode !== 'st') sub = (sub ? sub + ' / ' : '') + '残りストック ' + S.release;
        $('sub').textContent = sub; $('sub').style.display = sub ? '' : 'none';
        $('main').innerHTML = html;
        $('btnPush').className = S.mode === 'prep' && S.prep && S.prep.revealed ? S.prep.push : '';
    }
    function flash(text, color) {
        const f = $('flash');
        f.textContent = text; f.style.color = color || '#fff';
        f.classList.remove('show'); void f.offsetWidth; f.classList.add('show');
    }
    function cutin(color) {
        const c = $('cutin');
        c.style.background = color === 'rainbow' ? 'conic-gradient(#f44,#fd4,#4f8,#4cf,#a4f,#f44)' : ({ white: '#fff', green: '#2f6', red: '#f22', blue: '#28f', gold: '#fd4' })[color];
        c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    }
    function fxBar(html) { const fb = $('fxBar'); fb.innerHTML = html; fb.classList.add('show'); }
    function fxClear() { $('fxBar').classList.remove('show'); }
    return { render, battleHTML, flash, cutin, fxBar, fxClear, LADDER, stageClass };
})();
