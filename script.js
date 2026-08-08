/* 
========================================================================
仲間川地区保全利用協定 公式ホームページ インタラクティブロジック (script.js)
========================================================================
*/

// 潮汐データを格納するグローバル変数
let jmaTideRawData = '';

function initApp() {
    initNavigation();
    loadTideDataAndInit();
    initRuleTabs();
    initOperatorFilter();
    initDnaGallery();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 外部潮汐テキストファイル（tide-data.txt）を読み込んでダッシュボードを初期化する
async function loadTideDataAndInit() {
    const tideLevelVal = document.getElementById('tide-level-val');
    try {
        const response = await fetch('tide-data.txt');
        if (!response.ok) {
            throw new Error('潮汐データファイルの読み込みに失敗しました。');
        }
        jmaTideRawData = await response.text();
        initTideDashboard();
    } catch (error) {
        console.error('潮汐データの読み込みエラー:', error);
        if (tideLevelVal) {
            tideLevelVal.textContent = 'データ読込中/エラー';
            tideLevelVal.style.fontSize = '1.1rem';
            tideLevelVal.style.color = 'var(--color-accent-red)';
        }
        
        // ローカル閲覧時（パソコンのセキュリティ制限）への優しい警告
        if (window.location.protocol === 'file:') {
            const noticeText = document.querySelector('.dashboard-notice span');
            if (noticeText) {
                noticeText.innerHTML = '<strong>【ローカル閲覧用の案内】</strong> パソコンのセキュリティ制限により、直接ファイルをダブルクリックして開くと潮汐データが読み込めません（画面は動きません）。同梱されている<strong>「ローカルテスト起動.bat」</strong>をダブルクリックして動作確認を行ってください。';
                noticeText.parentElement.style.backgroundColor = 'rgba(211, 84, 0, 0.08)';
                noticeText.parentElement.style.borderTop = '1px dashed var(--color-accent-red)';
                const noticeIcon = document.querySelector('.dashboard-notice i');
                if (noticeIcon) {
                    noticeIcon.style.color = 'var(--color-accent-red)';
                    noticeIcon.className = 'fas fa-exclamation-triangle';
                }
            }
        }
    }
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
2. リアルタイム潮汐＆利用状況ダッシュボード
========================================================================
*/
function initTideDashboard() {
    const dashboardDate = document.getElementById('db-date');
    const tideLevelVal = document.getElementById('tide-level-val');
    const tideStatusBadge = document.getElementById('tide-status-badge');
    const boatStatusBadge = document.getElementById('boat-status-badge');
    const canoeStatusBadge = document.getElementById('canoe-status-badge');

    // 1. 日付の設定
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 更新`;
    if (dashboardDate) dashboardDate.textContent = formattedDate;

    const month = now.getMonth() + 1;
    const day = now.getDate();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // 2. 気象庁の年間予測データから本日分を抽出
    // 年月日キーの作成 (2026年は '26'、月と日は2桁スペース埋め)
    const yrStr = '26';
    const moStr = String(month).padStart(2, ' ');
    const dyStr = String(day).padStart(2, ' ');
    const dateKey = yrStr + moStr + dyStr;

    const lines = jmaTideRawData.trim().split('\n');
    let todayLine = '';
    for (let line of lines) {
        if (line.substring(72, 78) === dateKey) {
            todayLine = line;
            break;
        }
    }

    if (!todayLine) {
        // 万が一見つからない場合のフォールバック
        tideLevelVal.textContent = '--cm';
        return;
    }

    // 3. 潮位の取得と分単位の線形補間（滑らかな表示）
    // 毎時潮位は 1〜72カラム（インデックス 0〜71）に3桁ずつ格納されています
    const getHourTide = (h) => {
        const start = h * 3;
        return parseInt(todayLine.substring(start, start + 3).trim(), 10);
    };

    const tideHourCurrent = getHourTide(currentHour);
    const tideHourNext = getHourTide((currentHour + 1) % 24);
    
    // 現在の分に応じて、1時間の間を直線的をつないで滑らかに補間計算（線形補間）
    const currentTideHeight = tideHourCurrent + (tideHourNext - tideHourCurrent) * (currentMin / 60);

    // 4. 満潮・干潮データを解析して「大潮・小潮」や「直近のピーク」を特定
    // 満潮（81〜108カラム / インデックス 80〜107）：7桁（時刻4桁、潮位3桁）×最大4個
    const parsePeaks = (startIdx) => {
        const peaks = [];
        for (let i = 0; i < 4; i++) {
            const block = todayLine.substring(startIdx + i * 7, startIdx + (i + 1) * 7);
            const timeStr = block.substring(0, 4).trim();
            const heightStr = block.substring(4, 7).trim();
            if (timeStr !== '9999' && timeStr !== '') {
                const h = parseInt(timeStr.substring(0, timeStr.length - 2), 10);
                const m = parseInt(timeStr.substring(timeStr.length - 2), 10);
                const height = parseInt(heightStr, 10);
                peaks.push({ hour: h, min: m, height: height });
            }
        }
        return peaks;
    };

    const highTides = parsePeaks(80); // 満潮ピーク群
    const lowTides = parsePeaks(108); // 干潮ピーク群

    // 日潮差（最大満潮と最小干潮の差）から潮汐種別（大潮・中潮・小潮）を高精度判定！
    const maxHigh = highTides.length > 0 ? Math.max(...highTides.map(p => p.height)) : 150;
    const minLow = lowTides.length > 0 ? Math.min(...lowTides.map(p => p.height)) : 50;
    const tideRange = maxHigh - minLow;
    
    let tideType = '中潮';
    if (tideRange >= 150) tideType = '大潮';
    else if (tideRange <= 80) tideType = '小潮';
    else if (tideRange <= 100) tideType = '長潮・若潮';

    // 5. 潮汐ステータス（上げ潮・下げ潮・満潮・干潮）の決定
    let tideText = '通常水位';
    let tideStatusClass = 'status-ok';

    // 直近30分以内に満潮・干潮ピークがある場合は「満潮」「干潮」と表示
    const isNearPeak = (peaks) => {
        for (let p of peaks) {
            const diffMin = (p.hour * 60 + p.min) - (currentHour * 60 + currentMin);
            if (Math.abs(diffMin) <= 30) return true;
        }
        return false;
    };

    if (isNearPeak(highTides)) {
        tideText = '満潮（潮位十分）';
        tideStatusClass = 'status-ok';
    } else if (isNearPeak(lowTides)) {
        tideText = '干潮（潮位低下）';
        tideStatusClass = 'status-warning';
    } else {
        // 上げ潮か下げ潮かは、次の時間の潮位との高低差で判定
        tideText = (tideHourNext > tideHourCurrent) ? '上げ潮（満ち込み中）' : '下げ潮（引き潮中）';
        tideStatusClass = 'status-ok';
    }

    // 6. 各種ルール判定（水位連動）
    const isNight = currentHour >= 21 || currentHour <= 5; // 夜間時間外ルール

    let boatText = '';
    let boatClass = '';
    let canoeText = '';
    let canoeClass = '';

    // 夜間・早朝は潮位にかかわらず「進入禁止（時間外）」
    if (isNight) {
        tideLevelVal.textContent = `${Math.round(currentTideHeight)}cm (${tideType})`;
        
        tideStatusBadge.className = 'db-item-status status-danger';
        tideStatusBadge.innerHTML = '<span class="status-dot"></span>夜間閉鎖中';
        
        boatStatusBadge.className = 'db-item-status status-danger';
        boatStatusBadge.innerHTML = '<span class="status-dot"></span>夜間自主運休 (航行禁止)';
        
        canoeStatusBadge.className = 'db-item-status status-danger';
        canoeStatusBadge.innerHTML = '<span class="status-dot"></span>夜間・早朝入林禁止';
    } else {
        // 日中の運航ルール判定（気象庁の超精密潮位に基づく動的判定）
        tideLevelVal.textContent = `${Math.round(currentTideHeight)}cm (${tideType})`;
        
        tideStatusBadge.className = `db-item-status ${tideStatusClass}`;
        tideStatusBadge.innerHTML = `<span class="status-dot"></span>${tideText}`;

        // 動力船のルール：潮位が55cmを下回ると「浅瀬発生・折り返し運航」
        if (currentTideHeight < 55) {
            boatText = '浅瀬発生・折り返し運航';
            boatClass = 'status-warning';
        } else {
            boatText = '全域航行可能 (徐行厳守)';
            boatClass = 'status-ok';
        }
        boatStatusBadge.className = `db-item-status ${boatClass}`;
        boatStatusBadge.innerHTML = `<span class="status-dot"></span>${boatText}`;

        // カヌーのルール：潮位が45cmを下回ると「中上流浅瀬注意・団体禁止」
        if (currentTideHeight < 45) {
            canoeText = '中上流浅瀬注意・団体禁止';
            canoeClass = 'status-warning';
        } else {
            canoeText = '規制なし (ガイド同伴)';
            canoeClass = 'status-ok';
        }
        canoeStatusBadge.className = `db-item-status ${canoeClass}`;
        canoeStatusBadge.innerHTML = `<span class="status-dot"></span>${canoeText}`;
    }
}

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
        name: "西表島ツアー とんとんみー",
        rep: "余語 晶子",
        desc: "少人数で静かに自然とふれあう、五感を使った「おとなの自然観察ツアー」をご提供。チャイルドマインダー資格を持つガイドが優しく案内し、手話にも対応します。初心者やお子様連れも手軽に楽しめます！",
        types: ["canoe", "trekking"],
        hasPowerboat: false,
        hasCanoe: true,
        url: "https://www.churanesia.jp/ton/",
        isSuspended: false,
        mainTours: "半日カヌー＆マングローブ自然観察、干潟の生き物観察、夏の渓流遊び、ネイチャークラフト体験"
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
5. 仲間川環境DNAデジタル生物図鑑（第1回調査結果全38種）
========================================================================
*/
const DNA_SPECIES_DATA = [
    {
        "id": "komochi-sayori",
        "name": "コモチサヨリ",
        "family": "コモチサヨリ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "準絶滅危惧",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "卵ではなく子どもを産む卵胎生のサヨリ類。仲間川上流桟橋周辺の汽水～淡水域で検出され、豊かな水質環境の保全状態を物語っています。"
    },
    {
        "id": "minami-kurodai",
        "name": "ミナミクロダイ",
        "family": "クロダイ属",
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
        "desc": "南西諸島を代表する大型沿岸魚。上流桟橋から大富漁港まで広範囲の環境DNAで検出され、河川と海をつなぐ生態系の重要な一角を担っています。"
    },
    {
        "id": "okinawa-kichinu",
        "name": "オキナワキチヌ",
        "family": "クロダイ属",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "",
        "okinawa": "絶滅危惧ⅠB類",
        "iucn": "準絶滅危惧",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "沖縄特有の希少なクロダイ類。沖縄県レッドリストで絶滅危惧ⅠB類に指定されており、マングローブ干潟や河口域を重要な生育場としています。"
    },
    {
        "id": "nanyou-chinu",
        "name": "ナンヨウチヌ",
        "family": "クロダイ属",
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
        "desc": "環境省レッドリストで絶滅危惧Ⅱ類に指定。汽水域から河口域にかけて生息し、仲間川のマングローブ汽水域の質の高さを示す指標種です。"
    },
    {
        "id": "nihon-unagi",
        "name": "ニホンウナギ",
        "family": "ウナギ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "",
        "iucn": "絶滅危惧ⅠB類",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "国際自然保護連合（IUCN）で絶滅危惧ⅠB類に指定。マリアナ海溝から仲間川の上流まで回遊して育つ、河川生態系の保全度を示す象徴的種です。"
    },
    {
        "id": "yaeyama-nokogirihaze",
        "name": "ヤエヤマノコギリハゼ",
        "family": "ノコギリハゼ属",
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
        "desc": "環境省最高ランクの絶滅危惧ⅠA類に指定される極めて希少なカワアナゴ科の魚類。マングローブの根元や倒木陰を隠れ家とする貴重な種です。"
    },
    {
        "id": "hoshimadara-haze",
        "name": "ホシマダラハゼ",
        "family": "ホシマダラハゼ",
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
        "desc": "日本最大級のハゼの仲間で、30cm以上に成長。環境省絶滅危惧Ⅱ類。マングローブの泥底や汽水域の障害物に密着して生息しています。"
    },
    {
        "id": "ruri-bouzuhaze",
        "name": "ルリボウズハゼ",
        "family": "ルリボウズハゼ",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-water",
        "desc": "雄が美しい瑠璃色に輝く小型のハゼ。急流や上流域のきれいな渓流環境を好み、仲間川上流部の清流度の高さを示しています。"
    },
    {
        "id": "togenaga-yugoi",
        "name": "トゲナガユゴイ",
        "family": "ユゴイ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "沖縄県絶滅危惧ⅠA類、環境省ⅠB類に指定。純淡水域から純汽水域を行き来する魚類で、上流域の原始的景観と自然度の証です。"
    },
    {
        "id": "tametomo-haze",
        "name": "タメトモハゼ",
        "family": "タメトモハゼ",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "環境省絶滅危惧ⅠB類。最大30cmに達する大型ハゼで、マングローブの根元が波で削られず複雑に保たれている環境でのみ生き残れます。"
    },
    {
        "id": "agohige-haze",
        "name": "アゴヒゲハゼ",
        "family": "ウロハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県ともに最高ランクの絶滅危惧ⅠA類に指定。下あごに髭状の突起を持つ極めて希少な底生ハゼ類です。"
    },
    {
        "id": "konjiki-haze",
        "name": "コンジキハゼ",
        "family": "ウロハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県最高ランクの絶滅危惧ⅠA類。体に黄金色の光沢を持つ珍しいハゼで、仲間川上流の未攪乱の砂泥底環境に密着しています。"
    },
    {
        "id": "sudare-urohaze",
        "name": "スダレウロハゼ",
        "family": "ウロハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "準絶滅危惧",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省準絶滅危惧。汽水域の泥底に埋もれた木片やマングローブの根元を巣穴として利用する希少なウロハゼの仲間です。"
    },
    {
        "id": "teppou-uo",
        "name": "テッポウウオ",
        "family": "テッポウウオ属",
        "locs": [
            "upper",
            "ohtomi"
        ],
        "spot": "仲間川上流桟橋・大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-crosshairs",
        "desc": "水面上の昆虫に口から水鉄砲を発射して撃ち落とす有名な魚。環境省・沖縄県ともに絶滅危惧ⅠA類。仲間川全域の豊かなマングローブ林の象徴です。"
    },
    {
        "id": "shimizu-shimaisaki",
        "name": "シミズシマイサキ",
        "family": "シマイサキ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。清烈な湧水や淡水の影響を受ける汽水域にのみ現れる超希少魚類。仲間川の淡水供給の豊富さを証明しています。"
    },
    {
        "id": "nise-shimaisaki",
        "name": "ニセシマイサキ",
        "family": "シマイサキ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。黒い縦縞が美しいシマイサキ科の希少種。マングローブの幼魚保護育成場（ナーサリー）の機能を裏付けています。"
    },
    {
        "id": "yokoshima-isaki",
        "name": "ヨコシマイサキ",
        "family": "シマイサキ科",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。横縞模様が特徴的な小型イサキ類。絶滅の危険性が最も高いとされる種の一つです。"
    },
    {
        "id": "eso-haze",
        "name": "エソハゼ",
        "family": "エソハゼ",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "沖縄県絶滅危惧ⅠA類、環境省ⅠB類。鋭い歯を持ちエソに似た顔つきのハゼ。上流部の清澄な底質に生息しています。"
    },
    {
        "id": "konteri-bouzuhaze",
        "name": "コンテリボウズハゼ",
        "family": "ナンヨウボウズハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。鮮やかな紺照りの体色を持つ美しい渓流ハゼ。仲間川上流の自然環境が極めて高レベルで保たれている証拠です。"
    },
    {
        "id": "hayase-bouzuhaze",
        "name": "ハヤセボウズハゼ",
        "family": "ナンヨウボウズハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。早瀬（流れの速い浅瀬）の岩肌にへばりついて生活する、急流性ハゼ類の代表格です。"
    },
    {
        "id": "hisui-bouzuhaze",
        "name": "ヒスイボウズハゼ",
        "family": "ナンヨウボウズハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-gem",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。翡翠（ヒスイ）色の美しい体色を誇る極めて貴重な淡水ハゼで、日本の宝とも言える存在です。"
    },
    {
        "id": "minami-haze",
        "name": "ミナミハゼ",
        "family": "ミナミハゼ属",
        "locs": [
            "upper"
        ],
        "spot": "仲間川上流桟橋",
        "moe": "",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "沖縄県準絶滅危惧。南西諸島の河川中上流域に分布する小魚で、仲間川上流の安定した水生昆虫・付着藻類相を食支えとしています。"
    },
    {
        "id": "nagare-fuuraibora",
        "name": "ナガレフウライボラ",
        "family": "フウライボラ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-water",
        "desc": "沖縄県絶滅危惧ⅠA類、環境省ⅠB類。河口域の大富漁港周辺で検出されたボラ科の希少種。海と河川を行き来する広域生態系を示します。"
    },
    {
        "id": "hohoguro-haze",
        "name": "ホホグロハゼ",
        "family": "アベハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠB類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-fish",
        "desc": "環境省・沖縄県ともに絶滅危惧ⅠB類。頬に黒斑を持つ小型ハゼで、干潟の泥穴や小窪みをすみかとしています。"
    },
    {
        "id": "mujina-haze",
        "name": "ムジナハゼ",
        "family": "アベハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省絶滅危惧Ⅱ類。大富漁港周辺の泥底環境で検出されたアベハゼの仲間。浅瀬の未開発な泥干潟の存在を物語ります。"
    },
    {
        "id": "janome-haze",
        "name": "ジャノメハゼ",
        "family": "ジャノメハゼ",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-eye",
        "desc": "環境省絶滅危惧ⅠB類。尾ビレの付け根に大きな蛇の目（眼状斑）を持つ珍しいハゼ。干潟底生の固有生物群の重要種です。"
    },
    {
        "id": "shima-saruhaze",
        "name": "シマサルハゼ",
        "family": "サルハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。大富漁港の静穏な泥底環境で確認された、日本で最も絶滅が危ぶまれるハゼの一種です。"
    },
    {
        "id": "kirara-haze",
        "name": "キララハゼ",
        "family": "キララハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "絶滅危惧ⅠB類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-star",
        "desc": "沖縄県絶滅危惧ⅠB類、環境省Ⅱ類。体側にキラリと光る斑点を持つ美しいハゼで、河口のマングローブ泥底に生息します。"
    },
    {
        "id": "nise-tsumugihaze",
        "name": "ニセツムギハゼ",
        "family": "キララハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "準絶滅危惧",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省・沖縄県準絶滅危惧。ツムギハゼに酷似した希少ハゼ。大富漁港の干潟・汽水域の多様な底生環境を好みます。"
    },
    {
        "id": "hokuro-haze",
        "name": "ホクロハゼ",
        "family": "キララハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "準絶滅危惧",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省準絶滅危惧。体にホクロのような黒点が点在するキララハゼ属の珍種。河口部の泥深場を主要な生活圏としています。"
    },
    {
        "id": "hohoguro-sujihaze",
        "name": "ホホグロスジハゼ",
        "family": "キララハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "準絶滅危惧",
        "okinawa": "準絶滅危惧",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省・沖縄県準絶滅危惧。頬のライン模様が特徴的なハゼ。大富漁港周辺のマングローブ根元の泥地帯で保護されています。"
    },
    {
        "id": "hige-warasubo",
        "name": "ヒゲワラスボ",
        "family": "ヒゲワラスボ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-worm",
        "desc": "環境省・沖縄県絶滅危惧Ⅱ類。ウナギのように細長い体にひげを持つ珍魚。大富漁港の深い泥穴の中に潜んで暮らす非常にユニークな生物です。"
    },
    {
        "id": "himo-haze",
        "name": "ヒモハゼ",
        "family": "ヒモハゼ",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "準絶滅危惧",
        "okinawa": "",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-ribbon",
        "desc": "環境省準絶滅危惧。紐のように非常に極細な体形をしたハゼ。カニの穴などを穴居利用して生息しています。"
    },
    {
        "id": "kobito-haze",
        "name": "コビトハゼ",
        "family": "サツキハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠB類",
        "okinawa": "絶滅危惧ⅠB類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-shield-halved",
        "desc": "環境省・沖縄県絶滅危惧ⅠB類。成魚でも2cm程度の極小ハゼ。大富漁港のマングローブ水路群の繊細な環境を守る必要性を示しています。"
    },
    {
        "id": "komachi-haze",
        "name": "コマチハゼ",
        "family": "サツキハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。透明感ある小柄で美しいハゼ。非常に繊細で、水質濁りや環境変異に極めて敏感な希少種です。"
    },
    {
        "id": "hime-satsukihaze",
        "name": "ヒメサツキハゼ",
        "family": "サツキハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧ⅠA類",
        "okinawa": "絶滅危惧ⅠA類",
        "iucn": "",
        "rankCategory": "cr_en",
        "icon": "fas fa-triangle-exclamation",
        "desc": "環境省・沖縄県絶滅危惧ⅠA類。サツキハゼ属の中でも最も希少とされる種の一つで、西表島の大富漁港生態系の貴重さを示す金字塔です。"
    },
    {
        "id": "borneo-haze",
        "name": "ボルネオハゼ",
        "family": "サツキハゼ属",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "",
        "rankCategory": "vu_nt",
        "icon": "fas fa-globe",
        "desc": "環境省・沖縄県絶滅危惧Ⅱ類。東南アジアから八重山諸島にまたがる国際的黒潮生態系を象徴するサツキハゼの仲間です。"
    },
    {
        "id": "ginpo-haze",
        "name": "ギンポハゼ",
        "family": "ギンポハゼ",
        "locs": [
            "ohtomi"
        ],
        "spot": "大富漁港",
        "moe": "絶滅危惧Ⅱ類",
        "okinawa": "絶滅危惧Ⅱ類",
        "iucn": "準絶滅危惧",
        "rankCategory": "vu_nt",
        "icon": "fas fa-fish",
        "desc": "環境省・沖縄県絶滅危惧Ⅱ類、IUCN準絶滅危惧。ギンポのような長体とハゼの特徴をあわせ持つ、干潟潮だまりのユニークな希少生物です。"
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
