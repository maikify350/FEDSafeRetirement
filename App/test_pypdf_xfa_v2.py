"""
Test pypdf write with different approaches for XFA forms.
"""
import pypdf
from pypdf.generic import NameObject, TextStringObject

path = r"C:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\sf2818.pdf"
out = r"C:\WIP\FEDSafeRetirement_App\App\test_pypdf_sf2818_v2.pdf"

reader = pypdf.PdfReader(path)
writer = pypdf.PdfWriter(clone_from=reader)

# Approach: directly update field annotations
test_data = {
    "employee name": "Battisto, Hal",
    "DOB": "04/14/1960",
    "Department": "Franklin Green Construction",
    "work address": "Washington, DC 20001",
}

# Method 1: update_page_form_field_values on all pages
for page_num in range(len(writer.pages)):
    writer.update_page_form_field_values(writer.pages[page_num], test_data)

with open(out, "wb") as f:
    writer.write(f)

# Verify
v = pypdf.PdfReader(out)
vf = v.get_fields() or {}
print("Method 1 results:")
for name in test_data:
    val = vf.get(name, {})
    v_val = val.get("/V", "") if isinstance(val, dict) else ""
    print(f"  {name}: '{v_val}'")

# Method 2: Direct annotation manipulation
print("\nMethod 2: Direct annotation...")
reader2 = pypdf.PdfReader(path)
writer2 = pypdf.PdfWriter(clone_from=reader2)

if "/AcroForm" in writer2._root_object:
    acroform = writer2._root_object["/AcroForm"]
    if "/Fields" in acroform:
        for field_ref in acroform["/Fields"]:
            field = field_ref.get_object()
            field_name = field.get("/T", "")
            if field_name in test_data:
                field.update({
                    NameObject("/V"): TextStringObject(test_data[field_name]),
                })
                print(f"  Set {field_name} = {test_data[field_name]}")

out2 = r"C:\WIP\FEDSafeRetirement_App\App\test_pypdf_sf2818_v3.pdf"
with open(out2, "wb") as f:
    writer2.write(f)

v2 = pypdf.PdfReader(out2)
vf2 = v2.get_fields() or {}
print("\nMethod 2 verify:")
for name in test_data:
    val = vf2.get(name, {})
    v_val = val.get("/V", "") if isinstance(val, dict) else ""
    print(f"  {name}: '{v_val}'")

print(f"\nOpening {out2}...")
import subprocess
subprocess.Popen(["start", "", out2], shell=True)
