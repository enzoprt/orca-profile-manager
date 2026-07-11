# Orca Profile Manager

Gestionnaire de réglages OrcaSlicer : organise tes bobines, buses et presets
par **objectif d'impression** (précision, solidité, efficacité, support...),
et applique tes combinaisons directement dans OrcaSlicer.

OrcaSlicer ne connaît que des presets JSON — pas de notion d'"objectif". Cette
appli ajoute cette couche d'organisation par-dessus, sans jamais dupliquer ni
casser tes vrais presets Orca : elle lit et écrit directement dans
`~/Library/Application Support/OrcaSlicer/`, avec sauvegarde automatique
avant chaque écriture (`data/backups/`).

## Structure

- `backend/` — API FastAPI (Python). Lit/résout/écrit les presets OrcaSlicer,
  gère la base SQLite (bobines, buses, combos, journal d'ajustements).
- `frontend/` — interface React (Vite).
- `data/` — base SQLite (`app.db`) et sauvegardes de sécurité (`backups/`),
  non versionnées.

## Installation en une commande

Nécessite macOS (le projet lit `~/Library/Application Support/OrcaSlicer`)
avec [OrcaSlicer](https://github.com/SoftFever/OrcaSlicer) déjà installé, et
Python 3.11+.

```bash
./scripts/setup.sh
```

Ça installe le backend (venv Python), le frontend (`npm install`), et crée
une icône d'app dans `~/Applications/Orca Profile Manager.app`. Double-clique
dessus pour lancer les deux serveurs et ouvrir l'appli — elle lira
automatiquement tes propres presets OrcaSlicer, aucune configuration
supplémentaire nécessaire.

## Démarrage manuel (dev)

**Backend** :

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** :

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173 (le backend doit tourner sur le port 8000).

## Fonctionnement

1. **Bobines** et **Buses** : renseigne ce que tu as, en les liant à un preset
   filament / une imprimante OrcaSlicer existant si tu veux.
2. **Calibration** : verrouille, par paire bobine+buse, les réglages de
   calibration (flow ratio, pressure advance, températures buse/plateau) en
   pointant vers un de tes presets filament déjà calibrés. Ces valeurs sont
   ensuite toujours affichées (et jamais perdues) quel que soit l'objectif
   choisi pour un combo utilisant cette bobine+buse.
3. **Bibliothèque** : crée des "combos" = imprimante + bobine + buse + preset
   process + objectif(s) d'impression. L'éditeur demande l'imprimante en
   premier pour réduire la liste des presets process compatibles (souvent
   400+ sinon), les regroupe en "Personnalisés"/"Par défaut", affiche la
   calibration verrouillée dès que bobine+buse sont choisies, et montre les
   réglages résolus du process en distinguant ce qui est surchargé (vert) de
   ce qui est hérité (gris).
4. **Appliquer à OrcaSlicer** : active le preset imprimante du combo comme
   preset actif dans OrcaSlicer (`OrcaSlicer.conf`).
5. **Journal** : historique des ajustements faits sur un combo (manuel ou
   suite à une suggestion de Claude en chat), pour garder la raison de chaque
   changement.

## Sécurité

- Seul `user/<dossier>/` est modifié — jamais `system/` (presets fournis par
  OrcaSlicer).
- Chaque fichier écrasé est d'abord copié dans `data/backups/<dossier>/`
  avec un horodatage.
- Ferme OrcaSlicer avant d'appliquer un combo pour éviter qu'il n'écrase tes
  changements au prochain enregistrement depuis son UI.
