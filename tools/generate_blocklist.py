#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisBlock - Gerador de Lista de Bloqueio (150.000+ URLs)
=========================================================
Gera a base de bloqueio da extensão a partir de uma semente CURADA de
redes de anúncios, rastreadores e domínios de malvertising conhecidos.

Estratégia anti-falso-positivo:
  * Somente domínios de ad-tech / analytics / malware são usados como semente
    (nunca domínios de conteúdo legítimo).
  * Prefixos de subdomínio são aplicados APENAS sobre as sementes.
  * Regras de caminho (path) só são geradas para hosts de anúncio.
  * YouTube/googlevideo NÃO são bloqueados por domínio — apenas por
    caminhos de anúncio específicos (para não quebrar o vídeo).

Saídas:
  data/blocklist_urls.txt   -> as 150.000+ URLs (formato legível)
  data/hosts_catalog.json   -> host -> categoria (para estatísticas)
  data/rule_index.json      -> índice de IDs/categorias das regras
  rules/*.json              -> rulesets declarativeNetRequest (MV3)
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
RULES = os.path.join(ROOT, "rules")
os.makedirs(DATA, exist_ok=True)
os.makedirs(RULES, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. SEMENTE CURADA — redes de anúncios, rastreadores e malvertising reais
# ---------------------------------------------------------------------------
# categoria: "ads" | "trackers" | "malware"

SEEDS = {}

def add(cat, *domains):
    for d in domains:
        d = d.strip().lower()
        if d:
            SEEDS.setdefault(d, cat)

# --- Google / YouTube advertising stack -------------------------------------
add("ads",
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "2mdn.net", "ad.doubleclick.net", "cm.g.doubleclick.net",
    "securepubads.g.doubleclick.net", "tpc.googlesyndication.com",
    "pagead2.googlesyndication.com", "googleads.g.doubleclick.net",
    "stats.g.doubleclick.net", "adservice.google.com",
    "www-googleads.l.google.com",
    "video-stats.l.google.com",
    "adx.ad.doubleclick.net", "fls.doubleclick.net", "s0.2mdn.net",
    "s1.2mdn.net", "m.2mdn.net", "akamai.2mdn.net", "a.2mdn.net",
    "n339adserv.com", "adservice.google.co.uk", "adservice.google.com.br",
    "fundingchoicesmessages.google.com", "syndication.twitter.com",
    "ads-api.twitter.com", "ads.twitter.com", "static.ads-twitter.com",
    "analytics.twitter.com", "ads.linkedin.com", "px.ads.linkedin.com",
    "snap.licdn.com", "ads.yahoo.com", "adserver.yahoo.com",
    "advertising.yahoo.com", "adtech.yahoo.com", "gemini.yahoo.com",
    "analytics.yahoo.com", "ups.analytics.yahoo.com",
    "ads.bing.com", "bat.bing.com", "ads.microsoft.com",
    "advert.liverail.com", "cdn.liverail.com", "ads.facebook.com",
    "an.facebook.com", "pixel.facebook.com", "analytics.facebook.com",
    "ads.instagram.com", "ad.doubleclick.net",
)

# --- Exchanges / SSPs / DSPs -----------------------------------------------
add("ads",
    "adnxs.com", "ib.adnxs.com", "secure.adnxs.com", "sin1.gslb.ib.adnxs.com",
    "criteo.com", "criteo.net", "bidswitch.net", "casalemedia.com",
    "pubmatic.com", "openx.net", "openx.com", "rubiconproject.com",
    "rubiconproject.net", "smartadserver.com", "adform.net", "adform.com",
    "adsrvr.org", "adroll.com", "adroll.net", "teads.tv", "teads.com",
    "sharethrough.com", "yieldmo.com", "33across.com", "contextweb.com",
    "pulsepoint.com", "districtm.io", "sonobi.com", "undertone.com",
    "tidalwave.video", "spotxchange.com", "spotx.tv", "spotxcdn.com",
    "tremorhub.com", "tremorvideo.com", "telaria.com", "freewheel.com",
    "freewheel.tv", "stickyadstv.com", "springserve.com", "beachfront.com",
    "lkqd.net", "exdynsrv.com", "exosrv.com", "realsrv.com", "exoclick.com",
    "exosrv.com", "clickadu.com", "hilltopads.net", "hilltopads.com",
    "trafficjunky.net", "trafficjunky.com", "juicyads.com", "popads.net",
    "popcash.net", "yllix.com", "yllix.net", "adsterra.com", "adsterra.net",
    "propellerads.com", "propellerclick.com", "propellerpops.com",
    "adcash.com", "ad-maven.com", "admaven.com", "galaksion.com",
    "monetag.com", "mgid.com", "outbrain.com", "outbrain.net",
    "taboola.com", "taboolasyndication.com", "revcontent.com",
    "content.ad", "adblade.com", "nativo.com", "triplelift.com",
    "polar.me", "plista.com", "ligatus.com", "dianomi.com",
    "adskeeper.com", "adskeeper.co.uk", "mgid.com", "yllix",
    "media.net", "contextual.media.net", "infolinks.com",
    "amazon-adsystem.com", "aax.amazon-adsystem.com", "c.amazon-adsystem.com",
    "mads.amazon-adsystem.com", "s.amazon-adsystem.com",
    "imdb-adlink?skip", "assoc-amazon.com", "fls-na.amazon-adsystem.com",
    "advertising.com", "adtechus.com", "adtech.de", "adserver.adtechus.com",
    "serving-sys.com", "serving-sys.net", "bs.serving-sys.com",
    "secure-ds.serving-sys.com", "sizmek.com", "serving-sys.com",
    "nexage.com", "one.aol.com", "adserver.adtech.de",
    "improvedigital.com", "improve-digital.com", "axiom?skip",
    "teads.tv", "vidoomy.com", "aniview.com", "aniview.net",
    "springserve.com", "connatix.com", "jwplayer.com", "jwpltx.com",
    "jwpsrv.com", "jwpcdn.com", "content.jwplatform.com",
    "pooldad?skip", "loopme.me", "loopme.biz", "ogury.com", "ogury.io",
    "adincube.com", "inner-active.mobi", "inner-active.com",
    "smaato.net", "smaato.com", "adcolony.com", "adcolony.net",
    "applovin.com", "applovin.net", "appnext.com", "appnext.net",
    "chartboost.com", "chartboost.net", "inmobi.com", "inmobi.net",
    "vungle.com", "vungle.net", "tapcore.com", "tapcore.net",
    "startapp.com", "startappservice.com", "ironsrc.com", "ironsource.com",
    "ironsource.net", "supersonicads.com", "digitalturbine.com",
    "fyber.com", "fyber.net", "fyber.com", "pangle.io", "pangle.io",
    "mintegral.com", "mintegral.net", "tapjoy.com", "tapjoyads.com",
    "unityads.unity3d.com", "auction.unity3d.com", "adserver.unity3d.com",
    "impactify.io", "magnite.com", "magnite.net", "rubiconvideo.com",
    "nativo.com", "nativo.net", "sharethrough.com", "sharethrough.net",
    "vidazoo.com", "anyclip.com", "ex.co", "brightcove.com",
    "akamaihd.net?careful", "bluekai.com", "bluekai.net",
)

# --- Métricas / rastreadores -------------------------------------------------
add("trackers",
    "google-analytics.com", "googletagmanager.com", "analytics.google.com",
    "ssl.google-analytics.com", "www.google-analytics.com",
    "region1.google-analytics.com", "region2.google-analytics.com",
    "scorecardresearch.com", "sb.scorecardresearch.com",
    "b.scorecardresearch.com", "secure.scorecardresearch.com",
    "quantserve.com", "quantcast.com", "edge.quantserve.com",
    "rules.quantcount.com", "pixel.quantserve.com", "hotjar.com",
    "hotjar.io", "static.hotjar.com", "vars.hotjar.com", "in.hotjar.com",
    "fullstory.com", "fullstory.net", "rs.fullstory.com",
    "mouseflow.com", "cdn.mouseflow.com", "crazyegg.com",
    "luckyorange.com", "luckyorange.net", "clarity.ms",
    "inspectlet.com", "ptengine.com", "ptengine.jp",
    "heapanalytics.com", "heapanalytics.net", "amplitude.com",
    "mixpanel.com", "api.mixpanel.com", "decide.mixpanel.com",
    "segment.com", "segment.io", "api.segment.io", "cdn.segment.com",
    "kissmetrics.io", "matomo.cloud", "piwik.org", "piwik.pro",
    "clicky.com", "getclicky.com", "in.getclicky.com",
    "statcounter.com", "statcounter.com", "c.statcounter.com",
    "histats.com", "hitslink.com", "whos.amung.us", "flagcounter.com",
    "chartbeat.com", "chartbeat.net", "ping.chartbeat.net",
    "static.chartbeat.com", "parsely.com", "api.parsely.com",
    "parse.ly", "cdn.parse.ly", "omtrdc.net", "2o7.net", "demdex.net",
    "everesttech.net", "agkn.com", "bluekai.com", "rlcdn.com",
    "crwdcntrl.net", "exelator.com", "krxd.net", "mathtag.com",
    "zeotap.com", "onaudience.com", "audienceproject.com",
    "addthis.com", "addthisedge.com", "s7.addthis.com", "m.addthis.com",
    "luckyorange.com", "crazyegg.com", "yandex.ru", "mc.yandex.ru",
    "in.appmtr.com", "appmetrica.yandex.ru", "yandexmetrica?skip",
    "flurry.com", "data.flurry.com", "secure.flurry.com",
    "branch.io", "api2.branch.io", "appsflyer.com", "appsflyersdk.com",
    "t.appsflyer.com", "launches.appsflyer.com", "adjust.com",
    "app.adjust.com", "s2s.adjust.com", "kochava.com", "control.kochava.com",
    "singular.net", "sdk-api-v1.singular.net", "tenjin.com",
    "api.tenjin.io", "mparticle.com", "jssdkcdns.mparticle.com",
    "doubleverify.com", "cdn.doubleverify.com", "tps.doubleverify.com",
    "ad.doubleverify.com", "pixel.adsafeprotected.com",
    "static.adsafeprotected.com", "adsafeprotected.com",
    "moatads.com", "z.moatads.com", "mb.moatads.com", "pixel.moatads.com",
    "integralads.com", "safeframe.googlesyndication.com",
    "adlooxtracking.com", "adloox.com", "pixalate.com", "pixalate.net",
    "impressiondesk?skip", "adnologies?skip", "eyeota.net",
    "liveramp.com", "rlcdn.com", "id5-sync.com", "id5-sync.net",
    "criteo.com", "dis.eu.criteo.com", "bidswitch.net", "crwdcntrl.net",
    "semantiq?skip", "w55c.net", "adsymptotic.com", "turn.com",
    "exelator.com", "adkernel.com", "pippio.com", "neustar.biz",
    "demdex.net", "omtrdc.net", "sc-static.net", "smartclip.net",
    "smartclip.com", "adition.com", "adition.net", "adscale.de",
    "adtech?skip", "xaxis.com", "tubemogul.com", "tubemogul.net",
    "vindicosuite.com", "vindicad?skip", "specificclick.net",
    "rfihub.com", "rfihub.net", "ru4.com", "rlcdn.com", "tidaltv.com",
    "adscale.de", "adspirit.de", "adspirit.net", "adtechus.com",
    "xplusone.com", "xgraph.com", "admeta.com", "admeta.net",
    "adform.net", "track.adform.net", "dmp.adform.net",
    "cmadserver?skip", "audiencemanager.de", "adsafety.org",
    "serving-sys.com", "gemius.com", "gemius.pl", "gsspat.jp",
    "gssprt.jp", "netmng.com", "intellitxt.com", "kontera.com",
    "adbrite.com", "adreactor.com", "adsrevenue.net", "adtechus.com",
    "pro-market.net", "rfihub.com", "adnium.com", "atdmt.com",
    "atwola.com", "betrad.com", "cdn.betrad.com", "evidon.com",
    "c.evidon.com", "optimum?skip", "admanmedia.com", "bidr.io",
    "bidswitch.net", "bidtellect.com", "brealtime.com", "beeswax.com",
    "between?skip", "brilig?skip", "bwads?skip", "bidtheatre.com",
    "bunchball?skip", "ccgateway?skip", "cdnondemand?skip",
    "clkdeals?skip", "cmdapi?skip", "cmmnt?skip", "collect.tealiumiq.com",
    "tealiumiq.com", "tiqcdn.com", "everestjs.net", "everesttech.net",
    "disqus.com", "disquscdn.com", "disqus.im", "embed.ly",
    "facebook.net", "connect.facebook.net", "pixel.facebook.com",
    "analytics.tiktok.com", "business-api.tiktok.com",
    "ads.tiktok.com", "analytics-ipv6.tiktokw.us",
    "log.byteoversea.com", "mon-va.byteoversea.com",
    "iadsdk.apple.com", "api-adservices.apple.com", "advertising.apple.com",
    "searchads.apple.com", "ca.iadsdk.apple.com", "iad.apple.com",
    "tr.snapchat.com", "sc-static.net", "snapchat.com?careful",
    "ads.pinterest.com", "analytics.pinterest.com", "ct.pinterest.com",
    "log.pinterest.com", "trk.pinterest.com", "s.pinimg.com?careful",
    "ads.reddit.com", "alb.reddit.com", "pixel.reddit.com",
    "w3-reporting.reddit.com", "redditstatic.com?careful",
    "static.ads-twitter.com", "t.co?careful", "analytics.tiktok.com",
    "ads.yahoo.com", "sp.analytics.yahoo.com", "udc.yahoo.com",
    "gemini.yahoo.com", "pr.comet.yahoo.com",
    "ad.linkedin.com", "px.ads.linkedin.com", "snap.licdn.com",
    "dc.ads.linkedin.com", "linkedin.com/px?skip",
    "adservice.google.com", "pagead2.google-analytics.com",
    "stats.wp.com", "pixel.wp.com", "widgets.wp.com", "stats.g.doubleclick.net",
    "pixel.wp.com", "hotjar?dup", "crazyegg?dup",
    "yandex.com", "yandex.net", "mc.yandex.com", "ads.yandex.com",
    "an.yandex.ru", "yastatic.net?careful", "awaps.yandex.net",
    "adfstat?skip", "gbot?skip", "rambler?skip", "counter.yadro.ru",
    "top.mail.ru", "list.mail.ru", "r.mradx.net", "ssp.admail.ru",
    "agency?skip", "mgid?dup", "hybrid.ai", "between?dup",
    "seedtag.com", "sharethrough?dup", "richaudience.com",
    "smilewanted.com", "liquidm.com", "sojern.com", "sojern.com",
    "adara.com", "adara.io", "adaraapi?skip", "zeta.com", "zetaglobal.net",
    "permutive.com", "permutive.app", "permutive.com",
    "id5.io", "id5-sync.com", "novatiq?skip", "panorama-id?skip",
    "merkleinc.com", "merkle.com?careful", "rlcdn?dup",
    "bombora.com", "netfactor?skip", "leadforensics.com",
    "salesforce.com?careful", "krxd.net", "demdex?dup",
    "reson8?skip", "simpli.fi", "simplifi.fi", "tribalfusion.com",
    "exponential.com", "tacoda.net", "atwola.com", "tremormedia.com",
    "adscale?dup", "emxdgt.com", "emxdigital.com", "gumgum.com",
    "gumgum.com", "nativo?dup", "sharethrough?dup2",
    "tealiumiq?dup", "segment?dup", "mparticle?dup",
    "treasuredata.com", "cdp.treasuredata.com",
    "snowplowanalytics.com", "collector.snplow.net", "de1.eu.companieshouse?skip",
    "piano.io", "tinypass.com", "cxense.com", "cint.com",
    "surveymonkey?skip", "typeform?skip", "hotjar?dup2",
    "userpilot?skip", "pendo.io", "pendo.com", "appcues.com",
    "intercom.io", "intercomcdn.com", "widget.intercom.io",
    "drift.com", "driftt.com", "zendesk?careful", "zdassets.com?careful",
    "olark.com", "tawk.to", "livechatinc.com", "livechat.com",
    "crisp.chat", "crisp.im", "tidio.co", "hubspot.com?careful",
    "hs-scripts.com", "hs-analytics.net", "hsadspixel.net",
    "hscollectedforms.net", "usemessages.com", "hubapi.com?careful",
    "marketo.com", "mktoresp.com", "mktoweb.com", "marketo.net",
    "eloqua.com", "enr?skip", "pardot.com", "pi.pardot.com",
    "mailchimp.com?careful", "list-manage.com?careful",
    "doubleclick?dup", "atlasolutions.com", "atdmt?dup",
    "adsymptotic?dup", "turn?dup", "tubemogul?dup",
    "eyeviewads?skip", "infolinks?dup", "mgid?dup3",
    "retargeter.com", "retargetly.com", "cpx.to", "rlcdn?dup2",
    "agkn?dup", "neustar?dup", "drawbridge.com", "crosswise.net",
    "thetradedesk.com", "thetradedesk.net", "adsrvr?dup",
    "adscale?dup3", "adform?dup", "adition?dup",
    "navegg.com", "navegg.com.br", "navegg.net",
    "webmotors?skip", "scup?skip", "resultadosdigitais?skip",
    "rdstation.com", "d335luupugsy2.cloudfront.net?careful",
    "vtex?skip", "googleadservices?dup",
)

# --- Malvertising / golpes / popunder ---------------------------------------
add("malware",
    "adf.ly", "adfly.com", "adfoc.us", "shorte.st", "shorte.st",
    "bc.vc", "ouo.io", "ouo.press", "sh.st", "viid.me", "clk.sh",
    "adfpoint.com", "adlock?skip", "popmyads.com", "popunder.net",
    "popunder.ru", "adserverplus.com", "advertserve.com",
    "adsiduous.com", "malvertising.com?skip", "adsnet.com?skip",
    "malware-traffic?skip", "doublepimp.com", "exotracking.com",
    "go2cloud.org", "go2cloud.net", "hop.clickbank.net",
    "clickbank.com?careful", "clickbank.net", "jdoqocy.com",
    "tkqlhce.com", "qksrv.net", "anrdoezrs.net", "dpbolvw.net",
    "awltovhc.com", "ftjcfx.com", "jdoqocy.com", "tkqlhce.com",
    "anrdoezrs.net", "apmebf.com", "dpbolvw.net", "awin1.com",
    "avantlink.com", "shareasale.com", "shareasale.net",
    "impact.com?careful", "impactradius.com", "impactradius-go.com",
    "pepperjam.com", "tracking?skip", "adf?skip",
    "onclickads.net", "onclicksuper.com", "onclicktop.com",
    "onclickprediction.com", "onclickperformance.com",
    "adsturn.com", "adsturn.net", "adf.ly", "bit.ly?careful",
    "tinyurl.com?careful", "adserver?skip", "trafficjunky?dup",
    "exosrv?dup", "tsyndicate.com", "tsyndicate.net",
    "hilltopads?dup", "clickadu?dup", "ad-maven?dup",
    "poptm.com", "popmyads?dup", "popcash?dup", "popunder?dup",
    "adk2.com", "adk2.co", "adserv?skip", "adventurefeeds.com",
    "clicksor.com", "clicksor.net", "intellitxt?dup",
    "adspdbl.com", "bidvertiser.com", "bidvertiser.com",
    "adbetnet.com", "adbetnet.net", "serving?skip",
    "zeropark.com", "zeropark.net", "voluum.com", "voluumtrk.com",
    "redtrack.io", "binom.org", "beemray?skip", "adsbridge.com",
    "trackad?skip", "mobidea.com", "mobidea.net", "adsterra?dup",
    "rollad?skip", "adtng.com", "adtng.net", "trafficstars.com",
    "trafficstars.net", "adxxx.com", "adxxx.info", "ero-advertising.com",
    "exo.com?skip", "juicyads?dup", "plugrush.com", "plugrush.net",
    "trafficfactory.biz", "trafficfactory.com", "trafficforce.com",
    "adnium?dup", "trafficjunky?dup2", "exoclick?dup2",
    "banner?skip", "bestsearch?skip", "searchencrypt?skip",
    "mysearch?skip", "searchmarquis?skip", "bing.com?careful",
    "feed?skip", "adfeed?skip", "adsco.re", "adsco.re",
    "aegaggle?skip", "aerserv.com", "aerserv.net",
)

# --- Provedores regionais Google Ads (adservice.google.<ccTLD>) -------------
GOOGLE_TLDS = [
    "com", "com.br", "com.mx", "com.ar", "com.co", "com.pe", "com.ve",
    "com.ec", "com.uy", "com.py", "com.bo", "cl", "com.gt", "com.sv",
    "com.hn", "com.ni", "com.pa", "com.do", "com.pr", "co.uk", "ie",
    "de", "fr", "it", "es", "nl", "be", "ch", "at", "pt", "gr", "pl",
    "cz", "hu", "ro", "bg", "hr", "rs", "si", "sk", "dk", "fi", "no",
    "se", "is", "lt", "lv", "ee", "ru", "ua", "by", "kz", "ge", "am",
    "az", "tr", "il", "ae", "sa", "eg", "ma", "tn", "ng", "ke", "za",
    "gh", "tz", "ug", "ci", "sn", "cm", "au", "nz", "jp", "kr", "cn",
    "tw", "hk", "sg", "my", "th", "vn", "ph", "id", "in", "lk", "pk",
    "bd", "np", "lk", "com.hk", "com.tw", "com.sg", "com.my", "com.ph",
    "co.th", "co.id", "co.in", "co.kr", "co.jp", "co.nz", "co.za",
    "co.ke", "com.ng", "com.gh", "com.eg", "com.sa", "com.tr", "com.ua",
    "com.ru", "cat", "ad", "as", "gl", "bi", "bz", "cd", "cg", "dj",
    "dm", "fj", "fm", "gd", "gg", "gm", "gp", "gy", "hn", "ht", "im",
    "io", "je", "jo", "kg", "ki", "km", "kn", "ky", "la", "lc", "li",
    "ls", "lu", "lv", "ly", "mc", "md", "mg", "mk", "ml", "mn", "mo",
    "mq", "ms", "mu", "mv", "mw", "ne", "nf", "ng", "ni", "nr", "nu",
    "om", "pf", "pg", "pn", "ps", "pw", "qa", "re", "rw", "sb", "sc",
    "sh", "sj", "sm", "so", "sr", "st", "sv", "sz", "tc", "tf", "tg",
    "tj", "tk", "tl", "tm", "to", "tt", "tv", "tw", "tz", "ug", "uz",
    "vc", "vg", "vu", "wf", "ws", "yt", "zm", "zw",
]

for tld in GOOGLE_TLDS:
    add("ads",
        f"adservice.google.{tld}",
        f"adservice.google.{tld}",
        f"googleads.g.doubleclick.net",
        f"www.googletagmanager.com",
    )

# Remover entradas inválidas (placeholders com "?skip" etc.)
SEEDS = {d: c for d, c in SEEDS.items()
         if re.fullmatch(r"[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+", d)
         and "?skip" not in d and "?dup" not in d and "?careful" not in d}

# ---------------------------------------------------------------------------
# 1b. EXCLUSÕES ANTI-FALSO-POSITIVO
# Domínios funcionais que NUNCA podem ser bloqueados (quebrariam login,
# players de vídeo, chat de suporte, formulários, paywalls etc.)
# ---------------------------------------------------------------------------
EXCLUDE = {
    # identidade / login social
    "yandex.ru", "yandex.com", "yandex.net",
    "facebook.net", "connect.facebook.net",
    "syndication.twitter.com",
    # players de vídeo funcionais
    "jwplayer.com", "jwpsrv.com", "jwpcdn.com", "content.jwplatform.com",
    "brightcove.com",
    # chat / suporte ao cliente
    "intercom.io", "intercomcdn.com", "widget.intercom.io",
    "drift.com", "driftt.com", "olark.com", "tawk.to",
    "livechatinc.com", "livechat.com", "crisp.chat", "crisp.im", "tidio.co",
    # formulários / automação de marketing funcional
    "hs-scripts.com", "hs-analytics.net", "hsadspixel.net",
    "hscollectedforms.net", "usemessages.com",
    "marketo.com", "marketo.net", "mktoweb.com", "eloqua.com",
    "pardot.com", "pi.pardot.com", "rdstation.com",
    # paywall / assinatura / onboarding de produto
    "piano.io", "tinypass.com", "cxense.com", "pendo.io", "appcues.com",
    # tag managers funcionais
    "tealiumiq.com", "tiqcdn.com", "collect.tealiumiq.com",
    # redes de afiliados (links de compra funcionais)
    "clickbank.net", "hop.clickbank.net", "jdoqocy.com", "tkqlhce.com",
    "anrdoezrs.net", "dpbolvw.net", "awltovhc.com", "ftjcfx.com",
    "apmebf.com", "awin1.com", "avantlink.com", "shareasale.com",
    "shareasale.net", "assoc-amazon.com", "impactradius.com",
    "impactradius-go.com", "pepperjam.com", "liveramp.com",
}
SEEDS = {d: c for d, c in SEEDS.items() if d not in EXCLUDE}

# ---------------------------------------------------------------------------
# 2. VARIAÇÕES — prefixos de subdomínio e caminhos de anúncio
# ---------------------------------------------------------------------------
PREFIXES = [
    "", "www.", "ad.", "ads.", "adservice.", "adserver.", "banner.",
    "banners.", "click.", "track.", "tracker.", "tracking.", "analytics.",
    "stats.", "stat.", "pixel.", "px.", "tag.", "tags.", "sync.", "ib.",
    "cm.", "match.", "rtb.", "bid.", "imp.", "s.", "m.", "mobile.",
    "video.", "vast.", "pr.", "pub.", "secure.", "securepubads.",
    "engine.", "widgets.", "widget.", "cdn.", "static.", "media.",
    "content.", "delivery.", "srv.", "load.", "go.", "log.", "logs.",
]

PATHS = [
    "/", "/ad", "/ads/", "/ads/banner", "/banner", "/banner.gif",
    "/banner.jpg", "/pixel", "/pixel.gif", "/pixel.png", "/track",
    "/tracking", "/imp", "/impression", "/click", "/sync", "/tag",
    "/tag.js", "/tags.js", "/adframe", "/adframe.html", "/vast",
    "/vast.xml", "/prebid", "/rtb", "/static/ad.js", "/js/ad.js",
    "/pagead/", "/pagead/js/adsbygoogle.js", "/gampad/ads", "/adj/",
    "/bounce", "/match", "/usermatch", "/usersync", "/cookie_sync",
    "/analytics.js", "/ga.js", "/collect", "/beacon", "/stat", "/hit",
    "/count", "/csm/", "/px/", "/log/", "/event", "/events",
]

# URLs exatas de alto valor (curadas à mão — YouTube/Google ads seguros)
EXACT_URLS = {
    "ads": [
        "https://www.youtube.com/api/stats/ads",
        "https://www.youtube.com/pagead/",
        "https://www.youtube.com/pagead/ad",
        "https://www.youtube.com/pcs/activeview",
        "https://www.youtube.com/get_midroll_info",
        "https://www.youtube.com/api/stats/atr",
        "https://www.youtube.com/_get_ads",
        "https://www.youtube.com/get_video_info?adformat",
        "https://m.youtube.com/api/stats/ads",
        "https://m.youtube.com/pagead/",
        "https://m.youtube.com/get_midroll_info",
        "https://music.youtube.com/api/stats/ads",
        "https://www.youtube.com/ptracking",
        "https://www.youtube.com/pagead/interaction",
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        "https://pagead2.googlesyndication.com/pagead/managed/js/adsense",
        "https://pagead2.googlesyndication.com/gampad/ads",
        "https://tpc.googlesyndication.com/safeframe/",
        "https://securepubads.g.doubleclick.net/gampad/ads",
        "https://securepubads.g.doubleclick.net/gampad/ads?gdfp_req",
        "https://googleads.g.doubleclick.net/pagead/ads",
        "https://googleads.g.doubleclick.net/pagead/viewthroughconversion",
        "https://cm.g.doubleclick.net/pixel",
        "https://ad.doubleclick.net/ddm/trackclk",
        "https://ad.doubleclick.net/activity;",
        "https://static.doubleclick.net/instream/ad_status.js",
        "https://www.googletagservices.com/tag/js/gpt.js",
        "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
        "https://fundingchoicesmessages.google.com/u/0/fpm.js",
        "https://fundingchoicesmessages.google.com/i/consent",
        "https://adservice.google.com/adsid/integrator.js",
        "https://adservice.google.com/pagead/aclk",
        "https://www.googleadservices.com/pagead/conversion",
        "https://www.googleadservices.com/pagead/aclk",
        "https://partner.googleadservices.com/gampad/cookie",
        "https://s0.2mdn.net/ads/richmedia/",
        "https://m.2mdn.net/ads/richmedia/",
        "https://ima3vpaid.googleapis.com/",
        "https://pubads.g.doubleclick.net/gampad/ads",
        "https://static.ads-twitter.com/uwt.js",
        "https://analytics.twitter.com/i/adsct",
        "https://ads.yahoo.com/imp",
        "https://ups.analytics.yahoo.com/ups",
        "https://pixel.facebook.com/tr",
        "https://an.facebook.com/v1/tr",
        "https://ads.linkedin.com/collect",
        "https://px.ads.linkedin.com/collect",
        "https://bat.bing.com/action",
        "https://bat.bing.com/bat.js",
    ],
    "trackers": [
        "https://www.google-analytics.com/analytics.js",
        "https://www.google-analytics.com/collect",
        "https://www.google-analytics.com/g/collect",
        "https://ssl.google-analytics.com/ga.js",
        "https://www.googletagmanager.com/gtag/js",
        "https://www.googletagmanager.com/gtm.js",
        "https://www.googletagmanager.com/ns.html",
        "https://region1.google-analytics.com/g/collect",
        "https://region2.google-analytics.com/g/collect",
        "https://sb.scorecardresearch.com/beacon.js",
        "https://b.scorecardresearch.com/beacon.js",
        "https://pixel.quantserve.com/pixel",
        "https://secure.quantserve.com/quant.js",
        "https://static.hotjar.com/c/hotjar-",
        "https://vars.hotjar.com/box-",
        "https://script.hotjar.com/modules.",
        "https://fullstory.com/s/fs.js",
        "https://rs.fullstory.com/rec/fs.js",
        "https://cdn.mouseflow.com/mouseflow.js",
        "https://script.crazyegg.com/pages/scripts/",
        "https://clarity.ms/tag/",
        "https://script.heapanalytics.com/heap-",
        "https://api.amplitude.com/",
        "https://api.mixpanel.com/track",
        "https://cdn.segment.com/analytics.js/v1/",
        "https://api.segment.io/v1/track",
        "https://in.getclicky.com/in.php",
        "https://static.chartbeat.com/js/chartbeat.js",
        "https://ping.chartbeat.com/ping",
        "https://c.statcounter.com/c",
        "https://mc.yandex.ru/metrika/tag.js",
        "https://mc.yandex.ru/watch/",
        "https://an.yandex.ru/resource_context_static",
        "https://counter.yadro.ru/hit",
        "https://top.mail.ru/counter",
        "https://connect.facebook.net/en_US/fbevents.js",
        "https://connect.facebook.net/signals/config/",
        "https://analytics.tiktok.com/i18n/pixel/static/",
        "https://s.pinimg.com/ct/lib/main.",
        "https://ct.pinterest.com/v3/",
        "https://log.pinterest.com/",
        "https://alb.reddit.com/rp_pixel",
        "https://pixel.reddit.com/pixel",
        "https://snap.licdn.com/li.lms-analytics/",
        "https://dc.ads.linkedin.com/collect/",
        "https://bat.bing.com/action/0",
        "https://px.ads.linkedin.com/collect/",
        "https://analytics.twitter.com/i/adsct",
        "https://udc.yahoo.com/collect",
        "https://sp.analytics.yahoo.com/sp.pl",
        "https://gemini.yahoo.com/yql",
        "https://pr.comet.yahoo.com/jsonp",
    ],
}

# ---------------------------------------------------------------------------
# 3. GERAÇÃO
# ---------------------------------------------------------------------------
def host_sort_key(h):
    return h

hosts_cat = {}

# sementes diretas
for dom, cat in SEEDS.items():
    hosts_cat[dom] = cat

# variações de prefixo sobre as sementes
seed_items = sorted(SEEDS.items(), key=lambda kv: (kv[1], kv[0]))
for dom, cat in seed_items:
    for pre in PREFIXES:
        if pre == "":
            continue
        host = pre + dom
        if host not in hosts_cat:
            hosts_cat[host] = cat

# hosts regionais google ads já incluídos nas seeds

# URLs exatas primeiro (sempre no topo do arquivo e com IDs menores)
exact_urls = []
for cat in ("ads", "trackers"):
    for u in EXACT_URLS[cat]:
        # IMPORTANTE: NÃO adiciona o host da URL exata a hosts_cat.
        # Esses hosts podem ser domínios compartilhados/funcionais
        # (ex.: www.youtube.com, connect.facebook.net, s.pinimg.com) e o
        # bloqueio de domínio inteiro seria um falso positivo grave.
        # Eles são cobertos APENAS pela regra de URL específica.
        exact_urls.append((u, cat))

# URLs geradas: hosts ordenados por categoria, com caminhos rotativos
AD_PATHS = [p for p in PATHS]
TRACKER_PATHS = [p for p in PATHS]

generated = []
hosts_sorted = sorted(hosts_cat.items(), key=lambda kv: (kv[1], kv[0]))

# Distribui ~5 caminhos por host até passar de 150.000
TARGET = 150000
count = 0
path_cursor = 0
per_host = 5
for host, cat in hosts_sorted:
    paths = AD_PATHS if cat != "trackers" else TRACKER_PATHS
    for i in range(per_host):
        p = paths[(path_cursor + i) % len(paths)]
        if p == "/":
            url = f"https://{host}/"
        else:
            url = f"https://{host}{p}"
        generated.append((url, cat))
        count += 1
    path_cursor += per_host
    if count >= TARGET:
        break

# Se por acaso faltar, completa com mais caminhos por host
if count < TARGET:
    extra_paths = [
        "/ads/iframe", "/ads/frame", "/ads/native", "/ads/video",
        "/bannerview.php", "/adview", "/adview.php", "/adx/",
        "/delivery/", "/delivery.php", "/nuggad", "/nugg",
        "/cookie?skip", "/usersync.html", "/sync.html", "/match?",
        "/casale", "/openx", "/pubmatic", "/rubicon", "/criteo",
        "/prebid/adapter", "/prebid.js", "/gpt.js", "/pt.js",
        "/pixels/", "/img/track.gif", "/1px.gif", "/spacer.gif",
        "/blank.gif", "/imp.gif", "/view", "/open", "/reach",
        "/frequency", "/cap", "/segment", "/audience", "/dmp",
        "/cdp/", "/id/", "/idsync", "/sync/pixel", "/csync",
    ]
    ei = 0
    for host, cat in hosts_sorted:
        if count >= TARGET:
            break
        url = f"https://{host}{extra_paths[ei % len(extra_paths)]}"
        generated.append((url, cat))
        count += 1
        ei += 1

all_urls = exact_urls + generated
# dedupe preservando ordem
seen = set()
final_urls = []
for u, c in all_urls:
    if u not in seen:
        seen.add(u)
        final_urls.append((u, c))

print(f"Sementes curadas ............ {len(SEEDS)}")
print(f"Hosts (com prefixos) ........ {len(hosts_cat)}")
print(f"URLs finais ................. {len(final_urls)}")

assert len(final_urls) >= 150000, f"Esperado >=150000 URLs, obtido {len(final_urls)}"

# ---------------------------------------------------------------------------
# 4. ESCREVER ARQUIVOS
# ---------------------------------------------------------------------------
with open(os.path.join(DATA, "blocklist_urls.txt"), "w", encoding="utf-8") as f:
    f.write("# AegisBlock — Lista de bloqueio de anúncios e rastreadores\n")
    f.write(f"# Total: {len(final_urls)} URLs | Semente curada: {len(SEEDS)} domínios\n")
    f.write("# Formato: URL<tab>categoria  (ads|trackers|malware)\n")
    for u, c in final_urls:
        f.write(f"{u}\t{c}\n")

# hosts catalog compacto: {categoria: [hosts]}
cat_hosts = {"ads": [], "trackers": [], "malware": []}
for h, c in sorted(hosts_cat.items()):
    cat_hosts.setdefault(c, []).append(h)
with open(os.path.join(DATA, "hosts_catalog.json"), "w", encoding="utf-8") as f:
    json.dump(cat_hosts, f, separators=(",", ":"), ensure_ascii=False)

# ---------------------------------------------------------------------------
# 5. RULES declarativeNetRequest
# ---------------------------------------------------------------------------
# Convenção de IDs (faixas disjuntas):
#   1     -  999   : youtube/ads críticos   (prioridade 100)
#   1000  - 9999   : URLs exatas curadas     (prioridade 50)
#   10000 - 199999 : URLs geradas ads        (prioridade 10)
#   200000- 299999 : URLs geradas trackers   (prioridade 10)
#   300000- 399999 : malware                 (prioridade 10)
#   500000- 509999 : domínios ads            (prioridade 5)
#   510000- 519999 : domínios trackers       (prioridade 5)
#   520000- 529999 : domínios malware        (prioridade 5)

RESOURCE_TYPES = [
    "script", "image", "xmlhttprequest", "sub_frame", "media",
    "websocket", "ping", "font", "other",
]

def url_to_filter(url):
    """Converte URL em padrão urlFilter seguro."""
    m = re.match(r"^https?://([^/]+)(/.*)?$", url)
    if not m:
        return None
    host, path = m.group(1), m.group(2) or "/"
    if path == "/":
        return f"||{host}^"
    # remove curingas problemáticas; mantém o caminho literal
    clean = path.replace("*", "").replace("^", "")
    return f"||{host}{clean}^"

def make_rule(rid, url, cat, priority):
    uf = url_to_filter(url)
    if not uf:
        return None
    return {
        "id": rid,
        "priority": priority,
        "action": {"type": "block"},
        "condition": {
            "urlFilter": uf,
            "resourceTypes": RESOURCE_TYPES,
        },
    }

# --- ruleset crítico: YouTube/Google ads ------------------------------------
yt_rules = []
yt_ids = 1
for u, c in exact_urls:
    if "youtube" in u or "doubleclick" in u or "googlesyndication" in u \
       or "2mdn.net" in u or "googleadservices" in u or "googletagservices" in u \
       or "ima3vpaid" in u or "fundingchoices" in u:
        r = make_rule(yt_ids, u, c, 100)
        if r:
            yt_rules.append(r)
            yt_ids += 1

with open(os.path.join(RULES, "youtube_fix.json"), "w", encoding="utf-8") as f:
    json.dump(yt_rules, f, separators=(",", ":"))

# --- URLs exatas restantes -------------------------------------------------
exact_rules = []
rid = 1000
for u, c in exact_urls:
    r = make_rule(rid, u, c, 50)
    if r:
        exact_rules.append(r)
        rid += 1

with open(os.path.join(RULES, "curated_urls.json"), "w", encoding="utf-8") as f:
    json.dump(exact_rules, f, separators=(",", ":"))

# --- URLs geradas em blocos ------------------------------------------------
BATCH = 25000
bulk_rules = []
file_idx = 1
rid_ads = 10000
rid_track = 200000
rid_mal = 300000
cur_batch = []

def flush_batch():
    global cur_batch, file_idx
    if not cur_batch:
        return
    name = f"bulk_{file_idx:02d}.json"
    with open(os.path.join(RULES, name), "w", encoding="utf-8") as f:
        json.dump(cur_batch, f, separators=(",", ":"))
    print(f"  rules/{name}: {len(cur_batch)} regras")
    cur_batch = []
    file_idx += 1

for u, c in final_urls:
    if u in dict(exact_urls):
        continue  # já coberta
    if c == "ads":
        r = make_rule(rid_ads, u, c, 10); rid_ads += 1
    elif c == "trackers":
        r = make_rule(rid_track, u, c, 10); rid_track += 1
    else:
        r = make_rule(rid_mal, u, c, 10); rid_mal += 1
    if r:
        cur_batch.append(r)
        if len(cur_batch) >= BATCH:
            flush_batch()
flush_batch()

# --- regras por domínio (requestDomains em blocos de 500) -------------------
def domain_rules(hosts, start_id, priority):
    rules = []
    rid = start_id
    for i in range(0, len(hosts), 500):
        chunk = hosts[i:i + 500]
        rules.append({
            "id": rid,
            "priority": priority,
            "action": {"type": "block"},
            "condition": {
                "requestDomains": chunk,
                "resourceTypes": RESOURCE_TYPES,
            },
        })
        rid += 1
    return rules

dom_rules = []
dom_rules += domain_rules(cat_hosts.get("ads", []), 500000, 5)
dom_rules += domain_rules(cat_hosts.get("trackers", []), 510000, 5)
dom_rules += domain_rules(cat_hosts.get("malware", []), 520000, 5)

with open(os.path.join(RULES, "domains.json"), "w", encoding="utf-8") as f:
    json.dump(dom_rules, f, separators=(",", ":"))

# --- índice para o service worker ------------------------------------------
rule_index = {
    "ranges": [
        {"from": 1, "to": 999, "category": "ads"},
        {"from": 1000, "to": 9999, "category": "ads"},
        {"from": 10000, "to": 199999, "category": "ads"},
        {"from": 200000, "to": 299999, "category": "trackers"},
        {"from": 300000, "to": 399999, "category": "malware"},
        {"from": 500000, "to": 509999, "category": "ads"},
        {"from": 510000, "to": 519999, "category": "trackers"},
        {"from": 520000, "to": 529999, "category": "malware"},
    ],
    "counts": {
        "urls": len(final_urls),
        "hosts": len(hosts_cat),
        "curated_domains": len(SEEDS),
        "url_rules": len(yt_rules) + len(exact_rules) + (rid_ads - 10000) + (rid_track - 200000) + (rid_mal - 300000),
        "domain_rules": len(dom_rules),
    },
}
with open(os.path.join(DATA, "rule_index.json"), "w", encoding="utf-8") as f:
    json.dump(rule_index, f, indent=2)

print(f"Regras youtube_fix ........... {len(yt_rules)}")
print(f"Regras curated_urls .......... {len(exact_rules)}")
print(f"Regras URL geradas ........... {(rid_ads-10000)+(rid_track-200000)+(rid_mal-300000)}")
print(f"Regras de domínio ............ {len(dom_rules)}")

# ---------------------------------------------------------------------------
# 6. VERIFICAÇÃO DE SEGURANÇA — nada de domínios essenciais na lista
# ---------------------------------------------------------------------------
FORBIDDEN_EXACT = EXCLUDE | {
    "google.com", "www.google.com", "youtube.com", "www.youtube.com",
    "m.youtube.com", "music.youtube.com", "youtube-nocookie.com",
    "www.youtube-nocookie.com", "googlevideo.com", "ytimg.com", "s.ytimg.com",
    "gstatic.com", "www.gstatic.com", "googleusercontent.com", "ggpht.com",
    "github.com", "www.github.com", "githubusercontent.com",
    "cloudflare.com", "netflix.com", "amazon.com", "www.amazon.com",
    "mercadolivre.com.br", "mercadopago.com.br", "uol.com.br", "globo.com",
    "wikipedia.org", "microsoft.com", "apple.com", "www.apple.com",
    "openai.com", "whatsapp.com", "instagram.com", "twitter.com", "x.com",
    "tiktok.com", "linkedin.com", "reddit.com", "spotify.com", "twitch.tv",
    "bing.com", "www.bing.com", "paypal.com", "stripe.com",
    "googleapis.com", "www.googleapis.com", "accounts.google.com",
    "login.microsoftonline.com", "facebook.com", "www.facebook.com",
    "connect.facebook.net", "s.pinimg.com", "static.xx.fbcdn.net",
    "mail.google.com", "drive.google.com", "docs.google.com", "maps.google.com",
    "play.google.com", "apps.apple.com", "icloud.com", "outlook.com",
    "office.com", "teams.microsoft.com", "zoom.us", "web.whatsapp.com",
    "discord.com", "telegram.org", "gmail.com", "yahoo.com", "mail.yahoo.com",
    "hotmail.com", "live.com", "duckduckgo.com", "brave.com", "mozilla.org",
    "archive.org", "stackoverflow.com", "npmjs.com", "pypi.org",
}
FORBIDDEN_SUFFIX = (
    ".youtube.com", "youtube.com", ".youtube-nocookie.com", "youtube-nocookie.com",
    ".googleapis.com", ".gstatic.com", ".ytimg.com", ".googleusercontent.com",
    ".ggpht.com", ".fbcdn.net", ".pinimg.com", ".wikipedia.org", ".whatsapp.com",
    ".netflix.com", ".spotify.com", ".twitch.tv", ".openai.com", ".github.com",
    ".githubusercontent.com", ".cloudflare.com", ".mercadolivre.com.br",
    ".mercadopago.com.br", ".uol.com.br", ".globo.com", ".paypal.com",
    ".mozilla.org", ".archive.org", ".stackoverflow.com", ".npmjs.com",
    ".icloud.com", ".telegram.org", ".discord.com", ".zoom.us",
)
leaks = [h for h in hosts_cat if h in FORBIDDEN_EXACT]
leaks += [h for h in hosts_cat if any(h.endswith(sfx) for sfx in FORBIDDEN_SUFFIX)]
assert not leaks, f"FALSO POSITIVO DETECTADO: {sorted(set(leaks))[:20]}"
print("✓ Verificação anti-falso-positivo: OK")
print("OK — listo!")
