"""Write user presets into OrcaSlicer's own preset store, safely.

Every write is preceded by a backup of whatever file it's about to
overwrite (if any), stored under data/backups/. system/ (vendor-shipped
presets) is never touched by this module.
"""

import json
import shutil
import time
from pathlib import Path
from typing import Literal

from . import orca_paths
from .preset_reader import PresetKind, build_index, _load_json

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
BACKUPS_DIR = DATA_DIR / "backups"

# key that stores the preset's own name, per kind, and whether it's array-wrapped
_SETTINGS_ID_KEY: dict[PresetKind, str] = {
    "filament": "filament_settings_id",
    "process": "print_settings_id",
    "machine": "printer_settings_id",
}
_SETTINGS_ID_IS_ARRAY: dict[PresetKind, bool] = {
    "filament": True,
    "process": False,
    "machine": False,
}


def _orca_version() -> str:
    try:
        header = orca_paths.read_conf().get("header", "")
        # header looks like "OrcaSlicer 2.4.2"
        return header.rsplit(" ", 1)[-1] or "0.0.0"
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return "0.0.0"


def _backup(path: Path) -> Path | None:
    if not path.exists():
        return None
    dest_dir = BACKUPS_DIR / path.parent.name
    dest_dir.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%dT%H%M%S")
    dest = dest_dir / f"{path.stem}_{stamp}{path.suffix}"
    shutil.copy2(path, dest)
    return dest


def _base_id_for_parent(kind: PresetKind, parent_name: str | None) -> str:
    if not parent_name:
        return ""
    index = build_index(kind)
    entry = index.get(parent_name)
    if entry is None:
        return ""
    try:
        parent_data = _load_json(entry.path)
    except (json.JSONDecodeError, OSError):
        return ""
    return parent_data.get("setting_id", "")


def write_preset(
    kind: PresetKind,
    name: str,
    fields: dict,
    inherits: str | None = None,
    folder_id: str | None = None,
) -> Path:
    """Write (create or overwrite) a user preset, with its .info sidecar.

    `fields` should contain only the overridden keys (same convention
    OrcaSlicer itself uses) - not a fully resolved preset.
    """
    if folder_id is None:
        folder_id = orca_paths.active_user_folder_id()

    kind_dir = orca_paths.user_root_dir() / folder_id / kind
    kind_dir.mkdir(parents=True, exist_ok=True)

    json_path = kind_dir / f"{name}.json"
    info_path = kind_dir / f"{name}.info"

    is_new = not json_path.exists()
    _backup(json_path)
    _backup(info_path)

    data = dict(fields)
    data["name"] = name
    data["from"] = "User"
    data["version"] = _orca_version()
    if inherits:
        data["inherits"] = inherits

    id_key = _SETTINGS_ID_KEY[kind]
    data[id_key] = [name] if _SETTINGS_ID_IS_ARRAY[kind] else name

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

    base_id = _base_id_for_parent(kind, inherits)
    info_lines = [
        f"sync_info = {'create' if is_new else 'update'}",
        "user_id = ",
        "setting_id = ",
        f"base_id = {base_id}",
        f"updated_time = {int(time.time())}",
    ]
    with open(info_path, "w", encoding="utf-8") as f:
        f.write("\n".join(info_lines) + "\n")

    return json_path


def set_active_printer_preset(name: str) -> Path:
    """Point OrcaSlicer.conf's presets.machine at `name` (the printer preset shown as active on next launch)."""
    conf_path = orca_paths.orca_data_dir() / "OrcaSlicer.conf"
    _backup(conf_path)

    conf = orca_paths.read_conf()
    conf.setdefault("presets", {})["machine"] = name

    with open(conf_path, "w", encoding="utf-8") as f:
        json.dump(conf, f, indent=4, ensure_ascii=False)

    return conf_path
