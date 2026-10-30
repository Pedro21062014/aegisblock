# 🛡️ AegisBlock — Bloqueador de Anúncios e Rastreadores

<p align="center">
  <img src="assets/icons/icon128.png" width="96" alt="AegisBlock" />
</p>

<p align="center">
  <b>Bloqueia anúncios, rastreadores e ameaças — no YouTube e em toda a web — com 230.117 URLs de bloqueio, interface em 12 idiomas e estatísticas em tempo real.</b>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.3.0-2edc96?style=flat-square" />
  <img alt="urls" src="https://img.shields.io/badge/blocklist-230.117%20URLs-4aa8ff?style=flat-square" />
  <img alt="langs" src="https://img.shields.io/badge/languages-12-8b7cff?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ffc857?style=flat-square" />
</p>

---

## ✨ Recursos

| Recurso | Descrição |
|---|---|
| 🚫 **Bloqueio em 230.117 URLs** | Lista gerada a partir de **783 domínios curados** de redes de anúncios, rastreadores e malvertising (DoubleClick, Criteo, Taboola, AppNexus, Outbrain, etc.) + **46.951 hosts** com variações de subdomínio e caminhos |
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
├── welcome/                    # boas-vindas local + tour guiado (5 passos)
├── background/
│   ├── service-worker.js       # estatísticas (getMatchedRules) + badge
│   ├── list-updater.js         # atualização automática via arquivo raw
│   └── rule-map.js             # IDs de regras → categorias
├── content/
│   ├── main-world.js           # escudo YouTube (mundo MAIN)
│   ├── cosmetic.js             # filtros cosméticos conservadores
│   └── hide.css
├── rules/                      # ~230.260 regras declarativeNetRequest
│   ├── youtube_fix.json        # prioridade 100 (YouTube/Google ads)
│   ├── curated_urls.json       # prioridade 50 (URLs curadas)
│   ├── bulk_01..06.json        # prioridade 10 (URLs geradas)
│   └── domains.json            # prioridade 5 (46.951 hosts)
├── popup/                      # UI com animação Lottie + dados reais
├── options/                    # painel de configurações + atualização de listas
├── data/
│   ├── blocklist_urls.txt      # as 230.117 URLs (legível)
│   ├── facts.json              # métricas REAIS exibidas na interface
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
5. Na primeira instalação abre a **página de boas-vindas com tour guiado**

> **Firefox:** `about:debugging` → *This Firefox* → *Load Temporary Add-on* → selecione `manifest.json`.

## 👋 Boas-vindas + Tour

Na primeira instalação, a extensão abre `welcome/welcome.html` (arquivo local):
página profissional com animação de segurança, números reais da lista, recursos e um
**tour guiado em 5 passos** (com barra de progresso, navegação e atalho para as configurações).

## 🖥️ Interface (dados reais)

Animação Lottie de proteção (cadeado) com anéis orbitais · estatísticas **reais**
(bloqueios medidos, nunca inventados) · donut com a composição real da lista
(**185.616** anúncios · **17.201** rastreadores · **27.300** ameaças) · contador
**por página** · gráfico de 7 dias · status da sincronização remota.
`preview.html` e `preview-welcome.html` mostram tudo offline, sem instalar.

## 🛡️ Como o YouTube é protegido (sem quebrar nada)

O `content/main-world.js` (v3) roda em `document_start` no mundo MAIN e
**modifica o próprio código do site** em 3 camadas:

1. **Requisição** — o corpo do `POST /youtubei/v1/player` é reescrito antes de
   sair (sinais de anúncio removidos): o servidor nem agenda o anúncio
2. **Resposta/código** — `fetch`, `XMLHttpRequest`, `JSON.parse`,
   `ytInitialPlayerResponse`, `ytInitialData` e `ytplayer.config.args` são
   interceptados e as respostas são **sanitizadas em profundidade**
   (`adPlacements`, `playerAds`, `adSlots`, `adServingData`, `adSlotRenderer`…):
   o anúncio nunca chega ao player
3. **Player** — se algo escapar, o código do player é usado contra o anúncio:
   clique automático no "Pular anúncio", salto pela API oficial (somente
   durante o anúncio) e, por fim, aceleração silenciosa (16×, mudo) com
   restauração **exata** do estado original do vídeo

**Regras de ouro (anti-falso-positivo):**
- **Nunca** toca no vídeo de conteúdo — `googlevideo.com`/`ytimg.com` intocados, nenhum seek no conteúdo
- **Nunca** esconde o botão "Pular anúncio" (a limpeza de overlays verifica antes)
- Ações de salto apenas com **certeza** de anúncio (`getAdState()===1` e/ou marcadores DOM)
- Rede complementar: 54 regras prioritárias (`rules/youtube_fix.json`) bloqueando `pagead`, `ptracking`, `get_midroll_info`, `_get_ads`, `player/ad_break`, `pcs/activeview` em `www`, `m` e `music.youtube.com`

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

## 🗂️ Lista de bloqueio (230.117 URLs)

Gerada por `tools/generate_blocklist.py` a partir de:

- **783 domínios curados** de ad-tech real (Google Ads/DoubleClick, Criteo, Taboola, Outbrain, PubMatic, Rubicon, AppNexus, AdRoll, Teads, Amazon Ads, Unity Ads, AppLovin, ironSource, Moat, ScorecardResearch, Hotjar, etc.)
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
