#!/usr/bin/env python3
"""
Gera preview.html autocontido (inline: CSS + JS + player Lottie + animação)
para visualização offline da interface do AegisBlock.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()

popup_html = read("popup/popup.html")
popup_css = read("popup/popup.css")
popup_js = read("popup/popup.js")
lottie_js = read("lib/lottie_svg.min.js")
anim_json = read("popup/secure-lock.json")

# injeta CSS inline (substitui o link)
popup_html = popup_html.replace(
    '<link rel="stylesheet" href="popup.css" />',
    "<style>\n" + popup_css + "\n</style>",
)

# injeta dados da animação + player + js
inject = (
    "\n<script>window.__EMBEDDED_LOTTIE__ = "
    + anim_json
    + ";</script>\n"
    + "<script>\n"
    + lottie_js
    + "\n</script>\n<script>\n"
    + popup_js
    + "\n</script>\n"
)

popup_html = popup_html.replace(
    '<script src="../lib/lottie_svg.min.js"></script>\n  <script src="popup.js"></script>',
    inject,
)

# ajusta título para deixar claro que é o preview
popup_html = popup_html.replace(
    "<title>AegisBlock</title>",
    "<title>AegisBlock — Interface</title>",
)

out = os.path.join(ROOT, "preview.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(popup_html)
print(f"preview.html gerado ({os.path.getsize(out)/1024:.0f} KB)")
