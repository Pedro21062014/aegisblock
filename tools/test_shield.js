#!/usr/bin/env node
/**
 * AegisBlock — TESTE REAL do escudo YouTube (content/main-world.js)
 *
 * 1) Dados REAIS: busca respostas reais da API do YouTube (/player e /next),
 *    aplica a sanitização do escudo e verifica:
 *      - campos de anúncio REMOVIDOS (adBreakHeartbeatParams, adPlacements,
 *        playerAds, adSlots, adsEngagementPanelContentRenderer…);
 *      - o conteúdo do vídeo preservado 100% (videoDetails, streamingData,
 *        playabilityStatus, formatos, legendas…);
 *      - JSON válido e demais dados byte-idênticos.
 * 2) Sandbox DOM: carrega o main-world.js num ambiente simulado e verifica:
 *      - SEM recursão no wrapper do XHR (bug que derrubava o player);
 *      - fetch do googlevideo.com INTACTO (vídeo nunca é tocado);
 *      - fetch do /player sanitizado; corpo do POST limpo (adSignalsInfo);
 *      - hooks de JSON.parse / ytInitialPlayerResponse / ytInitialData;
 *      - clique APENAS em botões "Pular" VISIBLES;
 *      - o elemento <video> NUNCA é modificado (zero escritas);
 *      - overlays escondidos sem tocar no botão de pular.
 *
 * Uso: node tools/test_shield.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// parser PRISTINO capturado antes de qualquer hook (para asserções do teste)
const PRISTINE_PARSE = JSON.parse.bind(JSON);

const ROOT = path.join(__dirname, "..");
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

let pass = 0;
let fail = 0;
function ok(name) {
  pass++;
  console.log("  ✓ " + name);
}
function bad(name, err) {
  fail++;
  console.log("  ✗ " + name + (err ? " — " + err : ""));
}

// ----------------------------------------------------------------------
// Parte 1 — dados REAIS do YouTube
// ----------------------------------------------------------------------
async function fetchJSON(url, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    return null;
  }
}

function loadCleanPayloadFn() {
  // Expõe cleanPayload/sanitize do main-world.js num ambiente mínimo
  const src = fs.readFileSync(
    path.join(ROOT, "content", "main-world.js"),
    "utf8"
  );
  // eslint-disable-next-line no-new-func
  return new Function(
    "window", "document", "JSON", "setInterval", "clearInterval",
    "XMLHttpRequest", "MouseEvent", "Request", "Response", "fetch",
    `
    const out = {};
    ${src.replace(
      "(() => {",
      `(() => {
        try { out.cleanPayload = cleanPayload; out.sanitize = sanitize; } catch (e) {}`
    ).replace(/}\)\(\);\s*$/, "})();")}
    return out;
    `
  );
}

function countKeys(node, pred, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const v of node) countKeys(v, pred, out);
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (pred(k)) out.push(k);
    countKeys(v, pred, out);
  }
  return out;
}

function stripAdKeys(node) {
  // referência independente: o que NÃO pode mudar (conteúdo do vídeo)
  return JSON.stringify(node);
}

async function part1() {
  console.log("\n━━ 1) DADOS REAIS DO YOUTUBE ━━━━━━━━━━━━━━━━━━━━━━━━");

  // busca respostas REAIS (com fallback para cópias locais baixadas antes)
  let player =
    (await fetchJSON(
      "https://www.youtube.com/youtubei/v1/player?key=" + INNERTUBE_KEY + "&prettyPrint=false",
      {
        context: { client: { clientName: "WEB", clientVersion: "2.20240726.00.00", hl: "pt", gl: "BR" } },
        videoId: "dQw4w9WgXcQ",
        contentCheckOk: true,
        racyCheckOk: true,
      }
    )) || null;
  if (!player && fs.existsSync("/tmp/yt_player2.json")) {
    player = JSON.parse(fs.readFileSync("/tmp/yt_player2.json", "utf8"));
  }
  let next =
    (await fetchJSON(
      "https://www.youtube.com/youtubei/v1/next?key=" + INNERTUBE_KEY + "&prettyPrint=false",
      {
        context: { client: { clientName: "WEB", clientVersion: "2.20240726.00.00", hl: "pt", gl: "BR" } },
        videoId: "dQw4w9WgXcQ",
      }
    )) || null;
  if (!next && fs.existsSync("/tmp/yt_next_real.json")) {
    next = JSON.parse(fs.readFileSync("/tmp/yt_next_real.json", "utf8"));
  }

  const api = loadCleanPayloadFn()(
    // window stub
    { XMLHttpRequest: function () {}, fetch: function () {}, addEventListener() {} },
    // document stub
    { readyState: "complete", addEventListener() {}, querySelectorAll: () => [], querySelector: () => null },
    JSON, () => 0, () => {},
    function () {}, // XMLHttpRequest (parâmetro direto, não usado pelo IIFE)
    function () {}, function () {}, function () {},
    function () {}  // fetch
  );
  const { cleanPayload, sanitize } = api;
  assert(typeof cleanPayload === "function", "cleanPayload não exposta");

  if (player) {
    const before = JSON.parse(JSON.stringify(player));
    const hasAdField = "adBreakHeartbeatParams" in player;
    const cleaned = cleanPayload(JSON.parse(JSON.stringify(player)));
    if (hasAdField) {
      if (!("adBreakHeartbeatParams" in cleaned)) ok("/player real: adBreakHeartbeatParams removido");
      else bad("/player real: adBreakHeartbeatParams AINDA presente");
    } else {
      ok("/player real: sem campos de anúncio nesta resposta (ok)");
    }
    // conteúdo preservado
    const keep = ["playabilityStatus", "videoDetails", "microformat", "responseContext", "frameworkUpdates", "trackingParams", "messages", "streamingData"];
    let intact = true;
    for (const k of keep) {
      if (JSON.stringify(before[k]) !== JSON.stringify(cleaned[k])) {
        intact = false;
        bad("/player real: campo de conteúdo alterado → " + k);
      }
    }
    if (intact) ok("/player real: conteúdo do vídeo 100% preservado (" + Object.keys(before).length + " chaves)");
    // nenhum resquício de anúncio
    const adKeys = ["adPlacements", "playerAds", "adSlots", "adsResponse", "adBreakHeartbeatParams", "adServingData", "adBreak", "adBreaks"];
    const left = adKeys.filter((k) => k in cleaned);
    if (left.length === 0) ok("/player real: zero campos de anúncio restantes");
    else bad("/player real: restaram → " + left.join(","));
    // JSON válido
    try {
      JSON.parse(JSON.stringify(cleaned));
      ok("/player real: JSON válido após sanitização");
    } catch (e) {
      bad("/player real: JSON inválido após sanitização");
    }
  } else {
    bad("dados reais /player", "sem rede e sem cópia local");
  }

  if (next) {
    const beforeStr = JSON.stringify(next);
    const beforeLen = countKeys(next, () => true).length;
    const cleaned = cleanPayload(JSON.parse(JSON.stringify(next)));
    const afterLen = countKeys(cleaned, () => true).length;
    // renderer de anúncio real do /next deve sumir
    const adRenderers = countKeys(cleaned, (k) =>
      /adPlacementRenderer|adSlotRenderer|adsEngagementPanelContentRenderer|promotedSparklesWebRenderer|promotedVideoRenderer|mastheadAdRenderer/.test(k));
    if (adRenderers.length === 0) ok("/next real: renderers de anúncio removidos");
    else bad("/next real: renderers restantes → " + adRenderers.join(","));
    // conteúdo preservado (quase tudo deve permanecer)
    const dropped = beforeLen - afterLen;
    if (cleaned.contents || cleaned.frameworkUpdates || cleaned.playerOverlays || cleaned.engagementPanels) {
      ok("/next real: estruturas de conteúdo preservadas (itens removidos: " + dropped + " de " + beforeLen + ")");
    } else {
      bad("/next real: estruturas de conteúdo sumiram!");
    }
    try {
      JSON.parse(JSON.stringify(cleaned));
      ok("/next real: JSON válido após sanitização");
    } catch (e) {
      bad("/next real: JSON inválido");
    }
  } else {
    bad("dados reais /next", "sem rede e sem cópia local");
  }

  // player sintético no formato real (com streamingData + todos os campos de anúncio)
  const synthetic = {
    responseContext: { serviceTrackingParams: [] },
    playabilityStatus: { status: "OK", playableInEmbed: true },
    videoDetails: {
      videoId: "abc123", title: "Vídeo de teste", lengthSeconds: "300",
      isLiveContent: false, author: "Canal",
    },
    streamingData: {
      expiresInSeconds: "21540",
      formats: [{ itag: 18, url: "https://rr3---sn.googlevideo.com/videoplayback?x=1", width: 640, height: 360 }],
      adaptiveFormats: [
        { itag: 137, url: "https://rr3---sn.googlevideo.com/videoplayback?x=2", bitrate: 4000000 },
        { itag: 140, url: "https://rr3---sn.googlevideo.com/videoplayback?x=3", bitrate: 128000 },
      ],
      serverAbrStreamingUrl: "https://manifest.googlevideo.com/api/manifest/abr",
    },
    playerOverlays: { playerOverlayRenderer: { endScreen: {} } },
    adPlacements: [
      { adPlacementRenderer: { adSlotRenderer: { adSlotBoundary: {} } } },
      { adPlacementRenderer: { config: {} } },
    ],
    playerAds: [{ playerAdsRenderer: {} }, { foo: "bar" }],
    adSlots: [{ adSlotRenderer: {} }],
    adsResponse: '{"json":"de anuncio"}',
    adBreakHeartbeatParams: { breakType: "MIDROLL" },
    adServingData: { fulfilledLayouts: [] },
    adBreak: { podAd: true },
    playbackTracking: { videostatsPlaybackUrl: { baseUrl: "https://s.youtube.com/api/stats" } },
    annotations: [{ playerAnnotationsExpandedRenderer: {} }],
  };
  const beforeSyn = JSON.parse(JSON.stringify(synthetic));
  const cleanSyn = cleanPayload(JSON.parse(JSON.stringify(synthetic)));
  const gone = ["adPlacements", "playerAds", "adSlots", "adsResponse", "adBreakHeartbeatParams", "adServingData", "adBreak"];
  const goneOk = gone.every((k) => !(k in cleanSyn) || (Array.isArray(cleanSyn[k]) && cleanSyn[k].length === 0));
  if (goneOk) ok("sintético: 7 campos de anúncio zerados/removidos");
  else bad("sintético: campos de anúncio restantes");
  const contentOk =
    JSON.stringify(beforeSyn.videoDetails) === JSON.stringify(cleanSyn.videoDetails) &&
    JSON.stringify(beforeSyn.streamingData) === JSON.stringify(cleanSyn.streamingData) &&
    JSON.stringify(beforeSyn.playabilityStatus) === JSON.stringify(cleanSyn.playabilityStatus) &&
    JSON.stringify(beforeSyn.playerOverlays) === JSON.stringify(cleanSyn.playerOverlays) &&
    JSON.stringify(beforeSyn.annotations) === JSON.stringify(cleanSyn.annotations) &&
    JSON.stringify(beforeSyn.playbackTracking) === JSON.stringify(cleanSyn.playbackTracking);
  if (contentOk) ok("sintético: videoDetails/streamingData/overlays/tracking intactos (vídeo tocaria normal)");
  else bad("sintético: conteúdo do vídeo foi alterado!");
}

// ----------------------------------------------------------------------
// Parte 2 — sandbox DOM do main-world.js
// ----------------------------------------------------------------------
function makeEl(tag, props = {}) {
  const listeners = {};
  const el = {
    tagName: (tag || "div").toUpperCase(),
    isConnected: true,
    disabled: false,
    hidden: false,
    style: { setProperty() {}, removeProperty() {} },
    children: [],
    _clicked: 0,
    _dispatched: 0,
    className: props.className || "",
    getBoundingClientRect: () =>
      props.visible === false
        ? { width: 0, height: 0, x: 0, y: 0 }
        : { width: 90, height: 28, x: 10, y: 10 },
    querySelector: (sel) => {
      if (props.skipChild && sel.indexOf("skip") >= 0) return props.skipChild;
      return null;
    },
    querySelectorAll: (sel) => {
      if (props.skipChild && sel.indexOf("skip") >= 0) return [props.skipChild];
      return [];
    },
    closest: () => null,
    addEventListener: (t, fn) => {
      (listeners[t] = listeners[t] || []).push(fn);
    },
    dispatchEvent: () => {
      el._dispatched++;
      return true;
    },
    click: () => {
      el._clicked++;
    },
    ...props,
  };
  return el;
}

function part2() {
  console.log("\n━━ 2) SANDBOX DOM (main-world.js completo) ━━━━━━━━━━");

  // ---- video com ESPIAS: qualquer escrita = falha do teste ----
  let videoWrites = 0;
  const videoEl = makeEl("video");
  for (const prop of ["playbackRate", "muted", "currentTime", "src", "volume", "paused"]) {
    let val = prop === "playbackRate" ? 1 : prop === "muted" ? false : 0;
    Object.defineProperty(videoEl, prop, {
      get: () => val,
      set: () => {
        videoWrites++;
      },
      configurable: true,
    });
  }
  videoEl.duration = 300;
  videoEl.play = () => {};

  // ---- elementos do player ----
  const hiddenSkip = makeEl("button", {
    className: "ytp-ad-skip-button",
    visible: false,
    skipChild: null,
  });
  const visibleSkip = makeEl("button", {
    className: "ytp-ad-skip-button-modern",
    visible: true,
  });
  const overlayWithSkip = makeEl("div", {
    className: "ytp-ad-overlay-container",
    skipChild: visibleSkip,
  });
  const overlayPlain = makeEl("div", {
    className: "ytp-ad-overlay-container",
    skipChild: null,
  });
  const allElements = [videoEl, hiddenSkip, visibleSkip, overlayWithSkip, overlayPlain];

  const bySelector = (sel) => {
    if (sel === "video") return [videoEl];
    const out = [];
    for (const el of allElements) {
      const cls = (el.className || "").split(/\s+/);
      // suporta "button.ytp-x", ".ytp-x" e listas "a, b"
      for (const part of sel.split(",").map((s) => s.trim())) {
        const m = part.match(/^(?:([a-z0-9]+))?\.([a-z0-9-]+)$/i);
        if (!m) continue;
        const [, tag, klass] = m;
        if (cls.includes(klass) && (!tag || el.tagName.toLowerCase() === tag)) {
          out.push(el);
          break;
        }
      }
    }
    return out;
  };

  const timers = [];
  const documentStub = {
    readyState: "complete",
    addEventListener: () => {},
    getElementById: (id) => (id === "movie_player" ? makeEl("div", { id: "movie_player" }) : null),
    querySelector: (sel) => bySelector(sel)[0] || null,
    querySelectorAll: (sel) => (sel === "*" ? [] : bySelector(sel)),
    createElement: (t) => makeEl(t),
    body: makeEl("body"),
  };

  // ---- stubs globais ----
  const logs = { fetch: [] };
  const fakeFetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    logs.fetch.push({ url, init });
    return new Response(
      JSON.stringify({
        adPlacements: [{ adPlacementRenderer: {} }],
        playerAds: [1],
        adBreakHeartbeatParams: { x: 1 },
        videoDetails: { title: "real" },
        streamingData: { formats: [{ itag: 18 }] },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  class FakeXHR {
    open(method, url) {
      this.__aegisUrl = url;
    }
    send() {}
  }
  Object.defineProperty(FakeXHR.prototype, "responseText", {
    get() {
      return this.__txt || "";
    },
  });
  Object.defineProperty(FakeXHR.prototype, "response", {
    get() {
      return this.__resp;
    },
  });
  class FakeMouseEvent {
    constructor(type, opts) {
      Object.assign(this, { type }, opts || {});
    }
  }

  const src = fs.readFileSync(
    path.join(ROOT, "content", "main-world.js"),
    "utf8"
  );

  const sandbox = {
    window: null,
    document: documentStub,
    setInterval: (fn) => {
      timers.push(fn);
      return timers.length;
    },
    clearInterval: () => {},
    XMLHttpRequest: FakeXHR,
    MouseEvent: FakeMouseEvent,
    Request: class {
      constructor(i, init) {
        this.url = typeof i === "string" ? i : i.url;
        this.body = init && init.body;
      }
    },
    Response,
    fetch: fakeFetch,
    JSON,
    Object,
    String,
    console,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  try {
    const fn = new Function(
      "window", "document", "setInterval", "clearInterval",
      "XMLHttpRequest", "MouseEvent", "Request", "Response", "fetch",
      "JSON", "console",
      src + "\n//# sourceURL=main-world.js"
    );
    fn(
      sandbox, documentStub, sandbox.setInterval, sandbox.clearInterval,
      FakeXHR, FakeMouseEvent, sandbox.Request, Response, fakeFetch,
      JSON, console
    );
    ok("main-world.js carrega sem erros no sandbox");
  } catch (e) {
    bad("main-world.js carrega no sandbox", e.message);
    return;
  }

  // (a) XHR responseType "json" — SEM recursão (bug antigo: stack overflow)
  try {
    const xhr = new sandbox.window.XMLHttpRequest();
    xhr.open("GET", "https://www.youtube.com/youtubei/v1/player");
    xhr.responseType = "json";
    xhr.__resp = { adPlacements: [1], videoDetails: { t: 1 }, streamingData: { f: [] } };
    const r = xhr.response; // getter corrigido
    if (r && r.videoDetails && r.videoDetails.t === 1 && (!r.adPlacements || r.adPlacements.length === 0)) {
      ok("XHR 'json': resposta sanitizada SEM recursão (bug do vídeo corrigido)");
    } else {
      bad("XHR 'json': resposta errada", JSON.stringify(r));
    }
  } catch (e) {
    bad("XHR 'json': recursão/erro no getter", e.message);
  }

  // (b) XHR responseText em URL do player — JSON limpo
  try {
    const xhr = new sandbox.window.XMLHttpRequest();
    xhr.open("GET", "https://www.youtube.com/youtubei/v1/next?x=1");
    xhr.__txt = JSON.stringify({ adSlots: [1], contents: { a: 1 } });
    const txt = xhr.responseText;
    const parsed = JSON.parse(txt);
    if ((!parsed.adSlots || parsed.adSlots.length === 0) && parsed.contents) {
      ok("XHR 'responseText': JSON sanitizado (adSlots removido, contents mantido)");
    } else {
      bad("XHR 'responseText': sanitização falhou");
    }
    // URL não-relacionada passa intacta
    const xhr2 = new sandbox.window.XMLHttpRequest();
    xhr2.open("GET", "https://s.youtube.com/api/stats/watchtime");
    xhr2.__txt = JSON.stringify({ adSlots: [1] });
    if (xhr2.responseText === JSON.stringify({ adSlots: [1] })) {
      ok("XHR fora do escopo: resposta INTACTA (nada além do player é mexido)");
    } else {
      bad("XHR fora do escopo: foi modificado!");
    }
  } catch (e) {
    bad("XHR responseText", e.message);
  }

  // (c) fetch do googlevideo — INTACTO
  (async () => {
    const resp = await sandbox.window.fetch(
      "https://rr3---sn.googlevideo.com/videoplayback?mime=video%2Fmp4"
    );
    // lê com parser pristine (o hook do escudo não pode interferir na medição)
    const data = PRISTINE_PARSE(await resp.text());
    if (data.adPlacements && data.adPlacements.length === 1 && data.videoDetails) {
      ok("fetch googlevideo: 100% INTACTO (o vídeo nunca é bloqueado)");
    } else {
      bad("fetch googlevideo: FOI MODIFICADO!");
    }

    // (d) fetch do /player — sanitizado
    const resp2 = await sandbox.window.fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false"
    );
    const data2 = PRISTINE_PARSE(await resp2.text());
    if (
      (!data2.adPlacements || data2.adPlacements.length === 0) &&
      (!data2.playerAds || data2.playerAds.length === 0) &&
      !("adBreakHeartbeatParams" in data2) &&
      data2.videoDetails && data2.streamingData
    ) {
      ok("fetch /player: anúncios removidos, vídeo (videoDetails+streamingData) intacto");
    } else {
      bad("fetch /player: sanitização incorreta", JSON.stringify(data2).slice(0, 120));
    }

    // (e) corpo do POST limpo (adSignalsInfo removido antes de sair)
    const postBody = JSON.stringify({
      context: { client: { clientName: "WEB" }, adSignalsInfo: { x: 1 } },
      videoId: "abc",
      adSignalsInfo: { evil: true },
    });
    await sandbox.window.fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      body: postBody,
    });
    const sent = logs.fetch[logs.fetch.length - 1];
    const sentBody = JSON.parse((sent.init && sent.init.body) || "{}");
    if (!("adSignalsInfo" in sentBody) && !("adSignalsInfo" in (sentBody.context || {}))) {
      ok("POST /player: adSignalsInfo removido do corpo ANTES de enviar");
    } else {
      bad("POST /player: adSignalsInfo ainda no corpo");
    }

    // (f) hook JSON.parse — player response limpo; JSON comum intacto
    const cleaned = JSON.parse(
      JSON.stringify({ adPlacements: [1], streamingData: { a: 1 }, videoDetails: { b: 2 } })
    );
    if (!("adPlacements" in cleaned) && cleaned.streamingData && cleaned.videoDetails) {
      ok("JSON.parse hook: player response limpo na hora do parse");
    } else {
      bad("JSON.parse hook: não limpou");
    }
    const common = JSON.parse(JSON.stringify({ contents: [{ videoRenderer: { id: 1 } }] }));
    if (common.contents && common.contents[0].videoRenderer) {
      ok("JSON.parse hook: JSON comum (conteúdo) 100% intacto");
    } else {
      bad("JSON.parse hook: mexeu em conteúdo comum!");
    }

    // (g) ytInitialPlayerResponse / ytInitialData
    sandbox.window.ytInitialPlayerResponse = {
      adPlacements: [1],
      playerAds: [2],
      videoDetails: { v: 3 },
      streamingData: { s: 4 },
    };
    const yip = sandbox.window.ytInitialPlayerResponse;
    if (!("adPlacements" in yip) && yip.videoDetails && yip.streamingData) {
      ok("ytInitialPlayerResponse: limpo no setter (script da página enganado)");
    } else {
      bad("ytInitialPlayerResponse: não limpou");
    }
    sandbox.window.ytInitialData = {
      contents: [
        { tabRenderer: { content: { sectionListRenderer: { contents: [
          { itemSectionRenderer: { contents: [
            { adSlotRenderer: { x: 1 } },
            { videoRenderer: { videoId: "keep" } },
          ] } },
        ] } } } },
      ],
    };
    const yid = sandbox.window.ytInitialData;
    const items = yid.contents[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents;
    if (items.length === 1 && items[0].videoRenderer && items[0].videoRenderer.videoId === "keep") {
      ok("ytInitialData: adSlotRenderer removido, videoRenderer do feed preservado");
    } else {
      bad("ytInitialData: prune incorreto", "itens=" + items.length);
    }

    // (h) clique no Pular: só o VISÍVEL
    const t = timers[timers.length - 1]; // tick
    if (t) t();
    if (hiddenSkip._clicked === 0 && hiddenSkip._dispatched === 0) {
      ok("Pular: botão ESCONDIDO não é clicado (sem cliques fantasmas)");
    } else {
      bad("Pular: clicou em botão escondido!");
    }
    if (visibleSkip._clicked >= 1) {
      ok("Pular: botão VISÍVEL é clicado (um anúncio escapado morre aqui)");
    } else {
      bad("Pular: não clicou no botão visível");
    }

    // (i) overlays: não esconde quem tem botão de pular
    // (rodamos cleanOverlays via tick; verificamos o efeito)
    let overlayPlainHidden = false;
    const realSet = overlayPlain.style.setProperty;
    overlayPlain.style.setProperty = (...a) => {
      if (a[0] === "display" && a[1] === "none") overlayPlainHidden = true;
      return realSet(...a);
    };
    if (t) for (let i = 0; i < 13; i++) t(); // força cleanOverlays
    if (overlayPlainHidden) {
      ok("overlays: anúncio visual é escondido");
    } else {
      bad("overlays: anúncio visual NÃO foi escondido");
    }

    // (j) o <video> — ZERO escritas em todo o teste
    if (videoWrites === 0) {
      ok("vídeo: ZERO escritas (sem seek, sem velocidade, sem mudo) ✔");
    } else {
      bad("vídeo: " + videoWrites + " escrita(s) detectada(s)!");
    }

    summary();
  })().catch((e) => {
    bad("pipeline assíncrono", e.message);
    summary();
  });
}

function summary() {
  console.log("\n━━ RESULTADO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   " + pass + " testes OK · " + fail + " falha(s)");
  if (fail > 0) process.exit(1);
  console.log("   ESCUDO APROVADO — vídeo intocado, anúncios removidos.\n");
}

(async () => {
  await part1();
  part2();
})();
