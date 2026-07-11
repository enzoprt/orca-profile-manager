import { useMemo, useState } from "react";
import { OBJECTIVES } from "../constants";

export default function ComboLibrary({ combos, spools, nozzles, onEdit, onDelete, onApply, applyingId }) {
  const [materialFilter, setMaterialFilter] = useState("");
  const [nozzleFilter, setNozzleFilter] = useState("");
  const [objectiveFilter, setObjectiveFilter] = useState("");

  const spoolById = useMemo(() => Object.fromEntries(spools.map((s) => [s.id, s])), [spools]);
  const nozzleById = useMemo(() => Object.fromEntries(nozzles.map((n) => [n.id, n])), [nozzles]);

  const materials = useMemo(() => [...new Set(spools.map((s) => s.material))], [spools]);
  const diameters = useMemo(() => [...new Set(nozzles.map((n) => n.diameter_mm))], [nozzles]);

  const filtered = combos.filter((c) => {
    const spool = spoolById[c.spool_id];
    const nozzle = nozzleById[c.nozzle_id];
    if (materialFilter && spool?.material !== materialFilter) return false;
    if (nozzleFilter && String(nozzle?.diameter_mm) !== nozzleFilter) return false;
    if (objectiveFilter && !c.objectives.includes(objectiveFilter)) return false;
    return true;
  });

  return (
    <div>
      <div className="filters">
        <select value={materialFilter} onChange={(e) => setMaterialFilter(e.target.value)}>
          <option value="">Toutes matières</option>
          {materials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select value={nozzleFilter} onChange={(e) => setNozzleFilter(e.target.value)}>
          <option value="">Toutes buses</option>
          {diameters.map((d) => (
            <option key={d} value={d}>
              {d} mm
            </option>
          ))}
        </select>
        <select value={objectiveFilter} onChange={(e) => setObjectiveFilter(e.target.value)}>
          <option value="">Tous objectifs</option>
          {OBJECTIVES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">Aucun combo ne correspond. Crée-en un avec le bouton "Nouveau combo".</div>
      ) : (
        <div className="grid">
          {filtered.map((c) => {
            const spool = spoolById[c.spool_id];
            const nozzle = nozzleById[c.nozzle_id];
            return (
              <div className="card" key={c.id}>
                <h3>{c.name}</h3>
                <div className="meta">
                  {spool ? `${spool.brand} — ${spool.material} ${spool.color}` : "bobine ?"} · {nozzle ? `${nozzle.diameter_mm} mm` : "buse ?"}
                </div>
                {c.machine_preset_name && <div className="meta">Imprimante : {c.machine_preset_name}</div>}
                {c.process_preset_name && <div className="meta">Process : {c.process_preset_name}</div>}
                <div className="tags">
                  {c.objectives.map((o) => (
                    <span className="tag" key={o}>
                      {OBJECTIVES.find((x) => x.id === o)?.label || o}
                    </span>
                  ))}
                </div>
                <div className="card-actions">
                  <button className="primary" disabled={applyingId === c.id || !c.machine_preset_name} onClick={() => onApply(c.id)}>
                    {applyingId === c.id ? "Application…" : "Appliquer à OrcaSlicer"}
                  </button>
                  <button onClick={() => onEdit(c)}>Éditer</button>
                  <button className="danger" onClick={() => onDelete(c.id)}>
                    Suppr.
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
