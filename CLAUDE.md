# Orca Profile Manager — notes pour Claude Code

Companion app macOS pour OrcaSlicer : organise les bobines/buses/presets par
objectif d'impression, verrouille les réglages de calibration filament, et
applique des combos directement dans les fichiers d'OrcaSlicer.

## Démarrage rapide

```bash
./scripts/setup.sh            # venv + deps + icône d'app macOS, une seule fois
open "$HOME/Applications/Orca Profile Manager.app"
```

Ou en dev manuel (deux terminaux) :

```bash
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev    # http://localhost:5173
```

Aucune suite de tests automatisée n'existe : la vérification se fait en
lançant réellement les deux serveurs et en pilotant l'UI (Playwright headless
ou navigateur) contre une vraie installation OrcaSlicer locale.

## Architecture

- `backend/app/orca_paths.py` — localise `~/Library/Application Support/OrcaSlicer`, lit `OrcaSlicer.conf` (JSON malgré l'extension).
- `backend/app/preset_reader.py` — indexe et résout les presets OrcaSlicer (`system/<Vendeur>/{filament,machine,process}/*.json` + `user/<id>/...`). Chaque preset ne stocke que ses champs *surchargés* par rapport à son parent, référencé via `"inherits"` (même `kind` uniquement) — `resolve()` fait le merge récursif. Les valeurs scalaires sont presque toutes des strings, souvent encapsulées dans un array à un élément (`["215"]`) pour les champs par-extrudeur.
- `backend/app/preset_writer.py` — écrit dans `user/<id>/` uniquement (jamais `system/`), toujours précédé d'une sauvegarde horodatée dans `data/backups/`.
- `backend/app/calibration.py` — liste blanche `CALIBRATION_FIELDS` (flow ratio, pressure advance, températures) : ce sont des champs du preset **filament**, pas process. Décision utilisateur du 2026-07-11 : verrouiller ces champs par paire (bobine, buse), extraits d'un preset filament déjà calibré.
- `backend/app/models.py` — SQLite (SQLAlchemy) : `Spool`, `Nozzle`, `Combo`, `CalibrationProfile`, `Adjustment`. Ces tables sont la seule couche d'organisation ; les presets OrcaSlicer eux-mêmes ne sont jamais dupliqués en base, seulement référencés par nom.
- `frontend/src/` — React + Vite, pas de framework UI externe (CSS custom dans `index.css`). `ComboEditor.jsx` demande le preset imprimante *avant* le preset process pour filtrer la liste (souvent 400+ presets process sinon) via `GET /profiles/process?compatible_with=<machine>`.

## Pièges déjà rencontrés

- **Vite écoute en IPv6 (`::1`) uniquement** sur certaines machines — un `curl http://127.0.0.1:5173` échoue alors que `curl http://localhost:5173` fonctionne. Toujours utiliser `localhost` dans les scripts/health-checks, jamais `127.0.0.1`.
- **OrcaSlicer doit être fermé avant "Appliquer à OrcaSlicer"** : l'appli écrit `presets.machine` dans `OrcaSlicer.conf` sur disque, mais une instance OrcaSlicer déjà ouverte garde sa config en mémoire et l'écrase au moment de se fermer. Le backend expose `orca_running` (via `pgrep -x OrcaSlicer`) dans `/status` et dans la réponse de `/combos/{id}/apply` ; le frontend affiche un avertissement en conséquence — ne pas supprimer cette logique.
- **Ne jamais faire `rm -f data/app.db`** pour "repartir propre" pendant des tests — ce fichier contient les vraies données de l'utilisateur (bobines, buses, combos, calibrations), pas seulement des artefacts de test. Utiliser une base séparée ou supprimer des enregistrements ciblés par id.
- **Le bundle macOS (`~/Applications/Orca Profile Manager.app`) vit hors du repo** — il est régénéré par `scripts/install-macos-app.sh`, jamais committé (chemins absolus propres à chaque machine).

## Sécurité / portée des écritures

Le backend ne modifie jamais `system/` (presets fournis par OrcaSlicer). Toute
écriture dans `user/` est précédée d'une sauvegarde dans `data/backups/`
(non versionné, propre à chaque machine — voir `.gitignore`).
