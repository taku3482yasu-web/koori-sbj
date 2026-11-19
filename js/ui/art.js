// キャラの 絵 (data URL)。絵は js/ui/art-legacy.js、js/ui/pixel-hd.js で 4 倍の 細かさに する
// assets/chara/<id>.png を 置いて assets/assets.js に 書けば その 絵に 差し替わる (なければ ドット絵、それも なければ 名前の 文字)
const Art = (() => {
    const cache = new Map();
    function sheet(id) {
        if (cache.has(id)) return cache.get(id);
        const a = typeof LEGACY_ART !== 'undefined' && LEGACY_ART[id];
        if (!a) return null;
        const c = document.createElement('canvas');
        c.width = a.w; c.height = a.h;
        const g = c.getContext('2d');
        a.rows.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const color = a.palette[row[x]];
                if (color) { g.fillStyle = color; g.fillRect(x, y, 1, 1); }
            }
        });
        const hd = typeof PixelHD !== 'undefined' ? PixelHD.bake(PixelHD.fromCanvas(c)).canvas : c;
        cache.set(id, hd);
        return hd;
    }
    const urls = new Map();
    function url(id) {
        if (urls.has(id)) return urls.get(id);
        const img = sheet(id);
        const u = img ? img.toDataURL() : '';
        urls.set(id, u);
        return u;
    }
    // <img> の HTML。assets/assets.js の chara に 書いて あれば assets/chara/<id>.png を 使う
    function img(id, size, alt) {
        const own = typeof ASSETS !== 'undefined' && (ASSETS.chara || []).includes(id);
        const u = own ? `assets/chara/${id}.png` : url(id);
        if (!u) return '';
        return `<img class="chara" src="${u}" width="${size}" height="${size}" alt="${alt || ''}">`;
    }
    return { img, has: id => !!(typeof LEGACY_ART !== 'undefined' && LEGACY_ART[id]) || (typeof ASSETS !== 'undefined' && (ASSETS.chara || []).includes(id)) };
})();
