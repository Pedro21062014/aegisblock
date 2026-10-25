/**
 * AegisBlock — Escudo YouTube (executado no mundo MAIN)
 *
 * Estratégia "sem bloquear errado":
 *  - NÃO bloqueia requisições de mídia (googlevideo.com) — o vídeo nunca quebra.
 *  - Remove apenas os campos de anúncio (adPlacements / playerAds / adSlots)
 *    das respostas do player ANTES de o player processar.
 *  - Pula automaticamente anúncios que já teriam renderizado.
 *  - Não toca em variáveis globais com nomes óbvios (stealth).
 */
(() => {
  "use strict";
  if (window.__abGuard) return;
  window.__abGuard = true;

  const AD_KEYS = [
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
    "adBreakServiceMessage",
    "adPlacementConfig",
    "adPlacementsSerializedState",
    "adSlotsSerializedState",
    "adSignalsInfo",
    "adBreakHeartbeatParams",
    "adParams",
    "adbreakerResult",
    "displayAdRenderer",
    "promotedSparklesWebRenderer",
    "promotedVideoRenderer",
    "companionAdRenderer",
    "merchShelfRenderer",
  ];

  function sanitize(obj, depth) {
    if (!obj || typeof obj !== "object" || depth > 8) return obj;
    if (Array.isArray(obj)) {
      const out = [];
      for (const item of obj) {
        const s = sanitize(item, depth + 1);
        if (s !== undefined) out.push(s);
      }
      return out;
    }
    const out = {};
    for (const k of Object.keys(obj)) {
      if (AD_KEYS.includes(k)) continue;
      // remove configs de intervalo de anúncios no streaming
      if (k === "playerConfig" && obj[k] && typeof obj[k] === "object") {
        const clone = { ...obj[k] };
        delete clone.adParams;
        out[k] = sanitize(clone, depth + 1);
        continue;
      }
      out[k] = sanitize(obj[k], depth + 1);
    }
    // normaliza playbackTracking ads
    if (out.playbackTracking && typeof out.playbackTracking === "object") {
      delete out.playbackTracking.oeStatsUrl;
      delete out.playbackTracking.pingingForced;
    }
    return out;
  }

  function sanitizeJsonText(text) {
    try {
      if (typeof text !== "string") return text;
      if (text.indexOf("adPlacements") === -1 && text.indexOf("playerAds") === -1) return text;
      const data = JSON.parse(text);
      const clean = sanitize(data, 0);
      return JSON.stringify(clean);
    } catch (e) {
      return text;
    }
  }

  // ---- 1) ytInitialPlayerResponse (resposta inicial embutida) -------------
  try {
    let _initial = window.ytInitialPlayerResponse;
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      get() {
        return _initial ? sanitize(_initial, 0) : _initial;
      },
      set(v) {
        try {
          _initial = v ? sanitize(v, 0) : v;
        } catch (e) {
          _initial = v;
        }
      },
    });
    if (_initial) _initial = sanitize(_initial, 0);
  } catch (e) {}

  // yt.config_ / ytplayer.config não devem ser tocados agressivamente;
  // apenas neutralizamos o timeout de ads quando presente.
  try {
    if (window.yt && window.yt.config_ && window.yt.config_.EXPERIMENT_FLAGS) {
      window.yt.config_.EXPERIMENT_FLAGS.html5_enable_adaptation_fix = true;
    }
  } catch (e) {}

  // ---- 2) fetch -----------------------------------------------------------
  try {
    const nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : input && input.url ? input.url : "";
        if (/\/youtubei\/v1\/(player|next|browse|search)/.test(url) || /get_video_info/.test(url)) {
          return nativeFetch.call(this, input, init).then((resp) => {
            try {
              const clone = resp.clone();
              return clone.text().then((text) => {
                const clean = sanitizeJsonText(text);
                return new Response(clean, {
                  status: resp.status,
                  statusText: resp.statusText,
                  headers: resp.headers,
                });
              });
            } catch (e) {
              return resp;
            }
          });
        }
      } catch (e) {}
      return nativeFetch.call(this, input, init);
    };
  } catch (e) {}

  // ---- 3) XMLHttpRequest --------------------------------------------------
  try {
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    XHR.open = function (method, url) {
      this.__abUrl = url || "";
      return open.apply(this, arguments);
    };
    XHR.send = function () {
      try {
        if (/\/youtubei\/v1\/(player|next|browse|search)/.test(this.__abUrl || "") ||
            /get_video_info/.test(this.__abUrl || "")) {
          this.addEventListener("load", function () {
            try {
              if (this.responseType && this.responseType !== "" && this.responseType !== "text") return;
              const clean = sanitizeJsonText(this.responseText);
              if (clean !== this.responseText) {
                Object.defineProperty(this, "responseText", { configurable: true, get: () => clean });
                Object.defineProperty(this, "response", { configurable: true, get: () => clean });
              }
            } catch (e) {}
          });
        }
      } catch (e) {}
      return send.apply(this, arguments);
    };
  } catch (e) {}

  // ---- 4) Pula anúncios renderizados + limpa overlays ---------------------
  function skipAds() {
    try {
      const btn =
        document.querySelector(".ytp-ad-skip-button") ||
        document.querySelector(".ytp-ad-skip-button-modern") ||
        document.querySelector(".ytp-skip-ad-button") ||
        document.querySelector("button.ytp-ad-skip-button-slot button") ||
        document.querySelector(".ytp-ad-skip-button-slot");
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return;
      }
      const player = document.querySelector(".html5-video-player");
      if (player && player.classList && player.classList.contains("ad-showing")) {
        const video = document.querySelector(".html5-main-video");
        if (video && video.duration && isFinite(video.duration)) {
          try { video.currentTime = video.duration; } catch (e) {}
        }
      }
    } catch (e) {}
  }

  function cleanOverlays() {
    try {
      const selectors = [
        ".ytp-ad-module",
        ".ytp-ad-overlay-container",
        ".ytp-ad-image-overlay",
        "ytd-ad-slot-renderer",
        "ytd-promoted-sparkles-web-renderer",
        "ytd-display-ad-renderer",
        "#masthead-ad",
        "#player-ads",
        "ytd-statement-banner-renderer",
        "ytd-mealbar-promo-renderer",
        "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
      ];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => {
          try {
            el.style.setProperty("display", "none", "important");
            el.setAttribute("aria-hidden", "true");
          } catch (e) {}
        });
      }
    } catch (e) {}
  }

  // observa o player quando ele surgir (SPA do YouTube)
  function watchPlayer() {
    skipAds();
    cleanOverlays();
  }
  setInterval(watchPlayer, 700);
  document.addEventListener("yt-navigate-finish", watchPlayer, true);
  document.addEventListener("DOMContentLoaded", watchPlayer, true);
})();
