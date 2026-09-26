"""Mutations de la Tour v2.68 : chaque défaut que la réorganisation a retiré est REMIS, sur une COPIE de
tour.html (TOUR_FICHIER), et test-829 doit tomber. Jamais de `git checkout` : le fichier du dépôt ne
bouge pas. Chaque mutation prouve d'abord qu'elle a touché son motif (une seule occurrence)."""
import os, subprocess, sys, tempfile
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(RACINE, 'tour.html'), encoding='utf-8').read()
M = [
 ('une vue changée de catégorie', "{section:'Administration',vues:[['essais','Accès','gestion'],", "{section:'Administration',vues:[['essais','Accès','gestion'],['donnees','Sauvegardes','gestion'],", 'dupli'),
 ('le Journal rendu au collaborateur', "var PATRON_SEUL=['essais','equipe','journal','donnees'];", "var PATRON_SEUL=['essais','equipe','donnees'];", None),
 ('une liste des vues de nouveau écrite à la main', "var VUES_PAR_APP={gestion:vuesDe('gestion'),messages:vuesDe('messages')};",
   "var VUES_PAR_APP={gestion:['accueil','surveillance','support','entreprises','connexions','abonnements','devisia','essais','donnees','equipe','journal'],messages:vuesDe('messages')};", None),
 ('un second nom pour Accès', "var tete=enTete('Accès',", "var tete=enTete('Comptes & accès',", None),
 ('une abréviation qui n’en est pas une', "support:'Courrier',donnees:'Sauveg.'", "support:'Courrier',donnees:'Données'", None),
 ('le filet de renderVue retiré', "  if(!vuePermise(TAB)) TAB='accueil';   /* v2.68", "  if(false) TAB='accueil';   /* v2.68", None),
 ('setTab sans porte', "  if(vues().indexOf(t)<0) t='accueil';   /* un onglet", "  if(false) t='accueil';   /* un onglet", None),
 ('le rôle relu ne fait plus sortir', "    if(!vuePermise(TAB)){ renderTabs(); setTab('accueil',true); }", "    if(false){ renderTabs(); setTab('accueil',true); }", None),
 ('« Ouverts » oublie de nouveau le sans-statut dans sa liste', "    if(f.statut==='actifs'){ var st=i.statut||'nouveau'; if(st!=='nouveau'&&st!=='encours') return false; }",
   "    if(f.statut==='actifs'){ if(i.statut!=='nouveau'&&i.statut!=='encours') return false; }", None),
 ('« Écartés » filtre autre chose que ce qu’il compte', "    else if(f.statut==='ecartes'){ if(ST_ECARTES.indexOf(i.statut||'nouveau')<0) return false; }",
   "    else if(f.statut==='ecartes'){ if(ST_ECARTES.indexOf(i.statut||'nouveau')<1) return false; }", None),
 ('la tuile « En essai » sans segment', "['active','Payants',payants],['trialing','En essai',enEssai],", "['active','Payants',payants],", None),
 ('une tuile d’Entreprises muette', "var ENT_FILTRE_LIB={erreurs:'avec des erreurs',echecs:'avec des échecs de connexion',", "var ENT_FILTRE_LIB={erreurs:'avec des erreurs',", None),
 ('l’en-tête collant revient dans la colonne arrondie', ".col-liste .reg-tete{position:relative;top:auto}", ".col-liste .reg-tete{top:auto}", None),
 ('un identifiant d’ELAN dans un commentaire', "/* ══ LE MENU — les CATÉGORIES de la Tour (v2.68).", "/* ══ LE MENU — les CATÉGORIES de la Tour (v2.68, cf. elan-34oc).", None),
 ('la note d’Équipe de nouveau écrite à la main', "'<div class=\"eqp-note\"><b>Le compte créé est un collaborateur.</b> '+eqNoteCollaborateur()+'",
   "'<div class=\"eqp-note\"><b>Le compte créé est un collaborateur.</b> Il voit Surveillance, Support et Entreprises — pas Équipe.'+'", None),
 ('la phrase de droits d’un compte de nouveau à la main', "(pat?' · tous les onglets, y compris '+esc(enPhrase(libsPatronSeul(),'et')):' · ni '+esc(libsPatronSeul().join(', ni ')))+",
   "(pat?' · tous les onglets, y compris Équipe, Accès et Journal':' · ni Équipe, ni Accès, ni Journal')+", None),
 ('le menu déroulant du statut revient', "var filtres='<div class=\"filtres svl-filtres\">'+", "var filtres='<div class=\"filtres svl-filtres\">'+'<select class=\"sel-f\" onchange=\"incF(\\'statut\\',this.value)\"></select>'+", None),
 ('six chiffres rangés « 5 + 1 »', "grille-kpi simple k6", "grille-kpi simple", None),
 ('les comptes de la fiche, commandes de nouveau sur la ligne', "      return '<div class=\"reg-l inerte cpt-l\">'+", "      return '<div class=\"reg-l inerte\">'+", None),
]
morts, vivants = 0, []
for nom, a, b, _ in M:
    n = SRC.count(a)
    if n != 1: print('  ⚠ motif introuvable (' + str(n) + ') : ' + nom); vivants.append(nom + ' (motif)'); continue
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f: f.write(SRC.replace(a, b)); chemin = f.name
    try:
        r = subprocess.run(['node', os.path.join(RACINE, 'tests', 'test-829.js')], env=dict(os.environ, TOUR_FICHIER=chemin), capture_output=True, text=True, timeout=60)
        ko = [l.strip() for l in r.stdout.split('\n') if l.strip().startswith('✗')]
        if r.returncode != 0 and ko: morts += 1; print('  ✓ mord — ' + nom + ' → ' + ko[0][:110])
        else: vivants.append(nom); print('  ✗ NE MORD PAS — ' + nom)
    finally: os.unlink(chemin)
print('\n%d/%d mutations mordent' % (morts, len(M)))
sys.exit(1 if vivants else 0)
