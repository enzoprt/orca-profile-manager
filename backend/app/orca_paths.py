"""Locate OrcaSlicer's data directory and read its top-level app config."""

import json
from pathlib import Path

PRESET_KINDS = ("filament", "machine", "process")


def orca_data_dir() -> Path:
    path = Path.home() / "Library" / "Application Support" / "OrcaSlicer"
    if not path.is_dir():
        raise FileNotFoundError(f"OrcaSlicer data directory not found at {path}")
    return path


def system_dir() -> Path:
    return orca_data_dir() / "system"


def user_root_dir() -> Path:
    return orca_data_dir() / "user"


def read_conf() -> dict:
    conf_path = orca_data_dir() / "OrcaSlicer.conf"
    with open(conf_path, "r", encoding="utf-8") as f:
        return json.load(f)


def active_user_folder_id() -> str:
    conf = read_conf()
    folder_id = conf.get("app", {}).get("preset_folder")
    if not folder_id:
        raise KeyError("app.preset_folder not found in OrcaSlicer.conf")
    return folder_id


def active_user_dir() -> Path:
    return user_root_dir() / active_user_folder_id()


def list_vendors() -> list[str]:
    sdir = system_dir()
    if not sdir.is_dir():
        return []
    return sorted(p.name for p in sdir.iterdir() if p.is_dir())


def list_user_folders() -> list[str]:
    udir = user_root_dir()
    if not udir.is_dir():
        return []
    return sorted(p.name for p in udir.iterdir() if p.is_dir())
