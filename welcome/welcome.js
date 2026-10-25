/**
 * AegisBlock — Página de Boas-vindas + Tour guiado
 */
(() => {
  "use strict";

  const isExt = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.storage;

  // ---------------------------------------------------------------- i18n
  const I18N = {
    "pt-BR": {
      navFeatures: "Recursos", navTour: "Tour", navUpdate: "Atualização", navPrivacy: "Privacidade",
      openSettings: "Abrir configurações",
      eyebrow: "Instalação concluída · Proteção ativa",
      heroTitle: 'Sua navegação,<br /><span class="grad">limpa e protegida.</span>',
      heroLead: 'O AegisBlock bloqueia <b>anúncios, rastreadores e ameaças</b> no YouTube e em toda a web — com uma lista de bloqueio que <b>se atualiza sozinha</b>, interface em 12 idiomas e zero falso-positivo.',
      startTour: "Começar o tour",
      factUrls: "URLs bloqueadas", factHosts: "Hosts protegidos", factLangs: "Idiomas",
      factRules: "Regras ativas", factDomains: "Domínios curados", factSync: "Sincronização automática",
      chip1: "Proteção ativa", chip2: "Lista auto-atualizada", chip3: "YouTube sem anúncios",
      featTag: "Recursos",
      featTitle: 'Tudo que uma extensão profissional<br /><span class="grad">precisa ter.</span>',
      featLead: "Construída sobre o Manifest V3 com declarativeNetRequest, desempenho máximo e cuidado obsessivo para nunca bloquear o que não deve.",
      f1t: "YouTube sem anúncios",
      f1d: 'Remove adPlacements e playerAds antes do player processar. O vídeo nunca trava — e nenhum aviso de "ad blocker detectado".',
      f2t: "Lista que se atualiza sozinha",
      f2d: "A cada 5 horas (ou o intervalo que você escolher), a extensão baixa as URLs novas direto do arquivo raw — sem reinstalar nada.",
      f3t: "Zero falso-positivo",
      f3d: "Só domínios de ad-tech entram na lista. Bancos, lojas, streaming e login social nunca são bloqueados — verificado automaticamente.",
      f4t: "Estatísticas reais",
      f4d: "Anúncios, rastreadores e ameaças bloqueados em tempo real — por página e no total — com gráficos e estimativas de tempo/dados economizados.",
      f5t: "12 idiomas",
      f5d: "Interface completa em português, inglês, espanhol, francês, alemão, italiano, japonês, chinês, russo, coreano, árabe e hindi.",
      f6t: "Privacidade total",
      f6d: "Nenhum dado sai do seu navegador. Sem telemetria, sem conta, sem cadastro. Tudo roda localmente no seu dispositivo.",
      tourTag: "Tour guiado",
      tourTitle: 'Conheça o AegisBlock<br /><span class="grad">em 5 passos.</span>',
      prev: "← Voltar", next: "Avançar →",
      step: "Passo {a} de {b}",
      howTag: "Como funciona",
      howTitle: 'Três passos.<br /><span class="grad">Nenhum deles é seu.</span>',
      h1t: "Você instala", h1d: "Carregue a pasta em chrome://extensions e pronto. Nenhuma configuração é obrigatória.",
      h2t: "A proteção roda sozinha", h2d: "Regras de rede bloqueiam anúncios e rastreadores antes deles chegarem ao navegador.",
      h3t: "A lista se atualiza", h3d: "A cada 5h a extensão sincroniza com o arquivo raw do GitHub. Você não precisa fazer nada.",
      updTag: "Sempre atualizado",
      updTitle: 'URLs novas chegam sozinhas.<br /><span class="grad">Falsos positivos vão embora.</span>',
      updLead: "A extensão compara a lista embutida com o arquivo raw do repositório em intervalos configuráveis. Nenhuma atualização da extensão é necessária.",
      upd1: "URLs novas no arquivo raw → bloqueio imediato",
      upd2: "URLs removidas → exceção automática (corrige falsos positivos)",
      upd3: "Intervalo configurável: 1h, 3h, 5h, 12h, 24h, 48h ou manual",
      upd4: "Aceita fonte própria (fork, mirror ou lista customizada)",
      privTag: "Privacidade",
      privTitle: 'Seus dados ficam com você.<br /><span class="grad">Sempre.</span>',
      privLead: "Nenhum dado de navegação sai do seu dispositivo. Sem telemetria, sem contas, sem servidores. Código 100% aberto e auditável — licença MIT.",
      finishTour: "Concluir e abrir configurações",
      closePage: "Fechar esta página",
      footLocal: "100% local",
    },
    "en": {
      navFeatures: "Features", navTour: "Tour", navUpdate: "Updates", navPrivacy: "Privacy",
      openSettings: "Open settings",
      eyebrow: "Installation complete · Protection active",
      heroTitle: 'Your browsing,<br /><span class="grad">clean and protected.</span>',
      heroLead: 'AegisBlock blocks <b>ads, trackers and threats</b> on YouTube and across the web — with a blocklist that <b>updates itself</b>, a 12-language interface and zero false positives.',
      startTour: "Start the tour",
      factUrls: "Blocked URLs", factHosts: "Protected hosts", factLangs: "Languages",
      factRules: "Active rules", factDomains: "Curated domains", factSync: "Automatic sync",
      chip1: "Protection active", chip2: "Self-updating list", chip3: "YouTube without ads",
      featTag: "Features",
      featTitle: 'Everything a professional<br /><span class="grad">extension needs.</span>',
      featLead: "Built on Manifest V3 with declarativeNetRequest, maximum performance and obsessive care to never block what it shouldn't.",
      f1t: "YouTube without ads",
      f1d: 'Strips adPlacements and playerAds before the player processes them. Video never stalls — and no "ad blocker detected" warnings.',
      f2t: "A self-updating list",
      f2d: "Every 5 hours (or your chosen interval), the extension pulls new URLs straight from the raw file — no reinstall needed.",
      f3t: "Zero false positives",
      f3d: "Only ad-tech domains make it onto the list. Banks, stores, streaming and social login are never blocked — verified automatically.",
      f4t: "Real statistics",
      f4d: "Ads, trackers and threats blocked in real time — per page and overall — with charts and time/data savings estimates.",
      f5t: "12 languages",
      f5d: "Full interface in Portuguese, English, Spanish, French, German, Italian, Japanese, Chinese, Russian, Korean, Arabic and Hindi.",
      f6t: "Total privacy",
      f6d: "No data leaves your browser. No telemetry, no accounts, no sign-up. Everything runs locally on your device.",
      tourTag: "Guided tour",
      tourTitle: 'Meet AegisBlock<br /><span class="grad">in 5 steps.</span>',
      prev: "← Back", next: "Next →",
      step: "Step {a} of {b}",
      howTag: "How it works",
      howTitle: 'Three steps.<br /><span class="grad">None of them are yours.</span>',
      h1t: "You install", h1d: "Load the folder at chrome://extensions and you're done. No configuration required.",
      h2t: "Protection runs itself", h2d: "Network rules block ads and trackers before they even reach the browser.",
      h3t: "The list updates itself", h3d: "Every 5h the extension syncs with the GitHub raw file. You don't have to do anything.",
      updTag: "Always up to date",
      updTitle: 'New URLs arrive on their own.<br /><span class="grad">False positives disappear.</span>',
      updLead: "The extension compares the bundled list with the repository raw file at configurable intervals. No extension update is ever needed.",
      upd1: "New URLs in the raw file → blocked immediately",
      upd2: "Removed URLs → automatic exception (fixes false positives)",
      upd3: "Configurable interval: 1h, 3h, 5h, 12h, 24h, 48h or manual",
      upd4: "Custom source supported (fork, mirror or your own list)",
      privTag: "Privacy",
      privTitle: 'Your data stays with you.<br /><span class="grad">Always.</span>',
      privLead: "No browsing data leaves your device. No telemetry, no accounts, no servers. 100% open source and auditable — MIT license.",
      finishTour: "Finish & open settings",
      closePage: "Close this page",
      footLocal: "100% local",
    },
  };

  let lang = "pt-BR";
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N["pt-BR"][k] || k;

  // ---------------------------------------------------------------- Tour
  const TOUR = [
    {
      icon: "shield",
      color: "g",
      title: { "pt-BR": "Proteção em 1 clique", "en": "Protection in 1 click" },
      text: {
        "pt-BR": "Instalou, protegeu. O AegisBlock começa a bloquear anúncios, rastreadores e ameaças automaticamente em todos os sites — sem nenhuma configuração.",
        "en": "Install and you're protected. AegisBlock starts blocking ads, trackers and threats automatically on every site — no setup required.",
      },
      list: {
        "pt-BR": [
          "Bloqueio de rede antes do download (não gasta banda)",
          "Elementos de anúncio ocultos do layout instantaneamente",
          "Funciona em YouTube, redes sociais, notícias, streaming",
        ],
        "en": [
          "Network-level blocking before download (saves bandwidth)",
          "Ad elements hidden from the page layout instantly",
          "Works on YouTube, social media, news, streaming",
        ],
      },
    },
    {
      icon: "play",
      color: "a",
      title: { "pt-BR": "YouTube limpo, vídeo intacto", "en": "Clean YouTube, intact video" },
      text: {
        "pt-BR": "O escudo YouTube remove os anúncios do player por dentro — pré-rolls, banners e cards patrocinados — sem nunca tocar na requisição de vídeo.",
        "en": "The YouTube shield strips ads from inside the player — pre-rolls, banners and sponsored cards — without ever touching the video request.",
      },
      list: {
        "pt-BR": [
          "Sem travamentos, buffering ou 'ad blocker detectado'",
          "Música e vídeos longos tocam normalmente",
          "Overlays e sidebars promocionais também somem",
        ],
        "en": [
          "No stalls, buffering or 'ad blocker detected'",
          "Music and long videos play normally",
          "Overlays and promotional sidebars disappear too",
        ],
      },
    },
    {
      icon: "chart",
      color: "b",
      title: { "pt-BR": "Estatísticas reais, em tempo real", "en": "Real statistics, in real time" },
      text: {
        "pt-BR": "Cada anúncio, rastreador ou ameaça bloqueado é contabilizado na hora — por página e no total — com gráficos dos últimos 7 dias.",
        "en": "Every ad, tracker or threat blocked is counted live — per page and overall — with 7-day charts.",
      },
      list: {
        "pt-BR": [
          "Contador por página: veja o que foi bloqueado onde você está",
          "Tempo e dados economizados estimados em tempo real",
          "Gráfico semanal para acompanhar sua navegação",
        ],
        "en": [
          "Per-page counter: see what was blocked where you are",
          "Time and data savings estimated in real time",
          "Weekly chart to keep track of your browsing",
        ],
      },
    },
    {
      icon: "sync",
      color: "v",
      title: { "pt-BR": "A lista se atualiza sozinha", "en": "The list updates itself" },
      text: {
        "pt-BR": "A cada 5 horas a extensão baixa o arquivo raw do GitHub e aplica as mudanças: URLs novas viram bloqueio na hora; URLs removidas viram exceção.",
        "en": "Every 5 hours the extension pulls the GitHub raw file and applies changes: new URLs are blocked instantly; removed URLs become exceptions.",
      },
      list: {
        "pt-BR": [
          "Nunca mais precise atualizar a extensão por causa de lista",
          "Correções de falsos positivos chegam em horas",
          "Intervalo configurável de 1h a 48h — ou manual",
        ],
        "en": [
          "Never update the extension again just for the list",
          "False-positive fixes arrive within hours",
          "Configurable interval from 1h to 48h — or manual",
        ],
      },
    },
    {
      icon: "sliders",
      color: "c",
      title: { "pt-BR": "Controle total nas suas mãos", "en": "Total control in your hands" },
      text: {
        "pt-BR": "Ligue e desligue cada categoria de bloqueio, libere sites específicos, troque o idioma (12 opções) e acompanhe tudo pelo painel de configurações.",
        "en": "Toggle each blocking category, allowlist specific sites, switch language (12 options) and monitor everything from the settings panel.",
      },
      list: {
        "pt-BR": [
          "Whitelist por site em um clique",
          "Escudo YouTube e modo discreto opcionais",
          "Fonte da lista customizável (fork ou mirror próprio)",
        ],
        "en": [
          "Per-site allowlist in one click",
          "Optional YouTube shield and stealth mode",
          "Customizable list source (your own fork or mirror)",
        ],
      },
    },
  ];

  const ICONS = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2L20 5.2V11c0 5.25-3.4 9.3-8 11-4.6-1.7-8-5.75-8-11V5.2L12 2z"/><path d="M8.2 11.6l2.6 2.7 5-5.4"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><polygon points="10 9 15.5 12 10 15 10 9" fill="currentColor" stroke="none"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/><circle cx="12" cy="12" r="2.5"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h10"/><path d="M18 8h2"/><circle cx="16" cy="8" r="2"/><path d="M4 16h4"/><path d="M12 16h8"/><circle cx="10" cy="16" r="2"/></svg>',
  };

  let step = 0;

  function renderTour() {
    const s = TOUR[step];
    const n = String(step + 1).padStart(2, "0");
    document.getElementById("tourNum").textContent = n;
    document.getElementById("tourStepLabel").textContent = t("step")
      .replace("{a}", String(step + 1)).replace("{b}", String(TOUR.length));
    document.getElementById("tourTitle").textContent = s.title[lang] || s.title["pt-BR"];
    document.getElementById("tourText").textContent = s.text[lang] || s.text["pt-BR"];
    const iconBox = document.getElementById("tourIcon");
    iconBox.className = "big-ic " + s.color;
    iconBox.innerHTML = ICONS[s.icon] || ICONS.shield;
    // anima o pop
    iconBox.style.animation = "none";
    void iconBox.offsetWidth;
    iconBox.style.animation = "";

    const listEl = document.getElementById("tourList");
    listEl.innerHTML = "";
    const items = s.list[lang] || s.list["pt-BR"];
    items.forEach((txt) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="chk">✓</span><span>${txt}</span>`;
      listEl.appendChild(li);
    });

    document.getElementById("tourBar").style.width = `${((step + 1) / TOUR.length) * 100}%`;

    const dots = document.getElementById("tourDots");
    dots.innerHTML = "";
    TOUR.forEach((_, i) => {
      const b = document.createElement("button");
      if (i === step) b.className = "active";
      b.addEventListener("click", () => { step = i; renderTour(); });
      dots.appendChild(b);
    });

    document.getElementById("tourPrev").disabled = step === 0;
    document.getElementById("tourPrev").style.opacity = step === 0 ? "0.4" : "1";
    const nextBtn = document.getElementById("tourNext");
    nextBtn.textContent = step === TOUR.length - 1 ? t("finishTour") : t("next");
  }

  // ---------------------------------------------------------------- i18n apply
  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    renderTour();
  }

  // ---------------------------------------------------------------- dados reais
  async function loadFacts() {
    let facts = null;
    if (window.__FACTS__) {
      facts = window.__FACTS__;
    } else {
      try {
        const resp = await fetch("../data/facts.json");
        facts = await resp.json();
      } catch (e) {
        facts = null;
      }
    }
    if (!facts) return;
    const nf = new Intl.NumberFormat(lang === "pt-BR" ? "pt-BR" : "en-US");
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("factUrls", nf.format(facts.urls));
    set("factHosts", nf.format(facts.hosts));
    set("factLangs", String(facts.languages));
    set("stripUrls", nf.format(facts.urls));
    set("stripRules", nf.format(facts.rules));
    set("stripDomains", nf.format(facts.curatedDomains));
    set("footUrls", `${nf.format(facts.urls)} URLs`);
  }

  // ---------------------------------------------------------------- lottie
  function initLottie(data) {
    const c = document.getElementById("lottieHero");
    if (!c || !data || typeof lottie === "undefined") return;
    try {
      const anim = lottie.loadAnimation({
        container: c, renderer: "svg", loop: true, autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
      });
      anim.setSpeed(0.85);
    } catch (e) {}
  }
  function loadLottie() {
    if (window.__EMBEDDED_LOTTIE__) { initLottie(window.__EMBEDDED_LOTTIE__); return; }
    fetch("../popup/secure-lock.json").then((r) => r.json()).then(initLottie).catch(() => {});
  }

  // ---------------------------------------------------------------- ações
  function openSettings() {
    if (isExt) {
      try {
        chrome.runtime.sendMessage({ type: "openOptions" });
        return;
      } catch (e) {}
    }
    // demo: apenas avisa
    flashToast(lang === "en" ? "Settings would open here" : "As configurações abririam aqui");
  }

  function flashToast(msg) {
    let el = document.getElementById("wToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "wToast";
      el.style.cssText =
        "position:fixed;left:50%;bottom:26px;transform:translate(-50%,26px);" +
        "padding:12px 20px;border-radius:14px;font-size:12.5px;" +
        "font-weight:600;opacity:0;transition:all .28s;z-index:99;" +
        "font-family:inherit;border:1px solid";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translate(-50%,0)";
    });
    clearTimeout(window.__wt);
    window.__wt = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translate(-50%,26px)";
    }, 2200);
  }

  // ---------------------------------------------------------------- tema
  function getTheme() {
    try {
      const raw = localStorage.getItem("aegis_settings");
      if (raw) {
        const s = JSON.parse(raw);
        return s.theme === "light" ? "light" : "dark";
      }
    } catch (e) {}
    return "dark";
  }
  function applyTheme(theme) {
    document.body.dataset.theme = theme || getTheme();
  }
  function syncThemeFromExt() {
    if (!isExt) return;
    try {
      chrome.storage.local.get(["settings"], (data) => {
        const s = data && data.settings;
        if (s && s.theme) {
          applyTheme(s.theme);
          try {
            const raw = localStorage.getItem("aegis_settings");
            const cur = raw ? JSON.parse(raw) : {};
            cur.theme = s.theme;
            localStorage.setItem("aegis_settings", JSON.stringify(cur));
          } catch (e) {}
        }
      });
    } catch (e) {}
  }
  function toggleTheme() {
    let s = {};
    try {
      const raw = localStorage.getItem("aegis_settings");
      if (raw) s = JSON.parse(raw);
    } catch (e) {}
    s.theme = getTheme() === "light" ? "dark" : "light";
    try { localStorage.setItem("aegis_settings", JSON.stringify(s)); } catch (e) {}
    if (isExt) {
      try { chrome.runtime.sendMessage({ type: "setSettings", patch: { theme: s.theme } }); } catch (e) {}
    }
    applyTheme();
  }

  function boot() {
    applyTheme();
    syncThemeFromExt();
    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    // idioma inicial: do navegador
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || "pt-BR";
    lang = nav.toLowerCase().startsWith("pt") ? "pt-BR" : "en";

    document.getElementById("langToggle").querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === lang);
      b.addEventListener("click", () => {
        lang = b.dataset.lang;
        document.getElementById("langToggle").querySelectorAll("button").forEach((x) =>
          x.classList.toggle("active", x.dataset.lang === lang)
        );
        document.documentElement.lang = lang;
        applyI18n();
        loadFacts();
      });
    });

    applyI18n();
    loadFacts();
    loadLottie();

    // tour
    document.getElementById("tourNext").addEventListener("click", () => {
      if (step < TOUR.length - 1) {
        step++;
        renderTour();
        document.getElementById("tour").scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        openSettings();
      }
    });
    document.getElementById("tourPrev").addEventListener("click", () => {
      if (step > 0) { step--; renderTour(); }
    });

    const goTour = () => document.getElementById("tour").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("ctaTour").addEventListener("click", goTour);
    document.getElementById("navCta").addEventListener("click", openSettings);
    document.getElementById("ctaSettings").addEventListener("click", openSettings);
    document.getElementById("ctaSettings2").addEventListener("click", openSettings);
    document.getElementById("ctaClose").addEventListener("click", () => {
      if (isExt) {
        try { chrome.runtime.sendMessage({ type: "closeSelf" }); return; } catch (e) {}
      }
      window.close();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
