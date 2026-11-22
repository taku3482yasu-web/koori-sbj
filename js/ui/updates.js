// アップデート情報 (新しい 順)。足す ときは いちばん 上に 1 つ 足す。見て いない 版が あれば ボタンに NEW
const Updates = (() => {
    const $ = id => document.getElementById(id);
    const LIST = [
        ['2026-11-23 (2)', ['設定当て モード (設定 ？ を えらぶと 設定は ないしょ。予想して 答え合わせ・つぎの 日へ で 設定変更 / 据え置き)', 'あそびかたに リール配列表と 役の 一覧', '全画面ボタン・ホーム画面に 追加 (ネットが なくても 遊べる)', '当たりで スマホが 振動 (演出カスタムで オフ)', 'キー配置を えらべる (ふつう・左手・右手)', 'スマホの 縦画面で 液晶と ボタンが 1 画面に おさまるように', 'この アップデート情報']],
        ['2026-11-23', ['図鑑と 実績 26 個', 'データ欄に 天井までの G 数と 小役カウンター', '光を 弱める モード', '演出 確認ボタン (ロングフリーズ・エンディングも)']],
        ['2026-11-22', ['BGM 5 曲と 当たりの 告知音', 'メダル・データの 保存、当たり履歴と スランプグラフ', 'オート 高速・あそびかた・音量', 'エンディングの 設定示唆']],
        ['2026-11-19', ['こおりくんの スーパーブラックジャック 公開!']],
    ];
    const KEY = 'koori-sbj-upd';
    const latest = LIST[0][0];
    let seen = null; try { seen = localStorage.getItem(KEY); } catch (e) { /* なし */ }
    function badge() { $('btnUpd').classList.toggle('new', seen !== latest); }
    function open() {
        $('updBody').innerHTML = LIST.map(([d, items]) => `<h3>${d}</h3><ul>${items.map(t => `<li>${t}</li>`).join('')}</ul>`).join('');
        $('updates').hidden = false;
        seen = latest; try { localStorage.setItem(KEY, latest); } catch (e) { /* なし */ }
        badge();
    }
    const close = () => { $('updates').hidden = true; };
    function init() {
        $('btnUpd').onclick = open; $('updClose').onclick = close;
        $('updates').onclick = e => { if (e.target === $('updates')) close(); };
        badge();
    }
    return { init, open, LIST };
})();
