import json

d = json.load(open("pdf_fields_raw.json", encoding="utf-8"))
SKIP = {"Print","Save","Clear","Print copies","Digital Signature","Digital Signture 2",
        "Witness Signature 1","Witness Signature 2"}

lines = []
for form, fields in d.items():
    if not isinstance(fields, list):
        continue
    af = [f for f in fields if f["type"] != "Unknown" and f["pdf_field"] not in SKIP]
    lines.append(f"=== {form} ({len(af)} actionable fields) ===")
    for f in af:
        tip = (f["tooltip"] or "")[:90]
        ftype = f["type"][:4]
        name = f["pdf_field"]
        lines.append(f"  [{ftype}] {name}  ||  {tip}")
    lines.append("")

with open("fields_summary.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(lines))
print("Done - fields_summary.txt written")
