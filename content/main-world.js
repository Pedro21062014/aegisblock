/**
 * AegisBlock — Escudo YouTube (mundo MAIN) v2
 *
 * Objetivo: bloquear 100% dos anúncios ANTES de aparecerem, mexendo na
 * REQUISIÇÃO e no CÓDIGO — e nunca no vídeo (sem travamentos).
 *
 * 1) REQUISIÇÃO  : o corpo do POST /youtubei/v1/player tem os sinais de anúncio
 *                  removidos antes de ir para o servidor (o servidor nem agenda
 *                  o anúncio). Endpoints de anúncio são bloqueados na rede.
 * 2) CÓDIGO      : ytInitialPlayerResponse, JSON.parse, fetch e XHR têm os
 *                  campos de anúncio (adPlacements/playerAds/adSlots) removidos
 *                  ANTES do player ler — o anúncio nunca chega a renderizar.
 * 3) VÍDEO       : NUNCA bloqueamos googlevideo.com nem fazemos seek forçado.
 *                  Apenas clicamos em "Pular anúncio" se algum escapar.
 *
 * Performance: wrappers com caminho rápido (fast-path), polling mínimo e
 * consultas baratas — nada de trabalho pesado em intervalos curtos.
 */
(() => {
  "use strict";
  if (window.__abGuard) return;
  window.__abGuard = true;

  const AD_KEYS = [
    "adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams",
    "adBreakServiceMessage", "adPlacementConfig", "adPlacementsSerializedState",
    "adSlotsSerializedState", "adSignalsInfo", "adParams", "adbreakerResult",
    "displayAdRenderer", "promotedSparklesWebRenderer", "promotedVideoRenderer",
    "companionAdRenderer", "merchShelfRenderer", "adBreakPosition",
    "adCpn", "adSequenceRequest", "adsResponse", "adParamsSerialized",
  ];

  function hasAdMarkers(text) {
    return (
      text.indexOf("adPlacements") !== -1 ||
      text.indexOf("playerAds") !== -1 ||
      text.indexOf("adSlots") !== -1 ||
      text.indexOf("adBreakHeartbeat") !== -1
    );
  }

  function sanitize(obj, depth) {
    if (!obj || typeof obj !== "object" || depth > 8) return obj;
    if (Array.isArray(obj)) {
      const out = [];
      for (let i = 0; i < obj.length; i++) {
        const s = sanitize(obj[i], depth + 1);
        if (s !== undefined) out.push(s);
      }
      return out;
    }
    const out = {};
    for (const k in obj) {
      if (AD_KEYS.indexOf(k) !== -1) continue;
      if (k === "playerConfig" && obj[k] && typeof obj[k] === "object") {
        const clone = { ...obj[k] };
        delete clone.adParams;
        out[k] = sanitize(clone, depth + 1);
        continue;
      }
      out[k] = sanitize(obj[k], depth + 1);
    }
    return out;
  }

  function sanitizeJsonText(text) {
    try {
      if (typeof text !== "string" || !hasAdMarkers(text)) return text;
      return JSON.stringify(sanitize(JSON.parse(text), 0));
    } catch (e) {
      return text;
    }
  }

  /** Remove sinais de anúncio do CORPO da requisição (o servidor nem agenda o anúncio). */
  function sanitizeRequestBody(text) {
    try {
      if (typeof text !== "string" || text.length < 3) return text;
      if (text.indexOf("adSignals") === -1 && text.indexOf("adPlacements") === -1 &&
          text.indexOf("adSlots") === -1 && text.indexOf("adsResponse") === -1) {
        return text; // fast-path: maioria das requisições passa intacta
      }
      const data = JSON.parse(text);
      const clean = sanitize(data, 0);
      return JSON.stringify(clean);
    } catch (e) {
      return text;
    }
  }

  function isAdRelevantUrl(url) {
    return /\/youtubei\/v1\/(player|next)(\?|$)/.test(url) || /get_video_info/.test(url);
  }

  // ---- 1) ytInitialPlayerResponse -----------------------------------------
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

  // ---- 2) JSON.parse (pega TODOS os caminhos de parse do player) ----------
  try {
    const nativeParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      const result = nativeParse.call(this, text, reviver);
      if (result && typeof result === "object") {
        if (result.adPlacements !== undefined || result.playerAds !== undefined ||
            result.adSlots !== undefined) {
          return sanitize(result, 0);
        }
      }
      return result;
    };
  } catch (e) {}

  // ---- 3) fetch (modifica requisição + resposta do player) ----------------
  try {
    const nativeFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (isAdRelevantUrl(url)) {
          // modifica a REQUISIÇÃO: remove sinais de anúncio do corpo do POST
          if (init && typeof init.body === "string" && init.body.length > 3) {
            init = { ...init, body: sanitizeRequestBody(init.body) };
          } else if (input && typeof input === "object" && input.body && typeof input.body === "string") {
            try {
              input = new Request(input, { body: sanitizeRequestBody(input.body) });
            } catch (e) {}
          }
          return nativeFetch.call(this, input, init).then((resp) => {
            try {
              return resp.clone().text().then((text) => {
                if (!hasAdMarkers(text)) return resp; // fast-path: devolve original
                return new Response(sanitizeJsonText(text), {
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

  // ---- 4) XMLHttpRequest (player/next apenas) -----------------------------
  try {
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    XHR.open = function (method, url) {
      this.__abUrl = url || "";
      return open.apply(this, arguments);
    };
    XHR.send = function (body) {
      try {
        if (isAdRelevantUrl(this.__abUrl || "")) {
          if (typeof body === "string" && body.length > 3) {
            arguments[0] = sanitizeRequestBody(body);
          }
          this.addEventListener("load", function () {
            try {
              if (this.responseType && this.responseType !== "" && this.responseType !== "text") return;
              const raw = this.responseText;
              if (typeof raw !== "string" || !hasAdMarkers(raw)) return;
              const clean = sanitizeJsonText(raw);
              Object.defineProperty(this, "responseText", { configurable: true, get: () => clean });
              Object.defineProperty(this, "response", { configurable: true, get: () => clean });
            } catch (e) {}
          });
        }
      } catch (e) {}
      return send.apply(this, arguments);
    };
  } catch (e) {}

  // ---- 5) Fallback de renderização: só clica "Pular anúncio" --------------
  // NUNCA fazemos seek no vídeo (causava micro-travamentos).
  function clickSkip() {
    try {
      const player = document.querySelector(".html5-video-player");
      if (!player || !player.classList.contains("ad-showing")) return;
      const btn =
        document.querySelector(".ytp-ad-skip-button") ||
        document.querySelector(".ytp-ad-skip-button-modern") ||
        document.querySelector(".ytp-skip-ad-button") ||
        document.querySelector(".ytp-ad-skip-button-slot button");
      if (btn && btn.offsetParent !== null) btn.click();
    } catch (e) {}
  }

  const OVERLAY_SELECTORS = [
    ".ytp-ad-module", ".ytp-ad-overlay-container", ".ytp-ad-image-overlay",
    "ytd-ad-slot-renderer", "ytd-promoted-sparkles-web-renderer",
    "ytd-display-ad-renderer", "#masthead-ad", "#player-ads",
    "ytd-statement-banner-renderer", "ytd-mealbar-promo-renderer",
    "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
  ];
  function cleanOverlays() {
    try {
      for (let i = 0; i < OVERLAY_SELECTORS.length; i++) {
        const nodes = document.querySelectorAll(OVERLAY_SELECTORS[i]);
        for (let j = 0; j < nodes.length; j++) {
          nodes[j].style.setProperty("display", "none", "important");
        }
      }
    } catch (e) {}
  }

  // polling leve: skip a cada 1.2s (1 query barata), overlays a cada 3s
  setInterval(clickSkip, 1200);
  setInterval(cleanOverlays, 3000);
  document.addEventListener("yt-navigate-finish", () => {
    clickSkip();
    cleanOverlays();
  }, true);
  document.addEventListener("DOMContentLoaded", cleanOverlays, true);
})();
