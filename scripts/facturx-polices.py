#!/usr/bin/env python3
"""Fabrique le bloc FACTURX_POLICES d'app.html : deux polices TrueType incorporées au PDF/A-3 (Factur-X) et un profil sRGB.

POURQUOI UN SCRIPT (et pas du texte collé à la main) : le PDF du devis et de la facture est écrit à la main,
en Helvetica NON incorporée — ce que PDF/A interdit (ISO 19005-3, 6.2.11.4 : toute police est incorporée).
On incorpore un sous-ensemble de Liberation Sans (Regular et Bold) dont les largeurs sont celles d'Helvetica :
la mise en page ne bouge pas (tests/test-3134.js le mesure contre la table _PDF_L d'app.html).

LICENCE : Liberation Sans est sous SIL OFL 1.1 (design/facturx/LICENCE-polices.txt). Le nom « Liberation » est un
nom de police RÉSERVÉ : un sous-ensemble est une version modifiée, il porte donc un autre nom (« TeamOPSans »).

Usage (depuis la racine du dépôt) :
    pip install fonttools
    python3 scripts/facturx-polices.py [dossier des polices Liberation]
Réécrit ce qui est entre ⟦FACTURX_POLICES:DEBUT⟧ et ⟦FACTURX_POLICES:FIN⟧ dans app.html ; --stdout pour seulement l'afficher.
"""
import base64, io, json, struct, sys, zlib, os
from fontTools.ttLib import TTFont
from fontTools import subset

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEBUT = '// ⟦FACTURX_POLICES:DEBUT⟧ — GÉNÉRÉ par scripts/facturx-polices.py. NE PAS ÉDITER ICI : on relance le script.'
FIN = '// ⟦FACTURX_POLICES:FIN⟧'

# WinAnsi (cp1252) : les 224 codes 32..255 ; ceux que cp1252 n'définit pas (127 129 141 143 144 157) restent sans glyphe.
def winansi():
    t = {}
    for c in range(32, 256):
        try:
            t[c] = bytes([c]).decode('cp1252')
        except UnicodeDecodeError:
            pass
    t.pop(127, None)   # DEL : pas un caractère WinAnsi
    return t

def sous_ensemble(chemin, nom_ps, nom_famille, nom_style):
    wa = winansi()
    opts = subset.Options()
    opts.hinting = False
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.layout_features = []
    opts.name_IDs = [1, 2, 3, 4, 6]
    opts.drop_tables += ['DSIG', 'GDEF', 'GPOS', 'GSUB', 'kern', 'cvt ', 'fpgm', 'prep', 'gasp', 'hdmx', 'LTSH', 'VDMX', 'MATH', 'meta']
    opts.legacy_kern = False
    opts.notdef_glyph = True
    opts.recalc_bounds = True
    f = TTFont(chemin)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[ord(ch) for ch in wa.values()])
    sub.subset(f)
    # le nom : « Liberation » est réservé, on renomme tout (1 famille, 2 style, 3 identifiant, 4 nom complet, 6 nom PostScript)
    nm = f['name']
    nm.names = [n for n in nm.names if n.nameID in (1, 2, 3, 4, 6)]
    for n in nm.names:
        v = {1: nom_famille, 2: nom_style, 3: 'TeamOP;' + nom_ps, 4: nom_famille + ' ' + nom_style, 6: nom_ps}[n.nameID]
        n.string = v
    # post en format 3 (sans noms de glyphes) : plus léger, et rien n'en dépend dans un PDF
    f['post'].formatType = 3.0
    f['post'].extraNames = []
    f['post'].mapping = {}
    buf = io.BytesIO(); f.save(buf); data = buf.getvalue()
    g = TTFont(io.BytesIO(data))
    upm = g['head'].unitsPerEm
    cmap = g.getBestCmap()
    hm = g['hmtx']
    def w_de(gn): return round(hm[gn][0] * 1000 / upm)
    notdef = w_de('.notdef')
    widths = []
    for c in range(32, 256):
        ch = wa.get(c)
        widths.append(w_de(cmap[ord(ch)]) if ch is not None else notdef)
    hh = g['hhea']; hd = g['head']; os2 = g['OS/2']
    bbox = [round(hd.xMin * 1000 / upm), round(hd.yMin * 1000 / upm), round(hd.xMax * 1000 / upm), round(hd.yMax * 1000 / upm)]
    return dict(nom=nom_ps, l1=len(data), z=base64.b64encode(zlib.compress(data, 9)).decode(), w=widths,
                bbox=bbox, asc=round(hh.ascent * 1000 / upm), desc=round(hh.descent * 1000 / upm),
                cap=round(getattr(os2, 'sCapHeight', 0) * 1000 / upm) or 716)

def profil_srgb():
    """Profil ICC v2 d'écran RVB construit à la main : primaires sRGB adaptées D50 (Bradford) et courbe sRGB échantillonnée.
    Les nombres sont ceux, publics, de tout profil sRGB (IEC 61966-2-1) ; rien n'est recopié d'un profil existant."""
    def s15(x): return struct.pack('>i', round(x * 65536))
    def xyz(x, y, z): return b'XYZ ' + b'\0' * 4 + s15(x) + s15(y) + s15(z)
    def desc(txt):
        a = txt.encode('ascii') + b'\0'
        return b'desc' + b'\0' * 4 + struct.pack('>I', len(a)) + a + b'\0' * 4 + b'\0' * 4 + b'\0\0' + b'\0' + b'\0' * 67
    def text(txt): return b'text' + b'\0' * 4 + txt.encode('ascii') + b'\0'
    n = 1024
    def srgb(v): return 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    def inv(v): return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    courbe = b'curv' + b'\0' * 4 + struct.pack('>I', n) + b''.join(struct.pack('>H', round(inv(i / (n - 1)) * 65535)) for i in range(n))
    tags = [
        (b'desc', desc('sRGB IEC61966-2.1 (TeamOP)')),
        (b'cprt', text('Public domain: sRGB primaries and tone curve built by TeamOP for PDF/A output intent.')),
        (b'wtpt', xyz(0.9642, 1.0, 0.8249)),
        (b'rXYZ', xyz(0.4360747, 0.2225045, 0.0139322)),
        (b'gXYZ', xyz(0.3850649, 0.7168786, 0.0971045)),
        (b'bXYZ', xyz(0.1430804, 0.0606169, 0.7141733)),
        (b'rTRC', courbe), (b'gTRC', None), (b'bTRC', None)]
    # table d'étiquettes : 4 octets de nombre + 12 par étiquette ; les données suivent, alignées sur 4 octets
    entete_taille = 128 + 4 + 12 * len(tags)
    pos = entete_taille; corps = b''; table = b''; deja = {}
    for sig, d in tags:
        if d is None:
            off, ln = deja[b'rTRC']
        else:
            pad = (-len(corps)) % 4; corps += b'\0' * pad; off = pos + len(corps); corps += d; ln = len(d)
            deja[sig] = (off, ln)
        table += sig + struct.pack('>II', off, ln)
    taille = pos + len(corps) + ((-len(corps)) % 4)
    corps += b'\0' * ((-len(corps)) % 4)
    h = bytearray(128)
    h[0:4] = struct.pack('>I', taille); h[8:12] = b'\x02\x10\x00\x00'; h[12:16] = b'mntr'; h[16:20] = b'RGB '; h[20:24] = b'XYZ '
    h[36:40] = b'acsp'; h[68:80] = s15(0.9642) + s15(1.0) + s15(0.8249)
    return bytes(h) + struct.pack('>I', len(tags)) + table + corps

def bloc(dossier):
    reg = sous_ensemble(os.path.join(dossier, 'LiberationSans-Regular.ttf'), 'TeamOPSans-Regular', 'TeamOP Sans', 'Regular')
    gras = sous_ensemble(os.path.join(dossier, 'LiberationSans-Bold.ttf'), 'TeamOPSans-Bold', 'TeamOP Sans', 'Bold')
    icc = profil_srgb()
    def j(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    reg['stemv'] = 80; gras['stemv'] = 140
    ic = dict(l1=len(icc), z=base64.b64encode(zlib.compress(icc, 9)).decode())
    return (DEBUT + '\n'
            '/* Deux sous-ensembles TrueType (WinAnsi, 32..255) et un profil sRGB, compressés (zlib) puis en base64 : le PDF les recopie tels quels en\n'
            '   FlateDecode. `l1` = taille NON compressée (Length1). `w` = largeurs des codes 32..255, lues dans le sous-ensemble lui-même. */\n'
            'const _FX_POLICES={r:' + j(reg) + ',\n b:' + j(gras) + ',\n icc:' + j(ic) + '};\n' + FIN)

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dossier = args[0] if args else '/usr/share/fonts/truetype/liberation'
    b = bloc(dossier)
    if '--stdout' in sys.argv:
        print(b); sys.exit(0)
    chemin = os.path.join(RACINE, 'app.html')
    app = open(chemin, encoding='utf8').read()
    a = app.find('// ⟦FACTURX_POLICES:DEBUT⟧'); z = app.find(FIN)
    if a < 0 or z < a:
        print('ÉCHEC : les repères ⟦FACTURX_POLICES:DEBUT⟧ / ⟦FACTURX_POLICES:FIN⟧ sont introuvables dans app.html'); sys.exit(2)
    open(chemin, 'w', encoding='utf8').write(app[:a] + b + app[z + len(FIN):])
    print('app.html : bloc écrit (%d octets de base64)' % len(b))
