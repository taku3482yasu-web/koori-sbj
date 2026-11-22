// 音 (Web Audio)。効果音・当たりの 告知音・BGM を ぜんぶ その場で 鳴らす (音の ファイル なしで 動く)
// BGM は assets/bgm/<normal|bonus|rc|st|ending>.mp3 を 置いて assets/assets.js に 書けば そちらが 優先
// 曲は ぜんぶ オリジナル (カジノの ジャズ・ボーナスの ファンファーレ など 雰囲気だけ 参考)
const Sound = (() => {
    let AC = null, master = null, bgmBus = null, seBus = null, noiseBuf = null;
    let muted = false, bgmOn = true, bgmEl = null, bgmName = null;
    try { muted = localStorage.getItem('koori-sbj-mute') === '1'; bgmOn = localStorage.getItem('koori-sbj-bgm') !== '0'; } catch (e) { /* なし */ }
    const BGM_VOL = 0.55, SE_VOL = 1;

    function ac() {
        if (!AC) {
            try {
                AC = new (window.AudioContext || window.webkitAudioContext)();
                master = AC.createGain(); master.gain.value = muted ? 0 : 1;
                const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
                master.connect(comp); comp.connect(AC.destination);
                bgmBus = AC.createGain(); bgmBus.gain.value = bgmOn ? BGM_VOL : 0; bgmBus.connect(master);
                seBus = AC.createGain(); seBus.gain.value = SE_VOL; seBus.connect(master);
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

        // ---------- 当たりの 告知音 ----------
        // キュイン: 2 本の のこぎり波が 一気に 駆け上がって、きらきらの 余韻
        kyuin: () => {
            if (!ac() || muted) return; const t = T(); duck(1400);
            osc(seBus, 'sawtooth', 320, t, 0.55, 0.14, { to: 3400, glide: 0.42, lp: 6000 });
            osc(seBus, 'sawtooth', 330, t, 0.55, 0.10, { to: 3500, glide: 0.42, detune: 15, lp: 6000 });
            osc(seBus, 'square', 160, t, 0.5, 0.06, { to: 1700, glide: 0.42, lp: 3000 });
            for (let i = 0; i < 6; i++) osc(seBus, 'sine', 2600 + i * 420, t + 0.42 + i * 0.05, 0.4, 0.07);
            noise(seBus, t + 0.4, 0.5, 0.1, 6000);
        },
        // ボーナス確定: キュイン → 金管の ファンファーレ
        fanfare: kind => {
            if (!ac() || muted) return; const t = T();
            if (kind === 'rc') {          // こおりチャンス: つめたい ベルの 駆け上がり + 和音
                duck(2200);
                [74, 78, 81, 86, 90, 93, 98].forEach((m, i) => INST.bell(seBus, m, t + i * 0.06, 0.5, 1.4));
                [62, 66, 69, 74].forEach(m => INST.brass(seBus, m, t + 0.5, 1.3, 1.6));
                noise(seBus, t + 0.5, 1.0, 0.05, 8000);
            } else if (kind === 'rainbow') {   // ストックタイム・プレミア: 長い グリッサンド + 大きな 和音 + きらきら
                duck(3200);
                for (let i = 0; i < 24; i++) INST.arp(seBus, 60 + i * 1.5 | 0, t + i * 0.025, 0.1, 1.6);
                [52, 59, 64, 68, 71, 76].forEach(m => INST.brass(seBus, m, t + 0.62, 1.9, 1.6));
                INST.kick(seBus, 0, t + 0.62, 0.3, 1.5); noise(seBus, t + 0.62, 1.6, 0.08, 5000);
                for (let i = 0; i < 10; i++) INST.bell(seBus, 88 + (i * 5) % 12, t + 0.8 + i * 0.12, 0.4, 1);
            } else {                       // ボーナス: タタタ・ターン!
                duck(2400);
                [[67, 0], [67, 0.12], [67, 0.24], [72, 0.38]].forEach(([m, d], i) => [0, 4, 7].forEach(x => INST.brass(seBus, m + x, t + d, i === 3 ? 1.3 : 0.1, 1.5)));
                INST.kick(seBus, 0, t + 0.38, 0.3, 1.4); noise(seBus, t + 0.38, 1.2, 0.07, 4000);
                [84, 88, 91, 96].forEach((m, i) => INST.bell(seBus, m, t + 0.5 + i * 0.07, 0.4, 1));
            }
        },
        // バトル勝利: ジャン!
        jan: () => {
            if (!ac() || muted) return; const t = T(); duck(1500);
            [60, 64, 67, 72, 76].forEach(m => INST.brass(seBus, m, t, 0.9, 1.5));
            INST.kick(seBus, 0, t, 0.3, 1.5); noise(seBus, t, 0.8, 0.07, 3500);
        },
        // ストック獲得: コインの チャリン
        stock: () => { if (!ac() || muted) return; const t = T(); [88, 95, 100].forEach((m, i) => INST.bell(seBus, m, t + i * 0.07, 0.3, 1.4)); },
        // ロングフリーズ: 低い うなり → 静寂
        freeze: () => { if (!ac() || muted) return; const t = T(); duck(3200); osc(seBus, 'sawtooth', 110, t, 1.8, 0.2, { to: 30, glide: 1.7, lp: 600 }); noise(seBus, t, 1.5, 0.14, 0, 400); },
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
            el.loop = true; el.volume = 0.5;
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
        if (master) master.gain.setTargetAtTime(m ? 0 : 1, AC.currentTime, 0.03);
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
        noiseBuf = off.createBuffer(1, 44100, 44100); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const [kind, name, arg] = what.split(':');
        try {
            if (kind === 'song') {
                const song = SONGS[name](), sd = 60 / song.bpm / 4;
                for (let st = 0, t = 0.05; t < sec; st++, t += sd) for (const [s0, inst, m, len, v] of song.ev) if (s0 === st % song.steps) INST[inst](bgmBus, m, t + (song.swing && s0 % 4 === 2 ? song.swing * sd : 0), len * sd * 0.95, v);
            } else se[name](arg);
            return (await off.startRendering()).getChannelData(0);
        } finally { [AC, master, bgmBus, seBus, noiseBuf, muted] = keep; }
    }
    return { se, beep, unlock, bgm, _render, setMute, setBgm, duck, get muted() { return muted; }, get bgmOn() { return bgmOn; }, _songs: SONGS };
})();
