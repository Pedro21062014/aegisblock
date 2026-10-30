/**
 * AegisBlock — Autoatualização a partir do GitHub
 *
 * Botão "Atualizar" da extensão (popup + configurações):
 *  1) Compara a versão instalada com a do manifest.json do repositório;
 *  2) Se houver versão nova:
 *     a) Canal OFICIAL do Chrome (extensões instaladas via CRX/update_url):
 *        `requestUpdateCheck` + `reload` — o Chrome substitui TODA a extensão;
 *     b) Instalação "descompactada" (dev): o Chrome proíbe a extensão de
 *        reescrever os próprios arquivos em runtime — então atualizamos os
 *        DADOS (lista/regras) na hora e baixamos o pacote .zip mais recente
 *        para o usuário recarregar em chrome://extensions.
 *
 * Verificação automática: no install/startup e a cada 24h (o estado fica
 * disponível para o popup exibir o aviso "Nova versão disponível").
 */

const REPO_RAW_MANIFEST =
  "https://raw.githubusercontent.com/Pedro21062014/aegisblock/main/manifest.json";
const REPO_ZIP_URL =
  "https://github.com/Pedro21062014/aegisblock/archive/refs/heads/main.zip";
const REPO_PAGE = "https://github.com/Pedro21062014/aegisblock";

let UPDATE_STATE = {
  hasUpdate: false,
  latest: null,
  current: null,
  checkedAt: 0,
  error: null,
};

function parseVersion(v) {
  return String(v || "0").split(".").map((n) => parseInt(n, 10) || 0);
}

export function cmpVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
  }
  return 0;
}

export async function checkForUpdate() {
  const current = chrome.runtime.getManifest().version;
  try {
    const r = await fetch(REPO_RAW_MANIFEST + "?t=" + Date.now(), {
      cache: "no-store",
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const remote = await r.json();
    const latest = remote.version || "0";
    UPDATE_STATE = {
      hasUpdate: cmpVersion(latest, current) > 0,
      latest,
      current,
      checkedAt: Date.now(),
      error: null,
    };
  } catch (e) {
    UPDATE_STATE = {
      ...UPDATE_STATE,
      current,
      checkedAt: Date.now(),
      error: String(e && e.message ? e.message : e),
    };
  }
  return UPDATE_STATE;
}

export function getUpdateState() {
  return UPDATE_STATE;
}

/**
 * Aplica a atualização disponível.
 * - Canal oficial (CRX + update_url): o Chrome baixa e reativa a extensão;
 * - Descompactada: dados atualizados + pacote baixado (instruções na UI).
 */
export async function applyUpdate() {
  // 1) canal oficial do Chrome — atualização COMPLETA da extensão
  try {
    const res = await chrome.runtime.requestUpdateCheck();
    if (res && res.status === "update_available") {
      // dá tempo do Chrome concluir o download da nova versão
      await new Promise((r) => setTimeout(r, 1500));
      chrome.runtime.reload();
      return { reloading: true, mode: "chrome" };
    }
  } catch (e) {}

  // 2) instalação descompactada — dados na hora + pacote do GitHub
  try {
    const { runListUpdate } = await import("./list-updater.js");
    await runListUpdate(true);
  } catch (e) {}
  return {
    reloading: false,
    mode: "manual",
    zipUrl: REPO_ZIP_URL,
    pageUrl: REPO_PAGE,
  };
}

/** Verificação periódica (usada pelo alarme do SW). */
export async function periodicCheck() {
  const st = await checkForUpdate();
  return st;
}

export const UPDATE_URLS = {
  manifest: REPO_RAW_MANIFEST,
  zip: REPO_ZIP_URL,
  page: REPO_PAGE,
};
