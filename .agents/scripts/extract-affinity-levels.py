import json
import re
from pathlib import Path
import fitz

root = Path("attached_assets")
output = Path("/tmp/affinity-tables")
patterns = {
    "luck": "Aeolus_-_Affinity_&_Strings_*.pdf",
    "emotion": "Evander_Theron_-_Affinity_&_Strings_*.pdf",
    "mirror": "Florian_Kristensen_-_Affinity_&_Strings_*.pdf",
    "healing": "Hycinthia_Seisyll_-_Affinity_and_Strings_*.pdf",
    "illusions": "Lemon_Aleura___Lilith_-_Affinity_&_Strings_*.pdf",
    "leyline-energy": "Melody_Aleura_Affinity_and_Strings_Overtone_*.pdf",
    "cosmic": "Saiph_Lovelace_-_Affinity_and_Strings_*.pdf",
}
all_levels = {}
for affinity, pattern in patterns.items():
    path, = root.glob(pattern)
    document = fitz.open(path)
    found = []
    unmatched = []
    for page_number, page in enumerate(document, start=1):
        for table in page.find_tables().tables:
            rows = table.extract()
            for row in rows:
                if not row or not re.fullmatch(r"[1-5]", (row[0] or "").strip()):
                    continue
                match = re.fullmatch(r"\s*(\d+)\s*/\s*(\d+)\s*", row[1] or "") if len(row) > 1 else None
                if not match:
                    unmatched.append((page_number, row[:2]))
                    continue
                found.append({
                    "pl": int(row[0].strip()),
                    "cost": int(match[1]),
                    "dc": int(match[2]),
                    "page": page_number,
                })
    groups, current = [], []
    for row in found:
        if row["pl"] == 1 and current:
            groups.append(current)
            current = []
        current.append(row)
    if current:
        groups.append(current)
    print(f"{affinity}: {len(found)} rows in {len(groups)} tables, lengths {[len(group) for group in groups]}, unmatched {unmatched}")
    for i, group in enumerate(groups, start=1):
        print(f"  {i:02}: {[(row['pl'], row['cost'], row['dc']) for row in group]}")
    all_levels[affinity] = groups
(output / "levels-summary.json").write_text(json.dumps(all_levels, indent=2))