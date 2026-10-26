#!/usr/bin/env python3
"""Fabrique la couverture d'un article du blog : 1200 × 675, WebP, dans blog/img/<slug>-couverture.webp.

Même dessin que les couvertures publiées en octobre 2026 : un panneau bleu nuit à gauche (logo TEAM OP, titre en
blanc), une photo à droite. Sans photo, le panneau prend toute la largeur.

    python3 scripts/blog-couverture.py <slug> "<titre>" [photo.jpg|png|webp]

La photo vient de Gemini (scripts/blog-gemini.js, à la publication) ou d'une banque libre de droits ; jamais une image qui montre une marque, un logo ou
un personnage connus. Pillow suffit (aucune autre dépendance)."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

# BLOG_RACINE : les bancs travaillent dans un dossier jetable (tests/test-3060.js), jamais dans blog/img/ du dépôt
RACINE = os.environ.get('BLOG_RACINE') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
L, H = 1200, 675
NUIT = (11, 20, 38)
POLICES = ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
           '/System/Library/Fonts/Supplemental/Georgia Bold.ttf', '/Library/Fonts/Georgia Bold.ttf']


def police(t):
    for p in POLICES:
        if os.path.exists(p):
            return ImageFont.truetype(p, t)
    return ImageFont.load_default()


def lignes(d, texte, f, largeur):
    # l'insécable colle « : ; ! ? » au mot d'avant ; on ne coupe qu'aux espaces ordinaires
    texte = texte.replace("'", '’')
    for c in ':;!?':
        texte = texte.replace(' ' + c, '\u00a0' + c)
    mots, out, cur = [m for m in texte.split(' ') if m], [], ''
    for m in mots:
        essai = (cur + ' ' + m).strip()
        if d.textlength(essai, font=f) <= largeur or not cur:
            cur = essai
        else:
            out.append(cur); cur = m
    if cur:
        out.append(cur)
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    slug, titre = sys.argv[1], sys.argv[2]
    photo = sys.argv[3] if len(sys.argv) > 3 else None
    im = Image.new('RGB', (L, H), NUIT)
    panneau = 600 if photo else L
    if photo:
        p = Image.open(photo).convert('RGB')
        w, h = p.size
        cible = (L - panneau) / H
        if w / h > cible:
            nw = int(h * cible); g = (w - nw) // 2; p = p.crop((g, 0, g + nw, h))
        else:
            nh = int(w / cible); t = (h - nh) // 2; p = p.crop((0, t, w, t + nh))
        im.paste(p.resize((L - panneau, H), Image.LANCZOS), (panneau, 0))
    d = ImageDraw.Draw(im)
    logo = Image.open(os.path.join(RACINE, 'icons', 'teamop-512.png')).convert('RGBA').resize((104, 104), Image.LANCZOS)
    im.paste(logo, (36, 36), logo)
    marge, largeur = 36, panneau - 72
    # le plus grand corps qui tient en six lignes sous le logo
    for t in range(64, 30, -2):
        f = police(t)
        ls = lignes(d, titre, f, largeur)
        haut = len(ls) * int(t * 1.12)
        if len(ls) <= 6 and haut <= H - 190:
            break
    y = 170 + (H - 190 - haut) // 2
    for l in ls:
        d.text((marge, y), l, font=f, fill=(255, 255, 255))
        y += int(t * 1.12)
    dest = os.path.join(RACINE, 'blog', 'img', slug + '-couverture.webp')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.save(dest, 'WEBP', quality=80, method=6)
    print(dest, os.path.getsize(dest), 'octets')


if __name__ == '__main__':
    main()
