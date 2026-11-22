// 音 (Web Audio)。効果音・当たりの 告知音・BGM を ぜんぶ その場で 鳴らす (音の ファイル なしで 動く)
// BGM は assets/bgm/<normal|bonus|rc|st|ending>.mp3 を 置いて assets/assets.js に 書けば そちらが 優先
// 曲は ぜんぶ オリジナル (カジノの ジャズ・ボーナスの ファンファーレ など 雰囲気だけ 参考)
const Sound = (() => {
    let AC = null, master = null, bgmBus = null, seBus = null, noiseBuf = null;
    let muted = false, bgmOn = true, bgmEl = null, bgmName = null;
    try { muted = localStorage.getItem('koori-sbj-mute') === '1'; bgmOn = localStorage.getItem('koori-sbj-bgm') !== '0'; } catch (e) { /* なし */ }
    let BGM_VOL = 0.55, VOL = 1;   // BGM の 大きさ・全体の 大きさ (演出カスタムで 変えられる・保存)
    try { const v = JSON.parse(localStorage.getItem('koori-sbj-vol') || 'null'); if (v) { VOL = v.vol; BGM_VOL = v.bgm; } } catch (e) { /* なし */ }
    const SE_VOL = 1;

    function ac() {
        if (!AC) {
            try {
                AC = new (window.AudioContext || window.webkitAudioContext)();
                master = AC.createGain(); master.gain.value = muted ? 0 : VOL;
                const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
                master.connect(comp); comp.connect(AC.destination);
                bgmBus = AC.createGain(); bgmBus.gain.value = bgmOn ? BGM_VOL : 0; bgmBus.connect(master);
                seBus = AC.createGain(); seBus.gain.value = SE_VOL; seBus.connect(master);
                echoIn = makeEcho(AC, seBus); loadHeso(AC);
                noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
                const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            } catch (e) { AC = null; }
        }
        if (AC && AC.state === 'suspended' && !(typeof OfflineAudioContext !== 'undefined' && AC instanceof OfflineAudioContext)) AC.resume();
        return AC;
    }
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    // ---------- 音源 (out = つなぐ 先) ----------
    function osc(out, type, f, t, d, vol, opt = {}) {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + (opt.glide || d));
        if (opt.detune) o.detune.value = opt.detune;
        const a = opt.a || 0.005;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
        if (opt.sus) { g.gain.setValueAtTime(vol, t + Math.max(a, d - 0.05)); g.gain.linearRampToValueAtTime(0.0001, t + d); }
        else g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        let node = o;
        if (opt.lp) { const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opt.lp; f2.Q.value = opt.q || 0.7; o.connect(f2); node = f2; }
        node.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(out, t, d, vol, hp, lp) {
        const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = noiseBuf;
        let node = s;
        if (hp) { const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
        if (lp) { const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        node.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
    }
    // 楽器 (m = MIDI 番号)
    const INST = {
        bass: (o, m, t, d, v) => { osc(o, 'triangle', mtof(m), t, d, 0.20 * v, { lp: 900 }); osc(o, 'square', mtof(m), t, d * 0.6, 0.035 * v, { lp: 500 }); },
        pbass: (o, m, t, d, v) => osc(o, 'sawtooth', mtof(m), t, d, 0.09 * v, { lp: 420, q: 4 }),
        piano: (o, m, t, d, v) => { osc(o, 'triangle', mtof(m), t, Math.max(d, 0.25), 0.055 * v); osc(o, 'sine', mtof(m) * 2, t, 0.18, 0.015 * v); },
        vib: (o, m, t, d, v) => { osc(o, 'sine', mtof(m), t, Math.max(d, 0.5), 0.09 * v); osc(o, 'sine', mtof(m) * 4, t, 0.12, 0.02 * v); },
        lead: (o, m, t, d, v) => { osc(o, 'square', mtof(m), t, d, 0.045 * v, { lp: 2600, sus: true }); osc(o, 'square', mtof(m), t, d, 0.025 * v, { lp: 2600, sus: true, detune: 9 }); },
        brass: (o, m, t, d, v) => { osc(o, 'sawtooth', mtof(m), t, d, 0.05 * v, { lp: 1800, a: 0.025, sus: true }); osc(o, 'sawtooth', mtof(m), t, d, 0.03 * v, { lp: 1800, a: 0.025, sus: true, detune: -12 }); },
        bell: (o, m, t, d, v) => { osc(o, 'sine', mtof(m), t, 0.9, 0.07 * v); osc(o, 'sine', mtof(m) * 3.01, t, 0.35, 0.025 * v); },
        pad: (o, m, t, d, v) => osc(o, 'triangle', mtof(m), t, d, 0.035 * v, { a: 0.12, sus: true, lp: 1400 }),
        arp: (o, m, t, d, v) => osc(o, 'square', mtof(m), t, Math.min(d, 0.12), 0.03 * v, { lp: 3000 }),
        kick: (o, m, t, d, v) => osc(o, 'sine', 150, t, 0.22, 0.5 * v, { to: 40, glide: 0.18 }),
        snare: (o, m, t, d, v) => { noise(o, t, 0.16, 0.16 * v, 1200); osc(o, 'triangle', 190, t, 0.08, 0.08 * v); },
        hat: (o, m, t, d, v) => noise(o, t, 0.035, 0.05 * v, 7000),
        ohat: (o, m, t, d, v) => noise(o, t, 0.18, 0.04 * v, 6000),
        brush: (o, m, t, d, v) => noise(o, t, 0.12, 0.035 * v, 2500, 7000),
        ride: (o, m, t, d, v) => { noise(o, t, 0.3, 0.02 * v, 6000); osc(o, 'square', 5200, t, 0.2, 0.006 * v); },
    };

    // ================= BGM (曲の データ) =================
    // 1 曲 = { bpm, swing, steps (16 分音符の 数), ev: [[step, 楽器, midi, 長さ(step), 強さ]] }
    const N = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const nm = s => { const r = s.match(/^([A-G][#b]?)(-?\d)$/); return 12 * (Number(r[2]) + 1) + N[r[1]]; };
    // メロディ "A4:2 C5:2 -:4" (- は 休み・数字は 16 分の 長さ)
    function mel(ev, inst, at, str, v = 1) {
        let s = at;
        for (const tok of str.trim().split(/\s+/)) {
            const [n, l] = tok.split(':'); const len = Number(l || 2);
            if (n !== '-') ev.push([s, inst, nm(n), len, v]);
            s += len;
        }
        return s;
    }
    const chord = (root, kind) => ({ maj: [0, 4, 7], min: [0, 3, 7], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], M7: [0, 4, 7, 11], m9: [0, 3, 7, 10, 14], sus: [0, 5, 7] })[kind].map(x => nm(root) + x);
    function drums(ev, steps, pat) {   // pat: { kick: '1000...', ... } 16 文字で 1 小節
        for (const [inst, p] of Object.entries(pat)) for (let s = 0; s < steps; s++) if (p[s % p.length] !== '.' && p[s % p.length] !== '0') ev.push([s, inst, 0, 1, p[s % p.length] === 'x' ? 1.3 : 1]);
    }

    function songNormal() {   // カジノの スイング (ii-V-I)
        const ev = [], prog = [['D3', 'm7'], ['G3', '7'], ['C3', 'M7'], ['A3', '7'], ['D3', 'm7'], ['G3', '7'], ['E3', 'm7'], ['A3', '7']];
        prog.forEach(([r, k], b) => {
            const c = chord(r, k), s = b * 16, root = nm(r) - 12;
            [root, root + 7, root + 12 - (k === 'M7' ? 1 : 2), root + 5].forEach((m, i) => ev.push([s + i * 4, 'bass', m, 3, 1]));
            [6, 14].forEach(o => c.slice(1).forEach(m => ev.push([s + o, 'piano', m + 12, 2, 0.9])));
        });
        mel(ev, 'vib', 0, 'A4:3 C5:1 E5:4 D5:2 B4:2 -:4 G4:2 B4:2 D5:3 C5:1 E5:8 -:4 C#5:2 E5:2 G5:4 F5:2 E5:2 D5:8 -:4 A4:2 C5:2 F5:3 E5:1 D5:4 B4:4 G4:2 B4:2 E5:8 C#5:4 A4:4 E5:2 G5:2 F5:3 E5:1 D5:4 C5:4 B4:4 A4:8 -:4');
        drums(ev, 128, { ride: 'x..1x.1.x..1x.1.', kick: '1.......1.......', brush: '....1.......1...' });
        return { bpm: 132, swing: 0.33, steps: 128, ev };
    }
    function songBonus() {   // ボーナス: あかるい ファンファーレ調
        const ev = [], prog = [['F3', 'maj'], ['C3', 'maj'], ['D3', 'min'], ['Bb2', 'maj'], ['F3', 'maj'], ['C3', 'maj'], ['Bb2', 'maj'], ['C3', 'sus']];
        prog.forEach(([r, k], b) => {
            const c = chord(r, k), s = b * 16, root = nm(r) - 12;
            for (let i = 0; i < 8; i++) ev.push([s + i * 2, 'bass', root + (i % 2 ? 12 : 0), 2, 0.9]);
            [0, 6, 10].forEach(o => c.forEach(m => ev.push([s + o, 'brass', m + 12, o === 0 ? 4 : 2, 0.7])));
        });
        mel(ev, 'lead', 0, 'C5:2 F5:2 A5:4 G5:2 F5:2 E5:4 G5:2 C6:4 A5:2 G5:4 F5:2 D5:2 F5:4 E5:2 D5:2 C5:4 Bb4:2 D5:2 F5:4 G5:4 A5:8 C6:2 A5:2 F5:4 E5:4 G5:4 F5:4 D5:2 Bb5:4 A5:2 G5:8 C5:4 E5:4 G5:8');
        drums(ev, 128, { kick: 'x...1...x...1...', snare: '....1.......1..1', hat: '1.1.1.1.1.1.1.1.', ohat: '..............1.' });
        return { bpm: 152, swing: 0, steps: 128, ev };
    }
    function songRC() {   // こおりチャンス: 緊張感 (D マイナー・16 分の アルペジオ)
        const ev = [], prog = [['D3', 'min'], ['Bb2', 'maj'], ['C3', 'maj'], ['A2', 'maj']];
        for (let rep = 0; rep < 2; rep++) prog.forEach(([r, k], b) => {
            const c = chord(r, k), s = (rep * 4 + b) * 16, root = nm(r) - 12;
            for (let i = 0; i < 8; i++) ev.push([s + i * 2, 'pbass', root + (i === 7 ? 7 : 0), 1, 1]);
            for (let i = 0; i < 16; i++) ev.push([s + i, 'arp', c[i % 3] + 12 + (i % 6 > 2 ? 12 : 0), 1, 0.8]);
            ev.push([s, 'pad', c[0] + 12, 16, 1], [s, 'pad', c[2] + 12, 16, 1]);
        });
        mel(ev, 'lead', 64, 'D5:6 E5:2 F5:4 E5:4 D5:6 F5:2 G5:8 A5:6 G5:2 F5:4 E5:4 C#5:16');
        drums(ev, 128, { kick: 'x..1..1.x..1..1.', snare: '....x.......x...', hat: '.1.1.1.1.1.1.1.1' });
        return { bpm: 162, swing: 0, steps: 128, ev };
    }
    function songST() {   // ストックタイム: 疾走感 (E メジャー)
        const ev = [], prog = [['E3', 'maj'], ['B2', 'maj'], ['C#3', 'min'], ['A2', 'maj'], ['E3', 'maj'], ['B2', 'maj'], ['A2', 'maj'], ['B2', 'sus']];
        prog.forEach(([r, k], b) => {
            const c = chord(r, k), s = b * 16, root = nm(r) - 12;
            for (let i = 0; i < 16; i += 2) ev.push([s + i, 'pbass', root + (i % 4 ? 12 : 0), 1, 1]);
            [0, 3, 6, 10, 12].forEach(o => c.forEach(m => ev.push([s + o, 'piano', m + 12, 2, 0.8])));
        });
        mel(ev, 'lead', 0, 'B4:2 E5:2 G#5:4 F#5:2 E5:2 F#5:4 D#5:2 B4:6 C#5:2 E5:2 G#5:4 B5:4 A5:4 G#5:2 F#5:2 E5:4 C#5:4 B4:4 G#5:2 B5:2 E6:4 D#6:2 B5:2 C#6:4 B5:4 A5:4 G#5:4 F#5:4 E5:2 F#5:2 G#5:8 F#5:8');
        drums(ev, 128, { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '11111111111111x1' });
        return { bpm: 172, swing: 0, steps: 128, ev };
    }
    function songEnding() {   // エンディング: あたたかい
        const ev = [], prog = [['C3', 'M7'], ['G3', 'maj'], ['A3', 'm7'], ['F3', 'M7'], ['D3', 'm7'], ['G3', '7'], ['C3', 'maj'], ['G3', 'sus']];
        prog.forEach(([r, k], b) => {
            const c = chord(r, k), s = b * 16, root = nm(r) - 12;
            ev.push([s, 'bass', root, 6, 1], [s + 8, 'bass', root + 7, 6, 0.8]);
            c.forEach(m => ev.push([s, 'pad', m + 12, 16, 1]));
            [0, 4, 8, 12].forEach((o, i) => ev.push([s + o, 'piano', c[i % c.length] + 24, 2, 0.6]));
        });
        mel(ev, 'bell', 0, 'E5:4 G5:4 C6:6 B5:2 A5:4 G5:4 E5:8 F5:4 A5:4 C6:4 B5:4 A5:12 -:4 F5:4 A5:4 D6:6 C6:2 B5:4 G5:4 D5:8 E5:4 G5:4 C6:8 B5:8 -:8');
        drums(ev, 128, { kick: '1.......1.......', brush: '....1.......1...', hat: '..1...1...1...1.' });
        return { bpm: 96, swing: 0.2, steps: 128, ev };
    }
    const SONGS = { normal: songNormal, bonus: songBonus, rc: songRC, st: songST, ending: songEnding };
    const cache = {};

    // ---------- 曲の 再生 (先読み スケジューラ) ----------
    let cur = null, timer = null;
    function playSong(name) {
        stopSong();
        if (!ac() || !SONGS[name]) return;
        const song = cache[name] || (cache[name] = SONGS[name]());
        const byStep = Array.from({ length: song.steps }, () => []);
        song.ev.forEach(e => byStep[e[0] % song.steps].push(e));
        const out = AC.createGain(); out.gain.value = 1; out.connect(bgmBus);
        cur = { name, song, byStep, out, step: 0, next: AC.currentTime + 0.08 };
        const stepDur = 60 / song.bpm / 4;
        timer = setInterval(() => {
            if (!cur) return;
            while (cur.next < AC.currentTime + 0.15) {
                const s = cur.step % song.steps;
                const swingOff = song.swing && s % 4 === 2 ? song.swing * stepDur * 2 * 0.5 : 0;
                for (const [, inst, m, len, v] of byStep[s]) INST[inst](cur.out, m, cur.next + swingOff, len * stepDur * 0.95, v);
                cur.next += stepDur; cur.step++;
            }
        }, 30);
    }
    function stopSong() {
        if (timer) { clearInterval(timer); timer = null; }
        if (cur) { const o = cur.out; o.gain.setTargetAtTime(0.0001, AC.currentTime, 0.05); setTimeout(() => o.disconnect(), 400); cur = null; }
    }
    // 告知の 間は BGM を 止める (実機っぽく)
    let duckUntil = 0;
    function duck(ms) {
        if (!ac()) return;
        const t = AC.currentTime; duckUntil = Math.max(duckUntil, t + ms / 1000);
        bgmBus.gain.cancelScheduledValues(t); bgmBus.gain.setTargetAtTime(0.0001, t, 0.02);
        bgmBus.gain.setTargetAtTime(bgmOn ? BGM_VOL : 0, duckUntil, 0.25);
    }

    // ================= 効果音 =================
    function beep(f, d, type, vol, when) { const a = ac(); if (!a || muted) return; osc(seBus, type || 'square', f, a.currentTime + (when || 0), d, vol || 0.05); }
    const T = () => ac() ? AC.currentTime : 0;
    // ---------- おにおに式の 部品 ----------
    // やまびこ (0.13 秒・高い 音だけ くり返す)
    let echoIn = null, hesoBuf = null;
    const HESO = { start: 1.3, end: 3.5, gain: 4 };   // パチンコの 先バレ音の 鳴らす ところ (秒) と 大きさ (おにおにと 同じ)
    function makeEcho(ctx, out) {
        const echo = ctx.createDelay(1); echo.delayTime.value = 0.13;
        const fb = ctx.createGain(); fb.gain.value = 0.38;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
        const wet = ctx.createGain(); wet.gain.value = 0.5;
        echo.connect(fb); fb.connect(hp); hp.connect(echo); echo.connect(wet); wet.connect(out);
        return echo;
    }
    function loadHeso(ctx) {
        if (hesoBuf || typeof HESO_SOUND === 'undefined') return Promise.resolve();
        try {
            const bin = atob(HESO_SOUND.split(',')[1]), bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return ctx.decodeAudioData(bytes.buffer).then(b => { hesoBuf = b; }, () => {});
        } catch (e) { return Promise.resolve(); }
    }
    // 音程が すべる 音 (echo = やまびこも)
    function sweepV(from, to, type, at, d, vol, echo) {
        const t = T() + at, o = AC.createOscillator(), g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + d);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(seBus); if (echo) g.connect(echoIn); o.start(t); o.stop(t + d + 0.03);
    }
    // ドスッ (低い ところだけ 残した ノイズ)
    function thump(at, d, vol, cutoff) {
        const t = T() + at, len = Math.floor(AC.sampleRate * d), buf = AC.createBuffer(1, len, AC.sampleRate), x = buf.getChannelData(0);
        for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        const src = AC.createBufferSource(), lp = AC.createBiquadFilter(), g = AC.createGain();
        src.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = cutoff; g.gain.value = vol;
        src.connect(lp); lp.connect(g); g.connect(seBus); src.start(t);
    }
    // 一発告知の 重低音 (うなり なし・衝撃と 低い 落ちる 音)
    function boom(at) {
        const t = T() + at;
        thump(at, 0.6, 1, 160);
        osc(seBus, 'sine', 90, t, 0.9, 0.5, { to: 32, glide: 0.7, a: 0.003 });
        osc(seBus, 'square', 110, t, 0.5, 0.06, { to: 40, glide: 0.4, a: 0.003, lp: 400 });
    }
    // 長い キュイン (35Hz の ドロップ + 4600 → 6200Hz の 2 段の キュイン・約 3.8 秒)
    function longKyuin() {
        const t = T();
        osc(seBus, 'sine', 70, t, 1.6, 0.5, { to: 35, glide: 0.5, a: 0.004 });
        thump(0, 0.5, 0.9, 140);
        const hold = (f, f2, at, d, vol, type, lp, echo) => {
            const o = AC.createOscillator(), g = AC.createGain(), tt = t + at; o.type = type;
            o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f2, tt + 0.28);
            g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(vol, tt + 0.01); g.gain.setValueAtTime(vol, tt + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
            let n = o; if (lp) { const f3 = AC.createBiquadFilter(); f3.type = 'lowpass'; f3.frequency.value = lp; o.connect(f3); n = f3; }
            n.connect(g); g.connect(seBus); if (echo) g.connect(echoIn); o.start(tt); o.stop(tt + d + 0.05);
        };
        hold(2300, 4600, 0.05, 1.5, 0.05, 'square', 9000, true);
        hold(4600, 6200, 1.5, 2.3, 0.045, 'square', 11000, true);
        hold(1150, 1550, 1.5, 2.3, 0.05, 'triangle', 0, false);
    }
    // 突入の ファンファーレを 2 回 (はじめと 0.5 秒 あと)
    function bonusIn(at = 0) { [0, 0.5].forEach(d => [440, 540, 640, 740, 840].forEach((f, i) => osc(seBus, 'triangle', f, T() + at + d + i * 0.1, 0.2, 0.1))); }

    const se = {
        lever: () => beep(180, 0.08, 'square', 0.06),
        stop: () => beep(90, 0.07, 'triangle', 0.12),
        pay: n => { for (let i = 0; i < Math.min(n, 15); i++) beep(1400, 0.03, 'square', 0.03, i * 0.04); },
        win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.18, 'square', 0.06, i * 0.1)),
        big: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => beep(f, 0.16, 'sawtooth', 0.05, i * 0.09)),
        lose: () => [330, 262, 196].forEach((f, i) => beep(f, 0.2, 'triangle', 0.07, i * 0.15)),
        card: () => beep(2000, 0.02, 'square', 0.03),
        tick: () => beep(1200, 0.02, 'square', 0.02),
        saki: () => beep(1800, 0.25, 'sine', 0.08),      // 先バレ音

        // ---------- 当たりの 告知音 (2026-11-22 ユーザー指定: 初代スロット「おにおにの野望」の 当たり音の 感じ) ----------
        // おにおにの js/audio.js と 同じ 作り: 高い 音に やまびこ・腹に 響く ドスッ・一発告知は パチンコの 先バレ音 (ユーザーの 録音)
        // 先バレ: キュイン キュイン (バトルの カットイン・会話)
        kyuin: () => { if (!ac() || muted) return; duck(900); sweepV(900, 1900, 'square', 0, 0.16, 0.06); sweepV(900, 1900, 'square', 0.17, 0.16, 0.06); },
        // 一発告知 (レバーで 当選を 知らせる): ドスッ + 先バレ音の 録音 (やまびこ付き) + 低い 落ちる 音
        kokuchi: () => {
            if (!ac() || muted) return; duck(3600);
            thump(0, 0.35, 0.8, 220);
            if (hesoBuf) { const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = hesoBuf; g.gain.value = HESO.gain; src.connect(g); g.connect(seBus); g.connect(echoIn); src.start(T(), HESO.start, HESO.end - HESO.start); }
            else [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => osc(seBus, 'triangle', f, T() + i * 0.11, 0.5, 0.09));
            boom(0);
        },
        // 当たり確定: キュイン キュイン キュイン (狙えカットイン)
        kakutei: () => { if (!ac() || muted) return; duck(1600); [0, 0.18, 0.36].forEach(d => sweepV(1200, 2600, 'triangle', d, 0.2, 0.08, true)); },
        // 突入の 告知: kind = 'bonus' (ボーナス確定) / 'rc' (こおりチャンス) / 'rainbow' (ストックタイム・プレミア)
        fanfare: kind => {
            if (!ac() || muted) return;
            if (kind === 'rainbow') { duck(4000); longKyuin(); bonusIn(1.5); }
            else if (kind === 'rc') { duck(2400); se.kakutei(); [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => osc(seBus, 'triangle', f, T() + 0.6 + i * 0.11, 0.5, 0.09)); }
            else { duck(2600); boom(0); bonusIn(); }
        },
        // バトル勝利: ドスッ + 勝利の 3 音
        jan: () => { if (!ac() || muted) return; duck(1500); boom(0); [523.25, 659.25, 783.99].forEach((f, i) => osc(seBus, 'sine', f, T() + i * 0.1, 0.3, 0.1)); },
        // ストック獲得: 1 つ 上がる ブラス
        stock: () => { if (!ac() || muted) return; const t = T(); [1, 1.25, 1.5].forEach((m, i) => osc(seBus, 'sawtooth', 523.25 * m, t + i * 0.01, 0.6, 0.035, { a: 0.03, sus: true, lp: 2400 })); thump(0, 0.2, 0.4, 300); },
        // ロングフリーズ: プチュン (消灯) → 重低音の 衝撃 3 連
        freeze: () => {
            if (!ac() || muted) return; duck(3200); const t = T();
            osc(seBus, 'square', 1800, t, 0.09, 0.08, { to: 120, glide: 0.08 }); thump(0, 0.08, 0.3, 900);
            [0.5, 1.1, 1.7].forEach((at, i) => { thump(at, 0.5, 1, 150); osc(seBus, 'sine', 90 - i * 10, t + at, 0.8, 0.5, { to: 34, glide: 0.6, a: 0.003 }); });
        },
    };

    // ================= BGM の 切りかえ =================
    function bgm(name) {
        if (name === bgmName) return;
        bgmName = name;
        if (bgmEl) { bgmEl.pause(); bgmEl = null; }
        stopSong();
        if (!name || muted || !bgmOn) return;
        if (typeof ASSETS !== 'undefined' && (ASSETS.bgm || []).includes(name)) {
            const el = new Audio(`assets/bgm/${name}.mp3`);
            el.loop = true; el.volume = Math.min(1, 0.5 * VOL * BGM_VOL / 0.55);
            el.addEventListener('error', () => { if (bgmEl === el) { bgmEl = null; playSong(name); } });
            el.play().catch(() => { /* まだ さわって いない */ });
            bgmEl = el;
            return;
        }
        if (AC) playSong(name);   // 最初の タップ (unlock) までは 鳴らさない
    }
    function unlock() {
        const had = !!AC; ac();
        if (!had && AC && bgmName && !cur && !bgmEl && !muted && bgmOn) { const n = bgmName; bgmName = null; bgm(n); }
        return AC;
    }
    function setMute(m) {
        muted = m;
        try { localStorage.setItem('koori-sbj-mute', m ? '1' : '0'); } catch (e) { /* なし */ }
        if (master) master.gain.setTargetAtTime(m ? 0 : VOL, AC.currentTime, 0.03);
        const n = bgmName; bgmName = null; bgm(n);
    }
    function setBgm(on) {
        bgmOn = on;
        try { localStorage.setItem('koori-sbj-bgm', on ? '1' : '0'); } catch (e) { /* なし */ }
        if (bgmBus) bgmBus.gain.setTargetAtTime(on ? BGM_VOL : 0, AC.currentTime, 0.05);
        const n = bgmName; bgmName = null; bgm(n);
    }
    // 確認用: 曲や 告知音を 書き出す (OfflineAudioContext)。what = 'song:normal' / 'se:fanfare:rc' など
    async function _render(what, sec) {
        const off = new OfflineAudioContext(1, Math.ceil(44100 * sec), 44100);
        const keep = [AC, master, bgmBus, seBus, noiseBuf, muted];
        AC = off; master = off.createGain(); master.connect(off.destination);
        bgmBus = off.createGain(); bgmBus.gain.value = BGM_VOL; bgmBus.connect(master);
        seBus = off.createGain(); seBus.connect(master); muted = false;
        await loadHeso(off); const keepEcho = echoIn; echoIn = makeEcho(off, seBus);
        noiseBuf = off.createBuffer(1, 44100, 44100); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const [kind, name, arg] = what.split(':');
        try {
            if (kind === 'song') {
                const song = SONGS[name](), sd = 60 / song.bpm / 4;
                for (let st = 0, t = 0.05; t < sec; st++, t += sd) for (const [s0, inst, m, len, v] of song.ev) if (s0 === st % song.steps) INST[inst](bgmBus, m, t + (song.swing && s0 % 4 === 2 ? song.swing * sd : 0), len * sd * 0.95, v);
            } else se[name](arg);
            return (await off.startRendering()).getChannelData(0);
        } finally { [AC, master, bgmBus, seBus, noiseBuf, muted] = keep; echoIn = keepEcho; }
    }
    const saveVol = () => { try { localStorage.setItem('koori-sbj-vol', JSON.stringify({ vol: VOL, bgm: BGM_VOL })); } catch (e) { /* なし */ } };
    function setVol(v) { VOL = v; saveVol(); if (master && !muted) master.gain.setTargetAtTime(v, AC.currentTime, 0.03); if (bgmEl) bgmEl.volume = Math.min(1, 0.5 * VOL * BGM_VOL / 0.55); }
    function setBgmVol(v) { BGM_VOL = v; saveVol(); if (bgmBus && bgmOn) bgmBus.gain.setTargetAtTime(v, AC.currentTime, 0.03); if (bgmEl) bgmEl.volume = Math.min(1, 0.5 * VOL * BGM_VOL / 0.55); }
    return { se, beep, unlock, bgm, _render, setVol, setBgmVol, get vol() { return VOL; }, get bgmVol() { return BGM_VOL; }, setMute, setBgm, duck, get muted() { return muted; }, get bgmOn() { return bgmOn; }, _songs: SONGS };
})();
