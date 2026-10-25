/**
 * AegisBlock — Página de configurações
 */
(() => {
  "use strict";

  const isExt = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.storage;
  const DEFAULTS = {
    enabled: true, blockAds: true, blockTrackers: true, blockMalware: true,
    cosmeticFiltering: true, youtubeShield: true, stealth: true,
    language: "", whitelist: [], sitePaused: {},
  };
  const DEFAULT_STATS = { ads: 0, trackers: 0, malware: 0, cosmetics: 0, days: {}, since: Date.now() };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem("aegis_" + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem("aegis_" + key, JSON.stringify(value)); } catch (e) {}
    if (isExt) { try { chrome.storage.local.set({ [key]: value }); } catch (e) {} }
  }

  function loadSettings() {
    return { ...DEFAULTS, ...read("settings", {}) };
  }
  function loadStats() {
    return { ...DEFAULT_STATS, ...read("stats", {}) };
  }

  const $ = (id) => document.getElementById(id);

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.__t);
    window.__t = setTimeout(() => el.classList.remove("show"), 2000);
  }

  function renderStats() {
    const s = loadStats();
    $("st-ads").textContent = (s.ads || 0).toLocaleString();
    $("st-trackers").textContent = (s.trackers || 0).toLocaleString();
    $("st-malware").textContent = (s.malware || 0).toLocaleString();
    $("st-cosmetics").textContent = (s.cosmetics || 0).toLocaleString();
  }

  function renderWhitelist() {
    const s = loadSettings();
    const box = $("whitelist");
    box.innerHTML = "";
    const list = s.whitelist || [];
    if (!list.length) {
      box.innerHTML = '<div class="wl-empty">Nenhum site na lista de exceções.</div>';
      return;
    }
    list.forEach((domain) => {
      const item = document.createElement("div");
      item.className = "wl-item";
      item.innerHTML = `<span>${domain}</span><button title="Remover">✕</button>`;
      item.querySelector("button").addEventListener("click", () => {
        const st = loadSettings();
        st.whitelist = (st.whitelist || []).filter((d) => d !== domain);
        write("settings", st);
        if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { whitelist: st.whitelist } });
        renderWhitelist();
        toast("Removido: " + domain);
      });
      box.appendChild(item);
    });
  }

  function bindToggle(id, key) {
    const el = $(id);
    if (!el) return;
    const s = loadSettings();
    el.checked = s[key] !== false;
    el.addEventListener("change", () => {
      const st = loadSettings();
      st[key] = el.checked;
      write("settings", st);
      if (isExt) {
        chrome.runtime.sendMessage({ type: "setSettings", patch: { [key]: el.checked } });
      }
      if (key === "enabled") paintBanner();
    });
  }

  function paintBanner() {
    const s = loadSettings();
    $("bannerTitle").textContent = s.enabled ? "Proteção ativa" : "Proteção pausada";
    $("bannerTitle").style.color = s.enabled ? "#2edc96" : "#ff5c6c";
  }

  function initLangSelect() {
    const sel = $("t-language");
    const langs = [
      ["", "Automático (do navegador)"],
      ["pt-BR", "Português (BR)"], ["en", "English"], ["es", "Español"],
      ["fr", "Français"], ["de", "Deutsch"], ["it", "Italiano"],
      ["ja", "日本語"], ["zh-CN", "中文 (简体)"], ["ru", "Русский"],
      ["ko", "한국어"], ["ar", "العربية"], ["hi", "हिन्दी"],
    ];
    langs.forEach(([v, label]) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = label;
      sel.appendChild(opt);
    });
    const s = loadSettings();
    sel.value = s.language || "";
    sel.addEventListener("change", () => {
      const st = loadSettings();
      st.language = sel.value;
      write("settings", st);
      if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { language: sel.value } });
      toast("Idioma atualizado");
    });
  }

  function initLottie(data) {
    const c = $("lottie");
    if (!c || !data) return;
    if (typeof lottie === "undefined") return;
    try {
      lottie.loadAnimation({
        container: c, renderer: "svg", loop: true, autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
      });
    } catch (e) {}
  }

  function loadLottie() {
    if (window.__EMBEDDED_LOTTIE__) { initLottie(window.__EMBEDDED_LOTTIE__); return; }
    fetch("../popup/secure-lock.json")
      .then((r) => r.json())
      .then(initLottie)
      .catch(() => {});
  }

  function boot() {
    ["t-enabled:enabled", "t-blockAds:blockAds", "t-blockTrackers:blockTrackers",
     "t-blockMalware:blockMalware", "t-cosmeticFiltering:cosmeticFiltering",
     "t-youtubeShield:youtubeShield", "t-stealth:stealth"].forEach((pair) => {
      const [id, key] = pair.split(":");
      bindToggle(id, key);
    });

    initLangSelect();
    paintBanner();
    renderStats();
    renderWhitelist();
    loadLottie();

    $("btnReset").addEventListener("click", () => {
      const fresh = { ...DEFAULT_STATS, since: Date.now(), days: {}, lastReset: Date.now() };
      write("stats", fresh);
      if (isExt) chrome.runtime.sendMessage({ type: "resetStats" });
      renderStats();
      toast("Estatísticas zeradas");
    });

    if (isExt) {
      try {
        chrome.runtime.sendMessage({ type: "getStats" }, (res) => {
          if (res && res.stats) { write("stats", res.stats); renderStats(); }
          if (res && res.settings) { write("settings", res.settings); renderWhitelist(); paintBanner(); }
        });
      } catch (e) {}
      setInterval(renderStats, 8000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
