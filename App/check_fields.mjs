import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'fs';

const files = {
  'SF-2818': 'C:/WIP/FEDSafeRetirement_App/Docs/ORA-Forms/sf2818.pdf',
  'SF-3107': 'C:/WIP/FEDSafeRetirement_App/Docs/ORA-Forms/sf3107.pdf',
  'SF-3108': 'C:/WIP/FEDSafeRetirement_App/Docs/ORA-Forms/sf3108.pdf',
};

for (const [id, path] of Object.entries(files)) {
  const bytes = readFileSync(path);
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();
    const printable = fields.filter(f => /^[\x20-\x7E]+$/.test(f.getName()));
    console.log(`=== ${id} (LOCAL) === ${fields.length} fields, ${printable.length} printable`);
    printable.slice(0, 15).forEach(f => {
      let type = 'unknown';
      const name = f.getName();
      try { form.getTextField(name); type = 'text'; } catch {}
      if (type === 'unknown') try { form.getCheckBox(name); type = 'checkbox'; } catch {}
      if (type === 'unknown') try { form.getRadioGroup(name); type = 'radio'; } catch {}
      if (type === 'unknown') try { form.getDropdown(name); type = 'dropdown'; } catch {}
      console.log(`  [${type}] "${name}"`);
    });
    if (printable.length > 15) console.log(`  ... and ${printable.length - 15} more`);
    try { form.flatten(); console.log(`  FLATTEN: OK`); } catch(e) { console.log(`  FLATTEN: FAIL - ${e.message.slice(0,100)}`); }
  } catch(e) {
    console.log(`=== ${id} === LOAD FAIL: ${e.message.slice(0,100)}`);
  }
  console.log('');
}
