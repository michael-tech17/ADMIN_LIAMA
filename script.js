/* ============================================================
   admin-script.js — Lima's Hair · Administration
   ============================================================

   POURQUOI LES RÉSERVATIONS ARRIVENT-ELLES ICI ?
   ──────────────────────────────────────────────
   Le site principal (script.js) sauvegarde chaque réservation
   dans le localStorage sous la clé "reservations".
   Cette page admin lit ce même localStorage, donc elle
   fonctionne uniquement si le gérant ouvre cette page
   sur LE MÊME appareil et navigateur que celui utilisé
   par les clients, OU si les réservations lui sont
   transmises via le lien WhatsApp (voir script.js principal).

   SOLUTION MISE EN PLACE :
   Quand un client valide sa réservation, le message WhatsApp
   envoyé au salon contient toutes les données. Le gérant
   peut aussi importer manuellement une réservation via
   l'URL d'import (fonctionnalité prévue en extension).

   ============================================================ */

/* ── Clé localStorage — doit être identique à celle du site ── */
const CLE = 'reservations';

/* ── Filtre actif ── */
let filtreActif = 'all';

/* ============================================================
   STOCKAGE
   ============================================================ */

/** Récupère toutes les réservations */
function getReservations() {
  return JSON.parse(localStorage.getItem(CLE) || '[]');
}

/** Sauvegarde la liste des réservations */
function saveReservations(liste) {
  localStorage.setItem(CLE, JSON.stringify(liste));
}

/* ============================================================
   UTILITAIRES
   ============================================================ */

/**
 * Met un numéro au format international WhatsApp (225XXXXXXXX).
 * Ajoute le préfixe ivoirien si absent.
 */
function formatNumero(tel) {
  let n = (tel || '').replace(/\D/g, '');
  if (!n.startsWith('225')) n = '225' + n.replace(/^0+/, '');
  return n;
}

/**
 * Formate une date ISO (YYYY-MM-DD) en format lisible (ex: "05 Sept. 2026")
 */
function formatDate(iso) {
  if (!iso) return '—';
  const mois = ['Jan.','Fév.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'];
  const [y, m, d] = iso.split('-');
  return `${d} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

/**
 * Ouvre WhatsApp avec un message pré-rempli pour le client.
 */
function ouvrirWhatsapp(r, message) {
  const numero = formatNumero(r.whatsapp || r.telephone);
  window.open(
    'https://wa.me/' + numero + '?text=' + encodeURIComponent(message),
    '_blank'
  );
}

/* ============================================================
   ACTIONS SUR LES RÉSERVATIONS
   ============================================================ */

/**
 * Accepte une réservation et envoie un message WhatsApp au client.
 * @param {string} id
 */
function accepter(id) {
  const reservations = getReservations();
  const r = reservations.find(x => x.id === id);
  if (!r) return;

  r.statut = 'accepté';
  saveReservations(reservations);

  ouvrirWhatsapp(
    r,
    `Bonjour ${r.nom} 🌟\n\nVotre réservation chez Lima's Hair a été confirmée !\n\n` +
    `💇‍♀️ Prestation : ${r.service}\n` +
    `📅 Date : ${formatDate(r.date)}\n` +
    `⏰ Heure : ${r.heure}\n\n` +
    `📍 I 222, Abidjan — Pâtisserie Les Merveilles de Mai\n\n` +
    `À très bientôt ! ✨`
  );

  afficher();
}

/**
 * Refuse une réservation et envoie un message WhatsApp au client.
 * @param {string} id
 */
function refuser(id) {
  const reservations = getReservations();
  const r = reservations.find(x => x.id === id);
  if (!r) return;

  r.statut = 'refusé';
  saveReservations(reservations);

  ouvrirWhatsapp(
    r,
    `Bonjour ${r.nom},\n\nNous sommes désolés, votre réservation pour "${r.service}" ` +
    `du ${formatDate(r.date)} à ${r.heure} ne peut malheureusement pas être maintenue.\n\n` +
    `N'hésitez pas à choisir une autre date sur notre site. À bientôt ! 🌿`
  );

  afficher();
}

/* ============================================================
   MISE À JOUR DES COMPTEURS
   ============================================================ */

/**
 * Met à jour tous les badges de comptage (header + filtres).
 */
function mettreAJourCompteurs(reservations) {
  const total    = reservations.length;
  const attente  = reservations.filter(r => r.statut === 'en attente').length;
  const acceptes = reservations.filter(r => r.statut === 'accepté').length;
  const refuses  = reservations.filter(r => r.statut === 'refusé').length;

  /* Header */
  document.getElementById('count-pending').textContent  = attente;
  document.getElementById('count-accepted').textContent = acceptes;
  document.getElementById('count-refused').textContent  = refuses;

  /* Filtres */
  document.getElementById('fc-all').textContent      = total;
  document.getElementById('fc-pending').textContent  = attente;
  document.getElementById('fc-accepted').textContent = acceptes;
  document.getElementById('fc-refused').textContent  = refuses;
}

/* ============================================================
   AFFICHAGE DES CARTES
   ============================================================ */

/**
 * Construit et injecte les cartes de réservation dans le DOM,
 * en tenant compte du filtre actif. Trie du plus récent au plus ancien.
 */
function afficher() {
  let reservations = getReservations().sort(
    (a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)
  );

  /* Mise à jour des compteurs avec la liste complète */
  mettreAJourCompteurs(reservations);

  /* Application du filtre */
  if (filtreActif !== 'all') {
    reservations = reservations.filter(r => r.statut === filtreActif);
  }

  const liste = document.getElementById('liste');
  const vide  = document.getElementById('vide');
  liste.innerHTML = '';

  /* Aucune réservation à afficher */
  if (reservations.length === 0) {
    vide.style.display = 'block';
    return;
  }
  vide.style.display = 'none';

  /* Génération d'une carte par réservation */
  reservations.forEach(r => {
    const carte = document.createElement('div');

    /* Classe CSS selon statut */
    const classeStatut = r.statut === 'accepté' ? 'accepte'
                       : r.statut === 'refusé'  ? 'refuse'
                       : '';
    carte.className = `carte ${classeStatut}`;

    /* Badge de statut */
    let badgeClass, badgeIcone, badgeTexte;
    if (r.statut === 'accepté') {
      badgeClass = 'badge-accepte'; badgeIcone = 'fa-check'; badgeTexte = 'Acceptée';
    } else if (r.statut === 'refusé') {
      badgeClass = 'badge-refuse'; badgeIcone = 'fa-xmark'; badgeTexte = 'Refusée';
    } else {
      badgeClass = 'badge-attente'; badgeIcone = 'fa-clock'; badgeTexte = 'En attente';
    }

    /* Ligne WhatsApp optionnelle */
    const ligneWa = (r.whatsapp && r.whatsapp !== r.telephone)
      ? `<div class="info-item">
           <span class="info-label">WhatsApp</span>
           <span class="info-value">${r.whatsapp}</span>
         </div>`
      : '';

    /* Ligne email optionnelle */
    const ligneEmail = r.email
      ? `<div class="info-item">
           <span class="info-label">Email</span>
           <span class="info-value">${r.email}</span>
         </div>`
      : '';

    /* Commentaire optionnel */
    const commentaire = r.commentaire
      ? `<div class="carte-commentaire">${r.commentaire}</div>`
      : '';

    /* Boutons : désactivés si déjà traité */
    const desactive = r.statut !== 'en attente' ? 'disabled' : '';

    carte.innerHTML = `
      <!-- En-tête : service + badge statut -->
      <div class="carte-header">
        <h2 class="carte-titre">${r.service}</h2>
        <span class="badge-statut ${badgeClass}">
          <i class="fa-solid ${badgeIcone}"></i> ${badgeTexte}
        </span>
      </div>

      <!-- Grille d'informations -->
      <div class="carte-infos">
        <div class="info-item">
          <span class="info-label">Date</span>
          <span class="info-value gold">${formatDate(r.date)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Heure</span>
          <span class="info-value gold">${r.heure}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Client</span>
          <span class="info-value">${r.nom}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Téléphone</span>
          <span class="info-value">${r.telephone}</span>
        </div>
        ${ligneWa}
        ${ligneEmail}
      </div>

      <!-- Commentaire éventuel -->
      ${commentaire}

      <!-- Boutons d'action -->
      <div class="carte-actions">
        <button class="btn-action btn-accepter" ${desactive} onclick="accepter('${r.id}')">
          <i class="fa-solid fa-check"></i> Accepter
        </button>
        <button class="btn-action btn-refuser" ${desactive} onclick="refuser('${r.id}')">
          <i class="fa-solid fa-xmark"></i> Refuser
        </button>
      </div>
    `;

    liste.appendChild(carte);
  });
}

/* ============================================================
   FILTRES
   ============================================================ */

/**
 * Branche les boutons de filtre.
 * Un clic change le filtre actif et rafraîchit l'affichage.
 */
function initFiltres() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtreActif = btn.dataset.filter;
      afficher();
    });
  });
}

/* ============================================================
   ÉCOUTE DES CHANGEMENTS localStorage
   (utile si une autre fenêtre du même navigateur envoie des données)
   ============================================================ */
window.addEventListener('storage', (e) => {
  if (e.key === CLE) afficher();
});

/* ============================================================
   INITIALISATION
   ============================================================ */
initFiltres();
afficher();
