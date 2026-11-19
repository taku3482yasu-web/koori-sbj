// リール配列 (設計書 3 章・ユーザー指定)。各 20 コマ。番号が 1 増えると 画面で 1 つ 下。
// 回転中は 図柄が 上から 下へ 流れる → すべるほど 上段の コマ番号が 減る。
// R7=赤7 B7=青7 BAR BEL=ベル REP=リプレイ CHE=チェリー SUI=スイカ
// ふつうの <script> でも node でも 読める (globalThis.SBJ に ぶらさげる)
(function (SBJ) {
    'use strict';
    SBJ.STRIPS = [
        ['SUI', 'BEL', 'B7', 'REP', 'SUI', 'CHE', 'BEL', 'R7', 'SUI', 'REP', 'SUI', 'BEL', 'REP', 'BAR', 'CHE', 'SUI', 'BEL', 'REP', 'SUI', 'CHE'], // 左
        ['BEL', 'CHE', 'SUI', 'CHE', 'REP', 'BEL', 'CHE', 'B7', 'CHE', 'REP', 'BEL', 'CHE', 'SUI', 'R7', 'REP', 'BEL', 'CHE', 'SUI', 'BAR', 'REP'], // 中
        ['REP', 'CHE', 'CHE', 'BEL', 'SUI', 'REP', 'BAR', 'R7', 'BEL', 'SUI', 'REP', 'CHE', 'REP', 'BEL', 'SUI', 'REP', 'CHE', 'B7', 'BEL', 'SUI'], // 右
    ];
    SBJ.SYMBOL_NAME = { R7: '赤7', B7: '青7', BAR: 'BAR', BEL: 'ベル', REP: 'リプレイ', CHE: 'チェリー', SUI: 'スイカ' };
})(globalThis.SBJ || (globalThis.SBJ = {}));
