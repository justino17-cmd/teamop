// RESTES DE LA SÉCURITÉ, tour 4 (19 novembre 2026) : ce que la saisie d'un client laisse passer ou coupe EN SILENCE.
//   1. consignes d'accès : champ multiligne, 3 lignes au plus, blancs réduits PAR LIGNE, signes de contrôle retirés (« 4821Sonner chez la gardienne » ne se range plus collé) ;
//   2. un plafond dépassé REFUSE avec une phrase (le champ et la limite) et n'enregistre RIEN — dans les cinq formulaires qui écrivent un client (fiche, devis, intervention,
//      « Nouveau client », devis xylophage), par UNE seule fonction (clientPlafondRefus) ; le plafond compte des SIGNES comme l'utilisateur (graphèmes), un saut de ligne vaut 1 ;
//   3. les champs sans maxlength (titre d'intervention, titre de créneau bloqué, nom de fournisseur local, rôle d'équipe ×2, nom de plateforme, motif, titre de la fenêtre de création)
//      portent un maxlength ET leur fonction d'enregistrement refuse avec une phrase ;
//   5. coupeSure coupe par graphèmes (drapeau, famille ZWJ, peau : jamais en deux).
// Frappe réelle (clavier) pour ce qui se tape ; ce qui dépasse un maxlength (texte collé par un script, e-mail reçu) est posé par la valeur du champ — c'est le seul moyen de le dépasser.
// Population comptée à chaque série. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(process.env.RACINE || path.join(__dirname, '../../..'), 'apercu/prototype-op-gestion.html'), 'utf8');
(async () => {
  const c = await L.ouvrir({ profil: 'petit', nuit: false, qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.evaluate(() => {
    window.__t = []; const t0 = toast; toast = function (m) { window.__t.push(String(m).replace(/<[^>]+>/g, '')); return t0.apply(this, arguments); };
    window.__cpt = 0;
    window.__set = (sel, v) => { const e = document.querySelector(sel); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; };
    // une chaîne UNIQUE (le contrôle des doublons ne doit pas parler à notre place) de n signes exactement
    window.__u = (n, pre) => { const b = (pre || '') + (++window.__cpt).toString(36) + 'q'; return (b + 'x'.repeat(n)).slice(0, n); };
    window.__mail = n => { const suf = '@exemple.fr', b = 'm' + (++window.__cpt).toString(36) + 'q'; return (b + 'x'.repeat(n)).slice(0, n - suf.length) + suf; };
    window.__tel = () => '0546' + String(100000 + (++window.__cpt)).slice(1).padStart(6, '0');
    window.__bouton = (attr, val, extra) => { const b = document.createElement('button'); b.dataset[attr] = val; Object.assign(b.dataset, extra || {}); document.body.appendChild(b); b.click(); b.remove(); };
  });
  const lire = () => p.evaluate(() => { const t = window.__t.slice(); window.__t = []; const al = [...document.querySelectorAll('.alerte, .erreur:not([hidden])')].map(e => e.textContent.trim()).filter(Boolean); return { toast: t.join(' | '), alerte: al.join(' | ') }; });
  const msgDe = async () => { const m = await lire(); return m.toast + ' ' + m.alerte; };
  const nbCli = () => p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').length);
  const PL = { nom: 120, contact: 120, mail: 120, adr: 160 };
  const LIB = { nom: /(Raison sociale|Nom du client)/, contact: /Contact/, mail: /E-mail/, adr: /Adresse/ };
  const quand = (cond, v, vals) => L.v(cond, v, vals);

  // ───────────────────────── les cinq formulaires ─────────────────────────
  const FORMS = [
    { nom: 'la fiche client', sel: { nom: '[data-ci="nom"]', contact: '[data-ci="contact"]', tel: '[data-ci="tel"]', mail: '[data-ci="mail"]', adr: '[data-ci="adr"]' }, fiche: true,
      ouvrir: async () => { await p.evaluate(async () => { window.__k0 = Object.keys(CLIENTS).find(k => k !== '__nv' && CLIENTS[k].tel); aller('client-x-' + window.__k0); await new Promise(r => setTimeout(r, 500)); ongletClient = 'infos'; rendre(); await new Promise(r => setTimeout(r, 600)); }); },
      valider: () => p.evaluate(() => document.querySelector('[data-action="clientEnreg"]').click()) },
    { nom: 'le devis (dvn-)', sel: { nom: '#dvn-nom', contact: '#dvn-prenom', tel: '#dvn-tel', mail: '#dvn-mail', adr: '#dvn-adr' },
      ouvrir: async () => { await p.evaluate(() => { DVN_F = null; dvNouveau(); }); await L.calme(p, 400); await p.evaluate(() => { document.querySelector('#calque [data-dvn="nv|1"]').click(); }); await L.calme(p, 400); await p.evaluate(() => { document.querySelector('#calque [data-dvn="type|pro"]').click(); }); await L.calme(p, 400); await p.evaluate(() => window.__set('#dvn-objet', 'Objet du devis')); },
      valider: () => p.evaluate(() => document.querySelector('#calque [data-dvn="creer|1"]').click()) },
    { nom: 'la création d’intervention (data-cnv)', sel: { nom: '[data-cnv="nom"]', contact: '[data-cnv="contact"]', tel: '[data-cnv="tel"]', mail: '[data-cnv="mail"]', adr: '[data-cnv="adr"]' },
      ouvrir: async () => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} ouvrirCreation({}); CREA.nouveau = true; CREA.nv.type = 'pro'; if (['devis', 'contrat'].includes(CREA.fact)) CREA.fact = 'temps'; rendreCreation(); }); await L.calme(p, 600); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await L.calme(p, 400); },
      valider: () => p.evaluate(() => document.querySelector('.fen [data-action="cCreer"]').click()) },
    { nom: '« Nouveau client » (cs-)', sel: { nom: '#cs-nom', contact: '#cs-contact', tel: '#cs-tel', mail: '#cs-mail', adr: '#cs-adr' },
      ouvrir: async () => { await p.evaluate(() => { fermerPanneau && fermerPanneau(); ACTIONS.clientSeul(); }); await L.calme(p, 400); await p.evaluate(() => document.querySelector('#calque [data-action="clientSeulType"][data-v="pro"]').click()); await L.calme(p, 400); },
      valider: () => p.evaluate(() => document.querySelector('#calque [data-action="clientSeulOk"]').click()) },
    { nom: 'le devis xylophage (nv_)', sel: { nom: '[data-dx="nv_nom"]', contact: '[data-dx="nv_prenom"]', tel: '[data-dx="nv_tel"]', mail: '[data-dx="nv_mail"]', adr: '[data-dx="nv_adr"]' },
      ouvrir: async () => { await p.evaluate(async () => { try { fermerPanneau(); } catch (e) {} DX = dxNeuf(); DX.nv = true; DX.type = 'pro'; document.getElementById('contenu').innerHTML = dxVue(); await new Promise(r => setTimeout(r, 500)); }); },
      valider: () => p.evaluate(() => document.querySelector('[data-dxb="creer"]').click()) },
  ];
  const remplir = async (F, vals) => { for (const k of Object.keys(vals)) await p.evaluate(([s, v]) => window.__set(s, v), [F.sel[k], vals[k]]); };
  const valeursOk = () => p.evaluate(() => ({ nom: window.__u(120, 'N'), contact: window.__u(120, 'C'), tel: window.__tel(), mail: window.__mail(120), adr: window.__u(160, 'A') }));
  let champsVus = 0, refusOk = 0;

  for (const F of FORMS) {
    // population : les cinq champs sont là
    await F.ouvrir();
    const la = await p.evaluate(sel => Object.fromEntries(Object.entries(sel).map(([k, s]) => [k, !!document.querySelector(s)])), F.sel);
    champsVus += Object.values(la).filter(Boolean).length;
    quand('population · ' + F.nom + ' : les 5 champs sont à l’écran', Object.values(la).every(Boolean), la);

    // OK : chaque champ À son plafond est enregistré ENTIER
    const avant = await nbCli(), snap0 = F.fiche ? await p.evaluate(() => JSON.stringify(CLIENTS[window.__k0])) : null;
    const ok = await valeursOk(); await remplir(F, ok); await F.valider(); await L.calme(p, 600);
    const apres = await nbCli(), m1 = await msgDe();
    const gardé = await p.evaluate(([fiche, ok]) => { const k = fiche ? window.__k0 : Object.keys(CLIENTS).filter(x => x !== '__nv').find(x => CLIENTS[x].mail === ok.mail); const c = CLIENTS[k]; return c ? { nom: nbSignes(c.nom), contact: nbSignes(c.contact), mail: nbSignes(c.mail), adr: nbSignes(c.adr) } : null; }, [!!F.fiche, ok]);
    quand(F.nom + ' · chaque champ à son plafond (120, 120, 120, 160) est enregistré ENTIER, rien ne refuse', !!gardé && gardé.nom === 120 && gardé.contact === 120 && gardé.mail === 120 && gardé.adr === 160 && (F.fiche ? apres === avant : apres === avant + 1), [gardé, avant, apres, m1.slice(0, 120)]);

    // KO : un signe de trop dans CHAQUE champ → une phrase qui dit le champ et la limite, rien d'enregistré
    for (const champ of ['nom', 'contact', 'mail', 'adr']) {
      await F.ouvrir();
      const v = await valeursOk(); v[champ] = champ === 'mail' ? await p.evaluate(n => window.__mail(n), PL[champ] + 1) : await p.evaluate(([n, pre]) => window.__u(n, pre), [PL[champ] + 1, champ === 'nom' ? 'N' : champ === 'contact' ? 'C' : 'A']);
      const n0 = await nbCli(), s0 = F.fiche ? await p.evaluate(() => JSON.stringify(CLIENTS[window.__k0])) : null, j0 = await p.evaluate(() => JSON.stringify([INTS.length, DEVIS ? DEVIS.length : 0]));
      await remplir(F, v); await p.evaluate(() => { window.__t = []; }); await F.valider(); await L.calme(p, 500);
      const m = await msgDe(), n1 = await nbCli(), s1 = F.fiche ? await p.evaluate(() => JSON.stringify(CLIENTS[window.__k0])) : null, j1 = await p.evaluate(() => JSON.stringify([INTS.length, DEVIS ? DEVIS.length : 0]));
      const dit = LIB[champ].test(m) && new RegExp('limité à ' + PL[champ] + ' signes').test(m) && /rien n’a été enregistré/.test(m) && new RegExp('en fait ' + (PL[champ] + 1)).test(m);
      quand(F.nom + ' · ' + champ + ' à ' + (PL[champ] + 1) + ' signes : refus avec phrase (champ, limite, nombre écrit, « rien n’a été enregistré »)', dit, m.slice(0, 200));
      quand(F.nom + ' · ' + champ + ' à ' + (PL[champ] + 1) + ' : RIEN d’enregistré (clients, fiche, interventions, devis inchangés)', n1 === n0 && s1 === s0 && j1 === j0, [n0, n1, s0 === s1, j0, j1]);
      if (dit) refusOk++;
    }

    // graphèmes : 160 drapeaux (4 unités UTF-16 chacun) tiennent dans 160 signes, 161 non ; la coupe n'a rien changé au texte gardé
    for (const [nb, attendu] of [[158, 'ok'], [161, 'refus']]) {
      await F.ouvrir(); const v = await valeursOk(); const drap = '🇫🇷🇩🇪🇪🇸🇮🇹'.match(/.{4}/gu) || []; // quatre drapeaux, 4 unités chacun
      const flags = Array.from({ length: nb }, (_, i) => ['🇫🇷', '🇩🇪', '🇪🇸', '🇮🇹'][i % 4]).join('');
      v.adr = await p.evaluate(() => window.__u(2, 'A')) + flags;   // 2 signes de tête + nb drapeaux = nb + 2 signes
      const total = nb + 2, attOk = total <= 160;
      const n0 = await nbCli(); await remplir(F, v); await p.evaluate(() => { window.__t = []; }); await F.valider(); await L.calme(p, 500);
      const m = await msgDe(), n1 = await nbCli();
      const adrGardee = await p.evaluate(([fiche, mail]) => { const k = fiche ? window.__k0 : Object.keys(CLIENTS).filter(x => x !== '__nv').find(x => CLIENTS[x].mail === mail); return k && CLIENTS[k] ? CLIENTS[k].adr : null; }, [!!F.fiche, v.mail]);
      if (attOk) quand(F.nom + ' · adresse de ' + total + ' signes dont ' + nb + ' drapeaux (' + (total * 2 + nb * 2) + ' unités UTF-16) : enregistrée ENTIÈRE, rien coupé', adrGardee === v.adr, [adrGardee && [...adrGardee].length, v.adr.length]);
      else quand(F.nom + ' · adresse de ' + total + ' signes (drapeaux) : refusée avec phrase, rien d’enregistré', /limité à 160 signes/.test(m) && (F.fiche ? true : n1 === n0), [m.slice(0, 120), n0, n1]);
    }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} });
  }
  quand('population : 25 champs de formulaire frappés (5 formulaires × 5)', champsVus === 25, champsVus);
  quand('population : 20 refus attendus (5 formulaires × 4 champs) tous dits avec leur phrase', refusOk === 20, refusOk);

  // ───────────────────────── 1. consignes d'accès : frappe réelle de trois lignes ─────────────────────────
  {
    const F = FORMS[0]; await F.ouvrir();
    const ta = await p.evaluate(() => { const e = document.querySelector('[data-ci="acces"]'); return e ? { tag: e.tagName, max: e.getAttribute('maxlength') } : null; });
    quand('population : « Consignes d’accès » est un textarea à maxlength 200', !!ta && ta.tag === 'TEXTAREA' && ta.max === '200', ta);
    const taper = async lignes => { await p.evaluate(() => { const e = document.querySelector('[data-ci="acces"]'); e.focus(); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
      for (let i = 0; i < lignes.length; i++) { await p.keyboard.type(lignes[i]); if (i < lignes.length - 1) await p.keyboard.press('Enter'); } };
    const enreg = async () => { await p.evaluate(() => { window.__t = []; document.querySelector('[data-action="clientEnreg"]').click(); }); await L.calme(p, 500); };
    const acces = () => p.evaluate(() => CLIENTS[window.__k0].acces);
    await taper(['Code portail 4821', 'Sonner chez la gardienne', 'Local à gauche']); await enreg();
    const a1 = await acces();
    quand('(1) trois lignes tapées au clavier (Entrée) : gardées sur trois lignes', a1 === 'Code portail 4821\nSonner chez la gardienne\nLocal à gauche', JSON.stringify(a1));
    quand('(1) « 4821Sonner » ne se range plus collé', !/4821Sonner/.test(a1), JSON.stringify(a1));
    const aff = await p.evaluate(() => { aller('client-x-' + window.__k0); return new Promise(r => setTimeout(() => { ongletClient = 'infos'; rendre(); setTimeout(() => r(document.querySelector('[data-ci="acces"]').value), 500); }, 500)); });
    quand('(1) la fiche rouverte rend les trois lignes dans le champ', aff === a1, JSON.stringify(aff));
    // blancs réduits par ligne, signes de contrôle retirés, lignes vides tombent
    await p.evaluate(() => window.__set('[data-ci="acces"]', '  Code   portail\t4821  \r\n\r\n   Sonner\u0001  chez   la gardienne \n')); await enreg();
    const a2 = await acces();
    quand('(1) blancs réduits PAR LIGNE, tabulation et signe de contrôle retirés, ligne vide supprimée', a2 === 'Code portail 4821\nSonner chez la gardienne' || a2 === 'Code portail 4821\nSonner chez la gardienne'.replace('', ''), JSON.stringify(a2));
    // quatre lignes : refus avec phrase, rien enregistré
    const avant4 = await acces();
    await taper(['L1', 'L2', 'L3', 'L4']); await enreg(); const m4 = await msgDe();
    quand('(1) quatre lignes : refus avec phrase (« 3 lignes au plus »)', /3 lignes au plus/.test(m4) && /Consignes d’accès/.test(m4), m4.slice(0, 160));
    quand('(1) quatre lignes : rien n’est enregistré', (await acces()) === avant4, JSON.stringify(await acces()));
    // 200 signes dont un saut de ligne (compté 1) passent, 201 refusent
    await p.evaluate(() => window.__set('[data-ci="acces"]', 'a'.repeat(99) + '\n' + 'b'.repeat(100))); await enreg(); const a200 = await acces();
    quand('(1)(2) 99 + saut de ligne + 100 = 200 signes : enregistrés entiers (le saut de ligne compte pour 1)', a200.length === 200 && a200.split('\n').length === 2, a200.length);
    await p.evaluate(() => window.__set('[data-ci="acces"]', 'a'.repeat(100) + '\n' + 'b'.repeat(100))); await enreg(); const m201 = await msgDe();
    quand('(2) 100 + saut de ligne + 100 = 201 signes : refus « limité à 200 signes », rien d’enregistré', /limité à 200 signes/.test(m201) && /en fait 201/.test(m201) && (await acces()) === a200, [m201.slice(0, 140), (await acces()).length]);
    // frappe de 300 signes dans le textarea : le champ s'arrête à 200
    await p.evaluate(() => { const e = document.querySelector('[data-ci="acces"]'); e.focus(); e.value = ''; }); await p.keyboard.insertText('z'.repeat(300));
    quand('(1) 300 signes tapés dans le textarea : le champ s’arrête à 200', (await p.evaluate(() => document.querySelector('[data-ci="acces"]').value.length)) === 200);
    // les autres champs restent sur UNE ligne : un saut de ligne collé dans le contact devient une espace
    await p.evaluate(() => { window.__set('[data-ci="acces"]', 'Code portail'); }); await enreg();
    const ct = await p.evaluate(() => cliNet({ contact: 'Marie\nDupont\t\u2028Martin', nom: 'A\r\nB', adr: '12 rue\nDu Port', mail: 'a@b.fr', tel: '05\n46' }));
    const ctOk = ct.contact === 'Marie Dupont Martin' && ct.nom === 'A B' && ct.adr === '12 rue Du Port' && ct.tel === '05 46';
    quand('(1) les autres champs restent sur UNE ligne : un saut de ligne, une tabulation ou un séparateur de ligne deviennent une espace (nom, contact, adresse, téléphone), jamais « MarieDupont »', ctOk, JSON.stringify(ct));
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  }

  // ───────────────────────── 3. les champs sans maxlength ─────────────────────────
  {
    const attr = (sel, max) => p.evaluate(([s, m]) => { const e = document.querySelector(s); return e ? e.getAttribute('maxlength') === String(m) : null; }, [sel, max]);
    const tape = async (sel, max) => { await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = ''; }, sel); await p.keyboard.insertText('y'.repeat(max + 200)); return p.evaluate(s => document.querySelector(s).value.length, sel); };
    const essai = async (nom, sel, max, ouvrir, valider, etat, libelle, preparer) => {
      await ouvrir(); const vu = await p.evaluate(s => !!document.querySelector(s), sel); quand('population · ' + nom + ' : le champ est à l’écran', vu, sel);
      quand(nom + ' : maxlength = ' + max, (await attr(sel, max)) === true);
      quand(nom + ' : ' + (max + 200) + ' signes tapés, le champ s’arrête à ' + max, (await tape(sel, max)) === max);
      // à la limite exacte : enregistré
      const s0 = await etat(); if (preparer) await preparer();
      await p.evaluate(([s, n]) => { window.__set(s, 'k'.repeat(n)); }, [sel, max]); await p.evaluate(() => { window.__t = []; }); await valider(); await L.calme(p, 500);
      const sOk = await etat(); const mOk = await msgDe();
      quand(nom + ' : ' + max + ' signes (la limite) : enregistrés', sOk.cle !== s0.cle && !/limité à/.test(mOk), [s0.cle, sOk.cle, mOk.slice(0, 100)]);
      // un de trop : refus, rien enregistré
      await ouvrir(); if (preparer) await preparer(); const s1 = await etat();
      await p.evaluate(([s, n]) => { window.__set(s, 'k'.repeat(n)); }, [sel, max + 1]); await p.evaluate(() => { window.__t = []; }); await valider(); await L.calme(p, 500);
      const sKo = await etat(), mKo = await msgDe();
      quand(nom + ' : ' + (max + 1) + ' signes : refus avec phrase (« ' + libelle + ' », « limité à ' + max + ' signes », « rien n’a été enregistré »)', new RegExp(libelle).test(mKo) && new RegExp('limité à ' + max + ' signes').test(mKo) && /rien n’a été enregistré/.test(mKo), mKo.slice(0, 180));
      quand(nom + ' : ' + (max + 1) + ' signes : rien d’enregistré', sKo.cle === s1.cle, [s1.cle, sKo.cle]);
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerCreation(); } catch (e) {} });
    };
    // titre d'une intervention (m-t, 120)
    await essai('titre d’une intervention (m-t)', '#m-t', 120,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} window.__iid = INTS.find(i => i.st !== 'annulee' && i.id !== 'brouillon').id; window.__bouton('action', 'modifInt', { id: window.__iid }); }); await L.calme(p, 400); },
      () => p.evaluate(() => document.querySelector('[data-action="modifIntOk"]').click()), () => p.evaluate(() => ({ cle: INTS.find(i => i.id === window.__iid).titre.length + ':' + INTS.find(i => i.id === window.__iid).titre.slice(0, 3) })), 'Titre');
    // titre d'un créneau bloqué (bl-titre, 120)
    await essai('titre d’un créneau bloqué (bl-titre)', '#bl-titre', 120,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} panneauBloc('', 'sm', AUJ); }); await L.calme(p, 400); },
      () => p.evaluate(() => document.querySelector('[data-action="blocOk"]').click()), () => p.evaluate(() => ({ cle: String(BUREAU.length) })), 'Titre du créneau');
    // nom d'un fournisseur local (fo-l-nom, 80)
    await essai('nom d’un fournisseur local (fo-l-nom)', '#fo-l-nom', 80,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} foLocal(); }); await L.calme(p, 600); },
      () => p.evaluate(() => document.querySelector('[data-fo="localok"]').click()), () => p.evaluate(() => ({ cle: String(MES_FOURN.length) })), 'Nom du fournisseur');
    // rôle d'une personne invitée (eq-r, 40)
    await essai('rôle d’une personne invitée (eq-r)', '#eq-r', 40,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} eqInviter(); }); await L.calme(p, 500); },
      () => p.evaluate(() => document.querySelector('[data-eq="inviterok"]').click()), () => p.evaluate(() => ({ cle: String(EQUIPE.length) })), 'Rôle',
      async () => { await p.evaluate(() => { window.__set('#eq-p', 'Camille'); window.__set('#eq-n', 'Dupont' + 'ab'.repeat(2) + (++window.__cpt).toString(36).replace(/\d/g, 'z')); window.__set('#eq-m', 'inv' + (++window.__cpt) + '@exemple.fr'); }); });
    // rôle d'une personne existante (eqx-mr, 40)
    await essai('rôle d’une personne de l’équipe, modifier (eqx-mr)', '#eqx-mr', 40,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} window.__qx = EQUIPE.find(o => o.k !== 'marc' && o.actif && !o.invite).k; eqFiche(window.__qx); window.__bouton('eqx', 'modifier|' + window.__qx); }); await L.calme(p, 600); },
      () => p.evaluate(() => document.querySelector('[data-eqx="modifok|' + window.__qx + '"]').click()), () => p.evaluate(() => ({ cle: EQUIPE.find(o => o.k === window.__qx).role })), 'Rôle');
    // nom de la plateforme de facturation (pa-n, 60)
    await essai('nom de la plateforme de facturation (pa-n)', '#pa-n', 60,
      async () => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} cxPlateforme(); }); await L.calme(p, 500); },
      () => p.evaluate(() => document.querySelector('[data-cx="plateformeok"]').click()), () => p.evaluate(() => ({ cle: String(CX_CONF.pa).length + ':' + String(CX_CONF.pa).slice(0, 2) })), 'Nom de la plateforme');
    // motif (textarea, 600) et titre de la fenêtre de création (120)
    const creaOuvrir = async () => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} const k = Object.keys(CLIENTS).find(x => x !== '__nv' && INTS.some(i => i.cli === x)); ouvrirCreation({ cli: k }); }); await L.calme(p, 600); await p.evaluate(() => { const b = document.querySelector('.fen [data-cfact="temps"]'); if (b) b.click(); }); await L.calme(p, 250); await p.evaluate(() => { const b = document.querySelector('.fen [data-action="cPlusTot"]'); if (b) b.click(); }); await L.calme(p, 400); };
    await essai('motif d’une intervention (data-cchamp="motif")', '[data-cchamp="motif"]', 600, creaOuvrir, () => p.evaluate(() => document.querySelector('.fen [data-action="cCreer"]').click()), () => p.evaluate(() => ({ cle: JSON.stringify(INTS.map(i => i.id)) })), 'Ce que le client a dit');
    await essai('titre de la fenêtre de création (data-cchamp="titre")', '[data-cchamp="titre"]', 120, creaOuvrir, () => p.evaluate(() => document.querySelector('.fen [data-action="cCreer"]').click()), () => p.evaluate(() => ({ cle: JSON.stringify(INTS.map(i => i.id)) })), 'Titre');
  }

  // ───────────────────────── 5. coupeSure par graphèmes ─────────────────────────
  {
    const r = await p.evaluate(() => {
      const orph = t => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(t) || /(?:^|[^\u{1F1E6}-\u{1F1FF}])[\u{1F1E6}-\u{1F1FF}](?![\u{1F1E6}-\u{1F1FF}])/u.test(t);
      const flag = '🇫🇷', fam = '👨‍👩‍👧‍👦', peau = '👍🏽', dec = 'é';
      const cas = { drapeau: ['a' + flag + 'b', 2], fam: ['a' + fam + 'b', 2], peau: ['a' + peau + 'b', 2], decompose: ['a' + dec + 'b', 2] };
      const out = {}; for (const [k, [t, n]] of Object.entries(cas)) { const c = coupeSure(t, n); out[k] = { coupe: c, n: nbSignes(c), orphelin: orph(c), entier: c === 'a' + t.slice(1, t.length - 1) }; }
      out.dessus = { drapeau: coupeSure('a' + flag + 'b', 3), fam: coupeSure('a' + fam + 'b', 3), peau: coupeSure('a' + peau + 'b', 3) };
      out.plafonds = [40, 60, 80, 120, 160, 200].map(n => { const t = ('x' + flag + fam + peau).repeat(300); const c = coupeSure(t, n); return [n, nbSignes(c), orph(c), c.length > 0 && !/[‍\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}]$/u.test(c) || nbSignes(c) === n]; });
      out.libelle = { fl: libelleSur('ab' + flag, 3), fam: libelleSur('ab' + fam, 3), nul: libelleSur(null, 10), nombre: libelleSur(123, 10), vide: libelleSur('', 10), sans: libelleSur('x'.repeat(100)).length };
      out.nb = { drapeau: nbSignes(flag), fam: nbSignes(fam), peau: nbSignes(peau), nl: nbSignes('a\nb') };
      out.seg = typeof Intl !== 'undefined' && !!Intl.Segmenter;
      return out; });
    console.log('  · coupeSure :', JSON.stringify(r).slice(0, 600));
    quand('(5) population : Intl.Segmenter est présent dans ce navigateur', r.seg === true);
    quand('(5) un drapeau (deux lettres régionales) coupé au milieu de la phrase : rendu ENTIER ou retiré, jamais en lettre seule', r.drapeau.n === 2 && !r.drapeau.orphelin && r.drapeau.coupe === 'a🇫🇷', r.drapeau);
    quand('(5) une famille d’émojis à séquence ZWJ : entière, jamais en morceaux', !r.fam.orphelin && r.fam.coupe === 'a👨‍👩‍👧‍👦', r.fam);
    quand('(5) un émoji à teinte de peau : entier, jamais sans sa teinte', !r.peau.orphelin && r.peau.coupe === 'a👍🏽', r.peau);
    quand('(5) un « é » décomposé compte pour UN signe et reste entier', r.decompose.coupe === 'aé' && r.decompose.n === 2, r.decompose);
    quand('(5) coupe à n signes : 3 signes gardent « a » + l’émoji + « b » (3 graphèmes) en entier', r.dessus.drapeau === 'a🇫🇷b' && r.dessus.fam === 'a👨‍👩‍👧‍👦b' && r.dessus.peau === 'a👍🏽b', r.dessus);
    quand('(5) six plafonds (40 à 200) sur un texte d’émojis mêlés : exactement n signes, aucun morceau orphelin', r.plafonds.every(x => x[1] === x[0] && !x[2]), r.plafonds);
    quand('(5) libelleSur : un drapeau n’est jamais coupé en lettre seule (3 signes : « ab » + drapeau), null → « », nombre gardé', r.libelle.fl === 'ab🇫🇷' && r.libelle.fam === 'ab👨‍👩‍👧‍👦' && r.libelle.nul === '' && r.libelle.nombre === '123' && r.libelle.vide === '' && r.libelle.sans === 60, r.libelle);
    quand('(5) nbSignes : un drapeau, une famille, une peau = 1 ; un saut de ligne = 1', r.nb.drapeau === 1 && r.nb.fam === 1 && r.nb.peau === 1 && r.nb.nl === 3, r.nb);
  }
  // ───────────────────────── rien n'a cassé ─────────────────────────
  quand('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  // la source : une seule règle de plafond pour les cinq formulaires
  const appels = (SRC.match(/clientPlafondRefus\(/g) || []).length;
  quand('une seule fonction de contrôle : clientPlafondRefus est appelée par les cinq formulaires (fiche, devis, intervention, client seul, xylophage)', appels >= 6, appels);
  await L.fermer(c);
  process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(2); });
