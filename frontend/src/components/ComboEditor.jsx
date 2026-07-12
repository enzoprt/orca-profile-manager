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
  enable_pressure_advance: "Pressure advance enabled",
  pressure_advance: "Pressure advance (K)",
  nozzle_temperature: "Nozzle temp.",
  nozzle_temperature_initial_layer: "Nozzle temp. (first layer)",
  hot_plate_temp: "Bed temp. (smooth)",
  hot_plate_temp_initial_layer: "Bed temp. (first layer, smooth)",
  cool_plate_temp: "Bed temp. (cool)",
  cool_plate_temp_initial_layer: "Bed temp. (first layer, cool)",
  eng_plate_temp: "Bed temp. (engineering)",
  eng_plate_temp_initial_layer: "Bed temp. (first layer, engineering)",
  textured_plate_temp: "Bed temp. (textured)",
  textured_plate_temp_initial_layer: "Bed temp. (first layer, textured)",
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
  const selectedProcess = processOptions.find((p) => p.name === form.process_preset_name);
  const processEditable = selectedProcess?.source === "user";

  async function handleFieldChange(field, oldValue, newValue) {
    if (!combo) return;
    try {
      await api.createAdjustment({
        combo_id: combo.id,
        field,
        old_value: oldValue,
        new_value: newValue,
        reason: "Manual edit from combo editor",
        source: "manual",
      });
    } catch {
      // journal logging is best-effort; the preset edit itself already succeeded
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{combo ? "Edit combo" : "New combo"}</h3>
        <form onSubmit={submit}>
          <div className="form-grid full">
            <label>
              Combo name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Strong PETG - 0.4 nozzle" />
            </label>
          </div>

          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              OrcaSlicer printer preset
              <select required value={form.machine_preset_name} onChange={(e) => handleMachineChange(e.target.value)}>
                <option value="" disabled>
                  — choose first, to filter the process list —
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
              Spool
              <select required value={form.spool_id} onChange={(e) => setForm({ ...form, spool_id: e.target.value })}>
                <option value="" disabled>
                  — choose —
                </option>
                {spools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.brand} — {s.material} {s.color}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nozzle
              <select required value={form.nozzle_id} onChange={(e) => setForm({ ...form, nozzle_id: e.target.value })}>
                <option value="" disabled>
                  — choose —
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
                  <label>🔒 Locked calibration for this spool+nozzle (source: {calibrationProfile.source_filament_preset})</label>
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
                  No locked calibration for this spool+nozzle — go to the "Calibration" tab to create one if you want to
                  pin flow ratio / pressure advance / temperatures.
                </div>
              )}
            </div>
          )}

          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              OrcaSlicer process preset {form.machine_preset_name && `(compatible with the chosen printer: ${processOptions.length})`}
            </label>
            <select
              disabled={!form.machine_preset_name}
              value={form.process_preset_name}
              onChange={(e) => setForm({ ...form, process_preset_name: e.target.value })}
            >
              <option value="">— none —</option>
              {processCustoms.length > 0 && (
                <optgroup label="Custom">
                  {processCustoms.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {processDefaults.length > 0 && (
                <optgroup label="Default">
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
              <label>
                Resolved process settings (green = overridden, grey = inherited)
                {processEditable
                  ? " — click a value to edit, ↺ to reset to inherited"
                  : " — read-only (Orca default preset, pick/create a custom one to edit)"}
              </label>
              <PresetDiffPanel
                kind="process"
                name={form.process_preset_name}
                editable={processEditable}
                onFieldChange={handleFieldChange}
              />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <label>Print objective(s)</label>
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
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
