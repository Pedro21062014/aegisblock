#!/usr/bin/env python3
"""
Gera previews autocontidos (inline: CSS + JS + player Lottie + animação + fatos):
  preview.html          -> interface do popup
  preview-welcome.html  -> página de boas-vindas + tour
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

lottie_js = read("lib/lottie_svg.min.js")
anim_json = read("popup/secure-lock.json")
facts_json = read("data/facts.json")

EMBED = (
    "\n<script>window.__EMBEDDED_LOTTIE__ = " + anim_json + ";\n"
    + "window.__FACTS__ = " + facts_json + ";</script>\n"
    + "<script>\n" + lottie_js + "\n</script>\n"
)

# ---------------- popup ----------------
popup_html = read("popup/popup.html")
popup_css = read("popup/popup.css")
popup_js = read("popup/popup.js")

popup_html = popup_html.replace(
    '<link rel="stylesheet" href="popup.css" />',
    "<style>\n" + popup_css + "\n</style>",
)
popup_html = popup_html.replace(
    '<script src="../lib/lottie_svg.min.js"></script>\n  <script src="popup.js"></script>',
    EMBED + "<script>\n" + popup_js + "\n</script>\n",
)
popup_html = popup_html.replace(
    "<title>AegisBlock</title>",
    "<title>AegisBlock — Interface</title>",
)
out = os.path.join(ROOT, "preview.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(popup_html)
print(f"preview.html gerado ({os.path.getsize(out)/1024:.0f} KB)")

# ---------------- welcome ----------------
welcome_html = read("welcome/welcome.html")
welcome_css = read("welcome/welcome.css")
welcome_js = read("welcome/welcome.js")

welcome_html = welcome_html.replace(
    '<link rel="stylesheet" href="welcome.css" />',
    "<style>\n" + welcome_css + "\n</style>",
)
welcome_html = welcome_html.replace(
    '<script src="../lib/lottie_svg.min.js"></script>\n  <script src="welcome.js"></script>',
    EMBED + "<script>\n" + welcome_js + "\n</script>\n",
)
welcome_html = welcome_html.replace(
    "<title>AegisBlock — Bem-vindo</title>",
    "<title>AegisBlock — Boas-vindas & Tour</title>",
)
out2 = os.path.join(ROOT, "preview-welcome.html")
with open(out2, "w", encoding="utf-8") as f:
    f.write(welcome_html)
print(f"preview-welcome.html gerado ({os.path.getsize(out2)/1024:.0f} KB)")
