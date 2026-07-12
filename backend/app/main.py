from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import calibration, orca_cli, orca_paths, preset_reader, preset_writer
from .db import get_session, init_db
from .models import Adjustment, CalibrationProfile, Combo, Nozzle, Spool
from .schemas import (
    AdjustmentIn,
    AdjustmentOut,
    CalibrationProfileIn,
    CalibrationProfileOut,
    ComboIn,
    ComboOut,
    NozzleIn,
    NozzleOut,
    ProfileOverrideIn,
    SpoolIn,
    SpoolOut,
)

app = FastAPI(title="Orca Profile Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()


# ---- OrcaSlicer status & profiles (read-only, live from OrcaSlicer's own files) ----


@app.get("/status")
def status():
    try:
        data_dir = str(orca_paths.orca_data_dir())
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    return {
        "orca_data_dir": data_dir,
        "vendors": orca_paths.list_vendors(),
        "user_folders": orca_paths.list_user_folders(),
        "active_user_folder": orca_paths.active_user_folder_id(),
        "orca_cli_available": orca_cli.is_available(),
        "orca_running": orca_cli.is_running(),
    }


@app.get("/profiles/{kind}")
def list_profiles(kind: Literal["filament", "machine", "process"], compatible_with: str | None = None):
    return preset_reader.list_profiles(kind, compatible_with=compatible_with)


@app.get("/profiles/{kind}/{name}/resolved")
def resolved_profile(kind: Literal["filament", "machine", "process"], name: str):
    try:
        return preset_reader.resolve(name, kind)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.get("/profiles/{kind}/{name}/raw")
def raw_profile(kind: Literal["filament", "machine", "process"], name: str):
    try:
        return preset_reader.raw_preset(name, kind)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc


# ---- Editing OrcaSlicer user presets in place (never touches system/) ----

# Keys write_preset() manages itself — never pass these through as overrides.
_PROFILE_META_KEYS = {"name", "from", "version", "print_settings_id", "printer_settings_id", "filament_settings_id"}


@app.put("/profiles/{kind}/{name}/override")
def set_profile_override(kind: Literal["filament", "machine", "process"], name: str, payload: ProfileOverrideIn):
    index = preset_reader.build_index(kind)
    entry = index.get(name)
    if entry is None:
        raise HTTPException(404, f"Preset '{name}' not found")
    if entry.source != "user":
        raise HTTPException(400, "System presets can't be edited directly — duplicate it into a custom preset first.")

    raw = preset_reader.raw_preset(name, kind, index=index)
    inherits = raw.get("inherits")
    fields = {k: v for k, v in raw.items() if k not in _PROFILE_META_KEYS and k != "inherits"}

    if payload.value is None:
        fields.pop(payload.field, None)
    else:
        fields[payload.field] = payload.value

    preset_writer.write_preset(kind, name, fields, inherits=inherits)

    return {
        "raw": preset_reader.raw_preset(name, kind),
        "resolved": preset_reader.resolve(name, kind),
    }


# ---- Spools ----


@app.get("/spools", response_model=list[SpoolOut])
def list_spools(db: Session = Depends(get_db)):
    return db.query(Spool).order_by(Spool.brand).all()


@app.post("/spools", response_model=SpoolOut)
def create_spool(payload: SpoolIn, db: Session = Depends(get_db)):
    spool = Spool(**payload.model_dump())
    db.add(spool)
    db.commit()
    db.refresh(spool)
    return spool


@app.put("/spools/{spool_id}", response_model=SpoolOut)
def update_spool(spool_id: int, payload: SpoolIn, db: Session = Depends(get_db)):
    spool = db.get(Spool, spool_id)
    if spool is None:
        raise HTTPException(404, "Spool not found")
    for key, value in payload.model_dump().items():
        setattr(spool, key, value)
    db.commit()
    db.refresh(spool)
    return spool


@app.delete("/spools/{spool_id}")
def delete_spool(spool_id: int, db: Session = Depends(get_db)):
    spool = db.get(Spool, spool_id)
    if spool is None:
        raise HTTPException(404, "Spool not found")
    db.delete(spool)
    db.commit()
    return {"ok": True}


# ---- Nozzles ----


@app.get("/nozzles", response_model=list[NozzleOut])
def list_nozzles(db: Session = Depends(get_db)):
    return db.query(Nozzle).order_by(Nozzle.diameter_mm).all()


@app.post("/nozzles", response_model=NozzleOut)
def create_nozzle(payload: NozzleIn, db: Session = Depends(get_db)):
    nozzle = Nozzle(**payload.model_dump())
    db.add(nozzle)
    db.commit()
    db.refresh(nozzle)
    return nozzle


@app.put("/nozzles/{nozzle_id}", response_model=NozzleOut)
def update_nozzle(nozzle_id: int, payload: NozzleIn, db: Session = Depends(get_db)):
    nozzle = db.get(Nozzle, nozzle_id)
    if nozzle is None:
        raise HTTPException(404, "Nozzle not found")
    for key, value in payload.model_dump().items():
        setattr(nozzle, key, value)
    db.commit()
    db.refresh(nozzle)
    return nozzle


@app.delete("/nozzles/{nozzle_id}")
def delete_nozzle(nozzle_id: int, db: Session = Depends(get_db)):
    nozzle = db.get(Nozzle, nozzle_id)
    if nozzle is None:
        raise HTTPException(404, "Nozzle not found")
    db.delete(nozzle)
    db.commit()
    return {"ok": True}


# ---- Combos ----


def _combo_out(combo: Combo) -> ComboOut:
    return ComboOut(
        id=combo.id,
        name=combo.name,
        spool_id=combo.spool_id,
        nozzle_id=combo.nozzle_id,
        process_preset_name=combo.process_preset_name,
        machine_preset_name=combo.machine_preset_name,
        objectives=combo.objectives,
        notes=combo.notes,
        created_at=combo.created_at,
        updated_at=combo.updated_at,
    )


@app.get("/combos", response_model=list[ComboOut])
def list_combos(db: Session = Depends(get_db)):
    return [_combo_out(c) for c in db.query(Combo).order_by(Combo.name).all()]


@app.post("/combos", response_model=ComboOut)
def create_combo(payload: ComboIn, db: Session = Depends(get_db)):
    data = payload.model_dump()
    objectives = data.pop("objectives")
    combo = Combo(**data)
    combo.objectives = objectives
    db.add(combo)
    db.commit()
    db.refresh(combo)
    return _combo_out(combo)


@app.put("/combos/{combo_id}", response_model=ComboOut)
def update_combo(combo_id: int, payload: ComboIn, db: Session = Depends(get_db)):
    combo = db.get(Combo, combo_id)
    if combo is None:
        raise HTTPException(404, "Combo not found")
    data = payload.model_dump()
    objectives = data.pop("objectives")
    for key, value in data.items():
        setattr(combo, key, value)
    combo.objectives = objectives
    db.commit()
    db.refresh(combo)
    return _combo_out(combo)


@app.delete("/combos/{combo_id}")
def delete_combo(combo_id: int, db: Session = Depends(get_db)):
    combo = db.get(Combo, combo_id)
    if combo is None:
        raise HTTPException(404, "Combo not found")
    db.delete(combo)
    db.commit()
    return {"ok": True}


@app.post("/combos/{combo_id}/apply")
def apply_combo(combo_id: int, db: Session = Depends(get_db)):
    """Activate this combo's printer preset in OrcaSlicer (the one global,
    persistent selection OrcaSlicer keeps outside of per-project files)."""
    combo = db.get(Combo, combo_id)
    if combo is None:
        raise HTTPException(404, "Combo not found")
    if not combo.machine_preset_name:
        raise HTTPException(400, "Combo has no machine_preset_name to activate")

    machine_index = preset_reader.build_index("machine")
    if combo.machine_preset_name not in machine_index:
        raise HTTPException(404, f"Machine preset '{combo.machine_preset_name}' not found in OrcaSlicer")

    conf_path = preset_writer.set_active_printer_preset(combo.machine_preset_name)
    return {
        "ok": True,
        "activated": combo.machine_preset_name,
        "conf_path": str(conf_path),
        "orca_running": orca_cli.is_running(),
    }


# ---- Calibration profiles ----


def _calibration_out(cal: CalibrationProfile) -> CalibrationProfileOut:
    return CalibrationProfileOut(
        id=cal.id,
        spool_id=cal.spool_id,
        nozzle_id=cal.nozzle_id,
        source_filament_preset=cal.source_filament_preset,
        locked_fields=cal.locked_fields,
        notes=cal.notes,
        created_at=cal.created_at,
        updated_at=cal.updated_at,
    )


@app.get("/calibration-profiles", response_model=list[CalibrationProfileOut])
def list_calibration_profiles(spool_id: int | None = None, nozzle_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(CalibrationProfile)
    if spool_id is not None:
        query = query.filter(CalibrationProfile.spool_id == spool_id)
    if nozzle_id is not None:
        query = query.filter(CalibrationProfile.nozzle_id == nozzle_id)
    return [_calibration_out(c) for c in query.all()]


@app.post("/calibration-profiles", response_model=CalibrationProfileOut)
def create_calibration_profile(payload: CalibrationProfileIn, db: Session = Depends(get_db)):
    if db.get(Spool, payload.spool_id) is None:
        raise HTTPException(404, "Spool not found")
    if db.get(Nozzle, payload.nozzle_id) is None:
        raise HTTPException(404, "Nozzle not found")
    existing = (
        db.query(CalibrationProfile)
        .filter(CalibrationProfile.spool_id == payload.spool_id, CalibrationProfile.nozzle_id == payload.nozzle_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(409, "A calibration profile already exists for this spool+nozzle pair — edit it instead")

    try:
        locked_fields = calibration.extract_locked_fields(payload.source_filament_preset)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc

    cal = CalibrationProfile(
        spool_id=payload.spool_id,
        nozzle_id=payload.nozzle_id,
        source_filament_preset=payload.source_filament_preset,
        notes=payload.notes,
    )
    cal.locked_fields = locked_fields
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return _calibration_out(cal)


@app.put("/calibration-profiles/{calibration_id}", response_model=CalibrationProfileOut)
def update_calibration_profile(calibration_id: int, payload: CalibrationProfileIn, db: Session = Depends(get_db)):
    cal = db.get(CalibrationProfile, calibration_id)
    if cal is None:
        raise HTTPException(404, "Calibration profile not found")

    try:
        locked_fields = calibration.extract_locked_fields(payload.source_filament_preset)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc

    cal.spool_id = payload.spool_id
    cal.nozzle_id = payload.nozzle_id
    cal.source_filament_preset = payload.source_filament_preset
    cal.notes = payload.notes
    cal.locked_fields = locked_fields
    db.commit()
    db.refresh(cal)
    return _calibration_out(cal)


@app.delete("/calibration-profiles/{calibration_id}")
def delete_calibration_profile(calibration_id: int, db: Session = Depends(get_db)):
    cal = db.get(CalibrationProfile, calibration_id)
    if cal is None:
        raise HTTPException(404, "Calibration profile not found")
    db.delete(cal)
    db.commit()
    return {"ok": True}


# ---- Adjustments ----


@app.get("/adjustments", response_model=list[AdjustmentOut])
def list_adjustments(combo_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Adjustment)
    if combo_id is not None:
        query = query.filter(Adjustment.combo_id == combo_id)
    return query.order_by(Adjustment.created_at.desc()).all()


@app.post("/adjustments", response_model=AdjustmentOut)
def create_adjustment(payload: AdjustmentIn, db: Session = Depends(get_db)):
    if db.get(Combo, payload.combo_id) is None:
        raise HTTPException(404, "Combo not found")
    adjustment = Adjustment(**payload.model_dump())
    db.add(adjustment)
    db.commit()
    db.refresh(adjustment)
    return adjustment
