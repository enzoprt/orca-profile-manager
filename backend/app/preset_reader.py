"""Read and resolve OrcaSlicer presets (filament/machine/process).

Each preset JSON only stores the fields that differ from its parent, linked
via an "inherits" key pointing at another preset of the *same* kind by name.
Resolving a preset means walking that chain up to a base system preset and
merging child-over-parent.
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from . import orca_paths

PresetKind = Literal["filament", "machine", "process"]


@dataclass
class PresetEntry:
    name: str
    kind: PresetKind
    path: Path
    source: Literal["system", "user"]
    vendor_or_folder: str


def load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


_load_json = load_json


def build_index(kind: PresetKind) -> dict[str, PresetEntry]:
    """Map preset name -> PresetEntry, system presets first, user presets overlaid on top."""
    index: dict[str, PresetEntry] = {}

    for vendor in orca_paths.list_vendors():
        kind_dir = orca_paths.system_dir() / vendor / kind
        if not kind_dir.is_dir():
            continue
        for json_path in kind_dir.glob("*.json"):
            try:
                data = _load_json(json_path)
            except (json.JSONDecodeError, OSError):
                continue
            name = data.get("name", json_path.stem)
            index[name] = PresetEntry(name, kind, json_path, "system", vendor)

    for folder in orca_paths.list_user_folders():
        kind_dir = orca_paths.user_root_dir() / folder / kind
        if not kind_dir.is_dir():
            continue
        for json_path in kind_dir.glob("*.json"):
            try:
                data = _load_json(json_path)
            except (json.JSONDecodeError, OSError):
                continue
            name = data.get("name", json_path.stem)
            index[name] = PresetEntry(name, kind, json_path, "user", folder)

    return index


def resolve(name: str, kind: PresetKind, index: dict[str, PresetEntry] | None = None) -> dict:
    """Return the fully-resolved preset dict for `name`, walking the inherits chain."""
    if index is None:
        index = build_index(kind)
    return _resolve(name, index, set())


def _resolve(name: str, index: dict[str, PresetEntry], visited: set[str]) -> dict:
    if name in visited:
        raise ValueError(f"Cycle detected in preset inheritance at '{name}'")
    entry = index.get(name)
    if entry is None:
        raise KeyError(f"Preset '{name}' not found")

    data = _load_json(entry.path)
    parent_name = data.get("inherits")

    if parent_name:
        parent_resolved = _resolve(parent_name, index, visited | {name})
        merged = {**parent_resolved, **data}
    else:
        merged = dict(data)

    return merged


def raw_preset(name: str, kind: PresetKind, index: dict[str, PresetEntry] | None = None) -> dict:
    """Return the preset's own JSON as stored on disk (only its overridden keys, unresolved)."""
    if index is None:
        index = build_index(kind)
    entry = index.get(name)
    if entry is None:
        raise KeyError(f"Preset '{name}' not found")
    return load_json(entry.path)


def list_profiles(kind: PresetKind, compatible_with: str | None = None) -> list[dict]:
    """Summary list (unresolved) of all presets of a given kind.

    If `compatible_with` is given (a machine preset name) and `kind` is
    "process", only process presets declaring that machine's root printer
    identity in their (resolved) `compatible_printers` are returned. Falls
    back to the unfiltered list if the filter would return nothing (e.g.
    presets that never set compatible_printers at all).
    """
    index = build_index(kind)
    names = index.keys()

    if compatible_with and kind == "process":
        filtered = set(compatible_process_names(compatible_with))
        if filtered:
            names = [n for n in names if n in filtered]

    return [
        {
            "name": name,
            "kind": index[name].kind,
            "source": index[name].source,
            "vendor_or_folder": index[name].vendor_or_folder,
            "inherits": _load_json(index[name].path).get("inherits"),
        }
        for name in names
    ]


def root_printer_identity(machine_name: str, index: dict[str, PresetEntry] | None = None) -> str:
    """Walk a machine preset's inherits chain up to (but not including) the
    generic 'fdm_*_common' templates, returning the concrete printer+nozzle
    variant name that process presets reference in `compatible_printers`."""
    if index is None:
        index = build_index("machine")

    current = machine_name
    while True:
        entry = index.get(current)
        if entry is None:
            return current
        parent = _load_json(entry.path).get("inherits")
        if not parent or parent.startswith("fdm_"):
            return current
        current = parent


def compatible_process_names(machine_name: str, machine_index: dict[str, PresetEntry] | None = None) -> list[str]:
    """Process preset names compatible with the given machine preset."""
    root = root_printer_identity(machine_name, machine_index)
    process_index = build_index("process")
    result = []
    for name in process_index:
        resolved = _resolve(name, process_index, set())
        if root in (resolved.get("compatible_printers") or []):
            result.append(name)
    return result
