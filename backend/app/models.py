"""SQLAlchemy models for the organizational layer OrcaSlicer doesn't have:
spools, nozzles, print-objective combos, and a history of adjustments made
to them (manually or via AI-chat suggestions)."""

import datetime
import json

from sqlalchemy import ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class Spool(Base):
    __tablename__ = "spools"

    id: Mapped[int] = mapped_column(primary_key=True)
    brand: Mapped[str] = mapped_column(Text)
    material: Mapped[str] = mapped_column(Text)  # PLA, PETG, ABS, ...
    color: Mapped[str] = mapped_column(Text, default="")
    diameter_mm: Mapped[float] = mapped_column(default=1.75)
    cost: Mapped[float | None] = mapped_column(default=None)
    filament_preset_name: Mapped[str | None] = mapped_column(Text, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(default=_now)

    combos: Mapped[list["Combo"]] = relationship(back_populates="spool")


class Nozzle(Base):
    __tablename__ = "nozzles"

    id: Mapped[int] = mapped_column(primary_key=True)
    diameter_mm: Mapped[float] = mapped_column(default=0.4)
    material: Mapped[str] = mapped_column(Text, default="brass")  # brass, hardened steel, ...
    printer_name: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(default=_now)

    combos: Mapped[list["Combo"]] = relationship(back_populates="nozzle")


class Combo(Base):
    __tablename__ = "combos"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    spool_id: Mapped[int] = mapped_column(ForeignKey("spools.id"))
    nozzle_id: Mapped[int] = mapped_column(ForeignKey("nozzles.id"))
    process_preset_name: Mapped[str | None] = mapped_column(Text, default=None)
    machine_preset_name: Mapped[str | None] = mapped_column(Text, default=None)
    objectives_json: Mapped[str] = mapped_column(Text, default="[]")  # e.g. ["precision","solidite"]
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(default=_now, onupdate=_now)

    spool: Mapped["Spool"] = relationship(back_populates="combos")
    nozzle: Mapped["Nozzle"] = relationship(back_populates="combos")
    adjustments: Mapped[list["Adjustment"]] = relationship(back_populates="combo")

    @property
    def objectives(self) -> list[str]:
        return json.loads(self.objectives_json or "[]")

    @objectives.setter
    def objectives(self, value: list[str]) -> None:
        self.objectives_json = json.dumps(value)


class CalibrationProfile(Base):
    """The set of filament-level fields (flow ratio, pressure advance,
    temperatures...) that were dialed in for one spool+nozzle pair and must
    never be touched by objective-driven tuning."""

    __tablename__ = "calibration_profiles"
    __table_args__ = (UniqueConstraint("spool_id", "nozzle_id", name="uq_calibration_spool_nozzle"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    spool_id: Mapped[int] = mapped_column(ForeignKey("spools.id"))
    nozzle_id: Mapped[int] = mapped_column(ForeignKey("nozzles.id"))
    source_filament_preset: Mapped[str] = mapped_column(Text)
    locked_fields_json: Mapped[str] = mapped_column(Text, default="{}")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(default=_now, onupdate=_now)

    spool: Mapped["Spool"] = relationship()
    nozzle: Mapped["Nozzle"] = relationship()

    @property
    def locked_fields(self) -> dict:
        return json.loads(self.locked_fields_json or "{}")

    @locked_fields.setter
    def locked_fields(self, value: dict) -> None:
        self.locked_fields_json = json.dumps(value)


class Adjustment(Base):
    __tablename__ = "adjustments"

    id: Mapped[int] = mapped_column(primary_key=True)
    combo_id: Mapped[int] = mapped_column(ForeignKey("combos.id"))
    field: Mapped[str] = mapped_column(Text)
    old_value: Mapped[str] = mapped_column(Text, default="")
    new_value: Mapped[str] = mapped_column(Text, default="")
    reason: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(Text, default="manual")  # "manual" | "ai-chat-suggestion"
    created_at: Mapped[datetime.datetime] = mapped_column(default=_now)

    combo: Mapped["Combo"] = relationship(back_populates="adjustments")
