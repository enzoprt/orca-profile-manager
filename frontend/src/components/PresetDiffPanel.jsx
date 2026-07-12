import { useEffect, useState } from "react";
import { api } from "../api";

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function PresetDiffPanel({ kind, name, editable = false, onFieldChange }) {
  const [resolved, setResolved] = useState(null);
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  const [rowError, setRowError] = useState(null);

  useEffect(() => {
    if (!name) {
      setResolved(null);
      setRaw(null);
      return;
    }
    setError(null);
    setEditingKey(null);
    setRowError(null);
    Promise.all([api.resolvedProfile(kind, name), api.rawProfile(kind, name)])
      .then(([r, w]) => {
        setResolved(r);
        setRaw(w);
      })
      .catch((err) => setError(err.message));
  }, [kind, name]);

  if (!name) return null;
  if (error) return <div className="status-line error">{error}</div>;
  if (!resolved || !raw) return <div className="empty">Loading settings…</div>;

  const ownKeys = new Set(Object.keys(raw));
  const skipKeys = new Set(["name", "from", "version", "inherits"]);
  const rows = Object.entries(resolved)
    .filter(([key]) => !skipKeys.has(key))
    .sort(([a], [b]) => {
      const aOwn = ownKeys.has(a) ? 0 : 1;
      const bOwn = ownKeys.has(b) ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.localeCompare(b);
    });

  function startEdit(key, value) {
    if (!editable || busyKey) return;
    setRowError(null);
    setEditingKey(key);
    setDraft(formatValue(value));
  }

  function cancelEdit() {
    setEditingKey(null);
    setRowError(null);
  }

  async function commitOverride(key, oldValue, newRawValue) {
    setBusyKey(key);
    setRowError(null);
    try {
      const res = await api.setProfileOverride(kind, name, key, newRawValue);
      setResolved(res.resolved);
      setRaw(res.raw);
      setEditingKey(null);
      onFieldChange?.(key, formatValue(oldValue), newRawValue === null ? "(inherited)" : formatValue(newRawValue));
    } catch (err) {
      setRowError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  function saveEdit(key, oldValue) {
    const newValue = Array.isArray(oldValue)
      ? draft
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : draft;
    commitOverride(key, oldValue, newValue);
  }

  function resetField(key, oldValue) {
    commitOverride(key, oldValue, null);
  }

  return (
    <div className="diff-panel">
      {raw.inherits && (
        <div className="diff-row inherited">
          <span className="diff-key">inherits from</span>
          <span className="diff-value">{raw.inherits}</span>
        </div>
      )}
      {rows.map(([key, value]) => {
        const isOwn = ownKeys.has(key);
        const isEditing = editingKey === key;
        const isBusy = busyKey === key;
        return (
          <div key={key} className={`diff-row ${isOwn ? "overridden" : "inherited"}`}>
            <span className="diff-key">{key}</span>
            {isEditing ? (
              <span className="diff-value" style={{ display: "flex", gap: 4 }}>
                <input
                  autoFocus
                  value={draft}
                  disabled={isBusy}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(key, value);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="button" disabled={isBusy} onClick={() => saveEdit(key, value)} title="Save">
                  ✓
                </button>
              </span>
            ) : (
              <span
                className="diff-value"
                title={editable ? "Click to edit" : formatValue(value)}
                onClick={() => startEdit(key, value)}
                style={
                  editable
                    ? { cursor: "text", display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }
                    : undefined
                }
              >
                <span style={editable ? { overflow: "hidden", textOverflow: "ellipsis" } : undefined}>{formatValue(value)}</span>
                {isOwn && editable && (
                  <button
                    type="button"
                    title="Reset to inherited value"
                    disabled={isBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetField(key, value);
                    }}
                    style={{ flex: "0 0 auto", padding: "0 4px" }}
                  >
                    ↺
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}
      {rowError && <div className="status-line error">{rowError}</div>}
    </div>
  );
}
