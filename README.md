# 🛡️ AegisBlock — Bloqueador de Anúncios e Rastreadores

<p align="center">
  <img src="assets/icons/icon128.png" width="96" alt="AegisBlock" />
</p>

<p align="center">
  <b>Bloqueia anúncios, rastreadores e ameaças — no YouTube e em toda a web — com 150.099 URLs de bloqueio, interface em 12 idiomas e estatísticas em tempo real.</b>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.0-2edc96?style=flat-square" />
  <img alt="urls" src="https://img.shields.io/badge/blocklist-150.099%20URLs-4aa8ff?style=flat-square" />
  <img alt="langs" src="https://img.shields.io/badge/languages-12-8b7cff?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ffc857?style=flat-square" />
</p>

---

## ✨ Recursos

| Recurso | Descrição |
|---|---|
| 🚫 **Bloqueio em 150.099 URLs** | Lista gerada a partir de **739 domínios curados** de redes de anúncios, rastreadores e malvertising (DoubleClick, Criteo, Taboola, AppNexus, Outbrain, etc.) + **35.446 hosts** com variações de subdomínio e caminhos |
| 🔄 **Atualização automática da lista** | A cada **5 horas** (intervalo configurável: 1h a 48h ou manual), a extensão baixa o arquivo raw do GitHub e aplica as mudanças **sem atualizar a extensão**: URLs novas → bloqueio imediato; URLs removidas → exceção automática (corrige falsos positivos) |
| ▶️ **Escudo YouTube** | Remove `adPlacements` / `playerAds` das respostas do player **sem bloquear o vídeo** — sem travamentos, sem "ad blocker detected" |
| 🎯 **Zero falso-positivo** | Apenas domínios de ad-tech são usados como semente; domínios de conteúdo (seu banco, sua loja, seu streaming) nunca entram na lista |
| 🫥 **Modo discreto** | Content scripts sem globais óbvios, sem marcas de extensão expostas à página |
| 🌍 **12 idiomas** | Português (BR), Inglês, Espanhol, Francês, Alemão, Italiano, Japonês, Chinês, Russo, Coreano, Árabe e Hindi |
| 📊 **Estatísticas ao vivo** | Anúncios, rastreadores e ameaças bloqueadas + elementos ocultos + tempo e dados economizados + gráfico de 7 dias |
| 🔐 **Animação de segurança** | Interface profissional com animação Lottie de proteção segura (cadeado) no popup e nas configurações |
| ⚙️ **Configurações granulares** | Liga/desliga por categoria, whitelist por site, escudo YouTube, modo discreto, intervalo de atualização |

## 🧱 Arquitetura (Manifest V3)

```
aegisblock/
├── manifest.json               # MV3 + declarativeNetRequest
├── background/
│   ├── service-worker.js       # estatísticas (getMatchedRules) + badge
│   ├── list-updater.js         # atualização automática via arquivo raw
│   └── rule-map.js             # IDs de regras → categorias
├── content/
│   ├── main-world.js           # escudo YouTube (mundo MAIN)
│   ├── cosmetic.js             # filtros cosméticos conservadores
│   └── hide.css
├── rules/                      # ~150.100 regras declarativeNetRequest
│   ├── youtube_fix.json        # prioridade 100 (YouTube/Google ads)
│   ├── curated_urls.json       # prioridade 50 (URLs curadas)
│   ├── bulk_01..06.json        # prioridade 10 (URLs geradas)
│   └── domains.json            # prioridade 5 (35.446 hosts)
├── popup/                      # UI com animação Lottie + estatísticas
├── options/                    # página de configurações
├── data/
│   ├── blocklist_urls.txt      # as 150.099 URLs (legível)
│   ├── hosts_catalog.json      # host → categoria
│   └── rule_index.json
├── lib/lottie_svg.min.js       # player Lottie (SVG)
├── _locales/                   # 12 idiomas
└── tools/                      # gerador da lista + ícones + preview
```

## 🚀 Instalação (Chrome / Edge / Brave / Chromium)

1. Baixe ou clone este repositório
2. Abra `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação** e selecione a pasta `aegisblock/`
5. Pronto! O ícone do escudo 🛡️ aparece na barra de ferramentas

> **Firefox:** `about:debugging` → *This Firefox* → *Load Temporary Add-on* → selecione `manifest.json`.

## 🖥️ Interface

A animação de segurança (cadeado Lottie) é exibida no popup e na página de configurações para indicar que a proteção está ativa. Você também pode abrir `preview.html` no navegador para ver a interface completa sem instalar a extensão.

## 🛡️ Como o YouTube é protegido (sem quebrar nada)

1. `content/main-world.js` roda em `document_start` no mundo MAIN
2. Intercepta `ytInitialPlayerResponse`, `fetch` e `XHR` do player
3. Remove somente os campos publicitários (`adPlacements`, `playerAds`, `adSlots`, `adBreakHeartbeatParams`)
4. **Nunca** bloqueia requisições de mídia do `googlevideo.com` — o vídeo toca normalmente
5. Pula automaticamente anúncios que escaparem e oculta overlays

## 🔄 Atualização automática da lista (sem reinstalar a extensão)

A extensão sincroniza a lista de bloqueio com o arquivo raw do repositório:

```
https://raw.githubusercontent.com/Pedro21062014/aegisblock/main/data/blocklist_urls.txt
```

**Como funciona:**

1. A cada intervalo (padrão **5 horas**, configurável em *Configurações → Atualização de listas*: 1h, 3h, 5h, 12h, 24h, 48h ou manual), a extensão baixa o arquivo raw
2. Compara com a lista embutida na versão instalada
3. **URLs novas** no arquivo remoto → viram regras de bloqueio dinâmicas na hora
4. **URLs removidas** do arquivo remoto → viram regras de exceção (`allow`), corrigindo falsos positivos imediatamente
5. Nenhuma atualização/reinstalação da extensão é necessária — os usuários sempre têm a lista mais recente

**Para publicar atualizações da lista** (mantenedores): edite `data/blocklist_urls.txt`
(com `python3 tools/generate_blocklist.py`) e faça `git push` — em até 5 horas todos os
usuários recebem a mudança. Também é possível usar um *fork* ou URL próprio
(campo "Fonte da lista" nas configurações).

## 📈 Estatísticas

Contagens em tempo real via `declarativeNetRequest.getMatchedRules`:

- **Anúncios** bloqueados
- **Rastreadores** bloqueados
- **Ameaças** (malvertising/golpes) bloqueadas
- **Elementos ocultos** (filtros cosméticos)
- **Tempo economizado** (~5 s por anúncio evitado)
- **Dados economizados** (~350 KB por anúncio evitado)
- Gráfico dos **últimos 7 dias**

## 🗂️ Lista de bloqueio (150.099 URLs)

Gerada por `tools/generate_blocklist.py` a partir de:

- **739 domínios curados** de ad-tech real (Google Ads/DoubleClick, Criteo, Taboola, Outbrain, PubMatic, Rubicon, AppNexus, AdRoll, Teads, Amazon Ads, Unity Ads, AppLovin, ironSource, Moat, ScorecardResearch, Hotjar, etc.)
- **47 prefixos de subdomínio** (`ads.`, `track.`, `pixel.`, `sync.`, `rtb.` …)
- **50 caminhos típicos** de anúncio/rastreamento (`/banner.gif`, `/pixel.gif`, `/vast.xml`, `/tag.js` …)
- Variações regionais do Google Ads (`adservice.google.*` em ~180 TLDs)

Para regenerar:

```bash
python3 tools/generate_blocklist.py
```

## 🔒 Privacidade

- ✅ Nenhum dado é enviado a servidores externos
- ✅ Estatísticas ficam apenas no `chrome.storage.local` do seu navegador
- ✅ Sem telemetria, sem conta, sem cadastro

## 📜 Licença

[MIT](LICENSE) — uso livre.

---

> Feito com 🛡️ para uma web mais limpa e rápida.
