#!/usr/bin/env python3
# Les mutations qui éprouvent les bancs 3200 à 3203 (30 octobre 2026).
# ⛔ À lancer APRÈS `git commit` du correctif et du banc : le fichier muté est restauré par ce script (contenu d'origine gardé en mémoire),
# mais `git status` doit être propre avant, et `git diff` vide après (règle de CLAUDE.md : un lot interrompu peut laisser une mutation).
import subprocess, sys, os, concurrent.futures as cf
R = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SUITES = ['tests/test-3200.js', 'tests/test-3201.js', 'tests/test-3202.js', 'tests/test-3203.js', 'tests/test-3204.js']
M = [
 ('M01 interrupteur ignoré', 'server/agents-travail.js', "const actif = id => interrupteur.has(id) && !!cerveau", "const actif = id => !!cerveau"),
 ('M02 conclusion sans tool_choice none', 'server/agents-travail.js', "pasDOutil: conclure && etape > 0,", "pasDOutil: false,"),
 ('M03 coût non borné', 'server/agents-travail.js', "const conclure = !defs.length || etape >= maxEtapes || cout >= coutMax;", "const conclure = !defs.length || etape >= maxEtapes;"),
 ('M04 étapes non bornées', 'server/agents-travail.js', "const conclure = !defs.length || etape >= maxEtapes || cout >= coutMax;", "const conclure = !defs.length || cout >= coutMax;"),
 ('M05 résultat d\'outil non borné', 'server/agents-travail.js', "texte = borne(texte, RESULTAT_MAX);", "texte = String(texte);"),
 ('M06 mauvais identifiant de résultat', 'server/agents-travail.js', "tool_use_id: b.id,", "tool_use_id: b.name,"),
 ('M07 blocs bruts jetés', 'server/agents-travail.js', "const contenu = Array.isArray(r.contenu) && r.contenu.length ? r.contenu\n        : ", "const contenu = "),
 ('M08 cinq rédactions', 'server/agents-travail.js', "const TOURS_REDACTION = 3;", "const TOURS_REDACTION = 5;"),
 ('M09 grille indisponible = bon', 'server/agents-travail.js', "return { etat: 'non_verifie', objet: lu.objet, corps: c.corps, fautes: [], juge: false, raison: 'grille indisponible", "return { etat: 'bon', objet: lu.objet, corps: c.corps, fautes: [], juge: true, raison: 'grille indisponible"),
 ('M10 seuil minimal à 1', 'server/agents-grille.js', "const SEUIL = { min: 3, moyenne: 4.0 };", "const SEUIL = { min: 1, moyenne: 4.0 };"),
 ('M11 moyenne ignorée', 'server/agents-grille.js', "if (!fautes.length && moyenne < SEUIL.moyenne) {", "if (false && moyenne < SEUIL.moyenne) {"),
 ('M12 question citée non exigée', 'server/agents-grille.js', "c.id === 'repond_a_tout' && lu.sansReponse && lu.sansReponse.length) bloque = true;", "c.id === 'repond_a_tout') bloque = true;"),
 ('M13 fragment non vérifié', 'server/agents-grille.js', "return p.length >= 10 && plat(source).includes(p) ? t.slice(0, 240) : '';", "return p.length >= 10 ? t.slice(0, 240) : '';"),
 ('M14 note dédoublée acceptée', 'server/agents-grille.js', "if (!JUGES.includes(id) || Object.prototype.hasOwnProperty.call(notes, id)) return", "if (!JUGES.includes(id)) return"),
 ('M15 dossier toujours présent', 'server/agents-grille.js', "notes.dossier = String(o.corps || '').toUpperCase().includes(dossier) ? 5 : 1;", "notes.dossier = 5;"),
 ('M16 fiche sans authentification', 'server/agents-outils-lecture.js', "if (c.authentifie !== true) return json({ authentifie: false, consigne: 'expéditeur non authentifié : ne communique et n’affirme AUCUN fait de compte' });", ""),
 ('M17 dossier hors forme lu', 'server/agents-outils-lecture.js', "const dossier = typeof c.dossier === 'string' && /^DOS-\\d{6}$/.test(c.dossier) ? c.dossier : '';", "const dossier = typeof c.dossier === 'string' ? c.dossier : '';"),
 ('M18 Margaux plusieurs fois', 'server/agents-outils-lecture.js', "if (c.margauxDemandee) return json({ deja_demande: true, reponse: c.margauxDemandee });", ""),
 ('M19 modèle par agent ignoré', 'server/cerveau.js', "const modeleDe = id => (Object.prototype.hasOwnProperty.call(modeles, id) ? modeles[id] : MODELE_DEFAUT);", "const modeleDe = id => MODELE_DEFAUT;"),
 ('M20 modèle inconnu au tarif bas', 'server/cerveau.js', "[Math.max(...Object.values(TARIFS_ESTIMES).map(x => x[0])), Math.max(...Object.values(TARIFS_ESTIMES).map(x => x[1]))]", "[Math.min(...Object.values(TARIFS_ESTIMES).map(x => x[0])), Math.min(...Object.values(TARIFS_ESTIMES).map(x => x[1]))]"),
 ('M21 jetons du mode travail', 'server/cerveau.js', "const MAX_TOKENS_TRAVAIL = 6000,", "const MAX_TOKENS_TRAVAIL = 600,"),
 ('M22 budget du mois sans borne haute', 'server/cerveau.js', "ctx.budgetMois >= 1 && ctx.budgetMois <= 2000", "ctx.budgetMois >= 1"),
 ('M23 délai du mode travail', 'server/cerveau.js', "{ timeoutMs: travail ? TIMEOUT_TRAVAIL_MS : TIMEOUT_MS }", "{ timeoutMs: TIMEOUT_MS }"),
 ('M24 camille : interrupteur ignoré', 'server/agent-camille.js', "const travailActif = () => !!(T && OL && T.actif(ID));", "const travailActif = () => !!(T && OL);"),
 ('M25 camille : ouverture hors validation', 'server/agent-camille.js', "forceValidation: !!ouvB });", "forceValidation: false });"),
 ('M26 camille : accusé fautif gardé', 'server/agent-camille.js', "|| (res.etat === 'a_revoir' && !res.notes)) { agents.noter(ID, 'mode travail', { cible: 'courrier', resultat: 'refuse', detail: 'accusé", ") { agents.noter(ID, 'mode travail', { cible: 'courrier', resultat: 'refuse', detail: 'accusé"),
 ('M27 camille : dossier donné à un inconnu', 'server/agent-camille.js', "const dosT = travail && m.authentifie === true ? dossierDe(a) : '';", "const dosT = travail ? dossierDe(a) : '';"),
 ('M28 camille : mot réservé dans l\'ouverture', 'server/agent-camille.js', "|| /rembours|r[ée]sili|abonnement|arr[êe]t/i.test(", "|| /ZZZ/i.test("),
 ('M29 camille : ouverture résiliation hors validation', 'server/agent-camille.js', "forceValidation: !!ouvR });", "forceValidation: false });"),
 ('M30 camille : plus de repli sur l\'appel simple', 'server/agent-camille.js', "['etapes', 'vide', 'erreur_api', 'trop_long', 'requete', 'erreur'].includes(r.raison)", "false"),
 ('M31 margaux : mots réservés', 'server/agent-margaux.js', "if (RESERVE.test(", "if (false && RESERVE.test("),
 ('M32 margaux : à revoir envoyée seule', 'server/agent-margaux.js', "validation: !!aRevoirT, aRevoirT });", "validation: false, aRevoirT: '' });"),
 ('M33 margaux : relance fautive gardée', 'server/agent-margaux.js', "|| (res.etat === 'a_revoir' && !res.notes)) {", ") {"),
 ('M34 margaux : demandeur quelconque', 'server/agent-margaux.js', "|| o.de !== 'camille') return { ok: false, raison: 'forme' };", ") return { ok: false, raison: 'forme' };"),
 ('M35 ops : indemnité à la première relance', 'server/agents-courriers-ops.js', "const suite = d.etape === 7 ? [PARAGRAPHE_INDEMNITE", "const suite = true ? [PARAGRAPHE_INDEMNITE"),
 ('M36 ops : 40 € autorisé partout', 'server/agents-courriers-ops.js', "concat(d.etape === 7 ? [INDEMNITE_RECOUVREMENT_EUR] : [])", "concat([INDEMNITE_RECOUVREMENT_EUR])"),
 ('M37 léa : repli perdu', 'server/agent-lea.js', "const travailLea = enTravail && premierTravail !== null;", "const travailLea = enTravail;"),
 ('M38 documents : à revoir ignoré', 'server/agents-documents.js', "|| (typeof o.aRevoirT === 'string' ? o.aRevoirT.replace(/[\\r\\n]+/g, ' ').slice(0, 200) : '');", ";"),
 ('M39 tâche question_facture retirée', 'server/agents.js', "'choix_creneau', 'question_facture'];", "'choix_creneau'];"),
 ('M41 rejeu : sans accord', 'server/outils/evaluation-travail/rejouer.js', "if (!OUI) {", "if (false) {"),
 ('M42 rejeu : sans plafond', 'server/outils/evaluation-travail/rejouer.js', "if (est > BUDGET) {", "if (false) {"),
 ('M43 rejeu : clé de l\'environnement', 'server/outils/evaluation-travail/rejouer.js', "return { cle: typeof a.cleApi === 'string' ? a.cleApi : ''", "return { cle: process.env.ANTHROPIC_API_KEY || (typeof a.cleApi === 'string' ? a.cleApi : '')"),
 ('M44 camille : objet du client dans le contrôle de l\'ouverture', 'server/agent-camille.js', "CTRL.fautesDuCode('Votre message à TeamOP', 'Bonjour,", "CTRL.fautesDuCode(reponseObjet, 'Bonjour,"),
 ('M45 grille : le relecteur lit le lien de paiement', 'server/agents-travail.js', "corps: c.corpsJuge || c.corps,", "corps: c.corps,"),
 ('M46 rapport : volume présenté comme mesuré', 'server/outils/evaluation-travail/rapport.js', "des hypothèses, à remplacer", "des mesures, à remplacer"),
 ('M40 code d\'abord : grille payée même si le code échoue', 'server/agents-travail.js', "if (c.etat === 'a_revoir') { codes = c.fautes;", "if (false) { codes = c.fautes;"),
]
def run(s):
    try:
        p = subprocess.run(['node', s], cwd=R, capture_output=True, text=True, timeout=240)
        return s, p.returncode
    except subprocess.TimeoutExpired:
        return s, 124
def main():
    only = sys.argv[1:]
    mordu, vivant = [], []
    for nom, f, a, b in M:
        if only and not any(nom.startswith(x) for x in only): continue
        p = os.path.join(R, f)
        orig = open(p, encoding='utf8').read()
        if orig.count(a) != 1:
            print('?? ', nom, ': motif introuvable ou multiple (', orig.count(a), ')'); vivant.append(nom + ' (motif)'); continue
        try:
            open(p, 'w', encoding='utf8').write(orig.replace(a, b))
            with cf.ThreadPoolExecutor(4) as ex: res = list(ex.map(run, SUITES))
        finally:
            open(p, 'w', encoding='utf8').write(orig)
        tombees = [s.split('-')[-1][:4] for s, c in res if c != 0]
        print(('MORD   ' if tombees else 'VIVANTE'), nom, '->', ','.join(tombees) or 'aucune suite ne tombe'); sys.stdout.flush()
        (mordu if tombees else vivant).append(nom)
    print('\n%d mutations, %d mordues, %d vivantes' % (len(mordu) + len(vivant), len(mordu), len(vivant)))
    for n in vivant: print('  vivante :', n)
main()
