/**
 * AegisBlock — Filtros cosméticos (mundo isolado)
 * Oculta apenas seletores consagrados de anúncios (baixo risco de falso positivo)
 * e reporta a contagem para as estatísticas.
 */
(() => {
  "use strict";

  const SELECTORS = [
    // Genéricos seguros (apenas containers claramente publicitários)
    "ins.adsbygoogle",
    "iframe[src*='googlesyndication.com']",
    "iframe[src*='doubleclick.net']",
    "iframe[id^='google_ads_frame']",
    "iframe[src*='adnxs.com']",
    "iframe[src*='rubiconproject.com']",
    "iframe[src*='openx.net']",
    "iframe[src*='criteo.com']",
    "iframe[src*='taboola.com']",
    "iframe[src*='outbrain.com']",
    "iframe[src*='adsterra.com']",
    "iframe[src*='propellerads.com']",
    "iframe[src*='popads.net']",
    "div[id^='google_ads_div']",
    "div[id^='div-gpt-ad']",
    "div[id^='ad_slot']",
    "div[id^='ad-slot']",
    "div[class^='ad-slot']",
    "div[class*=' ads-banner ']",
    "aside[aria-label='Advertisement']",
    "aside[aria-label='Publicidade']",
    "aside[aria-label='Publicité']",
    "aside[aria-label='Werbung']",
    "aside[aria-label='Anuncio']",
    "aside[aria-label='Anúncio']",
    "aside[aria-label='広告']",
    "aside[aria-label='广告']",
    "aside[aria-label='Reklam']",
    "aside[aria-label='Reklama']",
    "aside[aria-label='Reklamu']",
    "aside[aria-label='광고']",
    "aside[aria-label='Реклама']",
    "aside[aria-label='إعلان']",
    "aside[aria-label='विज्ञापन']",
    "[data-ad-slot]",
    "[data-adunit]",
    "[data-dfp-adunit]",
    "[data-testid='ad-slot']",
    "[data-testid='ad-banner']",
    "[aria-label='advertisement']",
    "[aria-label='Sponsored']",
    "[aria-label='Patrocinado']",
    ".ad-container",
    ".ad-container-728",
    ".ad-wrapper",
    ".ad-banner",
    ".ad-leaderboard",
    ".ad-rectangle",
    ".ad-skyscraper",
    ".advertisement",
    ".advertisement-wrapper",
    ".adsbox",
    ".banner-ads",
    ".banner-ad",
    ".sponsored-post",
    ".sponsored-item",
    ".trc_related_container",
    ".OUTBRAIN",
    ".ob-widget",
    ".taboola-ad",
    ".trc_excludable",
    ".ad-slot-megabanner",
    ".ad-slot-mpu",
    ".ad-slot-billboard",
    ".js-ad",
    ".js-sticky-ad",
    ".dfp-ad",
    ".gpt-ad",
    ".pub_300x250",
    ".pub_728x90",
    ".text-ad-links",
    ".text-ad",
    ".ad-inarticle",
    ".ytp-ad-module",
    ".ytp-ad-overlay-container",
    ".video-ads",
    "#player-ads",
    "#masthead-ad",
    "#top-banner-ad",
    "#bottom-banner-ad",
    "ytd-ad-slot-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-video-renderer",
    "ytd-display-ad-renderer",
    "ytd-merch-shelf-renderer",
    "ytd-statement-banner-renderer",
    "ytm-promoted-sparkles-web-renderer",
    "ytm-companion-ad-renderer",
    "ytm-ad-slot-renderer",
    "masthead-ad",
    "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)",
  ];

  const STYLE_ID = "aegis-hide-style";
  let hiddenCount = 0;

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    try {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = SELECTORS.map((s) => `${s}{display:none!important;visibility:hidden!important;height:0!important;max-height:0!important;overflow:hidden!important}`).join("\n");
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}
  }

  function sweep() {
    let found = 0;
    for (const sel of SELECTORS) {
      try {
        const nodes = document.querySelectorAll(sel);
        if (nodes.length) found += nodes.length;
      } catch (e) {}
    }
    if (found > 0) {
      hiddenCount += found;
      scheduleReport();
    }
  }

  let reportTimer = null;
  function scheduleReport() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
      reportTimer = null;
      const n = hiddenCount;
      hiddenCount = 0;
      try {
        chrome.runtime.sendMessage({ type: "cosmeticCount", count: n }).catch(() => {});
      } catch (e) {}
    }, 4000);
  }

  // evita expor identidade da extensão na página (stealth)
  function boot() {
    injectStyle();
    sweep();
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestIdleCallback
        ? requestIdleCallback(() => { pending = false; sweep(); }, { timeout: 1500 })
        : setTimeout(() => { pending = false; sweep(); }, 1200);
    });
    try {
      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
      });
    } catch (e) {}
    // reforço periódico leve (SPA / navegação do YouTube)
    setInterval(sweep, 6000);
  }

  if (document.documentElement) boot();
  else document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
