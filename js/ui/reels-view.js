// リールの 描画と 回転。止める 位置は エンジン (decideStop) が きめ、ここは そこまで 回して 止めるだけ
const ReelsView = (() => {
    const { STRIPS } = SBJ;
    const SPEED = 18;   // コマ / 秒
    let turbo = 1;      // オート 高速の ときは 速く 回す
    const LEN = i => STRIPS[i].length;
    const mod = (i, n) => ((n % LEN(i)) + LEN(i)) % LEN(i);
    const cellPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 60;
    const R = [0, 1, 2].map(i => ({ el: document.getElementById('reel' + i), pos: Math.floor(Math.random() * 20), spinning: false, target: null, cells: [] }));
    R.forEach(r => { for (let k = 0; k < 4; k++) { const c = document.createElement('div'); c.className = 'cell'; r.el.appendChild(c); r.cells.push(c); } });
    let onStopped = () => {};

    function draw(i) {
        const r = R[i], p = Math.floor(r.pos), fr = r.pos - p, C = cellPx();
        const top = mod(i, -p);             // 上段の コマ番号 (リールは 下へ 回るので 番号が 減っていく)
        for (let k = 0; k < 4; k++) {
            const row = k - 1;
            const sym = STRIPS[i][mod(i, top + row)];
            const c = r.cells[k];
            if (c.dataset.sym !== sym) { c.dataset.sym = sym; c.innerHTML = Symbols.html(sym); }
            c.style.top = ((row + fr) * C) + 'px';
        }
    }
    let last = performance.now();
    function tick(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        R.forEach((r, i) => {
            if (!r.spinning) return;
            r.pos += SPEED * turbo * dt;
            if (r.target != null && r.pos >= r.target) {
                r.spinning = false; r.pos = r.target % LEN(i); r.target = null;
                draw(i); onStopped(i);
            } else draw(i);
        });
        requestAnimationFrame(tick);
    }
    R.forEach((r, i) => draw(i));
    requestAnimationFrame(tick);
    addEventListener('resize', () => R.forEach((r, i) => draw(i)));

    return {
        R,
        setTurbo(k) { turbo = k; },
        onStop(fn) { onStopped = fn; },
        startAll() { R.forEach(r => { r.spinning = true; r.target = null; r.el.classList.remove('off'); r.cells.forEach(c => c.classList.remove('win', 'goldbar')); }); },
        // すべり 0 で 止まる 上段の コマ番号
        top0(i) { return mod(i, -(Math.floor(R[i].pos) + 1)); },
        canStop(i) { return R[i].spinning && R[i].target == null; },
        stopAt(i, k) { R[i].target = Math.floor(R[i].pos) + 1 + k; },
        allStopped() { return R.every(r => !r.spinning); },
        stoppedCount() { return R.filter(r => !r.spinning).length; },
        mark(cells) { cells.forEach(([j, row]) => { const c = R[j].cells[row + 1]; if (c) c.classList.add('win'); }); },
        goldMiddle() { R.forEach(r => r.cells[2].classList.add('goldbar')); },   // 金BAR: 中段 BAR を 金色で
        off(i) { R[i].el.classList.add('off'); },
    };
})();
