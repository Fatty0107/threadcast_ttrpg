"""Extract per-PL effects from the seven supplied String handouts.

Run from the workspace root. The output is static app data; the PDFs are not
needed by the running web app. Refuse to publish incomplete or suspicious rows.
"""
import json
import re
import sys
from pathlib import Path

import fitz


SOURCES = {
    "Luck": "Aeolus_-_Affinity_&_Strings_*.pdf",
    "Leyline Energy Conversion": "Melody_Aleura_Affinity_and_Strings_Overtone_*.pdf",
    "Emotion": "Evander_Theron_-_Affinity_&_Strings_*.pdf",
    "Illusions": "Lemon_Aleura___Lilith_-_Affinity_&_Strings_*.pdf",
    "Fire": "Saiph_Lovelace_-_Affinity_and_Strings_*.pdf",
    "Mirror": "Florian_Kristensen_-_Affinity_&_Strings_*.pdf",
    "Healing": "Hycinthia_Seisyll_-_Affinity_and_Strings_*.pdf",
}
HEADING = re.compile(
    r"(?im)^\s*\d{1,2}\.\s*(?:The\s+)?([^\n]+?)\s+String\s*[—–-]\s*(?:THS|POT|CTR)\s*$"
)
ROW = re.compile(r"(?m)^\s*([1-5])\s*\n\s*(\d+)\s*/\s*(\d+)\s*\n")
END_NOTE = re.compile(
    r"(?im)\n\s*(?:Double edge|Boundaries|Boundary|Limits|Limitations|Limit)\s*:"
    r"|\n\s*\d{1,2}\.\s*(?:The\s+)?[^\n]+?\s+String\s*[—–-]\s*(?:THS|POT|CTR)"
)
OUTPUT = Path("artifacts/threadcast/src/lib/handout-string-effects.json")


def healing_effects(document, names):
    # This handout has two separate effect columns. Plain text extraction
    # interleaves them, so read each table cell in its visual order instead.
    rows = []
    for page in document:
        for table in page.find_tables().tables:
            if not table.rows or len(table.rows[0].cells) != 4:
                continue
            for table_row in table.rows:
                cells = [
                    " ".join(page.get_text(clip=fitz.Rect(cell)).split()) if cell else ""
                    for cell in table_row.cells
                ]
                if re.fullmatch(r"[1-5]", cells[0]):
                    rows.append([int(cells[0]), cells[2], cells[3]])
                elif not cells[0] and rows and (cells[2] or cells[3]):
                    # A long row can continue at the top of the next page.
                    rows[-1][1] = " ".join(filter(None, (rows[-1][1], cells[2])))
                    rows[-1][2] = " ".join(filter(None, (rows[-1][2], cells[3])))
    if len(rows) != 60:
        raise ValueError(f"Healing: expected 60 rows, found {len(rows)}")
    result = {}
    for index, name in enumerate(names):
        levels = []
        for offset in range(5):
            pl, healing, blood = rows[index * 5 + offset]
            if pl != offset + 1 or not healing or not blood:
                raise ValueError(f"Healing/{name}: incomplete PL {offset + 1}")
            levels.append(f"Healing: {healing} Blood: {blood}")
        result[f"{name} String"] = levels
    return result


def extract():
    result = {}
    for affinity, pattern in SOURCES.items():
        paths = list(Path("attached_assets").glob(pattern))
        if len(paths) != 1:
            raise ValueError(f"{affinity}: expected one handout, found {len(paths)}")
        document = fitz.open(paths[0])
        text = "\n".join(page.get_text() for page in document)
        names = [match.group(1).strip() for match in HEADING.finditer(text)]
        rows = list(ROW.finditer(text))
        if len(names) != 12 or len(set(names)) != 12 or len(rows) != 60:
            raise ValueError(f"{affinity}: found {len(names)} Strings and {len(rows)} PL rows, expected 12 and 60")
        if affinity == "Healing":
            result[affinity] = healing_effects(document, names)
            continue
        effects = {}
        for index, name in enumerate(names):
            levels = []
            for offset in range(5):
                pos = index * 5 + offset
                row = rows[pos]
                if int(row.group(1)) != offset + 1:
                    raise ValueError(f"{affinity}/{name}: unexpected PL {row.group(1)}")
                end = rows[pos + 1].start() if pos + 1 < len(rows) else len(text)
                raw = text[row.end():end]
                raw = END_NOTE.split(raw, maxsplit=1)[0]
                effect = " ".join(raw.replace("-\n", "-").split())
                if not 15 <= len(effect) <= 1100 or any(
                    note in effect for note in ("TP / DC", "Double edge:", "Boundaries:", "Boundary:", "Limit:")
                ):
                    raise ValueError(f"{affinity}/{name}/PL {offset + 1}: suspicious effect: {effect!r}")
                levels.append(effect)
            effects[f"{name} String"] = levels
        result[affinity] = effects
    return result


if __name__ == "__main__":
    data = extract()
    if "--dry-run" in sys.argv:
        for affinity, strings in data.items():
            print(f"{affinity}: {len(strings)} Strings, {sum(map(len, strings.values()))} effects")
            first = next(iter(strings.items()))
            print(f"  {first[0]} PL 1: {first[1][0]}")
            print(f"  {first[0]} PL 5: {first[1][4]}")
    else:
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        print(f"Wrote {OUTPUT}: {sum(len(strings) * 5 for strings in data.values())} effects")