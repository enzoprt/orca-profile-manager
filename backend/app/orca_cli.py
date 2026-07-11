"""Thin wrapper around OrcaSlicer's headless CLI, for validating combos
(e.g. test-slicing) without going through the GUI."""

import subprocess
from pathlib import Path

ORCA_BIN = Path("/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer")


class OrcaCliError(RuntimeError):
    pass


def is_available() -> bool:
    return ORCA_BIN.exists()


def is_running() -> bool:
    try:
        return subprocess.run(["pgrep", "-x", "OrcaSlicer"], capture_output=True, timeout=5).returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def run(args: list[str], timeout: int = 60) -> subprocess.CompletedProcess:
    if not is_available():
        raise OrcaCliError(f"OrcaSlicer binary not found at {ORCA_BIN}")
    try:
        return subprocess.run(
            [str(ORCA_BIN), *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        raise OrcaCliError(f"OrcaSlicer CLI timed out after {timeout}s: {args}") from exc


def slice_model(
    model_path: str,
    settings_paths: list[str],
    filament_paths: list[str],
    export_3mf_path: str | None = None,
    plate: str | int | None = None,
    timeout: int = 120,
) -> subprocess.CompletedProcess:
    """Slice a model with the given process/machine settings + filament presets,
    to validate a combo actually produces a sliceable result."""
    args = [
        "--load-settings", ";".join(settings_paths),
        "--load-filaments", ";".join(filament_paths),
        "--slice", str(plate) if plate is not None else "0",
    ]
    if export_3mf_path:
        args += ["--export-3mf", export_3mf_path]
    args.append(model_path)
    return run(args, timeout=timeout)
