import { useState } from "react";

const EMPTY = { field: "", old_value: "", new_value: "", reason: "", source: "manual" };

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
        <h3>Adjustment journal</h3>
        <div className="form-grid">
          <label>
            Combo
            <select value={selectedComboId || ""} onChange={(e) => onSelectCombo(Number(e.target.value) || null)}>
              <option value="">All combos</option>
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
          <h3>Add an adjustment</h3>
          <form onSubmit={submit}>
            <div className="form-grid">
              <label>
                Field changed
                <input required value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="e.g. nozzle_temperature" />
              </label>
              <label>
                Source
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="manual">Manual</option>
                  <option value="ai-chat-suggestion">AI suggestion (chat)</option>
                </select>
              </label>
              <label>
                Old value
                <input value={form.old_value} onChange={(e) => setForm({ ...form, old_value: e.target.value })} />
              </label>
              <label>
                New value
                <input value={form.new_value} onChange={(e) => setForm({ ...form, new_value: e.target.value })} />
              </label>
            </div>
            <div className="form-grid full" style={{ marginTop: 12 }}>
              <label>
                Reason
                <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. observed stringing, Claude's suggestion" />
              </label>
            </div>
            <div className="modal-actions">
              <button type="submit" className="primary">
                Add to journal
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustments.length === 0 ? (
        <div className="empty">No adjustments logged yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Combo</th>
              <th>Field</th>
              <th>Before → After</th>
              <th>Source</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.created_at).toLocaleString("en-US")}</td>
                <td>{comboById[a.combo_id]?.name || a.combo_id}</td>
                <td>{a.field}</td>
                <td>
                  {a.old_value} → {a.new_value}
                </td>
                <td>{a.source === "manual" ? "Manual" : "AI (chat)"}</td>
                <td>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
