/**
 * AegisBlock — Escudo de anúncios do YouTube (MAIN WORLD) v3
 *
 * Modifica o CÓDIGO DO SITE em 3 camadas para eliminar o anúncio ANTES e
 * DURANTE a exibição, sem nunca tocar na reprodução do vídeo normal:
 *
 *  1) REQUISIÇÃO — o corpo do POST /youtubei/v1/player é alterado antes de
 *     sair (sinais de anúncio removidos).
 *  2) RESPOSTA/CÓDIGO — fetch, XMLHttpRequest, JSON.parse, o script da
 *     página (ytInitialPlayerResponse / ytInitialData / ytplayer.config) são
 *     interceptados e a resposta é SANITIZADA em profundidade: qualquer
 *     estrutura de anúncio (adPlacements, playerAds, adSlots, adSlotRenderer,
 *     adServingData…) é apagada antes do player ler.
 *  3) PLAYER — se ainda assim um anúncio entrar, o código do player é usado
 *     contra ele: clique no "Pular anúncio", salto do anúncio pela API
 *     oficial (somente durante o anúncio) e, por fim, aceleração silenciosa
 *     do anúncio (16×, mudo) com restauração exata do estado original.
 *
 * Regras de ouro (anti-falso-positivo):
 *  - NUNCA bloquear/seekar o vídeo de conteúdo (googlevideo/ytimg intocados);
 *  - Ações de salto APENAS quando há CERTEZA de anúncio (getAdState()===1 e/
 *    ou marcadores de anúncio no DOM);
 *  - O botão "Pular anúncio" NUNCA é escondido pela limpeza de overlays.
 */
(() => {
  "use strict";

  // ------------------------------------------------------------------
  // 1) Sanitização profunda das respostas do player
  // ------------------------------------------------------------------
  const AD_KEYS = new Set([
    "adPlacements", "playerAds", "adSlots", "adsResponse",
    "adBreakHeartbeatParams", "adPlacementConfig", "adServingData",
    "adConfig", "adSignalsInfo", "adsEncodedData",
    "adBreak", "adBreaks", "adBreakServiceMessage", "adBreakServiceUrl",
    "companionAds", "displayAds", "adInfoCards", "adParams",
    "adSystem", "adVideoId", "adSequence", "adCpn", "adBreakType",
    "podAd", "adPods", "instreamAd", "adChoicesText", "adTitle",
  ]);

  // Itens de array que SÃO anúncios e devem ser removidos por completo
  const AD_ITEM_RE = new RegExp(
    "^(adPlacementRenderer|adSlotRenderer|adBreakRenderer|" +
    "adBreakServiceRenderer|displayAdRenderer|promotedSparklesWebRenderer|" +
    "promotedVideoRenderer|inFeedAdLayoutRenderer|merchShelfRenderer|" +
    "statementBannerRenderer|bannerPromoRenderer|mastheadAdRenderer|" +
    "mealbarPromoRenderer|adRenderer|adCpnRenderer|playerAdRenderer|" +
    "adSlotFulfillmentRenderer|adBreakFulfillmentRenderer)$"
  );

  function isAdItem(v) {
    if (!v || typeof v !== "object") return false;
    for (const k in v) {
      if (AD_ITEM_RE.test(k) || AD_KEYS.has(k)) return true;
    }
    return false;
  }

  function sanitize(node, depth) {
    if (!node || typeof node !== "object" || depth > 10) return node;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        if (isAdItem(node[i])) node.splice(i, 1);
        else sanitize(node[i], depth + 1);
      }
      return node;
    }
    for (const key of Object.keys(node)) {
      if (AD_KEYS.has(key) || AD_ITEM_RE.test(key)) {
        delete node[key];
      } else if (key === "playerResponse" && typeof node[key] === "object") {
        sanitize(node[key], depth + 1);
      } else if (key === "args" && node[key] && typeof node[key] === "object") {
        sanitizeRawArgs(node[key]);
      } else {
        sanitize(node[key], depth + 1);
      }
    }
    return node;
  }

  function forceEmpty(resp) {
    if (!resp || typeof resp !== "object") return resp;
    if (Array.isArray(resp.adPlacements)) resp.adPlacements = [];
    if (Array.isArray(resp.playerAds)) resp.playerAds = [];
    if (Array.isArray(resp.adSlots)) resp.adSlots = [];
    return resp;
  }

  function cleanPayload(data) {
    if (!data || typeof data !== "object") return data;
    sanitize(data, 0);
    forceEmpty(data);
    if (data.playerResponse && typeof data.playerResponse === "object") {
      forceEmpty(data.playerResponse);
    }
    return data;
  }

  function looksLikePlayerResponse(obj) {
    if (!obj || typeof obj !== "object") return false;
    return (
      "adPlacements" in obj || "playerAds" in obj || "adSlots" in obj ||
      "adBreakHeartbeatParams" in obj || "adServingData" in obj ||
      "playbackTracking" in obj || "streamingData" in obj ||
      "videoDetails" in obj || "playerConfig" in obj
    );
  }

  // ------------------------------------------------------------------
  // 2) Hooks de código: fetch / XHR / JSON.parse / variáveis da página
  // ------------------------------------------------------------------
  const isAdRelevantUrl = (u) =>
    typeof u === "string" && /\/youtubei\/v1\/(player|next)(\?|$)/.test(u);

  function sanitizeRequestBody(body) {
    if (typeof body !== "string") return body;
    try {
      const o = JSON.parse(body);
      if (o && typeof o === "object") {
        delete o.adSignalsInfo;
        delete o.adPlacementConfig;
        if (o.context && typeof o.context === "object") {
          delete o.context.adSignalsInfo;
          delete o.context.adRequest;
        }
        return JSON.stringify(o);
      }
    } catch (e) {}
    return body;
  }

  const origFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    try {
      const url =
        typeof input === "string" ? input : (input && input.url) || String(input);
      if (isAdRelevantUrl(url)) {
        if (init && typeof init.body === "string") {
          init = { ...init, body: sanitizeRequestBody(init.body) };
        } else if (
          input && typeof input === "object" && typeof input.body === "string"
        ) {
          // Request com corpo: refaz com corpo limpo
          input = new Request(input, {
            body: sanitizeRequestBody(input.body),
          });
        }
      }
      const resp = await origFetch.apply(this, [input, init]);
      if (resp && isAdRelevantUrl(url)) {
        // SEMPRE parseia e limpa (sem atalho que deixe formatos novos passar)
        try {
          const text = await resp.clone().text();
          const data = JSON.parse(text);
          const clean = cleanPayload(data);
          return new Response(JSON.stringify(clean), {
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
          });
        } catch (e) {
          return resp;
        }
      }
      return resp;
    } catch (e) {
      return origFetch.apply(this, [input, init]);
    }
  };

  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    const open = xhr.open;
    xhr.open = function (method, url, ...rest) {
      this.__aegisUrl = url;
      return open.apply(this, [method, url, ...rest]);
    };
    const send = xhr.send;
    xhr.send = function (body) {
      if (isAdRelevantUrl(this.__aegisUrl) && typeof body === "string") {
        body = sanitizeRequestBody(body);
      }
      return send.apply(this, [body]);
    };
    const desc = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype, "responseText"
    );
    if (desc && desc.get) {
      try {
        Object.defineProperty(xhr, "responseText", {
          get: function () {
            const txt = desc.get.call(this);
            if (!isAdRelevantUrl(this.__aegisUrl) || typeof txt !== "string") {
              return txt;
            }
            try {
              return JSON.stringify(cleanPayload(JSON.parse(txt)));
            } catch (e) {
              return txt;
            }
          },
        });
        Object.defineProperty(xhr, "response", {
          get: function () {
            if (
              this.responseType && this.responseType !== "text" &&
              this.responseType !== ""
            ) {
              return this.response;
            }
            return this.responseText;
          },
        });
      } catch (e) {}
    }
    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  const origParse = JSON.parse;
  JSON.parse = function patchedParse(text, reviver) {
    const r = origParse.apply(this, [text, reviver]);
    try {
      if (r && typeof r === "object") {
        if (looksLikePlayerResponse(r) || isAdItem(r)) {
          return cleanPayload(r);
        }
        // respostas "next" / browse com slots de anúncio espalhados
        if (r.contents || r.onResponseReceived || r.playerOverlays) {
          sanitize(r, 0);
        }
      }
    } catch (e) {}
    return r;
  };

  // ytInitialPlayerResponse — o script da página grava aqui
  let _yipr = null;
  try {
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      configurable: true,
      get: () => _yipr,
      set: (v) => {
        try {
          _yipr = cleanPayload(v);
        } catch (e) {
          _yipr = v;
        }
      },
    });
  } catch (e) {}

  // ytInitialData — anúncios do feed (home, busca, sidebar)
  let _yid = null;
  try {
    Object.defineProperty(window, "ytInitialData", {
      configurable: true,
      get: () => _yid,
      set: (v) => {
        try {
          _yid = v && typeof v === "object" ? sanitize(v, 0) : v;
        } catch (e) {
          _yid = v;
        }
      },
    });
  } catch (e) {}

  // ytplayer.config.args.{player_response,raw_player_response}
  function sanitizeRawArgs(args) {
    try {
      for (const k of ["player_response", "raw_player_response"]) {
        const v = args[k];
        if (typeof v === "string" && v.charAt(0) === "{") {
          args[k] = JSON.stringify(cleanPayload(origParse(v)));
        }
      }
    } catch (e) {}
    return args;
  }
  let ytplayerTries = 0;
  const ytplayerTimer = setInterval(() => {
    try {
      const cfg = window.ytplayer && window.ytplayer.config;
      if (cfg && cfg.args && typeof cfg.args === "object") {
        sanitizeRawArgs(cfg.args);
        for (const k of ["player_response", "raw_player_response"]) {
          if (!(k in cfg.args)) continue;
          let stored = cfg.args[k];
          try {
            Object.defineProperty(cfg.args, k, {
              configurable: true,
              get: () => stored,
              set: (v) => {
                try {
                  stored =
                    typeof v === "string" && v.charAt(0) === "{"
                      ? JSON.stringify(cleanPayload(origParse(v)))
                      : v;
                } catch (e) {
                  stored = v;
                }
              },
            });
          } catch (e) {}
        }
        clearInterval(ytplayerTimer);
      }
    } catch (e) {}
    if (++ytplayerTries > 60) clearInterval(ytplayerTimer);
  }, 500);

  // ------------------------------------------------------------------
  // 3) Player: matar o anúncio que escapou (sem tocar no conteúdo)
  // ------------------------------------------------------------------
  const SKIP_SELECTORS = [
    "button.ytp-ad-skip-button",
    "button.ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-modern button",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-slot button",
    ".ytp-ad-skip-button-slot",
    "button.ytp-skip-ad-button",
    ".videoAdUiSkipButton",
    ".ytp-ad-skip-button button",
    ".ytp-skip-button button",
  ];

  const AD_DOM_MARKERS =
    ".ytp-ad-module, .ytp-ad-player-overlay, .ytp-ad-text, " +
    ".ytp-ad-image-overlay, .ytp-ad-display-container, .video-ads, " +
    ".ytp-ad-overlay-container, ytp-ad-module";

  function getPlayerEl() {
    return (
      document.getElementById("movie_player") ||
      document.querySelector("#movie_player")
    );
  }

  function inShadow(root, sel, out) {
    try {
      root.querySelectorAll(sel).forEach((n) => out.push(n));
      root.querySelectorAll("*").forEach((n) => {
        if (n.shadowRoot) inShadow(n.shadowRoot, sel, out);
      });
    } catch (e) {}
  }

  function clickSkip() {
    const found = [];
    for (const sel of SKIP_SELECTORS) {
      inShadow(document, sel, found);
    }
    let clicked = false;
    for (const el of found) {
      try {
        if (el.offsetParent === null && !el.closest(".ytp-ad-module")) continue;
        el.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
        el.click();
        clicked = true;
      } catch (e) {}
    }
    return clicked;
  }

  let adSpeed = null; // { el, rate, muted }
  function speedUpAd() {
    const v = document.querySelector("video");
    if (!v || adSpeed) return;
    try {
      adSpeed = { el: v, rate: v.playbackRate, muted: v.muted };
      v.muted = true;
      v.playbackRate = 16;
    } catch (e) {
      adSpeed = null;
    }
  }
  function restoreVideo() {
    if (!adSpeed) return;
    const s = adSpeed;
    adSpeed = null;
    try {
      if (s.el) {
        s.el.playbackRate = s.rate || 1;
        s.el.muted = !!s.muted;
      }
    } catch (e) {}
  }

  function adIsPlaying() {
    // API oficial do player (certeza absoluta)
    try {
      const p = getPlayerEl();
      if (p && typeof p.getAdState === "function" && p.getAdState() === 1) {
        return "api";
      }
    } catch (e) {}
    // Marcadores DOM de anúncio (2+ = certeza alta)
    let hits = 0;
    try {
      const probe = document.querySelector(AD_DOM_MARKERS);
      if (probe) hits += 1;
      const v = document.querySelector("video");
      if (v && v.duration > 0 && v.duration <= 180 &&
          document.querySelector(".ytp-ad-module, .ytp-ad-skip-button-modern, .ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-text")) {
        hits += 1;
      }
    } catch (e) {}
    return hits >= 2 ? "dom" : null;
  }

  function killAd(kind) {
    clickSkip();
    // Salto pela API oficial: SOMENTE com certeza de anúncio E duração curta
    if (kind === "api") {
      try {
        const p = getPlayerEl();
        const v = document.querySelector("video");
        const dur = (v && v.duration) || 0;
        if (p && typeof p.seekTo === "function" && dur > 0 && dur <= 180) {
          p.seekTo(Math.max(0, dur - 0.25), true);
          return;
        }
      } catch (e) {}
    }
    // Fallback: acelera/silencia o anúncio (o conteúdo volta ao normal depois)
    speedUpAd();
  }

  // ------------------------------------------------------------------
  // 4) Limpeza de DOM — anúncios visuais; NUNCA o botão de pular
  // ------------------------------------------------------------------
  const OVERLAY_SELECTORS = [
    ".ytp-ad-overlay-container",
    ".ytp-ad-image-overlay",
    ".ytp-ad-text-overlay",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-video-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-ad-slot-renderer",
    "ytd-display-ad-renderer",
    "ytd-banner-promo-renderer",
    "ytd-statement-banner-renderer",
    "ytd-mealbar-promo-renderer",
    "ytd-merch-shelf-renderer",
    "ytd-ad-break-interstitial-renderer",
    "#player-ads",
    "#masthead-ad",
  ];

  function cleanOverlays() {
    for (const sel of OVERLAY_SELECTORS) {
      let nodes = [];
      try {
        inShadow(document, sel, nodes);
      } catch (e) {
        try { nodes = document.querySelectorAll(sel); } catch (e2) {}
      }
      for (const el of nodes) {
        // não mexe se o nó contiver o botão de pular
        try {
          if (el.querySelector && el.querySelector('[class*="skip"]')) continue;
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("visibility", "hidden", "important");
          el.style.setProperty("height", "0", "important");
          el.style.setProperty("max-height", "0", "important");
          el.style.setProperty("overflow", "hidden", "important");
          el.style.setProperty("pointer-events", "none", "important");
          el.style.setProperty("opacity", "0", "important");
        } catch (e) {}
      }
    }
    // títulos/badges "Ad" sem tocar no skip
    try {
      document
        .querySelectorAll(".ytp-ad-badge, .ytp-ad-duration-remaining, .ytp-ad-preview-text")
        .forEach((el) => {
          if (el.querySelector && el.querySelector('[class*="skip"]')) return;
          el.style.setProperty("display", "none", "important");
        });
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // 5) Ciclo principal — rápido, barato e defensivo
  // ------------------------------------------------------------------
  let ticks = 0;
  const TICK_MS = 700;

  function tick() {
    ticks++;
    const kind = adIsPlaying();
    if (kind) {
      killAd(kind);
    } else if (adSpeed) {
      restoreVideo();
    }
    if (ticks % 12 === 0) cleanOverlays(); // ≈ a cada 8,4s
  }

  // restaura o estado do vídeo quando o anúncio termina de fato
  document.addEventListener("ended", restoreVideo, true);
  document.addEventListener("durationchange", () => {
    if (!adIsPlaying()) restoreVideo();
  }, true);
  window.addEventListener("blur", () => {
    // não deixa o estado acelerado se o usuário trocar de aba durante o anúncio
    if (!adIsPlaying()) restoreVideo();
  });

  setInterval(tick, TICK_MS);

  // limpeza inicial assim que o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanOverlays);
  } else {
    cleanOverlays();
  }
})();
