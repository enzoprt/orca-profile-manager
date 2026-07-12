const BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || "GET"} ${path} -> ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  status: () => request("/status"),

  profiles: (kind, compatibleWith) =>
    request(`/profiles/${kind}${compatibleWith ? `?compatible_with=${encodeURIComponent(compatibleWith)}` : ""}`),
  resolvedProfile: (kind, name) => request(`/profiles/${kind}/${encodeURIComponent(name)}/resolved`),
  rawProfile: (kind, name) => request(`/profiles/${kind}/${encodeURIComponent(name)}/raw`),
  setProfileOverride: (kind, name, field, value) =>
    request(`/profiles/${kind}/${encodeURIComponent(name)}/override`, {
      method: "PUT",
      body: JSON.stringify({ field, value }),
    }),

  spools: () => request("/spools"),
  createSpool: (data) => request("/spools", { method: "POST", body: JSON.stringify(data) }),
  updateSpool: (id, data) => request(`/spools/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSpool: (id) => request(`/spools/${id}`, { method: "DELETE" }),

  nozzles: () => request("/nozzles"),
  createNozzle: (data) => request("/nozzles", { method: "POST", body: JSON.stringify(data) }),
  updateNozzle: (id, data) => request(`/nozzles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteNozzle: (id) => request(`/nozzles/${id}`, { method: "DELETE" }),

  combos: () => request("/combos"),
  createCombo: (data) => request("/combos", { method: "POST", body: JSON.stringify(data) }),
  updateCombo: (id, data) => request(`/combos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCombo: (id) => request(`/combos/${id}`, { method: "DELETE" }),
  applyCombo: (id) => request(`/combos/${id}/apply`, { method: "POST" }),

  adjustments: (comboId) => request(`/adjustments${comboId ? `?combo_id=${comboId}` : ""}`),
  createAdjustment: (data) => request("/adjustments", { method: "POST", body: JSON.stringify(data) }),

  calibrationProfiles: (spoolId, nozzleId) => {
    const params = new URLSearchParams();
    if (spoolId != null) params.set("spool_id", spoolId);
    if (nozzleId != null) params.set("nozzle_id", nozzleId);
    const qs = params.toString();
    return request(`/calibration-profiles${qs ? `?${qs}` : ""}`);
  },
  createCalibrationProfile: (data) => request("/calibration-profiles", { method: "POST", body: JSON.stringify(data) }),
  updateCalibrationProfile: (id, data) => request(`/calibration-profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCalibrationProfile: (id) => request(`/calibration-profiles/${id}`, { method: "DELETE" }),
};
