// 液晶の 舞台 (背景の 3 枚 重ね・こおりくんの 動き・舞う もの・当たりの 演出)
// こおりくんが カジノの 中を 旅する: カジノ → チャイナ → ジャパン (高確) → ハワイ (前兆)。
// 背景は 奥・中・手前の 3 枚。歩くと 手前ほど 速く 流れて 奥行きが 出る。
// ここは 見せる だけ (抽選・結果は 変えない)。
const Scene = (() => {
    const $ = id => document.getElementById(id);
    const W = 450, H = 250;   // 背景 1 枚の 大きさ (横に くり返す)
    const svg = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' width='${W}' height='${H}'>${body}</svg>`)}")`;
    const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

    // ===================== 背景の 絵 (奥 far・中 mid・手前 near) =====================
    const chandelier = x => `<g transform='translate(${x} 0)'><circle cx='0' cy='52' r='46' fill='url(#glow)'/><line x1='0' y1='0' x2='0' y2='30' stroke='#c9a24a' stroke-width='2'/><path d='M-26 38 Q0 58 26 38 L20 44 Q0 60 -20 44Z' fill='#e8c060'/>${rep(7, i => `<circle cx='${-24 + i * 8}' cy='${44 + (i % 2) * 6}' r='2.6' fill='#fff6c8'/>`)}<circle cx='0' cy='32' r='5' fill='#ffe9a0'/></g>`;
    const slot = (x, body, screen) => `<g transform='translate(${x} 118)'><rect x='0' y='0' width='44' height='92' rx='6' fill='${body}' stroke='#0006' stroke-width='2'/><rect x='4' y='4' width='36' height='8' rx='3' fill='#ffd54a'/><rect x='6' y='18' width='32' height='26' rx='3' fill='${screen}'/>${rep(3, i => `<rect x='${9 + i * 10}' y='22' width='7' height='18' rx='1.5' fill='#fff' opacity='.85'/>`)}<rect x='6' y='52' width='32' height='5' rx='2' fill='#0005'/><rect x='14' y='64' width='16' height='24' rx='2' fill='#0003'/></g>`;
    const ART = {
        casino: {
            far: `<defs><linearGradient id='wall' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3b0e16'/><stop offset='1' stop-color='#13050a'/></linearGradient><radialGradient id='glow'><stop offset='0' stop-color='#ffe9a0' stop-opacity='.55'/><stop offset='1' stop-color='#ffe9a0' stop-opacity='0'/></radialGradient></defs>
                <rect width='450' height='250' fill='url(#wall)'/>
                ${rep(4, i => `<path d='M${20 + i * 112} 150 V70 Q${76 + i * 112} 20 ${132 + i * 112} 70 V150Z' fill='#4d1520' stroke='#8a5a2a' stroke-width='2'/>`)}
                ${rep(4, i => `<rect x='${10 + i * 112}' y='30' width='14' height='150' fill='#7a5320'/><rect x='${12 + i * 112}' y='30' width='4' height='150' fill='#c9a24a'/>`)}
                ${chandelier(76)}${chandelier(300)}
                ${rep(30, i => `<circle cx='${8 + i * 15}' cy='${150 + (i % 3) * 3}' r='1.6' fill='${['#ffd54a', '#7fd8ff', '#ff6a80'][i % 3]}' opacity='.8'/>`)}`,
            mid: `${slot(14, '#24306e', '#7fd8ff')}${slot(64, '#6e1a2a', '#ffd54a')}${slot(114, '#24306e', '#ff9ec0')}
                <g transform='translate(230 160)'><ellipse cx='0' cy='30' rx='62' ry='18' fill='#0006'/><rect x='-6' y='22' width='12' height='26' fill='#3a2410'/><ellipse cx='0' cy='22' rx='64' ry='20' fill='#c9a24a'/><ellipse cx='0' cy='20' rx='58' ry='16' fill='#1f7a4a'/><rect x='-22' y='12' width='9' height='12' rx='1.5' fill='#fff'/><rect x='-10' y='12' width='9' height='12' rx='1.5' fill='#fff'/>${rep(4, i => `<ellipse cx='${18 + i * 4}' cy='${22 - i * 2}' rx='6' ry='2.4' fill='${['#e0303a', '#2a6ad0', '#111', '#ffd54a'][i]}' stroke='#fff' stroke-width='.8'/>`)}</g>
                ${slot(318, '#6e1a2a', '#7fd8ff')}${slot(368, '#24306e', '#ffd54a')}`,
            near: `<rect y='206' width='450' height='44' fill='#7a1020'/>${rep(10, i => `<path d='M${i * 45} 228 l22 -12 l22 12 l-22 12z' fill='none' stroke='#d9a83a' stroke-width='1.6' opacity='.8'/>`)}<rect y='206' width='450' height='3' fill='#d9a83a'/><rect y='244' width='450' height='6' fill='#3a0610'/>`,
        },
        china: {
            far: `<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1a0630'/><stop offset='1' stop-color='#5a0d1c'/></linearGradient></defs>
                <rect width='450' height='250' fill='url(#sky)'/><circle cx='370' cy='50' r='26' fill='#ffe2b0' opacity='.85'/>
                ${rep(3, i => `<g transform='translate(${30 + i * 150} 0)'><path d='M0 150 V95 H90 V150Z' fill='#200610'/><path d='M-14 98 Q45 70 104 98 L90 86 Q45 62 0 86Z' fill='#120308'/><path d='M8 86 V60 H82 V86' fill='#200610'/><path d='M-4 62 Q45 38 94 62 L82 52 Q45 32 8 52Z' fill='#120308'/>${rep(3, k => `<rect x='${18 + k * 22}' y='108' width='10' height='14' fill='#ff8a3a' opacity='.7'/>`)}</g>`)}
                <path d='M0 40 Q112 75 225 40 Q338 75 450 40' fill='none' stroke='#2a0a10' stroke-width='1.5'/>
                ${rep(8, i => `<g transform='translate(${28 + i * 56} ${46 + Math.round(Math.sin(i * 1.4) * 8 + 6)})'><circle r='9' fill='#ff3a2a' opacity='.25'/><ellipse rx='7' ry='8.5' fill='#e0242a'/><rect x='-4' y='-10' width='8' height='3' fill='#ffd54a'/><rect x='-4' y='7.5' width='8' height='3' fill='#ffd54a'/></g>`)}`,
            mid: `<g transform='translate(70 96)'><rect x='0' y='0' width='120' height='112' fill='#8a1a1a'/><rect x='0' y='0' width='120' height='10' fill='#2a0608'/><circle cx='60' cy='64' r='38' fill='#2a0a14'/><circle cx='60' cy='64' r='38' fill='none' stroke='#ffd54a' stroke-width='3'/></g>
                <g transform='translate(280 118)'><rect x='0' y='30' width='110' height='62' fill='#5a2a14'/><path d='M-8 32 L118 32 L106 6 L4 6Z' fill='#e0242a'/>${rep(6, i => `<path d='M${4 + i * 17} 6 L${12 + i * 17} 6 L${8 + i * 21} 32 L${i * 21} 32Z' fill='#fff' opacity='.8'/>`)}<rect x='10' y='40' width='90' height='16' fill='#c88a3a'/>${rep(3, i => `<ellipse cx='${28 + i * 28}' cy='40' rx='10' ry='5' fill='#eee'/>`)}<path d='M28 34 q-6 -10 0 -18 q6 -8 0 -16' stroke='#fff' stroke-width='3' fill='none' opacity='.45'/><path d='M60 34 q-6 -10 0 -18 q6 -8 0 -16' stroke='#fff' stroke-width='3' fill='none' opacity='.35'/></g>`,
            near: `<rect y='206' width='450' height='44' fill='#4a4450'/>${rep(10, i => `<rect x='${i * 45 + (i % 2) * 6}' y='208' width='40' height='16' fill='#5a5464' stroke='#2a2430'/><rect x='${i * 45 + 20}' y='226' width='40' height='16' fill='#56505f' stroke='#2a2430'/>`)}`,
        },
        japan: {
            far: `<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#070b26'/><stop offset='1' stop-color='#3a2056'/></linearGradient><radialGradient id='mg'><stop offset='0' stop-color='#fff8d8' stop-opacity='.5'/><stop offset='1' stop-color='#fff8d8' stop-opacity='0'/></radialGradient></defs>
                <rect width='450' height='250' fill='url(#sky)'/>${rep(24, i => `<circle cx='${(i * 73) % 450}' cy='${(i * 37) % 110}' r='${i % 4 ? 0.8 : 1.4}' fill='#fff' opacity='.8'/>`)}
                <circle cx='330' cy='62' r='60' fill='url(#mg)'/><circle cx='330' cy='62' r='30' fill='#fff4c8'/>
                <path d='M0 160 L70 110 L130 150 L210 100 L300 150 L380 115 L450 160 V250 H0Z' fill='#1a1236'/>
                <g transform='translate(90 70)' fill='#0e0a22'><rect x='14' y='20' width='22' height='90'/>${rep(4, i => `<path d='M${-6 + i * 3} ${30 + i * 20} L${56 - i * 3} ${30 + i * 20} L${44 - i * 3} ${22 + i * 20} L${6 + i * 3} ${22 + i * 20}Z'/>`)}<rect x='23' y='0' width='4' height='22'/></g>`,
            mid: `${[[50, 1], [250, 1.15]].map(([x, s]) => `<g transform='translate(${x} 60) scale(${s})'><path d='M40 150 Q36 100 44 70 Q52 100 50 150Z' fill='#2a1622'/><path d='M44 80 Q20 70 10 54 M46 76 Q70 66 80 50' stroke='#2a1622' stroke-width='5' fill='none'/>${rep(14, i => `<circle cx='${10 + (i * 37) % 76}' cy='${18 + (i * 23) % 52}' r='${11 + (i % 3) * 3}' fill='${['#ffb3cf', '#ff9ec0', '#ffd1e2'][i % 3]}' opacity='.9'/>`)}</g>`).join('')}
                ${[175, 400].map(x => `<g transform='translate(${x} 150)'><rect x='-4' y='30' width='8' height='26' fill='#6a6a78'/><rect x='-14' y='14' width='28' height='18' fill='#7a7a88'/><rect x='-7' y='18' width='14' height='10' fill='#ffd28a'/><path d='M-20 14 L0 0 L20 14Z' fill='#5a5a68'/></g>`).join('')}
                <ellipse cx='300' cy='206' rx='70' ry='9' fill='#2a3a7a' opacity='.6'/>`,
            near: `<rect y='206' width='450' height='44' fill='#6a3f22'/>${rep(9, i => `<rect x='${i * 50}' y='206' width='2' height='44' fill='#3a2010'/>`)}<rect y='206' width='450' height='4' fill='#8a5a32'/><rect y='240' width='450' height='10' fill='#3a2010'/>`,
        },
        hawaii: {
            far: `<defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3a2a7a'/><stop offset='.45' stop-color='#ff6a5a'/><stop offset='.62' stop-color='#ffc070'/></linearGradient><linearGradient id='sea' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ff9a6a'/><stop offset='1' stop-color='#2a3a8a'/></linearGradient></defs>
                <rect width='450' height='160' fill='url(#sky)'/><circle cx='225' cy='156' r='40' fill='#ffe08a'/>
                <rect y='150' width='450' height='100' fill='url(#sea)'/>${rep(9, i => `<rect x='${190 + (i % 3) * 14 - i * 2}' y='${158 + i * 5}' width='${70 - i * 6}' height='2' fill='#fff2b0' opacity='${0.8 - i * 0.07}'/>`)}
                ${rep(6, i => `<path d='M${i * 80} ${180 + (i % 2) * 8} q20 -5 40 0' stroke='#fff' stroke-width='1.5' fill='none' opacity='.45'/>`)}`,
            mid: `${[[40, 1], [360, 0.85]].map(([x, s]) => `<g transform='translate(${x} 40) scale(${s})'><path d='M30 170 Q22 110 40 40 Q34 110 42 170Z' fill='#2a1020'/>${rep(6, i => `<path d='M40 40 Q${40 + Math.cos(i * 1.05) * 50} ${30 + Math.sin(i * 1.05) * 20 - 10} ${40 + Math.cos(i * 1.05) * 70} ${46 + Math.sin(i * 1.05) * 26}' stroke='#2a1020' stroke-width='7' fill='none' stroke-linecap='round'/>`)}</g>`).join('')}
                <g transform='translate(250 150)'><rect x='-3' y='0' width='6' height='58' fill='#5a3a20'/><path d='M-8 0 h16 l-3 -10 h-10z' fill='#7a5a30'/><path d='M0 -12 q-8 -10 0 -22 q8 12 0 22' fill='#ffb020'/></g>`,
            near: `<path d='M0 214 Q112 204 225 212 T450 210 V250 H0Z' fill='#e8c088'/>${rep(12, i => `<circle cx='${15 + i * 37}' cy='${226 + (i % 3) * 7}' r='1.6' fill='#b88a50'/>`)}<path d='M120 232 q6 -8 12 0z' fill='#ffd0d8'/>`,
        },
        bonus: {
            far: `<defs><radialGradient id='st' cx='50%' cy='40%' r='70%'><stop offset='0' stop-color='#3a2a08'/><stop offset='1' stop-color='#0a0602'/></radialGradient></defs><rect width='450' height='250' fill='url(#st)'/>
                ${rep(12, i => `<circle cx='${20 + i * 37}' cy='16' r='4' fill='#ffe08a'/>`)}
                <path d='M0 0 H70 Q60 120 80 250 H0Z' fill='#9a1a24'/><path d='M450 0 H380 Q390 120 370 250 H450Z' fill='#9a1a24'/>${rep(5, i => `<path d='M${8 + i * 13} 0 Q${4 + i * 13} 120 ${12 + i * 13} 250' stroke='#5a0a12' stroke-width='3' fill='none'/><path d='M${442 - i * 13} 0 Q${446 - i * 13} 120 ${438 - i * 13} 250' stroke='#5a0a12' stroke-width='3' fill='none'/>`)}`,
            mid: '',
            near: `<rect y='206' width='450' height='44' fill='#5a3412'/>${rep(15, i => `<rect x='${i * 30}' y='206' width='1.5' height='44' fill='#3a2008'/>`)}<rect y='206' width='450' height='4' fill='#ffd54a'/>`,
        },
        rc: {
            far: `<defs><linearGradient id='ic' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#0a2a5a'/><stop offset='1' stop-color='#3a8ad0'/></linearGradient></defs><rect width='450' height='250' fill='url(#ic)'/>
                ${rep(4, i => `<path d='M${30 + i * 112} 206 V60 Q${86 + i * 112} 10 ${142 + i * 112} 60 V206' fill='none' stroke='#bff0ff' stroke-width='3' opacity='.5'/>`)}
                ${rep(5, i => `<rect x='${18 + i * 104}' y='40' width='22' height='170' fill='#bff0ff' opacity='.35'/><rect x='${22 + i * 104}' y='40' width='5' height='170' fill='#fff' opacity='.5'/>`)}
                <g transform='translate(225 70)' stroke='#fff' stroke-width='3' opacity='.4'>${rep(3, i => `<line x1='0' y1='-24' x2='0' y2='24' transform='rotate(${i * 60})'/>`)}</g>`,
            mid: `${rep(15, i => `<path d='M${i * 30} 0 l6 0 l-3 ${14 + (i % 4) * 8}z' fill='#dff8ff' opacity='.8'/>`)}`,
            near: `<rect y='206' width='450' height='44' fill='#9ad8f5'/><rect y='206' width='450' height='44' fill='url(#ic)' opacity='.35'/>${rep(6, i => `<path d='M${i * 80} 212 l30 30' stroke='#fff' stroke-width='2' opacity='.5'/>`)}`,
        },
        st: {
            far: `<defs><linearGradient id='ns' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#050a1e'/><stop offset='1' stop-color='#1a2a5a'/></linearGradient></defs><rect width='450' height='250' fill='url(#ns)'/>
                ${rep(14, i => { const h = 50 + (i * 47) % 90, x = i * 33; return `<rect x='${x}' y='${200 - h}' width='30' height='${h}' fill='#0c1430'/>${rep(Math.floor(h / 16), k => `<rect x='${x + 6 + (k % 2) * 12}' y='${206 - h + k * 14}' width='6' height='6' fill='${(i + k) % 3 ? '#ffd54a' : '#7fd8ff'}' opacity='.75'/>`)}`; })}`,
            mid: `<g transform='translate(300 110)'><rect x='0' y='30' width='60' height='70' fill='#1a2440'/><ellipse cx='30' cy='30' rx='30' ry='8' fill='#24305a'/><rect x='8' y='100' width='6' height='20' fill='#1a2440'/><rect x='46' y='100' width='6' height='20' fill='#1a2440'/></g>
                <g transform='translate(150 168)'><rect x='0' y='0' width='74' height='20' rx='3' fill='#120a20' stroke='#ff4fb0' stroke-width='2'/><text x='37' y='15' text-anchor='middle' font-family='Arial Black,Arial' font-size='11' font-weight='900' fill='#ff9ee0'>CASINO</text></g>
                <rect y='196' width='450' height='3' fill='#556'/>${rep(23, i => `<rect x='${i * 20}' y='180' width='3' height='18' fill='#556'/>`)}`,
            near: `<rect y='206' width='450' height='44' fill='#2a3048'/>${rep(6, i => `<rect x='${i * 80}' y='206' width='2' height='44' fill='#1a2034'/>`)}<rect y='206' width='450' height='6' fill='#e8f4ff' opacity='.85'/>`,
        },
        sst: {
            far: `<rect width='450' height='250' fill='#040818'/>${rep(40, i => `<circle cx='${(i * 113) % 450}' cy='${(i * 59) % 190}' r='${i % 5 ? 0.9 : 1.6}' fill='#fff'/>`)}`,
            mid: `<path d='M0 200 L60 130 L100 170 L170 100 L240 170 L300 120 L370 175 L450 130 V250 H0Z' fill='#1a2a4a'/><path d='M170 100 L150 124 L162 120 L170 130 L180 118 L192 122Z' fill='#fff'/><path d='M300 120 L284 140 L300 134 L314 142Z' fill='#fff'/>`,
            near: `<path d='M0 216 Q225 196 450 216 V250 H0Z' fill='#dff0ff'/>`,
        },
        ending: {
            far: `<defs><linearGradient id='dw' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#7ac8ff'/><stop offset='1' stop-color='#ffe0f0'/></linearGradient></defs><rect width='450' height='250' fill='url(#dw)'/>${rep(4, i => `<ellipse cx='${60 + i * 110}' cy='${40 + (i % 2) * 20}' rx='34' ry='10' fill='#fff' opacity='.85'/>`)}`,
            mid: `<path d='M0 190 Q110 140 220 180 T450 170 V250 H0Z' fill='#7acb6a'/><path d='M0 200 Q160 170 300 196 T450 190 V250 H0Z' fill='#5ab04a'/>`,
            near: `<rect y='212' width='450' height='38' fill='#c8a46a'/><rect y='212' width='450' height='3' fill='#a8844a'/>`,
        },
    };
    const urlCache = {};
    const layerUrl = (stage, k) => (urlCache[stage + k] ??= ART[stage][k] ? svg(ART[stage][k]) : 'none');

    // ===================== 舞う もの (CSS で 動かす 小さな 部品) =====================
    const PARTICLES = {
        casino: () => rep(10, i => `<i class="p-glint" style="left:${(i * 37) % 100}%;top:${10 + (i * 23) % 50}%;animation-delay:${(i * 0.37) % 3}s"></i>`),
        china: () => rep(5, i => `<i class="p-steam" style="left:${66 + i * 3}%;animation-delay:${i * 0.6}s"></i>`),
        japan: () => rep(12, i => `<i class="p-petal" style="left:${(i * 29) % 100}%;animation-delay:${(i * 0.53) % 6}s;animation-duration:${5 + (i % 4)}s"></i>`),
        hawaii: () => '<i class="p-heat"></i>' + rep(6, i => `<i class="p-glint sun" style="left:${42 + i * 3}%;top:${58 + (i % 2) * 6}%;animation-delay:${i * 0.4}s"></i>`),
        bonus: () => '<i class="p-spot l"></i><i class="p-spot r"></i>' + rep(10, i => `<i class="p-coin" style="left:${(i * 31) % 100}%;animation-delay:${(i * 0.41) % 3}s"></i>`),
        rc: () => rep(14, i => `<i class="p-snow" style="left:${(i * 23) % 100}%;animation-delay:${(i * 0.47) % 5}s"></i>`),
        st: () => rep(18, i => `<i class="p-snow" style="left:${(i * 19) % 100}%;animation-delay:${(i * 0.33) % 6}s;animation-duration:${4 + (i % 3)}s"></i>`),
        sst: () => '<i class="p-aurora a"></i><i class="p-aurora b"></i>' + rep(8, i => `<i class="p-glint" style="left:${(i * 41) % 100}%;top:${(i * 17) % 60}%;animation-delay:${(i * 0.6) % 3}s"></i>`),
        ending: () => rep(12, i => `<i class="p-confetti" style="left:${(i * 29) % 100}%;animation-delay:${(i * 0.37) % 4}s;--c:${['#ff6a80', '#ffd54a', '#7fd8ff', '#7acb6a'][i % 4]}"></i>`),
    };

    // ===================== 状態 =====================
    let stage = null, offset = 0, walking = null, actorMode = 'idle', bonusTint = '';
    const FACTOR = { far: 0.12, mid: 0.45, near: 1 };
    function applyOffset() {
        for (const k of ['far', 'mid', 'near']) { const el = $('lay-' + k); if (el) el.style.backgroundPositionX = `${-offset * FACTOR[k]}px`; }
    }
    function setStage(next) {
        if (!ART[next]) next = 'casino';
        if (next === stage) return;
        stage = next;
        const root = $('scene');
        root.className = 'st-' + next + (bonusTint ? ' ' + bonusTint : '');
        for (const k of ['far', 'mid', 'near']) $('lay-' + k).style.backgroundImage = layerUrl(next, k);
        $('particles').innerHTML = PARTICLES[next] ? PARTICLES[next]() : '';
        offset = 0; applyOffset();
    }
    // こおりくん (actor)。mode: idle 待機・walk 歩く・sit 座る・sweat 汗だく・hop 跳ねる・fly 飛ぶ・march 行進・hide 出さない
    function actor(mode) {
        const a = $('actor');
        if (!a.firstChild) a.innerHTML = `<div class="body">${typeof Art !== 'undefined' ? Art.img('koori', 56, 'こおりくん') : ''}</div><b class="mark">！</b><i class="drop d1"></i><i class="drop d2"></i>`;
        if (mode === actorMode && a.dataset.mode === mode) return;
        actorMode = mode; a.dataset.mode = mode;
        a.className = 'a-' + mode;
    }
    function walk(ms, speed) {
        cancelAnimationFrame(walking);
        const t0 = performance.now(), from = offset, dist = (speed || 70) * ms / 1000;
        const step = now => {
            const k = Math.min(1, (now - t0) / ms);
            offset = from + dist * (1 - (1 - k) * (1 - k));   // だんだん ゆっくり 止まる
            applyOffset();
            if (k < 1) walking = requestAnimationFrame(step); else walking = null;
        };
        walking = requestAnimationFrame(step);
    }

    // ===================== 画面と つなぐ =====================
    // render の たびに 呼ぶ: 舞台と こおりくんの 姿勢を 決める
    function sync(E, G, cls, when) {
        const S = E.S;
        if (S.mode === 'bonus' && S.bonus) bonusTint = ['', 'tint-red', 'tint-blue', 'tint-rainbow', 'tint-gold', '', 'tint-gold'][S.bonus.type] || '';
        else bonusTint = '';
        const changed = cls !== stage;
        setStage(cls);
        $('scene').className = 'st-' + stage + (bonusTint ? ' ' + bonusTint : '');
        if (changed && stage === 'ending') parade();
        const battleOn = (G && G.battle && (when === 'lever' || S.omen)) || false;
        let mode;
        if (battleOn || S.mode === 'rcPromo' || S.mode === 'rcJudge') mode = 'hide';
        else if (G && when === 'lever' && (G.aim != null || G.award != null)) mode = 'hide';
        else if (cls === 'japan') mode = 'sit';
        else if (cls === 'hawaii') mode = 'sweat';
        else if (cls === 'sst') mode = 'fly';
        else if (cls === 'ending') mode = 'march';
        else if (cls === 'bonus') mode = 'hop';
        else mode = 'idle';
        if (actorMode === 'walk' && mode === 'idle' && walking) return;
        actor(mode);
    }
    // レバーオン: 通常時は 数歩 あるく (ジャパンは 座った まま・ハワイは のろのろ)
    function onLever(E, G) {
        const S = E.S;
        if (G.battle || G.aim != null || G.award != null) return;
        if (S.mode !== 'normal' && S.mode !== 'rchigh' && S.mode !== 'st' && S.mode !== 'ending') return;
        if (stage === 'japan') return;
        const slow = stage === 'hawaii';
        if (stage !== 'sst' && stage !== 'ending') actor(slow ? 'sweat' : 'walk');
        walk(1100, slow ? 30 : stage === 'st' ? 40 : 75);
    }
    // 第3停止: 立ち止まる。レア役なら ふりかえって「！」
    function onStop3(E, G, rare) {
        const S = E.S;
        if (actorMode === 'walk') actor('idle');
        if (rare && (S.mode === 'normal' || S.mode === 'rchigh' || S.mode === 'st') && actorMode !== 'hide') {
            const a = $('actor'); a.classList.remove('alert'); void a.offsetWidth; a.classList.add('alert');
        }
    }
    // 払い出しの たびに ぴょん (ボーナス中)
    function onPay(E) { if (E.S.mode === 'bonus' && actorMode === 'hop') { const a = $('actor'); a.classList.remove('jump'); void a.offsetWidth; a.classList.add('jump'); } }
    // エンディング: シリーズの みんなで 行進
    function parade() {
        const ids = ['onioni', 'okagappa', 'tiffany', 'rosa', 'howard', 'mint', 'rina', 'ilel'];
        const p = $('particles');
        ids.forEach((id, i) => { const d = document.createElement('div'); d.className = 'p-parade'; d.style.animationDelay = (i * 0.9) + 's'; d.innerHTML = Art.img(id, 36, ''); p.appendChild(d); });
    }

    // ===================== 当たりの 瞬間 (凍る → 割れる → 金の 光と コイン) =====================
    // assets/movie/bonus.mp4 を 置いて assets/assets.js の movie に 'bonus' と 書けば、その 動画を 流す
    function win(kind) {
        const own = typeof ASSETS !== 'undefined' && (ASSETS.movie || []).includes(kind);
        const box = $('winfx');
        if (own) {
            box.innerHTML = `<video src="assets/movie/${kind}.mp4" autoplay playsinline></video>`;
            box.className = 'show movie';
            const v = box.querySelector('video');
            return new Promise(res => { const end = () => { box.className = ''; box.innerHTML = ''; res(); }; v.onended = end; v.onerror = end; setTimeout(end, 12000); });
        }
        const cracks = rep(9, i => `<i class="crack" style="--a:${i * 40 + (i % 2) * 13}deg;--l:${55 + (i * 17) % 40}%"></i>`);
        const shards = rep(16, i => `<i class="shard" style="--x:${(i % 4) * 25 + 12}%;--y:${Math.floor(i / 4) * 25 + 12}%;--dx:${((i % 4) - 1.5) * 90}px;--dy:${(Math.floor(i / 4) - 1.5) * 70}px;--r:${(i * 47) % 180 - 90}deg"></i>`);
        const coins = rep(14, i => `<i class="wcoin" style="left:${(i * 37) % 100}%;animation-delay:${0.9 + (i * 0.07)}s"></i>`);
        box.innerHTML = `<div class="frost"></div>${cracks}${shards}<div class="burst"></div>${coins}`;
        box.className = ''; void box.offsetWidth; box.className = 'show ' + (kind || 'bonus');
        return new Promise(res => setTimeout(() => { box.className = ''; box.innerHTML = ''; res(); }, 2300));
    }

    function init() {
        const lcd = $('lcd');
        if (!$('scene')) {
            const s = document.createElement('div');
            s.id = 'scene';
            s.innerHTML = '<div class="lay" id="lay-far"></div><div class="lay" id="lay-mid"></div><div id="particles"></div><div class="lay" id="lay-near"></div><div id="actor"></div>';
            lcd.insertBefore(s, lcd.firstChild);
            const w = document.createElement('div'); w.id = 'winfx'; lcd.appendChild(w);
        }
        setStage('casino'); actor('idle');
    }
    return { init, sync, onLever, onStop3, onPay, parade, win, setStage, get stage() { return stage; } };
})();
