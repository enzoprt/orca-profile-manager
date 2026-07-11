import { useState } from "react";

const EMPTY = { spool_id: "", nozzle_id: "", source_filament_preset: "", notes: "" };

const FIELD_LABELS = {
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

export default function CalibrationManager({ profiles, spools, nozzles, filamentProfiles, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  const spoolById = Object.fromEntries(spools.map((s) => [s.id, s]));
  const nozzleById = Object.fromEntries(nozzles.map((n) => [n.id, n]));

  function startEdit(profile) {
    setEditingId(profile.id);
    setForm({
      spool_id: profile.spool_id,
      nozzle_id: profile.nozzle_id,
      source_filament_preset: profile.source_filament_preset,
      notes: profile.notes,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, spool_id: Number(form.spool_id), nozzle_id: Number(form.nozzle_id) };
    try {
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="panel">
        <h3>{editingId ? "Edit calibration" : "Lock a calibration"}</h3>
        <p className="meta">
          Choose a spool, a nozzle, and the OrcaSlicer filament preset already calibrated for that pair. The app extracts
          the flow ratio, pressure advance, and temperatures — these values will always be preserved regardless of the
          print objective chosen for a combo using this spool+nozzle.
        </p>
        <form onSubmit={submit}>
          <div className="form-grid">
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
          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Source filament preset (already calibrated)
              <select
                required
                value={form.source_filament_preset}
                onChange={(e) => setForm({ ...form, source_filament_preset: e.target.value })}
              >
                <option value="" disabled>
                  — choose —
                </option>
                <optgroup label="Custom">
                  {filamentProfiles
                    .filter((p) => p.source === "user")
                    .map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Default">
                  {filamentProfiles
                    .filter((p) => p.source === "system")
                    .map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </label>
          </div>
          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Notes
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          {error && <div className="status-line error">{error}</div>}
          <div className="modal-actions">
            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button type="submit" className="primary">
              {editingId ? "Save" : "Lock"}
            </button>
          </div>
        </form>
      </div>

      {profiles.length === 0 ? (
        <div className="empty">No locked calibrations yet.</div>
      ) : (
        <div className="grid">
          {profiles.map((p) => {
            const spool = spoolById[p.spool_id];
            const nozzle = nozzleById[p.nozzle_id];
            return (
              <div className="card" key={p.id}>
                <h3>
                  {spool ? `${spool.brand} ${spool.material}` : "spool ?"} · {nozzle ? `${nozzle.diameter_mm} mm` : "nozzle ?"}
                </h3>
                <div className="meta">Source: {p.source_filament_preset}</div>
                <div className="diff-panel" style={{ marginTop: 8 }}>
                  {Object.entries(p.locked_fields).map(([key, value]) => (
                    <div className="diff-row overridden" key={key}>
                      <span className="diff-key">🔒 {FIELD_LABELS[key] || key}</span>
                      <span className="diff-value">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
                <div className="card-actions">
                  <button onClick={() => startEdit(p)}>Edit</button>
                  <button className="danger" onClick={() => onDelete(p.id)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
