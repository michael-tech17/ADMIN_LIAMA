// ============================================================
// Firebase — initialisation
// ============================================================
import { initializeApp }                                        from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyD7N4c-eag20zZK4prNZVv4Hcg5J6iNMe0",
  authDomain:        "liama-s-hair.firebaseapp.com",
  projectId:         "liama-s-hair",
  storageBucket:     "liama-s-hair.firebasestorage.app",
  messagingSenderId: "608235589082",
  appId:             "1:608235589082:web:510273d886fb5e5d0184e3"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ============================================================
// FILTRE ACTIF
// ============================================================
let filtreActif = 'all';

// ============================================================
// UTILITAIRES
// ============================================================

/** Met un numéro au format international WhatsApp (225XXXXXXXX) */
function formatNumero(tel) {
  let n = (tel || '').replace(/\D/g, '');
  if (!n.startsWith('225')) n = '225' + n.replace(/^0+/, '');
  return n;
}

/** Formate une date ISO (YYYY-MM-DD) en format lisible */
function formatDate(iso) {
  if (!iso) return '—';
  const mois = ['Jan.','Fév.','Mars','Avr.','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'];
  const [y, m, d] = iso.split('-');
  return `${d} ${mois[parseInt(m, 10) - 1]} ${y}`;
}

/** Ouvre WhatsApp avec un message pré-rempli */
function ouvrirWhatsapp(r, message) {
  const numero = formatNumero(r.whatsapp || r.telephone);
  window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(message), '_blank');
}

// ============================================================
// ACTIONS — mise à jour du statut dans Firestore
// ============================================================

/**
 * Accepte une réservation.
 * @param {string} firestoreId  — l'ID du document Firestore (pas r.id)
 * @param {object} r            — les données de la réservation
 */
window.accepter = async function (firestoreId, r) {
  try {
    await updateDoc(doc(db, "reservations", firestoreId), { statut: 'accepté' });

    ouvrirWhatsapp(
      r,
      `Bonjour ${r.nom} 🌟\n\nVotre réservation chez Lima's Hair a été confirmée !\n\n` +
      `💇‍♀️ Prestation : ${r.service}\n` +
      `📅 Date : ${formatDate(r.date)}\n` +
      `⏰ Heure : ${r.heure}\n\n` +
      `📍 I 222, Abidjan — Pâtisserie Les Merveilles de Mai\n\n` +
      `À très bientôt ! ✨`
    );
  } catch (err) {
    console.error("Erreur lors de l'acceptation :", err);
    alert("Impossible de mettre à jour la réservation. Vérifiez votre connexion.");
  }
};

/**
 * Refuse une réservation.
 * @param {string} firestoreId
 * @param {object} r
 */
window.refuser = async function (firestoreId, r) {
  try {
    await updateDoc(doc(db, "reservations", firestoreId), { statut: 'refusé' });

    ouvrirWhatsapp(
      r,
      `Bonjour ${r.nom},\n\nNous sommes désolés, votre réservation pour "${r.service}" ` +
      `du ${formatDate(r.date)} à ${r.heure} ne peut malheureusement pas être maintenue.\n\n` +
      `N'hésitez pas à choisir une autre date sur notre site. À bientôt ! 🌿`
    );
  } catch (err) {
    console.error("Erreur lors du refus :", err);
    alert("Impossible de mettre à jour la réservation. Vérifiez votre connexion.");
  }
};

// ============================================================
// COMPTEURS
// ============================================================
function mettreAJourCompteurs(reservations) {
  const total    = reservations.length;
  const attente  = reservations.filter(r => r.statut === 'en attente').length;
  const acceptes = reservations.filter(r => r.statut === 'accepté').length;
  const refuses  = reservations.filter(r => r.statut === 'refusé').length;

  document.getElementById('count-pending').textContent  = attente;
  document.getElementById('count-accepted').textContent = acceptes;
  document.getElementById('count-refused').textContent  = refuses;

  document.getElementById('fc-all').textContent      = total;
  document.getElementById('fc-pending').textContent  = attente;
  document.getElementById('fc-accepted').textContent = acceptes;
  document.getElementById('fc-refused').textContent  = refuses;
}

// ============================================================
// AFFICHAGE DES CARTES
// ============================================================
function afficher(reservations) {
  /* Tri du plus récent au plus ancien */
  let liste = [...reservations].sort(
    (a, b) => new Date(b.dateCreation) - new Date(a.dateCreation)
  );

  mettreAJourCompteurs(liste);

  /* Application du filtre */
  if (filtreActif !== 'all') {
    liste = liste.filter(r => r.statut === filtreActif);
  }

  const conteneur = document.getElementById('liste');
  const vide      = document.getElementById('vide');
  conteneur.innerHTML = '';

  if (liste.length === 0) {
    vide.style.display = 'block';
    return;
  }
  vide.style.display = 'none';

  liste.forEach(({ firestoreId, ...r }) => {
    const carte = document.createElement('div');

    const classeStatut = r.statut === 'accepté' ? 'accepte'
                       : r.statut === 'refusé'  ? 'refuse'
                       : '';
    carte.className = `carte ${classeStatut}`;

    let badgeClass, badgeIcone, badgeTexte;
    if (r.statut === 'accepté') {
      badgeClass = 'badge-accepte'; badgeIcone = 'fa-check'; badgeTexte = 'Acceptée';
    } else if (r.statut === 'refusé') {
      badgeClass = 'badge-refuse'; badgeIcone = 'fa-xmark'; badgeTexte = 'Refusée';
    } else {
      badgeClass = 'badge-attente'; badgeIcone = 'fa-clock'; badgeTexte = 'En attente';
    }

    const ligneWa = (r.whatsapp && r.whatsapp !== r.telephone)
      ? `<div class="info-item">
           <span class="info-label">WhatsApp</span>
           <span class="info-value">${r.whatsapp}</span>
         </div>` : '';

    const ligneEmail = r.email
      ? `<div class="info-item">
           <span class="info-label">Email</span>
           <span class="info-value">${r.email}</span>
         </div>` : '';

    const commentaire = r.commentaire
      ? `<div class="carte-commentaire">${r.commentaire}</div>` : '';

    const desactive = r.statut !== 'en attente' ? 'disabled' : '';

    /* On sérialise r pour pouvoir le passer au onclick inline */
    const rJson = encodeURIComponent(JSON.stringify({ firestoreId, ...r }));

    carte.innerHTML = `
      <div class="carte-header">
        <h2 class="carte-titre">${r.service}</h2>
        <span class="badge-statut ${badgeClass}">
          <i class="fa-solid ${badgeIcone}"></i> ${badgeTexte}
        </span>
      </div>

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

      ${commentaire}

      <div class="carte-actions">
        <button class="btn-action btn-accepter" ${desactive}
          onclick='accepter("${firestoreId}", JSON.parse(decodeURIComponent("${rJson}")))'>
          <i class="fa-solid fa-check"></i> Accepter
        </button>
        <button class="btn-action btn-refuser" ${desactive}
          onclick='refuser("${firestoreId}", JSON.parse(decodeURIComponent("${rJson}")))'>
          <i class="fa-solid fa-xmark"></i> Refuser
        </button>
      </div>
    `;

    conteneur.appendChild(carte);
  });
}

// ============================================================
// FILTRES
// ============================================================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtreActif = btn.dataset.filter;
    afficher(derniereListeConnue);
  });
});

// ============================================================
// ÉCOUTE FIRESTORE EN TEMPS RÉEL (remplace localStorage)
// Un seul listener — met à jour l'affichage à chaque changement
// ============================================================
let derniereListeConnue = [];

onSnapshot(collection(db, "reservations"), (snapshot) => {
  derniereListeConnue = snapshot.docs.map(docSnap => ({
    firestoreId: docSnap.id,
    ...docSnap.data()
  }));
  afficher(derniereListeConnue);
});
