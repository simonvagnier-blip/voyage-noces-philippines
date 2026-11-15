/* Simon & Sonya — Philippines 2027. Version 2 : le configurateur « À la carte ».
   Moteur : portage fidèle de calculer(cfg) de plan-v2/build_donnees.py (mêmes lignes, mêmes arrondis, mêmes alertes).
   Aucun montant écrit à la main : tout vient de donnees.json (bloc intégré à la page). */
(() => {
  'use strict';
  const go = () => { try { demarrer(); } catch (e) { console.error(e); } };
  if (window.NOCES) go(); else document.addEventListener('noces:pret', go, { once: true });

  function demarrer() {
    const N = window.NOCES, D = N.D, C = D.carte, K = D.configurateur;
    const { esc, escA, escUrl, eur, eurSigne, nombre, pct, virgule, dateLongue, dateSansJour, dateCourte, dateNum, versDate, majuscule, minuscule1, lien, lienFleche, pastille, NBSP, MOIS, JOURS } = N;
    const PH = N.PH;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const racine = $('#a-la-carte'); if (!racine) return;

    /* ------------------------------------------------------------ index des données */
    const ET = {}, HOT = {}, CH = {}, EXC = {}, LIA = {}, JOUR = {}, VOL = {}, PRESET = {};
    C.etapes.forEach((e) => { ET[e.id] = e; });
    C.hotels.forEach((h) => { HOT[h.id] = h; h.chambres.forEach((c) => { CH[c.id] = { h, c }; }); });
    [...C.excursions, ...C.moments].forEach((x) => { EXC[x.id] = x; });
    C.liaisons.forEach((l) => { LIA[l.de + '>' + l.a] = l; });
    C.vols_calendrier.filter((j) => j.destination === 'CEB').forEach((j) => { JOUR[j.date_depart] = j; j.options.forEach((o) => { VOL[o.id] = { j, o }; }); });
    K.presets.forEach((p) => { PRESET[p.id] = p; });
    const NON_RELEVEES = new Set(C.vols_dates_non_relevees);
    const ESC = {}; C.escales.forEach((e) => { ESC[e.id] = e; });
    /* v3 : février → mai ; identifiants de mois sans accent dans les données, nom affiché avec */
    const NUM_MOIS = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6 };
    const MOIS_IDS = K.mois.slice();
    const MOIS_NUM = {}; MOIS_IDS.forEach((m) => { MOIS_NUM[NUM_MOIS[m]] = m; });
    const NOM_MOIS = (m) => MOIS[NUM_MOIS[m] - 1] || m;
    const RECO = D.programme_recommande;
    const VP = D.offre_reference;
    const CLE = 'noces-cfg-v3';
    /* v3 : mode de prix des hôtels (interrupteur) */
    const MODE_DEF = (K.prix_hotels && K.prix_hotels.defaut) || 'vpn_inde';
    const MODES = (K.prix_hotels && K.prix_hotels.valeurs || []).map((v) => v.id);
    const FENETRES = (C.hotels_source && C.hotels_source.fenetres || []).map((f) => f.arrivee).sort();
    const ecartJours = (a, b) => Math.round((versDate(a.slice(0, 10)) - versDate(b.slice(0, 10))) / 864e5);
    /* relevé le plus proche d'une date ; à égalité, le plus ancien (règle de plan-v3) */
    const proche = (liste, jour, cle) => { let m = null; liste.forEach((r) => { const e = Math.abs(ecartJours(r[cle], jour)); if (!m || e < m.e || (e === m.e && r[cle] < m.r[cle])) m = { r, e }; }); return m; };
    const fenetreProche = (jour) => proche(FENETRES.map((w) => ({ w })), jour, 'w').r.w;
    /* date en texte brut (« lundi 1er mars »), pour les messages échappés ensuite par esc() */
    const dateTexte = (iso) => { const d = versDate(iso.slice(0, 10)); return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`; };
    const moisDeDate = (iso, defaut) => MOIS_NUM[+iso.slice(5, 7)] || defaut;
    const arriveeParis = (o) => o.arrivee_paris || plusJoursIso(o.depart_paris, o.jours_porte_a_porte);
    const departCebu = (o) => o.depart_retour || o.date_retour_depart_cebu;
    function plusJoursIso(s, n) { const d = versDate(s.slice(0, 10)); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    /* prix d'une chambre pour une arrivée le jour « ci » (portage de PRIX_CHAMBRE, plan-v3) */
    function prixChambre(h, c, ci, mode, moisDefaut) {
      const F = c.prix_par_fenetre;
      if (F && F.length) {
        const { r: f, e } = proche(F, ci, 'arrivee');
        let methode = `Booking.com via VPN Inde, relevé le ${dateNum(h.observe_le || D.meta.date_observation)} : ${virgule(f.prix_nuit_2_vpn_inde.toFixed(2))} € par nuit TTC (${f.tarif}) pour 5 nuits du ${dateCourte(f.arrivee)} au ${dateCourte(f.depart)}, fenêtre la plus proche de l’arrivée du ${dateCourte(ci)}`;
        if (mode === 'france') methode += ` ; prix depuis la France estimé : ${virgule(f.prix_nuit_2_france.toFixed(2))} €, soit le prix Inde ÷ (1 − ${virgule(f.ecart_inde_france_pct.toFixed(1))} %), ${f.origine_ecart}`;
        return { prix: f['prix_nuit_2_' + mode], statut: mode === 'vpn_inde' && e <= 7 ? 'observé' : 'estimation', methode, url: f.url, dates: [f.arrivee, f.depart], releve: true, tarif: f.tarif };
      }
      const p = c.prix_par_mois[moisDeDate(ci, moisDefaut)];
      return { prix: p['prix_nuit_2_' + mode], statut: p['statut_' + mode], methode: p.methode + (mode === 'france' && p.methode_france ? ` ; ${p.methode_france}` : ''), url: p.url, dates: p.dates_cherchees, releve: false, tarif: p.tarif };
    }
    /* prix d'une liaison le jour du trajet (portage de PRIX_LIAISON, plan-v3) */
    function prixLiaison(l, jour) {
      if (l.prix_par_date && l.prix_par_date.length) {
        const { r, e } = proche(l.prix_par_date, jour, 'date');
        const methode = `Trip.com France, relevé du ${dateNum(D.meta.date_observation)} pour le ${dateCourte(r.date)}${r.depart ? ` (vol de ${r.depart.replace(/^0/, '').replace(':', ' h ')}, ${r.compagnie})` : ''}, le plus proche du trajet du ${dateCourte(jour)} ; 2 adultes, bagage cabine seul`;
        return { prix: r.prix_2, statut: e <= 7 ? l.statut : 'estimation', methode, url: r.url || l.url, depart: r.depart || null };
      }
      return { prix: l.prix_2, statut: l.statut, methode: l.methode, url: l.url, depart: null };
    }
    function hotelComplet(h, ci, moisDefaut) {
      if (h.releve_v3) return (h.fenetres_sans_chambre || []).includes(fenetreProche(ci));
      return h.indisponible_aux_dates_relevees.includes(moisDeDate(ci, moisDefaut));
    }
    /* message déjà rédigé dans les données (programmes) pour la même chambre et la même fenêtre, s'il existe */
    const MSG_ABSENTE = K.presets.flatMap((p) => p.alertes_detail || []).filter((a) => a.code === 'CHAMBRE_ABSENTE_AU_RELEVE');
    function alerteChambre(h, c, ci, nuits) {
      const F = c.prix_par_fenetre; if (!F || !F.length) return null;
      const w = fenetreProche(ci);
      if ((h.fenetres_sans_chambre || []).includes(w) || F.some((f) => f.arrivee === w)) return null;
      const f = proche(F, ci, 'arrivee').r;
      const jm = (x) => `${x.slice(8, 10)}/${x.slice(5, 7)}`;
      const deja = MSG_ABSENTE.find((a) => a.message.startsWith(h.nom) && a.message.includes(`« ${c.nom} »`) && a.message.includes(`du ${jm(w)} au`) && a.message.includes(`fenêtre du ${jm(f.arrivee)} :`));
      // la phrase « Chambre affichée ce jour-là… » des données dépend du nombre de nuits : on ne la reprend que si les nuits concordent
      let msg = `${h.nom} : la chambre « ${c.nom} » n’était pas affichée pour la fenêtre du ${jm(w)} au ${jm(plusJoursIso(w, 5))}/${w.slice(0, 4)} (complète ou non proposée, relevé du ${dateNum(D.meta.date_observation)}). Prix repris de la fenêtre du ${jm(f.arrivee)} : à vérifier en premier.`;
      if (deja && nuits && deja.message.includes(`sur ${nuits} nuits.`)) msg = deja.message.replace(/'/g, '’');
      return { message: msg, parade: 'Ouvrir le lien Booking aux dates exactes ; si la chambre manque, prendre la catégorie affichée ou décaler le départ.' };
    }
    const nomNoeud = (id) => (id === 'cebu' ? 'Cebu' : ET[id] ? ET[id].nom : id);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const plusJours = (s, n) => { const d = versDate(s.slice(0, 10)); d.setDate(d.getDate() + n); return iso(d); };
    const heure = (s) => !s ? 'heure non relevée' : s.slice(11, 16).replace(':', NBSP + 'h' + NBSP).replace(/h\u00a000$/, 'h');
    const copie = (o) => JSON.parse(JSON.stringify(o));
    /* durée en heures décimales → « 7 h », « 4 h 30 » (format du reste du site) */
    const VILLES_AERO = { DMK: 'Bangkok (aéroport Don Mueang)', BKK: 'Bangkok', HKG: 'Hong' + NBSP + 'Kong', TPE: 'Taipei', SIN: 'Singapour', KUL: 'Kuala Lumpur', ICN: 'Séoul', MNL: 'Manille', CEB: 'Cebu', DOH: 'Doha', DXB: 'Dubaï', IST: 'Istanbul' };
    const vias = (l) => (l.length ? l.map((v) => VILLES_AERO[v] || v).join(', ') : 'escale non relevée');
    const heures = (x) => { const t = Math.round(x * 60), h = Math.floor(t / 60), mn = t % 60; return mn ? `${h}${NBSP}h${NBSP}${String(mn).padStart(2, '0')}` : `${h}${NBSP}h`; };
    /* « au Sur-mesure », « au Grand jeu », « à L’Essentiel » */
    const aNom = (nom) => (/^Le /.test(nom) ? 'au ' + nom.slice(3) : /^Les /.test(nom) ? 'aux ' + nom.slice(4) : 'à ' + nom);
    /* round() de Python : arrondi au pair sur les demis exacts (1 168,5 → 1 168) */
    const arrondi = (x) => { const f = Math.floor(x), r = x - f; return r === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); };

    /* ------------------------------------------------------------ moteur (portage de calculer) */
    function calculer(cfg) {
      const lignes = [], alertes = [];
      const add = (poste, libelle, montant, statut, ref, extra = {}) => lignes.push({ poste, libelle, montant: arrondi(montant), statut, ref, ...extra });
      const al = (code, message, extra = {}) => alertes.push({ code, niveau: K.codes_alertes[code], message, ...extra });
      const jv = VOL[cfg.vol];
      if (!jv || jv.j.date_depart !== cfg.date_depart) throw new Error('vol inconnu ' + cfg.vol);
      const vol = jv.o, mois = MOIS_NUM[+cfg.date_depart.slice(5, 7)];
      const mode = MODES.includes(cfg.prix_hotels) ? cfg.prix_hotels : MODE_DEF;
      add('vols_internationaux', `Paris ⇄ Cebu, ${vol.compagnies.join(', ')}`, vol.prix_2, vol.statut, vol.id, { url: vol.url, methode: `${vol.source} ; ${vol.cabine.toLowerCase()}, ${vol.bagage_soute_inclus ? 'bagage en soute compris' : 'sans bagage en soute'}. ${vol.note_retour || ''}`.trim() });
      if (!vol.bagage_soute_inclus) al('BAGAGE_NON_INCLUS', 'Ce tarif ne comprend pas de bagage en soute.');
      const x = cfg.escale;
      const nuitsPh = vol.nuits_sur_place - (x && x.mode === 'sans_allonger' ? x.nuits : 0);
      const duree = vol.jours_porte_a_porte + (x && x.mode === 'allonge' ? x.nuits : 0);
      if (vol.jours_porte_a_porte !== 14) al('DUREE_13_JOURS', `Ce vol rentre un jour plus tôt : ${vol.jours_porte_a_porte} jours porte à porte, ${vol.nuits_sur_place} nuits sur place.`);
      const et = cfg.etapes;
      /* v3 : alertes propres au vol (horaire retour, nuits) */
      if (vol.horaire_retour === 'non_releve') al('RETOUR_NON_RELEVE', `Heure du vol retour non relevée (Trip.com n’affiche que l’aller) : il quitte Cebu le ${dateTexte(vol.date_retour_depart_cebu)}. À lire avant d’acheter.`);
      else if (vol.depart_retour && vol.depart_retour.slice(11, 16) < '16:00') {
        const der = et.length ? et[et.length - 1].etape : null;
        al('RETOUR_AVANT_16H', `Le vol retour quitte Cebu vers ${heure(vol.depart_retour)} (horaire habituel, à confirmer) : ${['mactan', 'moalboal', 'panglao'].includes(der) ? 'la dernière matinée se passe en route.' : 'impossible de rejoindre Cebu le matin même depuis cette étape.'}`, { parade: 'Finir par Panglao (premier ferry du matin) ou Cebu-Mactan, ou choisir un vol qui repart le soir (Cathay Pacific, 19 h 20).' });
      }
      if (vol.nuits_sur_place !== 12 && vol.jours_porte_a_porte === 14) al('NUITS_REDUITES', `Ce vol arrive à Cebu le surlendemain du départ : ${vol.nuits_sur_place} nuits sur place au lieu de 12.`);
      /* v3 : jour du trajet k et date d'arrivée à l'étape k = arrivée à Cebu (+ escale faite à l'aller) + nuits des étapes précédentes */
      const arrivee = plusJours(vol.arrivee_sur_place, x ? x.nuits : 0);
      const jourK = (k) => plusJours(arrivee, et.slice(0, k).reduce((a, e) => a + e.nuits, 0));
      const lia = [];
      if (!(et.length >= 1 && et.length <= 3)) al('NB_ETAPES', 'Choisissez une à trois étapes.');
      const tot = et.reduce((a, e) => a + e.nuits, 0);
      if (tot !== nuitsPh) al('TOTAL_NUITS', `${tot} nuits réparties pour ${nuitsPh} à placer.`);
      const chemin = ['cebu', ...et.map((e) => e.etape), 'cebu'];
      let nVols = 0, cebuTaxi = 0;
      for (let i = 0; i < chemin.length - 1; i++) {
        const a = chemin[i], b = chemin[i + 1], l = LIA[a + '>' + b];
        if (!l) { al('LIAISON_INCONNUE', `Aucune liaison relevée de ${nomNoeud(a)} à ${nomNoeud(b)}.`); lia.push(null); continue; }
        const jour = jourK(i), pl = prixLiaison(l, jour); lia.push({ ...pl, jour });
        add(l.n_vols ? 'vols_interieurs' : 'transferts', `${nomNoeud(a)} → ${nomNoeud(b)}, ${dateCourte(jour)} : ${l.mode}${pl.depart ? ` de ${pl.depart.replace(/^0/, '').replace(':', NBSP + 'h' + NBSP)}` : ''}`, pl.prix, pl.statut, `${a}>${b}`, { url: pl.url, methode: pl.methode });
        nVols += l.n_vols; cebuTaxi += l.transfert_cebu_2;
        if (l.jour_perdu) al('JOUR_PERDU', `${nomNoeud(a)} → ${nomNoeud(b)} prend la journée (${heures(l.temps_porte_a_porte_h)} porte à porte).`, { de: a, a: b });
        if (l.alerte) al('LIAISON_FRAGILE', `${nomNoeud(a)} → ${nomNoeud(b)} : ${l.alerte}`);
      }
      if (nVols) add('vols_interieurs', `Bagages en soute sur les vols intérieurs (${nVols} vols × 2 personnes × 20 kg)`, nVols * K.bagage_par_vol_interieur_php / K.taux_php, 'estimation', 'bagages', { methode: C.forfaits.bagages_vols_interieurs.methode });
      const tp = C.forfaits.transferts.paris.find((t) => t.id === cfg.transfert_paris);
      add('transferts', tp.nom, tp.prix_2, 'estimation', 'paris', { methode: tp.methode });
      const coef = C.forfaits.transferts.sur_place.find((t) => t.id === cfg.transferts_sur_place).coefficient;
      const local = et.reduce((a, e) => a + (CH[e.chambre].h.transfert_aeroport_inclus ? 0 : ET[e.etape].transfert_local_2), 0);
      if (local * coef + cebuTaxi) add('transferts', 'Transferts sur place (aéroports, ports, hôtels)', local * coef + cebuTaxi, 'estimation', 'sur_place', { methode: C.forfaits.transferts.methode + (cebuTaxi ? ` Plus ${cebuTaxi} € de taxi entre le port et l’aéroport de Cebu.` : '') });
      if (et.length && !ET[et[0].etape].premiere_etape.possible_le_jour_d_arrivee)
        al('ARRIVEE_IMPOSSIBLE', ET[et[0].etape].premiere_etape.comment, { parade: 'Commencer par une nuit à Cebu-Mactan ou placer cette étape en deuxième.' });
      if (et.length && !vol.arrivee_avant_midi && !['mactan', 'moalboal', 'panglao'].includes(et[0].etape))
        al('ARRIVEE_TARDIVE', 'Ce vol arrive à Cebu après midi : la correspondance du jour même vers la première étape n’est pas garantie.', { parade: 'Prévoir une première nuit à Cebu-Mactan.' });
      const dates = datesEtapes(cfg);
      et.forEach((e, i) => {
        const { h, c } = CH[e.chambre], etp = ET[e.etape];
        if (h.etape !== e.etape) al('HOTEL_HORS_ETAPE', `${h.nom} n’est pas à ${etp.nom}.`, { i });
        const ci = jourK(i), p = prixChambre(h, c, ci, mode, mois);
        const url = urlBooking(h, dates[i]);
        add('hotels', `${h.nom} — ${c.nom}, ${e.nuits} nuits`, p.prix * e.nuits, p.statut, c.id, { url, methode: p.methode + (c.releve_v3 === false ? ' (même prix dans les deux modes : aucun gain VPN compté)' : '') });
        if (c.petit_dejeuner_supplement_nuit_2) add('hotels', `Petits-déjeuners à ${h.nom}`, c.petit_dejeuner_supplement_nuit_2 * e.nuits, 'observé', c.id + ':pdj', { url, methode: c.remarque || 'Supplément petit-déjeuner relevé sur la fiche.' });
        if (!h.respecte_regle_avis) al('AVIS_INSUFFISANTS', h.exception || `${h.nom} : sous le seuil de ${C.seuil_avis.note_min}/10 ou de ${C.seuil_avis.avis_min} avis.`, { i });
        const ac = alerteChambre(h, c, ci, e.nuits); if (ac) al('CHAMBRE_ABSENTE_AU_RELEVE', ac.message, { i, parade: ac.parade });
        if (hotelComplet(h, ci, mois)) al('HOTEL_COMPLET_AU_RELEVE', `${h.nom} n’affichait aucune chambre à la date relevée la plus proche (${h.releve_v3 ? `fenêtre du ${dateCourte(fenetreProche(ci))}` : NOM_MOIS(moisDeDate(ci, mois))}) : complet, ou ventes pas encore ouvertes. Le prix est une estimation, à vérifier.`, { i });
        if (e.nuits < etp.nuits_min) al('NUITS_INSUFFISANTES', `${etp.nom} : ${e.nuits} nuit${e.nuits > 1 ? 's' : ''}, il en faut au moins ${etp.nuits_min}.`, { i });
        if (etp.mois_deconseilles.includes(mois)) al('MOIS_DECONSEILLE', `${etp.nom} est déconseillée en ${mois}.`, { i });
        let demi = 0;
        (e.excursions || []).forEach((xid) => {
          const xx = EXC[xid];
          if (xx.etape !== null && xx.etape !== e.etape) al('EXCURSION_HORS_ETAPE', `« ${xx.nom} » ne se fait pas depuis ${etp.nom}.`, { i, x: xid });
          add('experiences', xx.nom, xx.prix_2, xx.statut, xid, { url: xx.url, methode: xx.methode });
          demi += xx.demi_journees;
          if (xx.mois_deconseilles.includes(mois)) al('EXCURSION_HORS_SAISON', `« ${xx.nom} » est déconseillée en ${mois}.`, { i, x: xid });
          (xx.exige || []).forEach((req) => { if (!(e.excursions || []).includes(req)) al('TAXE_MANQUANTE', `« ${xx.nom} » suppose aussi : ${EXC[req].nom}.`, { i, x: req }); });
        });
        if (demi > Math.max(e.nuits - 1, 0)) al('TROP_D_EXCURSIONS', `${etp.nom} : plus de la moitié du séjour en excursion, loin des 80 % de repos.`, { i });
      });
      (cfg.moments || []).forEach((xid) => { const xx = EXC[xid]; add('experiences', xx.nom, xx.prix_2, xx.statut, xid, { url: xx.url, methode: xx.methode }); });
      const rj = cfg.repas_par_jour_2;
      add('repas', `Déjeuners et dîners, ${nuitsPh} jours à ${rj} € par jour pour deux`, nuitsPh * rj, 'estimation', 'repas', { methode: C.forfaits.repas.methode });
      add('divers', C.forfaits.divers.libelle, diversPour(rj), 'estimation', 'divers', { methode: C.forfaits.divers.methode });
      if (x) {
        const v = ESC[x.ville];
        if (!v.chiffrable) al('ESCALE_NON_CHIFFREE', `Escale à ${v.ville} : prix non relevés.`);
        else if (!vol.escales_possibles.includes(x.ville)) al('ESCALE_INCOMPATIBLE', `Le vol choisi ne passe pas par ${v.ville}.`);
        else {
          const { h, c } = CH[x.chambre], p = prixChambre(h, c, datesEscale(cfg).du, mode, mois);
          add('escale', `${h.nom} — ${c.nom}, ${x.nuits} nuits à ${v.ville}`, p.prix * x.nuits, p.statut, c.id, { url: urlBooking(h, datesEscale(cfg)), methode: p.methode });
          add('escale', `Sur place à ${v.ville} : repas, transports, visites (${x.nuits} jours)`, v.frais_jour_2 * x.nuits, 'estimation', 'escale_frais', { methode: `${v.frais_jour_2} € par jour pour deux, ordre de grandeur.` });
          add('escale', 'Marge sur le billet avec arrêt', v.supplement_vol_2, 'estimation', 'escale_vol', { methode: v.impact_vol });
        }
      }
      const total = lignes.reduce((a, l) => a + l.montant, 0);
      const sous = {}; lignes.forEach((l) => { sous[l.poste] = (sous[l.poste] || 0) + l.montant; });
      const obs = lignes.filter((l) => l.statut === 'observé').reduce((a, l) => a + l.montant, 0);
      const baseVp = (sous.vols_internationaux || 0) + (sous.vols_interieurs || 0) + (sous.hotels || 0) + lignes.filter((l) => l.poste === 'transferts' && l.ref !== 'paris').reduce((a, l) => a + l.montant, 0);
      return { total, sous_totaux: sous, part_observee: total ? Math.round(obs / total * 100) / 100 : 0, obs, ecart_vs_6500: total - 6500, ecart_vs_8500: total - 8500,
        duree_jours: duree, nuits_philippines: nuitsPh, base_comparable_vp: baseVp, ecart_vp: baseVp - VP.prix_2_avec_vols, lignes, alertes, valide: !alertes.some((a) => a.niveau === 'bloquant'), vol, mois, dates, lia, prix_hotels: mode };
    }
    /* écart entre les deux modes de prix des hôtels, pour la configuration courante */
    const autreMode = (m) => MODES.find((x) => x !== m) || m;
    function ecartModes(cfg, r) { const r2 = calculer({ ...cfg, prix_hotels: autreMode(r.prix_hotels) }); return { total: r2.total, ecart: r2.total - r.total }; }
    const totalPreset = (p, mode) => (mode === 'france' ? p.total_prix_france : p.total_attendu);
    const diversPour = (rj) => { for (const t of K.divers_selon_repas) if (t.jusqu_a === null || rj <= t.jusqu_a) return t.montant; return 0; };
    /* dates de chaque étape : arrivée à Cebu (+ nuits d’escale, faite à l’aller) puis nuits cumulées */
    function datesEtapes(cfg) {
      const o = VOL[cfg.vol].o; let d = plusJours(o.arrivee_sur_place, cfg.escale ? cfg.escale.nuits : 0);
      return cfg.etapes.map((e) => { const du = d; d = plusJours(d, e.nuits); return { du, au: d }; });
    }
    /* nuits d’escale : de l’arrivée à la ville d’escale (jour où l’on serait arrivé à Cebu) au jour du vol vers Cebu */
    const datesEscale = (cfg) => { if (!cfg.escale) return null; const du = VOL[cfg.vol].o.arrivee_sur_place.slice(0, 10); return { du, au: plusJours(du, cfg.escale.nuits) }; };
    const urlBooking = (h, dt) => (h.url_booking_modele && dt ? h.url_booking_modele.replace('{arrivee}', dt.du).replace('{depart}', dt.au) : h.url_booking);
    const chambreEscale = (v) => HOT[ESC[v].hotel_par_defaut].chambres[0].id;
    const decal = (cfg) => (cfg.escale && cfg.escale.mode === 'allonge' ? cfg.escale.nuits : 0);
    const nuitsAPlacer = (cfg) => VOL[cfg.vol].o.nuits_sur_place - (cfg.escale && cfg.escale.mode === 'sans_allonger' ? cfg.escale.nuits : 0);

    /* ------------------------------------------------------------ état, partage, mémoire */
    /* le mode de prix des hôtels choisi à l'interrupteur est conservé quand on charge un programme */
    const depuisPreset = (id, mode) => { const p = PRESET[id]; return { date_depart: p.date_depart, vol: p.vol, etapes: copie(p.etapes), moments: copie(p.moments || []), repas_par_jour_2: p.repas_par_jour_2, transfert_paris: p.transfert_paris, transferts_sur_place: p.transferts_sur_place, escale: p.escale ? copie(p.escale) : null, prix_hotels: mode || (cfg && cfg.prix_hotels) || p.prix_hotels || MODE_DEF }; };
    const b64 = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const deb64 = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
    function encoder(cfg, base) {
      const o = { d: cfg.date_depart, v: cfg.vol, e: cfg.etapes.map((e) => [e.etape, e.nuits, e.chambre, e.excursions || []]), m: cfg.moments || [], r: cfg.repas_par_jour_2, tp: cfg.transfert_paris, ts: cfg.transferts_sur_place, x: cfg.escale ? [cfg.escale.ville, cfg.escale.nuits, cfg.escale.mode, cfg.escale.chambre || ''] : 0 };
      if (cfg.prix_hotels && cfg.prix_hotels !== MODE_DEF) o.p = cfg.prix_hotels;   // v3 : absent = mode par défaut (VPN Inde)
      if (base && base !== RECO && PRESET[base]) o.b = base;
      return 'v1.' + b64(JSON.stringify(o));
    }
    /* v3 : une adresse de la version 2 reste lisible. Ce qui n'existe plus est ramené au plus proche, et dit :
       date hors relevés → date relevée la plus proche ; vol disparu → vol de la case du jour ; chambre ou excursion disparue → retirée ou remplacée. */
    function decoder(code, notes) {
      try {
        if (!code || !code.startsWith('v1.')) return null;
        const o = JSON.parse(deb64(code.slice(3)));
        const ok = (c) => { if (!c) throw new Error('lien'); };
        const dit = (t) => { if (notes) notes.push(t); };
        ok(typeof o.d === 'string' && /^\d{4}-\d\d-\d\d$/.test(o.d) && Array.isArray(o.e) && o.e.length >= 1 && o.e.length <= 3);
        let d = o.d, v = o.v;
        if (!JOUR[d]) {
          const dates = Object.keys(JOUR).sort(), p = proche(dates.map((x) => ({ x })), d, 'x').r.x;
          dit(`Le départ du ${dateTexte(d)} ne fait plus partie des dates relevées le ${dateNum(D.meta.date_observation)} (février → mai) : la configuration est ramenée au ${dateTexte(p)}.`);
          d = p;
        }
        if (!VOL[v] || VOL[v].j.date_depart !== d) {
          const n = volDeLaCase(JOUR[d]);
          if (VOL[v] || o.d === d) dit(`Le vol de ce lien n’existe plus dans les relevés du ${dateNum(D.meta.date_observation)} : remplacé par ${n.compagnies.join(', ')} à ${eur(n.prix_2)} pour deux, le vol de la case du ${dateCourte(d)}.`);
          v = n.id;
        }
        const etapes = o.e.map(([etape, nuits, chambre, xs]) => {
          ok(ET[etape] && Number.isInteger(nuits) && nuits >= 1 && nuits <= 14 && Array.isArray(xs));
          if (!CH[chambre]) { const n = chambreParDefaut(etape); dit(`Une chambre de ce lien n’existe plus à ${ET[etape].nom} : remplacée par ${CH[n].h.nom} — ${CH[n].c.nom}.`); chambre = n; }
          const garde = xs.filter((x) => EXC[x]); if (garde.length < xs.length) dit('Une excursion de ce lien n’existe plus : retirée.');
          return { etape, nuits, chambre, excursions: garde };
        });
        ok(Array.isArray(o.m));
        ok(Number.isInteger(o.r) && o.r >= K.repas_par_jour_2.min && o.r <= K.repas_par_jour_2.max);
        ok(C.forfaits.transferts.paris.some((t) => t.id === o.tp) && C.forfaits.transferts.sur_place.some((t) => t.id === o.ts));
        let escale = null;
        if (o.x) { const [ville, nuits, mode, chambre] = o.x; ok(ESC[ville] && [2, 3].includes(nuits) && ['allonge', 'sans_allonger'].includes(mode)); escale = { ville, nuits, mode, chambre: chambre || null }; if (ESC[ville].chiffrable && !(CH[chambre] && CH[chambre].h.escale === ville)) escale.chambre = chambreEscale(ville); }
        const c = { date_depart: d, vol: v, etapes, moments: o.m.filter((x) => EXC[x]), repas_par_jour_2: o.r, transfert_paris: o.tp, transferts_sur_place: o.ts, escale, prix_hotels: MODES.includes(o.p) ? o.p : MODE_DEF };
        // nuits : un vol remplacé peut avoir un autre nombre de nuits sur place ; on répartit comme à l'écran
        const cible = VOL[v].o.nuits_sur_place - (escale && escale.mode === 'sans_allonger' ? escale.nuits : 0);
        if (etapes.reduce((a, e) => a + e.nuits, 0) !== cible && (o.d !== d || o.v !== v)) { const avant = cfg; cfg = c; equilibrer(); cfg = avant; dit(`Nuits réparties de nouveau pour ${cible} nuits sur place.`); }
        return c;
      } catch (e) { return null; }
    }
    /* programme de comparaison porté par le lien (champ b, facultatif) ; absent ou inconnu → programme recommandé */
    const baseDuCode = (code) => { try { const o = JSON.parse(deb64(code.slice(3))); return o && PRESET[o.b] ? o.b : RECO; } catch (e) { return RECO; } };
    /* deux configurations sont « le même programme » quel que soit le mode de prix des hôtels */
    const egal = (a, b) => encoder({ ...a, prix_hotels: MODE_DEF }) === encoder({ ...b, prix_hotels: MODE_DEF });
    const presetIdentique = (cfg) => K.presets.find((p) => egal(cfg, depuisPreset(p.id)));

    let cfg, ui = { etape: 1, moisCal: 'mars', ong: 0, tri: 'prix', filtres: { piscine: false, mer: false, seuil: true }, base: RECO, repere: 8500, message: '' };
    let R = null;   // dernier calcul

    function charger() {
      const h = location.hash.match(/^#cfg=(.*)$/);
      if (h) {
        const notes = [], c = decoder(h[1], notes);
        if (c) { cfg = c; ui.base = baseDe(c, h[1]); ui.depuisLien = true; if (notes.length) ui.message = `Ce lien date d’une version précédente du dossier. ${notes.join(' ')}`; return; }
        ui.message = 'Ce lien de configuration est illisible ou d’une autre version : voici le programme recommandé.';
        cfg = depuisPreset(RECO); ui.base = RECO; return;
      }
      try { const m = localStorage.getItem(CLE); const c = m && decoder(m); if (c) { cfg = c; ui.base = baseDe(c, m); return; } } catch (e) { /* stockage indisponible */ }
      cfg = depuisPreset(RECO); ui.base = RECO;
    }
    /* repère de comparaison d’une configuration venue d’un lien ou de la mémoire : le programme exact s’il l’est, sinon celui porté par le lien, sinon le recommandé */
    function baseDe(c, code) { const exact = presetIdentique(c); return exact ? exact.id : code ? baseDuCode(code) : RECO; }
    ui.moisCal = () => null;

    /* ------------------------------------------------------------ actions sur la configuration */
    function equilibrer(proteger = -1) {
      const cible = nuitsAPlacer(cfg), et = cfg.etapes; if (!et.length) return;
      let diff = et.reduce((a, e) => a + e.nuits, 0) - cible;
      // en trop : on retire d’abord sur la dernière étape, sans passer sous son minimum, puis sur les précédentes
      for (let passe = 0; passe < 2 && diff > 0; passe++)
        for (let j = et.length - 1; j >= 0 && diff > 0; j--) {
          if (j === proteger && passe === 0) continue;
          const plancher = passe === 0 ? ET[et[j].etape].nuits_min : 1, k = Math.min(et[j].nuits - plancher, diff);
          if (k > 0) { et[j].nuits -= k; diff -= k; }
        }
      if (diff < 0) { let k = et.length - 1; if (k === proteger && k > 0) k--; et[k].nuits -= diff; }
    }
    /* règle du § 2 : la nuit ajoutée ou retirée est compensée sur la dernière étape (sinon la précédente), jamais sous son minimum */
    function changerNuits(i, delta) {
      const et = cfg.etapes; if (et[i].nuits + delta < 1) return;
      et[i].nuits += delta;
      let diff = et.reduce((a, e) => a + e.nuits, 0) - nuitsAPlacer(cfg);
      for (let j = et.length - 1; j >= 0 && diff !== 0; j--) {
        if (j === i) continue;
        if (diff > 0) { const m = et[j].nuits - ET[et[j].etape].nuits_min; const k = Math.min(m, diff); if (k > 0) { et[j].nuits -= k; diff -= k; } }
        else { et[j].nuits -= diff; diff = 0; }
      }
    }
    function chambreParDefaut(etapeId) {
      const hs = C.hotels.filter((h) => h.etape === etapeId);
      const bons = hs.filter((h) => h.respecte_regle_avis);
      const liste = (bons.length ? bons : hs).slice().sort((a, b) => (b.note_booking || 0) - (a.note_booking || 0));
      const h = liste.find((x) => x.gamme === 'confort') || liste[0];
      return h.chambres[0].id;
    }
    function ajouterEtape(id) {
      if (cfg.etapes.length >= 3 || cfg.etapes.some((e) => e.etape === id)) return;
      cfg.etapes.push({ etape: id, nuits: Math.max(ET[id].nuits_min, Math.min(ET[id].nuits_conseillees, 4)), chambre: chambreParDefaut(id), excursions: [] });
      equilibrer(cfg.etapes.length - 1);
    }
    function retirerEtape(i) { if (cfg.etapes.length <= 1) return; cfg.etapes.splice(i, 1); equilibrer(); if (ui.ong >= cfg.etapes.length) ui.ong = 0; }
    function deplacer(i, d) { const j = i + d, et = cfg.etapes; if (j < 0 || j >= et.length) return; [et[i], et[j]] = [et[j], et[i]]; }
    function coutOrdre(ids) {
      const ch = ['cebu', ...ids, 'cebu']; let perdus = 0, h = 0;
      for (let i = 0; i < ch.length - 1; i++) { const l = LIA[ch[i] + '>' + ch[i + 1]]; if (!l) return Infinity; perdus += l.jour_perdu ? 1 : 0; h += l.temps_porte_a_porte_h; }
      return (ET[ids[0]].premiere_etape.possible_le_jour_d_arrivee ? 0 : 1000) + perdus * 100 + h;
    }
    function meilleurOrdre(ids) {
      const perms = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
      return perms(ids).sort((a, b) => coutOrdre(a) - coutOrdre(b))[0];
    }
    function appliquerOrdre(ordre) { cfg.etapes = ordre.map((id) => cfg.etapes.find((e) => e.etape === id)); }
    function choisirDate(d) {
      const j = JOUR[d]; if (!j) return;
      // le vol dont le prix figure dans la case ; si l'utilisateur a lui-même coché un type de vol à l'étape 1
      // (sur cette configuration), ce type est gardé quand il existe à la nouvelle date
      const perso = ui.typeVol && ui.typeVol.cfg === cfg ? j.options.find((x) => x.type === ui.typeVol.type) : null;
      const o = perso || volDeLaCase(j);
      cfg.date_depart = d; cfg.vol = o.id; equilibrer();
    }
    function choisirVol(id) { cfg.vol = id; equilibrer(); }
    /* prix d'une case du calendrier : le moins cher des vols de 14 jours en économique avec bagage en soute
       (règle de Simon : coût total honnête) ; à défaut, sans bagage ; à défaut, le moins cher, signalé « 13 j » */
    function volDeLaCase(j) {
      const plusBas = (l) => l.reduce((a, x) => (!a || x.prix_2 < a.prix_2 ? x : a), null);
      const eco14 = j.options.filter((x) => x.cabine === 'Économique' && x.jours_porte_a_porte === 14);
      return plusBas(eco14.filter((x) => x.bagage_soute_inclus)) || plusBas(eco14) || plusBas(j.options);
    }
    function basculerExcursion(i, id, on) {
      const xs = cfg.etapes[i].excursions; const k = xs.indexOf(id);
      if (on && k < 0) { xs.push(id); (EXC[id].exige || []).forEach((r) => { if (!xs.includes(r)) xs.push(r); }); }
      if (!on && k >= 0) xs.splice(k, 1);
    }

    /* parades « en un toucher » */
    function parades(a) {
      const p = [];
      const cebuDabord = () => cfg.etapes.length < 3 && !cfg.etapes.some((e) => e.etape === 'mactan');
      switch (a.code) {
        case 'TOTAL_NUITS': p.push(['repartir', 'Répartir les nuits']); break;
        case 'NB_ETAPES': p.push(['aller:2', 'Choisir les étapes']); break;
        case 'LIAISON_INCONNUE': p.push(['ordre', 'Meilleur ordre']); break;
        case 'ARRIVEE_IMPOSSIBLE': if (cfg.etapes.length > 1) p.push(['deuxieme', 'Placer l’étape en deuxième']); if (cebuDabord()) p.push(['mactan', 'Commencer par une nuit à Cebu-Mactan']); break;
        case 'ARRIVEE_TARDIVE': if (cebuDabord()) p.push(['mactan', 'Commencer par une nuit à Cebu-Mactan']); p.push(['aller:1', 'Choisir un autre vol']); break;
        case 'HOTEL_HORS_ETAPE': p.push([`hotel:${a.i}`, 'Réinitialiser l’hôtel']); break;
        case 'EXCURSION_HORS_ETAPE': p.push([`retirer:${a.i}:${a.x}`, 'Retirer l’excursion']); break;
        case 'ESCALE_NON_CHIFFREE': p.push(['hk', 'Choisir Hong Kong']); p.push(['sans-escale', 'Sans escale']); break;
        case 'ESCALE_INCOMPATIBLE': if (JOUR[cfg.date_depart].options.some((o) => o.escales_possibles.includes(cfg.escale.ville))) p.push(['vol-escale', 'Prendre le vol Cathay Pacific du même jour']); p.push(['sans-escale', 'Sans escale']); break;
        case 'JOUR_PERDU': { const ids = cfg.etapes.map((e) => e.etape), m = meilleurOrdre(ids); if (m.join() !== ids.join() && coutOrdre(m) < coutOrdre(ids)) p.push(['ordre', 'Meilleur ordre']); break; }
        case 'NUITS_INSUFFISANTES': p.push([`min:${a.i}`, `Passer à ${ET[cfg.etapes[a.i].etape].nuits_min} nuits`]); break;
        case 'MOIS_DECONSEILLE': if (cfg.etapes.length > 1) p.push([`retirer-etape:${a.i}`, 'Retirer cette étape']); p.push(['aller:1', 'Changer de mois']); break;
        case 'EXCURSION_HORS_SAISON': p.push([`retirer:${a.i}:${a.x}`, 'Retirer l’excursion']); break;
        case 'TROP_D_EXCURSIONS': p.push([`alleger:${a.i}`, 'Retirer les dernières excursions cochées']); break;
        case 'AVIS_INSUFFISANTS': if (C.hotels.some((h) => h.etape === cfg.etapes[a.i].etape && h.respecte_regle_avis)) p.push([`seuil:${a.i}`, 'Prendre un hôtel au seuil d’avis']); break;
        case 'BAGAGE_NON_INCLUS': if (JOUR[cfg.date_depart].options.some((o) => o.bagage_soute_inclus)) p.push(['bagage', 'Prendre un vol avec bagage']); break;
        case 'HOTEL_COMPLET_AU_RELEVE': p.push([`voir-hotels:${a.i}`, 'Voir les autres hôtels']); break;
        case 'TAXE_MANQUANTE': p.push([`ajouter:${a.i}:${a.x}`, 'Cocher la taxe']); break;
        default: break;
      }
      return p;
    }
    function executerParade(code) {
      const [q, a1, a2] = code.split(':'); const i = +a1;
      switch (q) {
        case 'repartir': equilibrer(); break;
        case 'aller': ui.etape = +a1; break;
        case 'ordre': appliquerOrdre(meilleurOrdre(cfg.etapes.map((e) => e.etape))); break;
        case 'deuxieme': deplacer(0, 1); break;
        case 'mactan': cfg.etapes.unshift({ etape: 'mactan', nuits: 1, chambre: chambreParDefaut('mactan'), excursions: [] }); equilibrer(0); break;
        case 'hotel': cfg.etapes[i].chambre = chambreParDefaut(cfg.etapes[i].etape); break;
        case 'retirer': basculerExcursion(i, a2, false); break;
        case 'ajouter': basculerExcursion(i, a2, true); break;
        case 'hk': cfg.escale = { ville: 'hong-kong', nuits: cfg.escale ? cfg.escale.nuits : 2, mode: cfg.escale ? cfg.escale.mode : 'allonge', chambre: chambreEscale('hong-kong') }; equilibrer(); break;
        case 'sans-escale': cfg.escale = null; equilibrer(); break;
        case 'vol-escale': { const o = JOUR[cfg.date_depart].options.find((x) => x.escales_possibles.includes(cfg.escale.ville)); if (o) choisirVol(o.id); break; }
        case 'min': { const e = cfg.etapes[i]; changerNuits(i, ET[e.etape].nuits_min - e.nuits); break; }
        case 'retirer-etape': retirerEtape(i); break;
        case 'alleger': { const e = cfg.etapes[i], max = Math.max(e.nuits - 1, 0); let g = 0; while (g++ < 20 && e.excursions.reduce((a, x) => a + EXC[x].demi_journees, 0) > max) { const xs = e.excursions.filter((x) => EXC[x].demi_journees > 0); if (!xs.length) break; basculerExcursion(i, xs[xs.length - 1], false); } break; }
        case 'seuil': { const hs = C.hotels.filter((h) => h.etape === cfg.etapes[i].etape && h.respecte_regle_avis).sort((a, b) => b.note_booking - a.note_booking); cfg.etapes[i].chambre = hs[0].chambres[0].id; break; }
        case 'bagage': { const o = JOUR[cfg.date_depart].options.find((x) => x.bagage_soute_inclus); if (o) choisirVol(o.id); break; }
        case 'voir-hotels': ui.etape = 3; ui.ong = i; break;
        default: break;
      }
    }

    /* ------------------------------------------------------------ rendu : outils */
    const TYPES_VOL = { moins_cher_cabine: 'Le moins cher, sans bagage en soute', moins_cher: 'Le moins cher', meilleur_confort: 'Le meilleur compromis', moins_cher_et_meilleur_confort: 'Le moins cher et le meilleur compromis', cathay_matin_soir: 'Cathay Pacific, horaires du matin et du soir', affaires: 'Classe affaires', moins_cher_13_jours: 'Le moins cher, sur 13 jours' };
    const POSTES = { vols_internationaux: 'Vols internationaux', vols_interieurs: 'Vols intérieurs et bagages', transferts: 'Transferts', hotels: 'Hôtels', experiences: 'Sorties et moments', repas: 'Repas', divers: 'Divers', escale: 'Escale' };
    const COUL = { vols_internationaux: '#23483F', vols_interieurs: '#3F6E63', transferts: '#8A7551', hotels: '#0F7C82', experiences: '#C8553D', repas: '#D9A57B', divers: '#B9AE9A', escale: '#5BA8AC' };
    const NIVEAUX = { bloquant: 'À corriger', attention: 'À savoir', info: 'Pour info' };
    const photosLieu = (lieu) => PH.filter((p) => p.lieu === lieu && p.usage !== 'hero');
    const photoEtape = (id) => { const l = ET[id].photo_lieu; return photosLieu(l).find((p) => p.usage === 'etape') || photosLieu(l)[0] || null; };
    const img = (ph, sizes, cls = '') => (ph ? `<img class="${cls}" src="${ph.fichier_800}" srcset="${ph.fichier_800} 800w, ${ph.fichier} ${ph.largeur}w" sizes="${sizes}" width="${ph.largeur}" height="${ph.hauteur}" alt="${escA(ph.legende)}" loading="lazy" decoding="async">` : '');
    const credit = (ph) => (ph ? `${esc(ph.legende)} — ${lien(ph.page_commons, esc(ph.auteur))}, ${lien(ph.url_licence, esc(ph.licence))}` : '');
    const points5 = (n, label) => `<span class="points" role="img" aria-label="${escA(label)}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
    const statutPrix = (p) => { const dd = p.dates || p.dates_cherchees; return pastille(p.statut, p.methode, dd ? `dates cherchées : ${dateCourte(dd[0])} → ${dateCourte(dd[1])}` : null); };
    const moisDe = (d) => MOIS_NUM[+d.slice(5, 7)];
    const libMois = (m) => (/^[aeiou]/.test(m) ? 'd’' : 'de ') + m;

    /* ------------------------------------------------------------ rendu général */
    function rendreTout(opts = {}) {
      const t0 = performance.now();
      R = calculer(cfg);
      rendrePresets();
      rendreProgres();
      rendreEtape();
      rendreResume();
      rendreBarre();
      rendreCartesProgrammes();
      majPasserelles();
      memoriser();
      racine.dataset.dureeRendu = String(Math.round(performance.now() - t0));
      if (opts.focus) { const el = racine.querySelector(`[data-k="${CSS.escape(opts.focus)}"]`); if (el) el.focus({ preventScroll: true }); }
    }
    function memoriser() {
      const code = encoder(cfg, ui.base);
      try { localStorage.setItem(CLE, code); } catch (e) { /* navigation privée */ }
      if (location.hash === '' || location.hash.startsWith('#cfg=') || ui.depuisLien) { history.replaceState(null, '', '#cfg=' + code); ui.depuisLien = false; }
    }
    const lienPartage = () => location.href.split('#')[0] + '#cfg=' + encoder(cfg, ui.base);

    function rendrePresets() {
      const actuel = presetIdentique(cfg);
      $('#cfg-presets').innerHTML = `<p class="cfg-presets__titre">Partir d’un programme</p><div class="cfg-presets__liste">${K.presets.map((p) => {
        const on = actuel && actuel.id === p.id;
        return `<button type="button" class="cfg-chip ${on ? 'on' : ''}" data-preset="${p.id}" aria-pressed="${on}" data-k="preset-${p.id}"><span>${esc(p.nom.replace(/^L’Alternative : /, 'Alternative : ').replace(/^L'Alternative : /, 'Alternative : '))}</span><b>${eur(totalPreset(p, R.prix_hotels))}</b></button>`;
      }).join('')}</div>${interrupteur()}`;
    }
    /* v3 : interrupteur « prix des hôtels » (recalcule tout) */
    function interrupteur() {
      const em = ecartModes(cfg, R), vpn = R.prix_hotels === 'vpn_inde';
      const lib = { vpn_inde: 'Réservés via VPN Inde', france: 'Depuis la France' };
      return `<div class="cfg-vpn" role="radiogroup" aria-label="Prix des hôtels">
        <p class="cfg-vpn__titre">Prix des hôtels</p>
        <div class="cfg-vpn__choix">${MODES.map((m) => `<button type="button" role="radio" class="cfg-vpn__opt ${R.prix_hotels === m ? 'on' : ''}" aria-checked="${R.prix_hotels === m}" data-mode="${m}" data-k="mode-${m}">${lib[m] || esc(m)}</button>`).join('')}</div>
        <p class="cfg-vpn__effet petit">${em.ecart === 0 ? 'Même total dans les deux modes : aucun hôtel de cette configuration n’a été relevé via le VPN.' : vpn ? `Depuis la France, ce voyage coûterait <b>${eur(em.total)}</b> (${eurSigne(em.ecart)}, prix estimés).` : `Via le VPN Inde : <b>${eur(em.total)}</b> (${eurSigne(em.ecart)}, prix relevés).`} <a class="cfg-vpn__lien" href="#astuce-vpn">L’astuce du VPN</a></p>
      </div>`;
    }
    const TITRES = ['Quand', 'Où', 'Où dormir', 'Quoi faire', 'Récapitulatif'];
    function rendreProgres() {
      const nb = R.alertes.filter((a) => a.niveau === 'bloquant').length;
      $('#cfg-progres').innerHTML = TITRES.map((t, i) => {
        const n = i + 1, on = ui.etape === n;
        const resume = [dateCourte(cfg.date_depart), cfg.etapes.map((e) => ET[e.etape].nom).join(', '), cfg.etapes.map((e) => CH[e.chambre].h.nom).join(', '), `${R.lignes.filter((l) => l.poste === 'experiences').length} choix`, eur(R.total)][i];
        return `<li><button type="button" class="cfg-pas ${on ? 'on' : ''} ${n < ui.etape ? 'fait' : ''}" data-pas="${n}" ${on ? 'aria-current="step"' : ''} data-k="pas-${n}"><span class="cfg-pas__n">${n}</span><span class="cfg-pas__t">${n === 5 ? '<span class="cfg-pas__long">Récapitulatif</span><span class="cfg-pas__court">Récap</span>' : t}${n === 5 && nb ? `<i class="cfg-pas__alerte" aria-label="${nb} alerte${nb > 1 ? 's' : ''} bloquante${nb > 1 ? 's' : ''}">${nb}</i>` : ''}</span><span class="cfg-pas__r">${resume}</span></button></li>`;
      }).join('');
    }
    function rendreEtape() {
      const zone = $('#cfg-parcours');
      const f = [null, etape1, etape2, etape3, etape4, etape5][ui.etape];
      zone.innerHTML = `<div class="cfg-panneau" role="region" aria-labelledby="cfg-titre-etape"><p class="cfg-panneau__n">Étape ${ui.etape} sur 5</p><h3 id="cfg-titre-etape" class="cfg-panneau__titre" tabindex="-1">${esc(TITRES[ui.etape - 1])}</h3>${f()}
        <div class="cfg-nav">${ui.etape > 1 ? `<button type="button" class="bouton bouton--trait" data-pas="${ui.etape - 1}" data-k="prec">← ${esc(TITRES[ui.etape - 2])}</button>` : '<span></span>'}${ui.etape < 5 ? `<button type="button" class="bouton bouton--lagon" data-pas="${ui.etape + 1}" data-k="suiv">${esc(TITRES[ui.etape])} →</button>` : ''}</div></div>`;
      if (ui.etape === 2 || ui.etape === 5) dessinerCarte();
    }

    /* ---------- étape 1 : quand */
    function etape1() {
      const m = moisDe(cfg.date_depart);
      const moisAffiche = ui.mois || m;
      const prixMin = (j) => volDeLaCase(j).prix_2;
      const standard = (o) => o.cabine === 'Économique' && o.jours_porte_a_porte === 14;
      const ecos = Object.values(JOUR).map(volDeLaCase).filter(standard).map((o) => o.prix_2).sort((a, b) => a - b);
      const q = (p) => ecos.filter((x) => x <= p).length / ecos.length;
      const classe = (j) => { if (!standard(volDeLaCase(j))) return 'aff'; const v = q(prixMin(j)); return v <= .2 ? 'p1' : v <= .4 ? 'p2' : v <= .6 ? 'p3' : v <= .8 ? 'p4' : 'p5'; };
      const marque = (j) => { const o = volDeLaCase(j); return [o.cabine !== 'Économique' ? 'aff.' : '', o.jours_porte_a_porte !== 14 ? `${o.jours_porte_a_porte}${NBSP}j` : ''].filter(Boolean); };
      const marqueLongue = (j) => { const o = volDeLaCase(j); return [o.cabine !== 'Économique' ? 'classe affaires seulement' : '', o.jours_porte_a_porte !== 14 ? `vol de ${o.jours_porte_a_porte} jours` : ''].filter(Boolean).map((x) => ', ' + x).join(''); };
      const mn = NUM_MOIS[moisAffiche], premier = new Date(2027, mn - 1, 1), nbj = new Date(2027, mn, 0).getDate();
      const decal = (premier.getDay() + 6) % 7;
      let cases = '';
      for (let k = 0; k < decal; k++) cases += '<span class="cal-vide" aria-hidden="true"></span>';
      for (let d = 1; d <= nbj; d++) {
        const s = iso(new Date(2027, mn - 1, d)), j = JOUR[s], nr = NON_RELEVEES.has(s);
        const libelleDate = `${JOURS[versDate(s).getDay()]} ${d === 1 ? '1er' : d} ${NOM_MOIS(moisAffiche)}`;
        if (j) {
          const on = s === cfg.date_depart, pm = prixMin(j), c = classe(j);
          cases += `<button type="button" class="cal-j cal-j--${c} ${on ? 'on' : ''}" data-date="${s}" aria-pressed="${on}" data-k="date-${s}" aria-label="${escA(libelleDate)} : ${escA(eur(pm))} pour deux${escA(marqueLongue(j))}"><span class="cal-j__n">${d === 1 ? '1<sup>er</sup>' : d}</span><span class="cal-j__p">${nombre(pm)}</span>${marque(j).map((x) => `<span class="cal-j__aff">${x}</span>`).join('')}</button>`;
        } else if (nr) cases += `<span class="cal-j cal-j--nr" aria-label="${escA(libelleDate)} : non relevée"><span class="cal-j__n">${d}</span><span class="cal-j__nr">non<br>relevée</span></span>`;
        else cases += `<span class="cal-j cal-j--hors" aria-hidden="true"><span class="cal-j__n">${d}</span></span>`;
      }
      const j = JOUR[cfg.date_depart], vm = D.mois.find((x) => x.id === moisAffiche);
      const vac = vacancesDuMois(moisAffiche);
      const opts = j.options.slice().sort((a, b) => a.prix_2 - b.prix_2);
      return `
        <p class="cfg-intro">Chaque date porte le prix aller-retour le plus bas relevé pour deux sur ${esc(C.vols_source.site)} le ${dateNum(C.vols_source.observe_le)}, en euros, vers Cebu, en classe économique, bagage en soute compris et sur 14 jours porte à porte : c’est ce vol qui est retenu quand vous touchez la date. Couleur : du moins cher <i class="cal-pt p1"></i> au plus cher <i class="cal-pt p5"></i>.${legendeMarques()} Les dates grisées n’ont pas été relevées : elles ne se choisissent pas. Sous le calendrier, tous les vols du jour restent proposés, y compris les moins chers sans bagage ou sur 13 jours.</p>
        <div class="cal-mois" role="tablist" aria-label="Mois du calendrier">${MOIS_IDS.map((x) => `<button type="button" role="tab" class="cal-onglet ${x === moisAffiche ? 'on' : ''}" aria-selected="${x === moisAffiche}" data-cal="${x}" data-k="cal-${x}">${majuscule(NOM_MOIS(x))}${moisDe(cfg.date_depart) === x ? '<i aria-hidden="true">●</i>' : ''}</button>`).join('')}</div>
        <div class="cal" role="group" aria-label="Départs ${escA(libMois(NOM_MOIS(moisAffiche)))} 2027">
          ${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((x) => `<span class="cal-tete" aria-hidden="true">${x}</span>`).join('')}
          ${cases}
        </div>
        ${vm ? `<div class="cfg-bandeau">
          <p><b>${esc(majuscule(NOM_MOIS(moisAffiche)))} : ${virgule(vm.note_globale_sur_10)}/10.</b> ${esc(vm.verdict)}</p>
          <p><b>Affluence ${vm.foule.niveau_sur_5}/5.</b> ${esc(vm.foule.texte)}</p>
          ${vm.foule.evenements.length ? `<p class="petit">${vm.foule.evenements.map((e) => `${dateSansJour(e.date, false)} : ${esc(e.nom)}`).join(' · ')}</p>` : ''}
          <p class="petit"><b>Vacances scolaires françaises :</b> ${vac}</p>
        </div>` : ''}
        <h4 class="cfg-sous">Les vols du ${dateLongue(cfg.date_depart)}</h4>
        <div class="vols-choix" role="radiogroup" aria-label="Vol">${opts.map((o) => carteVol(o)).join('')}</div>`;
    }
    function legendeMarques() {
      const cases = Object.values(JOUR).map(volDeLaCase), t = [];
      if (cases.some((o) => o.cabine !== 'Économique')) t.push(`<b class="cal-leg">aff.</b> : classe affaires seulement`);
      if (cases.some((o) => o.jours_porte_a_porte !== 14)) t.push(`<b class="cal-leg">13${NBSP}j</b> : vol de 13 jours, le seul relevé ce jour-là`);
      return t.length ? ' ' + t.join(' ; ') + '.' : '';
    }
    function vacancesDuMois(m) {
      const mn = NUM_MOIS[m], deb = new Date(2027, mn - 1, 1), fin = new Date(2027, mn, 0);
      const parse = (s) => { const r = s.match(/(\d\d)\/(\d\d)(?:\/(\d{4}))?/g); if (!r) return null; return r.map((x) => { const [d, mm, y] = x.split('/'); return new Date(+(y || 2027), +mm - 1, +d); }); };
      const res = [];
      D.vacances_scolaires_fr.forEach((v) => ['A', 'B', 'C'].forEach((z) => {
        const t = v['zone_' + z], ds = parse(t); if (!ds) return;
        const a = ds[0], b = ds[1] || new Date(2027, 11, 31);
        if (a <= fin && b >= deb) res.push(`zone ${z} ${t}`);
      }));
      return res.length ? esc(res.join(' ; ')) : 'aucune ce mois-ci.';
    }
    function carteVol(o) {
      const on = o.id === cfg.vol;
      return `<label class="vol-opt ${on ? 'on' : ''}"><input type="radio" name="cfg-vol" value="${o.id}" ${on ? 'checked' : ''} data-k="vol-${o.id}">
        <span class="vol-opt__corps">
          <span class="vol-opt__type">${esc(TYPES_VOL[o.type] || o.type)}${o.cabine !== 'Économique' ? ` · ${esc(o.cabine)}` : ''}</span>
          <span class="vol-opt__cie">${esc(o.compagnies.join(', '))} · via ${esc(vias(o.via_aller))}${vias(o.via_retour) !== vias(o.via_aller) ? ` à l’aller, ${esc(vias(o.via_retour))} au retour` : ''}</span>
          <span class="vol-opt__h">Aller ${dateCourte(o.depart_paris.slice(0, 10))} ${heure(o.depart_paris)} → Cebu ${dateCourte(o.arrivee_sur_place.slice(0, 10))} ${heure(o.arrivee_sur_place)} (${N.duree(o.duree_aller)})</span>
          <span class="vol-opt__h">${o.depart_retour ? `Retour ${dateCourte(o.depart_retour.slice(0, 10))} ${heure(o.depart_retour)} → Paris ${dateCourte(o.arrivee_paris.slice(0, 10))} ${heure(o.arrivee_paris)} (${N.duree(o.duree_retour)}) · <i>horaire retour habituel, à confirmer</i>` : `Retour : quitte Cebu le ${dateCourte(o.date_retour_depart_cebu)} · <b class="peu-avis">heure du retour non relevée</b>`}</span>
          <span class="vol-opt__h">${o.jours_porte_a_porte} jours porte à porte, ${o.nuits_sur_place} nuits sur place · ${o.bagage_soute_inclus ? 'bagage en soute compris' : '<b class="peu-avis">sans bagage en soute</b>'}${o.arrivee_avant_midi ? '' : ' · arrivée après midi'}${o.escales_possibles.includes('hong-kong') ? ' · escale à Hong' + NBSP + 'Kong possible' : ''}</span>
          ${o.note_retour ? `<span class="vol-opt__note">${esc(o.note_retour)}</span>` : ''}
        </span>
        <span class="vol-opt__prix"><b>${eur(o.prix_2)}</b>${pastille(o.statut, o.source)}</span>
      </label>${lienFleche(o.url, `Recherche Trip.com du ${dateCourte(o.depart_paris.slice(0, 10))}`).replace('class="lien-fleche"', 'class="lien-fleche vol-opt__lien"')}`;
    }

    /* ---------- étape 2 : où */
    function etape2() {
      const m = moisDe(cfg.date_depart), cible = nuitsAPlacer(cfg), et = cfg.etapes;
      const somme = et.reduce((a, e) => a + e.nuits, 0), ok = somme === cible;
      const ids = et.map((e) => e.etape), mo = et.length > 1 ? meilleurOrdre(ids) : ids;
      const peutMieux = mo.join() !== ids.join() && coutOrdre(mo) < coutOrdre(ids);
      const liaison = (a, b) => { const l = LIA[a + '>' + b]; if (!l) return ''; return `<li class="iti-lia ${l.jour_perdu ? 'perdu' : ''}"><span>${esc(majuscule(l.mode))} · ${heures(l.temps_porte_a_porte_h)} porte à porte · ${eur(l.prix_2)}${pastille(l.statut, l.methode)}</span>${l.jour_perdu ? '<b class="tag tag--corail">journée de liaison</b>' : ''}</li>`; };
      let iti = `<li class="iti-bout">Arrivée à Cebu${cfg.escale ? ` (après ${cfg.escale.nuits} nuits à ${esc(ESC[cfg.escale.ville].ville)})` : ''}, ${dateLongue(R.dates[0] ? R.dates[0].du : cfg.date_depart, false)}</li>`;
      let prec = 'cebu';
      et.forEach((e, i) => {
        iti += liaison(prec, e.etape);
        const etp = ET[e.etape];
        iti += `<li class="iti-etape"><span class="iti-n">${i + 1}</span><span class="iti-nom"><b>${esc(etp.nom)}</b><small>${R.dates[i] ? `du ${dateCourte(R.dates[i].du)} au ${dateCourte(R.dates[i].au)}` : ''} · conseillé ${etp.nuits_conseillees}, minimum ${etp.nuits_min}</small></span>
          <span class="stepper" role="group" aria-label="Nuits à ${escA(etp.nom)}"><button type="button" data-nuits="${i}:-1" aria-label="Une nuit de moins à ${escA(etp.nom)}" data-k="moins-${i}" ${e.nuits <= 1 ? 'disabled' : ''}>−</button><output aria-live="polite">${e.nuits}<small> nuit${e.nuits > 1 ? 's' : ''}</small></output><button type="button" data-nuits="${i}:1" aria-label="Une nuit de plus à ${escA(etp.nom)}" data-k="plus-${i}">+</button></span>
          <span class="iti-ordre"><button type="button" data-monter="${i}" aria-label="Monter ${escA(etp.nom)}" data-k="monter-${i}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-descendre="${i}" aria-label="Descendre ${escA(etp.nom)}" data-k="desc-${i}" ${i === et.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-retirer-etape="${i}" aria-label="Retirer ${escA(etp.nom)}" data-k="ret-${i}" ${et.length <= 1 ? 'disabled' : ''}>×</button></span></li>`;
        prec = e.etape;
      });
      iti += liaison(prec, 'cebu') + `<li class="iti-bout">Vol retour de Cebu, ${dateLongue(plusJours(departCebu(VOL[cfg.vol].o), decal(cfg)), false)}${VOL[cfg.vol].o.depart_retour ? ` vers ${heure(VOL[cfg.vol].o.depart_retour)} (horaire habituel, à confirmer)` : ' (heure non relevée)'}</li>`;
      const cartes = C.etapes.map((etp) => {
        const choisie = ids.includes(etp.id), ph = photoEtape(etp.id), mt = etp.meteo_par_mois[m];
        const nbH = C.hotels.filter((h) => h.etape === etp.id), auSeuil = nbH.filter((h) => h.respecte_regle_avis).length;
        return `<article class="etape-carte ${choisie ? 'on' : ''}">
          <figure class="etape-carte__photo">${img(ph, '(min-width: 1000px) 300px, 90vw')}<figcaption>${credit(ph)}</figcaption></figure>
          <div class="etape-carte__corps">
            <p class="etape-carte__ile">${esc(etp.ile)}${etp.mois_deconseilles.length ? ` · <b class="peu-avis">déconseillée en ${esc(etp.mois_deconseilles.join(', '))}</b>` : ''}</p>
            <h4>${esc(etp.nom)}</h4>
            <p>${esc(etp.resume)}</p>
            <p class="petit">${esc(etp.pour_qui)}</p>
            <dl class="etape-carte__dl">
              <div><dt>Voyage de noces</dt><dd>${points5(etp.adequation_voyage_de_noces_sur_5, `Adéquation ${etp.adequation_voyage_de_noces_sur_5} sur 5`)}</dd></div>
              ${mt ? `<div><dt>En ${esc(m)}</dt><dd>${esc(mt.verdict)} · ${esc(mt.pluie_mm)}${NBSP}mm</dd></div>` : ''}
              <div><dt>Nuits</dt><dd>${etp.nuits_min} au moins, ${etp.nuits_conseillees} conseillées</dd></div>
              <div><dt>Hôtels</dt><dd>${nbH.length}, dont ${auSeuil} au seuil d’avis</dd></div>
            </dl>
            ${auSeuil === 0 ? `<p class="petit peu-avis">Aucun hôtel ici n’atteint ${C.seuil_avis.avis_min} avis : risque à connaître.</p>` : ''}
            ${etp.premiere_etape.possible_le_jour_d_arrivee ? '' : `<p class="petit"><b>Pas en première étape :</b> ${esc(etp.premiere_etape.comment)}</p>`}
            <details class="etape-carte__plus"><summary>Accès, points faibles</summary><p class="petit">${esc(etp.acces)}</p><ul class="petit">${etp.moins_bien.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
            <button type="button" class="bouton ${choisie ? 'bouton--trait' : 'bouton--lagon'}" data-basculer-etape="${etp.id}" aria-pressed="${choisie}" data-k="et-${etp.id}" ${!choisie && et.length >= 3 ? 'disabled' : ''}>${choisie ? 'Retirer de l’itinéraire' : et.length >= 3 ? 'Trois étapes au plus' : 'Ajouter à l’itinéraire'}</button>
          </div>
        </article>`;
      }).join('');
      return `<div class="iti-tete"><p class="iti-compte ${ok ? 'ok' : 'ko'}"><b>${cible} nuits à placer : ${et.map((e) => e.nuits).join(' + ')}${ok ? '' : ` = ${somme}`}</b>${ok ? '' : ' — à corriger'}</p>
          <div class="iti-actions">${!ok ? '<button type="button" class="bouton bouton--lagon" data-parade="repartir" data-k="repartir">Répartir</button>' : ''}${et.length > 1 ? `<button type="button" class="bouton bouton--trait" data-parade="ordre" data-k="ordre" ${peutMieux ? '' : 'disabled'}>${peutMieux ? 'Meilleur ordre' : 'Ordre déjà optimal'}</button>` : ''}</div></div>
        <ol class="iti">${iti}</ol>
        <figure class="carte carte--cfg" id="cfg-carte-2"></figure>
        <h4 class="cfg-sous">Les huit étapes possibles</h4>
        <p class="cfg-intro">Une à trois étapes. L’entrée et la sortie se font par Cebu. ${C.etapes_ecartees.map((x) => `<b>${esc(x.nom)}</b> : ${esc(minuscule1(x.raison))}`).join(' ')}</p>
        <div class="etapes-grille">${cartes}</div>`;
    }

    /* ---------- étape 3 : où dormir */
    function etape3() {
      const m = moisDe(cfg.date_depart);
      if (ui.ong >= cfg.etapes.length) ui.ong = 0;
      const i = ui.ong, e = cfg.etapes[i], etp = ET[e.etape], dt = R.dates[i];
      const tous = C.hotels.filter((h) => h.etape === e.etape);
      const aucunAuSeuil = !tous.some((h) => h.respecte_regle_avis);
      const f = ui.filtres;
      const ci = dt ? dt.du : plusJours(VOL[cfg.vol].o.arrivee_sur_place, 0), mode = R.prix_hotels;
      const PX = (h, c) => prixChambre(h, c, ci, mode, m);
      const prixMin = (h) => Math.min(...h.chambres.map((c) => PX(h, c).prix));
      let liste = tous.filter((h) => (!f.seuil || aucunAuSeuil || h.respecte_regle_avis) && (!f.piscine || h.chambres.some((c) => c.piscine_privee)) && (!f.mer || h.chambres.some((c) => c.vue_mer)));
      const choisi = CH[e.chambre].h;
      if (!liste.includes(choisi) && choisi.etape === e.etape) liste.unshift(choisi);
      liste = liste.sort((a, b) => (a === choisi ? -1 : b === choisi ? 1 : ui.tri === 'note' ? (b.note_booking || 0) - (a.note_booking || 0) : prixMin(a) - prixMin(b)));
      const phs = photosLieu(etp.photo_lieu);
      const cartes = liste.map((h, k) => {
        const ph = h.id === 'pangulasian' ? PH.find((p) => p.lieu === 'pangulasian') : phs[k % Math.max(phs.length, 1)];
        const url = urlBooking(h, dt);
        return `<article class="hotel-cfg ${h === choisi ? 'on' : ''}">
          <figure class="hotel-cfg__photo">${img(ph, '(min-width: 1000px) 220px, 34vw')}<figcaption>${ph && ph.lieu === 'pangulasian' ? esc(ph.legende) : 'Photo du lieu, pas de l’hôtel'}</figcaption></figure>
          <div class="hotel-cfg__corps">
            <h4>${esc(h.nom)}${h === choisi ? '<span class="tag">Votre choix</span>' : ''}</h4>
            <p class="note-avis">${h.note_booking ? `<b>${virgule(h.note_booking)}/10</b><span>${nombre(h.nombre_avis)} avis sur Booking</span>` : '<span>Note non relevée</span>'}${h.respecte_regle_avis ? '' : '<span class="peu-avis">Peu d’avis</span>'}</p>
            <p class="petit">${esc(majuscule(h.gamme))}${h.plage ? ` · ${esc(minuscule1(h.plage))}` : ''}${h.transfert_aeroport_inclus ? ' · transfert inclus' : ''}${hotelComplet(h, ci, m) ? ` · <b class="peu-avis">aucune chambre affichée à la date relevée la plus proche</b>` : ''}</p>
            ${!h.respecte_regle_avis && h.exception ? `<p class="petit">${esc(h.exception)}</p>` : ''}
            <div class="choix chambres" role="radiogroup" aria-label="Chambres de ${escA(h.nom)}">${h.chambres.map((c) => {
              const p = PX(h, c), on = c.id === e.chambre, ac = alerteChambre(h, c, ci);
              const total = arrondi(p.prix * e.nuits) + (c.petit_dejeuner_supplement_nuit_2 ? arrondi(c.petit_dejeuner_supplement_nuit_2 * e.nuits) : 0);
              return `<label><input type="radio" name="ch-${i}" value="${c.id}" ${on ? 'checked' : ''} data-chambre="${i}" data-k="ch-${c.id}"><span>${esc(c.nom)}<span class="detail-choix">${[c.surface_m2 ? `${c.surface_m2}${NBSP}m²` : 'surface non indiquée', esc((c.atouts || []).join(', ')), c.petit_dejeuner_inclus ? 'petit-déjeuner compris' : c.petit_dejeuner_supplement_nuit_2 ? `petit-déjeuner ${eur(c.petit_dejeuner_supplement_nuit_2)} par nuit en plus` : 'petit-déjeuner non compris', esc(c.annulation || '')].filter(Boolean).join(' · ')}</span></span><span class="prix-choix">${eur(p.prix)}<small> /nuit</small>${statutPrix(p)}<small class="d">${e.nuits} nuits : ${eur(total)}</small>${ac ? '<small class="d peu-avis">non affichée à ces dates</small>' : ''}</span></label>`;
            }).join('')}</div>
            <div class="hotel__liens">${lienFleche(url, `Booking, du ${dt ? dateCourte(dt.du) : ''} au ${dt ? dateCourte(dt.au) : ''}`)}${lienFleche(h.url_officiel, 'Site de l’hôtel')}</div>
          </div>
        </article>`;
      }).join('');
      return `<div class="ong-etapes" role="tablist" aria-label="Étape">${cfg.etapes.map((x, k) => `<button type="button" role="tab" class="cal-onglet ${k === i ? 'on' : ''}" aria-selected="${k === i}" data-ong="${k}" data-k="ong-${k}">${esc(ET[x.etape].nom)} <small>${x.nuits} n.</small></button>`).join('')}</div>
        <p class="cfg-intro">${esc(etp.nom)}, ${e.nuits} nuits${dt ? ` du ${dateLongue(dt.du, false)} au ${dateLongue(dt.au, false)}` : ''}. Prix par nuit pour deux, taxes comprises, ${mode === 'vpn_inde' ? 'relevés sur Booking.com via un VPN placé en Inde' : 'depuis la France (prix Inde corrigé de l’écart mesuré, estimation)'} : pour chaque hôtel rebalayé le ${dateNum(D.meta.date_observation)}, la fenêtre de 5 nuits la plus proche de l’arrivée ; « relevé » si elle tombe à 7 jours au plus. Les autres gardent leur prix du mois. Les liens Booking portent les dates de l’étape.</p>
        <div class="filtres">
          <label class="filtre"><input type="checkbox" data-filtre="seuil" ${f.seuil ? 'checked' : ''} ${aucunAuSeuil ? 'disabled' : ''} data-k="f-seuil"><span>Au seuil d’avis (${virgule(C.seuil_avis.note_min)}/10, ${C.seuil_avis.avis_min} avis)</span></label>
          <label class="filtre"><input type="checkbox" data-filtre="piscine" ${f.piscine ? 'checked' : ''} data-k="f-piscine"><span>Piscine privée</span></label>
          <label class="filtre"><input type="checkbox" data-filtre="mer" ${f.mer ? 'checked' : ''} data-k="f-mer"><span>Vue mer</span></label>
          <label class="filtre filtre--tri"><span>Trier par</span><select data-tri data-k="tri"><option value="prix" ${ui.tri === 'prix' ? 'selected' : ''}>prix</option><option value="note" ${ui.tri === 'note' ? 'selected' : ''}>note</option></select></label>
        </div>
        ${aucunAuSeuil ? `<p class="cfg-note">À ${esc(etp.nom)}, aucun hôtel n’atteint ${C.seuil_avis.avis_min} avis : tous sont montrés, marqués « peu d’avis ».</p>` : ''}
        <p class="petit">${liste.length} hôtel${liste.length > 1 ? 's' : ''} sur ${tous.length}${liste.length < tous.length ? ' (filtres actifs)' : ''}.</p>
        <div class="hotels-cfg">${cartes}</div>`;
    }

    /* ---------- étape 4 : quoi faire */
    function etape4() {
      const m = moisDe(cfg.date_depart);
      const ligne = (x, checked, nom, data, k, type = 'checkbox') => `<label class="exc ${checked ? 'on' : ''}"><input type="${type}" ${data} ${checked ? 'checked' : ''} data-k="${k}"><span><b>${esc(nom || x.nom)}</b><span class="detail-choix">${esc(x.duree)} · ${esc(x.format)}${x.demi_journees ? ` · ${x.demi_journees === 2 ? 'une journée' : 'une demi-journée'}` : ''}${x.mois_deconseilles.includes(m) ? ` · <b class="peu-avis">déconseillée en ${esc(m)}</b>` : ''}${x.exige && x.exige.length ? ` · avec ${esc(x.exige.map((r) => EXC[r].nom).join(', '))}` : ''}${x.note ? ` · ${esc(x.note)}` : ''}</span></span><span class="prix-choix">${eur(x.prix_2)}${pastille(x.statut, x.methode)}${x.url ? `<a class="exc__lien" href="${escUrl(x.url)}" target="_blank" rel="noopener">source</a>` : ''}</span></label>`;
      const groupes = cfg.etapes.map((e, i) => {
        const xs = C.excursions.filter((x) => x.etape === e.etape);
        const demi = e.excursions.reduce((a, id) => a + EXC[id].demi_journees, 0), max = Math.max(e.nuits - 1, 0);
        const vus = new Set(); let html = '';
        xs.forEach((x) => {
          if (vus.has(x.id)) return;
          const mm = x.id.match(/^(.*)_(groupe|prive)$/), autre = mm && EXC[mm[1] + (mm[2] === 'groupe' ? '_prive' : '_groupe')];
          if (autre && autre.etape === e.etape) {
            const g = mm[2] === 'groupe' ? x : autre, p = mm[2] === 'groupe' ? autre : x; vus.add(g.id); vus.add(p.id);
            const val = e.excursions.includes(p.id) ? 'p' : e.excursions.includes(g.id) ? 'g' : '';
            html += `<div class="exc exc--paire ${val ? 'on' : ''}"><span><b>${esc(p.nom.replace(/ en (bangka |bateau |voiture )?privée?\b/i, '').replace(/\s*\((privé|en privé)\)/i, ''))}</b><span class="detail-choix">${esc(p.duree)}${p.mois_deconseilles.includes(m) ? ` · <b class="peu-avis">déconseillée en ${esc(m)}</b>` : ''}</span></span>
              <span class="bascule" role="radiogroup" aria-label="${escA(p.nom)}">
                <label><input type="radio" name="paire-${i}-${mm[1]}" value="" data-paire="${i}:${g.id}:${p.id}" ${!val ? 'checked' : ''} data-k="pa-${i}-${mm[1]}-0"><span>Non</span></label>
                <label><input type="radio" name="paire-${i}-${mm[1]}" value="${g.id}" data-paire="${i}:${g.id}:${p.id}" ${val === 'g' ? 'checked' : ''} data-k="pa-${i}-${mm[1]}-g"><span>Groupe <b>${eur(g.prix_2)}</b></span></label>
                <label><input type="radio" name="paire-${i}-${mm[1]}" value="${p.id}" data-paire="${i}:${g.id}:${p.id}" ${val === 'p' ? 'checked' : ''} data-k="pa-${i}-${mm[1]}-p"><span>Privé <b>${eur(p.prix_2)}</b></span></label>
              </span>
              <span class="exc__pastilles"><span>Groupe</span>${pastille(g.statut, `Groupe : ${g.methode}`)}<span>Privé</span>${pastille(p.statut, `Privé : ${p.methode}`)}${p.url ? `<a class="exc__lien" href="${escUrl(p.url)}" target="_blank" rel="noopener">source</a>` : ''}</span></div>`;
          } else { vus.add(x.id); html += ligne(x, e.excursions.includes(x.id), null, `data-exc="${i}:${x.id}"`, `ex-${i}-${x.id}`); }
        });
        return `<section class="exc-groupe"><h4 class="cfg-sous">${esc(ET[e.etape].nom)} <small>${e.nuits} nuits · ${demi} demi-journée${demi > 1 ? 's' : ''} d’excursion sur ${max} au plus pour garder 80 % de repos</small></h4>${html || '<p class="petit">Aucune excursion relevée ici.</p>'}</section>`;
      }).join('');
      return `<p class="cfg-intro">Cochez ce qui vous tente. Les excursions privées partent plus tôt que les groupes et évitent la foule des lagons.</p>${groupes}
        <section class="exc-groupe"><h4 class="cfg-sous">Les moments à deux <small>pour tout le voyage</small></h4>${C.moments.map((x) => ligne(x, cfg.moments.includes(x.id), null, `data-moment="${x.id}"`, `mo-${x.id}`)).join('')}</section>
        <details class="depliant"><summary>Ce qu’on a écarté, et pourquoi</summary><ul class="liste-filet">${C.excursions_ecartees.map((x) => `<li><b>${esc(x.nom)}.</b> ${esc(x.raison)} ${x.url ? lien(x.url, 'Source') : ''}<br><span class="petit">À la place : ${esc(x.alternative)}</span></li>`).join('')}</ul></details>`;
    }

    /* ---------- étape 5 : récapitulatif */
    function blocAlertes() {
      if (!R.alertes.length) return '<p class="cfg-ok">Aucune alerte : la configuration tient debout.</p>';
      const ordre = ['bloquant', 'attention', 'info'];
      return `<ul class="alertes" id="cfg-alertes">${R.alertes.slice().sort((a, b) => ordre.indexOf(a.niveau) - ordre.indexOf(b.niveau)).map((a) => `<li class="alerte alerte--${a.niveau}" data-code="${a.code}"><span class="alerte__niveau">${NIVEAUX[a.niveau]}</span><span class="alerte__msg">${esc(a.message)}${a.parade ? ` <span class="petit">${esc(a.parade)}</span>` : ''}</span>${parades(a).map(([c, t]) => `<button type="button" class="bouton bouton--trait bouton--petit" data-parade="${escA(c)}" data-k="pa-${escA(a.code)}-${escA(c)}">${esc(t)}</button>`).join('')}</li>`).join('')}</ul>`;
    }
    function etape5() {
      const x = cfg.escale, o = VOL[cfg.vol].o, rep = K.repas_par_jour_2;
      const niveaux = C.forfaits.repas.niveaux;
      const hk = ESC['hong-kong'];
      const actuel = presetIdentique(cfg);
      const base = PRESET[ui.base];
      const assu = C.forfaits.assurance.taux_indicatif;
      return `
        <div class="cfg-recap-tete">
          <p class="etiq">Votre voyage, pour deux, tout compris</p>
          <p class="montant num">${eur(R.total)}</p>
          <p class="cfg-resume__ecart">${ecartTexte(8500)} · ${ecartTexte(6500)}</p>
          ${jauge()}
          <p class="petit">${pct(R.part_observee)} en prix relevés, ${pct(1 - R.part_observee)} estimés · ${R.duree_jours} jours porte à porte · ${R.nuits_philippines} nuits aux Philippines</p>
        </div>
        <h4 class="cfg-sous">Le budget, poste par poste</h4>
        ${blocBudget()}
        <p class="petit">Assurance voyage, hors total : ${pct(assu[0])} à ${pct(assu[1])} du total, soit ${eur(R.total * assu[0])} à ${eur(R.total * assu[1])}. Indicatif, non relevé. ${esc(C.forfaits.assurance.methode)}</p>
        <h4 class="cfg-sous">Face à l’offre Voyage Privé</h4>
        <div class="cfg-vp">
          <p>À base comparable (vols, vols intérieurs, transferts sur place, hôtels) : <strong class="num">${eur(R.base_comparable_vp)}</strong> contre <span class="num">${lien(VP.url, eur(VP.prix_2_avec_vols))}</span>${pastille('observé', `${eur(VP.prix_par_personne_avec_vols)} par personne avec vols, affiché sur Voyage Privé`)}, soit <strong class="num">${eurSigne(R.ecart_vp)}</strong>, pour ${R.nuits_philippines} nuits aux Philippines au lieu de ${VP.nuits_sur_place} et ${cfg.etapes.length} étape${cfg.etapes.length > 1 ? 's' : ''} au lieu de ${VP.etapes}.</p>
          ${actuel ? (() => { const c = D.programmes.find((p) => p.id === actuel.programme_v1).comparaison_vp; return `<div class="vp__listes"><div><h4>Ce qu’on fait mieux</h4><ul class="liste-filet plus">${c.mieux.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div><div><h4>Ce qu’on perd</h4><ul class="liste-filet moins">${c.perdu.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div></div>`; })() : `<p class="petit">${esc(VP.reserve)}</p>`}
        </div>
        <h4 class="cfg-sous">Alertes</h4>${blocAlertes()}
        <h4 class="cfg-sous">La carte</h4>
        <figure class="carte carte--cfg" id="cfg-carte-5"></figure>
        <h4 class="cfg-sous">Jour par jour</h4>
        ${blocJours()}
        <h4 class="cfg-sous">Repas, trajets, escale</h4>
        <div class="reglages reglages--fin">
          <fieldset class="reglage"><legend>Repas : <b><output id="cfg-repas-val">${cfg.repas_par_jour_2}</output>${NBSP}€ par jour pour deux</b></legend>
            <input type="range" min="${rep.min}" max="${rep.max}" step="${rep.pas}" value="${cfg.repas_par_jour_2}" data-repas aria-label="Budget repas par jour pour deux" data-k="repas">
            <div class="reperes-repas">${niveaux.map((n) => `<button type="button" class="cfg-chip ${cfg.repas_par_jour_2 === n.par_jour_2 ? 'on' : ''}" data-repas-val="${n.par_jour_2}" data-k="rep-${n.id}"><span>${esc(n.nom)}</span><b>${n.par_jour_2}${NBSP}€</b></button>`).join('')}</div>
            <p class="petit">${esc((niveaux.find((n) => n.par_jour_2 === cfg.repas_par_jour_2) || {}).detail || 'Budget libre, entre deux repères.')} Divers associés : ${eur(diversPour(cfg.repas_par_jour_2))}.</p></fieldset>
          <fieldset class="reglage"><legend>Trajets</legend><div class="choix">
            ${C.forfaits.transferts.paris.map((t) => `<label><input type="radio" name="cfg-tp" value="${t.id}" data-tp ${cfg.transfert_paris === t.id ? 'checked' : ''} data-k="tp-${t.id}"><span>À Paris : ${esc(t.nom)}<span class="detail-choix">${esc(t.methode)}</span></span><span class="prix-choix">${eur(t.prix_2)}</span></label>`).join('')}
            ${C.forfaits.transferts.sur_place.map((t) => `<label><input type="radio" name="cfg-ts" value="${t.id}" data-ts ${cfg.transferts_sur_place === t.id ? 'checked' : ''} data-k="ts-${t.id}"><span>Sur place : ${esc(t.nom)}<span class="detail-choix">${esc(t.detail)}</span></span><span class="prix-choix">× ${virgule(t.coefficient)}</span></label>`).join('')}
          </div></fieldset>
          <fieldset class="reglage"><legend>Escale en route</legend><div class="choix">
            <label><input type="radio" name="cfg-esc" value="" data-escale ${!x ? 'checked' : ''} data-k="esc-0"><span>Sans escale<span class="detail-choix">${o.jours_porte_a_porte} jours porte à porte</span></span><span class="prix-choix">inclus</span></label>
            ${C.escales.map((v) => `<label class="esc-opt"><input type="radio" name="cfg-esc" value="${v.id}" data-escale ${x && x.ville === v.id ? 'checked' : ''} data-k="esc-${v.id}"><span>${(() => { const ph = PH.find((q) => q.usage === 'escale' && q.lieu === v.id.replace('-', '_')); return ph ? `<img class="esc-opt__img" src="${ph.fichier_800}" width="${ph.largeur}" height="${ph.hauteur}" alt="${escA(ph.legende)}" loading="lazy" decoding="async">` : ''; })()}${esc(v.ville)}${v.chiffrable ? '' : ' <b class="peu-avis">possible, non chiffrée</b>'}<span class="detail-choix">${esc(v.resume)} ${esc(v.impact_vol)}</span></span><span class="prix-choix">${v.chiffrable ? 'voir ci-dessous' : 'sans prix'}</span></label>`).join('')}
          </div>
          ${x && ESC[x.ville].chiffrable ? `<div class="escale-reglages">
            <div class="choix choix--ligne">${hk.nuits_possibles.map((n) => `<label><input type="radio" name="cfg-esc-n" value="${n}" data-esc-n ${x.nuits === n ? 'checked' : ''} data-k="escn-${n}"><span>${n} nuits</span></label>`).join('')}</div>
            <div class="choix">
              <label><input type="radio" name="cfg-esc-m" value="allonge" data-esc-m ${x.mode === 'allonge' ? 'checked' : ''} data-k="escm-a"><span>En allongeant le voyage<span class="detail-choix">${o.jours_porte_a_porte + x.nuits} jours porte à porte, rien ne change aux Philippines</span></span></label>
              <label><input type="radio" name="cfg-esc-m" value="sans_allonger" data-esc-m ${x.mode === 'sans_allonger' ? 'checked' : ''} data-k="escm-s"><span>Sans allonger<span class="detail-choix">${o.jours_porte_a_porte} jours, ${x.nuits} nuits de moins aux Philippines (prises sur la dernière étape)</span></span></label>
            </div>
            <div class="choix">${hk.hotels.map((id) => HOT[id]).map((h) => h.chambres.map((c) => { const p = prixChambre(h, c, datesEscale(cfg).du, R.prix_hotels, R.mois); return `<label><input type="radio" name="cfg-esc-c" value="${c.id}" data-esc-c ${x.chambre === c.id ? 'checked' : ''} data-k="escc-${c.id}"><span>${esc(h.nom)} — ${esc(c.nom)}<span class="detail-choix">${h.note_booking ? `${virgule(h.note_booking)}/10, ${nombre(h.nombre_avis)} avis · ` : ''}${c.surface_m2 ? `${c.surface_m2}${NBSP}m² · ` : ''}${lien(urlBooking(h, datesEscale(cfg)), `Booking, du ${dateCourte(datesEscale(cfg).du)} au ${dateCourte(datesEscale(cfg).au)}`)}${h.url_officiel ? ' · ' + lien(h.url_officiel, 'site') : ''}</span></span><span class="prix-choix">${eur(p.prix)}<small> /nuit</small>${statutPrix(p)}</span></label>`; }).join('')).join('')}</div>
          </div>` : x ? `<p class="cfg-note">${esc(ESC[x.ville].impact_vol)}</p>` : ''}</fieldset>
        </div>
        <div class="cfg-actions">
          <button type="button" class="bouton bouton--lagon" data-action="copier" data-k="copier">Copier le lien de notre voyage</button>
          <button type="button" class="bouton bouton--trait" data-action="imprimer" data-k="imprimer">Imprimer le récapitulatif</button>
          ${base && !actuel ? `<button type="button" class="bouton bouton--trait" data-preset="${base.id}" data-k="revenir">Revenir ${esc(aNom(base.nom))}</button>` : ''}
          <button type="button" class="bouton bouton--trait" data-preset="${RECO}" data-k="reco">Repartir du programme recommandé</button>
          <p class="cfg-copie" id="cfg-copie" role="status" aria-live="polite"></p>
        </div>`;
    }
    function blocBudget() {
      const ordre = ['vols_internationaux', 'vols_interieurs', 'transferts', 'hotels', 'experiences', 'repas', 'divers', 'escale'].filter((p) => R.sous_totaux[p] != null);
      return `<div class="budget-cfg" id="cfg-budget">${ordre.map((po) => {
        const ls = R.lignes.filter((l) => l.poste === po), obs = ls.filter((l) => l.statut === 'observé').length;
        return `<details class="poste" data-poste="${po}"><summary><span class="poste__nom"><i class="pt" style="background:${COUL[po]}"></i>${esc(POSTES[po])}<small>${ls.length} ligne${ls.length > 1 ? 's' : ''} · ${obs === ls.length ? 'tout relevé' : obs === 0 ? 'estimation' : obs + ' relevée' + (obs > 1 ? 's' : '')}</small></span><span class="poste__total">${eur(R.sous_totaux[po])}</span></summary>
          <ul class="lignes">${ls.map((l) => `<li><span>${l.url ? lien(l.url, esc(l.libelle)) : esc(l.libelle)}</span><span class="l-montant" data-montant="${l.montant}">${eur(l.montant)}${pastille(l.statut, l.methode)}</span></li>`).join('')}</ul></details>`;
      }).join('')}
        <div class="budget__total"><b>Total pour deux</b><span class="montant num" data-total-cfg="${R.total}">${eur(R.total)}</span><p>${pct(R.part_observee)} en prix relevés, ${pct(1 - R.part_observee)} estimés. Prix relevés le ${dateNum(D.meta.date_observation)} ; taux : <span class="insecable">1${NBSP}€ = ${virgule(K.taux_php)} pesos</span>.</p></div></div>`;
    }

    /* jour par jour : texte de la version 1 pour un préréglage intact, sinon généré */
    function joursGeneres() {
      const o = VOL[cfg.vol].o, x = cfg.escale, et = cfg.etapes, J = [];
      const push = (date, type, titre, texte) => J.push({ date, type, titre, texte });
      push(o.depart_paris.slice(0, 10), 'vol', 'Départ de Paris', `${o.compagnies.join(', ')}, décollage à ${heure(o.depart_paris)}, correspondance à ${vias(o.via_aller)}.`);
      let d = plusJours(o.depart_paris, 1);
      if (x) {
        const v = ESC[x.ville];
        for (let k = 0; k < x.nuits; k++) { push(d, k === 0 ? 'vol' : 'sortie', k === 0 ? `Arrivée à ${v.ville}` : `${v.ville}`, k === 0 ? `Escale de ${x.nuits} nuits${v.chiffrable && x.chambre ? ` au ${CH[x.chambre].h.nom}` : ''}. ${v.resume}` : v.resume); d = plusJours(d, 1); }
      }
      const dates = R.dates;
      const libLia = (a, b) => { const l = LIA[a + '>' + b]; return l ? `${majuscule(l.mode)}, ${heures(l.temps_porte_a_porte_h)} porte à porte${l.jour_perdu ? ' : la journée y passe' : ''}.` : ''; };
      const restes = [];
      et.forEach((e, i) => {
        const etp = ET[e.etape], h = CH[e.chambre].h, dt = dates[i];
        if (i === 0) push(dt.du, 'vol', `Arrivée à Cebu, puis ${etp.nom}`, `Atterrissage à ${heure(o.arrivee_sur_place)}${x ? ` (depuis ${ESC[x.ville].ville})` : ''}. ${libLia('cebu', e.etape)} Nuit au ${h.nom}.`);
        else push(dt.du, LIA[et[i - 1].etape + '>' + e.etape] && LIA[et[i - 1].etape + '>' + e.etape].jour_perdu ? 'vol' : 'vol', `${ET[et[i - 1].etape].nom} → ${etp.nom}`, `${libLia(et[i - 1].etape, e.etape)} Nuit au ${h.nom}.`);
        const xs = e.excursions.map((id) => EXC[id]).filter((xx) => xx.demi_journees > 0);
        const jours = []; for (let k = 1; k < e.nuits; k++) jours.push(plusJours(dt.du, k));
        const slots = []; jours.forEach((_, k) => { if (k % 2 === 0) slots.push(k); }); jours.forEach((_, k) => { if (k % 2 === 1) slots.push(k); });
        const parJour = {}; xs.forEach((xx, k) => { const s = slots[k % Math.max(slots.length, 1)]; if (s != null) (parJour[s] = parJour[s] || []).push(xx); });
        jours.forEach((jd, k) => {
          const l = parJour[k];
          if (l) push(jd, l.some((y) => y.wow) ? 'wow' : 'sortie', l.map((y) => y.nom.split(' (')[0]).join(' ; '), `${majuscule(l.map((y) => `${y.duree}, ${y.format}`).join(' ; '))}. Le reste du temps : plage et piscine.`);
          else { push(jd, 'repos', `${etp.nom} : plage et piscine`, `Journée libre au ${h.nom}.`); restes.push(J.length - 1); }
        });
      });
      const der = et[et.length - 1];
      const deNuit = !!o.depart_retour && +o.depart_retour.slice(11, 13) < 6;
      if (der && deNuit) {
        push(plusJours(o.depart_retour, decal(cfg) - 1), 'vol', `${ET[der.etape].nom} → Cebu, avant le vol de nuit`, `${libLia(der.etape, 'cebu')} Dernière nuit à l’hôtel la veille : on le quitte dans la journée, puis longue attente à l’aéroport de Cebu, car le vol décolle cette nuit, à ${heure(o.depart_retour)}.`);
        push(plusJours(o.depart_retour, decal(cfg)), 'vol', 'Vol de nuit, arrivée à Paris', `Décollage de Cebu à ${heure(o.depart_retour)}, correspondance à ${vias(o.via_retour)}. Atterrissage à Paris à ${heure(o.arrivee_paris)}.`);
      } else {
        if (der && o.depart_retour) push(plusJours(o.depart_retour, decal(cfg)), 'vol', `${ET[der.etape].nom} → Cebu, vol retour`, `${libLia(der.etape, 'cebu')} Décollage de Cebu à ${heure(o.depart_retour)} (horaire habituel, à confirmer), correspondance à ${vias(o.via_retour)}.`);
        else if (der) push(plusJours(o.date_retour_depart_cebu, decal(cfg)), 'vol', `${ET[der.etape].nom} → Cebu, vol retour`, `${libLia(der.etape, 'cebu')} Vol retour de Cebu : heure non relevée, à lire sur Trip.com avant d’acheter.`);
        push(plusJours(arriveeParis(o), decal(cfg)), 'vol', 'Arrivée à Paris', o.arrivee_paris ? `Atterrissage à ${heure(o.arrivee_paris)}.` : 'Heure d’arrivée non relevée.');
      }
      const ms = cfg.moments.map((id) => EXC[id]);
      ms.forEach((mm, k) => { const r = restes[restes.length - 1 - (k % Math.max(restes.length, 1))]; if (r != null) { J[r].texte += ` ${mm.nom}.`; J[r].type = J[r].type === 'repos' ? 'repos' : J[r].type; } });
      // fusionner les entrées d’un même jour (vol d’arrivée de l’escale + Paris le même jour, etc.)
      const out = []; J.forEach((j) => { const p = out[out.length - 1]; if (p && p.date === j.date) { p.titre += ' · ' + j.titre; p.texte += ' ' + j.texte; if (j.type === 'vol') p.type = 'vol'; } else out.push({ ...j }); });
      return out.map((j, k) => ({ ...j, jour: k + 1 }));
    }
    function blocJours() {
      const somme = cfg.etapes.reduce((a, e) => a + e.nuits, 0);
      if (somme !== nuitsAPlacer(cfg)) return '<p class="cfg-note">Répartissez d’abord les nuits (alerte ci-dessus) : le jour par jour se calcule ensuite.</p>';
      const intact = presetIdentique(cfg);
      const jours = intact ? D.programmes.find((p) => p.id === intact.programme_v1).jours : joursGeneres();
      const TYPES = { repos: 'Repos', sortie: 'Sortie', wow: 'Moment à part', vol: 'Trajet' };
      return `${intact ? '<p class="petit">Programme intact : texte rédigé de la version 1.</p>' : '<p class="petit">Généré depuis vos choix : excursions une journée sur deux, le reste plage et piscine.</p>'}
        <div class="rythme" style="grid-template-columns:repeat(${jours.length},1fr)" role="img" aria-label="Rythme des ${jours.length} jours">${jours.map((j) => `<i class="t-${j.type}"></i>`).join('')}</div>
        <ol class="jours jours--cfg" id="cfg-jours">${jours.map((j) => `<li class="jour jour--${j.type}"><div class="jour__num"><small>Jour</small>${j.jour}</div><div class="jour__corps"><div class="jour__date"><span>${majuscule(dateLongue(j.date, false))}</span><span class="jour__type"><i class="t-${j.type}"></i>${esc(TYPES[j.type])}</span></div><h4>${esc(j.titre)}</h4><p>${esc(j.texte)}</p></div></li>`).join('')}</ol>`;
    }

    /* ---------- carte de l’itinéraire (SVG, fond Natural Earth de la version 1) */
    function dessinerCarte() {
      $$('.carte--cfg', racine).forEach((fig) => {
        const CF = window.CARTE_FOND; if (!CF) { fig.innerHTML = `<figcaption>${esc(['Cebu', ...cfg.etapes.map((e) => ET[e.etape].nom), 'Cebu'].join(' → '))}</figcaption>`; return; }
        const pr = ([la, lo]) => [(lo - CF.lon0) * CF.k * CF.cos, (CF.lat1 - la) * CF.k];
        const [x0] = pr([0, 117.4]), [x1] = pr([0, 126.7]), [, y0] = pr([13.1, 0]), [, y1] = pr([8.7, 0]);
        const vw = x1 - x0, vh = y1 - y0, cw = Math.max(300, fig.clientWidth || 360), ech = cw / vw, fs = 13 / ech, sw = 1 / ech;
        const cebu = { nom: 'Cebu', coord: [10.307, 123.979], entree: true };
        const pts = [cebu, ...cfg.etapes.map((e, i) => ({ nom: ET[e.etape].nom, sous: `${e.nuits} nuit${e.nuits > 1 ? 's' : ''}`, coord: ET[e.etape].coord, n: i + 1, id: e.etape }))];
        const seq = ['cebu', ...cfg.etapes.map((e) => e.etape), 'cebu'];
        const coordDe = (id) => (id === 'cebu' ? cebu.coord : ET[id].coord);
        const typeDe = (l) => (/ferry|bateau/i.test(l.mode) && !/^vol/i.test(l.mode) ? 'ferry' : l.n_vols ? 'vol' : 'route');
        let traces = '';
        const segment = (a, b, type, courbe) => {
          const [ax, ay] = pr(coordDe(a)), [bx, by] = pr(coordDe(b)), L = Math.hypot(bx - ax, by - ay) || 1;
          const nx = -(by - ay) / L, ny = (bx - ax) / L, k = courbe * Math.min(L * 0.2, 40 * sw);
          const cx = (ax + bx) / 2 + nx * k, cy = (ay + by) / 2 + ny * k;
          const st = type === 'vol' ? `stroke="#C8553D" stroke-width="${2 * sw}" stroke-dasharray="${6 * sw} ${5 * sw}"` : type === 'ferry' ? `stroke="#0F7C82" stroke-width="${2.2 * sw}"` : `stroke="#4A5559" stroke-width="${2 * sw}"`;
          traces += `<path d="M${ax},${ay} Q${cx},${cy} ${bx},${by}" fill="none" ${st} stroke-linecap="round"/>`;
        };
        for (let i = 0; i < seq.length - 1; i++) {
          const a = seq[i], b = seq[i + 1], l = LIA[a + '>' + b]; if (!l) continue;
          const c = i % 2 ? -1 : 1;
          if (l.via === 'cebu') { segment(a, 'cebu', typeDe(LIA[a + '>cebu']), c); segment('cebu', b, typeDe(LIA['cebu>' + b]), -c); } else segment(a, b, typeDe(l), c);
        }
        let s = `<svg viewBox="${x0} ${y0} ${vw} ${vh}" role="img" aria-label="${escA('Parcours : ' + seq.map(nomNoeud).join(', '))}"><rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="#DCEAE8"/><path d="${CF.d}" fill="#F3ECDF" stroke="#BFAF92" stroke-width="${sw}" stroke-linejoin="round"/>${traces}`;
        pts.forEach((q) => {
          const [px, py] = pr(q.coord);
          s += q.entree ? `<rect x="${px - 5 * sw}" y="${py - 5 * sw}" width="${10 * sw}" height="${10 * sw}" fill="#1E2A2F" stroke="#fff" stroke-width="${1.2 * sw}" transform="rotate(45 ${px} ${py})"/>`
            : `<circle cx="${px}" cy="${py}" r="${10 * sw}" fill="#C8553D" stroke="#fff" stroke-width="${2 * sw}"/><text x="${px}" y="${py + fs * .33}" font-size="${fs * .88}" font-weight="700" fill="#fff" text-anchor="middle" font-family="Instrument Sans, system-ui, sans-serif">${q.n}</text>`;
          s += `<text class="cfg-etiq" data-x="${px}" data-y="${py}" font-size="${fs * 1.05}" font-weight="600" fill="#1E2A2F" font-family="Instrument Sans, system-ui, sans-serif" paint-order="stroke" stroke="#F3ECDF" stroke-width="${3.5 * sw}">${escA(q.nom)}${q.sous ? `<tspan font-weight="400" fill="#4A5559" font-size="${fs * .9}"> · ${escA(q.sous)}</tspan>` : ''}</text>`;
        });
        s += '</svg>';
        const icone = (d, coul, extra) => `<svg viewBox="0 0 30 12" width="30" height="12" aria-hidden="true"><path d="${d}" fill="none" stroke="${coul}" stroke-width="1.8" stroke-linecap="round" ${extra}/></svg>`;
        fig.innerHTML = `${s}<figcaption><ul class="carte-legende"><li>${icone('M2 6 H28', '#C8553D', 'stroke-dasharray="5 4"')}vol intérieur</li><li>${icone('M2 6 H28', '#0F7C82', '')}ferry</li><li>${icone('M2 6 H28', '#4A5559', '')}route</li><li><span class="carte-legende__losange" aria-hidden="true"></span>aéroport de Cebu</li></ul><span class="carte-legende__source">Contours : Natural Earth, simplifiés.</span></figcaption>`;
        // étiquettes : 6 positions essayées, la première qui ne chevauche rien
        const svg = fig.querySelector('svg'), occ = pts.map((q) => { const [px, py] = pr(q.coord); return { x: px - 11 * sw, y: py - 11 * sw, w: 22 * sw, h: 22 * sw }; });
        const rec = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        $$('.cfg-etiq', svg).forEach((t) => {
          const px = +t.dataset.x, py = +t.dataset.y, d = 14 * sw;
          const pos = [[d, fs * .35, 'start'], [-d, fs * .35, 'end'], [0, -d - 2 * sw, 'middle'], [0, d + fs * .9, 'middle'], [d, -d * .7, 'start'], [-d, -d * .7, 'end'], [d, d + fs * .5, 'start'], [-d, d + fs * .5, 'end']];
          let mieux = null;
          for (const [dx, dy, an] of pos) {
            t.setAttribute('x', px + dx); t.setAttribute('y', py + dy); t.setAttribute('text-anchor', an);
            const r = t.getBBox(), b = { x: r.x, y: r.y, w: r.width, h: r.height };
            const hors = b.x < x0 || b.x + b.w > x0 + vw || b.y < y0 || b.y + b.h > y0 + vh;
            const n = occ.filter((o) => rec(b, o)).length + (hors ? 5 : 0);
            if (!mieux || n < mieux.n) mieux = { dx, dy, an, n, b };
            if (n === 0) break;
          }
          t.setAttribute('x', px + mieux.dx); t.setAttribute('y', py + mieux.dy); t.setAttribute('text-anchor', mieux.an); occ.push(mieux.b);
        });
      });
    }

    /* ---------- résumé collant (grand écran) et barre fixe (téléphone) */
    function jauge() {
      const max = Math.max(R.total, 8500) * 1.06, w = (n) => Math.min(100, n / max * 100);
      return `<div class="jauge-cfg" role="img" aria-label="Total ${escA(eur(R.total))} ; repères à ${escA(eur(K.seuils_budget[0]))} et ${escA(eur(K.seuils_budget[1]))}">
        <span class="jauge-cfg__lib haut" style="left:${w(K.seuils_budget[0])}%">${eur(K.seuils_budget[0])}</span>
        <div class="jauge-cfg__piste"><div class="jauge-cfg__rempli ${R.total > K.seuils_budget[1] ? 'depasse' : ''}" style="width:${w(R.total)}%;--seuil:${(K.seuils_budget[1] / R.total * 100).toFixed(1)}%"></div>
          ${K.seuils_budget.map((s) => `<i style="left:${w(s)}%"></i>`).join('')}</div>
        <span class="jauge-cfg__lib bas" style="left:${w(K.seuils_budget[1])}%">${eur(K.seuils_budget[1])}</span>
      </div>`;
    }
    const ecartTexte = (rep) => { const e = R.total - rep; return e <= 0 ? `${eur(-e)} sous ${eur(rep)}` : `${eur(e)} au-dessus de ${eur(rep)}`; };
    function rendreResume() {
      const nb = { bloquant: 0, attention: 0, info: 0 }; R.alertes.forEach((a) => { nb[a.niveau]++; });
      const o = VOL[cfg.vol].o, base = PRESET[ui.base], actuel = presetIdentique(cfg);
      const ordre = ['vols_internationaux', 'vols_interieurs', 'transferts', 'hotels', 'experiences', 'repas', 'divers', 'escale'].filter((p) => R.sous_totaux[p] != null);
      $('#cfg-resume').innerHTML = `<div class="cfg-resume__in">
        <p class="etiq">Votre voyage, pour deux, tout compris</p>
        <p class="montant num" id="cfg-total" data-total="${R.total}" aria-live="polite">${eur(R.total)}</p>
        <p class="cfg-resume__ecart">${ecartTexte(8500)} · ${ecartTexte(6500)}</p>
        ${jauge()}
        <p class="petit">${pct(R.part_observee)} en prix relevés, ${pct(1 - R.part_observee)} estimés · hôtels ${R.prix_hotels === 'vpn_inde' ? 'via VPN Inde' : 'depuis la France'}</p>
        <p class="petit">${R.duree_jours} jours porte à porte : ${dateSansJour(o.depart_paris.slice(0, 10))} → ${dateSansJour(plusJours(arriveeParis(o), decal(cfg)))}</p>
        ${!actuel && base ? `<p class="petit">Par rapport ${esc(aNom(base.nom))} : <b>${eurSigne(R.total - totalPreset(base, R.prix_hotels))}</b></p>` : actuel ? `<p class="petit">C’est exactement ${esc(actuel.nom)}.</p>` : ''}
        <ul class="cfg-postes">${ordre.map((p) => `<li><i style="background:${COUL[p]}"></i><span>${esc(POSTES[p])}</span><b>${eur(R.sous_totaux[p])}</b></li>`).join('')}</ul>
        <button type="button" class="cfg-alertes-bouton ${nb.bloquant ? 'ko' : ''}" data-pas="5" data-cible="alertes" data-k="res-alertes">${nb.bloquant ? `${nb.bloquant} à corriger · ` : ''}${nb.attention} à savoir · ${nb.info} pour info</button>
        <div class="cfg-resume__actions"><button type="button" class="bouton bouton--lagon" data-action="copier" data-k="res-copier">Copier le lien</button><button type="button" class="bouton bouton--trait" data-action="imprimer" data-k="res-imprimer">Imprimer</button></div>
      </div>`;
    }
    function rendreBarre() {
      const nb = R.alertes.filter((a) => a.niveau !== 'info').length, bl = R.alertes.filter((a) => a.niveau === 'bloquant').length;
      $('#cfg-barre').innerHTML = `<span class="cfg-barre__t"><b class="num" data-total-barre="${R.total}">${eur(R.total)}</b><small>${ecartTexte(ui.repere)}</small></span>
        <button type="button" class="cfg-barre__al ${bl ? 'ko' : ''}" data-pas="5" data-cible="alertes" aria-label="${nb} alerte${nb > 1 ? 's' : ''}, voir le récapitulatif">${nb ? `${nb} alerte${nb > 1 ? 's' : ''}` : 'Récap'}</button>`;
    }
    function rendreCartesProgrammes() {
      const actuel = presetIdentique(cfg);
      $$('[data-version]').forEach((p) => {
        const id = p.dataset.version;
        if (ui.base === id && !actuel) { const b = PRESET[id]; p.hidden = false; p.innerHTML = `Votre version : <b>${eur(R.total)}</b> (${eurSigne(R.total - totalPreset(b, R.prix_hotels))} par rapport ${esc(aNom(b.nom.replace(/ :.*$/, '')))})`; }
        else { p.hidden = true; p.textContent = ''; }
      });
    }

    /* ---------- impression */
    function rendreImpression() {
      const o = VOL[cfg.vol].o, x = cfg.escale;
      const ordre = ['vols_internationaux', 'vols_interieurs', 'transferts', 'hotels', 'experiences', 'repas', 'divers', 'escale'].filter((p) => R.sous_totaux[p] != null);
      const url = (u) => (u && /^https?:/.test(u) ? `<br><span class="url">${esc(u)}</span>` : '');
      $('#impression').innerHTML = `<h1>Simon &amp; Sonya — Philippines ${versDate(cfg.date_depart).getFullYear()}</h1>
        <p class="imp-sous">Récapitulatif de la configuration « À la carte ». Prix relevés le ${dateNum(D.meta.date_observation)} ; ils bougeront. Aucune réservation n’a été faite.</p>
        <p class="imp-total"><b>${eur(R.total)}</b> pour deux, tout compris (hors assurance) · ${pct(R.part_observee)} en prix relevés · ${R.duree_jours} jours porte à porte · ${ecartTexte(8500)}</p>
        <h2>Vols</h2><p>${esc(o.compagnies.join(', '))} via ${esc(vias(o.via_aller))}${vias(o.via_retour) !== vias(o.via_aller) ? ` (retour via ${esc(vias(o.via_retour))})` : ''}, ${esc(o.cabine.toLowerCase())} : départ ${dateLongue(o.depart_paris.slice(0, 10))} à ${heure(o.depart_paris)}, retour à Paris ${dateLongue(plusJours(arriveeParis(o), decal(cfg)))}${o.arrivee_paris ? ` vers ${heure(o.arrivee_paris)} (horaire retour habituel, à confirmer)` : ' (heure du retour non relevée)'}. ${eur(o.prix_2)} (${o.statut}, ${esc(C.vols_source.site)}, ${dateNum(C.vols_source.observe_le)}).${url(o.url)}</p>
        <p>Prix des hôtels : ${R.prix_hotels === 'vpn_inde' ? 'réservés via un VPN placé en Inde' : 'réservés depuis la France'} ; total dans l’autre mode : ${eur(ecartModes(cfg, R).total)}.</p>
        ${x ? `<p>Escale : ${esc(ESC[x.ville].ville)}, ${x.nuits} nuits, ${x.mode === 'allonge' ? 'en allongeant le voyage' : 'sans allonger'}${x.chambre && CH[x.chambre] ? `, ${esc(CH[x.chambre].h.nom)} — ${esc(CH[x.chambre].c.nom)}${url(urlBooking(CH[x.chambre].h, datesEscale(cfg)))}` : ''}</p>` : ''}
        <h2>Étapes et hôtels</h2><ol>${cfg.etapes.map((e, i) => { const { h, c } = CH[e.chambre], dt = R.dates[i]; return `<li><b>${esc(ET[e.etape].nom)}</b>, ${e.nuits} nuits${dt ? ` (${dateCourte(dt.du)} → ${dateCourte(dt.au)})` : ''} : ${esc(h.nom)} — ${esc(c.nom)}${c.surface_m2 ? `, ${c.surface_m2}${NBSP}m²` : ''}${h.note_booking ? `, ${virgule(h.note_booking)}/10 (${nombre(h.nombre_avis)} avis)` : ''}${url(urlBooking(h, dt))}${e.excursions.length ? `<br>Excursions : ${e.excursions.map((id) => esc(EXC[id].nom)).join(' ; ')}` : ''}</li>`; }).join('')}</ol>
        ${cfg.moments.length ? `<p>Moments : ${cfg.moments.map((id) => esc(EXC[id].nom)).join(' ; ')}.</p>` : ''}
        <h2>Budget poste par poste</h2><table><tbody>${ordre.map((po) => R.lignes.filter((l) => l.poste === po).map((l) => `<tr><td>${esc(POSTES[po])}</td><td>${esc(l.libelle)}${l.url && l.poste !== 'hotels' && l.poste !== 'vols_internationaux' && /^https?:/.test(l.url) ? `<br><span class="url">${esc(l.url)}</span>` : ''}</td><td class="m">${eur(l.montant)}</td><td>${l.statut === 'observé' ? 'relevé' : 'estimé'}</td></tr>`).join('')).join('')}<tr class="t"><td colspan="2">Total</td><td class="m">${eur(R.total)}</td><td></td></tr></tbody></table>
        ${R.alertes.length ? `<h2>Alertes</h2><ul>${R.alertes.map((a) => `<li>${NIVEAUX[a.niveau]} : ${esc(a.message)}</li>`).join('')}</ul>` : ''}
        <p class="imp-sous">Lien de cette configuration : <span class="url">${esc(lienPartage())}</span></p>`;
    }

    /* ------------------------------------------------------------ événements */
    /* après un rendu, la commande touchée reste à la même hauteur dans la fenêtre (le contenu au-dessus peut grandir ou rétrécir) */
    const repere = (k) => { if (!k) return null; const el = racine.querySelector(`[data-k="${CSS.escape(k)}"]`); if (!el) return null; const c = el.closest('label') || el; const r = c.getBoundingClientRect(); return r.height ? r.top : null; };
    function stable(k, rendre) {
      const avant = repere(k); rendre();
      const apres = repere(k); if (avant == null || apres == null || Math.abs(apres - avant) < 1) return;
      const h = document.documentElement, sb = h.style.scrollBehavior; h.style.scrollBehavior = 'auto';
      window.scrollTo(0, window.scrollY + apres - avant); h.style.scrollBehavior = sb;
    }
    function changer(f, focus) { stable(focus, () => { f(); rendreTout({ focus }); }); }
    racine.addEventListener('click', (ev) => {
      const t = ev.target.closest('button, a'); if (!t || !racine.contains(t)) return;
      const k = t.dataset.k;
      if (t.dataset.pas) {
        ui.etape = +t.dataset.pas; rendreTout();
        const cible = t.dataset.cible === 'alertes' ? $('#cfg-alertes') || $('#cfg-titre-etape') : $('#cfg-titre-etape');
        if (cible) { cible.scrollIntoView({ behavior: N.mouvementReduit() ? 'auto' : 'smooth', block: 'start' }); if (cible.id === 'cfg-titre-etape') cible.focus({ preventScroll: true }); }
        return;
      }
      if (t.dataset.preset) { chargerPreset(t.dataset.preset, k); return; }
      if (t.dataset.mode) { if (t.dataset.mode !== cfg.prix_hotels) changer(() => { cfg.prix_hotels = t.dataset.mode; }, k); return; }
      if (t.dataset.date) { changer(() => { choisirDate(t.dataset.date); ui.mois = moisDe(t.dataset.date); }, k); return; }
      if (t.dataset.cal) { ui.mois = t.dataset.cal; stable(k, () => rendreTout({ focus: k })); return; }
      if (t.dataset.nuits) { const [i, d] = t.dataset.nuits.split(':').map(Number); changer(() => changerNuits(i, d), k); return; }
      if (t.dataset.monter) { changer(() => deplacer(+t.dataset.monter, -1), k); return; }
      if (t.dataset.descendre) { changer(() => deplacer(+t.dataset.descendre, 1), k); return; }
      if (t.dataset.retirerEtape) { changer(() => retirerEtape(+t.dataset.retirerEtape), k); return; }
      if (t.dataset.basculerEtape) { const id = t.dataset.basculerEtape, i = cfg.etapes.findIndex((e) => e.etape === id); changer(() => (i >= 0 ? retirerEtape(i) : ajouterEtape(id)), k); return; }
      if (t.dataset.ong) { ui.ong = +t.dataset.ong; stable(k, () => rendreTout({ focus: k })); return; }
      if (t.dataset.parade) { const avant = ui.etape; changer(() => executerParade(t.dataset.parade), k); if (ui.etape !== avant) $('#cfg-titre-etape').scrollIntoView({ block: 'start' }); return; }
      if (t.dataset.repasVal) { changer(() => { cfg.repas_par_jour_2 = +t.dataset.repasVal; }, k); return; }
      if (t.dataset.action === 'copier') { copier(); return; }
      if (t.dataset.action === 'imprimer') { rendreImpression(); window.print(); }
    });
    racine.addEventListener('change', (ev) => {
      const t = ev.target, k = t.dataset.k;
      if (t.name === 'cfg-vol') changer(() => { choisirVol(t.value); ui.typeVol = { cfg, type: VOL[t.value].o.type }; }, k);
      else if (t.dataset.chambre != null) changer(() => { cfg.etapes[+t.dataset.chambre].chambre = t.value; }, k);
      else if (t.dataset.filtre) { ui.filtres[t.dataset.filtre] = t.checked; stable(k, () => rendreTout({ focus: k })); }
      else if (t.dataset.tri != null) { ui.tri = t.value; stable(k, () => rendreTout({ focus: k })); }
      else if (t.dataset.exc) { const [i, id] = t.dataset.exc.split(':'); changer(() => basculerExcursion(+i, id, t.checked), k); }
      else if (t.dataset.paire) { const [i, g, p] = t.dataset.paire.split(':'); changer(() => { basculerExcursion(+i, g, false); basculerExcursion(+i, p, false); if (t.value) basculerExcursion(+i, t.value, true); }, k); }
      else if (t.dataset.moment) changer(() => { const m = cfg.moments, j = m.indexOf(t.dataset.moment); if (t.checked && j < 0) m.push(t.dataset.moment); if (!t.checked && j >= 0) m.splice(j, 1); }, k);
      else if (t.dataset.repas != null) changer(() => { cfg.repas_par_jour_2 = +t.value; }, k);
      else if (t.dataset.tp != null) changer(() => { cfg.transfert_paris = t.value; }, k);
      else if (t.dataset.ts != null) changer(() => { cfg.transferts_sur_place = t.value; }, k);
      else if (t.dataset.escale != null) changer(() => { cfg.escale = t.value ? { ville: t.value, nuits: cfg.escale ? cfg.escale.nuits : 2, mode: cfg.escale ? cfg.escale.mode : 'allonge', chambre: ESC[t.value].chiffrable ? chambreEscale(t.value) : null } : null; equilibrer(); }, k);
      else if (t.dataset.escN != null) changer(() => { cfg.escale.nuits = +t.value; equilibrer(); }, k);
      else if (t.dataset.escM != null) changer(() => { cfg.escale.mode = t.value; equilibrer(); }, k);
      else if (t.dataset.escC != null) changer(() => { cfg.escale.chambre = t.value; }, k);
    });
    // le curseur des repas : la valeur suit le doigt, le calcul se fait au relâcher (change) et en direct (input)
    racine.addEventListener('input', (ev) => { const t = ev.target; if (t.dataset.repas != null) { const o = $('#cfg-repas-val'); if (o) o.textContent = t.value; cfg.repas_par_jour_2 = +t.value; R = calculer(cfg); rendreResume(); rendreBarre(); } });
    // barre fixe : clavier sur le calendrier (flèches)
    racine.addEventListener('keydown', (ev) => {
      const b = ev.target.closest('.cal-j[data-date]'); if (!b) return;
      const pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key]; if (!pas) return;
      ev.preventDefault(); let d = b.dataset.date;
      for (let n = 0; n < 14; n++) { d = plusJours(d, pas > 0 ? Math.min(pas, 7) : Math.max(pas, -7)); if (JOUR[d]) { changer(() => { choisirDate(d); ui.mois = moisDe(d); }, 'date-' + d); return; } }
    });
    $('#cfg-barre').addEventListener('click', (ev) => { const t = ev.target.closest('[data-pas]'); if (!t) return; ui.etape = 5; rendreTout(); const c = $('#cfg-alertes') || $('#cfg-titre-etape'); if (c) c.scrollIntoView({ block: 'start' }); });
    function chargerPreset(id, focus) { stable(focus, () => { cfg = depuisPreset(id); ui.base = id; ui.mois = moisDe(cfg.date_depart); ui.ong = 0; rendreTout({ focus }); }); }
    // « Partir de ce programme » sur les cartes de la section Programmes
    document.addEventListener('click', (ev) => {
      const a = ev.target.closest('[data-partir]'); if (!a) return;
      ev.preventDefault(); cfg = depuisPreset(a.dataset.partir); ui.base = a.dataset.partir; ui.etape = 1; ui.mois = moisDe(cfg.date_depart); rendreTout();
      racine.scrollIntoView({ behavior: N.mouvementReduit() ? 'auto' : 'smooth', block: 'start' });
    });
    // « Quand partir » : un mois choisi dans la section de la version 1 règle le mois affiché du calendrier
    const ongMois = $('#mois-onglets');
    if (ongMois) ongMois.addEventListener('click', (ev) => { const b = ev.target.closest('[data-mois]'); if (!b) return; const m = MOIS_IDS.find((x) => b.dataset.mois.startsWith(x) || b.textContent.toLowerCase().includes(x)); if (m) { ui.mois = m; if (ui.etape === 1) rendreEtape(); } });
    async function copier() {
      const url = lienPartage(), zone = $('#cfg-copie');
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {
        const t = document.createElement('textarea'); t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
      }
      window.__dernierLienCopie = url;
      const msg = ok ? 'Lien copié : collez-le dans un message, la configuration s’ouvrira telle quelle.' : 'Copie impossible ici : le lien est dans la barre d’adresse.';
      if (zone) zone.textContent = msg; else { const b = $('#cfg-message'); b.hidden = false; b.textContent = msg; }
    }
    window.addEventListener('beforeprint', rendreImpression);
    window.addEventListener('hashchange', () => {
      if (!location.hash.startsWith('#cfg=')) return;
      const notes = [], h = location.hash.match(/^#cfg=([\w.-]+)$/), c = h && decoder(h[1], notes), m = $('#cfg-message');
      if (!c) { m.hidden = false; m.textContent = 'Ce lien de configuration est illisible ou d’une autre version : voici le programme recommandé.'; cfg = depuisPreset(RECO); ui.base = RECO; ui.mois = moisDe(cfg.date_depart); ui.depuisLien = true; rendreTout(); return; }
      if (notes.length) { m.hidden = false; m.textContent = `Ce lien date d’une version précédente du dossier. ${notes.join(' ')}`; } else m.hidden = true;
      const nb = baseDe(c, h[1]);
      if (encoder(c) !== encoder(cfg) || nb !== ui.base) { cfg = c; ui.base = nb; ui.mois = moisDe(c.date_depart); rendreTout(); }
    });
    let largeur = innerWidth;
    window.addEventListener('resize', () => { if (Math.abs(innerWidth - largeur) < 2) return; largeur = innerWidth; dessinerCarte(); }, { passive: true });
    if (document.fonts) document.fonts.ready.then(() => dessinerCarte());
    if ('IntersectionObserver' in window) {
      const barre = $('#cfg-barre');
      new IntersectionObserver((e) => { barre.hidden = !e[0].isIntersecting; }, { rootMargin: '0px 0px -20% 0px' }).observe(racine);
    }

    /* passerelles depuis les sections de la version 1 (leur contenu ne change pas) */
    const frise = $('#frise-prix');
    if (frise && !$('#vers-calendrier')) {
      const nb = Object.keys(JOUR).length;
      frise.insertAdjacentHTML('afterend', `<p class="passerelle" id="vers-calendrier"><a class="lien-fleche-interne" href="#a-la-carte" data-aller-pas="1">Les ${nb} départs relevés, jour par jour, avec leur prix : le calendrier À la carte</a></p>`);
    }
    const tete = $('#detail-tete');
    if (tete && !$('#vers-recap')) tete.insertAdjacentHTML('beforebegin', '<p class="passerelle" id="vers-recap" hidden></p>');
    function majPasserelles() {
      const p = $('#vers-recap'); if (!p) return;
      const actuel = presetIdentique(cfg);
      if (actuel) { p.hidden = true; return; }
      p.hidden = false;
      p.innerHTML = `Votre version à la carte : <b>${eur(R.total)}</b>. <a class="lien-fleche-interne" href="#a-la-carte" data-aller-pas="5">Son budget, sa carte et son jour par jour</a>`;
    }
    document.addEventListener('click', (ev) => { const a = ev.target.closest('[data-aller-pas]'); if (!a) return; ev.preventDefault(); ui.etape = +a.dataset.allerPas; rendreTout(); $('#cfg-titre-etape').scrollIntoView({ behavior: N.mouvementReduit() ? 'auto' : 'smooth', block: 'start' }); });

    /* ------------------------------------------------------------ démarrage */
    charger();
    ui.mois = moisDe(cfg.date_depart);
    if (ui.message) { const b = $('#cfg-message'); b.hidden = false; b.textContent = ui.message; }
    const venuParLien = !!ui.depuisLien;
    rendreTout();
    if (venuParLien) { ui.etape = 5; rendreTout(); requestAnimationFrame(() => racine.scrollIntoView({ block: 'start' })); }
    // pour la recette (scripts de contrôle) : lecture seule de l’état et du moteur
    window.ALACARTE = { calculer: (c) => { const r = calculer(c); return { total: r.total, sous_totaux: r.sous_totaux, valide: r.valide, codes: [...new Set(r.alertes.map((a) => a.code))].sort(), duree_jours: r.duree_jours, nuits_philippines: r.nuits_philippines, part_observee: r.part_observee }; },
      etat: () => copie(cfg), encoder, decoder, charger: (c) => { cfg = copie(c); ui.base = baseDe(cfg, null); rendreTout(); }, aller: (n) => { ui.etape = n; rendreTout(); }, resultat: () => ({ total: R.total, alertes: R.alertes.map((a) => a.code) }) };
    document.documentElement.dataset.alacarte = '1';
  }
})();
