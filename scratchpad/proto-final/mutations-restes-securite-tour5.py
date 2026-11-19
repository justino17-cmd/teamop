#!/usr/bin/env python3
# CONTRE-ÉPREUVE de restes-securite-tour5.js (19 novembre 2026) : on REMET chaque défaut des points 1 à 5, un par un, et la sonde doit TOMBER (un ✗ nommé).
# Chaque mutation ne rejoue que la TRANCHE de la sonde qu'elle vise (SECTIONS). Usage : python3 mutations-restes-securite-tour5.py [indices séparés par des virgules]
# ⛔ Ordre : correctif commité → mutation → git checkout. Vérifie (a) l'ancre EXACTEMENT une fois, (b) la page a VRAIMENT changé (git diff non vide), (c) le texte muté est dans le fichier,
# (d) après restauration git diff est VIDE. Au premier plan, depuis la racine du dépôt, un délai par exécution (420 s).
import subprocess, sys, os
SONDE = ['node', 'scratchpad/proto-final/sondes/restes-securite-tour5.js']
PG = 'apercu/prototype-op-gestion.html'
# (nom, ancre, remplacement, SECTIONS)
MUTS = [
 ('M1a (1) pdfOctets ne normalise plus en NFC : l’accent d’un « é » décomposé s’efface dans le PDF',
  "txt = String(txt == null ? '' : txt).normalize('NFC');", "txt = String(txt == null ? '' : txt);", 'pdf'),
 ('M1b (1) libelleSur ne normalise plus en NFC : cliNet garde le nom décomposé',
  "const libelleSur = (t, n) => coupeSure(String(t == null ? '' : t).normalize('NFC').replace(", "const libelleSur = (t, n) => coupeSure(String(t == null ? '' : t).replace(", 'pdf'),
 ('M2a (2) plus de coupe fine à la frappe/collage (beforeinput muet) : le navigateur coupe en unités UTF-16',
  "document.addEventListener('beforeinput', e => { if (!e.isTrusted) return;", "document.addEventListener('beforeinput', e => { return; if (!e.isTrusted) return;", 'graph'),
 ('M2b (2) la coupe fine compte des unités UTF-16 et non des signes',
  "const ins = coupeSure(String(txt), Math.max(place, 0));", "const ins = String(txt).slice(0, Math.max(place, 0));", 'graph'),
 ('M2c (2) le repli sur l’événement input est supprimé',
  "document.addEventListener('input', e => { if (!e.isTrusted) return;", "document.addEventListener('input', e => { return; if (!e.isTrusted) return;", 'graph'),
 ('M2d (2) la moitié de drapeau n’est plus retirée au repli (sansOrphelin ne fait rien)',
  "function sansOrphelin(t){ t = String(t);", "function sansOrphelin(t){ return String(t); t = String(t);", 'graph'),
 ('M2e (2) la moitié de drapeau n’est cherchée qu’à pleine longueur (le défaut mesuré : la coupe laisse m - 1 unités)',
  "if (v.length >= m - 1) v = sansOrphelin(v);", "if (v.length >= m) v = sansOrphelin(v);", 'graph'),
 ('M3a (3) une ligne d’invisibles compte de nouveau comme une ligne',
  ".filter(l => l && !INVISIBLES.test(l));", ".filter(Boolean);", 'invis'),
 ('M3b (3) U+200B n’est plus dans les invisibles',
  "\\u180b-\\u180f\\u200b-\\u200f\\u2060-\\u206f", "\\u180b-\\u180f\\u200c-\\u200f\\u2060-\\u206f", 'invis'),
 ('M3c (3) NEL U+0085 n’est plus un signe de contrôle ni un invisible',
  ".replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]/g, ' ')", ".replace(/[\\u0000-\\u001f\\u007f\\u2028\\u2029]/g, ' ')", 'invis'),
 ('M4a (4) un signe de contrôle redevient « rien » : « Code\\u0007portail » → « Codeportail »',
  ".replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]/g, ' ').replace(/[<>\"`\\u202a-\\u202e\\u2066-\\u2069]/g, '')", ".replace(/[\\t\\n\\r\\v\\f\\u2028\\u2029]/g, ' ').replace(/[\\u0000-\\u001f\\u007f-\\u009f<>\"`\\u202a-\\u202e\\u2066-\\u2069]/g, '')", 'ctrl'),
 ('M4b (4) les blancs doublés ne sont plus réduits',
  ".replace(/\\s+/g, ' ').trim(), n || 60);", ".replace(/ {1}/g, ' ').trim(), n || 60);", 'ctrl'),
 ('M5a (5) n-titre : le refus avec phrase saute',
  "{ const pl = refusLong(document.getElementById('n-titre').value, 120, 'Ce qu’il faut faire'); if (pl) {", "{ const pl = refusLong(document.getElementById('n-titre').value, 120, 'Ce qu’il faut faire'); if (false) {", 'dix'),
 ('M5b (5) dvn-objet : le refus avec phrase saute',
  "else if (refusLong(f.objet, 120, 'Objet du devis')) f.err = refusLong(f.objet, 120, 'Objet du devis');", ";", 'dix'),
 ('M5c (5) ml-o : le maxlength saute',
  '<input id="ml-o" maxlength="200" value=', '<input id="ml-o" value=', 'dix'),
 ('M5d (5) eq-p : le maxlength saute',
  'Prénom<input id="eq-p" maxlength="60" autocomplete="off"></label><label class="champ">Nom<input id="eq-n" maxlength="60" autocomplete="off"></label></div>\n    <div id="eq-homo"', 'Prénom<input id="eq-p" autocomplete="off"></label><label class="champ">Nom<input id="eq-n" maxlength="60" autocomplete="off"></label></div>\n    <div id="eq-homo"', 'dix'),
 ('M5e (5) t-nom : le refus avec phrase saute',
  "cAjoutTypeOk(){ { const pl = refusLong(document.getElementById('t-nom').value, 40, 'Nom du type'); if (pl) {", "cAjoutTypeOk(){ { const pl = refusLong(document.getElementById('t-nom').value, 40, 'Nom du type'); if (false) {", 'dix'),
 ('M5f (5) pa-lib : le refus avec phrase saute',
  "{ const pl = refusLong(document.getElementById('pa-lib').value, 60, 'Libellé'); if (pl) {", "{ const pl = refusLong(document.getElementById('pa-lib').value, 60, 'Libellé'); if (false) {", 'dix'),
 ('M5g (5) tk-t : le refus avec phrase saute',
  "{ const pl = refusLong(document.getElementById('tk-t').value, 120, 'Ce qu’il faut faire'); if (pl) {", "{ const pl = refusLong(document.getElementById('tk-t').value, 120, 'Ce qu’il faut faire'); if (false) {", 'dix'),
 ('M5h (5) pr-nom : le maxlength saute',
  '<input id="pr-nom" maxlength="80" data-prnom="1"', '<input id="pr-nom" data-prnom="1"', 'dix'),
]
sel = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else range(len(MUTS))
tombent = 0; n = 0; problemes = 0
for idx in sel:
    nom, a, b, sections = MUTS[idx]
    s = open(PG, encoding='utf-8').read()
    if s.count(a) != 1:
        print('✗ ANCRE INTROUVABLE OU MULTIPLE (%d) : %s' % (s.count(a), nom)); problemes += 1; continue
    open(PG, 'w', encoding='utf-8').write(s.replace(a, b)); n += 1
    d = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout
    touche = b in open(PG, encoding='utf-8').read()
    env = dict(os.environ, SECTIONS=sections)
    try:
        r = subprocess.run(SONDE, capture_output=True, text=True, timeout=420, env=env); sortie, code = r.stdout, r.returncode
    except subprocess.TimeoutExpired as e:
        sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 99
    subprocess.run(['git', 'checkout', PG], check=True)
    vide = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout.strip() == ''
    ko = [l.strip()[:130] for l in sortie.splitlines() if l.startswith('  ✗')]
    tombe = bool(d.strip()) and touche and code != 99 and bool(ko) and code == len(ko) and vide
    tombent += 1 if tombe else 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom + ' · code ' + str(code) + ' · diff mutation non vide : ' + str(bool(d.strip())) + ' · texte muté présent : ' + str(touche) + ' · diff vide après restauration : ' + str(vide) + ' · ✗ ' + str(len(ko)) + (' · 1er : ' + ko[0] if ko else ''))
    sys.stdout.flush()
fin = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout.strip()
print('== %d mutations jouées, %d font tomber la sonde, %d anomalies d\'ancre ; git diff final : %s' % (n, tombent, problemes, 'VIDE' if not fin else fin))
