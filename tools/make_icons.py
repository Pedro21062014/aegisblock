#!/usr/bin/env python3
"""Gera os ícones da extensão AegisBlock (escudo verde sobre fundo escuro)."""
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "icons")
os.makedirs(OUT, exist_ok=True)

def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)

def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 128.0  # escala

    # fundo arredondado com gradiente vertical (azul-petróleo escuro)
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(11 + t * 10)
        g = int(18 + t * 18)
        b = int(36 + t * 30)
        bd.line([(0, y), (size, y)], fill=(r, g, b, 255))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    rad = int(size * 0.22)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=rad, fill=255)
    img.paste(bg, (0, 0), mask)

    # brilho suave no topo
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-size * 0.3, -size * 0.55, size * 1.3, size * 0.65],
               fill=(46, 220, 150, 36))
    img = Image.alpha_composite(img, Image.composite(glow, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask))

    d = ImageDraw.Draw(img)

    # escudo
    cx = size * 0.5
    top = size * 0.18
    bot = size * 0.86
    w = size * 0.30
    shield = [
        (cx, top),
        (cx + w, top + size * 0.10),
        (cx + w, top + size * 0.30),
        (cx + w * 0.85, top + size * 0.48),
        (cx + w * 0.45, bot - size * 0.10),
        (cx, bot),
        (cx - w * 0.45, bot - size * 0.10),
        (cx - w * 0.85, top + size * 0.48),
        (cx - w, top + size * 0.30),
        (cx - w, top + size * 0.10),
    ]
    # sombra
    shadow = [(x + size * 0.015, y + size * 0.025) for (x, y) in shield]
    d.polygon(shadow, fill=(0, 0, 0, 90))
    # corpo do escudo (gradiente verde)
    d.polygon(shield, fill=(46, 220, 150, 255))
    inner = [(cx + (x - cx) * 0.88, top + (y - top) * 0.88) for (x, y) in shield]
    d.polygon(inner, fill=(16, 120, 90, 255))

    # check branco
    lw = max(2, int(size * 0.075))
    p1 = (cx - size * 0.145, top + size * 0.335)
    p2 = (cx - size * 0.035, top + size * 0.445)
    p3 = (cx + size * 0.165, top + size * 0.195)
    d.line([p1, p2], fill=(255, 255, 255, 255), width=lw)
    d.line([p2, p3], fill=(255, 255, 255, 255), width=lw)
    # pontas arredondadas do check
    r = lw // 2
    for p in (p1, p2, p3):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(255, 255, 255, 255))

    return img

for size in (16, 32, 48, 128):
    icon = make_icon(size)
    path = os.path.join(OUT, f"icon{size}.png")
    icon.save(path, "PNG")
    print("gerado:", path)

print("Ícones prontos.")
