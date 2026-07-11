# Orca Profile Manager

OrcaSlicer companion app: organize your spools, nozzles, and presets by
**print objective** (precision, strength, efficiency, support...), and apply
your combos directly in OrcaSlicer.

OrcaSlicer only knows JSON presets — no concept of "objective". This app adds
that organizational layer on top, without ever duplicating or breaking your
real Orca presets: it reads and writes directly to
`~/Library/Application Support/OrcaSlicer/`, with an automatic backup before
every write (`data/backups/`).

## One-command install

Requires macOS (the project reads `~/Library/Application Support/OrcaSlicer`)
with [OrcaSlicer](https://github.com/SoftFever/OrcaSlicer) already installed,
and Python 3.11+.

```bash
./scripts/setup.sh
```

This installs the backend (Python venv), the frontend (`npm install`), and
creates an app icon at `~/Applications/Orca Profile Manager.app`. Double-click
it to launch both servers and open the app — it automatically reads your own
OrcaSlicer presets, no extra configuration needed.

## Manual dev startup

**Backend**:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (the backend must be running on port 8000).

## Structure

- `backend/` — FastAPI (Python) API. Reads/resolves/writes OrcaSlicer
  presets, manages the SQLite database (spools, nozzles, combos, adjustment
  journal).
- `frontend/` — React (Vite) UI.
- `data/` — SQLite database (`app.db`) and safety backups (`backups/`), not
  version-controlled.

## How it works

1. **Spools** and **Nozzles**: enter what you have, optionally linking each
   to an existing OrcaSlicer filament preset / printer.
2. **Calibration**: lock, per spool+nozzle pair, the calibration settings
   (flow ratio, pressure advance, nozzle/bed temperatures) by pointing to one
   of your already-calibrated filament presets. These values are then always
   shown (and never lost) regardless of the objective chosen for a combo
   using that spool+nozzle.
3. **Library**: create "combos" = printer + spool + nozzle + process preset +
   print objective(s). The editor asks for the printer first to shrink the
   list of compatible process presets (often 400+ otherwise), groups them
   into "Custom"/"Default", shows the locked calibration as soon as
   spool+nozzle are picked, and displays the resolved process settings,
   distinguishing overridden (green) from inherited (grey).
4. **Apply to OrcaSlicer**: activates the combo's printer preset as the
   active preset in OrcaSlicer (`OrcaSlicer.conf`).
5. **Journal**: history of adjustments made to a combo (manual or following
   an AI-chat suggestion), to keep track of why each change was made.

## Safety

- Only `user/<folder>/` is ever modified — never `system/` (presets shipped
  by OrcaSlicer).
- Every file about to be overwritten is first copied into
  `data/backups/<folder>/` with a timestamp.
- Quit OrcaSlicer before applying a combo, or it may overwrite your change
  the next time it saves its own state from its UI.
