---
name: elevenlabs-voice-prompting
description: Master reference guide and best practices for ElevenLabs Text-to-Speech (TTS), prompt engineering, inline audio tags, emotion control, pause management, and text normalization in FEDSafe Video Studio.
---

# ElevenLabs Voice Prompting & Direction Guide

Use this skill when scripting, tuning, enhancing, or generating voiceovers for FEDSafe Retirement videos using ElevenLabs TTS models (`eleven_turbo_v2_5`, `eleven_multilingual_v2`, `eleven_v3`).

---

## 1. Core Model Differences & Directives

| Feature | v2 / Turbo v2.5 / Multilingual v2 | Eleven v3 |
|---|---|---|
| **Pauses** | `<break time="1.0s" />`, `{{pause:1}}`, dashes (`—`), ellipses (`...`) | Audio tags `[short pause]`, `[long pause]`, ellipses (`...`), capitalization |
| **Emphasis** | `{{emphasis}}WORD{{/emphasis}}`, ALL CAPS with `!` | Capitalization, ellipses, narrative framing |
| **Emotion Direction** | `{{whisper}}`, `{{excited}}`, `{{slow}}` | Audio tags `[whispers]`, `[excited]`, `[dramatically]`, `[thoughtful]`, `[sighs]` |
| **Pronunciation** | CMU Arpabet `<phoneme>`, Alias `<lexeme>`, phonetic spelling | Native IPA transcription wrapped in `/IPA_symbols/` |
| **Stability** | `0.30–0.35` (dynamic/expressive), `0.75+` (monotone/stable) | `Creative` / `Natural` / `Robust` |

---

## 2. Granular Inline Section Tags

Use inline section tags to modulate tone, emotion, and pacing for **distinct words or phrases** rather than applying flat global settings across the entire video:

### Pauses & Breaths
- `/` or `{{pause:1}}` or `[short pause]` — Natural 1-second breathing transition.
- `//` or `{{pause:2}}` or `[long pause]` — Dramatic 2-second hook pause.
- `///` or `{{pause:3}}` — Full 3-second scene transition.
- `[sighs]`, `[exhales]` — Human-like relief or empathetic release.

### Vocal Stress & Emphasis
- `{{emphasis}}WORD{{/emphasis}}` — Concentrated pitch elevation and acoustic punch.
- **ALL CAPS + Exclamation** (`NEVER!`, `THOUSANDS!`) — Direct stress on key financial terms.
- `[dramatically]` — High-stakes cautionary urgency on critical retirement warnings.

### Advisory & Tone Modulation
- `[thoughtful]` — Reflective, analytical advisor pacing.
- `[excited]` or `{{excited}}` — Upbeat, motivating momentum for success calls-to-action.
- `[whispers]` or `{{whisper}}` — Confidential, exclusive advisory tone.
- `{{slow}}` — Deliberate, high-clarity pacing for complex rule explanations.
- `[laughs]`, `[chuckles]` — Warm, approachable demeanor.

---

## 3. Text Normalization Rules (Financial & Federal)

Text-to-speech models struggle with raw numerals, currency, acronyms, and phone numbers unless normalized or phonetically expanded:

### Pronunciation & Normalization Replacements:
- **Phone Numbers:** `(774) 273-8473` → `"seven seven four, two seven three, eight four seven three"`
- **Currency:** `$1,000,000` → `"one million dollars"`, `$45.50` → `"forty-five dollars and fifty cents"`
- **Percentages:** `500%` → `"five hundred percent"`
- **Websites:** `FedSafeRetirement.com` → `"FedSafe Retirement dot com"`
- **IRS Tax Forms & Retirement Accounts:**
  - `401(k)` / `401k` → `"four-oh-one-k"`
  - `403(b)` / `403b` → `"four-oh-three-b"`
  - `457(b)` / `457b` → `"four-five-seven-b"`
  - `529 Plan` → `"five-twenty-nine plan"`
  - `1099-R` → `"ten ninety-nine R"`
  - `W-2` → `"W-two"`
  - `Form 1040` → `"form ten-forty"`
  - `Traditional IRA / Roth IRA` → `"I-R-A"`
  - `RMD` / `RMDs` → `"R-M-D"` / `"R-M-Ds"`
  - `COLA` → `"CO-la"`
  - `IRS` → `"I-R-S"`
  - `SSA` → `"S-S-A"`
- **Federal Retirement Programs & Standard Forms:**
  - `FEGLI` → `"FEG-lee"`
  - `FERS` → `"FERS"`
  - `CSRS` → `"C-S-R-S"`
  - `TSP` → `"T-S-P"`
  - `PSHB` → `"P-S-H-B"`
  - `FEHB` → `"F-E-H-B"`
  - `OPM` → `"O-P-M"`
  - `ORA` → `"O-R-A"`
  - `SF-2818` → `"S-F twenty-eight eighteen"` (FEGLI Continuation Form)
  - `SF-3107` → `"S-F thirty-one oh-seven"` (FERS Application for Immediate Retirement)
  - `SF-2801` → `"S-F twenty-eight oh-one"` (CSRS Application)
  - `DD-214` → `"D-D two-fourteen"` (Military Certificate of Release/Discharge)
  - `VGLI` → `"V-G-L-I"` (Veterans' Group Life Insurance)

---

## 4. UI Clean Subtitle Rule

**CRITICAL:** While ElevenLabs audio synthesis receives all inline prompt tags (`{{...}}`, `[...]`, `**`, `/`, `<break>`), the on-screen video player subtitles MUST always be stripped clean using `cleanSubtitleText()` to present **pure, uniform white typography (`#ffffff`)** without raw tag artifacts or visual clutter.
