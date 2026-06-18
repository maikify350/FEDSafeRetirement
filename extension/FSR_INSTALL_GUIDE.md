# FedSafe Retirement Copilot — Chrome Extension
## Installation & User Guide

---

## What This Does

The FedSafe Retirement Copilot is a Chrome browser extension that sits alongside your Act! CRM.  
When you open a contact in Act!, a slide-out panel appears on the right side of the screen giving you:

- **FEGLI Calculations** — current, retirement, and final income
- **Contact Field Viewer** — see and edit Act! fields without navigating menus
- **Retirement Blueprint PDF** — generate and save a personalized PDF for the contact
- **Auto-fill Rules** — set rules that pre-populate fields automatically

No data ever touches your local computer. All calculations run on FedSafe's secure cloud servers.

---

## Requirements

- Google Chrome browser (version 100 or newer)
- An active Act! CRM account with your normal login credentials
- Internet connection

---

## Step 1 — Install the Extension

You will receive either:
- **A Chrome Web Store link** (preferred — one click install), or
- **A ZIP file** (manual install — follow steps below)

### Option A: Chrome Web Store Link (easiest)
1. Click the link provided by your FedSafe administrator
2. Click **Add to Chrome**
3. Click **Add extension** in the popup
4. Done — skip to Step 2

### Option B: Manual Install from ZIP file
1. Save the ZIP file (`fedsafe-copilot-v1.0.0.zip`) to your Desktop
2. **Unzip it** — right-click → Extract All → choose a folder (e.g. `Desktop\FedSafe Copilot`)
3. Open Chrome and go to: `chrome://extensions`
4. Turn on **Developer mode** using the toggle in the top-right corner
5. Click **Load unpacked**
6. Browse to the folder you just extracted and click **Select Folder**
7. The extension icon (shield) will appear in your Chrome toolbar

---

## Step 2 — Pin the Extension Icon

1. Click the **puzzle piece icon** (🧩) in the top-right of Chrome
2. Find **FedSafe Retirement Copilot** in the list
3. Click the **pin icon** (📌) next to it
4. The FedSafe shield icon now shows permanently in your toolbar

---

## Step 3 — Open Act! and Log In

1. Go to your Act! CRM URL (e.g. `https://yourcompany.act.com`)
2. Log in with your normal Act! username and password
3. Open any **Contact record**

---

## Step 4 — Connect the Extension to Act!

The first time you use the extension on a new computer you need to connect it to Act!.

1. Click the **FedSafe shield icon** in the Chrome toolbar  
   *(or look for the blue panel that appears on the right side of the Act! screen)*
2. If prompted, enter your **Act! username and password** in the Credentials panel
3. Click **Save Credentials**
4. Your credentials are saved locally in Chrome — you will not need to enter them again on this computer

---

## Step 5 — Using the Copilot Panel

With a contact open in Act!, the Copilot panel slides out from the right edge of the screen.

### Tab 1 — Insights
- Shows the contact's name, agency, and key details at a glance
- Links to public federal employee records and enrichment sources

### Tab 2 — Fields
- Lists all Act! fields for this contact with their current values
- You can edit field values directly from this panel and save them back to Act!
- Use **Reload from API** to refresh with the latest data from Act!

### Tab 3 — FEGLI & Retirement
- **Calculate Current** — computes current FEGLI life insurance costs
- **Calculate Retirement** — projects retirement FEGLI and pension figures
- **Final Calculation** — full income summary in retirement
- **Generate Blueprint PDF** — creates a personalized retirement blueprint PDF for the contact and saves it to the cloud

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Panel does not appear on the Act! page | Refresh the Act! page. If still missing, click the shield icon in the toolbar to open it manually. |
| "API Error" or calculation fails | Check your internet connection. If the error persists, contact your FedSafe administrator. |
| Credentials rejected | Re-enter your Act! username and password in the Credentials panel. Make sure you use the same login you use to open Act! normally. |
| Extension disappeared from toolbar | Go to `chrome://extensions`, find FedSafe Retirement Copilot, and make sure it is **enabled** (toggle is blue). Pin it again using the puzzle piece icon. |
| Chrome says "Developer mode" extension | This appears only during the beta period. Click **Keep** or **Cancel** on any warnings. This message goes away once the extension is published to the Chrome Web Store. |

---

## Privacy & Security

- Your Act! password is stored **only on your local Chrome browser** — it is never sent to FedSafe servers
- All FEGLI and retirement calculations are performed on FedSafe's secure Vercel cloud (no data stored on any local computer)
- The extension only activates on Act! CRM pages — it does not read or modify any other websites you visit

---

## Getting Help

Contact your FedSafe Retirement administrator or email **support@fedsaferetirement.com**

---

*FedSafe Retirement Copilot v1.0.0 — VentureSoft LLC*
