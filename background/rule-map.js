/**
 * Mapa de IDs de regras -> categoria (gerado a partir de tools/generate_blocklist.py)
 * Faixas disjuntas — nunca colidem entre si.
 *
 * Estáticas:
 *   1-999          youtube/ads críticos
 *   1000-9999      URLs exatas curadas
 *   10000-199999   URLs geradas (ads)
 *   200000-299999  URLs geradas (trackers)
 *   300000-399999  malware
 *   500000-509999  domínios ads
 *   510000-519999  domínios trackers
 *   520000-529999  domínios malware
 * Dinâmicas (atualização via raw):
 *   600000-619999  block ads
 *   620000-639999  block trackers
 *   640000-659999  block malware
 *   700000+        allow (URLs removidas da lista remota)
 */
export function categoryForRuleId(id) {
  if (id >= 1 && id <= 999) return "ads";
  if (id >= 1000 && id <= 9999) return "ads";
  if (id >= 10000 && id <= 199999) return "ads";
  if (id >= 200000 && id <= 299999) return "trackers";
  if (id >= 300000 && id <= 399999) return "malware";
  if (id >= 500000 && id <= 509999) return "ads";
  if (id >= 510000 && id <= 519999) return "trackers";
  if (id >= 520000 && id <= 529999) return "malware";
  if (id >= 600000 && id <= 619999) return "ads";
  if (id >= 620000 && id <= 639999) return "trackers";
  if (id >= 640000 && id <= 659999) return "malware";
  if (id >= 700000) return "allow"; // não contabiliza como bloqueio
  return "ads";
}
