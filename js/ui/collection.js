// 図鑑と 実績 (2026-11-23)。見た 当たり・バトル・演出・示唆を 集める。データの リセットや 設定変更では 消えない
// 一覧は effects.js・params.js から 作る (演出を 足せば 図鑑にも 自動で 増える)。確認用の URL (?rc=1 など) では 記録しない
const Zukan = (() => {
    const $ = id => document.getElementById(id);
    const KEY = 'koori-sbj-zukan-v1';
    let on = true;          // false = 記録しない (確認用の URL)
    let onUnlock = null;    // 実績を とった とき (main.js が 音と 表示)
    let D = { seen: {}, ach: {}, wins: 0 };
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.seen) D = Object.assign(D, v); } catch (e) { /* なし */ }
    const save = () => { if (on) try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* なし */ } };

    // ----- 図鑑の 一覧 ([グループ名, [[key, 表示名], ...]]) -----
    const uniq = a => [...new Set(a)];
    const allSet = fn => uniq([1, 2, 3, 4, 5, 6].flatMap(s => SBJ.SETTING_HINT[fn](s).map(x => x[0])));
    function catalog() {
        const SH = SBJ.SETTING_HINT;
        const fxGroups = [];
        for (const f of SBJ.FX) {
            let g = fxGroups.find(x => x[0] === f.name);
            if (!g) fxGroups.push(g = [f.name, []]);
            for (const v of f.v) { const k = 'fx:' + f.name + '|' + v.t; if (!g[1].some(x => x[0] === k)) g[1].push([k, v.t]); }
        }
        return [
            { id: 'win', name: '当たり', groups: [
                ['ボーナス', SBJ.BONUS_NAMES.map(n => ['win:' + n, n])],
                ['ほかの 当たり', ['こおりチャンス', 'ストックタイム', 'スーパーストックタイム突入', 'エンディング', 'ロングフリーズ', 'ジョーカーモード', '有利区間 完走'].map(n => ['win:' + n, n])],
            ] },
            { id: 'battle', name: 'カジノバトル', groups: [
                ['しゅるい', [['bk:bj', 'ブラックジャック'], ['bk:poker', 'ポーカー'], ['bk:roulette', 'ルーレット']]],
                ['対戦相手', SBJ.OPPS.map(o => ['opp:' + o.name, o.name])],
                ['勝ち', SBJ.OPPS.map(o => ['oppwin:' + o.name, o.name + 'に 勝つ'])],
            ] },
            { id: 'fx', name: '演出', groups: fxGroups },
            { id: 'set', name: '設定示唆', groups: [
                ['11 枚役の トランプ (REG)', allSet('card').map(t => ['card:' + t, t])],
                ['ボーナス終了画面', allSet('end').map(t => ['end:' + t, t])],
                ['エンディングの キャラ', allSet('ending').map(t => ['ending:' + t, t])],
                ['こおりトロフィー', SH.trophies.map(x => ['trophy:' + x[1], x[1]])],
                ['ハワイの 違和感', uniq(SH.oddity.map(x => x[1])).map(t => ['odd:' + t, t])],
                ['ストック示唆の ポーズ', SBJ.POSE.slice(1).map(t => ['pose:' + t, t])],
            ] },
        ];
    }
    let CAT = null;
    const cat = () => CAT || (CAT = catalog());

    // ----- 実績 (id, 名前, 説明, 条件: c = { S, ev }) -----
    const ACH = [
        ['bonus1', 'はじめての ボーナス', 'ボーナスを 1 回 当てる', c => c.S.stats.big + c.S.stats.reg >= 1],
        ['big1', 'はじめての BIG', 'BIG を 1 回 当てる', c => c.S.stats.big >= 1],
        ['rc1', 'こおりチャンス', 'こおりチャンスに 入る', c => c.S.stats.rc >= 1],
        ['st1', 'ストックタイム', 'ストックタイムに 入る', c => c.S.stats.st + c.S.stats.sst >= 1],
        ['sst1', 'スーパーストックタイム', 'スーパーストックタイムに 入る', c => c.S.stats.sst >= 1],
        ['joker1', 'ジョーカーモード', 'ジョーカーモードに 入る', c => c.S.stats.joker >= 1],
        ['freeze1', 'ロングフリーズ', 'ロングフリーズを 見る', c => c.S.stats.freeze >= 1],
        ['ending1', 'エンディング', 'エンディングまで 行く', c => c.S.stats.ending >= 1],
        ['yuri1', '完走', '有利区間を 完走する', c => c.S.stats.yuriDone >= 1],
        ['ceil', '天井', '天井まで 回す', c => c.ev.ceil],
        ['natural', 'ナチュラル', 'こおりチャンスで ナチュラル ブラックジャック', c => c.ev.natural],
        ['five', 'ファイブカード', 'こおりチャンスで ファイブカード', c => c.ev.five],
        ['gold', '金BAR', 'こおりチャンスで 金BAR', c => c.ev.gold],
        ['rina', 'かきごおりちゃん', 'かきごおりちゃんと 対戦する', () => !!D.seen['opp:' + SBJ.CAST.rina]],
        ['win10', 'カジノの 常連', 'カジノバトルに 10 回 勝つ', () => D.wins >= 10],
        ['win50', 'カジノの 王様', 'カジノバトルに 50 回 勝つ', () => D.wins >= 50],
        ['pay400', 'ごっそり', '1 回の ボーナスで 400 枚 以上', c => c.ev.paid >= 400],
        ['g1000', '1000 ゲーム', '1000 ゲーム 回す (データ リセットまで)', c => c.S.games >= 1000],
        ['g10000', '10000 ゲーム', '10000 ゲーム 回す (データ リセットまで)', c => c.S.games >= 10000],
        ['plus1000', '+1000 枚', '差枚 +1000 枚', c => c.S.totalOut - c.S.totalIn >= 1000],
        ['plus3000', '+3000 枚', '差枚 +3000 枚', c => c.S.totalOut - c.S.totalIn >= 3000],
        ['trophy', 'こおりトロフィー', 'こおりトロフィーを 見る', () => Object.keys(D.seen).some(k => k.startsWith('trophy:'))],
        ['set6', '設定6濃厚', '設定6濃厚の 示唆を 見る', () => Object.keys(D.seen).some(k => /設定6濃厚/.test(k))],
        ['fx50', '演出 はかせ', '演出図鑑を 50% 埋める', () => rate('fx') >= 0.5],
        ['fx100', '演出 マスター', '演出図鑑を ぜんぶ 埋める', () => rate('fx') >= 1],
        ['set100', '示唆 マスター', '設定示唆図鑑を ぜんぶ 埋める', () => rate('set') >= 1],
    ];

    function count(id) {
        const c = cat().find(x => x.id === id);
        let n = 0, all = 0;
        for (const [, items] of c.groups) for (const [k] of items) { all++; if (D.seen[k]) n++; }
        return [n, all];
    }
    const rate = id => { const [n, a] = count(id); return a ? n / a : 0; };

    let dirty = false;
    function see(key) { if (!on || !key || D.seen[key]) return; D.seen[key] = 1; dirty = true; }
    function battleWin() { if (on) { D.wins++; dirty = true; } }
    // 1 ゲームの おわりに 呼ぶ。ev = そのゲームで 起きた こと ({ ceil, natural, five, gold, paid })
    function check(S, ev) {
        if (!on) return;
        const c = { S, ev: ev || {} }, got = [];
        for (const [id, name, , fn] of ACH) {
            if (D.ach[id]) continue;
            let ok = false; try { ok = fn(c); } catch (e) { ok = false; }
            if (ok) { D.ach[id] = Date.now(); got.push(name); dirty = true; }
        }
        if (dirty) { save(); dirty = false; }
        if (got.length && onUnlock) got.forEach(onUnlock);
    }

    // ----- 画面 -----
    let tab = 'win';
    function render() {
        const tabs = [...cat().map(c => [c.id, c.name, count(c.id)]), ['ach', '実績', [Object.keys(D.ach).length, ACH.length]]];
        $('zTabs').innerHTML = tabs.map(([id, name, [n, a]]) => `<button data-z="${id}" class="${id === tab ? 'on' : ''}">${name}<small>${n}/${a}</small></button>`).join('');
        $('zTabs').querySelectorAll('button').forEach(b => { b.onclick = () => { tab = b.dataset.z; render(); }; });
        let h = '';
        if (tab === 'ach') {
            h = ACH.map(([id, name, desc]) => `<div class="zach ${D.ach[id] ? 'got' : ''}"><b>${D.ach[id] ? '★' : '☆'} ${name}</b><span>${desc}</span></div>`).join('');
        } else {
            const c = cat().find(x => x.id === tab);
            h = c.groups.map(([gname, items]) => {
                const n = items.filter(([k]) => D.seen[k]).length;
                return `<div class="zgrp"><h4>${gname} <small>${n}/${items.length}</small></h4><div class="zitems">${items.map(([k, label]) => D.seen[k] ? `<span class="zi got">${label}</span>` : '<span class="zi">？？？</span>').join('')}</div></div>`;
            }).join('');
        }
        $('zBody').innerHTML = h;
        $('zNote').textContent = on ? '' : '確認用の 画面なので 記録しないよ';
    }
    function open() { render(); $('zukan').hidden = false; }
    function close() { $('zukan').hidden = true; }
    function init(opts) {
        on = !opts.noRecord; onUnlock = opts.onUnlock;
        $('zClose').onclick = close;
        $('zukan').onclick = e => { if (e.target === $('zukan')) close(); };
    }
    return { init, see, battleWin, check, open, close, count, ACH, _data: () => D };
})();
