/**
 * Mapa de IDs de regras -> categoria (gerado a partir de tools/generate_blocklist.py)
 * Faixas disjuntas — nunca colidem entre si.
 */
export function categoryForRuleId(id) {
  if (id >= 1 && id <= 999) return "ads";          // youtube_fix
  if (id >= 1000 && id <= 9999) return "ads";      // curated urls
  if (id >= 10000 && id <= 199999) return "ads";   // bulk ads
  if (id >= 200000 && id <= 299999) return "trackers";
  if (id >= 300000 && id <= 399999) return "malware";
  if (id >= 500000 && id <= 509999) return "ads";  // domínios ads
  if (id >= 510000 && id <= 519999) return "trackers";
  if (id >= 520000 && id <= 529999) return "malware";
  return "ads";
}
