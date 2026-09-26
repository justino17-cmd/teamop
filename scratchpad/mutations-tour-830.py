"""Mutations du passage de la Tour au TÉLÉPHONE (v2.68) : chaque défaut que ce passage a retiré est REMIS, sur une
COPIE de tour.html (TOUR_FICHIER), et test-830 doit tomber. Jamais de `git checkout` : le fichier du dépôt ne bouge
pas. Chaque mutation prouve d'abord qu'elle a touché son motif (une seule occurrence), puis nomme le premier ✗."""
import os, subprocess, sys, tempfile
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(RACINE, 'tour.html'), encoding='utf-8').read()
NB = ' '
FIN = '\n.carte .reg-bloc{border-width:0}\n</style>'   # la dernière règle de la page : on AJOUTE après elle
M = [
 # 1 · l'en-tête
 ('le nom ne s’efface plus sous le titre court', 'body.titre-cache .hnom,body.titre-cache .app-pill{opacity:0;pointer-events:none}', 'body.titre-cache .app-pill{opacity:0;pointer-events:none}'),
 ('le seuil de l’effacement n’est plus celui du titre court', '@media(max-width:899px){\n  .hnom,.app-pill{transition', '@media(max-width:700px){\n  .hnom,.app-pill{transition'),
 ('une règle plus forte, écrite plus loin, remontre le nom', FIN, FIN.replace('</style>', 'body .hg .hnom{opacity:1}\n</style>')),
 ('le titre court trop large : il touche le logo et l’avatar', '.titre-court{max-width:calc(100% - 140px)}', '.titre-court{max-width:calc(100% - 40px)}'),
 ('l’en-tête garde l’état de la page quittée', "_obsTitre=null; document.body.classList.remove('titre-cache');", '_obsTitre=null;'),
 ('une fiche ne monte plus son titre', "var t=document.querySelector('#vue .ttl-page')||document.querySelector('#vue .fiche-nom')||document.querySelector('#vue .inc-titre');", "var t=document.querySelector('#vue .ttl-page');"),
 ('le titre « sort » sous le bord de l’écran, pas sous la barre', "{rootMargin:'-56px 0px 0px 0px'}", "{rootMargin:'0px'}"),
 ('observerTitre n’est plus rappelée au rendu', 'try{ majBarreBas(); observerTitre(); }catch(e){}', 'try{ majBarreBas(); }catch(e){}'),
 # 2 · titres de groupe
 ('au téléphone le titre de groupe colle de nouveau', '.reg-tete{position:relative;top:auto;background:rgba(0,0,0,0);', '.reg-tete{top:auto;background:rgba(0,0,0,0);'),
 ('au téléphone le titre de groupe garde ses 4 px', 'border-radius:0;padding-left:0}\n  .col-liste .reg-tete{padding-left:16px}', 'border-radius:0}\n  .col-liste .reg-tete{padding-left:16px}'),
 ('au bureau la bande ne déborde plus : le texte part à 4 px', '@media(min-width:900px){\n  .reg-tete{margin-left:-4px}', '@media(min-width:900px){\n  .reg-tete{margin-left:0}'),
 ('dans une liste encadrée la bande se peint de nouveau', '.col-liste .reg-tete{background:rgba(0,0,0,0);-webkit-backdrop-filter:none;backdrop-filter:none}\n', ''),
 ('« moins de transparence » repeint la bande au téléphone', '@media(max-width:899px) and (prefers-reduced-transparency:reduce){\n  body.jour .reg-tete,body:not(.jour) .reg-tete{background:rgba(0,0,0,0)!important}\n}', ''),
 ('Courrier : le titre ne suit plus le filet de la liste', '.mail-rows .reg-tete{padding-left:17px}', '.mail-rows .reg-tete{padding-left:16px}'),
 # 3 · colonnes
 ('les lignes de compte retrouvent leurs 2 px', '.svl-compte{margin-left:0;margin-right:0}\n', ''),
 ('le lien de bas de liste part à 14 px', '.ac-plus{margin-left:-14px}\n', ''),
 ('l’activité n’est plus sur deux colonnes', '.ac-jr>div{display:grid;grid-template-columns:auto minmax(0,1fr);', '.ac-jr>div{grid-template-columns:auto minmax(0,1fr);'),
 ('« Le suivi » : chaque phrase repart ailleurs', '.expl-suivi>.expl-l{display:contents}\n', ''),
 ('« Le suivi » écrit hors de son conteneur', 'Le suivi</div><div class="expl-suivi">\'+', 'Le suivi</div>\'+'),
 ('la date des paiements repasse sur deux lignes', '.abn-j .d{flex:0 0 13ch;white-space:nowrap}', '.abn-j .d{flex:0 0 13ch}'),
 ('une carte à 24 px entre des cartes à 16', '@media(max-width:899px){ .carte.p24{padding:16px} }\n', ''),
 ('l’en-tête du dossier reprend ses 24 px', '\'<div class="carte inc-tete">\'', '\'<div class="carte p24 inc-tete">\''),
 ('la barre « Suivi » repart à 10 px', '.barre-act{padding-left:16px;padding-right:16px}\n', ''),
 ('une liste dans une carte : le retrait s’ajoute à celui de la carte', '.carte .reg-bloc>.reg-l.inerte{padding-left:0;padding-right:0}\n', ''),
 ('…et son filet repart à 56 px', '.carte .reg-bloc>.reg-l.inerte+.reg-l.inerte::before{left:0;right:0}\n', ''),
 ('« Son espace » repart à 16 px', '.sous-sec>.item{padding-left:0;padding-right:0}\n', ''),
 ('les chiffres « chez eux » décalés d’un pixel', '.dsr-rang{margin-left:-9px}', '.dsr-rang{margin-left:-8px}'),
 ('« En un coup d’œil » : le filet part avant le texte', '.ac-aside .reg-bloc>.reg-l+.reg-l::before{left:16px}\n\n/* 17', '\n/* 17'),
 ('« libellé : valeur » de nouveau sur deux colonnes étroites', '.kv>div{grid-template-columns:minmax(0,1fr);row-gap:2px}', '.kv>div{row-gap:2px}'),
 ('Journal : le pied de ligne repart sous l’icône', '.reg-l.inerte.jr-l>.reg-fin{padding-left:42px}', '.reg-l.inerte.jr-l>.reg-fin{padding-left:34px}'),
 ('Journal : une fabrique perd sa classe', '\'<div class="reg-l inerte jr-l">', '\'<div class="reg-l inerte">'),
 ('Équipe : au bureau les gestes repartent à 46 px', 'margin-top:6px;padding-left:44px}\n/* v2.68 — LES COMPTES', 'margin-top:6px;padding-left:46px}\n/* v2.68 — LES COMPTES'),
 ('de nuit, la liste d’une carte retrouve son cadre (le texte le touche)', '\n.carte .reg-bloc{border-width:0}\n</style>', '\n</style>'),
 ('le pied du Journal garde ses 2 px', '.jr-vide,.jr-fin,.abn-tete-code{padding-left:0;padding-right:0}', '.jr-vide,.abn-tete-code{padding-left:0;padding-right:0}'),
 ('l’écran Accès ne se redessine plus', "try{ if(TAB==='essais'||TAB==='entreprises'||TAB==='abonnements'||TAB==='accueil') render(); }catch(e){}", "try{ if(TAB==='essais') renderVue('essais'); else if(TAB==='entreprises'||TAB==='abonnements'||TAB==='accueil') render(); }catch(e){}"),
 ('la typographie redevient limitée à la vue', "(function(){ var v=document.body; if(!v||", "(function(){ var v=document.getElementById('vue'); if(!v||"),
 ('la note promet de nouveau « la v621 »', "aucune encore (elles se font toutes seules, au plus une par demi-heure et par appareil)", "aucune encore (elles arrivent avec la v621, au plus une par demi-heure et par appareil)"),
 ('Équipe : les quatre gestes de nouveau sur une rangée', '.reg-l.eqp-l .eqp-actions{display:grid;grid-template-columns:1fr 1fr;', '.reg-l.eqp-l .eqp-actions{grid-template-columns:1fr 1fr;'),
 # 4 · menus
 ('les menus perdent leur chevron', 'select.sel-f{background-image:var(--chevron);background-repeat:no-repeat;background-size:16px 16px}\n', ''),
 ('au téléphone le chevron n’est plus à droite', '@media(max-width:900px){ select.sel-f{background-position:right 10px center} }\n', ''),
 ('un raccourci écrit plus loin efface le chevron au focus', FIN, FIN.replace('</style>', 'select.sel-f:focus-visible{background:var(--surface)}\n</style>')),
 ('« Toutes les applications » redevient un menu étroit', '\'<select class="sel-f large" onchange="incF(\\\'app\\\'', '\'<select class="sel-f" onchange="incF(\\\'app\\\''),
 # 5 · typographie
 ('« « » de nouveau séparable de son mot', ".replace(/« /g,'«" + NB + "')", ''),
 ('le filtre laisse passer les « € »', 'var TYPO_RX=/[:;!?»·—€%]|« /;', 'var TYPO_RX=/[:;!?»·—%]|« /;'),
 ('la typographie touche le code et les champs', "p.closest('pre,code,script,style,textarea,[contenteditable]')", "p.closest('pre,script,style')"),
 ('la clé du pliage redevient sensible aux insécables', "nom.replace(/\\u00A0/g,' ').trim()", "nom.trim()"),
 ('l’observateur regarde aussi characterData (boucle)', '.observe(v,{childList:true,subtree:true});', '.observe(v,{childList:true,subtree:true,characterData:true});'),
 # 6 · accords
 ('nMot met « 1 » au pluriel', "return n+' '+(n>1?plusieurs:un); }", "return n+' '+(n>=1?plusieurs:un); }"),
 ('un « (s) » revient', "toast(nMot(x.d.effacees,'tentative effacée','tentatives effacées'));", "toast((x.d.effacees||0)+' tentative(s) effacée(s)');"),
 ('la remise à zéro tait les deux consoles', "(deux?', dans les deux consoles (OP GESTION et OP MESSAGES)':'')", "''"),
 ('la remise à zéro toujours au pluriel', "(n>1?' problèmes passent':' problème passe')", "' problèmes passent'"),
 ('la phrase sous le bouton recommence par une minuscule', "(MYAPPS.length>1?'Dans les deux consoles, ils passent':'Ils passent')", "(MYAPPS.length>1?'dans les deux consoles, ils passent':'ils passent')"),
 ('le tiret orphelin revient avant le bouton', "' par leur application. <button", "' par leur application — <button"),
]
morts, vivants = 0, []
for nom, a, b in M:
    n = SRC.count(a)
    if n != 1: print('  ⚠ motif introuvable (' + str(n) + ') : ' + nom); vivants.append(nom + ' (motif)'); continue
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f: f.write(SRC.replace(a, b)); chemin = f.name
    try:
        r = subprocess.run(['node', os.path.join(RACINE, 'tests', 'test-830.js')], env=dict(os.environ, TOUR_FICHIER=chemin), capture_output=True, text=True, timeout=60)
        ko = [l.strip() for l in r.stdout.split('\n') if l.strip().startswith('✗')]
        if r.returncode != 0 and ko: morts += 1; print('  ✓ mord — ' + nom + ' → ' + ko[0][:120])
        else: vivants.append(nom); print('  ✗ NE MORD PAS — ' + nom + (' (sortie ' + str(r.returncode) + ')' if r.returncode else ''))
    finally: os.unlink(chemin)
print('\n%d/%d mutations mordent' % (morts, len(M)))
sys.exit(1 if vivants else 0)
