import { useState } from "react";

const EMPTY = { field: "", old_value: "", new_value: "", reason: "", source: "manuel" };

export default function Journal({ combos, adjustments, selectedComboId, onSelectCombo, onCreate }) {
  const [form, setForm] = useState(EMPTY);
  const comboById = Object.fromEntries(combos.map((c) => [c.id, c]));

  async function submit(e) {
    e.preventDefault();
    if (!selectedComboId) return;
    await onCreate({ ...form, combo_id: selectedComboId });
    setForm(EMPTY);
  }

  return (
    <div>
      <div className="panel">
        <h3>Journal des ajustements</h3>
        <div className="form-grid">
          <label>
            Combo
            <select value={selectedComboId || ""} onChange={(e) => onSelectCombo(Number(e.target.value) || null)}>
              <option value="">Tous les combos</option>
              {combos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selectedComboId && (
        <div className="panel">
          <h3>Ajouter un ajustement</h3>
          <form onSubmit={submit}>
            <div className="form-grid">
              <label>
                Champ modifié
                <input required value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="ex: nozzle_temperature" />
              </label>
              <label>
                Source
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="manuel">Manuel</option>
                  <option value="suggestion-ia-chat">Suggestion IA (chat)</option>
                </select>
              </label>
              <label>
                Ancienne valeur
                <input value={form.old_value} onChange={(e) => setForm({ ...form, old_value: e.target.value })} />
              </label>
              <label>
                Nouvelle valeur
                <input value={form.new_value} onChange={(e) => setForm({ ...form, new_value: e.target.value })} />
              </label>
            </div>
            <div className="form-grid full" style={{ marginTop: 12 }}>
              <label>
                Raison
                <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="ex: stringing observé, suggestion de Claude" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="primary">
                Ajouter au journal
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustments.length === 0 ? (
        <div className="empty">Aucun ajustement enregistré.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Combo</th>
              <th>Champ</th>
              <th>Avant → Après</th>
              <th>Source</th>
              <th>Raison</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.created_at).toLocaleString("fr-FR")}</td>
                <td>{comboById[a.combo_id]?.name || a.combo_id}</td>
                <td>{a.field}</td>
                <td>
                  {a.old_value} → {a.new_value}
                </td>
                <td>{a.source === "manuel" ? "Manuel" : "IA (chat)"}</td>
                <td>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
