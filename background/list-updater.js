/**
 * AegisBlock — Atualizador automático da lista de bloqueio
 *
 * Baixa a lista do arquivo raw (GitHub) em intervalos configuráveis
 * (padrão: 5 horas) e aplica SEM exigir atualização da extensão:
 *
 *   • URLs NOVAS no arquivo remoto     -> regras dinâmicas "block"
 *   • URLs REMOVIDAS do arquivo remoto -> regras dinâmicas "allow"
 *     (corrige falsos positivos sem publicar nova versão da extensão)
 *
 * As regras estáticas embutidas continuam valendo; o remoto sobrepõe.
 */

export const DEFAULT_RAW_URL =
  "https://raw.githubusercontent.com/Pedro21062014/aegisblock/main/data/blocklist_urls.txt";

const DEFAULT_UPDATE = {
  autoUpdate: true,
  intervalHours: 5,
  sourceUrl: DEFAULT_RAW_URL,
};

const ALARM_NAME = "aegis-list-update";

// Faixas de IDs das regras dinâmicas (não colidem com as estáticas)
const ID_BLOCK = { ads: 600000, trackers: 620000, malware: 640000 };
const ID_ALLOW = 700000;

const RESOURCE_TYPES = [
  "script", "image", "xmlhttprequest", "sub_frame", "media",
  "websocket", "ping", "font", "other",
];

// ---------------------------------------------------------------- internos
async function loadSettings() {
  const data = await chrome.storage.local.get(["settings"]);
  return { ...DEFAULT_UPDATE, ...(data.settings || {}) };
}

async function loadStatus() {
  const data = await chrome.storage.local.get(["listStatus"]);
  return data.listStatus || {};
}

async function saveStatus(patch) {
  const cur = await loadStatus();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ listStatus: next });
  return next;
}

function parseList(text) {
  // formato: URL<tab>categoria  |  linhas "#" são comentários
  const map = new Map();
  if (!text) return map;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.charCodeAt(0) === 35) continue; // '#'
    const tab = line.indexOf("\t");
    const url = (tab >= 0 ? line.slice(0, tab) : line).trim();
    let cat = tab >= 0 ? line.slice(tab + 1).trim() : "";
    if (cat !== "ads" && cat !== "trackers" && cat !== "malware") cat = "ads";
    if (url.startsWith("http")) map.set(url, cat);
  }
  return map;
}

function quickHash(text) {
  // FNV-1a 32-bit — suficiente para detectar mudança de conteúdo
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

function urlToFilter(url) {
  const m = /^https?:\/\/([^/]+)(\/.*)?$/.exec(url);
  if (!m) return null;
  const host = m[1];
  const path = m[2] || "/";
  if (path === "/") return `||${host}^`;
  return `||${host}${path.replace(/[*^]/g, "")}^`;
}

function makeBlockRule(id, url) {
  const uf = urlToFilter(url);
  if (!uf) return null;
  return {
    id,
    priority: 10,
    action: { type: "block" },
    condition: { urlFilter: uf, resourceTypes: RESOURCE_TYPES },
  };
}

function makeAllowRule(id, url) {
  const uf = urlToFilter(url);
  if (!uf) return null;
  return {
    id,
    priority: 200, // vence qualquer regra de bloqueio
    action: { type: "allow" },
    condition: { urlFilter: uf, resourceTypes: RESOURCE_TYPES },
  };
}

async function fetchText(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 30000);
  try {
    const resp = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- API
export async function getUpdateConfig() {
  return await loadSettings();
}

/** Agenda (ou cancela) o alarme de atualização conforme as configurações. */
export async function applyUpdatePolicy() {
  const s = await loadSettings();
  if (!s.autoUpdate) {
    await chrome.alarms.clear(ALARM_NAME);
    const st = await loadStatus();
    await saveStatus({ nextAt: 0, intervalHours: s.intervalHours, sourceUrl: s.sourceUrl });
    return;
  }
  const hours = Math.max(0.25, Number(s.intervalHours) || 5);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: hours * 60,
    delayInMinutes: 0.5,
  });
  await saveStatus({
    nextAt: Date.now() + hours * 3600000,
    intervalHours: hours,
    sourceUrl: s.sourceUrl,
  });
}

export async function getListStatus() {
  const st = await loadStatus();
  const s = await loadSettings();
  return {
    ...st,
    autoUpdate: s.autoUpdate !== false,
    intervalHours: Number(s.intervalHours) || 5,
    sourceUrl: s.sourceUrl || DEFAULT_RAW_URL,
  };
}

/**
 * Executa uma atualização. Retorna o status novo.
 * force = true ignora a detecção de "sem mudança".
 */
export async function runListUpdate(force) {
  const s = await loadSettings();
  const status = await loadStatus();
  await saveStatus({ lastAttempt: Date.now(), updating: true });

  try {
    // 1. baseline embutida na extensão
    const baseUrl = chrome.runtime.getURL("data/blocklist_urls.txt");
    const baseText = await fetchText(baseUrl, 15000);
    const baseline = parseList(baseText);

    // 2. lista remota (raw do GitHub)
    const remoteText = await fetchText(s.sourceUrl || DEFAULT_RAW_URL, 45000);
    const remote = parseList(remoteText);
    const hash = quickHash(remoteText);

    if (!force && status.remoteHash === hash) {
      const st = await saveStatus({
        updating: false,
        lastSuccess: Date.now(),
        unchanged: true,
        lastError: null,
      });
      return st;
    }

    // 3. diff
    const added = [];    // no remoto, fora do embutido -> block
    const removed = [];  // no embutido, fora do remoto -> allow
    for (const [url, cat] of remote) {
      if (!baseline.has(url)) added.push([url, cat]);
    }
    for (const [url, cat] of baseline) {
      if (!remote.has(url)) removed.push([url, cat]);
    }

    // 4. orçamento de regras dinâmicas
    const maxDyn = Math.min(
      25000,
      (chrome.declarativeNetRequest.MAX_NUMBER_OF_DYNAMIC_RULES || 5000) - 100
    );
    // remoções (correções de falso positivo) têm prioridade sobre adições
    const allowBudget = Math.min(removed.length, Math.floor(maxDyn * 0.25), 3000);
    const blockBudget = maxDyn - allowBudget;

    const rules = [];
    const counters = { ads: ID_BLOCK.ads, trackers: ID_BLOCK.trackers, malware: ID_BLOCK.malware };

    let skipped = 0;
    let blockCount = 0;
    for (const [url, cat] of added) {
      if (blockCount >= blockBudget) { skipped++; continue; }
      const base = counters[cat] !== undefined ? counters[cat] : counters.ads;
      const rule = makeBlockRule(base, url);
      if (!rule) continue;
      counters[cat] = base + 1;
      rules.push(rule);
      blockCount++;
    }

    let allowCount = 0;
    for (let i = 0; i < allowBudget; i++) {
      const [url] = removed[i];
      const rule = makeAllowRule(ID_ALLOW + i, url);
      if (!rule) continue;
      rules.push(rule);
      allowCount++;
    }
    const removedSkipped = Math.max(0, removed.length - allowBudget);

    // 5. substitui todas as regras dinâmicas (idempotente)
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: rules,
    });

    const st = await saveStatus({
      updating: false,
      unchanged: false,
      remoteHash: hash,
      lastSuccess: Date.now(),
      lastError: null,
      remoteCount: remote.size,
      baselineCount: baseline.size,
      addedCount: blockCount,
      removedCount: allowCount,
      skippedCount: skipped + removedSkipped,
    });
    return st;
  } catch (e) {
    const st = await saveStatus({
      updating: false,
      lastError: String((e && e.message) || e),
    });
    return st;
  }
}

/** Alarme disparou -> atualiza (se automático estiver ligado). */
export async function onListAlarm() {
  const s = await loadSettings();
  if (s.autoUpdate === false) return;
  await runListUpdate(false);
  await applyUpdatePolicy();
}
