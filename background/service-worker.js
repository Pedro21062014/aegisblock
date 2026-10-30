/**
 * AegisBlock — Service Worker (MV3)
 * Coleta estatísticas de bloqueio via declarativeNetRequest.getMatchedRules,
 * mantém contadores globais e por categoria e atualiza o badge do ícone.
 */
import { categoryForRuleId } from "./rule-map.js";
import {
  applyUpdatePolicy,
  runListUpdate,
  getListStatus,
  onListAlarm,
} from "./list-updater.js";
import {
  checkForUpdate,
  applyUpdate,
  getUpdateState,
} from "./app-updater.js";

const DEFAULT_STATS = {
  ads: 0,
  trackers: 0,
  malware: 0,
  cosmetics: 0,
  sessions: 0,
  since: Date.now(),
  days: {},
  lastReset: Date.now(),
};

const DEFAULT_SETTINGS = {
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  blockMalware: true,
  cosmeticFiltering: true,
  youtubeShield: true,
  stealth: true,
  language: "",
  whitelist: [],
  sitePaused: {},
};

let lastPollTs = Date.now();
const seenKeys = new Set();

async function getState() {
  const data = await chrome.storage.local.get(["stats", "settings"]);
  return {
    stats: { ...DEFAULT_STATS, ...(data.stats || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
  };
}

async function saveStats(stats) {
  await chrome.storage.local.set({ stats });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function bump(stats, category, n = 1) {
  if (!n) return;
  if (category === "ads") stats.ads += n;
  else if (category === "trackers") stats.trackers += n;
  else if (category === "malware") stats.malware += n;
  else stats.ads += n;
  const key = todayKey();
  if (!stats.days[key]) stats.days[key] = { ads: 0, trackers: 0, malware: 0 };
  const day = stats.days[key];
  if (category === "trackers") day.trackers += n;
  else if (category === "malware") day.malware += n;
  else day.ads += n;
  // mantém apenas os últimos 14 dias
  const keys = Object.keys(stats.days).sort();
  while (keys.length > 14) {
    delete stats.days[keys.shift()];
  }
}

async function pollMatchedRules() {
  try {
    const { settings } = await getState();
    if (!settings.enabled) {
      lastPollTs = Date.now();
      return;
    }
    const res = await chrome.declarativeNetRequest.getMatchedRules({
      minTimeStamp: lastPollTs - 1000,
    });
    const now = Date.now();
    const { stats } = await getState();
    let changed = false;
    for (const info of res.rulesMatchedInfo || []) {
      const key = `${info.ruleId}|${info.tabId}|${info.timeStamp}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const cat = categoryForRuleId(info.ruleId);
      if (cat === "allow") continue; // regras de correção não contam
      bump(stats, cat);
      changed = true;
    }
    // evita crescimento infinito do conjunto de dedupe
    if (seenKeys.size > 50000) seenKeys.clear();
    lastPollTs = now;
    if (changed) await saveStats(stats);
    await updateBadge();
  } catch (e) {
    // API pode recusar consultas muito frequentes; tenta de novo no próximo ciclo
  }
}

async function updateBadge() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || tab.id === undefined) return;
    const txt = await chrome.action.getBadgeText({ tabId: tab.id });
    const n = parseInt(txt || "0", 10) || 0;
    if (n > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: "#2edc96", tabId: tab.id });
      await chrome.action.setBadgeTextColor?.({ color: "#06251b", tabId: tab.id });
    }
  } catch (e) {}
}

// ---------- mensagens do popup / content scripts ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return;
    if (msg.type === "getStats") {
      const { stats, settings } = await getState();
      sendResponse({ ok: true, stats, settings });
    } else if (msg.type === "resetStats") {
      const { settings } = await getState();
      const fresh = { ...DEFAULT_STATS, since: Date.now(), days: {}, lastReset: Date.now() };
      await saveStats(fresh);
      sendResponse({ ok: true, stats: fresh, settings });
    } else if (msg.type === "setSettings") {
      const { settings } = await getState();
      const next = { ...settings, ...msg.patch };
      await chrome.storage.local.set({ settings: next });
      if (msg.patch && msg.patch.enabled === false) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          disableRulesetIds: ALL_RULESETS,
        });
      } else if (msg.patch && msg.patch.enabled === true) {
        await chrome.declarativeNetRequest.updateEnabledRulesets({
          enableRulesetIds: ALL_RULESETS,
        });
      }
      // reconfigura a atualização automática da lista, se mexeram nela
      if (
        msg.patch &&
        ("autoUpdate" in msg.patch || "intervalHours" in msg.patch || "sourceUrl" in msg.patch)
      ) {
        await applyUpdatePolicy();
      }
      sendResponse({ ok: true, settings: next });
    } else if (msg.type === "cosmeticCount") {
      const { stats } = await getState();
      bump(stats, "ads", 0); // garante estrutura
      stats.cosmetics += msg.count || 0;
      const key = todayKey();
      if (!stats.days[key]) stats.days[key] = { ads: 0, trackers: 0, malware: 0 };
      await saveStats(stats);
      sendResponse({ ok: true });
    } else if (msg.type === "sessionStart") {
      const { stats } = await getState();
      stats.sessions += 1;
      await saveStats(stats);
      sendResponse({ ok: true });
    } else if (msg.type === "getListStatus") {
      const st = await getListStatus();
      sendResponse({ ok: true, status: st });
    } else if (msg.type === "checkUpdate") {
      // compara a versão instalada com a do GitHub (manifest.json do repo)
      const st = await checkForUpdate();
      sendResponse({ ok: true, update: st });
    } else if (msg.type === "getUpdateState") {
      sendResponse({ ok: true, update: getUpdateState() });
    } else if (msg.type === "applyUpdate") {
      // atualiza TUDO: canal oficial do Chrome (completo) ou dados + pacote
      const res = await applyUpdate();
      sendResponse({ ok: true, ...res, update: getUpdateState() });
    } else if (msg.type === "listUpdateNow") {
      const st = await runListUpdate(true);
      sendResponse({ ok: true, status: st });
    } else if (msg.type === "openOptions") {
      chrome.runtime.openOptionsPage().catch(() => {});
      sendResponse({ ok: true });
    } else if (msg.type === "openWelcome") {
      chrome.tabs.create({ url: chrome.runtime.getURL("welcome/welcome.html") }).catch(() => {});
      sendResponse({ ok: true });
    } else if (msg.type === "closeSelf") {
      if (sender.tab && sender.tab.id !== undefined) {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
      }
      sendResponse({ ok: true });
    } else if (msg.type === "getPageData") {
      // dados REAIS da página atual + fatos da lista
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        let tabCount = 0;
        let domain = "";
        let whitelisted = false;
        if (tab && tab.id !== undefined) {
          const badge = await chrome.action.getBadgeText({ tabId: tab.id });
          tabCount = parseInt(badge || "0", 10) || 0;
          if (tab.url) {
            try {
              const u = new URL(tab.url);
              if (u.protocol.startsWith("http")) domain = u.hostname.replace(/^www\./, "");
            } catch (e) {}
          }
          const { settings } = await getState();
          whitelisted = (settings.whitelist || []).includes(domain);
        }
        sendResponse({ ok: true, tabCount, domain, whitelisted });
      } catch (e) {
        sendResponse({ ok: true, tabCount: 0, domain: "", whitelisted: false });
      }
    }
  })();
  return true; // resposta assíncrona
});

const ALL_RULESETS = [
  "youtube_fix", "curated_urls",
  "bulk_01", "bulk_02", "bulk_03", "bulk_04", "bulk_05", "bulk_06",
  "bulk_07", "bulk_08", "bulk_09", "bulk_10",
  "domains",
];

chrome.runtime.onInstalled.addListener(async (details) => {
  const { stats, settings } = await getState();
  if (!stats.since) stats.since = Date.now();
  await chrome.storage.local.set({ stats, settings });
  try {
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: true,
    });
  } catch (e) {}
  if (details && details.reason === "install") {
    // abre a página local de boas-vindas + tour
    await chrome.tabs
      .create({ url: chrome.runtime.getURL("welcome/welcome.html") })
      .catch(() => {});
  }
  // agenda a atualização automática da lista (padrão: a cada 5 h)
  await applyUpdatePolicy();
  // verificação de nova versão no GitHub (1ª após 30s e depois a cada 24h)
  chrome.alarms.create("aegis-update-check", {
    delayInMinutes: 0.5,
    periodInMinutes: 1440,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await chrome.declarativeNetRequest.setExtensionActionOptions({
      displayActionCountAsBadgeText: true,
    });
  } catch (e) {}
  // verifica se a atualização está atrasada
  await applyUpdatePolicy();
  chrome.alarms.create("aegis-update-check", {
    delayInMinutes: 1,
    periodInMinutes: 1440,
  });
});

chrome.alarms.create("aegis-poll", { periodInMinutes: 0.25 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "aegis-poll") pollMatchedRules();
  else if (alarm.name === "aegis-list-update") onListAlarm();
  else if (alarm.name === "aegis-update-check") checkForUpdate();
});

// badge reativo por aba
chrome.tabs.onActivated.addListener(updateBadge);
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "complete") updateBadge();
});
