/**
 * AegisBlock — Popup (i18n + estatísticas + animação de segurança)
 * Funciona como extensão (chrome.*) e como página de demonstração (fallback).
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------
  // i18n — 12 idiomas
  // ------------------------------------------------------------------
  const I18N = {
    "en": {
      extName: "AegisBlock", tagline: "Ad & Tracker Shield",
      protected: "You are protected", paused: "Protection paused",
      heroOn: "Blocking ads, trackers and threats across all sites.",
      heroOff: "Protection is off. Ads and trackers can follow you.",
      blockedToday: "blocked in total since activation",
      ads: "Ads", trackers: "Trackers", malware: "Threats", cosmetics: "Elements hidden",
      timeSaved: "Time saved", dataSaved: "Data saved",
      week: "Last 7 days", total: "Total",
      currentSite: "Current site", allow: "Allow here", disallow: "Re-block here",
      siteOn: "Protection active on this page", siteOff: "Protection paused on this page",
      settings: "Settings", stats: "Statistics", about: "About",
      powerOn: "Enable protection", powerOff: "Disable protection",
      urls: "blocklist URLs", version: "v",
      day: "d", hour: "h", min: "min",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "pt-BR": {
      extName: "AegisBlock", tagline: "Escudo contra Anúncios e Rastreadores",
      protected: "Você está protegido", paused: "Proteção pausada",
      heroOn: "Bloqueando anúncios, rastreadores e ameaças em todos os sites.",
      heroOff: "A proteção está desligada. Anúncios e rastreadores podem te seguir.",
      blockedToday: "bloqueados no total desde a ativação",
      ads: "Anúncios", trackers: "Rastreadores", malware: "Ameaças", cosmetics: "Elementos ocultos",
      timeSaved: "Tempo economizado", dataSaved: "Dados economizados",
      week: "Últimos 7 dias", total: "Total",
      currentSite: "Site atual", allow: "Permitir aqui", disallow: "Bloquear de novo",
      siteOn: "Proteção ativa nesta página", siteOff: "Proteção pausada nesta página",
      settings: "Configurações", stats: "Estatísticas", about: "Sobre",
      powerOn: "Ativar proteção", powerOff: "Desativar proteção",
      urls: "URLs na lista", version: "v",
      day: "d", hour: "h", min: "min",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "es": {
      extName: "AegisBlock", tagline: "Escudo contra Anuncios y Rastreadores",
      protected: "Estás protegido", paused: "Protección en pausa",
      heroOn: "Bloqueando anuncios, rastreadores y amenazas en todos los sitios.",
      heroOff: "La protección está apagada. Anuncios y rastreadores pueden seguirte.",
      blockedToday: "bloqueados en total desde la activación",
      ads: "Anuncios", trackers: "Rastreadores", malware: "Amenazas", cosmetics: "Elementos ocultos",
      timeSaved: "Tiempo ahorrado", dataSaved: "Datos ahorrados",
      week: "Últimos 7 días", total: "Total",
      currentSite: "Sitio actual", allow: "Permitir aquí", disallow: "Bloquear de nuevo",
      siteOn: "Protección activa en esta página", siteOff: "Protección en pausa en esta página",
      settings: "Ajustes", stats: "Estadísticas", about: "Acerca de",
      powerOn: "Activar protección", powerOff: "Desactivar protección",
      urls: "URLs en la lista", version: "v",
      day: "d", hour: "h", min: "min",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "fr": {
      extName: "AegisBlock", tagline: "Bouclier Anti-Pubs et Traqueurs",
      protected: "Vous êtes protégé", paused: "Protection en pause",
      heroOn: "Blocage des pubs, traqueurs et menaces sur tous les sites.",
      heroOff: "La protection est désactivée. Pubs et traqueurs peuvent vous suivre.",
      blockedToday: "bloqués au total depuis l'activation",
      ads: "Pubs", trackers: "Traqueurs", malware: "Menaces", cosmetics: "Éléments masqués",
      timeSaved: "Temps gagné", dataSaved: "Données économisées",
      week: "7 derniers jours", total: "Total",
      currentSite: "Site actuel", allow: "Autoriser ici", disallow: "Rebloquer ici",
      siteOn: "Protection active sur cette page", siteOff: "Protection en pause sur cette page",
      settings: "Réglages", stats: "Statistiques", about: "À propos",
      powerOn: "Activer la protection", powerOff: "Désactiver la protection",
      urls: "URLs dans la liste", version: "v",
      day: "j", hour: "h", min: "min",
      mb: "Mo", gb: "Go", kb: "Ko",
    },
    "de": {
      extName: "AegisBlock", tagline: "Werbe- & Tracker-Schutz",
      protected: "Sie sind geschützt", paused: "Schutz pausiert",
      heroOn: "Blockiert Werbung, Tracker und Bedrohungen auf allen Seiten.",
      heroOff: "Der Schutz ist deaktiviert. Werbung und Tracker können Sie verfolgen.",
      blockedToday: "insgesamt blockiert seit Aktivierung",
      ads: "Werbung", trackers: "Tracker", malware: "Bedrohungen", cosmetics: "Ausgeblendete Elemente",
      timeSaved: "Gesparte Zeit", dataSaved: "Gesparte Daten",
      week: "Letzte 7 Tage", total: "Gesamt",
      currentSite: "Aktuelle Seite", allow: "Hier erlauben", disallow: "Hier wieder blockieren",
      siteOn: "Schutz auf dieser Seite aktiv", siteOff: "Schutz auf dieser Seite pausiert",
      settings: "Einstellungen", stats: "Statistiken", about: "Über",
      powerOn: "Schutz aktivieren", powerOff: "Schutz deaktivieren",
      urls: "URLs in der Liste", version: "v",
      day: "T", hour: "h", min: "Min",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "it": {
      extName: "AegisBlock", tagline: "Scudo Anti-Pubblicità e Tracker",
      protected: "Sei protetto", paused: "Protezione in pausa",
      heroOn: "Blocca pubblicità, tracker e minacce su tutti i siti.",
      heroOff: "La protezione è disattivata. Pubblicità e tracker possono seguirti.",
      blockedToday: "bloccati in totale dall'attivazione",
      ads: "Pubblicità", trackers: "Tracker", malware: "Minacce", cosmetics: "Elementi nascosti",
      timeSaved: "Tempo risparmiato", dataSaved: "Dati risparmiati",
      week: "Ultimi 7 giorni", total: "Totale",
      currentSite: "Sito attuale", allow: "Consenti qui", disallow: "Blocca di nuovo",
      siteOn: "Protezione attiva in questa pagina", siteOff: "Protezione in pausa in questa pagina",
      settings: "Impostazioni", stats: "Statistiche", about: "Informazioni",
      powerOn: "Attiva protezione", powerOff: "Disattiva protezione",
      urls: "URL nella lista", version: "v",
      day: "g", hour: "h", min: "min",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "ja": {
      extName: "AegisBlock", tagline: "広告・トラッカー防止シールド",
      protected: "保護されています", paused: "保護は一時停止中",
      heroOn: "すべてのサイトで広告・トラッカー・脅威をブロックします。",
      heroOff: "保護はオフです。広告やトラッカーが追跡する可能性があります。",
      blockedToday: "有効化以降に合計でブロック",
      ads: "広告", trackers: "トラッカー", malware: "脅威", cosmetics: "非表示要素",
      timeSaved: "節約した時間", dataSaved: "節約したデータ",
      week: "過去7日間", total: "合計",
      currentSite: "現在のサイト", allow: "ここで許可", disallow: "ここで再ブロック",
      siteOn: "このページで保護が有効です", siteOff: "このページでは一時停止中です",
      settings: "設定", stats: "統計", about: "情報",
      powerOn: "保護を有効にする", powerOff: "保護を無効にする",
      urls: "リストのURL", version: "v",
      day: "日", hour: "時間", min: "分",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "zh-CN": {
      extName: "AegisBlock", tagline: "广告与跟踪器防护盾",
      protected: "您已受到保护", paused: "保护已暂停",
      heroOn: "在所有网站上拦截广告、跟踪器和威胁。",
      heroOff: "保护已关闭。广告和跟踪器可能会追踪您。",
      blockedToday: "自启用以来共计拦截",
      ads: "广告", trackers: "跟踪器", malware: "威胁", cosmetics: "隐藏元素",
      timeSaved: "节省的时间", dataSaved: "节省的流量",
      week: "最近7天", total: "总计",
      currentSite: "当前网站", allow: "在此允许", disallow: "在此重新拦截",
      siteOn: "此页面保护已启用", siteOff: "此页面保护已暂停",
      settings: "设置", stats: "统计", about: "关于",
      powerOn: "启用保护", powerOff: "停用保护",
      urls: "列表中的URL", version: "v",
      day: "天", hour: "小时", min: "分钟",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "ru": {
      extName: "AegisBlock", tagline: "Защита от рекламы и трекеров",
      protected: "Вы защищены", paused: "Защита приостановлена",
      heroOn: "Блокировка рекламы, трекеров и угроз на всех сайтах.",
      heroOff: "Защита выключена. Реклама и трекеры могут следить за вами.",
      blockedToday: "заблокировано всего с момента включения",
      ads: "Реклама", trackers: "Трекеры", malware: "Угрозы", cosmetics: "Скрытые элементы",
      timeSaved: "Сэкономлено времени", dataSaved: "Сэкономлено трафика",
      week: "Последние 7 дней", total: "Всего",
      currentSite: "Текущий сайт", allow: "Разрешить здесь", disallow: "Блокировать снова",
      siteOn: "Защита активна на этой странице", siteOff: "Защита приостановлена на этой странице",
      settings: "Настройки", stats: "Статистика", about: "О программе",
      powerOn: "Включить защиту", powerOff: "Выключить защиту",
      urls: "URL в списке", version: "в",
      day: "д", hour: "ч", min: "мин",
      mb: "МБ", gb: "ГБ", kb: "КБ",
    },
    "ko": {
      extName: "AegisBlock", tagline: "광고·트래커 차단 실드",
      protected: "보호받고 있습니다", paused: "보호 일시 중지됨",
      heroOn: "모든 사이트에서 광고, 트래커, 위협을 차단합니다.",
      heroOff: "보호가 꺼져 있습니다. 광고와 트래커가 사용자를 추적할 수 있습니다.",
      blockedToday: "활성화 이후 총 차단",
      ads: "광고", trackers: "트래커", malware: "위협", cosmetics: "숨겨진 요소",
      timeSaved: "절약한 시간", dataSaved: "절약한 데이터",
      week: "최근 7일", total: "총계",
      currentSite: "현재 사이트", allow: "여기서 허용", disallow: "여기서 다시 차단",
      siteOn: "이 페이지에서 보호가 활성화됨", siteOff: "이 페이지에서 보호 일시 중지됨",
      settings: "설정", stats: "통계", about: "정보",
      powerOn: "보호 켜기", powerOff: "보호 끄기",
      urls: "목록의 URL", version: "v",
      day: "일", hour: "시간", min: "분",
      mb: "MB", gb: "GB", kb: "KB",
    },
    "ar": {
      extName: "AegisBlock", tagline: "درع الإعلانات ومتتبعي البيانات",
      protected: "أنت محمي", paused: "الحماية متوقفة مؤقتًا",
      heroOn: "حظر الإعلانات ومتتبعي البيانات والتهديدات في جميع المواقع.",
      heroOff: "الحماية مغلقة. يمكن للإعلانات ومتتبعي البيانات أن تتابعك.",
      blockedToday: "تم حظرها إجمالًا منذ التفعيل",
      ads: "الإعلانات", trackers: "المتتبعون", malware: "التهديدات", cosmetics: "عناصر مخفية",
      timeSaved: "الوقت الموفّر", dataSaved: "البيانات الموفّرة",
      week: "آخر 7 أيام", total: "الإجمالي",
      currentSite: "الموقع الحالي", allow: "السماح هنا", disallow: "الحظر هنا مجددًا",
      siteOn: "الحماية نشطة في هذه الصفحة", siteOff: "الحماية متوقفة في هذه الصفحة",
      settings: "الإعدادات", stats: "الإحصائيات", about: "حول",
      powerOn: "تفعيل الحماية", powerOff: "إيقاف الحماية",
      urls: "رابط في القائمة", version: "v",
      day: "ي", hour: "س", min: "د",
      mb: "م.ب", gb: "ج.ب", kb: "ك.ب",
    },
    "hi": {
      extName: "AegisBlock", tagline: "विज्ञापन और ट्रैकर शील्ड",
      protected: "आप सुरक्षित हैं", paused: "सुरक्षा रोकी गई है",
      heroOn: "सभी साइटों पर विज्ञापन, ट्रैकर और खतरों को रोक रहा है।",
      heroOff: "सुरक्षा बंद है। विज्ञापन और ट्रैकर आपका पीछा कर सकते हैं।",
      blockedToday: "सक्रियण के बाद से कुल अवरुद्ध",
      ads: "विज्ञापन", trackers: "ट्रैकर", malware: "खतरे", cosmetics: "छिपे तत्व",
      timeSaved: "बचा समय", dataSaved: "बचा डेटा",
      week: "पिछले 7 दिन", total: "कुल",
      currentSite: "वर्तमान साइट", allow: "यहाँ अनुमति दें", disallow: "यहाँ फिर से रोकें",
      siteOn: "इस पेज पर सुरक्षा सक्रिय है", siteOff: "इस पेज पर सुरक्षा रुकी है",
      settings: "सेटिंग्स", stats: "आँकड़े", about: "परिचय",
      powerOn: "सुरक्षा चालू करें", powerOff: "सुरक्षा बंद करें",
      urls: "सूची में URL", version: "v",
      day: "दिन", hour: "घं", min: "मि",
      mb: "MB", gb: "GB", kb: "KB",
    },
  };

  const LANG_NAMES = {
    "en": "English", "pt-BR": "Português (BR)", "es": "Español", "fr": "Français",
    "de": "Deutsch", "it": "Italiano", "ja": "日本語", "zh-CN": "中文 (简体)",
    "ru": "Русский", "ko": "한국어", "ar": "العربية", "hi": "हिन्दी",
  };

  // chaves complementares por idioma
  const EXTRA = {
    "en": { since: "since activation", headlineOn: "Ad Shield Active", headlineOff: "Shield Disabled", totalBlocked: "Total blocked", list: "Blocklist", ago: "{x} ago", waiting: "waiting for first sync" },
    "pt-BR": { since: "desde a ativação", headlineOn: "Escudo Anti-Anúncios Ativo", headlineOff: "Escudo Desativado", totalBlocked: "Total bloqueado", list: "Lista de bloqueio", ago: "há {x}", waiting: "aguardando 1ª atualização" },
    "es": { since: "desde la activación", headlineOn: "Escudo Anti-Anuncios Activo", headlineOff: "Escudo Desactivado", totalBlocked: "Total bloqueado", list: "Lista de bloqueo", ago: "hace {x}", waiting: "esperando la 1ª actualización" },
    "fr": { since: "depuis l'activation", headlineOn: "Bouclier Anti-Pubs Actif", headlineOff: "Bouclier Désactivé", totalBlocked: "Total bloqué", list: "Liste de blocage", ago: "il y a {x}", waiting: "en attente de la 1re synchro" },
    "de": { since: "seit Aktivierung", headlineOn: "Werbeschutz Aktiv", headlineOff: "Schutz Deaktiviert", totalBlocked: "Gesamt blockiert", list: "Blockliste", ago: "vor {x}", waiting: "warte auf erste Aktualisierung" },
    "it": { since: "dall'attivazione", headlineOn: "Scudo Anti-Pubblicità Attivo", headlineOff: "Scudo Disattivato", totalBlocked: "Totale bloccato", list: "Lista di blocco", ago: "{x} fa", waiting: "in attesa del 1° aggiornamento" },
    "ja": { since: "有効化以降", headlineOn: "広告ブロック有効", headlineOff: "シールド無効", totalBlocked: "合計ブロック", list: "ブロックリスト", ago: "{x}前", waiting: "初回同期待ち" },
    "zh-CN": { since: "自启用以来", headlineOn: "广告防护已启用", headlineOff: "防护已关闭", totalBlocked: "总拦截", list: "拦截列表", ago: "{x}前", waiting: "等待首次同步" },
    "ru": { since: "с момента включения", headlineOn: "Защита от рекламы активна", headlineOff: "Защита отключена", totalBlocked: "Всего заблокировано", list: "Список блокировки", ago: "{x} назад", waiting: "ожидание первой синхронизации" },
    "ko": { since: "활성화 이후", headlineOn: "광고 차단 활성화됨", headlineOff: "실드 비활성화됨", totalBlocked: "총 차단", list: "차단 목록", ago: "{x} 전", waiting: "첫 동기화 대기 중" },
    "ar": { since: "منذ التفعيل", headlineOn: "درع الإعلانات نشط", headlineOff: "الدرع معطل", totalBlocked: "إجمالي المحظور", list: "قائمة الحظر", ago: "منذ {x}", waiting: "في انتظار أول مزامنة" },
    "hi": { since: "सक्रियण के बाद से", headlineOn: "विज्ञापन शील्ड सक्रिय", headlineOff: "शील्ड अक्षम", totalBlocked: "कुल अवरुद्ध", list: "ब्लॉक सूची", ago: "{x} पहले", waiting: "पहली सिंक की प्रतीक्षा" },
  };
  for (const code of Object.keys(EXTRA)) {
    if (I18N[code]) Object.assign(I18N[code], EXTRA[code]);
  }

  let lang = "pt-BR";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N["en"][k] || k;

  function detectLang() {
    const stored = readStorage("settings", {}).language;
    if (stored && I18N[stored]) return stored;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    if (I18N[nav]) return nav;
    const base = nav.split("-")[0];
    if (base === "pt") return "pt-BR";
    if (base === "zh") return "zh-CN";
    for (const k of Object.keys(I18N)) if (k.split("-")[0] === base) return k;
    return "en";
  }

  // ------------------------------------------------------------------
  // Storage (chrome.storage com fallback localStorage p/ demo)
  // ------------------------------------------------------------------
  const isExt = typeof chrome !== "undefined" && !!chrome.storage && !!chrome.runtime;

  function readStorage(key, fallback) {
    try {
      const raw = isExt ? localStorage.getItem("aegis_" + key) : localStorage.getItem("aegis_" + key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try {
      localStorage.setItem("aegis_" + key, JSON.stringify(value));
    } catch (e) {}
    if (isExt) {
      try { chrome.storage.local.set({ [key]: value }); } catch (e) {}
    }
  }

  function loadSettings() {
    return {
      enabled: true, whitelist: [], sitePaused: {}, language: "",
      ...readStorage("settings", {}),
    };
  }
  function saveSettings(s) { writeStorage("settings", s); }

  function loadStats() {
    const demo = {
      ads: 12847, trackers: 6233, malware: 118, cosmetics: 3921,
      sessions: 42, since: Date.now() - 1000 * 60 * 60 * 24 * 9,
      days: {}, lastReset: Date.now(),
    };
    // gera dias de demonstração coerentes
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      demo.days[key] = {
        ads: 900 + Math.floor(Math.random() * 1600),
        trackers: 400 + Math.floor(Math.random() * 900),
        malware: Math.floor(Math.random() * 30),
      };
    }
    return { ...demo, ...readStorage("stats", {}) };
  }

  // ------------------------------------------------------------------
  // Formatação
  // ------------------------------------------------------------------
  const fmt = (n) => {
    try {
      return new Intl.NumberFormat(lang.replace("-", "-")).format(Math.round(n));
    } catch (e) {
      return String(Math.round(n));
    }
  };

  function fmtTime(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} ${t("min")}`;
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
      return m ? `${h} ${t("hour")} ${m} ${t("min")}` : `${h} ${t("hour")}`;
    }
    const d = Math.floor(seconds / 86400), h = Math.round((seconds % 86400) / 3600);
    return h ? `${d} ${t("day")} ${h} ${t("hour")}` : `${d} ${t("day")}`;
  }

  function fmtBytes(bytes) {
    if (bytes < 1024) return `${bytes} ${t("kb")}`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} ${t("kb")}`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} ${t("mb")}`;
    return `${(bytes / 1073741824).toFixed(2)} ${t("gb")}`;
  }

  const AVG_AD_SECONDS = 5;       // ~5s de interrupção por anúncio
  const AVG_AD_BYTES = 350 * 1024; // ~350KB por anúncio bloqueado

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (k === "heroText") return;
      el.textContent = t(k);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
  }

  function render() {
    const settings = loadSettings();
    const stats = loadStats();
    const enabled = settings.enabled;

    applyI18n();

    // status
    const statusEl = document.getElementById("status");
    const heroEl = document.getElementById("hero");
    const powerEl = document.getElementById("power");
    statusEl.classList.toggle("off", !enabled);
    heroEl.classList.toggle("off", !enabled);
    powerEl.classList.toggle("off", !enabled);
    statusEl.querySelector(".txt").textContent = enabled ? t("protected") : t("paused");
    const total = (stats.ads || 0) + (stats.trackers || 0) + (stats.malware || 0);
    document.getElementById("headline").textContent = enabled ? t("headlineOn") : t("headlineOff");
    document.getElementById("heroText").innerHTML = enabled
      ? `${t("heroOn")}<br><b>${fmt(total)}</b> ${t("blockedToday")}`
      : `${t("heroOff")}`;

    // estatísticas
    document.getElementById("statAds").textContent = fmt(stats.ads || 0);
    document.getElementById("statTrack").textContent = fmt(stats.trackers || 0);
    document.getElementById("statMal").textContent = fmt(stats.malware || 0);
    document.getElementById("statCos").textContent = fmt(stats.cosmetics || 0);
    const grandTotal = (stats.ads || 0) + (stats.trackers || 0) + (stats.malware || 0) + (stats.cosmetics || 0);
    document.getElementById("totalN").textContent = fmt(grandTotal);
    // barras de proporção
    const maxVal = Math.max(1, stats.ads || 0, stats.trackers || 0, stats.malware || 0, stats.cosmetics || 0);
    document.getElementById("barAds").style.width = `${Math.max(4, ((stats.ads || 0) / maxVal) * 100)}%`;
    document.getElementById("barTrk").style.width = `${Math.max(4, ((stats.trackers || 0) / maxVal) * 100)}%`;
    document.getElementById("barMal").style.width = `${Math.max(4, ((stats.malware || 0) / maxVal) * 100)}%`;
    document.getElementById("barCos").style.width = `${Math.max(4, ((stats.cosmetics || 0) / maxVal) * 100)}%`;
    const powerLabel = document.getElementById("powerLabel");
    if (powerLabel) powerLabel.textContent = enabled ? "ON" : "OFF";

    const seconds = (stats.ads || 0) * AVG_AD_SECONDS;
    const bytes = (stats.ads || 0) * AVG_AD_BYTES;
    document.getElementById("valTime").textContent = fmtTime(seconds);
    document.getElementById("valData").textContent = fmtBytes(bytes);

    // gráfico 7 dias
    const bars = document.getElementById("bars");
    bars.innerHTML = "";
    const days = stats.days || {};
    const keys = Object.keys(days).sort().slice(-7);
    let max = 1;
    keys.forEach((k) => {
      const d = days[k];
      max = Math.max(max, (d.ads || 0) + (d.trackers || 0) + (d.malware || 0));
    });
    const dayLabels = {
      "pt-BR": ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
      "en": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
      "es": ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      "fr": ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"],
      "de": ["so", "mo", "di", "mi", "do", "fr", "sa"],
      "it": ["dom", "lun", "mar", "mer", "gio", "ven", "sab"],
      "ja": ["日", "月", "火", "水", "木", "金", "土"],
      "zh-CN": ["日", "一", "二", "三", "四", "五", "六"],
      "ru": ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
      "ko": ["일", "월", "화", "수", "목", "금", "토"],
      "ar": ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
      "hi": ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
    };
    const labels = dayLabels[lang] || dayLabels.en;
    keys.forEach((k) => {
      const d = days[k] || {};
      const col = document.createElement("div");
      col.className = "col";
      const totalDay = Math.max(1, (d.ads || 0) + (d.trackers || 0) + (d.malware || 0));
      const mk = (cls, val) => {
        const seg = document.createElement("div");
        seg.className = "seg " + cls;
        seg.style.height = `${Math.max(2, (val / max) * 46)}px`;
        if (val > 0) col.appendChild(seg);
      };
      mk("m", d.malware || 0);
      mk("t", d.trackers || 0);
      mk("a", d.ads || 0);
      const date = new Date(k + "T12:00:00");
      const lbl = document.createElement("div");
      lbl.className = "lbl";
      lbl.textContent = labels[date.getDay()] || "";
      col.appendChild(lbl);
      col.title = `${k}: ${fmt(totalDay)}`;
      bars.appendChild(col);
    });

    // site atual
    const siteD = document.getElementById("siteDomain");
    const siteS = document.getElementById("siteState");
    const siteBtn = document.getElementById("siteToggle");
    let domain = "youtube.com";
    if (isExt) {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].url) {
            try {
              const u = new URL(tabs[0].url);
              if (u.protocol.startsWith("http")) domain = u.hostname.replace(/^www\./, "");
            } catch (e) {}
          }
          paintSite(domain, settings, siteD, siteS, siteBtn);
        });
      } catch (e) {
        paintSite(domain, settings, siteD, siteS, siteBtn);
      }
    } else {
      paintSite(domain, settings, siteD, siteS, siteBtn);
    }

    // rodapé
    document.getElementById("verText").textContent = `v1.1.0`;
    const urlsBadge = document.getElementById("urlsBadge");
    if (urlsBadge) urlsBadge.textContent = "150.099";
  }

  function fmtAgo(ts) {
    if (!ts) return null;
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "1min";
    if (mins < 60) return `${mins}min`;
    const h = Math.round(mins / 60);
    if (h < 48) return `${h}h`;
    return `${Math.round(h / 24)}d`;
  }

  function renderListStatus(st) {
    const meta = document.getElementById("listMeta");
    const pill = document.getElementById("listPill");
    const sync = document.getElementById("listSync");
    if (!meta || !pill) return;
    if (!st) {
      meta.innerHTML = `<b>150.099</b> URLs · ${t("waiting")}`;
      return;
    }
    sync.classList.toggle("spinning", !!st.updating);
    const total = st.remoteCount || 150099;
    const ago = fmtAgo(st.lastSuccess);
    if (st.updating) {
      meta.innerHTML = `<b>${fmt(total)}</b> URLs · ${t("waiting")}`;
      pill.textContent = "···";
      pill.classList.remove("off");
      return;
    }
    const interval = st.autoUpdate === false ? null : (st.intervalHours || 5);
    if (ago) {
      meta.innerHTML = `<b>${fmt(total)}</b> URLs · ${t("ago").replace("{x}", ago)}`;
    } else {
      meta.innerHTML = `<b>${fmt(total)}</b> URLs · ${t("waiting")}`;
    }
    if (interval) {
      pill.textContent = `${interval}h`;
      pill.classList.remove("off");
    } else {
      pill.textContent = "OFF";
      pill.classList.add("off");
    }
    if (st.addedCount) {
      meta.innerHTML += ` · +${fmt(st.addedCount)}`;
    }
  }

  function loadListStatus() {
    if (!isExt) {
      renderListStatus({ remoteCount: 150099, lastSuccess: Date.now() - 2 * 3600000, autoUpdate: true, intervalHours: 5, addedCount: 128 });
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: "getListStatus" }, (res) => {
        if (res && res.status) renderListStatus(res.status);
        else renderListStatus(null);
      });
    } catch (e) {
      renderListStatus(null);
    }
  }

  function paintSite(domain, settings, siteD, siteS, siteBtn) {
    siteD.textContent = domain;
    const fav = document.getElementById("siteFav");
    if (fav) fav.textContent = (domain || "?").charAt(0).toUpperCase();
    const allowed = (settings.whitelist || []).includes(domain);
    siteBtn.textContent = allowed ? t("disallow") : t("allow");
    siteBtn.classList.toggle("allowed", allowed);
    siteS.textContent = allowed || !settings.enabled ? t("siteOff") : t("siteOn");
    siteBtn.onclick = () => {
      const s = loadSettings();
      s.whitelist = s.whitelist || [];
      const idx = s.whitelist.indexOf(domain);
      if (idx >= 0) s.whitelist.splice(idx, 1);
      else s.whitelist.push(domain);
      saveSettings(s);
      if (isExt) {
        try { chrome.runtime.sendMessage({ type: "setSettings", patch: { whitelist: s.whitelist } }); } catch (e) {}
      }
      render();
    };
  }

  // ------------------------------------------------------------------
  // Animação Lottie — cadeado de segurança
  // ------------------------------------------------------------------
  function initLottie(data) {
    const container = document.getElementById("lottie");
    if (!container || !data) return;
    if (typeof lottie === "undefined") {
      // fallback: SVG estático de cadeado
      container.innerHTML =
        '<svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="30" y="52" width="60" height="46" rx="10" fill="#2edc96"/>' +
        '<path d="M42 52 v-12 a18 18 0 0 1 36 0 v12" fill="none" stroke="#2edc96" stroke-width="9" stroke-linecap="round"/>' +
        '<circle cx="60" cy="72" r="6" fill="#0b1220"/><rect x="57" y="72" width="6" height="14" rx="3" fill="#0b1220"/></svg>';
      return;
    }
    try {
      const anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
      });
      window.__aegisAnim = anim;
    } catch (e) {}
  }

  function loadLottie() {
    if (window.__EMBEDDED_LOTTIE__) {
      initLottie(window.__EMBEDDED_LOTTIE__);
      return;
    }
    fetch("secure-lock.json")
      .then((r) => r.json())
      .then(initLottie)
      .catch(() => initLottie(null));
  }

  // ------------------------------------------------------------------
  // Eventos
  // ------------------------------------------------------------------
  function bind() {
    const powerEl = document.getElementById("power");
    powerEl.addEventListener("click", () => {
      const s = loadSettings();
      s.enabled = !s.enabled;
      saveSettings(s);
      if (isExt) {
        try { chrome.runtime.sendMessage({ type: "setSettings", patch: { enabled: s.enabled } }); } catch (e) {}
      }
      render();
    });

    const langEl = document.getElementById("lang");
    langEl.value = lang;
    langEl.addEventListener("change", () => {
      lang = langEl.value;
      const s = loadSettings();
      s.language = lang;
      saveSettings(s);
      render();
    });

    document.getElementById("linkStats").addEventListener("click", (e) => {
      e.preventDefault();
      alertDemo(t("stats"));
    });
    document.getElementById("linkSettings").addEventListener("click", (e) => {
      e.preventDefault();
      alertDemo(t("settings"));
    });
    document.getElementById("linkAbout").addEventListener("click", (e) => {
      e.preventDefault();
      alertDemo("AegisBlock v1.0.0 — " + t("tagline") + "\n150.099 " + t("urls"));
    });
  }

  function alertDemo(msg) {
    // Em contexto de extensão, abriria páginas internas; na demo mostra um toast
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(window.__toastT);
    window.__toastT = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  function boot() {
    lang = detectLang();
    const langEl = document.getElementById("lang");
    Object.keys(I18N).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LANG_NAMES[code] || code;
      langEl.appendChild(opt);
    });
    langEl.value = lang;
    bind();
    render();
    loadLottie();
    loadListStatus();
    // atualização ao vivo das estatísticas
    if (isExt) {
      setInterval(() => {
        try {
          chrome.runtime.sendMessage({ type: "getStats" }, (res) => {
            if (res && res.stats) {
              writeStorage("stats", res.stats);
              if (res.settings) writeStorage("settings", res.settings);
              render();
            }
          });
        } catch (e) {}
      }, 5000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
