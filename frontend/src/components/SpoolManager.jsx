import { useState } from "react";

const EMPTY = { brand: "", material: "PLA", color: "", diameter_mm: 1.75, cost: "", filament_preset_name: "", notes: "" };

export default function SpoolManager({ spools, filamentProfiles, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  function startEdit(spool) {
    setEditingId(spool.id);
    setForm({ ...spool, cost: spool.cost ?? "" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form, cost: form.cost === "" ? null : Number(form.cost), diameter_mm: Number(form.diameter_mm) };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    resetForm();
  }

  return (
    <div>
      <div className="panel">
        <h3>{editingId ? "Modifier la bobine" : "Nouvelle bobine"}</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Marque
              <input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </label>
            <label>
              Matière
              <input required value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="PLA, PETG, ABS..." />
            </label>
            <label>
              Couleur
              <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </label>
            <label>
              Diamètre (mm)
              <input type="number" step="0.01" value={form.diameter_mm} onChange={(e) => setForm({ ...form, diameter_mm: e.target.value })} />
            </label>
            <label>
              Coût (€)
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </label>
            <label>
              Preset filament OrcaSlicer lié
              <select value={form.filament_preset_name || ""} onChange={(e) => setForm({ ...form, filament_preset_name: e.target.value })}>
                <option value="">— aucun —</option>
                {filamentProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid full" style={{ marginTop: 12 }}>
            <label>
              Notes
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <div className="modal-actions">
            {editingId && (
              <button type="button" onClick={resetForm}>
                Annuler
              </button>
            )}
            <button type="submit" className="primary">
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>

      {spools.length === 0 ? (
        <div className="empty">Aucune bobine enregistrée.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Marque</th>
              <th>Matière</th>
              <th>Couleur</th>
              <th>Ø</th>
              <th>Preset filament</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {spools.map((s) => (
              <tr key={s.id}>
                <td>{s.brand}</td>
                <td>{s.material}</td>
                <td>{s.color}</td>
                <td>{s.diameter_mm} mm</td>
                <td>{s.filament_preset_name || "—"}</td>
                <td>
                  <div className="card-actions">
                    <button onClick={() => startEdit(s)}>Éditer</button>
                    <button className="danger" onClick={() => onDelete(s.id)}>
                      Suppr.
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
