// node で エンジンを 読みこむ (index.html と 同じ 順番)。globalThis.SBJ を 返す
const path = require('path');
const FILES = [
    'js/data/reels.js', 'js/data/shapes.js', 'js/data/params.js', 'js/data/effects.js',
    'js/engine/cards.js', 'js/engine/reel-control.js', 'js/engine/lottery.js',
    'js/engine/battle.js', 'js/engine/koori-chance.js', 'js/engine/hints.js', 'js/engine/engine.js',
];
for (const f of FILES) require(path.join(__dirname, '..', f));
module.exports = globalThis.SBJ;
module.exports.FILES = FILES;
