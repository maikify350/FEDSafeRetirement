"""
Vercel Python Serverless Function — XFA PDF Filler
────────────────────────────────────────────────────
Handles XFA-encrypted forms that pdf-lib (JS) cannot process.
Called internally by the JS generate-pdf route when it detects an XFA form.

POST /api/fill-xfa
Body: { "templateUrl": "...", "mappedFields": {...}, "storagePath": "...", "contactId": "..." }
Returns: { "success": true, "filledBytes": "<base64>" }
"""

from http.server import BaseHTTPRequestHandler
import json
import base64
import urllib.request
import pypdf
from pypdf.generic import NameObject, TextStringObject, BooleanObject
from io import BytesIO


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}

            template_url = body.get("templateUrl", "")
            mapped_fields = body.get("mappedFields", {})

            if not template_url:
                return self._json(400, {"success": False, "error": "Missing templateUrl"})

            # Download PDF template
            req = urllib.request.Request(template_url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                pdf_bytes = resp.read()

            # Fill with pypdf
            reader = pypdf.PdfReader(BytesIO(pdf_bytes))
            writer = pypdf.PdfWriter(clone_from=reader)

            filled_count = 0
            filled_names = []

            # Get all field names from the PDF
            all_fields = reader.get_fields() or {}
            field_index = {}
            for name, field_obj in all_fields.items():
                field_index[name] = field_obj
                field_index[name.strip()] = field_obj

            # Fill fields
            for pdf_field_name, value in mapped_fields.items():
                if not value or str(value).strip() == "":
                    continue

                str_val = str(value).strip()
                matched_name = None

                # Try exact match, then trimmed
                if pdf_field_name in field_index:
                    matched_name = pdf_field_name
                elif pdf_field_name.strip() in field_index:
                    matched_name = pdf_field_name.strip()

                if not matched_name:
                    continue

                field_obj = field_index[matched_name]
                field_type = str(field_obj.get("/FT", ""))

                try:
                    if field_type == "/Tx":
                        # Text field — update via page form fields
                        for page in writer.pages:
                            writer.update_page_form_field_values(page, {matched_name: str_val})
                        filled_count += 1
                        filled_names.append(matched_name)

                    elif field_type == "/Btn":
                        # Checkbox/radio — set /V and /AS
                        if str_val.lower() in ("yes", "true", "on", "x", "1"):
                            self._set_checkbox(writer, matched_name, True)
                            filled_count += 1
                            filled_names.append(matched_name)
                        elif str_val.lower() in ("no", "false", "off", "0"):
                            self._set_checkbox(writer, matched_name, False)
                            filled_count += 1
                            filled_names.append(matched_name)

                except Exception:
                    pass  # Skip fields that error

            # Save to bytes
            output = BytesIO()
            writer.write(output)
            filled_bytes = output.getvalue()

            # Return base64 to the JS caller
            result = {
                "success": True,
                "filledBytes": base64.b64encode(filled_bytes).decode("ascii"),
                "actualFilled": filled_count,
                "filledFields": filled_names[:20],
                "totalPdfFields": len(all_fields),
            }
            self._json(200, result)

        except Exception as e:
            self._json(500, {"success": False, "error": str(e)})

    def _set_checkbox(self, writer, field_name, checked):
        """Set a checkbox field value in the PDF."""
        if "/AcroForm" not in writer._root_object:
            return
        acroform = writer._root_object["/AcroForm"]
        if "/Fields" not in acroform:
            return
        for field_ref in acroform["/Fields"]:
            field = field_ref.get_object()
            if field.get("/T", "") == field_name:
                val = NameObject("/Yes") if checked else NameObject("/Off")
                field.update({
                    NameObject("/V"): val,
                    NameObject("/AS"): val,
                })
                break

    def _json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
