"""
Test pypdf's ability to read and fill XFA-encrypted PDF form fields.
Tests SF-2818, SF-3107, SF-3108.
"""
import pypdf
import sys
import json

test_files = {
    "SF-2818": r"C:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\sf2818.pdf",
    "SF-3107": r"C:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\sf3107.pdf",
    "SF-3108": r"C:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\sf3108.pdf",
}

for form_id, path in test_files.items():
    print(f"\n=== {form_id} ===")
    try:
        reader = pypdf.PdfReader(path)
        fields = reader.get_fields()
        if not fields:
            print(f"  No fields found by pypdf")
            # Check for XFA
            if "/AcroForm" in reader.trailer.get("/Root", {}):
                acroform = reader.trailer["/Root"]["/AcroForm"]
                if "/XFA" in acroform:
                    print(f"  XFA detected in AcroForm")
            continue
        
        printable = {k: v for k, v in fields.items() if all(32 <= ord(c) < 127 for c in k)}
        garbled = len(fields) - len(printable)
        
        print(f"  Total fields: {len(fields)}")
        print(f"  Printable names: {len(printable)}")
        if garbled > 0:
            print(f"  Garbled names: {garbled}")
        
        # Show first 15 printable fields
        for i, (name, field) in enumerate(printable.items()):
            if i >= 15:
                print(f"  ... and {len(printable) - 15} more")
                break
            ft = field.get("/FT", "unknown")
            print(f"  [{ft}] \"{name}\"")
            
    except Exception as e:
        print(f"  ERROR: {e}")

# Now test WRITING to SF-2818
print("\n\n=== WRITE TEST: SF-2818 ===")
try:
    reader = pypdf.PdfReader(test_files["SF-2818"])
    writer = pypdf.PdfWriter()
    writer.append(reader)
    
    # Try to fill known fields from the extraction doc
    test_data = {
        "employee name": "Battisto, Hal",
        "DOB": "04/14/1960",
        "Department": "Franklin Green Construction",
        "SSN": "***-**-****",
    }
    
    writer.update_page_form_field_values(writer.pages[0], test_data)
    
    out_path = r"C:\WIP\FEDSafeRetirement_App\App\test_pypdf_sf2818.pdf"
    with open(out_path, "wb") as f:
        writer.write(f)
    print(f"  SUCCESS — written to {out_path}")
    
    # Verify by reading back
    verify = pypdf.PdfReader(out_path)
    vfields = verify.get_fields() or {}
    for name in test_data:
        if name in vfields:
            val = vfields[name].get("/V", "")
            print(f"  Verify: \"{name}\" = \"{val}\"")
        else:
            print(f"  Verify: \"{name}\" — NOT FOUND in output")
            
except Exception as e:
    print(f"  WRITE ERROR: {e}")
