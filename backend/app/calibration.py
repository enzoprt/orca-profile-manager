"""Extraction of the filament-level fields the user has chosen to always
lock, regardless of print objective: flow ratio, pressure advance, and
nozzle/bed temperatures (selected 2026-07-11)."""

from . import preset_reader

CALIBRATION_FIELDS = [
    "filament_flow_ratio",
    "enable_pressure_advance",
    "pressure_advance",
    "nozzle_temperature",
    "nozzle_temperature_initial_layer",
    "hot_plate_temp",
    "hot_plate_temp_initial_layer",
    "cool_plate_temp",
    "cool_plate_temp_initial_layer",
    "eng_plate_temp",
    "eng_plate_temp_initial_layer",
    "textured_plate_temp",
    "textured_plate_temp_initial_layer",
]


def extract_locked_fields(filament_preset_name: str) -> dict:
    resolved = preset_reader.resolve(filament_preset_name, "filament")
    return {field: resolved[field] for field in CALIBRATION_FIELDS if field in resolved}
