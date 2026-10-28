/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR ET LES PAGES JURIDIQUES DISENT CE QUE LES ASSISTANTES FONT VRAIMENT (23 octobre 2026, cahier §3, §8, §9).
     Les VRAIES fonctions de `tour.html` (extraites du fichier livré), avec un réseau simulé qui note ce qui est envoyé :
       0. sous un brouillon, le contrôle qualité et l'authentification se DISENT (à revoir + raisons, non fait, passé ; expéditeur vérifié ou non) — jamais « passé » faute de savoir ;
       1. l'onglet « Courrier des agents » : trois états de lecture (jamais « aucune connaissance » sur une liste illisible), « Valider » envoie la question ET la réponse corrigées,
          une réponse vide n'envoie rien, une signature part avec son agent, un collaborateur ne change rien ;
       2. la confirmation d'envoi nomme la signature de l'AGENT, plus « du Courrier » ; la demande fermée « fin d'abonnement » a son libellé ;
       3. les pages : la règle « aucune période commencée n'est remboursée » remplace la mention À CONFIRMER (conditions générales, mentions légales) ; sous-traitance et registre
          déclarent chez Anthropic la réponse d'un prospect, la recherche web (nom de l'entreprise et métier, jamais une personne) et le contrôle qualité. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const plat = f => lire(f).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/'/g, '’');
const dormir = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('\n── 2909 · la Tour et les pages juridiques ──');
  const T = lire('tour.html');
  const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
  const NOMS = ['esc', 'acSquel', 'agIllisible', 'agBrCtrl', 'agCourCharger', 'agSigEnreg', 'agCnDecider', 'agCnAjouter', 'agCourVue', 'agDecider'];
  const FN = NOMS.map(n => corps(T, 'function ' + n + '('));
  v('(population) les dix fonctions sont trouvées dans le fichier livré', FN.filter(f => f.length > 40).length, 10);
  const iA = T.indexOf('var AG={'), jA = T.indexOf('};\nvar AG_MODES', iA), AGSRC = T.slice(iA, jA + 2);
  const TYPES = (/var AG_TYPES=\{[\s\S]*?\};/.exec(T) || [''])[0];
  vrai('(population) l’état `cour` et la table des types sont trouvés', /cour:\{sigLec:0/.test(AGSRC) && TYPES.length > 50);
  const envois = [], toasts = [], confirms = [];
  let reponses = {}, doms = {};
  const dom = id => doms[id] || (doms[id] = { value: '' });
  const bac = { document: { getElementById: dom }, INJOIGNABLE: 'injoignable', MYROLE: 'patron', TAB: 'agents', render() {}, toast(t) { toasts.push(String(t)); }, confirm(t) { confirms.push(String(t)); return true; },
    Promise, JSON, String, Array, Object, apiGet(u) { const r = reponses[u]; return Promise.resolve(r === undefined ? null : r); }, apiPost(u, b) { envois.push({ u, b }); return Promise.resolve({ ok: true, d: {} }); } };
  vm.createContext(bac);
  vm.runInContext(AGSRC + '\n' + TYPES + '\n' + FN.join('\n') + '\nthis.AG=AG;this.AG_TYPES=AG_TYPES;' + NOMS.filter(n => n !== 'esc').map(n => 'this.' + n + '=' + n + ';').join('') + 'this.esc=esc;', bac);
  const AG = bac.AG;
  const txt = h => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  console.log('\n0. Le contrôle qualité et l’authentification sous un brouillon');
  const base = { source: 'courrier', authentifie: true, controle: { etat: 'bon', fautes: [], juge: 'ok', reecrit: false } };
  let h = bac.agBrCtrl(base);
  vrai('passé + expéditeur vérifié', /Contrôle qualité passé/.test(txt(h)) && /Expéditeur vérifié/.test(txt(h)) && !/revoir/.test(h), txt(h));
  h = bac.agBrCtrl({ source: 'courrier', authentifie: false, controle: { etat: 'a_revoir', fautes: ['Le courriel promet la gratuité.', 'Aucune question.'], reecrit: true } });
  vrai('⛔ à revoir : les raisons sont listées (2 puces), « déjà réécrit », et l’expéditeur non vérifié ne partira jamais seul', /À revoir/.test(txt(h)) && (h.match(/<li>/g) || []).length === 2 && /réécrit une fois/.test(txt(h)) && /non vérifié/.test(txt(h)) && /jamais seul/.test(txt(h)) && /class="ag-ctrl revoir"/.test(h), txt(h));
  h = bac.agBrCtrl({ source: 'courrier', authentifie: true, controle: { etat: 'non_verifie', fautes: [] } });
  vrai('⛔ non vérifié : « Contrôle qualité non fait », jamais « passé »', /non fait/.test(txt(h)) && !/passé/.test(txt(h)), txt(h));
  h = bac.agBrCtrl({ source: 'inscription', authentifie: false, controle: { etat: 'bon', fautes: [] } });
  vrai('une inscription ne montre pas d’authentification d’expéditeur (il n’y en a pas)', !/Expéditeur/.test(txt(h)), txt(h));
  h = bac.agBrCtrl({ source: 'courrier', authentifie: true });
  vrai('(robustesse) un brouillon sans `controle` (serveur d’avant) : aucune exception, aucune fausse assurance', !/passé/.test(txt(h)), txt(h));
  h = bac.agBrCtrl({ source: 'proposition', authentifie: true, controle: { etat: 'a_revoir', fautes: ['<img src=x onerror=alert(1)>'] } });
  vrai('⛔ une raison est ÉCHAPPÉE (un texte venu du serveur ne devient jamais du balisage)', !/<img/.test(h) && /&lt;img/.test(h), h);

  console.log('\n1. L’onglet « Courrier des agents »');
  AG.cour.sigLec = -1; AG.cour.conLec = -1;
  h = bac.agCourVue();
  vrai('⛔ lectures impossibles : la page le DIT (pas de « aucune connaissance »)', /n’ont pas pu être lues/.test(txt(h)) && !/Aucune connaissance validée/.test(txt(h)) && !/Aucune proposition/.test(txt(h)), txt(h).slice(0, 300));
  AG.cour.sigLec = 1; AG.cour.sig = { equipe: 'Équipe TeamOP', agents: [{ agent: 'lea', nom: 'Léa', role: 'Assistante virtuelle', apercu: 'Léa — Assistante de TeamOP' }, { agent: 'louis', nom: 'Louis', role: 'x', apercu: '' }] };
  AG.cour.conLec = 1; AG.cour.con = [{ id: 'cn00000001', question: 'Peut-on exporter en PDF ?', reponse: '', etat: 'propose' }, { id: 'cn00000003', question: 'Les devis partent-ils en PDF ?', reponse: 'Oui.', etat: 'valide', decidePar: 'Justin' }];
  h = bac.agCourVue();
  vrai('(population) une signature (Louis n’en a pas), une proposition sans réponse (dite), une validée, le formulaire d’ajout', (h.match(/id="ag-sig-lea"/g) || []).length === 1 && !/id="ag-sig-louis"/.test(h) && /écris-la/.test(txt(h)) && /Les devis partent-ils/.test(txt(h)) && /id="ag-cn-nq"/.test(h), txt(h).slice(0, 200));
  vrai('un patron : champs et boutons actifs', !/disabled/.test(h));
  bac.MYROLE = 'collaborateur';
  vrai('⛔ un collaborateur : tout est désactivé', (bac.agCourVue().match(/disabled/g) || []).length >= 6);
  envois.length = 0; bac.agSigEnreg('lea'); bac.agCnDecider('cn00000001', 'valider'); bac.agCnAjouter();
  v('⛔ …et rien ne part de sa part', envois.length, 0);
  bac.MYROLE = 'patron';
  dom('ag-cn-q-cn00000001').value = ' Peut-on exporter ses factures en PDF ? '; dom('ag-cn-r-cn00000001').value = '';
  envois.length = 0; toasts.length = 0; bac.agCnDecider('cn00000001', 'valider');
  v('⛔ « Valider » sans réponse : rien n’est envoyé, la page le dit', [envois.length, /Écris la réponse/.test(toasts.join())], [0, true]);
  dom('ag-cn-r-cn00000001').value = 'Oui, par courriel.'; AG.busy = false;
  bac.agCnDecider('cn00000001', 'valider'); await dormir(20);
  v('« Valider » envoie la décision, l’identifiant, la question et la réponse CORRIGÉES (rognées)', envois[0], { u: '/api/monitor/agents/connaissances/decider', b: { id: 'cn00000001', decision: 'valider', question: 'Peut-on exporter ses factures en PDF ?', reponse: 'Oui, par courriel.' } });
  vrai('…après une confirmation qui dit que les trois assistantes la liront', /Léa, Camille et Chloé/.test(confirms.join('|')));
  AG.busy = false; envois.length = 0; bac.agCnDecider('cn00000003', 'retirer'); await dormir(20);
  v('« Retirer » : la décision seule, après confirmation', [envois[0] && envois[0].b, /Retirer/.test(confirms[confirms.length - 1])], [{ id: 'cn00000003', decision: 'retirer' }, true]);
  AG.busy = false; envois.length = 0; dom('ag-sig-lea').value = ' Conseillère virtuelle '; bac.agSigEnreg('lea'); await dormir(20);
  v('une signature part avec son agent et son rôle', envois[0], { u: '/api/monitor/agents/signatures', b: { agent: 'lea', role: 'Conseillère virtuelle' } });
  AG.busy = false; envois.length = 0; dom('ag-sig-equipe').value = 'Équipe TeamOP'; bac.agSigEnreg('equipe'); await dormir(20);
  v('le nom de l’équipe part seul', envois[0] && envois[0].b, { equipe: 'Équipe TeamOP' });
  AG.busy = false; envois.length = 0; dom('ag-cn-nq').value = 'Gérez-vous les licences ?'; dom('ag-cn-nr').value = 'Non.'; bac.agCnAjouter(); await dormir(20);
  v('« Ajouter » : la décision « ajouter » avec la question et la réponse', envois[0] && envois[0].b, { decision: 'ajouter', question: 'Gérez-vous les licences ?', reponse: 'Non.' });

  console.log('\n2. Les libellés et la confirmation d’envoi');
  vrai('la demande fermée « fin d’abonnement » a son libellé', /resilier_fin_periode:'Programmer une fin d’abonnement'/.test(TYPES));
  const dec = corps(T, 'function agDecider(');
  vrai('⛔ la confirmation d’envoi nomme la signature de l’AGENT, plus « du Courrier »', /signature de l’agent/.test(dec) && !/signature du Courrier/.test(dec));

  console.log('\n3. Les pages');
  const CG = lire('server/contrats-textes/conditions_generales.txt');
  vrai('⛔ les conditions générales : la mention À CONFIRMER du remboursement est tranchée', !/À CONFIRMER : non-remboursement/.test(CG) && /Aucune période commencée n'est remboursée/.test(CG) && /doit résilier son abonnement/.test(CG));
  const ML = plat('mentions-legales.html');
  vrai('mentions légales : la même règle, dite aux clients', /Aucune période commencée n’est remboursée/.test(ML) && /doit résilier son abonnement/.test(ML));
  for (const f of ['sous-traitance.html', 'registre-traitements.html', 'apercu/sous-traitance.html', 'apercu/registre-traitements.html']) {
    const P = plat(f), i = P.indexOf('Anthropic PBC'), L = i >= 0 ? P.slice(i, i + 3800) : '';
    vrai('⛔ ' + f + ' : la réponse d’un prospect, la recherche web (entreprise et métier, jamais une personne) et le contrôle qualité sont déclarés',
      /réponse d’un prospect/.test(L) && /recherche sur le web/.test(L) && /nom de l’entreprise et le métier/.test(L) && /jamais le nom d’une personne/.test(L) && /contrôle qualité/.test(L), L.slice(0, 120));
  }
  /* ⛔ Relecture du 23 octobre 2026 : Louis envoie à Claude le texte d'une question de client et l'avant/après d'un de NOS courriels corrigés — ce flux n'était déclaré nulle part ; et le « nom de
     l'entreprise » de la recherche web peut être le nom d'une personne (entreprise individuelle) : « jamais le nom d'une personne » était trop absolu. */
  for (const f of ['sous-traitance.html', 'registre-traitements.html', 'apercu/sous-traitance.html', 'apercu/registre-traitements.html']) {
    const P = plat(f), i = P.indexOf('Anthropic PBC'), L = i >= 0 ? P.slice(i, i + 5200) : '';
    vrai('⛔ ' + f + ' : la base de connaissances de Louis est déclarée (question de client restée sans réponse, courriel avant et après correction, validation par l’éditeur)',
      /base de connaissances/.test(L) && /question[^;]{0,120}pas su répondre|question de client restée sans réponse/.test(L) && /avant et après (?:sa )?correction/.test(L) && /(?:relue|relit) et valide|(?:relue|relit) (?:et validée|par l’éditeur)|valide/.test(L), L.slice(0, 120));
    vrai('⛔ …et la recherche web nuance « jamais le nom d’une personne » pour une entreprise individuelle', /jamais le nom d’une personne \(sauf lorsque l’entreprise porte elle-même ce nom, comme une entreprise individuelle/.test(L), L.slice(0, 120));
  }
  vrai('l’aperçu de mentions-legales.html est à jour (la règle y est aussi)', /Aucune période commencée n’est remboursée/.test(plat('apercu/mentions-legales.html')));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
