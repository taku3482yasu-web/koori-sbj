// 効果音 (Web Audio)。BGM は assets/bgm/<normal|bonus|rc|st|ending>.mp3 を 置いて assets/assets.js に 書けば 流れる
const Sound = (() => {
    let AC = null, muted = false, bgmEl = null, bgmName = null;
    try { muted = localStorage.getItem('koori-sbj-mute') === '1'; } catch (e) { /* なし */ }
    function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* なし */ } } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
    function beep(f, d, type, vol, when) {
        const a = ac(); if (!a || muted) return;
        const t = a.currentTime + (when || 0);
        const o = a.createOscillator(), g = a.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
    }
    const se = {
        lever: () => beep(180, 0.08, 'square', 0.06),
        stop: () => beep(90, 0.07, 'triangle', 0.12),
        pay: n => { for (let i = 0; i < Math.min(n, 15); i++) beep(1400, 0.03, 'square', 0.03, i * 0.04); },
        win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'square', 0.06, i * 0.1)),
        big: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => beep(f, 0.16, 'sawtooth', 0.05, i * 0.09)),
        kyuin: () => {
            const a = ac(); if (!a || muted) return;
            const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
            o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
            g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
            o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.6);
        },
        lose: () => [330, 262, 196].forEach((f, i) => beep(f, 0.2, 'triangle', 0.07, i * 0.15)),
        card: () => beep(2000, 0.02, 'square', 0.03),
        tick: () => beep(1200, 0.02, 'square', 0.02),
        saki: () => beep(1800, 0.25, 'sine', 0.08),      // 先バレ音
    };
    // BGM (ファイルが あれば)。name が かわった ときだけ 切りかえ
    function bgm(name) {
        if (name === bgmName) return;
        bgmName = name;
        if (bgmEl) { bgmEl.pause(); bgmEl = null; }
        if (!name || muted || typeof ASSETS === 'undefined' || !(ASSETS.bgm || []).includes(name)) return;
        const el = new Audio(`assets/bgm/${name}.mp3`);
        el.loop = true; el.volume = 0.5;
        el.addEventListener('error', () => { if (bgmEl === el) bgmEl = null; });
        el.play().catch(() => { /* まだ さわって いない / ファイルが ない */ });
        bgmEl = el;
    }
    function setMute(m) {
        muted = m;
        try { localStorage.setItem('koori-sbj-mute', m ? '1' : '0'); } catch (e) { /* なし */ }
        if (m && bgmEl) { bgmEl.pause(); } else if (!m) { const n = bgmName; bgmName = null; bgm(n); }
    }
    return { se, beep, unlock: ac, bgm, setMute, get muted() { return muted; } };
})();
