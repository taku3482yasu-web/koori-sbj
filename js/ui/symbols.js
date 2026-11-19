// リール図柄 (設計書 11 章「図柄デザイン」)。本家の 形と 色だけ 寄せた オリジナル。SVG (viewBox 0 0 90 56)
// assets/symbols/<R7|B7|BAR|BEL|REP|CHE|SUI>.png を 置けば その 画像に 差し替わる
const Symbols = (() => {
    const SV = body => `<svg class="sym" viewBox="0 0 90 56" width="86" height="54">${body}</svg>`;
    const SEVEN = (fill, hi, mark) => `<g transform="skewX(-12) translate(8 0)"><path d="M16 5H76V15L45 52H27L57 17H16Z" fill="${fill}" stroke="#111" stroke-width="4" stroke-linejoin="round"/><path d="M20 9H70" stroke="${hi}" stroke-width="2.5" stroke-linecap="round"/></g>${mark}`;
    const FLAKE = (x, y, c) => `<g stroke="${c}" stroke-width="2" stroke-linecap="round"><line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}"/><line x1="${x - 6}" y1="${y - 3.5}" x2="${x + 6}" y2="${y + 3.5}"/><line x1="${x - 6}" y1="${y + 3.5}" x2="${x + 6}" y2="${y - 3.5}"/></g>`;
    const SVG = {
        // 赤7: 斜体の 赤い 7・黒い 太縁・上辺に ハイライト・右下に 水色の 雪の 結晶
        R7: SV(SEVEN('#e3171e', '#ff9a9a', FLAKE(70, 40, '#2a9fd8'))),
        // 青7: 斜体の 青い 7・右下に「KOORI」
        B7: SV(SEVEN('#1d5fd6', '#9cc4ff', `<text x="66" y="47" font-size="10" font-weight="900" font-style="italic" fill="#0b2a66" stroke="#fff" stroke-width="2.5" paint-order="stroke" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">KOORI</text>`)),
        // BAR: 黒プレートに 白い 二重枠・「BAR」と 小さく「KOORI」・右に 雪の 結晶
        BAR: SV(`<rect x="5" y="9" width="80" height="38" rx="5" fill="#111" stroke="#9a9a9a" stroke-width="2.5"/><rect x="8.5" y="12.5" width="73" height="31" rx="3" fill="none" stroke="#fff" stroke-width="1.2"/><text x="36" y="34" font-size="21" font-weight="900" fill="#fff" text-anchor="middle" font-family="Georgia,Times,serif">BAR</text><text x="36" y="41.5" font-size="6.5" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1">KOORI</text>${FLAKE(70, 28, '#bfe9ff')}`),
        // ベル: 金色の ベル 2 つ 重ね
        BEL: SV(`<g stroke="#6b4a00" stroke-width="2" stroke-linejoin="round"><path d="M32 10C21 10 19 24 17 33L12 41H52L47 33C45 24 43 10 32 10Z" fill="#e8b21f"/><path d="M56 8C44 8 42 23 40 33L35 42H77L72 33C70 23 68 8 56 8Z" fill="#f7cf3a"/></g><path d="M24 18C26 14 29 13 32 13" stroke="#fff6c4" stroke-width="2" fill="none"/><path d="M48 16C50 12 53 11 56 11" stroke="#fff6c4" stroke-width="2" fill="none"/><circle cx="32" cy="44" r="3.5" fill="#c08a00" stroke="#6b4a00"/><circle cx="56" cy="45" r="3.5" fill="#c08a00" stroke="#6b4a00"/>`),
        // リプレイ: 青い 楕円の エンブレムに「BJ」
        REP: SV(`<ellipse cx="45" cy="28" rx="36" ry="23" fill="#1f5fc4" stroke="#0b2a66" stroke-width="2"/><ellipse cx="45" cy="28" rx="29" ry="17" fill="#fff"/><ellipse cx="45" cy="28" rx="26" ry="14.5" fill="none" stroke="#1f5fc4" stroke-width="1.5"/><text x="45" y="33" font-size="16" font-weight="900" font-style="italic" fill="#1f5fc4" text-anchor="middle" font-family="Georgia,Times,serif">BJ</text>`),
        // チェリー: 赤い 実 2 つと 葉
        CHE: SV(`<path d="M30 40C34 26 42 16 52 10M60 40C58 28 56 18 52 10" stroke="#3d6b1f" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M52 10C60 4 70 6 74 12C66 16 58 15 52 10Z" fill="#3fa12b" stroke="#235c16" stroke-width="1.5"/><circle cx="29" cy="41" r="11" fill="#d8121c" stroke="#6e0006" stroke-width="2"/><circle cx="61" cy="41" r="11" fill="#e3202a" stroke="#6e0006" stroke-width="2"/><circle cx="25" cy="37" r="3" fill="#ffb3b3"/><circle cx="57" cy="37" r="3" fill="#ffb3b3"/>`),
        // スイカ: 半月切り (緑の 皮・赤い 実・種)
        SUI: SV(`<path d="M7 38A38 30 0 0 1 83 38Z" fill="#1f7a30" stroke="#0d3d16" stroke-width="2"/><path d="M14 36A31 23 0 0 1 76 36Z" fill="#f4f4e8"/><path d="M17 36A28 20 0 0 1 73 36Z" fill="#e8303a"/><g fill="#111"><ellipse cx="33" cy="28" rx="1.6" ry="2.6"/><ellipse cx="45" cy="24" rx="1.6" ry="2.6"/><ellipse cx="57" cy="28" rx="1.6" ry="2.6"/><ellipse cx="39" cy="32" rx="1.6" ry="2.6"/><ellipse cx="51" cy="32" rx="1.6" ry="2.6"/></g><path d="M7 38H83" stroke="#0d3d16" stroke-width="2"/><path d="M20 22L24 18M36 13L38 10M54 13L52 10M70 22L66 18" stroke="#58b864" stroke-width="2" stroke-linecap="round"/>`),
    };
    // 差し替え画像 (assets/assets.js の symbols に 書いた もの)
    const img = {};
    for (const k of (typeof ASSETS !== 'undefined' && ASSETS.symbols) || []) img[k] = `<img class="sym" src="assets/symbols/${k}.png" width="86" height="54" alt="">`;
    return { html: k => img[k] || SVG[k] };
})();
