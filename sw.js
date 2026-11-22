// サービスワーカー: ホーム画面に 追加したとき、ネットが なくても 遊べるように する
// - いつも ネット優先 (更新が すぐ 届く)。つながらない ときだけ 保存して おいた ものを 使う
// - 保存する ファイルは index.html が 読みこむ js / css と、背景の 絵・アイコン (一覧を 手で 書かない)
// このファイルの 処理を 変えたら CACHE の 番号を 上げる
const CACHE = 'koori-sbj-v1';
const EXTRA = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
    ...['casino', 'china', 'japan', 'hawaii', 'bonus', 'rc', 'st', 'sst', 'ending'].map(n => `assets/bg/${n}.svg`)];
const ASSET = /\b(?:src|href)="((?:js|css|assets)\/[^"]+)"/g;

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        const html = await (await fetch('index.html', { cache: 'no-cache' })).text();
        const files = new Set(EXTRA);
        for (const m of html.matchAll(ASSET)) files.add(m[1]);
        await Promise.all([...files].map(f => cache.add(new Request(f, { cache: 'no-cache' })).catch(() => {})));
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', e => {
    e.waitUntil((async () => {
        for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    e.respondWith((async () => {
        try {
            const res = await fetch(req);
            if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
            return res;
        } catch (err) {
            const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
            return hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
        }
    })());
});
