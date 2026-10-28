#!/usr/bin/env python3
"""Mutations des décisions réunions/appels du 26 octobre 2026 (tests 3030 à 3036) : chaque mutation est posée sur l'arbre (déjà commité), le banc visé doit tomber, puis `git checkout HEAD -- fichier`.
Usage : python3 scratchpad/mutations-opmessages-reunions-appels.py [préfixe...]   (F B S R A J O ; sans argument : toutes). ⛔ L'arbre doit être COMMITÉ avant (CLAUDE.md : correctif → banc → commit → mutation → checkout)."""
import subprocess, sys, re, time
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE='apercu/opmessages/index.html'; SRV='server-msg/stockage.js'
def sub(a,b,n=1): return lambda s: (s.replace(a,b,n) if a in s else None)
def rx(p,b): return lambda s: (re.sub(p,b,s,count=1) if re.search(p,s) else None)
M=[]
def m(id,suite,fichier,nom,f): M.append((id,suite,fichier,nom,f))
# --- #2 : 3030
m('F1','3030',PAGE,'la fiche ne sait plus qu\'elle est terminée',sub("const finie = !!F.seance && !d.annulee;","const finie = false;"))
m('F2','3030',PAGE,'« Ta réponse » revient sur une réunion terminée',sub("if (!hote && !d.annulee && !finie) s +=","if (!hote && !d.annulee) s +="))
m('F3','3030',PAGE,'« Me rappeler » revient sur une réunion terminée',sub("if (!d.annulee && !finie) s +=","if (!d.annulee) s +="))
m('F4','3030',PAGE,'la zone du trajet revient sur une réunion terminée',sub("if (!finie) s += '<div id=\"reu-trajet-zone\"></div>';","s += '<div id=\"reu-trajet-zone\"></div>';"))
m('F5','3030',PAGE,'la fiche vivante perd « Ta réponse » (on a retiré à tout le monde)',sub("if (!hote && !d.annulee && !finie) s +=","if (false) s +="))
# --- #3 : 3031
m('B1','3031',PAGE,'le corps de la bannière reçoit encore le toucher en appel',sub("html[data-appel] .notif.on.touchable { pointer-events: none; cursor: default; }","html[data-appel] .notif.on.touchable { cursor: default; }"))
m('B2','3031',PAGE,'le bouton « Ouvrir » ne reçoit plus le toucher',sub("font-size: 14px; font-weight: 600; pointer-events: auto; cursor: pointer; }","font-size: 14px; font-weight: 600; cursor: pointer; }"))
m('B3','3031',PAGE,'notifier ne montre plus le bouton',sub("$('notif-ouvrir').hidden = !vers; ","$('notif-ouvrir').hidden = true; "))
m('B4','3031',PAGE,'la bannière en appel garde « OP MESSAGES · maintenant »',sub("html[data-appel] .notif-tete { display: none; }","html[data-appel] .notif-tete-x { display: none; }"))
m('B8','3031',PAGE,'la bannière en appel cache le texte du message (l\'aide)',sub("html[data-appel] .notif-aide:empty { display: none; }","html[data-appel] .notif-aide { display: none; }"))
m('B5','3031',PAGE,'la zone de toucher de « Ouvrir » ne dépasse plus (32 px)',sub('html[data-appel] .notif-ouvrir::after { content: ""; position: absolute; inset: -6px -4px; }','html[data-appel] .notif-ouvrir::after { content: ""; position: absolute; inset: 0; }'))
m('B6','3031',PAGE,'la bannière en appel garde sa taille d\'avant',sub("html[data-appel] .notif { padding: 6px 8px 6px 12px; gap: 8px; border-radius: 18px; }","html[data-appel] .notif { gap: 8px; border-radius: 18px; }"))
m('B7','3031',PAGE,'le bouton « Ouvrir » reste affiché hors appel',sub(".notif-ouvrir { display: none; }\n",".notif-ouvrir { display: inline-flex; }\n"))
# --- #4/#5 : 3032
m('S1','3032',PAGE,'un appel réduit reçoit l\'écran plein',sub("if (snap.etat === 'termine' && !etat.appelReduit && !etat.raccrocher) {","if (snap.etat === 'termine' && !etat.raccrocher) {"))
m('S2','3032',PAGE,'un raccrochage voulu reçoit l\'écran',sub("if (snap.etat === 'termine' && !etat.appelReduit && !etat.raccrocher) {","if (snap.etat === 'termine' && !etat.appelReduit) {"))
m('S3','3032',PAGE,'la salle terminée pendant l\'attente passe pour une fin',sub("if (issue === 'refuse_hote' || (prec && prec.attente))","if (issue === 'refuse_hote')"))
m('S4','3032',PAGE,'la connexion perdue reçoit un écran',sub("const ISSUES_SANS_ECRAN = ['perdu', 'compte', 'pris_ailleurs', 'parti_ailleurs'];","const ISSUES_SANS_ECRAN = ['compte', 'pris_ailleurs', 'parti_ailleurs'];"))
m('S5','3032',PAGE,'l\'écran de sortie laisse la caméra allumée',sub("    A.sortie = so;\n    appelLacherMedias(A);","    A.sortie = so;\n"))
m('S6','3032',PAGE,'le bouton ne mène plus à la conversation',sub("if (A.sortie.versConv) ouvrirConversationAvec([], A.sortie.conv); else raccrocherCouche();","raccrocherCouche();"))
m('S7','3032',PAGE,'entrer dans une salle déjà finie ramène tout de suite en arrière',sub("{ const so = snap && snap.etat === 'termine' && snap.salle && !etat.appelReduit ? sortieDe(null, snap, true) : null; if (so) { A.snap = snap; sortieMontrer(A, so); return; } }",""))
m('S8','3032',PAGE,'la salle ne note plus qui était là',sub("for (const m of s.membres) if (m.statut === 'present') X.etaientLa.set(m.id, nomM(m));",""))
m('S17','3032',PAGE,'la salle note qui était là dans X.venus (le Set de l\'enregistrement)',sub("if (!X.etaientLa) X.etaientLa = new Map(); for (const m of s.membres) if (m.statut === 'present') X.etaientLa.set(m.id, nomM(m));","if (!X.venus) X.venus = new Map(); for (const m of s.membres) if (m.statut === 'present') X.venus.set(m.id, nomM(m));"))
m('S9','3032',PAGE,'Échap est avalé par la salle sur son écran de sortie',sub("if (!enSalle(A) || A.sortie) return false;       // (l'écran de sortie","if (!enSalle(A)) return false;       // (l'écran de sortie"))
m('S10','3032',PAGE,'un écran de sortie est retouché par le flux',sub("    if (A.sortie) return;                                                    // l'écran de sortie est posé","    // retiré"))
m('S11','3032',PAGE,'un appel qui arrive est ignoré sur l\'écran de sortie',sub("(etat.appelId && !surSortie)","etat.appelId"))
m('S12','3032',PAGE,'« Toi seul » n\'existe plus',sub("if (!noms.length) return 'Toi seul';","if (!noms.length) return 'Toi';"))
m('S13','3032',PAGE,'la fin d\'un appel de groupe reçoit l\'écran « fin »',sub("if (reunion) return { mode: 'fin'","if (true) return { mode: 'fin'"))
m('S14','3032',PAGE,'la durée n\'est plus dite',sub("if (so.duree > 0) ligne('Durée', dureeSeance(so.duree));",""))
m('S15','3032',PAGE,'quitterAppel ne retire plus data-sortie',sub(" delete document.documentElement.dataset.salle; delete document.documentElement.dataset.sortie;"," delete document.documentElement.dataset.salle;"))
m('S16','3032',PAGE,'la feuille de style ne cache plus la salle sous l\'écran de sortie',sub("html[data-sortie] .appel-ecran, html[data-sortie] .salle-ecran { display: none; }",""))
# --- #8 : 3033
m('R1','3033',PAGE,'l\'origine perd sa feuille',sub("feuille: r.feuille || false } };","feuille: false } };"))
m('R2','3033',PAGE,'le retour ramène même un appel réduit',sub("if (!o || !visible || !o.route.feuille","if (!o || !o.route.feuille"))
m('R3','3033',PAGE,'un sélecteur se rouvre',sub("FEUILLES_RETOUR = ['reunion', 'info',","FEUILLES_RETOUR = ['appel', 'reunion', 'info',"))
m('R4','3033',PAGE,'lancerAppel ne note plus l\'origine',sub("    origineAppelPoser(c.id);\n    if (depuisFeuille","    if (depuisFeuille"))
m('R5','3033',PAGE,'« Message » n\'efface plus l\'origine',sub("    origineAppelEffacer();                      // aller à la conversation est un CHOIX","    // retiré                      // aller à la conversation est un CHOIX"))
m('R6','3033',PAGE,'quitterAppel dit toujours « visible »',sub("origineAppelRetour(id, visible);","origineAppelRetour(id, true);"))
m('R7','3033',PAGE,'le retour se rouvre par-dessus une feuille déjà ouverte',sub("if (!r || etat.appelId || r.feuille || r.appel","if (!r || etat.appelId || r.appel"))
m('R8','3033',PAGE,'solder un autre appel efface l\'origine du bon',sub("if (o) origineAppelEffacer();","origineAppelEffacer();"))
m('R9','3033',PAGE,'surAppelEntrant ne note plus l\'origine',sub("    origineAppelPoser(id);\n    if (surSortie","    if (surSortie"))
m('R10','3033',PAGE,'le retour ne vérifie plus l\'écran d\'arrivée',sub("|| r.vue !== b.vue || (r.conv || null) !== (b.conv || null) || (r.sec || null) !== (b.sec || null)) return;","|| false) return;"))
m('R11','3033',PAGE,'« avant d\'entrer » est l\'origine',sub("if (cleFeuille(r.feuille) === 'avant') { const h = entree();","if (false) { const h = entree();"))
# --- #9 : 3034
m('A1','3034',PAGE,'le nombre de manqués n\'est plus dit',sub("return a.repetitions + ' appels manqués';","return 'Appel manqué';"))
m('A2','3034',PAGE,'un appel de groupe est regroupé',sub("if (!a.groupe && a.sens === 'manque' && a.repetitions > 1)","if (a.sens === 'manque' && a.repetitions > 1)"))
m('A3','3034',PAGE,'un appel entrant répété est regroupé',sub("if (!a.groupe && a.sens === 'manque' && a.repetitions > 1)","if (!a.groupe && a.repetitions > 1)"))
m('A4','3034',PAGE,'l\'ancienne parenthèse revient',sub("return a.repetitions + ' appels manqués';","return 'Appel manqué (' + a.repetitions + ')';"))
m('A5','3034',PAGE,'deux manqués ne sont plus un groupe',sub("a.sens === 'manque' && a.repetitions > 1) return","a.sens === 'manque' && a.repetitions > 2) return"))
# --- #17 : 3035
m('J1','3035',PAGE,'une soirée qui passe minuit devient plusieurs jours',sub("if (!o || o.fin - o.debut < 86400000) return null;","if (!o || o.fin - o.debut < 3600000) return null;"))
m('J2','3035',PAGE,'les jours de suite ne sont plus listés',sub("      else if (o.debut < jour && o.fin > jour) { const suite = suiteReunion(o, jour); if (suite) sortie.push({ r, o, suite }); }",""))
m('J3','3035',PAGE,'la colonne de l\'heure ne dit plus « Suite »',sub("heureEmpilee(o.debut, o.fin, suite && suite.n > 1 ? 'Suite' : '') +","heureEmpilee(o.debut, o.fin) +"))
m('J4','3035',PAGE,'la ligne ne dit plus « Jour 2 sur 3 »',sub("(maj1(rang), r.lieu, 'Durée '","(r.lieu, 'Durée '") if False else sub("[maj1(rang), r.lieu, partir,","[r.lieu, partir,"))
m('J5','3035',PAGE,'la puce garde l\'heure du premier jour',sub("esc(suite ? 'J' + x.suite.n + '/' + x.suite.total : FMT_HEURE.format(x.o.debut))","esc(FMT_HEURE.format(x.o.debut))"))
m('J6','3035',PAGE,'l\'étiquette vocale de la case redit l\'heure d\'avant',sub("(journeeElt(x, t) || (x.suite && x.suite.n > 1) ? '' :","(journeeElt(x, t) ? '' :"))
m('J7','3035',PAGE,'le rang s\'arrondit vers le haut (un jour de 25 h ajoute un jour)',sub("const d0 = debutDeJour(o.debut), total = Math.round((debutDeJour(o.fin - 1) - d0) / 86400000) + 1, n = Math.round((debutDeJour(jour) - d0) / 86400000) + 1;","const d0 = debutDeJour(o.debut), total = Math.ceil((debutDeJour(o.fin - 1) - d0) / 86400000) + 1, n = Math.ceil((debutDeJour(jour) - d0) / 86400000) + 1;"))
m('J8','3035',PAGE,'l\'étiquette vocale de la puce ne dit plus le rang',sub("plageLongue(x.o.debut, x.o.fin)) + (x.suite ? ', ' + texteSuite(x) : '') +","plageLongue(x.o.debut, x.o.fin)) +"))
m('J9','3035',PAGE,'la ligne du premier jour perd son rang',sub("const rang = suite ? 'jour ' + suite.n + ' sur ' + suite.total : '';","const rang = suite && suite.n > 1 ? 'jour ' + suite.n + ' sur ' + suite.total : '';"))
# --- #18 : 3036
m('O1','3036',SRV,'le successeur redevient intérimaire',sub("return hote !== uid && !salleSuccesseur(a, uid, hote);","return hote !== uid;"))
m('O2','3036',SRV,'plus de passation à l\'invité nommé',sub("const organisateurPasse = !!hoteR && (appelPart(id, hoteR) || {}).statut === 'parti';","const organisateurPasse = false;"))
m('O3','3036',SRV,'le lien devient successeur',sub("AND EXISTS (SELECT 1 FROM reunion_invite i WHERE i.reunion = ? AND i.uid = p.uid AND i.invite_par IS NOT NULL)\n","\n"))
m('O4','3036',SRV,'l\'organisatrice qui revient retire toujours le successeur',sub("if (p && p.statut === 'parti') Q(","if (false) Q("))
m('O5','3036',SRV,'un invité du lien est « successeur » (donc plein)',sub("&& !!Q('SELECT 1 FROM reunion_invite WHERE reunion = ? AND uid = ? AND invite_par IS NOT NULL').get(a.reunion, uid);","&& true;"))
m('O6','3036',SRV,'le successeur ne se reconnaît plus au retour de l\'organisatrice',sub("(org.statut === 'parti' || org.statut === 'present')","(org.statut === 'parti')"))
m('O7','3036',SRV,'le plus ancien passe avant le co-hôte',sub("ORDER BY p.grade DESC, p.entre, p.uid LIMIT 1`).get(id, uid, a.reunion)","ORDER BY p.entre, p.uid LIMIT 1`).get(id, uid, a.reunion)"))
m('O8','3036',PAGE,'la phrase promet encore « une autre personne »',sub("'Tu organises cette réunion. Si tu pars, l\\'invité suivant dans la salle en devient l\\'organisateur, avec tous les gestes d\\'un hôte : exclure, verrouiller, régler la salle, mettre fin pour tout le monde. Tu peux aussi la terminer pour tous.'","'Tu es l\\'hôte de cette salle. Si tu pars, le rôle passe à une autre personne.'"))
m('O9','3036',SRV,'l\'intérim d\'avant s\'efface à moitié (l\'organisatrice jamais venue : le grade reste)',sub("        else Q(`UPDATE appel_part SET grade = 0 WHERE appel = ? AND uid <> ? AND grade = ?`).run(id, uid, GRADE_HOTE);","        else { /* retiré */ }"))
m('O10','3036',SRV,'plus de passation sans invité nommé (la règle d\'avant disparaît)',sub("        if (!s && !(a.genre === 'reunion' &&","        if (false && !s && !(a.genre === 'reunion' &&"))

def run(suite):
    r=subprocess.run(['node','tests/test-%s.js'%suite],cwd=ROOT,capture_output=True,text=True,timeout=300)
    out=r.stdout
    mm=re.findall(r'(\d+) ✓ +(\d+) ✗',out)
    return r.returncode, (mm[-1] if mm else None)
want=set(sys.argv[1:])
tot=0; mord=0; bad=[]
for id,suite,fichier,nom,f in M:
    if want and not any(id.startswith(w) for w in want): continue
    path=ROOT+'/'+fichier
    src=open(path,encoding='utf-8').read()
    new=f(src)
    if new is None or new==src:
        print('?? %s : motif introuvable (mal visée) — %s'%(id,nom)); bad.append(id); continue
    open(path,'w',encoding='utf-8').write(new)
    try:
        t=time.time()
        try: code,cnt=run(suite)
        except subprocess.TimeoutExpired: code,cnt=124,None
    finally:
        subprocess.run(['git','checkout','HEAD','--',fichier],cwd=ROOT,capture_output=True)
    tot+=1
    ok = code!=0 or (cnt and int(cnt[1])>0)
    if ok: mord+=1
    else: bad.append(id)
    print('%s %s test-%s : %s ✗=%s code=%s (%.0fs) — %s'%('MORD ' if ok else 'ÉCHAPPE', id, suite, '', cnt[1] if cnt else '?', code, time.time()-t, nom), flush=True)
st=subprocess.run(['git','status','--short'],cwd=ROOT,capture_output=True,text=True).stdout.strip()
print('\n%d mutations, %d mordent, à revoir : %s ; git status : %r'%(tot,mord,bad,st))
