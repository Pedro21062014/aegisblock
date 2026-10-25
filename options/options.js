/**
 * AegisBlock — Página de configurações (com painel de atualização de listas)
 */
(() => {
  "use strict";

  const isExt = typeof chrome !== "undefined" && !!chrome.runtime && !!chrome.storage;
  const DEFAULT_RAW_URL =
    "https://raw.githubusercontent.com/Pedro21062014/aegisblock/main/data/blocklist_urls.txt";

  const DEFAULTS = {
    enabled: true, blockAds: true, blockTrackers: true, blockMalware: true,
    cosmeticFiltering: true, youtubeShield: true, stealth: true,
    language: "", whitelist: [], sitePaused: {},
    autoUpdate: true, intervalHours: 5, sourceUrl: DEFAULT_RAW_URL,
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

  function loadSettings() { return { ...DEFAULTS, ...read("settings", {}) }; }
  function loadStats() { return { ...DEFAULT_STATS, ...read("stats", {}) }; }

  const $ = (id) => document.getElementById(id);

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.__t);
    window.__t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  // ---------------------------------------------------------- estatísticas
  function renderStats() {
    const s = loadStats();
    $("st-ads").textContent = (s.ads || 0).toLocaleString("pt-BR");
    $("st-trackers").textContent = (s.trackers || 0).toLocaleString("pt-BR");
    $("st-malware").textContent = (s.malware || 0).toLocaleString("pt-BR");
    $("st-cosmetics").textContent = (s.cosmetics || 0).toLocaleString("pt-BR");
  }

  // ---------------------------------------------------------- whitelist
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

  // ---------------------------------------------------------- toggles
  function bindToggle(id, key) {
    const el = $(id);
    if (!el) return;
    const s = loadSettings();
    el.checked = s[key] !== false;
    el.addEventListener("change", () => {
      const st = loadSettings();
      st[key] = el.checked;
      write("settings", st);
      if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { [key]: el.checked } });
      if (key === "enabled") paintBanner();
      if (key === "autoUpdate") renderUpdateStatus(window.__listStatus);
    });
  }

  function paintBanner() {
    const s = loadSettings();
    $("bannerTitle").textContent = s.enabled ? "Proteção ativa" : "Proteção pausada";
    $("bannerTitle").style.color = s.enabled ? "#2ee6a8" : "#ff6b7d";
  }

  // ---------------------------------------------------------- idioma
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

  // ---------------------------------------------------------- atualização
  function fmtAgo(ts) {
    if (!ts) return "—";
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 48) return `há ${h} h`;
    return `há ${Math.round(h / 24)} d`;
  }
  function fmtNext(ts) {
    if (!ts) return "—";
    const mins = Math.round((ts - Date.now()) / 60000);
    if (mins <= 0) return "agora";
    if (mins < 60) return `em ${mins} min`;
    const h = Math.floor(mins / 60);
    return `em ${h} h ${String(mins % 60).padStart(2, "0")}`;
  }

  function renderUpdateStatus(st) {
    window.__listStatus = st;
    const s = loadSettings();
    const lastEl = $("st-last"), nextEl = $("st-next"), remoteEl = $("st-remote"),
      addedEl = $("st-added"), removedEl = $("st-removed"), stateEl = $("st-state");
    if (!st) {
      stateEl.textContent = "—";
      return;
    }
    lastEl.textContent = fmtAgo(st.lastSuccess);
    nextEl.textContent = s.autoUpdate === false ? "manual" : fmtNext(st.nextAt || (st.lastSuccess + (s.intervalHours || 5) * 3600000));
    remoteEl.textContent = (st.remoteCount || 0).toLocaleString("pt-BR");
    addedEl.textContent = st.addedCount ? "+" + st.addedCount.toLocaleString("pt-BR") : "0";
    removedEl.textContent = st.removedCount ? st.removedCount.toLocaleString("pt-BR") : "0";

    if (st.updating) {
      stateEl.textContent = "SINCRONIZANDO…";
      stateEl.className = "v warn";
    } else if (st.lastError) {
      stateEl.textContent = "ERRO DE REDE";
      stateEl.className = "v err";
      stateEl.title = st.lastError;
    } else if (st.unchanged) {
      stateEl.textContent = "JÁ ATUALIZADA";
      stateEl.className = "v cy";
    } else {
      stateEl.textContent = "OK";
      stateEl.className = "v ok";
    }
  }

  function bindUpdateControls() {
    const s = loadSettings();
    $("t-autoUpdate").checked = s.autoUpdate !== false;
    $("t-interval").value = String(s.intervalHours ?? 5);
    $("t-sourceUrl").value = s.sourceUrl || DEFAULT_RAW_URL;

    $("t-autoUpdate").addEventListener("change", () => {
      const st = loadSettings();
      st.autoUpdate = $("t-autoUpdate").checked;
      write("settings", st);
      if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { autoUpdate: st.autoUpdate } });
      toast(st.autoUpdate ? "Atualização automática ativada" : "Atualização automática desativada");
      refreshListStatus();
    });

    $("t-interval").addEventListener("change", () => {
      const st = loadSettings();
      st.intervalHours = Number($("t-interval").value);
      write("settings", st);
      if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { intervalHours: st.intervalHours } });
      toast(st.intervalHours ? `Intervalo: a cada ${st.intervalHours} h` : "Somente atualização manual");
      refreshListStatus();
    });

    let urlTimer = null;
    $("t-sourceUrl").addEventListener("change", () => {
      clearTimeout(urlTimer);
      urlTimer = setTimeout(() => {
        const st = loadSettings();
        st.sourceUrl = $("t-sourceUrl").value.trim() || DEFAULT_RAW_URL;
        write("settings", st);
        if (isExt) chrome.runtime.sendMessage({ type: "setSettings", patch: { sourceUrl: st.sourceUrl } });
        toast("Fonte da lista atualizada");
        refreshListStatus();
      }, 400);
    });

    $("btnUpdateNow").addEventListener("click", () => {
      const btn = $("btnUpdateNow");
      btn.disabled = true;
      btn.textContent = "⟳ Sincronizando…";
      const finish = (status) => {
        btn.disabled = false;
        btn.textContent = "⟳ Atualizar agora";
        renderUpdateStatus(status);
        if (status && status.lastError) toast("Falha ao atualizar: " + status.lastError);
        else if (status && status.unchanged) toast("Lista já estava atualizada ✓");
        else if (status) {
          const n = (status.addedCount || 0) + (status.removedCount || 0);
          toast(n ? `Lista sincronizada ✓ · ${n} mudança(s)` : "Lista sincronizada ✓");
        }
        renderStats();
      };
      if (isExt) {
        chrome.runtime.sendMessage({ type: "listUpdateNow" }, (res) => {
          if (res && res.status) finish(res.status);
          else finish({ lastError: "sem resposta" });
        });
      } else {
        setTimeout(() => finish({
          lastSuccess: Date.now(), remoteCount: 150227, addedCount: 128,
          removedCount: 3, unchanged: false, nextAt: Date.now() + 5 * 3600000,
        }), 900);
      }
    });
  }

  function refreshListStatus() {
    if (!isExt) {
      renderUpdateStatus({
        lastSuccess: Date.now() - 2 * 3600000, remoteCount: 150227,
        addedCount: 128, removedCount: 3, nextAt: Date.now() + 3 * 3600000,
      });
      return;
    }
    chrome.runtime.sendMessage({ type: "getListStatus" }, (res) => {
      renderUpdateStatus((res && res.status) || null);
    });
  }

  // ---------------------------------------------------------- lottie
  function initLottie(data) {
    const c = $("lottie");
    if (!c || !data) return;
    if (typeof lottie === "undefined") return;
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
    fetch("../popup/secure-lock.json")
      .then((r) => r.json())
      .then(initLottie)
      .catch(() => {});
  }

  // ---------------------------------------------------------- boot
  function boot() {
    ["t-enabled:enabled", "t-blockAds:blockAds", "t-blockTrackers:blockTrackers",
     "t-blockMalware:blockMalware", "t-cosmeticFiltering:cosmeticFiltering",
     "t-youtubeShield:youtubeShield", "t-stealth:stealth", "t-autoUpdate:autoUpdate"]
      .forEach((pair) => {
        const [id, key] = pair.split(":");
        if (key === "autoUpdate") return; // tratado em bindUpdateControls
        bindToggle(id, key);
      });

    initLangSelect();
    bindUpdateControls();
    paintBanner();
    renderStats();
    renderWhitelist();
    loadLottie();
    refreshListStatus();

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
      setInterval(refreshListStatus, 30000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
