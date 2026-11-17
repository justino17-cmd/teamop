# Vu par le chef de chantier sur ses captures — à corriger par la voie « restes » ou par le dernier passage

Chaque ligne : ce qui a été vu, où, sur quel appareil. Une ligne réglée se coche `[x]` avec le commit ; elle ne s'efface pas.

- [ ] **Aperçu d'un devis au téléphone (atelier, « Ton devis, en grand », 100 %)** — iPhone : dans le carré du logo, les
      initiales sont minuscules (« cs » dans un coin) alors que sur Mac on lit « CS 17 » en grand. À mesurer (taille de police
      rendue dans le carré, aux quatre réglages de taille) et à corriger dans `atelier/page.source`.
- [ ] **Stock › Articles au téléphone** — iPhone 390 px : la pastille d'état (« Commandé · arrive le 4/11 ») passe sur deux
      lignes et tasse le nom de l'article sur deux lignes (« Anode / magnésium »). Sous ~430 px, la pastille prend sa propre
      ligne sous le nom.
- [x] **Mes heures** — « Absences : 1 jour (rtt) » : écrire « RTT ». *(restes-1 : `paieAbsTxt` passe par `aTypeBas` ; sonde restes-taches-absences-1.js partie F, mutation F)*
- [ ] **Les heures** — « 8h05 », « 170h46 », « 40h50 » : la typographie française écrit « 8 h 05 » ; à trancher UNE fois pour
      toute l'application (voie « mots ») et à tenir partout (Temps de travail, Mes heures, Planning, paie).
- [ ] **Boîte mail, bureau** — décision à soumettre à Justin (défaut ordinateur-06) : la secrétaire voit-elle la Boîte mail ?
      Recommandation du chef de chantier : oui, la boîte de l'entreprise seulement, pas la boîte personnelle du gérant.
      (Restes mail, tour 1 : toujours une DÉCISION, rien à corriger côté code — une ligne dans `ROLES.gestion.routes` quand Justin
      tranche ; ligne laissée non cochée exprès. Voir `final/restes-mail-tour1.json`.)
- [ ] **Sonde `atelier-seule.js`** — elle compare la page seule « au pixel près » à la Version 11 : les corrections du
      compositeur (prix à deux décimales, aides raccourcies, prestations au catalogue) déplacent des boîtes. À re-baser sur
      l'état corrigé, en gardant la vérification « rien d'autre n'a bougé ».
