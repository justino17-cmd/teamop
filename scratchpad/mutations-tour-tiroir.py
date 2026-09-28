# Mutations du tiroir de la Tour (v2.75) : chaque défaut est remis dans une COPIE, jamais dans tour.html,
# et le banc (test-843) — plus la sonde au doigt pour les gestes — doit tomber.
import subprocess, re, sys, os
SRC = open('tour.html').read()
D = '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad'
MUTS = [
 ("feuille pas refermée à l'ouverture", "  if(feuilleVisible()) fermerFeuille();\n  clearTimeout(_tiroirFin);", "  clearTimeout(_tiroirFin);", True),
 ("vue ouverte AVANT de refermer", "function tiroirAller(v){ fermerTiroir(); setTab(v,true); }", "function tiroirAller(v){ setTab(v); fermerTiroir(); }", False),
 ("doigt par le pointeur", "document.addEventListener('touchstart',function(e){ var t=$('tiroir'); s=null;", "document.addEventListener('pointerdown',function(e){ var t=$('tiroir'); s=null;", True),
 ("tap après glissé non avalé", "if(Date.now()-_tiroirGlisseFin>350) return;", "if(true) return;", True),
 ("un id dans le tiroir", "'<div class=\"ti-nom\"><b>La Tour</b>'", "'<div class=\"ti-nom\" id=\"ti-nom\"><b>La Tour</b>'", False),
 ("le menu entier, sans le filtre du patron", "  menuVisible().forEach(function(g){\n    h+='<div class=\"ti-sec\">'", "  MENU.forEach(function(g){\n    h+='<div class=\"ti-sec\">'", False),
 ("nom non échappé", "(sous?'<span>'+esc(sous)+'</span>':'')", "(sous?'<span>'+sous+'</span>':'')", False),
 ("bureau sans !important", "@media(min-width:900px){.menu-rond,.tiroir,#scrim-tiroir{display:none!important}}", "", True),
 ("Échap : la feuille d'abord", "if(e.key==='Escape'){ if(_tiroirOuvert){ fermerTiroir(); return; } var f=$('feuille'); if(f&&!f.hidden) fermerFeuille(); }", "if(e.key==='Escape'){ var f=$('feuille'); if(f&&!f.hidden) fermerFeuille(); }", True),
 ("focus non rendu", "var b=$('menu-rond'); if(dedans&&b) try{ b.focus({preventScroll:true}); }catch(e){}", "", True),
 ("tiré vers la droite aussi", "var x=Math.min(0,dx), dt=", "var x=dx, dt=", False),
 ("aria-expanded jamais faux", "_tiroirOuvert=false; tiroirPastille(false);", "_tiroirOuvert=false;", True),
]
def compte(out):
    m = re.findall(r'(\d+) ✓ +(\d+) ✗', out); return (int(m[-1][0]), int(m[-1][1])) if m else (0, -1)
mord = 0
for nom, a, b, sonde in MUTS:
    n = SRC.count(a)
    if n != 1: print('ANCRE', nom, n); continue
    f = os.path.join(D, 'tour-mut.html'); open(f, 'w').write(SRC.replace(a, b))
    e = dict(os.environ, TOUR_FICHIER=f)
    r = subprocess.run(['node', 'tests/test-843.js'], capture_output=True, text=True, env=e, timeout=120)
    ok, ko = compte(r.stdout); res = 'banc %d✗' % ko
    ko2 = 0
    if sonde:
        r2 = subprocess.run(['node', 'scratchpad/sonde-tour-tiroir.js'], capture_output=True, text=True, env=e, timeout=400)
        ok2, ko2 = compte(r2.stdout); res += ' · sonde %s' % ('%d✗' % ko2 if ko2 >= 0 else 'a jeté (code %d)' % r2.returncode)
        if ko2 < 0 and r2.returncode: ko2 = 1
    m = (ko > 0) or (ko2 > 0)
    mord += m
    print(('MORD ' if m else 'NE MORD PAS ') + nom + ' — ' + res, flush=True)
print('%d/%d mutations mordent' % (mord, len(MUTS)))
assert open('tour.html').read() == SRC
