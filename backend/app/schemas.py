import datetime

from pydantic import BaseModel, ConfigDict


class SpoolIn(BaseModel):
    brand: str
    material: str
    color: str = ""
    diameter_mm: float = 1.75
    cost: float | None = None
    filament_preset_name: str | None = None
    notes: str = ""


class SpoolOut(SpoolIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime


class NozzleIn(BaseModel):
    diameter_mm: float = 0.4
    material: str = "brass"
    printer_name: str = ""
    notes: str = ""


class NozzleOut(NozzleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime


class ComboIn(BaseModel):
    name: str
    spool_id: int
    nozzle_id: int
    process_preset_name: str | None = None
    machine_preset_name: str | None = None
    objectives: list[str] = []
    notes: str = ""


class ComboOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    spool_id: int
    nozzle_id: int
    process_preset_name: str | None
    machine_preset_name: str | None
    objectives: list[str]
    notes: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class CalibrationProfileIn(BaseModel):
    spool_id: int
    nozzle_id: int
    source_filament_preset: str
    notes: str = ""


class CalibrationProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    spool_id: int
    nozzle_id: int
    source_filament_preset: str
    locked_fields: dict
    notes: str
    created_at: datetime.datetime
    updated_at: datetime.datetime


class AdjustmentIn(BaseModel):
    combo_id: int
    field: str
    old_value: str = ""
    new_value: str = ""
    reason: str = ""
    source: str = "manual"


class AdjustmentOut(AdjustmentIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime.datetime
