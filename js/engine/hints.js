// 演出・示唆の 抽選 (設計書 14 章)。一覧は js/data/effects.js。抽選は レバーオンで 終わらせる
// 示唆の 強さの 約束:「濃厚」は その 状態の ときだけ・「チャンス」「示唆」は いつでも 出てよいが その 状態で 出やすく・「レア役否定」は レア役で ない ときだけ
(function (SBJ) {
    'use strict';
    const BELLISH = { REP: 1, PUSHBEL: 1, COMBEL: 1, THREE: 1, BELREP: 1 };

    function createHints(S, P, rng) {
        const H = SBJ.HINT_RATE, SH = SBJ.SETTING_HINT;
        const wpickPairs = list => list[rng.weighted(list.map(x => x[1]))][0];

        // 状態に 矛盾しないか (c = 'nr+high' など)
        function allowed(c, g, ctx) {
            for (const part of c.split('+')) {
                if (part === 'none' || part === 'hint') continue;
                if (part === 'koyaku' && !BELLISH[g.flag]) return false;
                if (part === 'rare' && !ctx.rare) return false;
                if (part === 'chance' && g.flag !== 'CHANCE') return false;
                if (part === 'high' && !ctx.high) return false;
                if (part === 'omen' && !ctx.real) return false;
                if (part === 'omenHint' && !ctx.omenAny && !rng.chance(0.1)) return false;
                if (part === 'highOrOmen' && !(ctx.high || ctx.real)) return false;
                if (part === 'nr' && ctx.rare) return false;
                if (part === 'nc' && g.flag === 'CHANCE') return false;
                if (part === 'stageUp1' && !((g.flag === 'CBELL' || g.flag === 'CHE') && (S.china || S.bonusHigh || ctx.real))) return false;
                if (part === 'stageUp2' && !(g.flag === 'CHANCE' && (S.bonusHigh || ctx.real))) return false;
            }
            return true;
        }
        function context(g) {
            const real = !!S.pending;
            return { real, omenAny: !!S.omen || real, high: S.mode === 'normal' ? S.bonusHigh : S.rcA, rare: g.rare };
        }
        // 状態示唆演出を 1 つ (22%)
        function pickFX(g, stage) {
            if (!rng.chance(SBJ.FX_RATE)) return null;
            const ctx = context(g), W = SBJ.FX_WEIGHT;
            const list = SBJ.FX.filter(f => f.stages.includes(stage));
            for (let tries = 0; tries < 4 && list.length; tries++) {
                const f = rng.pick(list);
                const ok = f.v.filter(v => (!v.normalOnly || S.mode === 'normal') && allowed(v.c, g, ctx));
                if (!ok.length) continue;
                const ws = ok.map(v => v.c === 'none' ? W.none : v.c.includes('hint') && ctx.high ? W.hintHigh : v.c.includes('omen') && ctx.real ? W.omenReal : W.other);
                const v = ok[rng.weighted(ws)];
                if (v.c === 'stageUp1') S.china = true;
                if (v.c === 'stageUp2' && S.bonusHigh) S.showHigh = true;
                return { name: f.name, text: v.t, at: v.at || 0, lamp: v.lamp || null };
            }
            return null;
        }
        // その他の 演出 (始動音の 遅れ・ブラックアウト・リール消灯・ゲーム数の 色・PUSH サイドランプ)
        function makeHints(g) {
            const h = {}, ctx = context(g), real = ctx.real, high = ctx.high;
            if (high && rng.chance(H.delay)) h.delay = true;
            const bo = real ? H.blackout.real : high ? H.blackout.high : H.blackout.other;
            if (rng.chance(bo) && (real || g.flag !== 'REP')) h.blackout = true;      // リプレイで ブラックアウト = 本前兆濃厚
            const ro = real ? H.reelOff.real : high ? H.reelOff.high : H.reelOff.other;
            if (rng.chance(ro)) {     // 1・2 消灯 = リプレイ か ベル、3 消灯 = チャンス目。本前兆中は 35% で 矛盾させる
                let n = 0;
                if (real && rng.chance(H.reelOff.lie)) n = BELLISH[g.flag] ? 3 : g.flag === 'CHANCE' ? rng.int(1, 2) : rng.int(1, 3);
                else if (BELLISH[g.flag]) n = rng.int(1, 2); else if (g.flag === 'CHANCE') n = 3;
                if (n) h.reelOff = n;
            }
            if (S.mode === 'normal' && rng.chance(high ? H.gameColor.high : H.gameColor.other)) h.gameColor = rng.pick(['blue', 'yellow', 'green', 'red']);
            if (S.chain >= 3) {
                if (real && rng.chance(H.pushLamp.alt)) h.pushLamp = 'alt';
                else if (S.mode === 'normal' && S.bonusHigh && rng.chance(H.pushLamp.fast)) h.pushLamp = 'fast';
                else if (rng.chance(high ? H.pushLamp.onHigh : H.pushLamp.on)) h.pushLamp = 'on';
            }
            return h;
        }
        // ダイスチェック (通常時 150・450・750G): スイカ規定回数までの 残り R か 設定を 示唆
        function makeDice() {
            const R = Math.max(0, S.suikaTarget - S.suikaCnt), s = S.setting, c = [];
            for (let n = 1; n <= 6; n++) {
                const byCount = R <= 5 * n, bySet = n >= 2 && (n === 6 ? s === 6 : s >= n);
                if (byCount || bySet) c.push({ a: n, b: n, zoro: true, w: byCount ? 30 / n : 8 });
            }
            const pool = Math.floor(R / 10) % 2 === 1 ? [1, 3, 5] : [2, 4, 6];   // 十の位が 奇数 → 奇数＆奇数
            const a = rng.pick(pool); let b; do { b = rng.pick(pool); } while (b === a);
            c.push({ a, b, zoro: false, w: 40 });
            const want = Math.max(3, Math.min(11, 3 + Math.floor(R / 6)));       // 奇数＆偶数: 合計の 目安 = 3 + R÷6
            let best = null;
            for (const o of [1, 3, 5]) for (const e of [2, 4, 6]) { const d = Math.abs(o + e - want) + rng.next() * 0.9; if (!best || d < best.d) best = { a: o, b: e, d }; }
            c.push({ a: best.a, b: best.b, zoro: false, w: 35 });
            const d = c[rng.weighted(c.map(x => x.w))];
            return { a: d.a, b: d.b, zoro: d.zoro, red: d.zoro ? rng.chance(0.6) : rng.chance(0.03), at: S.normalG };
        }
        // ハワイステージの ボーナス告知ゲームの 違和感 (25%・設定示唆)
        function oddity() {
            if (!rng.chance(H.oddity)) return null;
            const c = SH.oddity.filter(([min]) => min === 6 ? S.setting === 6 : S.setting >= min).map(x => x[1]);
            return c.length ? rng.pick(c) : null;
        }
        const settingChar = kind => wpickPairs(SH[kind](S.setting));
        function trophy() {
            if (!rng.chance(SH.trophy)) return null;
            const c = SH.trophies.filter(([min]) => min === 6 ? S.setting === 6 : S.setting >= min).map(x => x[1]);
            return c.length ? 'こおりトロフィー: ' + rng.pick(c) : null;
        }
        // ボーナス中の 告知演出 (演出カスタム: こおりBB・しろくまBB・ジョーカーBB。抽選内容は 同じ)
        function bonusFx(g, b) {
            const bb = S.custom.bb, rare = g.rare, st = b.stWin, weak = g.flag === 'CHE' || g.flag === 'SUI' || g.flag === 'CBELL';
            const C = SBJ.CAST;
            let t = null;
            if (bb === 'koori') {
                if (rare) t = 'トランプ投げ: ' + (st && rng.chance(0.35) ? '「！！！」(ST 濃厚)' : (st ? rng.chance(0.6) : rng.chance(0.2)) ? '「！」' + (weak ? ' (弱レア役で 激アツ)' : '') : 'チップ (小役ナビ)');
                if (b.g % 20 === 0) t = '20G ルーレット: ' + (st && rng.chance(0.3) ? 'STOCKTIME (ST 濃厚)' : (st ? rng.chance(0.5) : rng.chance(0.15)) ? 'CHANCE' : 'はずれ');
            } else if (bb === 'shirokuma') {
                if (rare) {
                    const n = st && rng.chance(0.3) ? 7 : [2, 4, 6][rng.weighted(st ? [40, 35, 25] : [10, 30, 60])];
                    t = '葉巻 ' + n + ' 本' + (n === 7 ? ' (ST 濃厚)' : n === 2 ? ' (大チャンス)' : n === 4 ? ' (チャンス)' : '');
                } else if (rng.chance(1 / 15)) {
                    const c = [[C.ilel, 1], [C.tiffany, 1], [C.rosa, 1], [C.main, st ? 2 : 1], [C.mint, st ? 2 : 0.4]];
                    if (st) c.push([C.rina + ' (ST 濃厚)', 0.8]);
                    t = 'キャラ割り込み: ' + wpickPairs(c);
                } else if (rng.chance(1 / 25)) t = 'ミートの 骨: 「' + (st && rng.chance(0.3) ? 'JUST MEAT' : (st ? rng.chance(0.5) : rng.chance(0.15)) ? 'CHANCE' : 'HAMAKI') + '」';
            } else {
                if (g.flag === 'SUI' || g.flag === 'CHANCE') t = C.joker + 'の セリフ: ' + (st && rng.chance(0.3) ? '金文字 (ST 濃厚)' : g.flag === 'CHANCE' ? '赤文字' : '青文字');
                else if (rare) t = '赤月予告: ' + ((st ? rng.chance(0.6) : rng.chance(0.15)) ? '赤文字 (ST 期待大)' : '白文字');
            }
            return t;
        }
        // ST の ストック数示唆: 実際の 個数を 超える アクションは 出さない
        function pose() {
            if (S.stocks < 1 || !rng.chance(P.stPose)) return null;
            return SBJ.CAST.main + 'の ' + SBJ.POSE[rng.int(1, Math.min(S.stocks, 3))];
        }
        function led(flag) {
            const l = SBJ.LED[flag] || ['白', '点灯'];
            return (Array.isArray(l[0]) ? rng.pick(l) : l).join('');
        }
        return { pickFX, makeHints, makeDice, oddity, settingChar, trophy, bonusFx, pose, led };
    }
    SBJ.createHints = createHints;
})(globalThis.SBJ || (globalThis.SBJ = {}));
