/* 
========================================================================
仲間川地区保全利用協定 公式ホームページ インタラクティブロジック (script.js)
========================================================================
*/

// 潮汐データを格納するグローバル変数
let jmaTideRawData = '';

document.addEventListener('DOMContentLoaded', () => {
    // 1. レスポンシブナビゲーションとヘッダースクロール
    initNavigation();

    // 2. 潮汐データの非同期読み込みとダッシュボード初期化
    loadTideDataAndInit();

    // 3. ルール＆マナーのタブ切り替え
    initRuleTabs();

    // 4. 公認14事業者の検索＆フィルター絞り込み
    initOperatorFilter();

    // 5. 安全な環境DNA図鑑の制御（アカメ完全排除）
    initDnaGallery();
});

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
4. 公認14事業者の検索＆フィルター絞り込み
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
                条件に合う事業者は見つかりませんでした。
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
                `<span class="operator-status-text" style="color: var(--color-status-green);"><i class="fas fa-check-circle"></i> 公認営業中</span>`;

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
                        <div class="operator-num">公認番号 ${String(op.id).padStart(2, '0')}</div>
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
5. 環境DNAデジタル図鑑（アカメ完全排除・安全な生き物リスト）
========================================================================
*/
const DNA_SPECIES_DATA = [
    {
        id: "ryukyu-doro",
        name: "リュウキュウドロクイ",
        sci: "Nematalosa come",
        spot: "仲間川上流・中流",
        icon: "fas fa-fish",
        category: "upper",
        desc: "仲間川の上流・汽水域の砂泥底において、環境DNA調査で圧倒的に最も多く検出された主役的魚種です。プランクトンや泥の中の有機物を吸い取って食べる、マングローブの生態系循環を静かに支える重要な魚です。ルアーや釣り等の対象にはならず、安全に紹介可能です。"
    },
    {
        id: "okuchi-yugoi",
        name: "オオクチユゴイ",
        sci: "Kuhlia rupestris",
        sciExtra: "(ジャングルパーチ)",
        spot: "仲間川最上流 (淡水域)",
        icon: "fas fa-water",
        category: "upper",
        desc: "仲間川の遊覧船終点よりさらに上流の、澄み切った純淡水域や渓流部分に生息する魚です。昆虫や小魚を捕食し、非常にクリアな美しい水質があることの科学的な証拠（環境インジケーター）となっています。自然豊かな原始の川であることを物語っています。"
    },
    {
        id: "tametomo-haze",
        name: "タメトモハゼ",
        sci: "Ophiocara porocephala",
        spot: "中上流のマングローブ根元",
        icon: "fas fa-feather",
        category: "rare",
        desc: "環境省レッドリストで「絶滅危惧II類」に指定されている、極めて希少なハゼの仲間です。最大で20〜30cmほどに成長し、美しい斑点模様があります。マングローブの倒伏を抑えた結果、彼らの隠れ家となる複雑な根の隙間がしっかり守られている証拠として検出されています。"
    },
    {
        id: "kawa-anago",
        name: "カワアナゴ",
        sci: "Eleotris fusca",
        spot: "中下流域 of 泥底",
        icon: "fas fa-skull-crossbones", /* ハゼや底生を表現 */
        category: "lower",
        desc: "川底の泥や石の隙間に潜んで暮らすハゼに近い仲間です。「アナゴ」という名前ですがハゼの親戚です。仲間川の下流や泥底地帯の健全性を示す生き物であり、夜間に泥の中から這い出てきて小魚などを捕食する隠れた生態を持っています。"
    },
    {
        id: "prawn-group",
        name: "17種のテナガエビ類",
        sci: "Macrobrachium group",
        spot: "中流から最上流（全域）",
        icon: "fas fa-shrimp",
        category: "prawn",
        desc: "環境DNA調査（甲殻類特化プライマー）において、仲間川から驚くべき多様性を示す「17種類」のテナガエビ類のDNAが検出されました。ミナミテナガエビやコンジンテナガエビ、さらには希少なショキタテナガエビ等が含まれ、川の栄養段階と多様性が世界極限クラスである動かぬ証明となっています。"
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
    showDnaDetail(DNA_SPECIES_DATA[0].id);

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
            return activeCategory === 'all' || sp.category === activeCategory;
        });

        filtered.forEach(sp => {
            const card = document.createElement('div');
            card.className = 'dna-item-card';
            card.setAttribute('data-id', sp.id);

            card.innerHTML = `
                <div class="dna-item-icon"><i class="${sp.icon}"></i></div>
                <h4>${sp.name}</h4>
            `;

            card.addEventListener('click', () => {
                // アクティブクラスの切り替え
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

        const sciText = sp.sciExtra ? `${sp.sci} ${sp.sciExtra}` : sp.sci;

        dnaDetail.innerHTML = `
            <div class="dna-detail-header">
                <div class="dna-detail-title">
                    <h4>${sp.name}</h4>
                    <span>${sciText}</span>
                </div>
                <div class="dna-detail-spot"><i class="fas fa-map-marker-alt"></i> ${sp.spot}</div>
            </div>
            <div class="dna-detail-body">
                <p class="dna-detail-desc">${sp.desc}</p>
            </div>
        `;
        dnaDetail.classList.add('active');
    }
}
