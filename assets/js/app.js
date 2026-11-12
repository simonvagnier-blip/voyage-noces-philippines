/* Simon & Sonya — Philippines 2027.
   Tout montant affiché est lu dans donnees.json (bloc intégré à la page) ou calculé à partir de ses nombres. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ données */
  const lireBloc = (id) => {
    try { const t = document.getElementById(id).textContent.trim(); return t.startsWith('<') ? null : JSON.parse(t); }
    catch (e) { return null; }
  };
  let D = lireBloc('donnees');
  let PH = lireBloc('photos') || [];

  /* ------------------------------------------------------------------ outils */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NBSP = '\u00a0', FINE = '\u202f';
  /* typographie française : espace insécable avant : ; ! ? % € et dans « » ; entre un nombre et son unité */
  const typo = (s) => String(s ?? '')
    .replace(/ ([:;!?%»])/g, FINE + '$1').replace(/ €/g, NBSP + '€').replace(/Hong Kong/g, 'Hong' + NBSP + 'Kong').replace(/« /g, '«' + FINE)
    .replace(/(\d) (\d{3})(?!\d)/g, '$1' + FINE + '$2')
    .replace(/(\d) (m²|h|min|mm|km|kg|Go|nuits|jours|PHP|°C)(?![\wÀ-ÿ])/g, '$1' + NBSP + '$2');
  const esc = (s) => typo(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escUrl = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nombre = (n) => nf.format(Math.round(Math.abs(n))).replace(/[\s\u00a0\u202f]/g, FINE);
  const eur = (n) => (n < 0 ? '−' : '') + nombre(n) + NBSP + '€';
  const eurSigne = (n) => (n > 0 ? '+' + NBSP : n < 0 ? '−' + NBSP : '') + nombre(n) + NBSP + '€';
  const pct = (x) => Math.round(x * 100) + NBSP + '%';
  const virgule = (x) => String(x).replace('.', ',');
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const versDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const jourNum = (d) => (d === 1 ? '1er' : String(d));
  const dateLongue = (iso, annee = true) => { const d = versDate(iso); return `${JOURS[d.getDay()]} ${jourNum(d.getDate())} ${MOIS[d.getMonth()]}${annee ? ' ' + d.getFullYear() : ''}`; };
  const dateSansJour = (iso, annee = true) => { const d = versDate(iso); return `${jourNum(d.getDate())} ${MOIS[d.getMonth()]}${annee ? ' ' + d.getFullYear() : ''}`; };
  const dateCourte = (iso) => { const d = versDate(iso); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const dateNum = (iso) => dateCourte(iso) + '/' + versDate(iso).getFullYear();
  const duree = (s) => String(s || '').replace(/^(\d+)h(\d+)$/, '$1' + NBSP + 'h' + NBSP + '$2');
  const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const minuscule1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const lien = (url, texte, cls = '') => (url && /^https?:\/\//.test(url)) ? `<a href="${escUrl(url)}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ''}>${texte}</a>` : texte;
  const lienFleche = (url, texte) => (url && /^https?:\/\//.test(url)) ? `<a class="lien-fleche" href="${escUrl(url)}" target="_blank" rel="noopener">${esc(texte)}</a>` : '';
  const mouvementReduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nomCourt = (p) => majuscule(p.nom.replace(/^(L'|Le |La )/, '').split(' :')[0]);
  const lieuCourt = (lieu) => lieu.split(' (')[0];
  const nomMois = (m) => m.nom.split(' ')[0].toLowerCase();                 // « mars », « avril »…
  const deMois = (m) => (/^[aeiouyàâéèêh]/i.test(nomMois(m)) ? 'd’' : 'de ') + nomMois(m);   // « de mars », « d’avril »

  /* Pastille observé / estimation, avec méthode consultable */
  const pastille = (statut, methode, extra) => {
    if (!statut) return '';
    const obs = statut === 'observé';
    const date = obs ? `Relevé le ${dateNum(D.meta.date_observation)}` : `Estimation faite le ${dateNum(D.meta.date_observation)}`;
    const detail = [methode, extra].filter(Boolean).join(' — ');
    return `<button type="button" class="pastille ${obs ? 'pastille--obs' : 'pastille--est'}" data-titre="${obs ? 'Prix observé' : 'Estimation'}" data-detail="${esc(detail)}" data-date="${esc(date)}" aria-label="${obs ? 'Prix observé' : 'Estimation'} : voir la méthode">${obs ? 'observé' : 'estim.'}</button>`;
  };

  const POSTES = {
    vols_internationaux: 'Vols internationaux', vols_interieurs: 'Vols intérieurs et bagages', transferts: 'Transferts',
    hotels: 'Hôtels', experiences: 'Sorties et moments privés', repas: 'Repas', divers: 'Divers', options: 'Variante et escale',
  };
  const COULEURS = { vols_internationaux: '#23483F', vols_interieurs: '#3F6E63', transferts: '#8A7551', hotels: '#0F7C82', experiences: '#C8553D', repas: '#D9A57B', divers: '#B9AE9A', options: '#5BA8AC' };
  const TYPES = { repos: 'Repos', sortie: 'Sortie', wow: 'Moment à part', vol: 'Trajet' };
  const ZONE_DE_LIEU = { 'El Nido': 'el_nido', Panglao: 'bohol_panglao', Boracay: 'boracay' };
  const CEBU = { nom: 'Cebu', sous: 'aéroport de Mactan', coord: [10.307, 123.979] };   // point d'entrée (coordonnées de l'aéroport)
  const PHOTO_CARTE = { essentiel: 'plage-de-l-ile-de-panglao', sur_mesure: 'plage-d-alona-panglao', grand_jeu: 'coucher-de-soleil-sur-la-baie-de-bacuit', palawan_boracay: 'white-beach-boracay' };

  let H = {}, P = {}, VOLS = {}, etat;

  const photo = (id) => PH.find((p) => p.id === id);
  const photoHtml = (ph, { cls = '', sizes = '100vw', eager = false, legende = true, alt } = {}) => {
    if (!ph) return '';
    const credit = `${esc(ph.legende)}. Photo ${lien(ph.page_commons, esc(ph.auteur))}, ${lien(ph.url_licence, esc(ph.licence))}`;
    return `<figure class="${cls}"><img src="${ph.fichier_800}" srcset="${ph.fichier_800} 800w, ${ph.fichier} ${ph.largeur}w" sizes="${sizes}" width="${ph.largeur}" height="${ph.hauteur}" alt="${esc(alt || ph.legende)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${legende ? `<figcaption>${credit}</figcaption>` : ''}</figure>`;
  };

  /* ------------------------------------------------------------------ calculs */
  const vol = (id) => VOLS[id];
  function etapeDeHotel(p, hotelId) {
    const h = H[hotelId];
    return p.etapes.findIndex((e) => e.du === h.dates_cherchees[0]);
  }
  function hotelEtape(p, i) {
    const vid = (etat.variantes[p.id] || {})[i];
    if (vid) return { h: H[vid], variante: p.options.find((o) => o.hotel_id === vid) };
    return { h: H[p.etapes[i].hotel_id] || p.hotels[i], variante: null };
  }
  function calcul(p) {
    const lignes = p.budget.lignes.map((l) => ({ ...l }));
    const v = etat.variantes[p.id] || {};
    Object.keys(v).forEach((i) => {
      const id = v[i]; if (!id) return;
      const o = p.options.find((x) => x.hotel_id === id); const h = H[id];
      lignes.push({ poste: 'options', libelle: `Variante à ${lieuCourt(p.etapes[i].lieu)} : ${o.libelle}`, montant: o.surcout, statut: h.statut_prix,
        methode: `Écart indiqué par le dossier par rapport à l'hébergement de base. Prix de ${h.nom} : ${eur(h.prix_total_sejour)} le séjour (${h.methode_prix}).`, url: h.url_booking, option: true });
    });
    const e = etat.escale[p.id], eo = p.escale_option;
    if (e === 'allongee') {
      lignes.push({ poste: 'options', libelle: `${eo.version_allongee.libelle}`, montant: eo.version_allongee.surcout, statut: eo.version_allongee.statut, methode: eo.methode, url: D.escales.cout_fixe.url_vol, option: true });
    } else if (e === 'sans_allonger') {
      const s = eo.version_sans_allonger, dc = eo.detail_cout;
      const fixe = dc.hotel_2_nuits + dc.frais_sur_place + dc.supplement_vol_estime;
      lignes.push({ poste: 'options', libelle: `Escale à ${eo.ville} : hôtel, frais sur place, marge sur le billet`, montant: fixe, statut: 'estimation', methode: eo.methode, url: D.escales.cout_fixe.url_vol, option: true });
      lignes.push({ poste: 'options', libelle: `${s.nuits_philippines_retirees} nuits de moins aux Philippines`, montant: -s.economie_philippines, statut: s.statut, methode: s.effet, url: null, option: true });
    }
    const total = lignes.reduce((a, l) => a + l.montant, 0);
    const observe = lignes.filter((l) => l.statut === 'observé').reduce((a, l) => a + l.montant, 0);
    const sous = {};
    lignes.forEach((l) => { sous[l.poste] = (sous[l.poste] || 0) + l.montant; });
    let jours = p.dates.jours_porte_a_porte, retour = p.dates.retour;
    if (e === 'allongee') { jours = eo.version_allongee.duree_totale_jours; retour = eo.version_allongee.retour_paris; }
    if (e === 'sans_allonger') { jours = eo.version_sans_allonger.duree_totale_jours; retour = eo.version_sans_allonger.retour_paris; }
    return { lignes, total, part: total > 0 ? observe / total : 0, sous, jours, retour };
  }
  const totalBase = (p) => p.budget.lignes.reduce((a, l) => a + l.montant, 0);

  /* ------------------------------------------------------------------ démarrage */
  function demarrer() {
    D.hotels.forEach((h) => { H[h.id] = h; });
    D.programmes.forEach((p) => { P[p.id] = p; p.hotels.forEach((h) => { if (!H[h.id]) H[h.id] = h; }); });
    D.mois.forEach((m) => m.vols.releves.forEach((v) => { VOLS[v.id] = v; }));
    const reco = D.programme_recommande;
    etat = { mois: D.mois[0].id, prog: reco, variantes: {}, escale: {}, compA: reco, compB: D.programmes.find((p) => p.id !== reco).id };
    D.programmes.forEach((p) => { etat.variantes[p.id] = {}; etat.escale[p.id] = 'sans'; });
    // le mois de la fenêtre recommandée est sélectionné au départ
    const moisReco = D.mois.find((m) => m.vols.releves.some((v) => v.id === D.fenetre_recommandee.principale.vol_reference));
    if (moisReco) etat.mois = moisReco.id;

    rendreOuverture();
    rendreReco();
    rendreQuand();
    rendreCartesProg();
    rendreOngletsProg();
    rendreDetail();
    rendreComparateur();
    rendreEscale();
    rendreEcartes();
    rendreResa();
    rendreFormalites();
    rendreMethode();
    brancherBulles();
    brancherNavigation();
    brancherRevelation();
    let largeur = window.innerWidth;
    window.addEventListener('resize', debounce(() => {
      if (Math.abs(window.innerWidth - largeur) < 2) return; largeur = window.innerWidth;
      rendreFrisePrix(); rendreCarte(P[etat.prog]); appliquerComparateur();
    }, 150));
    document.documentElement.dataset.pret = '1';
  }
  const debounce = (f, t) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => f(...a), t); }; };

  /* ------------------------------------------------------------------ 1. Ouverture */
  function rendreOuverture() {
    const p = P[D.programme_recommande], f = D.fenetre_recommandee.principale;
    const d = versDate(f.depart);
    $('#ouverture-photo').innerHTML = (() => {
      const ph = PH.find((x) => x.usage === 'hero') || PH[0]; if (!ph) return '';
      // Variantes haute définition (recette/fix/outils/hero.py) : portrait 1:2 pour téléphone, 2 640 px pour grand écran.
      // Les attributs media / srcset / sizes sont identiques aux deux <link rel="preload"> de index.html.
      const hd = (suffixe) => ph.fichier.replace(/\.jpg$/, suffixe + '.jpg');
      return `<picture><source media="(max-width: 700px) and (orientation: portrait)" srcset="${hd('-portrait-600')} 600w, ${hd('-portrait-1200')} 1200w" sizes="100vw" width="1200" height="2400"><img src="${ph.fichier}" srcset="${ph.fichier_800} 800w, ${ph.fichier} ${ph.largeur}w, ${hd('-2720')} 2720w" sizes="100vw" width="${ph.largeur}" height="${ph.hauteur}" alt="${esc(ph.legende)} : pitons calcaires couverts de jungle au-dessus d'une eau turquoise" fetchpriority="high"></picture><figcaption>${esc(ph.legende)} — ${lien(ph.page_commons, esc(ph.auteur))}, ${lien(ph.url_licence, esc(ph.licence))}</figcaption>`;
    })();
    $('#ouverture-sous').textContent = `Philippines, ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
    const etapes = p.etapes.map((e) => `${e.nuits} nuits à ${lieuCourt(e.lieu)}`).join(' puis ');
    $('#ouverture-phrase').innerHTML = `Notre recommandation : <em>${esc(p.nom)}</em>, ${esc(minuscule1(f.libelle))}. ${esc(majuscule(etapes))}, pour <strong class="num">${eur(totalBase(p))}</strong> à deux, tout compris.`;
    $('[data-ouvrir-reco]').addEventListener('click', () => choisirProg(D.programme_recommande, false));
  }

  /* ------------------------------------------------------------------ 2. Recommandation */
  function rendreReco() {
    const p = P[D.programme_recommande], f = D.fenetre_recommandee.principale, v = vol(f.vol_reference), vp = D.offre_reference, c = p.comparaison_vp;
    const total = totalBase(p), part = p.budget.lignes.filter((l) => l.statut === 'observé').reduce((a, l) => a + l.montant, 0) / total;
    const ecart = total - 8500;
    const parcours = ['Paris', ...p.etapes.map((e) => `<span class="insecable">${lieuCourt(e.lieu)} <span class="petit">${e.nuits}${NBSP}nuits</span></span>`), 'Paris'].map((x, i, a) => i < a.length - 1 ? `<span class="insecable">${x} <span class="fleche" aria-hidden="true">→</span></span>` : x).join(' ');
    const raisons = [p.raison_recommandation, ...p.forces].filter(Boolean);
    const chambres = p.hotels.map((h) => `${esc(h.chambre)}, ${h.surface_m2} m² (${esc(lieuCourt(h.lieu.split(', ').pop()))})`).join(' ; ');
    $('#reco').innerHTML = `
      <div class="reco">
        <div class="reco__carte">
          <span class="badge-reco badge-reco--inline">Notre recommandation</span>
          <p class="reco__nom">${esc(p.nom)}</p>
          <p class="reco__dates">${esc(f.libelle)}</p>
          <p class="reco__parcours">${parcours}</p>
          <div class="reco__total"><span class="montant">${eur(total)}</span><span>pour deux, tout compris</span></div>
          <dl class="reco__chiffres">
            <div><dt>Face au plafond de ${eur(8500)}</dt><dd class="num">${ecart <= 0 ? eur(-ecart) + ' en dessous' : eur(ecart) + ' au-dessus'}</dd></div>
            <div><dt>Part de prix observés</dt><dd class="num">${pct(part)}</dd></div>
            <div><dt>Durée</dt><dd>${p.dates.jours_porte_a_porte} jours porte à porte, ${p.dates.nuits_sur_place} nuits sur place</dd></div>
            <div><dt>Vols</dt><dd>${esc(v.compagnie)} via ${esc(v.escale_via)} : <span class="num">${eur(v.prix_2_adultes)}</span>${pastille(v.statut, `${v.source}, départ le ${dateCourte(v.depart_paris)}, arrivée à Paris le ${dateCourte(v.retour_paris)}, 2 adultes`)}</dd></div>
          </dl>
        </div>
        <div>
          <h3 class="bloc__titre">Pourquoi celui-ci</h3>
          <ol class="raisons">${raisons.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
          <p class="note-bas">${esc(D.fenetre_recommandee.definition_14_jours)}</p>
        </div>
      </div>
      <div class="vp">
        <h3 class="bloc__titre">Face à l'offre qui vous a donné l'idée</h3>
        <p class="vp__intro">${lien(vp.url, esc(vp.nom))}. ${esc(vp.reserve)}</p>
        <div class="vp__grille">
          <div class="vp__col vp__col--eux">
            <h4>Voyage Privé</h4>
            <dl>
              <div><dt>Prix pour deux</dt><dd class="num">${eur(vp.prix_2_avec_vols)}${pastille('observé', `${eur(vp.prix_par_personne_avec_vols)} par personne avec vols, affiché sur Voyage Privé`)}</dd></div>
              <div><dt>Nuits sur place</dt><dd>${vp.nuits_sur_place}</dd></div>
              <div><dt>Étapes</dt><dd>${vp.etapes}</dd></div>
              <div><dt>Route</dt><dd>${esc(vp.points_faibles[0])}</dd></div>
              <div><dt>Chambres</dt><dd>${esc(vp.inclus[1])}</dd></div>
              <div><dt>Ce que le prix comprend</dt><dd>${vp.inclus.map(esc).join(' ; ')}</dd></div>
            </dl>
          </div>
          <div class="vp__col vp__col--nous">
            <h4>${esc(p.nom)}</h4>
            <dl>
              <div><dt>Prix pour deux</dt><dd class="num">${eur(c.base_comparable)} à base comparable<br><span class="petit">${eur(total)} tout compris</span></dd></div>
              <div><dt>Nuits sur place</dt><dd>${c.nuits_programme}</dd></div>
              <div><dt>Étapes</dt><dd>${c.etapes_programme}</dd></div>
              <div><dt>Route</dt><dd>${esc(c.mieux[0])}</dd></div>
              <div><dt>Chambres</dt><dd>${chambres}</dd></div>
              <div><dt>Ce que le prix comprend</dt><dd>Vols, vols intérieurs, transferts, hôtels, ${p.experiences_incluses.length - 1} sorties et moments à deux, déjeuners et dîners</dd></div>
            </dl>
          </div>
        </div>
        <p class="vp__verdict">À base comparable, notre programme coûte <strong class="num">${eur(c.ecart_base_comparable)} de plus</strong> que l'offre Voyage Privé. Cet écart paie ${c.nuits_programme - c.nuits_vp} nuits de plus, ${c.etapes_programme} étapes au lieu de ${c.etapes_vp} et des chambres nommées et notées. <span class="petit">${esc(c.methode)}</span></p>
        <div class="vp__listes">
          <div><h4>Ce qu'on fait mieux</h4><ul class="liste-filet plus">${c.mieux.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
          <div><h4>Ce qu'on perd</h4><ul class="liste-filet moins">${c.perdu.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>
        </div>
      </div>`;
    const ph = photo('big-lagoon-el-nido');
    $('#bandeau-1').innerHTML = photoHtml(ph, { alt: 'Big Lagoon à El Nido : eau turquoise peu profonde au pied de falaises calcaires' });
  }

  /* ------------------------------------------------------------------ 3. Quand partir */
  function rendreQuand() {
    $('#quand-chapeau').innerHTML = `Prix des vols relevés le ${dateSansJour(D.meta.date_observation)} sur Kiwi.com et KAYAK, pour deux adultes, aller-retour depuis Paris. Choisissez un mois : les vols, la météo par zone et la foule se mettent à jour.`;
    const zone = $('#mois-onglets');
    const moisReco = etat.mois;
    zone.innerHTML = D.mois.map((m) => {
      const c = m.vols.meilleur_confort_prix;
      return `<button type="button" class="mois-carte" role="tab" id="onglet-${m.id}" aria-controls="mois-panneau" aria-selected="${m.id === etat.mois}" tabindex="${m.id === etat.mois ? 0 : -1}" data-mois="${m.id}">
        ${m.id === moisReco ? '<span class="mois-carte__reco">Recommandé</span>' : ''}
        <span class="mois-carte__nom">${esc(m.nom.split(' ')[0])}</span>
        <span class="mois-carte__note"><b>${virgule(m.note_globale_sur_10)}</b><span>/10</span></span>
        <span class="mois-carte__barre" aria-hidden="true"><i style="width:${m.note_globale_sur_10 * 10}%"></i></span>
        <dl><div><dt>Vol confort</dt><dd class="num">${eur(c.prix_2_adultes)}</dd></div><div><dt class="insecable">Pluie El${NBSP}Nido</dt><dd>${esc(m.meteo.el_nido.pluie_mm)} mm</dd></div></dl>
      </button>`;
    }).join('');
    tablistClavier(zone, '.mois-carte', (b) => choisirMois(b.dataset.mois, true));
    rendreMois();
    rendreFrisePrix();
    rendreFenetres();
  }
  function choisirMois(id, focus) {
    etat.mois = id;
    $$('.mois-carte').forEach((b) => { const on = b.dataset.mois === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    rendreMois(); rendreFrisePrix();
  }
  function carteVol(v, etiquette, confort) {
    const dest = v.aeroport_arrivee === 'CEB' ? 'Cebu' : 'Manille';
    return `<article class="vol ${confort ? 'vol--confort' : ''}">
      <span class="vol__etiquette">${etiquette}</span>
      <div class="vol__prix"><span class="montant">${eur(v.prix_2_adultes)}</span><small>pour deux</small>${pastille(v.statut, `${v.source}, ${v.compagnie}, départ le ${dateCourte(v.depart_paris)}, arrivée à Paris le ${dateCourte(v.retour_paris)}, 2 adultes`)}</div>
      <p class="vol__ligne">Paris → ${dest} (${esc(v.aeroport_arrivee)}) · ${esc(v.compagnie)}</p>
      <ul>
        <li>Départ ${dateLongue(v.depart_paris, false)}, retour à Paris ${dateLongue(v.retour_paris, false)} (${v.jours_porte_a_porte} jours)</li>
        <li>Via ${esc(v.escale_via)} · aller ${duree(v.duree_aller)}, retour ${duree(v.duree_retour)}</li>
        <li>${v.bagage_soute_inclus ? 'Bagage en soute compris' : '<span class="vol__sans-bagage">Sans bagage en soute</span>'}</li>
      </ul>
      ${v.note ? `<p class="vol__note">${esc(v.note)}</p>` : ''}
      ${lienFleche(v.url, 'Voir ce vol sur Kiwi.com')}
    </article>`;
  }
  function rendreMois() {
    const m = D.mois.find((x) => x.id === etat.mois);
    const releves = m.vols.releves.slice().sort((a, b) => a.prix_2_adultes - b.prix_2_adultes);
    const [fmin, fmax] = m.vols.fourchette_cebu_confort;
    const zonesParcours = new Set();
    D.programmes.forEach((p) => p.etapes.forEach((e) => { const z = ZONE_DE_LIEU[lieuCourt(e.lieu)]; if (z) zonesParcours.add(z); }));
    const zones = D.zones.slice().sort((a, b) => (zonesParcours.has(b.id) ? 1 : 0) - (zonesParcours.has(a.id) ? 1 : 0));
    const sourcesMeteo = new Set(); zones.forEach((z) => (m.meteo[z.id].sources || []).forEach((s) => sourcesMeteo.add(s)));
    const kayak = m.vols.releves_kayak.map((k) => {
      const vals = [];
      if (k.le_moins_cher_par_pers != null) vals.push(`le moins cher ${eur(k.le_moins_cher_par_pers)} (${esc(k.detail_moins_cher)})`);
      if (k.meilleur_choix_par_pers != null) vals.push(`« meilleur choix » ${eur(k.meilleur_choix_par_pers)} (${esc(k.detail_meilleur)})`);
      if (k.plus_rapide_par_pers != null) vals.push(`le plus rapide ${eur(k.plus_rapide_par_pers)} (${esc(k.detail_rapide)})`);
      if (k.des_1_escale_par_pers != null) vals.push(`dès ${eur(k.des_1_escale_par_pers)} avec une escale (${esc(k.detail)})`);
      return `<li><span class="r-dates">${esc(k.recherche)}</span><span class="r-prix">${lien(k.url, 'KAYAK')}${pastille(k.statut, `KAYAK, ${k.unite}`)}</span><span class="r-detail">Par personne : ${vals.join(' ; ')}.</span></li>`;
    }).join('');
    const panneau = $('#mois-panneau');
    panneau.setAttribute('aria-labelledby', 'onglet-' + m.id);
    panneau.innerHTML = `
      <div class="mois-tete anime-entree">
        <div class="grosse-note">${virgule(m.note_globale_sur_10)}<small>/10</small></div>
        <p>${esc(m.verdict)}</p>
      </div>
      <h3 class="sous-titre">Les vols ${esc(deMois(m))}</h3>
      <div class="vols-duo">
        ${carteVol(m.vols.meilleur_prix, 'Le moins cher', false)}
        ${carteVol(m.vols.meilleur_confort_prix, 'Le meilleur compromis', true)}
      </div>
      <p class="petit" style="margin-top:12px">Vers Cebu, sur les vols confort relevés ce mois-ci (une escale, 20 heures au plus, bagages compris) : de <span class="num">${eur(fmin)}</span> à <span class="num">${eur(fmax)}</span> pour deux.</p>
      <details class="depliant">
        <summary>Tous les vols relevés en ${esc(nomMois(m))} (${releves.length})</summary>
        <ul class="releves">${releves.map((v) => `<li>
          <span class="r-dates">${dateCourte(v.depart_paris)} → ${dateCourte(v.retour_paris)} · ${v.jours_porte_a_porte} jours</span>
          <span class="r-prix">${lien(v.url, eur(v.prix_2_adultes))}${pastille(v.statut, `${v.source}, 2 adultes, aller-retour`)}</span>
          <span class="r-detail">${esc(v.compagnie)} via ${esc(v.escale_via)}, vers ${v.aeroport_arrivee === 'CEB' ? 'Cebu' : 'Manille'} · aller ${duree(v.duree_aller)}, retour ${duree(v.duree_retour)} · ${v.bagage_soute_inclus ? 'bagage en soute compris' : 'sans bagage en soute'}${v.note ? ' · ' + esc(v.note) : ''}</span>
        </li>`).join('')}</ul>
        <p class="sous-titre" style="margin-top:18px">Contre-vérification KAYAK</p>
        <ul class="releves">${kayak}</ul>
      </details>
      <h3 class="sous-titre">La météo, zone par zone</h3>
      <div class="meteo-grille">${zones.map((z) => {
        const w = m.meteo[z.id], surParcours = zonesParcours.has(z.id);
        return `<div class="zone ${surParcours ? 'zone--parcours' : ''}">
          <div class="zone__tete"><span class="zone__nom">${esc(z.nom)}</span><span class="points" role="img" aria-label="Note ${w.note_sur_5} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= w.note_sur_5 ? 'on' : ''}"></i>`).join('')}</span></div>
          ${surParcours ? '<span class="etiquette-parcours">Sur nos parcours</span>' : '<span class="petit">Pour mémoire</span>'}
          <p class="zone__verdict">${esc(w.verdict)}</p>
          <dl>
            <div><dt>Pluie (mm)</dt><dd>${esc(w.pluie_mm)}</dd></div>
            ${w.jours_de_pluie != null ? `<div><dt>Jours de pluie</dt><dd>${esc(w.jours_de_pluie)}</dd></div>` : ''}
            <div><dt>Mer, air</dt><dd>${w.mer_c}${NBSP}°C, ${w.max_c}${NBSP}°C au plus</dd></div>
            <div><dt>Mer et vent</dt><dd>${esc(w.mer_et_vent)}</dd></div>
          </dl>
        </div>`;
      }).join('')}</div>
      <div class="sources-meteo petit"><p>Sources météo :</p><ul>${[...sourcesMeteo].map((id) => D.sources.find((s) => s.id === id)).filter(Boolean).map((s) => `<li>${lien(s.url, esc(s.titre))}</li>`).join('')}</ul></div>
      <h3 class="sous-titre">Foule, fêtes et typhons</h3>
      <div class="foule">
        <div>
          <p><span class="points points--foule" role="img" aria-label="Fréquentation ${m.foule.niveau_sur_5} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= m.foule.niveau_sur_5 ? 'on' : ''}"></i>`).join('')}</span> <strong>Fréquentation ${m.foule.niveau_sur_5}/5.</strong> ${esc(m.foule.texte)}</p>
          <p><strong>Risque de typhon :</strong> ${esc(minuscule1(m.risque_typhon))}.</p>
        </div>
        <ul class="evenements">${m.foule.evenements.map((e) => `<li><time datetime="${e.date}">${dateSansJour(e.date, false)}</time><span>${esc(e.nom)}</span></li>`).join('')}</ul>
      </div>`;
  }

  /* Frise de tous les prix relevés (SVG dessiné à la taille réelle du conteneur) */
  function rendreFrisePrix() {
    const fig = $('#frise-prix'); if (!fig) return;
    const W = Math.max(320, Math.min(fig.clientWidth || 360, 1200));
    const etroit = W < 600, Hh = etroit ? 260 : 300;
    const g = { l: etroit ? 46 : 64, r: 14, t: 34, b: 30 }, dedans = 14;   // dedans : retrait des points par rapport à l'axe
    const tous = D.mois.flatMap((m) => m.vols.releves.map((v) => ({ ...v, moisId: m.id })));
    const debut = versDate(D.mois[0].vols.releves.map((v) => v.depart_paris).sort()[0].slice(0, 7) + '-01');
    const fin = new Date(debut.getFullYear(), debut.getMonth() + D.mois.length, 1);
    const pmin = Math.floor(Math.min(...tous.map((v) => v.prix_2_adultes)) / 500) * 500;
    const pmax = Math.ceil(Math.max(...tous.map((v) => v.prix_2_adultes)) / 500) * 500;
    const x = (iso) => g.l + dedans + (versDate(iso) - debut) / (fin - debut) * (W - g.l - dedans - g.r);
    const y = (p) => g.t + (1 - (p - pmin) / (pmax - pmin)) * (Hh - g.t - g.b);
    const ref = D.fenetre_recommandee.principale.vol_reference;
    let s = `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="img" aria-labelledby="frise-titre frise-desc"><title id="frise-titre">Prix aller-retour pour deux, selon la date de départ</title><desc id="frise-desc">Chaque point est un vol relevé le ${dateNum(D.meta.date_observation)}. Vers Cebu, les prix se tiennent entre ${eur(Math.min(...tous.filter((v) => v.critere_confort && v.aeroport_arrivee === 'CEB').map((v) => v.prix_2_adultes)))} et ${eur(Math.max(...tous.filter((v) => v.aeroport_arrivee === 'CEB').map((v) => v.prix_2_adultes)))} selon le jour.</desc>`;
    D.mois.forEach((m, i) => {
      const a = new Date(debut.getFullYear(), debut.getMonth() + i, 1), b = new Date(debut.getFullYear(), debut.getMonth() + i + 1, 1);
      const xa = i === 0 ? g.l : g.l + dedans + (a - debut) / (fin - debut) * (W - g.l - dedans - g.r), xb = g.l + dedans + (b - debut) / (fin - debut) * (W - g.l - dedans - g.r);
      const on = m.id === etat.mois;
      s += `<g class="frise-mois" data-mois="${m.id}" style="cursor:pointer"><rect x="${xa}" y="${g.t - 26}" width="${xb - xa}" height="${Hh - g.t - g.b + 26}" fill="${on ? '#EFE6D6' : 'transparent'}" rx="6"/>`;
      s += `<text x="${(xa + xb) / 2}" y="${g.t - 10}" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="${etroit ? 14 : 16}" fill="${on ? '#1E2A2F' : '#4A5559'}" font-style="italic">${esc(m.nom.split(' ')[0])}</text></g>`;
      if (i > 0) s += `<line x1="${xa}" x2="${xa}" y1="${g.t - 20}" y2="${Hh - g.b}" stroke="rgba(30,42,47,.12)"/>`;
    });
    for (let p = pmin; p <= pmax; p += 500) {
      s += `<line x1="${g.l}" x2="${W - g.r}" y1="${y(p)}" y2="${y(p)}" stroke="rgba(30,42,47,.1)" stroke-dasharray="2 4"/><text x="${g.l - 6}" y="${y(p) + 4}" text-anchor="end" font-size="11" fill="#4A5559" font-family="Instrument Sans, system-ui, sans-serif">${nombre(p)}${NBSP}€</text>`;
    }
    let etiquette = '';
    tous.sort((a, b) => (a.aeroport_arrivee === 'CEB') - (b.aeroport_arrivee === 'CEB')).forEach((v) => {
      const cx = x(v.depart_paris), cy = y(v.prix_2_adultes), ceb = v.aeroport_arrivee === 'CEB';
      const titre = `${dateCourte(v.depart_paris)} → ${dateCourte(v.retour_paris)} : ${eur(v.prix_2_adultes)}, ${v.compagnie}, vers ${ceb ? 'Cebu' : 'Manille'}${v.bagage_soute_inclus ? '' : ', sans bagage en soute'}`;
      s += `<circle cx="${cx}" cy="${cy}" r="${v.id === ref ? 7 : 5.5}" fill="${ceb ? (v.critere_confort ? '#0F7C82' : '#7FB9BC') : '#F7F2E9'}" stroke="${ceb ? '#fff' : '#4A5559'}" stroke-width="1.6"><title>${esc(titre)}</title></circle>`;
      if (v.id === ref) {
        s += `<circle cx="${cx}" cy="${cy}" r="12" fill="none" stroke="#C8553D" stroke-width="1.6"/>`;
        const txt = `Votre vol, ${eur(v.prix_2_adultes)}`, tw = txt.length * 12.5 * .56, th = 14;
        const points = tous.map((o) => [x(o.depart_paris), y(o.prix_2_adultes)]);
        const zones = [...points.map(([px, py]) => ({ x: px - 9, y: py - 9, w: 18, h: 18 }))];
        let mieux = null;
        for (const dy of [-44, -36, -52, -60, 40, 48, 56]) for (const dx of [-tw / 2, 6, -tw + 6, 24, -tw - 18, -tw / 2 + 30, -tw / 2 - 30]) {
          const b = { x: cx + dx, y: cy + dy - th / 2, w: tw, h: th };
          if (b.x < g.l + 2 || b.x + b.w > W - 2 || b.y < g.t - 2 || b.y + b.h > Hh - g.b) continue;
          const n = zones.filter((z) => b.x < z.x + z.w + 3 && z.x < b.x + b.w + 3 && b.y < z.y + z.h + 3 && z.y < b.y + b.h + 3).length;
          if (!mieux || n < mieux.n || (n === mieux.n && Math.abs(dy) + Math.abs(dx + tw / 2) * .2 < mieux.d)) mieux = { ...b, n, d: Math.abs(dy) + Math.abs(dx + tw / 2) * .2 };
        }
        const b = mieux || { x: cx + 16, y: cy - 7, w: tw, h: th };
        const ax = Math.min(Math.max(cx, b.x + 8), b.x + b.w - 8), ay = b.y + b.h / 2 > cy ? b.y - 2 : b.y + b.h + 2;
        const L = Math.hypot(ax - cx, ay - cy), ux = (ax - cx) / L, uy = (ay - cy) / L;
        etiquette = `<g class="frise-etiquette"><line x1="${cx + ux * 12}" y1="${cy + uy * 12}" x2="${ax}" y2="${ay}" stroke="#C8553D" stroke-width="1.2"/><text x="${b.x}" y="${b.y + th - 3}" font-size="12.5" font-weight="600" fill="#A8432E" font-family="Instrument Sans, system-ui, sans-serif" paint-order="stroke" stroke="#F7F2E9" stroke-width="4">${txt}</text></g>`;
      }
    });
    s += etiquette + '</svg>';
    fig.innerHTML = `<h3 class="sous-titre">Tous les prix relevés, ${esc(deMois(D.mois[0]))} à ${esc(nomMois(D.mois[D.mois.length - 1]))}</h3>${s}
      <div class="frise-legende"><span><i style="background:#0F7C82"></i>Vers Cebu, vol confort</span><span><i style="background:#7FB9BC"></i>Vers Cebu, autre</span><span><i style="background:#F7F2E9;border:1.5px solid #4A5559"></i>Vers Manille (un vol intérieur de plus)</span></div>
      <figcaption>Le jour de départ compte plus que le mois : à quelques jours d'écart, le même trajet peut coûter plusieurs centaines d'euros de plus. Touchez un mois pour l'afficher.</figcaption>`;
    $$('.frise-mois', fig).forEach((gm) => gm.addEventListener('click', () => choisirMois(gm.dataset.mois, false)));
  }

  function rendreFenetres() {
    const f = D.fenetre_recommandee;
    const vp = vol(f.principale.vol_reference), vs = vol(f.seconde.vol_reference);
    const vac = D.vacances_scolaires_fr;
    $('#fenetres').innerHTML = `
      <p class="phrase-cle">Le jour de départ compte plus que le mois.</p>
      <div class="fenetres">
        <div class="fenetre fenetre--principale">
          <p class="surtitre">Fenêtre recommandée</p>
          <h3>${esc(f.principale.libelle)}</h3>
          <ul class="liste-filet">${f.principale.pourquoi.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>
        <div class="fenetre">
          <p class="surtitre">Seconde fenêtre</p>
          <h3>${esc(f.seconde.libelle)}</h3>
          <ul class="liste-filet">${f.seconde.pourquoi.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          ${vs ? `<p class="petit">Vol relevé : ${esc(vs.compagnie)}, <span class="num">${lien(vs.url, eur(vs.prix_2_adultes))}</span>${pastille(vs.statut, `${vs.source}, départ le ${dateCourte(vs.depart_paris)}, arrivée à Paris le ${dateCourte(vs.retour_paris)}, 2 adultes`)}</p>` : ''}
        </div>
      </div>
      <h3 class="sous-titre">À éviter</h3>
      <div class="a-eviter">${f.a_eviter.map((a) => `<div><b>${esc(a.periode)}</b>${esc(a.raison)}</div>`).join('')}</div>
      <h3 class="sous-titre">Vacances scolaires françaises 2027</h3>
      <div class="vacances">${vac.map((v) => `<div><h4>${esc(v.nom)}</h4><dl>${['A', 'B', 'C'].map((z) => `<div><dt>Zone ${z}</dt><dd>${esc(v['zone_' + z])}</dd></div>`).join('')}</dl></div>`).join('')}</div>
      <p class="note-bas" style="margin-top:20px"><strong>Comment sont comptés les 14 jours.</strong> ${esc(D.meta.hypotheses.find((h) => h.includes('14 jours')) || f.definition_14_jours)}</p>
      ${vp ? '' : ''}`;
  }

  /* ------------------------------------------------------------------ 4. Cartes programmes */
  function rendreCartesProg() {
    const f = D.fenetre_recommandee.principale;
    $('#prog-chapeau').textContent = `Même fenêtre (${minuscule1(f.libelle)}), mêmes vols, même logique : peu de transports, beaucoup de repos. Ce qui change : les chambres, les sorties privées et, pour l'Alternative, la seconde étape.`;
    const zone = $('#cartes-prog');
    zone.innerHTML = D.programmes.map((p) => {
      const t = totalBase(p), part = p.budget.lignes.filter((l) => l.statut === 'observé').reduce((a, l) => a + l.montant, 0) / t;
      const phare = p.hotels[p.hotels.length - 1];
      const ph = photo(PHOTO_CARTE[p.id]) || PH[0];
      return `<article class="carte-prog ${p.recommande ? 'carte-prog--reco' : ''}">
        ${p.recommande ? '<span class="badge-reco">Notre recommandation</span>' : ''}
        ${photoHtml(ph, { cls: 'carte-prog__photo', sizes: '(min-width: 1000px) 25vw, 84vw' }).replace(/<figcaption>.*<\/figcaption>/, `<figcaption>${esc(ph.legende)} — ${esc(ph.auteur)}, ${esc(ph.licence)}</figcaption>`)}
        <div class="carte-prog__corps">
          <span class="carte-prog__niveau">${esc(p.niveau)}</span>
          <h3>${esc(p.nom)}</h3>
          <div class="carte-prog__total"><span class="montant">${eur(t)}</span><small>pour deux, tout compris · ${pct(part)} observé</small></div>
          <dl>
            <div><dt>Étapes</dt><dd>${p.etapes.map((e) => `${e.nuits} nuits ${esc(lieuCourt(e.lieu))}`).join(' · ')}</dd></div>
            <div><dt>Hébergement phare</dt><dd>${esc(phare.nom)} — ${esc(minuscule1(phare.chambre))}, ${phare.surface_m2}${NBSP}m²</dd></div>
            <div><dt>Le moment à part</dt><dd>${esc(p.moment_wow)}</dd></div>
          </dl>
          <a class="bouton ${p.recommande ? 'bouton--lagon' : 'bouton--trait'}" href="#detail" data-prog="${p.id}">Voir le détail</a>
        </div>
      </article>`;
    }).join('');
    $$('[data-prog]', zone).forEach((a) => a.addEventListener('click', () => choisirProg(a.dataset.prog, false)));
    const points = $('#points-carrousel');
    points.innerHTML = D.programmes.map((p, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
    zone.addEventListener('scroll', debounce(() => {
      const cartes = $$('.carte-prog', zone); const milieu = zone.scrollLeft + zone.clientWidth / 2;
      let idx = 0, best = Infinity;
      cartes.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - milieu); if (d < best) { best = d; idx = i; } });
      $$('i', points).forEach((p, i) => p.classList.toggle('on', i === idx));
    }, 60), { passive: true });
  }

  /* ------------------------------------------------------------------ 5. Détail */
  function rendreOngletsProg() {
    const zone = $('#onglets-prog');
    zone.innerHTML = D.programmes.map((p) => `<button type="button" class="onglet-prog" role="tab" id="ong-${p.id}" aria-controls="detail-corps" aria-selected="${p.id === etat.prog}" tabindex="${p.id === etat.prog ? 0 : -1}" data-p="${p.id}">${p.recommande ? '<span class="etoile" aria-hidden="true">● </span>' : ''}${esc(nomCourt(p)).replace('-', '‑')}<small data-total-onglet="${p.id}">${eur(calculPour(p).total)}</small></button>`).join('');
    tablistClavier(zone, '.onglet-prog', (b) => choisirProg(b.dataset.p, true));
  }
  const calculPour = (p) => calcul(p);
  function choisirProg(id, focus) {
    if (!P[id]) return;
    etat.prog = id;
    $$('.onglet-prog').forEach((b) => { const on = b.dataset.p === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    rendreDetail();
  }
  function rendreDetail() {
    const p = P[etat.prog];
    $('#detail-corps').setAttribute('aria-labelledby', 'ong-' + p.id);
    $('#detail-tete').innerHTML = `<div class="detail-tete anime-entree">
      <div>
        ${p.recommande ? '<span class="badge-reco badge-reco--inline">Notre recommandation</span>' : ''}
        <p class="surtitre" id="detail-surtitre">${surtitreDetail(p)}</p>
        <h2>${esc(p.nom)}</h2>
        <p class="resume">${esc(p.resume)}</p>
      </div>
      <dl>
        <div><dt>Pour qui</dt><dd>${esc(p.pour_qui)}</dd></div>
        <div><dt>Le moment à part</dt><dd>${esc(p.moment_wow)}</dd></div>
        ${p.raison_recommandation ? `<div><dt>Pourquoi celui-ci</dt><dd>${esc(p.raison_recommandation)}</dd></div>` : ''}
      </dl>
    </div>`;
    rendreConfig(p);
    rendreCarte(p);
    rendreTrajets(p);
    majDependances(p, false);
    rendreGalerie(p);
  }
  /* surtitre du détail : niveau et dates réelles (suivent l'escale) */
  function surtitreDetail(p) {
    const c = calcul(p), e = etat.escale[p.id], ville = p.escale_option.ville;
    const quand = `du ${dateLongue(p.dates.depart, false)} au ${dateLongue(c.retour)}`;
    const avec = e === 'allongee' ? `, escale à ${ville} comprise (${c.jours} jours)` : e === 'sans_allonger' ? `, escale à ${ville} comprise` : '';
    return `${esc(p.niveau)} · ${esc(quand + avec)}`;
  }
  /* tout ce qui dépend des variantes et de l'escale */
  function majDependances(p, anime) {
    majTotal(p, anime);
    const st = $('#detail-surtitre'); if (st) st.innerHTML = surtitreDetail(p);
    rendreJours(p);
    rendreHotels(p);
    rendreBudget(p);
    rendreBilan(p);
    const t = $(`[data-total-onglet="${p.id}"]`); if (t) t.textContent = eur(calcul(p).total);
  }

  function rendreConfig(p) {
    const parEtape = {};
    p.options.forEach((o) => { const i = etapeDeHotel(p, o.hotel_id); (parEtape[i] = parEtape[i] || []).push(o); });
    const eo = p.escale_option, e = etat.escale[p.id];
    const ligneEscale = (val, titre, detail, montant, avis) => `<label><input type="radio" name="escale-${p.id}" value="${val}" ${e === val ? 'checked' : ''}><span>${titre}${avis ? '<span class="notre-avis">notre avis</span>' : ''}<span class="detail-choix">${detail}</span></span><span class="prix-choix">${montant}</span></label>`;
    const sa = eo.version_sans_allonger, al = eo.version_allongee;
    $('#config').innerHTML = `<div class="config">
      <div id="config-total"></div>
      <fieldset class="config__escale"><legend>Escale à ${esc(eo.ville)}</legend><div class="choix">
        ${ligneEscale('sans', 'Sans escale', `${p.dates.jours_porte_a_porte} jours, retour ${dateLongue(p.dates.retour, false)}`, 'inclus')}
        ${ligneEscale('allongee', `${esc(eo.ville)}, +${NBSP}${al.duree_totale_jours - p.dates.jours_porte_a_porte}${NBSP}jours`, `${al.duree_totale_jours} jours, retour ${dateLongue(al.retour_paris, false)}`, eurSigne(al.surcout), eo.recommandation === 'allongee')}
        ${ligneEscale('sans_allonger', `${esc(eo.ville)}, sans allonger`, `${sa.duree_totale_jours} jours, ${sa.nuits_philippines_retirees} nuits de moins aux Philippines`, sa.surcout < 0 ? 'économie de ' + eur(-sa.surcout) : eurSigne(sa.surcout), eo.recommandation === 'sans_allonger')}
      </div><div id="effet-escale"></div></fieldset>
      ${Object.keys(parEtape).length ? `<details class="config__variantes" open><summary>Variantes d'hébergement</summary>${Object.keys(parEtape).map((i) => {
        const base = H[p.etapes[i].hotel_id], choisi = (etat.variantes[p.id] || {})[i] || '';
        return `<p class="etape-titre">${esc(p.etapes[i].lieu)}</p><div class="choix">
          <label><input type="radio" name="var-${p.id}-${i}" value="" ${!choisi ? 'checked' : ''}><span>Comme proposé<span class="detail-choix">${esc(base.nom)}, ${esc(minuscule1(base.chambre))}</span></span><span class="prix-choix">inclus</span></label>
          ${parEtape[i].map((o) => { const h = H[o.hotel_id]; return `<label><input type="radio" name="var-${p.id}-${i}" value="${o.hotel_id}" ${choisi === o.hotel_id ? 'checked' : ''}><span>${esc(o.libelle)}<span class="detail-choix">${h.surface_m2}${NBSP}m² · ${esc(h.annulation.split(/[,(]/)[0].trim())}${h.respecte_regle_avis ? '' : ' · <b class="peu-avis">peu d\'avis</b>'}</span></span><span class="prix-choix">${o.surcout < 0 ? 'économie de ' + eur(-o.surcout) : eurSigne(o.surcout)}</span></label>`; }).join('')}
        </div>`;
      }).join('')}</details>` : ''}
    </div>`;
    $$('#config input[type=radio]').forEach((r) => r.addEventListener('change', () => {
      if (r.name.startsWith('escale-')) etat.escale[p.id] = r.value;
      else { const i = r.name.split('-').pop(); etat.variantes[p.id][i] = r.value || null; }
      majDependances(p, true);
    }));
  }

  let totalAffiche = null;
  function majTotal(p, anime) {
    const c = calcul(p), eo = p.escale_option, e = etat.escale[p.id];
    const ecart = c.total - 8500;
    const max = Math.max(c.total, 8500) * 1.08;
    const w = (n) => Math.min(100, n / max * 100);
    const ecart65 = c.total - 6500;
    $('#config-total').innerHTML = `<div class="config__total">
        <span class="etiq">Total pour deux, tout compris</span>
        <span class="montant num" id="montant-total">${eur(c.total)}</span>
        <span class="config__ecart ${ecart <= 0 ? 'dessous' : 'dessus'}">${ecart <= 0 ? eur(-ecart) + ' sous le plafond de ' + eur(8500) : eur(ecart) + ' au-dessus de ' + eur(8500)}</span>
        <span class="config__duree">${c.jours} jours porte à porte · retour à Paris ${dateLongue(c.retour)} · ${pct(c.part)} de prix observés</span>
      </div>
      <div class="jauge" role="img" aria-label="Total ${eur(c.total)} ; repères à ${eur(6500)} et ${eur(8500)}">
        <div class="jauge__piste"><div class="jauge__rempli ${ecart > 0 ? 'depasse' : ''}" style="width:${w(c.total)}%;--seuil:${(8500 / c.total * 100).toFixed(1)}%"></div></div>
        <div class="jauge__repere" style="left:${w(6500)}%"><span>${eur(6500)}</span></div>
        <div class="jauge__repere" style="left:${w(8500)}%"><span class="${w(8500) > 85 ? 'droite' : ''}">${eur(8500)}</span></div>
      </div>
      <p class="petit">${ecart65 <= 0 ? eur(-ecart65) + ' sous' : eur(ecart65) + ' au-dessus de'} ${ecart65 <= 0 ? 'le niveau de ' : ''}${eur(6500)}.</p>`;
    // effet de l'escale
    const ef = $('#effet-escale');
    if (e === 'sans') ef.innerHTML = `<p class="config__avis">${esc(eo.pourquoi)}</p>`;
    else {
      const v = e === 'allongee' ? eo.version_allongee : eo.version_sans_allonger, dc = eo.detail_cout;
      ef.innerHTML = `<div class="effet anime-entree"><strong>${esc(v.effet)}</strong>
        <ul>
          <li>Hôtel, 2 nuits : <span class="num">${eur(dc.hotel_2_nuits)}</span></li>
          <li>Frais sur place : <span class="num">${eur(dc.frais_sur_place)}</span></li>
          <li>Marge sur le billet : <span class="num">${eur(dc.supplement_vol_estime)}</span></li>
          ${e === 'sans_allonger' ? `<li>Nuits retirées aux Philippines : <span class="num">${eur(-v.economie_philippines)}</span></li>` : ''}
        </ul>
        <p style="margin:8px 0 0">Surcoût : <strong class="num">${v.surcout < 0 ? 'économie de ' + eur(-v.surcout) : eurSigne(v.surcout)}</strong>${pastille(v.statut, eo.methode)}</p>
        ${e === 'sans_allonger' && (etat.variantes[p.id] || {})[p.etapes.length - 1] ? '<p class="petit" style="margin:6px 0 0">Les nuits retirées sont chiffrées sur l\'hébergement de base de la seconde étape.</p>' : ''}
      </div><p class="config__avis">${esc(eo.pourquoi)}</p>`;
    }
    const el = $('#montant-total');
    if (anime && totalAffiche != null && totalAffiche !== c.total && !mouvementReduit()) {
      const de = totalAffiche, a = c.total, t0 = performance.now();
      el.classList.add('bouge');
      const pas = (t) => { const k = Math.min(1, (t - t0) / 240); el.textContent = eur(Math.round(de + (a - de) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(pas); else { el.textContent = eur(a); setTimeout(() => el.classList.remove('bouge'), 300); } };
      requestAnimationFrame(pas);
    }
    totalAffiche = c.total;
    $('#barre-nom').textContent = p.nom;
    $('#barre-montant').textContent = eur(c.total);
  }

  /* Carte SVG du parcours */
  function rendreCarte(p) {
    const fig = $('#carte'); const C = window.CARTE_FOND;
    if (!C) { fig.innerHTML = `<figcaption>${esc(p.etapes.map((e) => e.lieu).join(' → '))}</figcaption>`; return; }
    const pr = ([lat, lon]) => [(lon - C.lon0) * C.k * C.cos, (C.lat1 - lat) * C.k];
    const [x0] = pr([0, 117.6]), [x1] = pr([0, 125.2]), [, y0] = pr([13.15, 0]), [, y1] = pr([8.75, 0]);
    const vw = x1 - x0, vh = y1 - y0;
    const cw = Math.max(300, fig.clientWidth || 360), echelle = cw / vw, fs = 13 / echelle, sw = 1 / echelle;
    const pts = [{ nom: CEBU.nom, sous: CEBU.sous, coord: CEBU.coord, entree: true }, ...p.etapes.map((e, i) => ({ nom: lieuCourt(e.lieu), sous: `${e.nuits} nuits`, coord: e.coord, n: i + 1 }))];
    const seq = [pts[0], ...pts.slice(1), pts[0]];
    const legs = [];
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1];
      let t;
      if (a.entree) t = p.transferts.find((x) => x.de === 'Cebu');
      else if (b.entree) t = p.transferts.find((x) => x.a.startsWith('Cebu') && !x.de.startsWith('Paris'));
      else t = p.transferts.find((x) => x.de === a.nom);
      legs.push({ a, b, t, ferry: t ? (/ferry|bateau/i.test(t.mode) && !/^vol/i.test(t.mode)) : false });
    }
    const obstacles = [];   // points échantillonnés de tous les tracés : aucun libellé ne doit les couvrir
    const bez = (ax, ay, cx, cy, bx, by, t) => [(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * cx + t * t * bx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * cy + t * t * by];
    const echantillonner = (ax, ay, cx, cy, bx, by, marge = 0) => { for (let i = 0; i <= 60; i++) obstacles.push([...bez(ax, ay, cx, cy, bx, by, i / 60), marge]); };
    const chemin = (a, b, courbe, ferry) => {
      const [ax, ay] = pr(a.coord), [bx, by] = pr(b.coord);
      const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      const nx = -dy / L, ny = dx / L, k = courbe * L * 0.18;
      const cx = mx + nx * k, cy = my + ny * k;
      if (!ferry) { echantillonner(ax, ay, cx, cy, bx, by); return `M${ax},${ay} Q${cx},${cy} ${bx},${by}`; }
      // ferry : vague régulière (période ≈ 9 px à l'écran, amplitude ≈ 3 px), comme dans la légende
      const amp = 3 / echelle, vagues = Math.max(3, Math.round(L / (9 / echelle))), m = vagues * 10;
      echantillonner(ax, ay, cx, cy, bx, by, amp);
      let d = `M${ax},${ay}`;
      for (let i = 1; i <= m; i++) {
        const t = i / m, [qx, qy] = bez(ax, ay, cx, cy, bx, by, t);
        const off = Math.sin(t * vagues * 2 * Math.PI) * amp; d += ` L${(qx + nx * off).toFixed(3)},${(qy + ny * off).toFixed(3)}`;
      }
      return d;
    };
    const iles = [['Palawan', 9.95, 118.75], ['Mindoro', 12.95, 121.05], ['Panay', 11.05, 122.55], ['Negros', 9.95, 122.75], ['Bohol', 9.98, 124.28], ['Mindanao', 8.9, 124.6], ['Leyte', 10.95, 124.82], ['Cebu', 10.75, 123.82]];
    let s = `<svg viewBox="${x0} ${y0} ${vw} ${vh}" role="img" aria-labelledby="carte-t"><title id="carte-t">Parcours : ${esc(seq.map((q) => q.nom).join(', '))}</title>
      <rect x="${x0}" y="${y0}" width="${vw}" height="${vh}" fill="#DCEAE8"/>
      <path d="${C.d}" fill="#F3ECDF" stroke="#BFAF92" stroke-width="${sw}" stroke-linejoin="round"/>`;
    // vol international, vers Hong Kong et Paris (pointillé gris, nommé dans la légende)
    const [cx0, cy0] = pr(CEBU.coord), hk = [x0 + vw * .05, y0 + vh * .04], hkc = [x0 + vw * .45, y0 + vh * .02];
    echantillonner(cx0, cy0, hkc[0], hkc[1], hk[0], hk[1]);
    let traces = `<path d="M${cx0},${cy0} Q${hkc[0]},${hkc[1]} ${hk[0]},${hk[1]}" fill="none" stroke="#4A5559" stroke-width="${sw * 1.2}" stroke-dasharray="${1 * sw} ${4 * sw}" stroke-linecap="round" opacity=".7"/>`;
    legs.forEach((l, i) => {
      const courbe = i % 2 ? -1 : 1;
      traces += `<path d="${chemin(l.a, l.b, courbe, l.ferry)}" fill="none" stroke="${l.ferry ? '#0F7C82' : '#C8553D'}" stroke-width="${(l.ferry ? 1.8 : 2) * sw}" ${l.ferry ? 'stroke-linejoin="round"' : `stroke-dasharray="${6 * sw} ${5 * sw}"`} stroke-linecap="round"/>`;
    });
    // Libellés : posés après rendu et mesurés (getBBox), pour qu'aucun ne couvre un tracé, un point ou un autre libellé.
    const rr = 10 * sw, gap = 4 * sw, pad = 2.5 * sw;
    const marques = pts.map((q) => { const [px, py] = pr(q.coord); return { q, px, py, r: q.entree ? 7.5 * sw : rr + 2 * sw }; });
    const police = 'font-family="Instrument Sans, system-ui, sans-serif" paint-order="stroke" stroke="#F3ECDF"';
    s += traces;
    marques.forEach((m, i) => {
      const { q, px, py } = m;
      s += q.entree
        ? `<rect x="${px - 5 * sw}" y="${py - 5 * sw}" width="${10 * sw}" height="${10 * sw}" fill="#1E2A2F" stroke="#fff" stroke-width="${1.2 * sw}" transform="rotate(45 ${px} ${py})"/>`
        : `<circle cx="${px}" cy="${py}" r="${rr}" fill="#C8553D" stroke="#fff" stroke-width="${2 * sw}"/><text x="${px}" y="${py + fs * .36}" font-size="${fs * .9}" font-weight="700" fill="#fff" text-anchor="middle" font-family="Instrument Sans, system-ui, sans-serif">${q.n}</text>`;
      s += `<g class="carte-etiquette" data-i="${i}"><text font-size="${fs * 1.12}" font-weight="600" fill="#1E2A2F" ${police} stroke-width="${3.5 * sw}">${esc(q.nom)}</text><text font-size="${fs * .88}" fill="#4A5559" ${police} stroke-width="${3.5 * sw}">${esc(q.sous)}</text></g>`;
    });
    s += `<g class="carte-iles">${iles.filter(([n]) => n !== 'Cebu').map(([n, la, lo]) => { const [ix, iy] = pr([la, lo]); return `<text data-x="${ix}" data-y="${iy}" font-size="${fs * .85}" font-style="italic" fill="#8A7551" text-anchor="middle" font-family="Fraunces, Georgia, serif">${n}</text>`; }).join('')}</g>`;
    s += `<text class="carte-hk" font-size="${fs * .9}" fill="#4A5559" font-family="Instrument Sans, system-ui, sans-serif" paint-order="stroke" stroke="#DCEAE8" stroke-width="${3 * sw}">↖ Hong Kong, Paris</text>`;
    s += '</svg>';
    const icone = (d, coul, extra) => `<svg viewBox="0 0 30 12" width="30" height="12" aria-hidden="true"><path d="${d}" fill="none" stroke="${coul}" stroke-width="1.8" stroke-linecap="round" ${extra}/></svg>`;
    fig.innerHTML = `${s}<figcaption><ul class="carte-legende">
      <li>${icone('M2 6 H28', '#C8553D', 'stroke-dasharray="5 4"')}vol intérieur</li>
      <li>${icone('M2 6 q2.25 -4 4.5 0 t4.5 0 t4.5 0 t4.5 0 t4.5 0 t4.5 0', '#0F7C82', '')}ferry</li>
      <li>${icone('M2 6 H28', '#4A5559', 'stroke-dasharray="1 4"')}vol international (Hong${NBSP}Kong, Paris)</li>
      <li><span class="carte-legende__losange" aria-hidden="true"></span>point d’entrée (aéroport de Cebu)</li>
    </ul><span class="carte-legende__source">Contours : Natural Earth, simplifiés.</span></figcaption>`;
    const svg = fig.querySelector('svg');
    const placer = () => {
      if (!svg.isConnected) return;
      const recouvre = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const bb = (el) => { const r = el.getBBox(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const surTrace = (b) => obstacles.reduce((c, [ox, oy, mg]) => { const e = pad + (mg || 0); return c + (ox > b.x - e && ox < b.x + b.w + e && oy > b.y - e && oy < b.y + b.h + e ? 1 : 0); }, 0);
      const zonesMarques = marques.map((o) => ({ x: o.px - o.r, y: o.py - o.r, w: 2 * o.r, h: 2 * o.r }));
      const horsCadre = (b) => Math.max(0, x0 + 2 * sw - b.x) + Math.max(0, b.x + b.w - (x0 + vw - 2 * sw)) + Math.max(0, y0 + 2 * sw - b.y) + Math.max(0, b.y + b.h - (y0 + vh - 2 * sw));
      // 1. étiquettes d'étape : 8 directions × 2 distances, mesurées
      const POS = ['E', 'O', 'NE', 'NO', 'SE', 'SO', 'N', 'S'];
      const poser = (g, m, pos, loin) => {
        const tt = [...g.querySelectorAll('text')], d = m.r + gap + (loin ? 7 * sw : 0), dd = m.r * .72 + gap * .6 + (loin ? 5 * sw : 0);
        const est = /E$/.test(pos), ouest = /O$/.test(pos), nord = pos[0] === 'N', sud = pos[0] === 'S';
        const ancre = est ? 'start' : ouest ? 'end' : 'middle';
        const tx = m.px + (est ? (pos === 'E' ? d : dd) : ouest ? -(pos === 'O' ? d : dd) : 0);
        const lig = fs * 1.15, haut = fs * 1.12 * .78, bas = fs * .25;
        let y1;
        if (!nord && !sud) y1 = m.py - (lig + haut + bas) / 2 + haut;
        else if (nord) y1 = m.py - (pos === 'N' ? d : dd) - bas - lig;
        else y1 = m.py + (pos === 'S' ? d : dd) + haut;
        tt.forEach((t, k) => { t.setAttribute('x', tx); t.setAttribute('y', y1 + k * lig); t.setAttribute('text-anchor', ancre); });
        g.dataset.pos = pos + (loin ? '+' : '');
        // si le libellé sort du cadre, on le fait glisser vers l'intérieur
        const b = bb(g), m0 = 3 * sw;
        const dx = Math.max(0, x0 + m0 - b.x) - Math.max(0, b.x + b.w - (x0 + vw - m0)), dy = Math.max(0, y0 + m0 - b.y) - Math.max(0, b.y + b.h - (y0 + vh - m0));
        if (dx || dy) tt.forEach((t) => { t.setAttribute('x', +t.getAttribute('x') + dx); t.setAttribute('y', +t.getAttribute('y') + dy); });
      };
      const groupes = [...svg.querySelectorAll('.carte-etiquette')];
      const resoudre = () => {
      const cand = groupes.map((g, i) => {
        const m = marques[i], liste = [];
        for (const loin of [false, true]) for (const pos of POS) {
          poser(g, m, pos, loin); const b = bb(g);
          b.pos = pos; b.loin = loin;
          b.c = surTrace(b) * 10 + zonesMarques.filter((z) => recouvre(b, z)).length * 60 + (horsCadre(b) ? 200 + horsCadre(b) : 0) + POS.indexOf(pos) * .4 + (loin ? 3 : 0);
          liste.push(b);
        }
        return liste;
      });
      meilleur = null; best = Infinity;
      const essai = (i, choix, total) => {
        if (total >= best) return;
        if (i === groupes.length) { best = total; meilleur = choix.slice(); return; }
        for (const b of cand[i]) { const pen = choix.reduce((a, o) => a + (recouvre(b, o) ? 300 : 0), 0); choix.push(b); essai(i + 1, choix, total + b.c + pen); choix.pop(); }
      };
      essai(0, [], 0);
      return best;
      };
      // sur une carte étroite, si aucun placement n'évite les tracés, on retire la 2e ligne du point d'entrée
      // (« aéroport de Mactan », rappelé dans la légende) et on recommence
      let best = Infinity, meilleur = null;
      if (resoudre() >= 10) { const ie = marques.findIndex((m) => m.q.entree); if (ie >= 0) { groupes[ie].querySelectorAll('text')[1].remove(); resoudre(); } }
      groupes.forEach((g, i) => poser(g, marques[i], meilleur[i].pos, meilleur[i].loin));
      const occupes = [...meilleur, ...zonesMarques];
      // 2. légende du vol international, près de son extrémité
      const hkT = svg.querySelector('.carte-hk');
      const hkC = [[x0 + vw * .03, y0 + vh * .04 + fs * 1.5], [x0 + vw * .03, y0 + vh * .04 + fs * 2.6], [x0 + vw * .03, y0 + vh * .04 + fs * 3.7], [x0 + vw * .10, y0 + vh * .04 + fs * 2.6]].map(([x, y]) => { hkT.setAttribute('x', x); hkT.setAttribute('y', y); const b = bb(hkT); b.c = surTrace(b) * 10 + occupes.filter((o) => recouvre(b, o)).length * 100; b.tx = x; b.ty = y; return b; }).sort((a, b) => a.c - b.c)[0];
      hkT.setAttribute('x', hkC.tx); hkT.setAttribute('y', hkC.ty); occupes.push(hkC);
      // 3. noms d'îles : décoratifs ; décalés, ou retirés s'ils touchent quoi que ce soit
      svg.querySelectorAll('.carte-iles text').forEach((t) => {
        const ix = +t.dataset.x, iy = +t.dataset.y, h = fs * .85;
        const ok = [[0, 0], [0, -1.4 * h], [0, 1.4 * h], [-2.2 * h, 0], [2.2 * h, 0], [0, -2.6 * h], [0, 2.6 * h]].some(([dx, dy]) => {
          t.setAttribute('x', ix + dx); t.setAttribute('y', iy + dy); const b = bb(t);
          if (surTrace(b) || occupes.some((o) => recouvre(b, o)) || horsCadre(b)) return false;
          occupes.push(b); return true;
        });
        t.style.display = ok ? '' : 'none';
      });
    };
    placer();
    if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(placer);
  }
  const ICONES = {
    vol: '<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M2 14 Q15 2 28 10" fill="none" stroke="#C8553D" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="28" cy="10" r="2" fill="#C8553D"/></svg>',
    ferry: '<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M2 10 q3 -4 6 0 t6 0 t6 0 t6 0" fill="none" stroke="#0F7C82" stroke-width="1.6"/></svg>',
    route: '<svg viewBox="0 0 30 20" aria-hidden="true"><path d="M2 10 H28" stroke="#4A5559" stroke-width="1.6"/></svg>',
  };
  function rendreTrajets(p) {
    $('#trajets').innerHTML = `<ul class="trajets">${p.transferts.map((t) => {
      const type = /^vol/i.test(t.mode) ? 'vol' : /ferry|bateau/i.test(t.mode) ? 'ferry' : 'route';
      return `<li>${ICONES[type]}<span><b>${esc(t.de)} → ${esc(t.a)}</b> · ${esc(t.mode)}, ${esc(t.duree)}<span class="t-note">${esc(t.note)}</span></span></li>`;
    }).join('')}</ul>`;
  }

  function rendreJours(p) {
    const n = {}; p.jours.forEach((j) => { n[j.type] = (n[j.type] || 0) + 1; });
    const e = etat.escale[p.id], eo = p.escale_option;
    const bandeau = e === 'sans' ? '' : `<div class="bandeau-escale anime-entree"><b>Avec l'escale à ${esc(eo.ville)} (${e === 'allongee' ? 'en allongeant' : 'sans allonger'}) :</b> ${esc((e === 'allongee' ? eo.version_allongee : eo.version_sans_allonger).effet)} Le jour par jour ci-dessous reste celui du programme sans escale.<ul>${D.escales.retenue.programme_2_jours.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    $('#jours').innerHTML = `${bandeau}
      <div class="rythme" role="img" aria-label="Rythme des ${p.jours.length} jours : ${Object.keys(TYPES).filter((t) => n[t]).map((t) => `${n[t]} ${TYPES[t].toLowerCase()}`).join(', ')}">${p.jours.map((j) => `<i class="t-${j.type}" title="J${j.jour} : ${esc(TYPES[j.type])}"></i>`).join('')}</div>
      <div class="rythme-legende">${Object.keys(TYPES).filter((t) => n[t]).map((t) => `<span><i class="t-${t}"></i>${n[t]} ${n[t] > 1 ? { repos: 'jours de repos', sortie: 'sorties', wow: 'moments à part', vol: 'jours de trajet' }[t] : { repos: 'jour de repos', sortie: 'sortie', wow: 'moment à part', vol: 'jour de trajet' }[t]}</span>`).join('')}</div>
      <ol class="jours">${p.jours.map((j) => `<li class="jour jour--${j.type}">
        <div class="jour__num"><small>Jour</small>${j.jour}</div>
        <div class="jour__corps">
          <div class="jour__date"><span>${majuscule(dateLongue(j.date, false))}</span><span class="jour__type"><i class="t-${j.type}"></i>${esc(TYPES[j.type])}</span></div>
          <h4>${esc(j.titre)}</h4>
          <p>${esc(j.texte)}</p>
        </div>
      </li>`).join('')}</ol>`;
  }

  function photoLieuHotel(h, etape) {
    const l = lieuCourt(etape.lieu);
    if (h.id === 'pangulasian') return photo('ile-de-pangulasian');
    if (l === 'El Nido') return /^Île/.test(h.lieu) ? photo('coucher-de-soleil-sur-la-baie-de-bacuit') : photo('l-ile-de-cadlao-vue-des-hauteurs-d-el-nido');
    if (l === 'Panglao') return /Alona/.test(h.lieu) ? photo('plage-d-alona-panglao') : photo('plage-de-l-ile-de-panglao');
    if (l === 'Boracay') return photo('white-beach-boracay');
    return null;
  }
  function ficheHotel(h, etape, variante, reduite) {
    const ph = photoLieuHotel(h, etape);
    return `<article class="hotel">
      ${ph ? `<figure class="hotel__photo"><img src="${ph.fichier_800}" srcset="${ph.fichier_800} 800w, ${ph.fichier} ${ph.largeur}w" sizes="(min-width: 1000px) 640px, 100vw" width="${ph.largeur}" height="${ph.hauteur}" alt="${esc(ph.legende)}" loading="lazy" decoding="async"><figcaption>Photo du lieu, pas de l'hôtel : ${esc(ph.legende)} — ${lien(ph.page_commons, esc(ph.auteur))}, ${lien(ph.url_licence, esc(ph.licence))}</figcaption></figure>` : ''}
      <div class="hotel__corps">
        <span class="hotel__etape">${esc(etape.lieu)} · ${etape.nuits} nuits, du ${dateCourte(etape.du)} au ${dateCourte(etape.au)}</span>
        ${reduite ? `<p class="hotel__escale">${reduite}</p>` : ''}
        <h4>${esc(h.nom)}${variante ? '<span class="variante-tag">Variante</span>' : ''}</h4>
        <p class="hotel__lieu">${esc(h.lieu)}</p>
        <div class="note-avis"><b>${virgule(h.note_booking)}/10</b><span>${nombre(h.nombre_avis)} avis sur Booking</span>${h.respecte_regle_avis ? '' : '<span class="peu-avis">Peu d\'avis : en dessous de votre règle</span>'}</div>
        <p class="hotel__chambre">${esc(h.chambre)}, ${h.surface_m2}${NBSP}m²</p>
        <ul class="puces">${(h.atouts_chambre || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
        <dl class="hotel__prix">
          <div><dt>Le séjour (${h.nuits} nuits)</dt><dd class="num">${eur(h.prix_total_sejour)}${pastille(h.statut_prix, h.methode_prix, `dates cherchées : ${dateCourte(h.dates_cherchees[0])} → ${dateCourte(h.dates_cherchees[1])}`)}</dd></div>
          <div><dt>Soit par nuit</dt><dd class="num">${eur(h.prix_nuit)}</dd></div>
        </dl>
        <dl class="hotel__infos">
          <div><dt>Petit-déjeuner : </dt><dd>${h.petit_dejeuner_inclus ? 'compris' : 'non compris dans ce tarif'}</dd></div>
          <div><dt>Annulation : </dt><dd>${esc(minuscule1(h.annulation.replace(/^Annulation\s+/i, '')))}</dd></div>
          ${variante ? `<div><dt>Surcoût de la variante : </dt><dd class="num">${variante.surcout < 0 ? 'économie de ' + eur(-variante.surcout) : eurSigne(variante.surcout)}</dd></div>` : ''}
        </dl>
        ${h.remarque ? `<p class="petit lecture">${esc(h.remarque)}</p>` : ''}
        <div class="hotel__liens">${lienFleche(h.url_booking, 'Voir sur Booking (dates pré-remplies)')}${lienFleche(h.url_officiel, 'Site de l\'hôtel')}</div>
      </div>
    </article>`;
  }
  function rendreHotels(p) {
    const sa = p.escale_option.version_sans_allonger, avecEscale = etat.escale[p.id] === 'sans_allonger';
    $('#hotels').innerHTML = p.etapes.map((e, i) => {
      const { h, variante } = hotelEtape(p, i);
      let reduite = '';
      if (avecEscale && i === p.etapes.length - 1) {
        const d = versDate(e.au); d.setDate(d.getDate() - sa.nuits_philippines_retirees);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        reduite = `<b>${e.nuits - sa.nuits_philippines_retirees}${NBSP}nuits avec l’escale (départ le ${dateCourte(iso)}).</b> Le prix ci-dessous reste celui des ${e.nuits}${NBSP}nuits ; le budget retire déjà les nuits en moins.`;
      }
      return ficheHotel(h, e, variante, reduite);
    }).join('');
  }
  function rendreGalerie(p) {
    const lieux = new Set(['el_nido']);
    p.etapes.forEach((e) => { const l = lieuCourt(e.lieu); if (l === 'Panglao') { lieux.add('panglao'); lieux.add('bohol'); } if (l === 'Boracay') lieux.add('boracay'); });
    const exclus = new Set(['iles-calcaires-de-la-baie-de-bacuit-el-nido', 'big-lagoon-el-nido', PHOTO_CARTE[p.id]]);
    p.etapes.forEach((e, i) => { const ph = photoLieuHotel(hotelEtape(p, i).h, e); if (ph) exclus.add(ph.id); });
    const ordre = { experience: 0, ambiance: 1, etape: 2 };
    const choix = PH.filter((x) => lieux.has(x.lieu) && !exclus.has(x.id) && x.usage !== 'hero').sort((a, b) => (ordre[a.usage] ?? 3) - (ordre[b.usage] ?? 3)).slice(0, 7);
    $('#galerie').innerHTML = choix.map((ph, i) => `<figure><img src="${ph.fichier_800}" srcset="${ph.fichier_800} 800w, ${ph.fichier} ${ph.largeur}w" sizes="${i === 0 ? '(min-width: 1000px) 700px, 100vw' : '(min-width: 1000px) 240px, (min-width: 760px) 33vw, 50vw'}" width="${ph.largeur}" height="${ph.hauteur}" alt="${esc(ph.legende)}" loading="lazy" decoding="async"><figcaption>${esc(ph.legende)}<em>${lien(ph.page_commons, esc(ph.auteur))}, ${lien(ph.url_licence, esc(ph.licence))}</em></figcaption></figure>`).join('');
  }

  function rendreBudget(p) {
    const c = calcul(p);
    const ordre = [...new Set(c.lignes.map((l) => l.poste))];
    const groupes = ordre.map((po) => {
      const ls = c.lignes.filter((l) => l.poste === po), st = ls.reduce((a, l) => a + l.montant, 0);
      const obs = ls.filter((l) => l.statut === 'observé').length;
      return `<details class="poste" ${po === 'options' ? 'open' : ''} data-poste="${po}">
        <summary><span class="poste__nom">${esc(POSTES[po] || po)}<small>${ls.length} ligne${ls.length > 1 ? 's' : ''} · ${obs === ls.length ? 'tout observé' : obs === 0 ? 'estimation' : obs + ' observée' + (obs > 1 ? 's' : '')}</small></span><span class="poste__total" data-sous-total="${po}">${eur(st)}</span></summary>
        <ul class="lignes">${ls.map((l) => `<li class="${l.option ? 'l-option' : ''}"><span>${l.url ? lien(l.url, esc(l.libelle)) : esc(l.libelle)}</span><span class="l-montant" data-montant="${l.montant}">${eur(l.montant)}${pastille(l.statut, l.methode)}</span></li>`).join('')}</ul>
      </details>`;
    }).join('');
    const pos = ordre.filter((po) => c.sous[po] > 0); const somme = pos.reduce((a, po) => a + c.sous[po], 0);
    $('#budget').innerHTML = `<div class="budget">
      <div>
        ${groupes}
        <div class="budget__total"><b>Total pour deux</b><span class="montant num" data-total-budget="${c.total}">${eur(c.total)}</span>
          <p>${pct(c.part)} de ce montant repose sur des prix observés le ${dateNum(D.meta.date_observation)} ; le reste est estimé (méthode au toucher de chaque pastille). Taux : 1${NBSP}€ = ${virgule(D.meta.taux_change.EUR_PHP)} pesos.</p></div>
      </div>
      <div class="encart">
        <h4>Où va l'argent</h4>
        <div class="repartition" role="img" aria-label="Répartition du budget par poste">${pos.map((po) => `<i style="width:${(c.sous[po] / somme * 100).toFixed(2)}%;background:${COULEURS[po]}"></i>`).join('')}</div>
        <ul class="repartition-legende">${pos.map((po) => `<li><i style="background:${COULEURS[po]}"></i><span>${esc(POSTES[po])}</span><span class="pct">${pct(c.sous[po] / somme)}</span><span class="m">${eur(c.sous[po])}</span></li>`).join('')}</ul>
        <p class="petit" style="margin-top:14px">${esc(D.meta.hypotheses.find((h) => h.startsWith('Budget tout compris')) || '')}</p>
      </div>
    </div>`;
  }

  function rendreBilan(p) {
    const c = p.comparaison_vp;
    $('#bilan').innerHTML = `<div class="bilan">
        <div><h4>Points forts</h4><ul class="liste-filet plus">${p.forces.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div><h4>Points faibles</h4><ul class="liste-filet moins">${p.faiblesses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      <div class="bilan bilan--vp">
        <div><h4>Face à Voyage Privé</h4><p>À base comparable (vols, hôtels, transferts) : <strong class="num">${eur(c.base_comparable)}</strong> contre <span class="num">${eur(c.prix_vp_2)}</span>, soit <strong class="num">${eurSigne(c.ecart_base_comparable)}</strong>, pour ${c.nuits_programme} nuits au lieu de ${c.nuits_vp} et ${c.etapes_programme} étapes au lieu de ${c.etapes_vp}.</p><p class="petit">${esc(c.methode)}</p></div>
        <div><h4>Ce qu'on perd</h4><ul class="liste-filet moins">${c.perdu.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>`;
  }

  /* ------------------------------------------------------------------ 6. Comparateur */
  const estPiscine = (h) => (h.atouts_chambre || []).some((a) => /piscine privée|bassin privé/i.test(a)) || /piscine privée|avec piscine/i.test(h.chambre);
  function sorties(p) {
    return p.experiences_incluses.map((nom) => D.experiences.find((e) => e.nom === nom)).filter((e) => e && !/^(taxes|spa|diner)/.test(e.id));
  }
  function rendreComparateur() {
    const ps = D.programmes;
    const options = ps.map((p) => `<option value="${p.id}">${esc(p.nom)}</option>`).join('');
    const ligne = (critere, f, cls = '') => `<div class="comp__ligne ${cls}"><div class="comp__critere">${critere}</div>${ps.map((p) => `<div class="comp__val ${p.recommande ? 'comp__val--reco' : ''}" data-p="${p.id}">${f(p)}</div>`).join('')}</div>`;
    $('#comparateur').innerHTML = `
      <div class="comp-choix">
        <label>Programme A<select id="comp-a">${options}</select></label>
        <label>Programme B<select id="comp-b">${options}</select></label>
      </div>
      <div class="comp" id="comp">
        ${ligne('Programme', (p) => `${p.recommande ? '<small>Notre recommandation</small>' : ''}${esc(p.nom)}`, 'comp__entete')}
        ${ligne('Total pour deux', (p) => { const t = totalBase(p), part = p.budget.lignes.filter((l) => l.statut === 'observé').reduce((a, l) => a + l.montant, 0) / t; return `<span class="montant">${eur(t)}</span><br><span class="petit">${pct(part)} observé · sans variante ni escale</span>`; })}
        ${ligne(`Écart à ${eur(8500)}`, (p) => `<span class="num ${p.budget.ecart_vs_8500 <= 0 ? 'oui' : ''}">${eurSigne(p.budget.ecart_vs_8500)}</span>`)}
        ${ligne('Nuits par étape', (p) => p.etapes.map((e) => `${e.nuits} nuits à ${esc(lieuCourt(e.lieu))}`).join('<br>'))}
        ${ligne('Hôtels et chambres', (p) => `<ul>${p.hotels.filter((h) => p.etapes.some((e) => e.hotel_id === h.id)).map((h) => `<li>${lien(h.url_booking, esc(h.nom))} — ${esc(minuscule1(h.chambre))}, ${h.surface_m2}${NBSP}m² · ${virgule(h.note_booking)}/10</li>`).join('')}</ul>`)}
        ${ligne('Piscine privée', (p) => p.etapes.map((e) => { const h = H[e.hotel_id]; const oui = estPiscine(h); return `<span class="${oui ? 'oui' : 'non'}">${esc(lieuCourt(e.lieu))} : ${oui ? 'oui' : 'non'}</span>`; }).join('<br>'))}
        ${ligne('Sorties', (p) => { const s = sorties(p), pr = s.filter((x) => x.prive).length, gr = s.length - pr; return `<strong>${pr} privée${pr > 1 ? 's' : ''}${gr ? `, ${gr} en groupe` : ''}</strong><ul class="petit" style="margin-top:4px">${s.map((x) => `<li>${lien(x.url, esc(x.nom.split(' (')[0]))} · ${x.prive ? 'privé' : 'groupe'}</li>`).join('')}</ul>`; })}
        ${ligne('Vols intérieurs', (p) => { const v = p.transferts.filter((t) => /^vol/i.test(t.mode) && !t.de.startsWith('Paris')); return `${v.length} vol${v.length > 1 ? 's' : ''}<br><span class="petit">${v.map((t) => `${esc(t.de)} → ${esc(lieuCourt(t.a))}`).join(' ; ')}</span>`; })}
        ${ligne(`Escale à ${esc(D.escales.retenue.ville)}`, (p) => { const eo = p.escale_option; return `+ 2 jours : <span class="num">${eurSigne(eo.version_allongee.surcout)}</span><br>Sans allonger : <span class="num">${eo.version_sans_allonger.surcout < 0 ? 'économie de ' + eur(-eo.version_sans_allonger.surcout) : eurSigne(eo.version_sans_allonger.surcout)}</span>`; })}
        ${ligne('Face à Voyage Privé', (p) => `<span class="num">${eurSigne(p.comparaison_vp.ecart_base_comparable)}</span> à base comparable<br><span class="petit">${p.comparaison_vp.nuits_programme} nuits au lieu de ${p.comparaison_vp.nuits_vp}</span>`)}
        ${ligne('Points faibles', (p) => `<ul class="petit">${p.faiblesses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
        ${ligne('', (p) => `<a class="bouton bouton--trait" href="#detail" data-voir="${p.id}" style="width:100%">Voir le détail</a>`)}
      </div>`;
    $('#comp-a').value = etat.compA; $('#comp-b').value = etat.compB;
    $('#comp-a').addEventListener('change', (e) => { etat.compA = e.target.value; if (etat.compA === etat.compB) { etat.compB = D.programmes.find((p) => p.id !== etat.compA).id; $('#comp-b').value = etat.compB; } appliquerComparateur(); });
    $('#comp-b').addEventListener('change', (e) => { etat.compB = e.target.value; if (etat.compA === etat.compB) { etat.compA = D.programmes.find((p) => p.id !== etat.compB).id; $('#comp-a').value = etat.compA; } appliquerComparateur(); });
    $$('[data-voir]').forEach((a) => a.addEventListener('click', () => choisirProg(a.dataset.voir, false)));
    appliquerComparateur();
  }
  function appliquerComparateur() {
    $$('#comp .comp__val').forEach((v) => {
      const id = v.dataset.p;
      v.classList.toggle('cache', id !== etat.compA && id !== etat.compB);
      v.style.order = id === etat.compA ? 1 : id === etat.compB ? 2 : 3;
    });
  }

  /* ------------------------------------------------------------------ 7. Escale */
  function rendreEscale() {
    const r = D.escales.retenue, cf = D.escales.cout_fixe, mv = r.vol_multi_destinations_observe;
    const hk = PH.filter((x) => x.lieu === 'hong_kong');
    $('#bandeau-escale').innerHTML = photoHtml(hk[0], { alt: 'Le port Victoria de Hong Kong de nuit, tours illuminées' });
    const ps = D.programmes;
    $('#escale-contenu').innerHTML = `
      <p class="chapeau">${esc(r.pourquoi)}</p>
      <div class="escale-grille">
        <div>
          <h3 class="bloc__titre">Ce que coûte l'escale</h3>
          <p>Billet avec arrêt à ${esc(r.ville)} : <strong class="num">${lien(mv.url, eur(mv.prix_2_adultes))}</strong> pour deux${pastille(mv.statut, `${mv.source}, ${mv.compagnie} : ${mv.trajet}`)}, soit <span class="num">${eurSigne(mv.ecart_vs_aller_retour_simple)}</span> par rapport à l'aller-retour simple. ${esc(mv.note)}</p>
          <ul class="cout-escale">
            <li><span>Hôtel, 2 nuits</span><b class="num">${eur(cf.hotel_2_nuits)}</b></li>
            <li><span>Frais sur place (repas, transports, visites)</span><b class="num">${eur(cf.frais_sur_place)}</b></li>
            <li><span>Marge sur le billet</span><b class="num">${eur(cf.supplement_vol_estime)}</b></li>
            <li class="total"><span>Coût fixe de l'escale${pastille(cf.statut, cf.methode)}</span><b class="num">${eur(cf.total)}</b></li>
          </ul>
          <p class="petit">${esc(r.aller_ou_retour)}</p>
        </div>
        <div>
          <h3 class="bloc__titre">Deux façons de la faire</h3>
          <div class="versions">
            <div class="version version--avis"><h3>En allongeant de 2 jours</h3><p class="petit">Notre avis. Rien ne change aux Philippines.</p>
              <ul>${ps.map((p) => `<li><span>${esc(nomCourt(p))}</span><b>${eurSigne(p.escale_option.version_allongee.surcout)}</b></li>`).join('')}</ul>
              <p class="petit" style="margin-top:10px">${ps[0].escale_option.version_allongee.duree_totale_jours} jours porte à porte, retour ${dateLongue(ps[0].escale_option.version_allongee.retour_paris)}.</p></div>
            <div class="version"><h3>Sans allonger</h3><p class="petit">Deux nuits prises sur la seconde étape.</p>
              <ul>${ps.map((p) => { const s = p.escale_option.version_sans_allonger; return `<li><span>${esc(nomCourt(p))}</span><b>${s.surcout < 0 ? 'économie de ' + eur(-s.surcout) : eurSigne(s.surcout)}</b></li>`; }).join('')}</ul>
              <p class="petit" style="margin-top:10px">${esc(ps[0].escale_option.pourquoi)}</p></div>
          </div>
        </div>
      </div>
      <div class="escale-grille">
        <div>
          <h3 class="bloc__titre">Où dormir</h3>
          <div class="hotels-hk">${r.hotels.map((id) => { const h = H[id]; return `<div class="hotel-hk"><h4>${esc(h.nom)}</h4><p class="petit">${esc(h.lieu)} · ${virgule(h.note_booking)}/10, ${nombre(h.nombre_avis)} avis</p><p>${esc(h.chambre)}, ${h.surface_m2}${NBSP}m²</p><p class="num">${eur(h.prix_total_sejour)} les ${h.nuits} nuits${pastille(h.statut_prix, h.methode_prix, `dates cherchées : ${dateCourte(h.dates_cherchees[0])} → ${dateCourte(h.dates_cherchees[1])}`)}</p>${h.remarque ? `<p class="petit">${esc(h.remarque)}</p>` : ''}<div class="hotel__liens">${lienFleche(h.url_booking, 'Voir sur Booking')}${lienFleche(h.url_officiel, 'Site de l\'hôtel')}</div></div>`; }).join('')}</div>
        </div>
        <div>
          <h3 class="bloc__titre">Deux jours sur place</h3>
          <ul class="liste-filet">${r.programme_2_jours.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <h3 class="bloc__titre" style="margin-top:32px">Escales écartées</h3>
          <ul class="liste-filet">${D.escales.ecartees.map((x) => `<li><strong>${esc(x.ville)}.</strong> ${esc(x.raison)}</li>`).join('')}</ul>
        </div>
      </div>
      ${hk[1] ? photoHtml(hk[1], { cls: 'bandeau-photo', alt: 'Le port Victoria de Hong Kong de jour' }) : ''}`;
  }

  /* ------------------------------------------------------------------ 8. Écartés */
  function rendreEcartes() {
    $('#ecartes').innerHTML = D.experiences_ecartees.map((x) => `<article class="ecarte">
      <h3>${esc(x.nom)}</h3>
      <p>${esc(x.raison)} ${x.url ? lien(x.url, 'Source') : ''}</p>
      <p class="alt"><b>À la place :</b> ${esc(x.alternative)}</p>
    </article>`).join('');
  }

  /* ------------------------------------------------------------------ 9. Réserver */
  const CLE = 'simon-sonya-philippines-reservation-v1';
  function lireCoches() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
  function rendreResa() {
    const coches = lireCoches();
    const liste = D.reservation.slice().sort((a, b) => a.ordre - b.ordre);
    $('#resa').innerHTML = `<div class="resa__progres"><span id="resa-compte"></span><span class="resa__barre"><i id="resa-barre"></i></span></div>
      <ol class="resa">${liste.map((r) => `<li class="${coches[r.ordre] ? 'fait' : ''}">
        <label><input type="checkbox" data-ordre="${r.ordre}" ${coches[r.ordre] ? 'checked' : ''}><span><span class="resa__quand">${r.ordre}. ${esc(r.quand)}</span><span class="resa__quoi">${esc(r.quoi)}</span>${r.note ? `<span class="resa__note">${esc(r.note)}</span>` : ''}</span></label>
        <div class="resa__pied">${r.annulable === true ? '<span class="annul annul--oui">Annulable</span>' : r.annulable === false ? '<span class="annul annul--non">Non remboursable</span>' : ''}${lienFleche(r.url, r.ou)}</div>
      </li>`).join('')}</ol>`;
    const maj = () => {
      const c = lireCoches(), n = liste.filter((r) => c[r.ordre]).length;
      $('#resa-compte').textContent = `${n} sur ${liste.length} étapes faites`;
      $('#resa-barre').style.width = (n / liste.length * 100) + '%';
    };
    $$('#resa input').forEach((i) => i.addEventListener('change', () => {
      const c = lireCoches(); c[i.dataset.ordre] = i.checked;
      try { localStorage.setItem(CLE, JSON.stringify(c)); } catch (e) { /* navigation privée */ }
      i.closest('li').classList.toggle('fait', i.checked); maj();
    }));
    maj();
    $('#demandes').innerHTML = D.demandes_honeymoon.map((x) => `<li>${esc(x)}</li>`).join('');
    $('#risques').innerHTML = D.risques.map((x) => `<div class="risque"><b>${esc(x.risque)}</b><p>${esc(x.parade)}</p></div>`).join('');
  }

  /* ------------------------------------------------------------------ 10. Formalités */
  function rendreFormalites() {
    $('#formalites-liste').innerHTML = D.formalites.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(f.sujet)}</summary><div class="contenu"><p>${esc(f.texte)}</p>${f.url ? lienFleche(f.url, 'Source : ' + new URL(f.url).hostname.replace(/^www\./, '')) : ''}</div></details>`).join('');
  }

  /* ------------------------------------------------------------------ 11. Méthode */
  function rendreMethode() {
    const m = D.meta, t = m.taux_change;
    const remplacees = PH.filter((x) => x.remplacee);
    $('#methode').innerHTML = `
      <p class="chapeau">Tous les prix ont été relevés le ${dateLongue(m.date_observation)}. ${esc(m.unite)}</p>
      <div class="methode-grille">
        <div>
          <h3 class="bloc__titre">Deux sortes de prix</h3>
          <dl class="definitions">
            <div><dt>${pastille('observé', 'Exemple')}</dt><dd>${esc(m.statuts['observé'])}</dd></div>
            <div><dt>${pastille('estimation', 'Exemple')}</dt><dd>${esc(m.statuts.estimation)}</dd></div>
          </dl>
          <p class="petit" style="margin-top:14px">Touchez une pastille pour lire la méthode et la date du relevé.</p>
          <h3 class="bloc__titre" style="margin-top:32px">Taux de change</h3>
          <ul class="liste-filet"><li>1${NBSP}€ = ${virgule(t.EUR_PHP)} pesos philippins (${esc(t.source_php)})</li><li>1${NBSP}€ = ${virgule(t.EUR_USD)} dollars américains (${esc(t.source_usd)})</li></ul>
          <h3 class="bloc__titre" style="margin-top:32px">Hypothèses</h3>
          <ul class="liste-filet">${m.hypotheses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3 class="bloc__titre">Limites de ce dossier</h3>
          <ul class="liste-filet moins">${m.limites.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <h3 class="bloc__titre" style="margin-top:32px">Crédits photos</h3>
          <ul class="credits">${PH.map((x) => `<li>${esc(x.legende)} — ${lien(x.page_commons, esc(x.auteur))}, ${lien(x.url_licence, esc(x.licence))}, via Wikimedia Commons</li>`).join('')}</ul>
          <p class="petit" style="margin-top:10px">${esc('Photos vérifiées une à une' + (remplacees.some((x) => /Alona/.test(x.legende)) ? ' ; celle de la plage d’Alona a été remplacée par une autre vue du même lieu.' : '.'))}</p>
          <p class="petit" style="margin-top:10px">Contours de la carte : Natural Earth (domaine public), simplifiés. Aucune image ne vient de Voyage Privé ni d'un site d'hôtel.</p>
        </div>
      </div>
      <details class="depliant" style="margin-top:32px"><summary>Les ${D.sources.length} sources consultées</summary>
        <ol class="sources-liste">${D.sources.map((s) => `<li>${lien(s.url, esc(s.titre))} <span>· consulté le ${dateNum(s.consulte_le)}</span></li>`).join('')}</ol>
      </details>`;
    $('#pied-texte').innerHTML = `Dossier préparé le ${dateLongue(m.date_observation)}. Les prix « observés » ont été lus ce jour-là et bougeront ; les estimations sont à faire confirmer. Aucune réservation n'a été faite, aucun compte créé. Page privée, non référencée.`;
  }

  /* ------------------------------------------------------------------ Interactions communes */
  function tablistClavier(zone, sel, choisir) {
    zone.addEventListener('click', (e) => { const b = e.target.closest(sel); if (b) choisir(b); });
    zone.addEventListener('keydown', (e) => {
      const bs = $$(sel, zone), i = bs.indexOf(document.activeElement); if (i < 0) return;
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % bs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + bs.length) % bs.length;
      if (e.key === 'Home') j = 0; if (e.key === 'End') j = bs.length - 1;
      if (j != null) { e.preventDefault(); choisir(bs[j]); }
    });
  }

  function brancherBulles() {
    /* Ouverture : survol (souris), focus clavier, ou clic / toucher.
       Un toucher déclenche focusin PUIS click : le click ne referme que si la bulle a été
       épinglée par un click précédent sur la même pastille (« par === 'clic' »). */
    const bulle = $('#bulle'); let cible = null, par = null;
    const placer = (b) => {
      const r = b.getBoundingClientRect(), bw = bulle.offsetWidth, bh = bulle.offsetHeight;
      let left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - 12);
      let top = r.top - bh - 10; if (top < 64) top = r.bottom + 10;
      bulle.style.left = left + 'px'; bulle.style.top = top + 'px';
    };
    const montrer = (b, origine) => {
      if (cible === b && par === 'clic' && origine !== 'clic') return;   // déjà épinglée
      cible = b; par = origine;
      bulle.innerHTML = `<strong>${esc(b.dataset.titre)}</strong>${esc(b.dataset.detail)}<span class="bulle__date">${esc(b.dataset.date)}</span>`;
      bulle.hidden = false; placer(b);
      b.setAttribute('aria-describedby', 'bulle');
    };
    const cacher = () => { if (cible) cible.removeAttribute('aria-describedby'); cible = null; par = null; bulle.hidden = true; };
    const survol = () => window.matchMedia('(hover: hover)').matches;
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.pastille');
      if (b) { e.preventDefault(); e.stopPropagation(); if (cible === b && par === 'clic') cacher(); else montrer(b, 'clic'); return; }
      if (!e.target.closest('#bulle')) cacher();
    });
    document.addEventListener('mouseover', (e) => { const b = e.target.closest('.pastille'); if (b && survol() && cible !== b) montrer(b, 'survol'); });
    document.addEventListener('mouseout', (e) => { const b = e.target.closest('.pastille'); if (b && survol() && par === 'survol' && !b.contains(e.relatedTarget)) cacher(); });
    document.addEventListener('focusin', (e) => { const b = e.target.closest('.pastille'); if (b) { if (cible !== b) montrer(b, 'focus'); } else if (cible) cacher(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cacher(); });
    // au défilement, la bulle suit sa pastille ; elle se ferme quand la pastille quitte l'écran
    // (fermer à chaque défilement la ferait disparaître sur mobile : barre d'adresse, images qui se chargent)
    let image = 0;
    window.addEventListener('scroll', () => {
      if (!cible || image) return;
      image = requestAnimationFrame(() => {
        image = 0; if (!cible) return;
        const r = cible.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight || !cible.isConnected) cacher(); else placer(cible);
      });
    }, { passive: true });
  }

  function brancherNavigation() {
    const liens = $$('.sommaire a');
    const cibles = liens.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          liens.forEach((a) => {
            const on = a.getAttribute('href') === '#' + en.target.id;
            a.setAttribute('aria-current', on ? 'true' : 'false');
            if (on) { const nav = a.closest('.sommaire'); const x = a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2; nav.scrollTo({ left: x, behavior: mouvementReduit() ? 'auto' : 'smooth' }); }
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      cibles.forEach((c) => io.observe(c));
      // barre de total mobile : visible dans le détail, hors du panneau de réglage
      const barre = $('#barre-total'); let dansDetail = false, configVisible = false;
      const majBarre = () => { barre.hidden = !(dansDetail && !configVisible); };
      new IntersectionObserver((e) => { dansDetail = e[0].isIntersecting; majBarre(); }, { rootMargin: '-30% 0px -30% 0px' }).observe($('#detail-corps'));
      new IntersectionObserver((e) => { configVisible = e[0].isIntersecting; majBarre(); }).observe($('#config'));
    }
  }

  function brancherRevelation() {
    if (!('IntersectionObserver' in window) || mouvementReduit()) return;
    const els = $$('.reco__carte, .vp__grille, .fenetre, .carte-prog, .ecarte, .version, .mois-onglets, .frise-prix');
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('vu'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top > window.innerHeight) { el.classList.add('revele'); io.observe(el); } });
  }

  /* ------------------------------------------------------------------ amorçage */
  if (D) demarrer();
  else {   // repli : le bloc intégré est absent ou illisible
    fetch('assets/donnees.json').then((r) => r.json()).then((j) => { D = j; return fetch('assets/photos.json').then((r) => r.json()).catch(() => []); })
      .then((p) => { PH = p || []; demarrer(); })
      .catch(() => { document.getElementById('contenu').insertAdjacentHTML('afterbegin', '<p class="sans-js">Les données du dossier n\'ont pas pu être lues.</p>'); });
  }
})();
