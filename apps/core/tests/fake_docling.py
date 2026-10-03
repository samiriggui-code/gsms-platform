"""Faux Docling pour les tests : mêmes attributs que les objets Docling ≥ 2 utilisés par l'adapter
(``convert().document``, ``iterate_items(with_groups=True)``, ``label``, ``text``, ``prov[].page_no``,
``prov[].bbox.l/t``, ``data.table_cells``…). Aucun modèle n'est téléchargé."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Label:
    value: str


@dataclass
class BBox:
    l: float = 0  # noqa: E741 - nom Docling
    t: float = 0


@dataclass
class Prov:
    page_no: int
    bbox: BBox = field(default_factory=BBox)


@dataclass
class TextItem:
    label: Label
    text: str
    prov: list[Prov]
    self_ref: str


@dataclass
class Cell:
    text: str
    start_row_offset_idx: int
    start_col_offset_idx: int
    column_header: bool = False


@dataclass
class TableData:
    num_rows: int
    num_cols: int
    table_cells: list[Cell]


@dataclass
class TableItem:
    data: TableData
    prov: list[Prov]
    self_ref: str
    label: Label = field(default_factory=lambda: Label("table"))


@dataclass
class Group:
    name: str
    label: Label = field(default_factory=lambda: Label("section"))


@dataclass
class FakeDoc:
    items: list[tuple[Any, int]]
    pages: int = 1

    def iterate_items(self, with_groups: bool = False):
        for item, level in self.items:
            if isinstance(item, Group) and not with_groups:
                continue
            yield item, level

    def num_pages(self) -> int:
        return self.pages


@dataclass
class Result:
    document: FakeDoc | None
    status: Label = field(default_factory=lambda: Label("success"))


def text(label: str, value: str, page: int, ref: str, level: int = 1) -> tuple[TextItem, int]:
    return TextItem(Label(label), value, [Prov(page)], ref), level


def table(
    rows: list[list[str]], page: int, ref: str, anchor: tuple[int, int] = (0, 0)
) -> tuple[TableItem, int]:
    cells = [
        Cell(value, r, c, column_header=(r == 0)) for r, row in enumerate(rows) for c, value in enumerate(row)
    ]
    data = TableData(num_rows=len(rows), num_cols=max(len(r) for r in rows), table_cells=cells)
    return TableItem(data, [Prov(page, BBox(l=anchor[0], t=anchor[1]))], ref), 1


class FakeConverter:
    """``convert(path)`` renvoie le document prévu pour ce nom de fichier, ou lève l'erreur prévue."""

    def __init__(self, docs: dict[str, FakeDoc | Exception | Callable[[], Result]]) -> None:
        self.docs = docs
        self.calls: list[str] = []

    def convert(self, source: str) -> Result:
        name = Path(source).name
        self.calls.append(name)
        entry = self.docs[name]
        if isinstance(entry, Exception):
            raise entry
        if callable(entry):
            return entry()
        return Result(entry)


# --- dossier d'appel d'offres de démonstration --------------------------------------------------

CCTP = FakeDoc(
    [
        text("page_header", "Marché de sécurité — page 1", 1, "#/texts/0"),
        text("title", "Cahier des clauses techniques particulières", 1, "#/texts/1"),
        text("section_header", "Article 4 — Moyens humains", 2, "#/texts/2"),
        text(
            "text",
            "Le titulaire doit assurer en permanence la présence de 2 agents SSIAP 1"
            " et d'un chef d'équipe SSIAP 2.",
            2,
            "#/texts/3",
        ),
        text("text", "Tout manquement donnera lieu à des pénalités de 500 € par jour.", 3, "#/texts/4"),
    ],
    pages=3,
)

RC = FakeDoc(
    [
        text("title", "Règlement de la consultation", 1, "#/texts/0"),
        text("section_header", "Pièces à fournir", 2, "#/texts/1"),
        text("list_item", "Mémoire technique", 2, "#/texts/2"),
        text("list_item", "DC1 et DC2 signés", 2, "#/texts/3"),
        text("text", "Date limite de remise des offres : 15/11/2026 à 12h00.", 3, "#/texts/4"),
        text("text", "Toute offre incomplète sera rejetée.", 3, "#/texts/5"),
    ],
    pages=3,
)

BPU = FakeDoc(
    [
        (Group("BPU", Label("sheet")), 0),  # format docling 2.132
        table(
            [["Désignation", "Unité", "Quantité", "Prix unitaire"], ["Agent SSIAP 1", "heure", "1", ""]],
            page=1,
            ref="#/tables/0",
            anchor=(1, 2),  # tableau ancré en B3
        ),
    ]
)

DPGF = FakeDoc(
    [
        (Group("sheet: Récapitulatif"), 0),  # format des versions antérieures
        table([["Poste", "Effectif"], ["SSIAP 1", "2"]], page=1, ref="#/tables/0"),
    ]
)
