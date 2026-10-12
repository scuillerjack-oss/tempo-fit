import { today } from '../lib/dates.js';
import { esc, levelLabel, localDataNote, confirmDialog, toast } from '../ui.js';
import { canInstall, promptInstall } from '../pwa.js';

export function renderSettings(ctx) {
  const { profile, settings } = ctx.state;
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  ctx.root.innerHTML = `<h1>Réglages</h1>
    <section class="card" aria-labelledby="h-plan">
      <h2 id="h-plan">Mon plan</h2>
      ${
        profile
          ? `<p>${esc(levelLabel(profile.levelId))} · cycle ${profile.cycle} · début le ${esc(profile.startDate)}${profile.lowImpact ? ' · sans saut' : ''}</p>
        <a class="btn btn-secondary" href="#/demarrer">Changer de niveau, de date ou d’options</a>`
          : '<a class="btn btn-primary" href="#/demarrer">Créer mon plan</a>'
      }
    </section>
    <section class="card" aria-labelledby="h-guide">
      <h2 id="h-guide">Séance guidée</h2>
      <label class="check"><input type="checkbox" id="sound" ${settings.sound ? 'checked' : ''}> <span>Signaux sonores</span></label>
      <label class="check"><input type="checkbox" id="vibration" ${settings.vibration ? 'checked' : ''}> <span>Vibrations (si l’appareil le permet)</span></label>
    </section>
    <section class="card" aria-labelledby="h-install">
      <h2 id="h-install">Installer l’application (facultatif)</h2>
      ${
        isStandalone
          ? '<p>TEMPO FIT est déjà ouverte comme application installée.</p>'
          : `<p>Le site fonctionne entièrement dans le navigateur. Vous pouvez aussi l’ajouter à votre écran d’accueil :</p>
        <button class="btn btn-secondary" id="install" ${canInstall() ? '' : 'hidden'}>Installer TEMPO FIT</button>
        <ul>
          <li><strong>Android (Chrome)</strong> : menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».</li>
          <li><strong>iPhone / iPad (Safari)</strong> : bouton Partager → « Sur l’écran d’accueil ».</li>
          <li><strong>Ordinateur (Chrome, Edge)</strong> : icône d’installation dans la barre d’adresse.</li>
        </ul>`
      }
    </section>
    <section class="card" aria-labelledby="h-data">
      <h2 id="h-data">Mes données</h2>
      ${localDataNote()}
      <div class="actions">
        <button class="btn btn-secondary" id="export">Exporter une sauvegarde</button>
        <label class="btn btn-secondary file-btn">Importer une sauvegarde<input type="file" id="import" accept="application/json,.json" class="sr-only"></label>
      </div>
      <p class="hint">La sauvegarde est un petit fichier JSON que vous pouvez conserver ou transférer vers un autre appareil.</p>
      <button class="btn btn-danger" id="reset">Effacer toutes mes données</button>
    </section>`;

  const bind = (id, key) =>
    ctx.root.querySelector(`#${id}`).addEventListener('change', (e) => {
      ctx.storage.update((s) => {
        s.settings[key] = e.target.checked;
      });
    });
  bind('sound', 'sound');
  bind('vibration', 'vibration');

  const installBtn = ctx.root.querySelector('#install');
  const onInstallable = () => installBtn && (installBtn.hidden = false);
  document.addEventListener('tempofit:installable', onInstallable);
  installBtn?.addEventListener('click', async () => {
    const accepted = await promptInstall();
    installBtn.hidden = true;
    if (accepted) toast('Application installée.');
  });

  ctx.root.querySelector('#export').addEventListener('click', () => {
    const blob = new Blob([ctx.storage.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tempo-fit-sauvegarde-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  ctx.root.querySelector('#import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1_000_000) return toast('Fichier trop volumineux pour une sauvegarde TEMPO FIT.');
    const ok = await confirmDialog('Importer cette sauvegarde remplacera les données actuelles de cet appareil. Continuer ?', { confirmLabel: 'Importer' });
    if (!ok) return;
    try {
      ctx.storage.importJSON(await file.text());
      toast('Sauvegarde importée.');
      ctx.rerender();
    } catch (err) {
      toast(err.message);
    }
  });

  ctx.root.querySelector('#reset').addEventListener('click', async () => {
    const ok = await confirmDialog('Effacer définitivement votre plan et votre progression de cet appareil ? Pensez à exporter une sauvegarde avant.', { confirmLabel: 'Tout effacer', danger: true });
    if (!ok) return;
    ctx.storage.reset();
    toast('Données effacées.');
    ctx.navigate('');
  });

  return () => document.removeEventListener('tempofit:installable', onInstallable);
}
