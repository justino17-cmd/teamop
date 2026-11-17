// SONDE « rôles et pont » : qui voit l'atelier (patron, gestion, technicien), ce qui arrive quand le rôle change pendant qu'il est ouvert, et le pont lui-même : messages forgés (par la page,
// par une autre fenêtre), contenus hostiles (HTML dans un nom, « __proto__ », bornes, formes fausses) dans les DEUX sens. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const sib = (p, code) => p.evaluate(c => new Promise(ok => { const i = document.createElement('iframe'); i.style.display = 'none'; i.srcdoc = '<script>' + c + '<\/script>'; i.onload = () => setTimeout(() => { i.remove(); ok(); }, 120); document.body.appendChild(i); }), code);
const ecoute = p => p.evaluate(() => { window.__fermes = []; addEventListener('message', e => { if (e.data && e.data.opd_fermer) window.__fermes.push(e.data.opd_fermer.motif); }); });
(async () => {
  // ═════ A. LES RÔLES ═════
  let c = await L.ouvrir({ profil: 'mac', qui: 'julie' }), p = c.p;
  for (const [page, sel] of [['devis', '[data-opd="devis"]'], ['contrats', '[data-opd="contrat"]'], ['client-x-vp', '[data-opd="devis"][data-cli="vp"]'], ['client-x-vp', '[data-opd="contrat"][data-cli="vp"]']]) { await L.aller(p, page); v('gestion (Julie) : « ' + sel + ' » est sur ' + page, await p.locator('#contenu ' + sel).count() >= 1); }
  const fj = await A.ouvrirAtelier(c, 'devis', 'devis'); v('gestion : l\'atelier s\'ouvre', !!fj);
  v('gestion : le cadre a reçu rôle (devis et contrats vrais)', !!fj && await fj.evaluate(() => OPG.role.devis === true && OPG.role.contrats === true), fj && await fj.evaluate(() => OPG.role));
  await L.fin(c);
  c = await L.ouvrir({ profil: 'mac', qui: 'sm' }); p = c.p;
  const st = await L.etat(p); v('technicien (Sophie) : il arrive sur SA journée', /journée/i.test(st.h1) || /majournee/.test(st.hash), st);
  await p.evaluate(() => { location.hash = 'devis'; }); await L.calme(p, 600);
  const st2 = await L.etat(p); v('technicien : « #devis » tapé à la main le ramène chez lui (pas la rubrique Devis)', !/^Devis$/.test(st2.h1) && st2.hash !== '#devis', st2);
  let tot = 0; for (const h of ['majournee', 'techfrais', 'registre']) { await p.evaluate(x => { location.hash = x; }, h); await L.calme(p, 400); tot += await p.locator('[data-opd]').count(); }
  v('technicien : aucun bouton de l\'atelier sur ses écrans (3 écrans comptés)', tot === 0, tot);
  await p.evaluate(() => opdOuvrir('devis', {})); await L.calme(p, 300);
  v('technicien : l\'appel direct est refusé (toast) et AUCUN cadre n\'est créé', (await p.evaluate(() => !document.getElementById('opdz'))) && /pas ouvert à ton compte : composer un devis/.test((await L.etat(p)).toast)   /* « Les mots (1/n) », f5d88883 : le refus ne dit plus « rôle » mais « Ce geste n’est pas ouvert à ton compte : composer un devis. » */, await L.etat(p));
  await L.fin(c);
  // ═════ B. UN RÔLE QUI CHANGE PENDANT QUE L'ATELIER EST OUVERT ═════
  c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); p = c.p; await ecoute(p);
  let f = await A.ouvrirAtelier(c, 'devis', 'devis'); v('patron : l\'atelier s\'ouvre', !!f);
  // Le chemin RÉEL d'un changement de personne est la session (sessionOuvrir pose SESSION puis appelle rlChanger) : depuis b8b6b92a (« Droits d'Équipe
  // qui agissent ») les droits se lisent sur acteur() = la personne connectée, et rlChanger('tech') seul ne change plus rien en mode application (la bande
  // « Tester en tant que » n'y existe pas). La sonde rejoue donc la vraie ouverture de session de Sophie.
  await p.evaluate(() => { sessionOuvrir('sm'); }); await p.waitForTimeout(700);   // sans sessionFermer : « Ouvrir comme » passe d'une personne à l'autre sans déconnexion, et c'est le crochet de rlChanger qui retire l'atelier (la déconnexion, elle, le ferme par la liste des fenêtres, ligne « atelier » du registre)
  v('population : la personne connectée est bien Sophie (technicienne), pas Marc', await p.evaluate(() => SESSION === 'sm' && !rlPermis('devis')));
  v('le rôle devient technicien : l\'atelier se ferme tout seul (pas un cadre ouvert pour qui n\'y a pas droit)', (await L.etat(p)).atelier === false);
  v('le rôle devient technicien : le CADRE de l\'atelier est retiré (il porterait les documents et les clients de la personne d\'avant)', await p.evaluate(() => !document.getElementById('opdz')));
  await p.evaluate(() => { sessionFermer('deconnexion'); sessionOuvrir('marc'); rlChanger('patron', { muet: true, h: 'devis' }); }); await L.calme(p, 500);   // Marc se reconnecte, comme une personne
  // l'atelier lui-même refuse sans le booléen à vrai
  f = await A.ouvrirAtelier(c, 'devis', 'devis'); await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(700);
  await p.evaluate(() => { window.__fermes.length = 0; const w = document.querySelector('#opdz iframe').contentWindow; w.postMessage({ opd_role: { role: 'x', devis: 'true', contrats: 1 } }, '*'); w.postMessage({ opd_ouvrir: { faire: 'devis' } }, '*'); }); await p.waitForTimeout(700);
  v('l\'atelier refuse d\'ouvrir sans le booléen STRICT (« true » en texte, 1 : refusés) et dit « role »', await p.evaluate(() => window.__fermes.includes('role')) && !(await f.evaluate(() => !!document.querySelector('.voile'))), await p.evaluate(() => window.__fermes));
  await p.evaluate(() => { document.querySelector('#opdz iframe').contentWindow.postMessage({ opd_role: { role: 'patron', devis: true, contrats: true } }, '*'); });
  // ═════ C. MESSAGES FORGÉS VERS LE PROTOTYPE ═════
  const avant = await p.evaluate(() => ({ docs: JSON.stringify(ATD.docs), cl: Object.keys(CLIENTS).length }));
  await p.evaluate(() => window.postMessage({ opd_docs: [{ id: 'forge1', type: 'devis', etat: 'brouillon', nom: 'FORGÉ', maj: Date.now() }], opd_client: { id: 'forge1', nom: 'FORGÉ' }, opd_fermer: { motif: 'fin' } }, '*')); await p.waitForTimeout(300);
  v('un message posté par la PAGE elle-même est ignoré (source ≠ cadre)', (await p.evaluate(() => JSON.stringify(ATD.docs))) === avant.docs && (await p.evaluate(() => Object.keys(CLIENTS).length)) === avant.cl);
  await sib(p, `parent.postMessage({opd_docs:[{id:'forge2',type:'devis',etat:'brouillon',nom:'FORGÉ 2',maj:${Date.now()}}],opd_client:{id:'forge2',nom:'FORGÉ 2'},opd_fermer:{motif:'fin'}},'*')`);
  v('un message d\'une AUTRE fenêtre (cadre voisin) est ignoré : ni liste, ni client, ni fermeture', (await p.evaluate(() => JSON.stringify(ATD.docs))) === avant.docs && (await p.evaluate(() => !('forge2' in CLIENTS))));
  await sib(p, `var w=parent.document.querySelector('#opdz iframe').contentWindow; w.postMessage({opd_ouvrir:{faire:'devis'}},'*'); w.postMessage({opd_donnees:{clients:[{id:'forge3',nom:'FORGÉ 3'}]}},'*');`); await p.waitForTimeout(500);
  v('un message d\'une autre fenêtre VERS l\'atelier est ignoré (aucune fenêtre ouverte, aucun client forgé)', !(await f.evaluate(() => !!document.querySelector('.voile') || S.clients.some(x => x.id === 'forge3'))));
  // ═════ D. CE QU'UN ATELIER LÉGITIME PEUT ENVOYER DE HOSTILE ═════
  await f.evaluate(() => {
    opdPoster({ opd_client: { id: 'xss1', nom: '<img src=x onerror=window.__pwn=1>', pro: true, adresse: '1 rue "x" <b>', cp: '17000', ville: 'La Rochelle', email: 'a"onmouseover="window.__pwn=1@x.fr', tel: '06"onclick="window.__pwn=1' } });
    opdPoster({ opd_client: { id: '__proto__', nom: 'Pwn proto' } }); opdPoster({ opd_client: { id: 'constructor', nom: 'Pwn ctor' } }); opdPoster({ opd_client: { id: 'a b', nom: 'Espace' } }); opdPoster({ opd_client: { id: 'ok2', nom: '' } });
    opdPoster({ opd_client: { id: 'x'.repeat(60), nom: 'Trop long' } }); opdPoster({ opd_client: 'chaine' }); opdPoster({ opd_client: [1, 2] }); opdPoster({ opd_client: null });
  }); await p.waitForTimeout(400);
  const H = await p.evaluate(() => ({ proto: Object.getPrototypeOf(CLIENTS) === Object.prototype, pollue: ({}).nom !== undefined, hasProto: Object.prototype.hasOwnProperty.call(CLIENTS, '__proto__'), ctor: Object.prototype.hasOwnProperty.call(CLIENTS, 'constructor'), xss: !!CLIENTS.xss1, mauvais: ['a b', 'ok2'].some(k => k in CLIENTS) || Object.keys(CLIENTS).some(k => k.length > 40), n: Object.keys(CLIENTS).length }));
  v('« __proto__ » et « constructor » comme identifiants : refusés, le prototype n\'est pas touché', H.proto && !H.pollue && !H.hasProto && !H.ctor, H);
  v('identifiants invalides (espace, nom vide, > 40 signes) et formes fausses : écartés', !H.mauvais, H);
  v('population : le client au nom hostile, lui, est bien ajouté (texte brut)', H.xss, H);
  const fiche = await (async () => { await L.aller(p, 'client-x-xss1'); return p.evaluate(() => ({ h1: document.querySelector('#contenu h1') && document.querySelector('#contenu h1').textContent, img: !!document.querySelector('#contenu img[src="x"]'), pwn: window.__pwn, ancres: [...document.querySelectorAll('#contenu a[href^="mailto:"], #contenu a[href^="tel:"]')].map(a => [a.getAttribute('href'), [...a.attributes].map(x => x.name).join(',')]) })); })();
  v('HTML dans un nom : affiché en TEXTE dans la fiche (aucun <img> né, aucun script exécuté)', fiche.h1 === '<img src=x onerror=window.__pwn=1>' && !fiche.img && fiche.pwn === undefined, fiche);
  v('liens tel: et mailto: : aucun guillemet, aucun attribut injecté (onmouseover, onclick)', fiche.ancres.length >= 1 && fiche.ancres.every(a => !/["]/.test(a[0]) && !/on[a-z]+/.test(a[1])), fiche.ancres);
  await L.aller(p, 'clients'); const liste = await p.evaluate(() => ({ img: !!document.querySelector('#contenu img[src="x"]'), pwn: window.__pwn })); v('… et dans la liste des clients', !liste.img && liste.pwn === undefined, liste);
  f = await A.ouvrirAtelier(c, 'devis', 'devis');
  const dedans = await f.evaluate(() => ({ img: !!document.querySelector('img[src="x"]'), pwn: window.__pwn, nom: (S.clients.find(x => x.id === 'xss1') || {}).nom }));
  v('l\'atelier reçoit ce client en texte aussi (liste de composition sans <img> ni script)', dedans.nom === '<img src=x onerror=window.__pwn=1>' && !dedans.img && dedans.pwn === undefined, dedans);
  await f.locator('[data-fen-x]').first().click(); await p.waitForTimeout(700);
  // bornes de la liste de documents
  const gros = await f.evaluate(() => { const L2 = []; for (let i = 0; i < 600; i++) L2.push({ id: 'd' + i, type: i % 2 ? 'devis' : 'contrat', etat: ['brouillon', 'envoye', 'attente', 'signe'][i % 4], nom: 'N'.repeat(5000), numero: 'X'.repeat(300), client: 'C'.repeat(900), clientId: 'xss1', ttc: -5, prix: 1e15, maj: 9e15, nr: 1 });
    L2.unshift({ id: 'xssdoc', type: 'devis', etat: 'brouillon', nom: '<img src=x onerror=window.__pwn=2>', client: '<svg onload=window.__pwn=3>', numero: '<b>D</b>', maj: 1793000000000 });
    L2.unshift({ id: 'mauvais1', type: 'devis', etat: '__proto__', nom: 'x' }, { id: 'mauvais2', type: 'devis', etat: 'constructor', nom: 'x' }, { id: 'mauvais3', type: 'autre', etat: 'brouillon' }, { id: 'a b', type: 'devis', etat: 'signe' }, { id: 'bon', type: 'devis', etat: 'signe', ttc: 1234, maj: 1793000000000, nom: 'Bon' }, 7, null, 'x');
    opdPoster({ opd_docs: L2 }); opdPoster({ opd_docs: 'pas une liste' }); opdPoster({ opd_docs: { length: 3 } }); return L2.length; });
  await p.waitForTimeout(500);
  const B = await p.evaluate(() => ({ n: ATD.docs.length, long: Math.max(...ATD.docs.map(x => x.nom.length)), lnum: Math.max(...ATD.docs.map(x => x.numero.length)), lcl: Math.max(...ATD.docs.map(x => x.client.length)), ttcNeg: ATD.docs.some(x => x.ttc < 0), pxs: ATD.docs.some(x => x.prix > 1e11), maj: ATD.docs.filter(x => x.id !== 'bon' && x.id !== 'xssdoc').every(x => x.maj === 0), mauv: ATD.docs.some(x => /^mauvais|a b/.test(x.id)), bon: !!ATD.docs.find(x => x.id === 'bon' && x.ttc === 1234 && x.maj === 1793000000000) }));
  v('liste de documents : 500 au plus, textes bornés (120 / 30 / 120), montants hors bornes ramenés à 0, date folle à 0, états inconnus (« __proto__ ») et types faux écartés, un document sain gardé', B.n <= 500 && B.n >= 400 && B.long <= 120 && B.lnum <= 30 && B.lcl <= 120 && !B.ttcNeg && !B.pxs && B.maj && !B.mauv && B.bon, B);
  await L.aller(p, 'devis'); await L.toucher(c, '.seg [data-dvf="tous"]'); const rendu = await p.evaluate(() => ({ lignes: document.querySelectorAll('#contenu .opd-l').length, pwn: window.__pwn }));
  const xd = await p.evaluate(() => ({ img: !!document.querySelector('#contenu img[src="x"], #contenu svg[onload]'), txt: [...document.querySelectorAll('#contenu .opd-l')].some(e => e.innerText.includes('<svg onload')), pwn: window.__pwn }));
  v('HTML dans le nom et le client d\'un document de la liste : affiché en TEXTE (aucun élément né, aucun script)', xd.txt && !xd.img && xd.pwn === undefined, xd);
  v('la liste de 500 documents s\'affiche sans erreur ni script (devis seulement dans Devis)', rendu.lignes > 0 && rendu.pwn === undefined, rendu);
  // un e-mail saisi AVEC un guillemet dans la fiche client (le chemin d'avant l'atelier : « Infos » puis « Enregistrer ») : le lien ne fabrique aucun attribut
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '[data-oc="infos"]'); await p.locator('[data-ci="mail"]').fill('a"onmouseover="window.__pwn=9@x.fr'); await L.toucher(c, '[data-action="clientEnreg"]');
  const lm = await p.evaluate(() => ({ mail: CLIENTS.vp.mail, pwn: window.__pwn, ancres: [...document.querySelectorAll('#contenu a[href^="mailto:"], #contenu a[href^="tel:"]')].map(a => [a.getAttribute('href'), a.getAttributeNames().join(',')]) }));
  v('un e-mail saisi avec un guillemet n\'injecte aucun attribut dans le lien de la fiche (population ' + lm.ancres.length + ' liens)', lm.mail.includes('"') && lm.ancres.length >= 2 && lm.ancres.every(a => a[1].split(',').sort().join(',') === 'class,href') && lm.pwn === undefined, lm);      // la mauvaise adresse est BIEN enregistrée (population), et le lien n'en tire aucun attribut
  await p.evaluate(() => { CLIENTS.vp.mail = 'marc@vieuxport.fr'; CLIENTS.vp.tel = '06 12 34 56 78'; });
  // ═════ E. CE QU'UN PROTOTYPE HOSTILE PEUT ENVOYER À L'ATELIER ═════
  await p.evaluate(() => { const w = document.querySelector('#opdz iframe').contentWindow, cl = []; for (let i = 0; i < 600; i++) cl.push({ id: 'k' + i, nom: 'Client ' + i, pro: 'oui', adresse: 'A'.repeat(500), contact: 'C'.repeat(500) }); cl.unshift({ id: 'a b', nom: 'x' }, { id: '__proto__', nom: 'p' }, { id: 'v', nom: '' }, 5, null);
    const cat = []; for (let i = 0; i < 500; i++) cat.push({ ref: 'R' + i, des: 'D'.repeat(1000), unite: 'u', puC: 100 + i, tvaBp: 2000, cat: 'X' });
    cat.unshift({ ref: 'neg', des: 'neg', puC: -5, tvaBp: 2000 }, { ref: 'flo', des: 'flo', puC: 12.5, tvaBp: 2000 }, { ref: 'gros', des: 'gros', puC: 1e10, tvaBp: 2000 }, { ref: 'str', des: 'str', puC: '100', tvaBp: 2000 }, { ref: 'nan', des: 'nan', puC: NaN, tvaBp: 2000 }, { ref: 'tva', des: 'tva', puC: 100, tvaBp: 20000 }, { ref: 'R0', des: 'doublon', puC: 1, tvaBp: 0 }, { ref: '__proto__', des: 'proto', puC: 100, tvaBp: 2000 });
    w.postMessage({ opd_donnees: { entreprise: [1, 2], clients: cl, catalogue: cat, numeros: { devis: { prefixe: '(.*)+', dernier: -1 }, contrat: { prefixe: 'CTR-', dernier: 1e12 } } } }, '*');
    w.postMessage({ opd_donnees: 'chaine' }, '*'); w.postMessage({ opd_donnees: null }, '*'); w.postMessage([1, 2, 3], '*'); w.postMessage('texte', '*'); w.postMessage({ opd_mode: 'rouge' }, '*'); w.postMessage({ opd_mode: { a: 1 } }, '*'); w.postMessage({ opd_ouvrir: 'x' }, '*'); w.postMessage({ opd_ouvrir: { faire: 'doc', id: { toString: 1 } } }, '*'); }); await p.waitForTimeout(600);
  const E = await f.evaluate(() => ({ cl: S.clients.length, locaux: S.clients.filter(x => x.local).length, mauvais: S.clients.some(x => /^(a b|__proto__|v)$/.test(x.id)), pro: S.clients.filter(x => x.pro).length, adr: Math.max(...S.clients.map(x => x.adresse.length)), ct: Math.max(...S.clients.map(x => (x.contact || '').length)), cat: CATALOGUE.length, des: Math.max(...CATALOGUE.map(a => a.des.length)), refs: CATALOGUE.map(a => a.ref), nums: OPG.numeros, theme: document.documentElement.getAttribute('data-theme') }));
  v('clients hostiles : 500 au plus, identifiants et noms invalides écartés, « pro: "oui" » n\'est pas vrai, textes bornés (120)', E.cl <= 500 + E.locaux && E.cl >= 400 && !E.mauvais && E.pro === 0 && E.adr <= 120 && E.ct <= 80, E);
  v('catalogue hostile : 400 au plus, « __proto__ » en référence, prix négatif / décimal / texte / NaN / > 1e9 / TVA > 100 % / doublon écartés, désignation bornée (200)', E.cat <= 400 && E.des <= 200 && !E.refs.some(r => /^(neg|flo|gros|str|nan|tva|__proto__)$/.test(r)) && E.refs.filter(r => r === 'R0').length === 1, [E.cat, E.des, E.refs.length]);
  v('numéros hostiles (préfixe à motif, dernier négatif ou énorme) : refusés, les bons numéros restent', E.nums.devis.prefixe === 'D-2026-' && E.nums.contrat.dernier < 1e7, E.nums);
  v('mode inconnu ignoré (le thème reste « light »)', E.theme === 'light', E.theme);
  v('le cadre vit encore et sait composer un devis après ces messages (la fenêtre s\'ouvre)', await (async () => { await L.aller(p, 'devis'); const g = await A.ouvrirAtelier(c, 'devis', null); return !!g; })());
  v('aucune erreur de page (ni dans le prototype, ni dans le cadre)', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
