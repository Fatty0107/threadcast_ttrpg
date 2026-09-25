from pathlib import Path
import fitz

root = Path("attached_assets")
output = Path("/tmp/affinity-tables")
output.mkdir(parents=True, exist_ok=True)
files = [
    *root.glob("Aeolus_-_Affinity_&_Strings_*.pdf"),
    *root.glob("Evander_Theron_-_Affinity_&_Strings_*.pdf"),
    *root.glob("Florian_Kristensen_-_Affinity_&_Strings_*.pdf"),
    *root.glob("Hycinthia_Seisyll_-_Affinity_and_Strings_*.pdf"),
    *root.glob("Lemon_Aleura___Lilith_-_Affinity_&_Strings_*.pdf"),
    *root.glob("Melody_Aleura_Affinity_and_Strings_Overtone_*.pdf"),
    *root.glob("Saiph_Lovelace_-_Affinity_and_Strings_*.pdf"),
]
with (output / "all-text.txt").open("w") as text_file:
    for path in files:
        document = fitz.open(path)
        print(f"{path.name}: {len(document)} pages")
        for index, page in enumerate(document):
            text = page.get_text()
            text_file.write(f"\n\n===== {path.name} PAGE {index + 1} =====\n{text}")
            if any(marker in text.lower() for marker in ("power level", "pl 1", "pl 2", "thread point", "casting table")):
                destination = output / f"{path.stem.replace(' ', '_')}_p{index + 1}.png"
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(destination)
                print(f"  rendered page {index + 1}: {destination.name}")