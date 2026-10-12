"""Génère les icônes PWA de TEMPO FIT (formes simples, aucune ressource externe).
Usage : python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "src" / "icons"
TEAL, WHITE, ORANGE = (15, 118, 110), (255, 255, 255), (234, 88, 12)


def draw_mark(d, size, scale):
    """Un « T » stylisé et un point orange (le tempo)."""
    c = size / 2
    u = size * scale
    d.rectangle([c - 0.30 * u, c - 0.30 * u, c + 0.30 * u, c - 0.16 * u], fill=WHITE)  # barre
    d.rectangle([c - 0.07 * u, c - 0.30 * u, c + 0.07 * u, c + 0.32 * u], fill=WHITE)  # fût
    r = 0.075 * u
    d.ellipse([c + 0.16 * u - r, c + 0.18 * u - r, c + 0.16 * u + r, c + 0.18 * u + r], fill=ORANGE)


def icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=TEAL)
        draw_mark(d, size, 0.8)  # contenu dans la zone sûre de 80 %
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.22, fill=TEAL)
        draw_mark(d, size, 1.0)
    return img


OUT.mkdir(parents=True, exist_ok=True)
icon(192).save(OUT / "icon-192.png")
icon(512).save(OUT / "icon-512.png")
icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
icon(180, maskable=True).convert("RGB").save(OUT / "apple-touch-icon.png")
(OUT / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    '<rect width="100" height="100" rx="22" fill="#0f766e"/>'
    '<rect x="20" y="20" width="60" height="14" fill="#fff"/>'
    '<rect x="43" y="20" width="14" height="62" fill="#fff"/>'
    '<circle cx="66" cy="68" r="7.5" fill="#ea580c"/></svg>\n'
)
print("icônes générées dans", OUT)
