import { useState } from "react";

const EMPTY = { diameter_mm: 0.4, material: "laiton", printer_name: "", notes: "" };

export default function NozzleManager({ nozzles, machineProfiles, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  function startEdit(nozzle) {
    setEditingId(nozzle.id);
    setForm({ ...nozzle });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    const payload = { ...form, diameter_mm: Number(form.diameter_mm) };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    resetForm();
  }

  const printerNames = [...new Set(machineProfiles.map((p) => p.name))];

  return (
    <div>
      <div className="panel">
        <h3>{editingId ? "Modifier la buse" : "Nouvelle buse"}</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Diamètre (mm)
              <input type="number" step="0.01" required value={form.diameter_mm} onChange={(e) => setForm({ ...form, diameter_mm: e.target.value })} />
            </label>
            <label>
              Matière
              <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="laiton, acier trempé..." />
            </label>
            <label>
              Imprimante / preset machine associé
              <input list="printer-names" value={form.printer_name} onChange={(e) => setForm({ ...form, printer_name: e.target.value })} />
              <datalist id="printer-names">
                {printerNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
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

      {nozzles.length === 0 ? (
        <div className="empty">Aucune buse enregistrée.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Diamètre</th>
              <th>Matière</th>
              <th>Imprimante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {nozzles.map((n) => (
              <tr key={n.id}>
                <td>{n.diameter_mm} mm</td>
                <td>{n.material}</td>
                <td>{n.printer_name || "—"}</td>
                <td>
                  <div className="card-actions">
                    <button onClick={() => startEdit(n)}>Éditer</button>
                    <button className="danger" onClick={() => onDelete(n.id)}>
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
