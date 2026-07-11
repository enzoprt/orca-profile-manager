import { useEffect, useState } from "react";
import { api } from "../api";
import { OBJECTIVES } from "../constants";
import PresetDiffPanel from "./PresetDiffPanel";

const EMPTY = {
  name: "",
  spool_id: "",
  nozzle_id: "",
  process_preset_name: "",
  machine_preset_name: "",
  objectives: [],
  notes: "",
};

const CALIBRATION_FIELD_LABELS = {
  filament_flow_ratio: "Flow ratio",
  enable_pressure_advance: "Pressure advance activée",
  pressure_advance: "Pressure advance (K)",
  nozzle_temperature: "Temp. buse",
  nozzle_temperature_initial_layer: "Temp. buse (1re couche)",
  hot_plate_temp: "Temp. plateau (lisse)",
  hot_plate_temp_initial_layer: "Temp. plateau (1re couche, lisse)",
  cool_plate_temp: "Temp. plateau (froid)",
  cool_plate_temp_initial_layer: "Temp. plateau (1re couche, froid)",
  eng_plate_temp: "Temp. plateau (ingénierie)",
  eng_plate_temp_initial_layer: "Temp. plateau (1re couche, ingénierie)",
  textured_plate_temp: "Temp. plateau (texturé)",
  textured_plate_temp_initial_layer: "Temp. plateau (1re couche, texturé)",
};

function formatValue(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default function ComboEditor({ combo, spools, nozzles, machineProfiles, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [processOptions, setProcessOptions] = useState([]);
  const [calibrationProfile, setCalibrationProfile] = useState(undefined); // undefined = not loaded yet, null = none found

  useEffect(() => {
    setForm(
      combo
        ? {
            name: combo.name,
            spool_id: combo.spool_id,
            nozzle_id: combo.nozzle_id,
            process_preset_name: combo.process_preset_name || "",
            machine_preset_name: combo.machine_preset_name || "",
            objectives: combo.objectives,
            notes: combo.notes,
          }
        : EMPTY
    );
  }, [combo]);

  useEffect(() => {
    if (!form.machine_preset_name) {
      setProcessOptions([]);
      return;
    }
    api.profiles("process", form.machine_preset_name).then(setProcessOptions).catch(() => setProcessOptions([]));
  }, [form.machine_preset_name]);

  useEffect(() => {
    if (!form.spool_id || !form.nozzle_id) {
      setCalibrationProfile(undefined);
      return;
    }
    api
      .calibrationProfiles(form.spool_id, form.nozzle_id)
      .then((list) => setCalibrationProfile(list[0] || null))
      .catch(() => setCalibrationProfile(null));
  }, [form.spool_id, form.nozzle_id]);

  function toggleObjective(id) {
    setForm((f) => ({
      ...f,
      objectives: f.objectives.includes(id) ? f.objectives.filter((o) => o !== id) : [...f.objectives, id],
    }));
  }

  function handleMachineChange(name) {
    setForm((f) => ({ ...f, machine_preset_name: name, process_preset_name: "" }));
  }

  function submit(e) {
    e.preventDefault();
    onSave({
      ...form,
      spool_id: Number(form.spool_id),
      nozzle_id: Number(form.nozzle_id),
      process_preset_name: form.process_preset_name || null,
      machine_preset_name: form.machine_preset_name || null,
    });
  }

  const processDefaults = processOptions.filter((p) => p.source === "system");
  const processCustoms = processOptions.filter((p) => p.source === "user");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{combo ? "Modifier le combo" : "Nouveau combo"}</h3>
        <form onSubmit={submit}>
          <div className="form-grid full">
            <label>
              Nom du combo
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: PETG solide - buse 0.4" />
            </label>
          </div>

          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Preset imprimante OrcaSlicer
              <select required value={form.machine_preset_name} onChange={(e) => handleMachineChange(e.target.value)}>
                <option value="" disabled>
                  — choisir en premier, pour filtrer la liste des process —
                </option>
                {machineProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <label>
              Bobine
              <select required value={form.spool_id} onChange={(e) => setForm({ ...form, spool_id: e.target.value })}>
                <option value="" disabled>
                  — choisir —
                </option>
                {spools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.brand} — {s.material} {s.color}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buse
              <select required value={form.nozzle_id} onChange={(e) => setForm({ ...form, nozzle_id: e.target.value })}>
                <option value="" disabled>
                  — choisir —
                </option>
                {nozzles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.diameter_mm} mm — {n.printer_name || n.material}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {calibrationProfile !== undefined && (
            <div style={{ marginTop: 12 }}>
              {calibrationProfile ? (
                <>
                  <label>🔒 Calibration verrouillée pour cette bobine+buse (source : {calibrationProfile.source_filament_preset})</label>
                  <div className="diff-panel">
                    {Object.entries(calibrationProfile.locked_fields).map(([key, value]) => (
                      <div className="diff-row overridden" key={key}>
                        <span className="diff-key">🔒 {CALIBRATION_FIELD_LABELS[key] || key}</span>
                        <span className="diff-value">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="status-line">
                  Aucune calibration verrouillée pour cette bobine+buse — vas dans l'onglet "Calibration" pour en créer une si tu
                  veux figer flow ratio / pressure advance / températures.
                </div>
              )}
            </div>
          )}

          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Preset process OrcaSlicer {form.machine_preset_name && `(compatibles avec l'imprimante choisie : ${processOptions.length})`}
            </label>
            <select
              disabled={!form.machine_preset_name}
              value={form.process_preset_name}
              onChange={(e) => setForm({ ...form, process_preset_name: e.target.value })}
            >
              <option value="">— aucun —</option>
              {processCustoms.length > 0 && (
                <optgroup label="Personnalisés">
                  {processCustoms.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {processDefaults.length > 0 && (
                <optgroup label="Par défaut">
                  {processDefaults.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {form.process_preset_name && (
            <div style={{ marginTop: 12 }}>
              <label>Réglages résolus du process (vert = surchargé, gris = hérité)</label>
              <PresetDiffPanel kind="process" name={form.process_preset_name} />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label>Objectif(s) d'impression</label>
            <div className="tags">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={form.objectives.includes(o.id) ? "primary" : ""}
                  onClick={() => toggleObjective(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Notes
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="primary">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
