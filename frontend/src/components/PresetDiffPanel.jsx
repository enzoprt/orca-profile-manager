import { useEffect, useState } from "react";
import { api } from "../api";

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

export default function PresetDiffPanel({ kind, name }) {
  const [resolved, setResolved] = useState(null);
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) {
      setResolved(null);
      setRaw(null);
      return;
    }
    setError(null);
    Promise.all([api.resolvedProfile(kind, name), api.rawProfile(kind, name)])
      .then(([r, w]) => {
        setResolved(r);
        setRaw(w);
      })
      .catch((err) => setError(err.message));
  }, [kind, name]);

  if (!name) return null;
  if (error) return <div className="status-line error">{error}</div>;
  if (!resolved || !raw) return <div className="empty">Chargement des réglages…</div>;

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

  return (
    <div className="diff-panel">
      {raw.inherits && (
        <div className="diff-row inherited">
          <span className="diff-key">hérite de</span>
          <span className="diff-value">{raw.inherits}</span>
        </div>
      )}
      {rows.map(([key, value]) => (
        <div key={key} className={`diff-row ${ownKeys.has(key) ? "overridden" : "inherited"}`}>
          <span className="diff-key">{key}</span>
          <span className="diff-value" title={formatValue(value)}>
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
