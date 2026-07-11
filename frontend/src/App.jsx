import { useEffect, useState } from "react";
import { api } from "./api";
import ComboLibrary from "./components/ComboLibrary";
import ComboEditor from "./components/ComboEditor";
import SpoolManager from "./components/SpoolManager";
import NozzleManager from "./components/NozzleManager";
import CalibrationManager from "./components/CalibrationManager";
import Journal from "./components/Journal";

const TABS = [
  { id: "bibliotheque", label: "Bibliothèque" },
  { id: "bobines", label: "Bobines" },
  { id: "buses", label: "Buses" },
  { id: "calibration", label: "Calibration" },
  { id: "journal", label: "Journal" },
];

function App() {
  const [tab, setTab] = useState("bibliotheque");
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const [spools, setSpools] = useState([]);
  const [nozzles, setNozzles] = useState([]);
  const [combos, setCombos] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [filamentProfiles, setFilamentProfiles] = useState([]);
  const [machineProfiles, setMachineProfiles] = useState([]);
  const [calibrationProfiles, setCalibrationProfiles] = useState([]);

  const [editingCombo, setEditingCombo] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [applyMessage, setApplyMessage] = useState(null);
  const [journalComboId, setJournalComboId] = useState(null);

  function refreshAll() {
    api.status().then(setStatus).catch((e) => setStatusError(e.message));
    api.spools().then(setSpools).catch(() => {});
    api.nozzles().then(setNozzles).catch(() => {});
    api.combos().then(setCombos).catch(() => {});
    api.profiles("filament").then(setFilamentProfiles).catch(() => {});
    api.profiles("machine").then(setMachineProfiles).catch(() => {});
    api.calibrationProfiles().then(setCalibrationProfiles).catch(() => {});
  }

  useEffect(refreshAll, []);

  useEffect(() => {
    api.adjustments(journalComboId || undefined).then(setAdjustments).catch(() => {});
  }, [journalComboId, tab]);

  async function handleSaveCombo(payload) {
    if (editingCombo) {
      await api.updateCombo(editingCombo.id, payload);
    } else {
      await api.createCombo(payload);
    }
    setShowEditor(false);
    setEditingCombo(null);
    refreshAll();
  }

  async function handleDeleteCombo(id) {
    if (!confirm("Supprimer ce combo ?")) return;
    await api.deleteCombo(id);
    refreshAll();
  }

  async function handleApplyCombo(id) {
    setApplyingId(id);
    setApplyMessage(null);
    try {
      const res = await api.applyCombo(id);
      if (res.orca_running) {
        setApplyMessage(
          `⚠️ Preset "${res.activated}" écrit sur le disque, mais OrcaSlicer est actuellement ouvert et ne le verra pas. ` +
            `Ferme complètement OrcaSlicer puis rouvre-le pour que le changement prenne effet (sinon il sera écrasé à la fermeture).`
        );
      } else {
        setApplyMessage(`✅ Preset imprimante "${res.activated}" activé — il sera actif au prochain lancement d'OrcaSlicer.`);
      }
      api.status().then(setStatus).catch(() => {});
    } catch (e) {
      setApplyMessage(`Échec : ${e.message}`);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div>
      <div className="app-header">
        <h1>Orca Profile Manager</h1>
        {tab === "bibliotheque" && (
          <button
            className="primary"
            onClick={() => {
              setEditingCombo(null);
              setShowEditor(true);
            }}
          >
            + Nouveau combo
          </button>
        )}
      </div>

      {statusError ? (
        <div className="status-line error">OrcaSlicer introuvable : {statusError}</div>
      ) : status ? (
        <div className="status-line">
          {status.orca_data_dir} · {status.vendors.length} vendeurs · dossier actif {status.active_user_folder.slice(0, 8)}
          {status.orca_cli_available ? " · CLI disponible" : " · CLI introuvable"}
        </div>
      ) : (
        <div className="status-line">Connexion à OrcaSlicer…</div>
      )}

      {status?.orca_running && (
        <div className="status-line error">
          ⚠️ OrcaSlicer est ouvert. Un "Appliquer à OrcaSlicer" sera écrit sur le disque mais invisible tant qu'OrcaSlicer
          tourne, et risque d'être écrasé à sa fermeture — ferme-le d'abord si tu veux appliquer un combo maintenant.
        </div>
      )}

      {applyMessage && <div className="status-line">{applyMessage}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bibliotheque" && (
        <ComboLibrary
          combos={combos}
          spools={spools}
          nozzles={nozzles}
          onEdit={(c) => {
            setEditingCombo(c);
            setShowEditor(true);
          }}
          onDelete={handleDeleteCombo}
          onApply={handleApplyCombo}
          applyingId={applyingId}
        />
      )}

      {tab === "bobines" && (
        <SpoolManager
          spools={spools}
          filamentProfiles={filamentProfiles}
          onCreate={async (data) => {
            await api.createSpool(data);
            refreshAll();
          }}
          onUpdate={async (id, data) => {
            await api.updateSpool(id, data);
            refreshAll();
          }}
          onDelete={async (id) => {
            if (!confirm("Supprimer cette bobine ?")) return;
            await api.deleteSpool(id);
            refreshAll();
          }}
        />
      )}

      {tab === "buses" && (
        <NozzleManager
          nozzles={nozzles}
          machineProfiles={machineProfiles}
          onCreate={async (data) => {
            await api.createNozzle(data);
            refreshAll();
          }}
          onUpdate={async (id, data) => {
            await api.updateNozzle(id, data);
            refreshAll();
          }}
          onDelete={async (id) => {
            if (!confirm("Supprimer cette buse ?")) return;
            await api.deleteNozzle(id);
            refreshAll();
          }}
        />
      )}

      {tab === "calibration" && (
        <CalibrationManager
          profiles={calibrationProfiles}
          spools={spools}
          nozzles={nozzles}
          filamentProfiles={filamentProfiles}
          onCreate={async (data) => {
            await api.createCalibrationProfile(data);
            refreshAll();
          }}
          onUpdate={async (id, data) => {
            await api.updateCalibrationProfile(id, data);
            refreshAll();
          }}
          onDelete={async (id) => {
            if (!confirm("Supprimer cette calibration verrouillée ?")) return;
            await api.deleteCalibrationProfile(id);
            refreshAll();
          }}
        />
      )}

      {tab === "journal" && (
        <Journal
          combos={combos}
          adjustments={adjustments}
          selectedComboId={journalComboId}
          onSelectCombo={setJournalComboId}
          onCreate={async (data) => {
            await api.createAdjustment(data);
            api.adjustments(journalComboId || undefined).then(setAdjustments);
          }}
        />
      )}

      {showEditor && (
        <ComboEditor
          combo={editingCombo}
          spools={spools}
          nozzles={nozzles}
          machineProfiles={machineProfiles}
          onSave={handleSaveCombo}
          onClose={() => {
            setShowEditor(false);
            setEditingCombo(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
