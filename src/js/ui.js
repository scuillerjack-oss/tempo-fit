// Utilitaires d'interface partagés par les vues.
import { getExercise, CATEGORIES } from './data/exercises.js';
import { LEVELS } from './data/program.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function exName(id) {
  const e = getExercise(id);
  return e ? e.name : id;
}

export function exLink(id) {
  return `<a href="#/exercice/${esc(id)}">${esc(exName(id))}</a>`;
}

export function levelLabel(levelId) {
  return LEVELS[levelId]?.label ?? levelId;
}

export function categoryLabel(cat) {
  return CATEGORIES[cat] ?? cat;
}

export const SAFETY_SHORT =
  'Arrêtez immédiatement en cas de douleur, d’essoufflement inhabituel, de vertige ou de malaise. En cas de doute sur votre santé, demandez l’avis d’un professionnel de santé avant de commencer.';

export function safetyNote() {
  return `<p class="note note-safety" role="note"><strong>Sécurité :</strong> ${esc(SAFETY_SHORT)} <a href="#/securite">Consignes complètes</a></p>`;
}

export const LOCAL_DATA_NOTE =
  'Votre progression est enregistrée uniquement sur cet appareil, dans ce navigateur. La synchronisation entre appareils n’existe pas encore : pensez à exporter une sauvegarde.';

export function localDataNote() {
  return `<p class="note" role="note">${esc(LOCAL_DATA_NOTE)}</p>`;
}

export function chip(text, kind = '') {
  return `<span class="chip ${esc(kind)}">${esc(text)}</span>`;
}

export const STATUS_LABELS = {
  fait: 'Faite',
  aujourdhui: 'Aujourd’hui',
  'a-venir': 'À venir',
  'non-realisee': 'Non réalisée',
  repos: 'Repos',
  'repos-aujourdhui': 'Repos aujourd’hui',
};

// Petite boîte de confirmation accessible (dialog natif, repli sur confirm()).
export function confirmDialog(message, { confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false } = {}) {
  const dlg = document.createElement('dialog');
  if (typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(message));
  dlg.className = 'dialog';
  dlg.innerHTML = `<form method="dialog">
      <p>${esc(message)}</p>
      <div class="actions">
        <button value="cancel" class="btn btn-ghost">${esc(cancelLabel)}</button>
        <button value="ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmLabel)}</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok');
      dlg.remove();
    });
    dlg.showModal();
  });
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 4000);
}
