/* 
========================================================================
仲間川地区保全利用協定 公式ホームページ インタラクティブロジック (script.js)
========================================================================
*/

function initApp() {
    initNavigation();
    initRuleTabs();
    initOperatorFilter();
    initDnaGallery();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

/* 
========================================================================
1. ナビゲーション制御
========================================================================
*/
function initNavigation() {
    const header = document.querySelector('header');
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-item a');

    // スクロール時にヘッダーデザインを圧縮＆反転
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // スクロール連動のアクティブメニュー表示
        let fromTop = window.scrollY + 100;
        navLinks.forEach(link => {
            const section = document.querySelector(link.getAttribute('href'));
            if (section) {
                if (
                    section.offsetTop <= fromTop &&
                    section.offsetTop + section.offsetHeight > fromTop
                ) {
                    navLinks.forEach(l => l.parentElement.classList.remove('active'));
                    link.parentElement.classList.add('active');
                }
            }
        });
    });

    // モバイル用ハンバーガーメニュー開閉
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            // アニメーション用に三本線をクロスに変形
            const spans = menuToggle.querySelectorAll('span');
            spans[0].style.transform = navMenu.classList.contains('open') ? 'rotate(45deg) translate(6px, 6px)' : 'none';
            spans[1].style.opacity = navMenu.classList.contains('open') ? '0' : '1';
            spans[2].style.transform = navMenu.classList.contains('open') ? 'rotate(-45deg) translate(5px, -5px)' : 'none';
        });

        // リンクをクリックしたらメニューを閉じる
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                const spans = menuToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }
}

/* 
========================================================================
2. 仲間川のルールとマナー タブ切り替え
========================================================================
*/

function initRuleTabs() {
    const tabBtns = document.querySelectorAll('.rule-tab-btn');
    const tabContents = document.querySelectorAll('.rule-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // ボタンのアクティブ切り替え
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // コンテンツのアクティブ切り替え
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

/* 
========================================================================
4. 14締結事業者の検索＆フィルター絞り込み
========================================================================
*/
const OPERATORS_DATA = [
    {
        id: 1,
        name: "西表島交通株式会社",
        rep: "玉盛 雅治",
        desc: "仲間川をゆったり巡るマングローブクルーズを運航。歩くのが心配な方も安心で、船上から大自然を身近に体感できます。環境に配慮したエコ動力船と丁寧なご案内で、感動と癒しの時間をお届けします！",
        types: ["powerboat"],
        hasPowerboat: true,
        hasCanoe: false,
        url: "https://iriomote.com/",
        isSuspended: false,
        mainTours: "仲間川マングローブクルーズ、路線バス"
    },
    {
        id: 2,
        name: "マリンレジャー金盛",
        rep: "金盛 良克",
        desc: "ベテランガイドの丁寧な案内が評判！仲間川の遊覧船やカヌーツアーから、周辺離島へのチャーター船まで対応。リピーターも多く、ご要望に合わせたリクエストツアーも大人気です！",
        types: ["powerboat", "canoe"],
        hasPowerboat: true,
        hasCanoe: true,
        url: "https://painusima.com/722/",
        isSuspended: false,
        mainTours: "仲間川マングローブ遊覧船ツアー、マングローブカヌーツアー、周辺離島チャーター船、オーダーメイド・リクエストツアー"
    },
    {
        id: 3,
        name: "とんとんみー・ちゅらねしあ・やまねこキッズ",
        rep: "余語 晶子",
        desc: "「身の丈＋10㎝」の経験とそれぞれの「冒険心をサポート」。「人と人」「人と自然」が向き合うことを、スタッフが全力かつ安全にサポートします。小さなお店ですが、大切な時間を思い切り楽しんでいただけますよう、万全の体制で皆様をお待ちしております。",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://www.churanesia.jp/iriomote/index.html",
        isSuspended: false,
        mainTours: "マングローブカヤック半日体験、夕暮れマングローブカヤック、ワンデイ仲間川源流部カヤック、トレッキングツアー"
    },
    {
        id: 4,
        name: "シーカヤックツアー海月（くらげ）",
        rep: "金田 克己",
        desc: "カヤックやトレッキング、キャニオニングなど西表島を満喫できるアクティビティが満載！マナーと安全を大切にするガイドが、大自然を体感する「とっておきの冒険」へ皆さんをご案内します。",
        types: ["canoe"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://iriomotejima-kurage.com/",
        isSuspended: false,
        mainTours: "ピナイサーラの滝カヤック＆トレッキング、マングローブカヤック＆ジャングル体験、マングローブカヌー＆由布島水牛車観光、仲間川カヤックツアー、半日キャニオニング"
    },
    {
        id: 5,
        name: "西表島ツアーガイド カラカラ",
        rep: "岸本 望",
        desc: "マングローブでのカヤックや原生林トレッキングなど、西表島の大自然を巡るツアーを開催。島の生き物の生態や自然保護にまつわる丁寧な解説が好評で、初心者の方でも安心して楽しんでいただけます！",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://www.iriotekarakara.com/",
        isSuspended: false,
        mainTours: "ピナイサーラの滝カヤック＆トレッキング、ナーラの滝カヤック＆トレッキング、遊覧船で行くマヤグスクトレッキング、シーカヤックで行く船浮・イダの浜、ユツンの滝・ゲータの滝トレッキング"
    },
    {
        id: 6,
        name: "晴々（はるばる）",
        rep: "上條 晴彦",
        desc: "知識豊富なガイドによる丁寧で分かりやすい生き物解説が評判！カヌーに乗ってマングローブ林をのんびり散策する、地域密着型のアットホームで笑顔あふれるネイチャーツアーをご提供しています。",
        types: ["canoe"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "#",
        isSuspended: false,
        mainTours: "マングローブ自然観察カヌーツアー"
    },
    {
        id: 7,
        name: "シーコンパス",
        rep: "稲葉 敏和",
        desc: "本格的なシーカヤックでの秘境ツアーを「1日1組限定の完全貸切」でご案内します。体力に合わせたオーダーメイドの冒険から、大自然の絶景巡りまで、地元ガイドならではのとっておきの一日をご提供します！",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "http://seacompass.net/",
        isSuspended: false,
        mainTours: "1日貸切シーカヤック＆トレッキングツアー、半日ショートツアー、期間限定早朝サガリバナツアー、星空ナイトツアー"
    },
    {
        id: 8,
        name: "パジャウトリップ西表フィールドサービス",
        rep: "赤塚 義之",
        desc: "人混みを避けて離島らしい静寂を感じられるフィールドへ、少人数制でご案内します。確かなスキルと資格を持つガイドが、狩猟や採集など伝統文化にも触れながら、一歩踏み込んだ島の魅力をお伝えします。",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://bajautrip-ifs.com/",
        isSuspended: false,
        mainTours: "お任せシーカヤック/マングローブカヤック（1日/半日）、アイランドホッピング（1日）、マヤグスクの滝・ピナイサーラの滝・ナーラの滝トレッキングツアー"
    },
    {
        id: 9,
        name: "マヤグスクツアー",
        rep: "吉村 鷹亮",
        desc: "西表島で最も美しいとされる秘境「マヤグスクの滝」への冒険ツアーを専門としています。道のりは少しハードですが、目の前に広がる雄大な滝の景色は感動間違いなし。特別な一日を全力でサポートします！",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://www.mayagusukutour.net/",
        isSuspended: false,
        mainTours: "マヤグスクの滝カヤック＆トレッキングツアー、西表島最高峰古見岳トレッキングツアー、西表島横断トレッキング、仲間川カヌーツアー（半日）"
    },
    {
        id: 10,
        name: "ネイチャーズディライト西表",
        rep: "今村 弘明",
        desc: "カヤックやトレッキングを通じて、西表島の生態系を楽しく学ぶエコツアーをご提供。地域環境に寄り添いながら、島ならではの自然の魅力と歴史・文化を、安全第一でアットホームにご案内いたします！",
        types: ["canoe"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://nd-iriomote.com/",
        isSuspended: false,
        mainTours: "マングローブカヤック（半日）、ジャングルトレッキング（半日）、キャニオニング（半日）、由布島コース、ユツン三段の滝・古見岳トレッキング"
    },
    {
        id: 11,
        name: "あそび屋 もく",
        rep: "山道 拓海",
        desc: "「島で遊んで自然に環ろう」を合言葉に、お客様の体力に合わせた貸切・少人数制ツアーをご提案。送迎サービスや写真データプレゼントも好評で、初心者からシニアまで無理なく最高の思い出を作れます。",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://moku-iriomote.com/",
        isSuspended: false,
        mainTours: "ガイドにお任せ１日ツアー（貸切対応）、マヤグスクの滝・ユツンの滝・古見岳トレッキングコース、季節限定サガリバナ/カヤック＆キャニオニング、草木染めワークショップ"
    },
    {
        id: 12,
        name: "西表島 タルチョ",
        rep: "奥村 昇平",
        desc: "子育て経験を生かしたファミリー歓迎のツアーが特徴です。0〜1歳のお子様連れでも安心の完全貸切ツアーや、干潟での生き物探しなどをご用意。ガイド歴15年のベテランが丁寧にご案内します！",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://www.darlcog.com/",
        isSuspended: false,
        mainTours: "0～1歳の赤ちゃんファミリー貸切お1組ツアー、生き物大好き１日ツアー、仲間川マングローブカヌー半日ツアー、マングローブカヌー×ジャングルトレッキング、由布島観光ツアー"
    },
    {
        id: 13,
        name: "西表 SUP ツアーサービス 水と土",
        rep: "影山 謙太",
        desc: "仲間川のマングローブや豊かな亜熱帯の景観を、SUPに乗って全身で体感してみませんか？水面に近い目線だからこそ出会える美しい景色と、水と一体になるような癒しと感動のアウトドア体験をお届けします。",
        types: ["sup"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://mizutotuti888.wixsite.com/iriomote",
        isSuspended: true,
        mainTours: "サンライズサップ、リバーサップ、サップ＆トレッキング、サンセットサップ、季節限定サガリバナカヤック（6月～7月）"
    },
    {
        id: 14,
        name: "株式会社 空風（そらかぜ）",
        rep: "平川 洋平",
        desc: "海・山・川のすべてのフィールドを繋ぎ、西表島をダイナミックに楽しむツアーをご提供。カヌーからシュノーケリング、滝巡りまで、経験豊富なガイドが初心者やご家族連れにも安全で特別な体験をお届けします！",
        types: ["canoe"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://sorakaze.jp/",
        isSuspended: false,
        mainTours: "マングローブカヌー＆由布島水牛観光1日ツアー、ピナイサーラの滝1日/半日ツアー、神秘の島でシュノーケリング半日ツアー、西表島マングローブカヌー＆シュノーケリング1日ツアー、西表島マングローブカヌー＆キャニオニング1日ツアー"
    }
];

function initOperatorFilter() {
    const grid = document.getElementById('operators-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('operator-search');

    if (!grid) return;

    let currentFilter = 'all';
    let searchQuery = '';

    // カード初期表示
    renderOperators();

    // フィルターボタンクリックイベント
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderOperators();
        });
    });

    // 検索入力イベント
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderOperators();
        });
    }

    function renderOperators() {
        grid.innerHTML = '';

        const filtered = OPERATORS_DATA.filter(op => {
            // フィルターチェック
            const matchesFilter = currentFilter === 'all' || op.types.includes(currentFilter);
            
            // 検索ワードチェック
            const matchesSearch = op.name.toLowerCase().includes(searchQuery) || 
                                  op.desc.toLowerCase().includes(searchQuery) ||
                                  op.rep.toLowerCase().includes(searchQuery) ||
                                  (op.mainTours && op.mainTours.toLowerCase().includes(searchQuery));

            return matchesFilter && matchesSearch;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted);">
                <i class="fas fa-search-minus" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                条件に合う締結事業者は見つかりませんでした。
            </div>`;
            return;
        }

        filtered.forEach(op => {
            const card = document.createElement('div');
            card.className = 'operator-card';
            if (op.isSuspended) {
                card.style.opacity = '0.75';
            }

            // タグのHTML生成
            const tagsHTML = op.types.map(t => {
                let text = "カヌー";
                let tagClass = "tag-canoe";
                if (t === 'powerboat') { text = "動力船"; tagClass = "tag-powerboat"; }
                if (t === 'sup') { text = "SUP"; tagClass = "tag-sup"; }
                if (t === 'trekking') { text = "登山・散策"; tagClass = "tag-trekking"; }
                return `<span class="operator-tag ${tagClass}">${text}</span>`;
            }).join('');

            const statusText = op.isSuspended ? 
                `<span class="operator-status-text" style="color: var(--color-accent-red);"><i class="fas fa-pause-circle"></i> 休止中</span>` : 
                `<span class="operator-status-text" style="color: var(--color-status-green);"><i class="fas fa-check-circle"></i> 協定締結営業中</span>`;

            // メインツアーのHTML生成
            const mainToursHTML = op.mainTours ? `
                <div class="operator-main-tours">
                    <strong>主なツアー:</strong>
                    ${op.mainTours}
                </div>
            ` : '';

            card.innerHTML = `
                <div>
                    <div class="operator-card-header">
                        <div class="operator-num">事業者番号 ${String(op.id).padStart(2, '0')}</div>
                        <h4>${op.name}</h4>
                        <div class="operator-rep">代表: ${op.rep}</div>
                    </div>
                    <div class="operator-body">
                        <p class="operator-desc">${op.desc}</p>
                        <div class="operator-tags">${tagsHTML}</div>
                        ${mainToursHTML}
                    </div>
                </div>
                <div class="operator-card-footer">
                    ${statusText}
                    <a href="${op.url}" target="_blank" rel="noopener noreferrer" class="operator-btn" title="公式サイトへ">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `;

            grid.appendChild(card);
        });
    }
}

/* 
========================================================================
5. 仲間川環境DNAデジタル生物図鑑（第1回調査結果 全23種・グループ）
========================================================================
*/
const DNA_SPECIES_DATA = [
    {
        "id": "komochi-sayori",
        "name": "コモチサヨリ",
        "family": "サヨリ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "準絶滅危惧",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "卵ではなく直接稚魚を産む珍しいサヨリの仲間です。環境省や沖縄県で準絶滅危惧に指定されている希少な魚で、上流桟橋の穏やかな水面付近で生息が確認（検出）されました。"
    },
    {
        "id": "minami-kurodai",
        "name": "ミナミクロダイ",
        "family": "タイ科",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "絶滅危惧Ⅱ類",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "沖縄で「チン」と呼ばれ親しまれているクロダイの仲間です。世界的な基準（IUCN）では絶滅危惧Ⅱ類に指定されている貴重な魚で、仲間川の上流から下流まで広く生息が確認されています。"
    },
    {
        "id": "nihon-unagi",
        "name": "ニホンウナギ",
        "family": "ウナギ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "",
        "iucn": "絶滅危惧ⅠB類",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "世界的に絶滅が心配されているウナギです。海で生まれて川をさかのぼって成長する魚で、上流桟橋の豊かな淡水域で生息が確認されました。"
    },
    {
        "id": "yaeyama-nokogirihaze",
        "name": "ヤエヤマノコギリハゼ",
        "family": "カワアナゴ科",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "環境省の基準で最も絶滅の危険が高い「絶滅危惧ⅠA類」に指定されている大変希少な魚です。マングローブの根元や倒木の陰などをすみかとしており、仲間川の上流・下流の両方で検出されました。"
    },
    {
        "id": "hoshimadara-haze",
        "name": "ホシマダラハゼ",
        "family": "ハゼ科",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "成長すると体長40cm近くにも達する日本最大級のハゼです。環境省の絶滅危惧Ⅱ類に指定されている貴重な魚で、上流から河口まで仲間川の広い範囲で検出されました。"
    },
    {
        "id": "ruribouzu-haze",
        "name": "ルリボウズハゼ",
        "family": "ハゼ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-droplet",
        "desc": "オスの体が鮮やかな瑠璃色（青色）に輝くとても美しい小さなハゼです。環境省の絶滅危惧Ⅱ類に指定されています。綺麗な流れを好み、上流桟橋付近で検出されました。"
    },
    {
        "id": "yugoi-zoku",
        "name": "ユゴイ属の一種",
        "family": "ユゴイ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "澄んだ清流に生息するユゴイの仲間のDNAが上流桟橋で検出されました。トゲナガユゴイなど、絶滅危惧種に指定されている希少な魚が含まれるグループです。"
    },
    {
        "id": "tametomo-haze",
        "name": "タメトモハゼ",
        "family": "カワアナゴ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "頭が大きく太い体つきが迫力満点の大型ハゼです。環境省絶滅危惧ⅠB類に指定されています。上流桟橋周辺の倒木の陰など、流れの穏やかな深みに生息しています。"
    },
    {
        "id": "agohige-haze",
        "name": "アゴヒゲハゼ",
        "family": "ハゼ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "下あごに小さなヒゲのような突起がある大変珍しいハゼです。環境省・沖縄県ともに最高ランクの「絶滅危惧ⅠA類」に指定されており、上流桟橋で検出されました。"
    },
    {
        "id": "teppou-uo",
        "name": "テッポウウオ",
        "family": "テッポウウオ科",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-bullseye",
        "desc": "口から勢いよく水鉄砲を発射して、木にとまる昆虫を水面に落として食べることで有名な魚です。日本では西表島などにしかいない絶滅危惧ⅠA類の貴重な魚で、上流から下流まで広く生息が確認されました。"
    },
    {
        "id": "shimaisaki-ka",
        "name": "シマイサキ科の一種",
        "family": "シマイサキ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "シマイサキの仲間のDNAが上流桟橋で検出されました。このグループには絶滅危惧ⅠA類のシミズシマイサキなどが含まれており、川の淡水と汽水が交わる豊かな環境に生息しています。"
    },
    {
        "id": "eso-haze",
        "name": "エソハゼ",
        "family": "ハゼ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "細長いスマートな体が特徴的な、砂泥地に暮らすハゼです。沖縄県のレッドリストで最も危険度が高い絶滅危惧ⅠA類に指定されており、上流桟橋で検出されました。"
    },
    {
        "id": "nanyoubouzuhaze-zoku",
        "name": "ナンヨウボウズハゼ属の一種",
        "family": "ハゼ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-droplet",
        "desc": "南国ならではの鮮やかな色彩を持つボウズハゼの仲間のDNAが上流桟橋で検出されました。コンテリボウズハゼなど、絶滅危惧種に指定されている希少な魚が多く含まれるグループです。"
    },
    {
        "id": "minami-haze",
        "name": "ミナミハゼ",
        "family": "ハゼ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "南西諸島の限られた川の砂地に生息する小さなハゼです。沖縄県の準絶滅危惧に指定されています。上流桟橋付近の川底で検出されました。"
    },
    {
        "id": "fuuraibora-zoku",
        "name": "フウライボラ属の一種",
        "family": "ボラ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "大富漁港（河口付近）で検出されたボラの仲間です。絶滅危惧種であるナガレフウライボラなどが含まれるグループで、川と海を行き来しながら暮らしています。"
    },
    {
        "id": "abehaze-zoku",
        "name": "アベハゼ属の一種",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "マングローブの泥底を好むアベハゼの仲間のDNAが大富漁港で検出されました。絶滅危惧種であるホホグロハゼなどが含まれるグループです。"
    },
    {
        "id": "janome-haze",
        "name": "ジャノメハゼ",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "尾びれの付け根に丸い目玉のような模様があるのが特徴のハゼです。環境省の絶滅危惧ⅠB類に指定されています。河口付近（大富漁港）のマングローブ泥底で検出されました。"
    },
    {
        "id": "shimasaru-haze",
        "name": "シマサルハゼ",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "環境省・沖縄県ともに最高ランクの「絶滅危惧ⅠA類」に指定されている大変希少なハゼです。マングローブの柔らかな泥底に生息し、大富漁港周辺で検出されました。"
    },
    {
        "id": "kirarahaze-zoku",
        "name": "キララハゼ属の一種",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "体がキラキラと光る美しいハゼの仲間のDNAが大富漁港で検出されました。絶滅の恐れがあるキララハゼやニセツムギハゼなどが含まれるグループで、マングローブ干潟の浅瀬に生息しています。"
    },
    {
        "id": "higewarasubo-zoku",
        "name": "ヒゲワラスボ属の一種",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "ウナギのように細長く、あごにヒゲを持つ珍しい形の魚です。環境省の絶滅危惧Ⅱ類に指定されているグループで、大富漁港の深い泥の中に潜んで暮らしています。"
    },
    {
        "id": "himo-haze",
        "name": "ヒモハゼ",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "準絶滅危惧",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "名前の通りヒモのようにとても細長いユニークな姿をしたハゼです。環境省の準絶滅危惧に指定されており、大富漁港のマングローブ泥底で検出されました。"
    },
    {
        "id": "satsukihaze-zoku",
        "name": "サツキハゼ属の一種",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "体長2〜3cmほどしかない極小サイズのハゼの仲間のDNAが大富漁港で検出されました。コマチハゼなど絶滅危惧種が多く含まれるグループで、干潟の泥深くに生息しています。"
    },
    {
        "id": "ginpo-haze",
        "name": "ギンポハゼ",
        "family": "ハゼ科",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "準絶滅危惧",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "ギンポのように細長い体をした珍しいハゼです。環境省・沖縄県ともに絶滅危惧Ⅱ類に指定されています。大富漁港のマングローブ干潟の潮だまりで検出されました。"
    }
];

function initDnaGallery() {
    const dnaGrid = document.getElementById('dna-species-grid');
    const dnaDetail = document.getElementById('dna-detail-panel');
    const dnaTabBtns = document.querySelectorAll('.dna-tab-btn');

    if (!dnaGrid || !dnaDetail) return;

    let activeCategory = 'all';

    // 初期読み込み時に最初の生き物を表示
    renderDnaSpecies();

    // カテゴリタブ切り替え
    dnaTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            dnaTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.getAttribute('data-cat');
            renderDnaSpecies();
        });
    });

    function renderDnaSpecies() {
        dnaGrid.innerHTML = '';
        
        const filtered = DNA_SPECIES_DATA.filter(sp => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'upper') return sp.locs.includes('upper');
            if (activeCategory === 'ohtomi') return sp.locs.includes('ohtomi');
            if (activeCategory === 'cr_en') return sp.rankCategory === 'cr_en';
            if (activeCategory === 'vu_nt') return sp.rankCategory === 'vu_nt';
            return true;
        });

        if (filtered.length === 0) {
            dnaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">該当する生物が見つかりませんでした。</div>';
            dnaDetail.classList.remove('active');
            return;
        }

        filtered.forEach(sp => {
            const card = document.createElement('div');
            card.className = 'dna-item-card';
            card.setAttribute('data-id', sp.id);

            const isCr = sp.rankCategory === 'cr_en';
            const badgeDot = isCr ? '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; margin-left:4px;" title="絶滅危惧Ⅰ類"></span>' : '';

            card.innerHTML = `
                <div class="dna-item-icon"><i class="${sp.icon}"></i></div>
                <h4>${sp.name} ${badgeDot}</h4>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.dna-item-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                showDnaDetail(sp.id);
            });

            dnaGrid.appendChild(card);
        });

        // 絞り込んだ際、最初のカードを自動選択状態にする
        if (filtered.length > 0) {
            const firstCard = dnaGrid.querySelector('.dna-item-card');
            if (firstCard) {
                firstCard.classList.add('active');
                showDnaDetail(filtered[0].id);
            }
        }
    }

    function showDnaDetail(id) {
        const sp = DNA_SPECIES_DATA.find(s => s.id === id);
        if (!sp) return;

        let badgesHTML = '';
        if (sp.name.includes('一種')) {
            badgesHTML += `<span class="dna-detail-redlist badge-redlist-cr"><i class="fas fa-layer-group"></i> <strong>区分:</strong> 絶滅危惧種を含む仲間</span>`;
        } else {
            if (sp.moe) {
                const badgeClass = sp.moe.includes('ⅠA') ? 'badge-redlist-cr' : (sp.moe.includes('ⅠB') ? 'badge-redlist-en' : (sp.moe.includes('Ⅱ') ? 'badge-redlist-vu' : 'badge-redlist-nt'));
                badgesHTML += `<span class="dna-detail-redlist ${badgeClass}"><i class="fas fa-shield"></i> <strong>環境省:</strong> ${sp.moe}</span>`;
            }
            if (sp.okinawa) {
                const badgeClass = sp.okinawa.includes('ⅠA') ? 'badge-redlist-cr' : (sp.okinawa.includes('ⅠB') ? 'badge-redlist-en' : (sp.okinawa.includes('Ⅱ') ? 'badge-redlist-vu' : 'badge-redlist-nt'));
                badgesHTML += `<span class="dna-detail-redlist ${badgeClass}"><i class="fas fa-location-dot"></i> <strong>沖縄県:</strong> ${sp.okinawa}</span>`;
            }
            if (sp.iucn) {
                const badgeClass = sp.iucn.includes('Ⅰ') ? 'badge-redlist-cr' : (sp.iucn.includes('Ⅱ') ? 'badge-redlist-vu' : 'badge-redlist-nt');
                badgesHTML += `<span class="dna-detail-redlist ${badgeClass}"><i class="fas fa-globe"></i> <strong>IUCN:</strong> ${sp.iucn}</span>`;
            }
        }

        dnaDetail.innerHTML = `
            <div class="dna-detail-header">
                <div class="dna-detail-title">
                    <h4>${sp.name}</h4>
                    <span>分類: ${sp.family}</span>
                </div>
                <div class="dna-detail-spot"><i class="fas fa-map-marker-alt"></i> ${sp.spot}</div>
            </div>
            <div class="dna-detail-redlist-container">
                ${badgesHTML}
            </div>
            <div class="dna-detail-body">
                <p class="dna-detail-desc">${sp.desc}</p>
            </div>
        `;
        dnaDetail.classList.add('active');
    }
}
