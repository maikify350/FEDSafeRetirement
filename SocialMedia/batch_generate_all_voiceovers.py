import os
import requests
import json

env_path = r"c:\WIP\FEDSafeRetirement\SocialMedia\.env"
eleven_key = None
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("ELEVENLABS_API_KEY="):
            eleven_key = line.strip().split("=", 1)[1]

VOICE_ID = "pNInz6obpgDQGcFmaJgB" # Adam

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": eleven_key
}

batch_scripts = {
    "fers-supplement-narration.mp3": (
        "Are you retiring under FERS before age sixty-two? "
        "You might qualify for the FERS Special Annuity Supplement, a bridge payment worth thousands before Social Security begins. "
        "Don't lose out on what you earned through thirty years of service. "
        "Call us today or visit FedSafe Retirement dot com to calculate your bridge payment."
    ),
    "tsp-mistakes-narration.mp3": (
        "Three critical TSP withdrawal mistakes federal employees make at retirement: "
        "Taking taxable lump sums too early, keeping the wrong fund allocation, and failing to coordinate with your FERS pension. "
        "We help you build an intentional retirement income strategy. "
        "Call the number below or visit FedSafe Retirement dot com to schedule your free review."
    ),
    "sbp-election-narration.mp3": (
        "Choosing between a twenty-five percent and fifty percent Survivor Benefit Plan is an irreversible decision. "
        "A wrong election can cost your spouse their healthcare eligibility or cost you tens of thousands in pension reductions. "
        "Get the facts before you sign your retirement application. "
        "Call or visit FedSafe Retirement dot com today."
    ),
    "fehb-five-year-narration.mp3": (
        "To carry your FEHB health insurance into federal retirement, you must be enrolled for the five consecutive years before retiring. "
        "A single gap in coverage could cost you lifetime federal healthcare. "
        "Verify your eligibility before you submit your retirement paperwork. "
        "Call us or visit FedSafe Retirement dot com."
    ),
    "military-buyback-narration.mp3": (
        "Did you serve in the military before joining the federal government? "
        "Buying back your military time could add hundreds of dollars each month to your FERS or CSRS pension check for life. "
        "We calculate your return on investment to see if military buyback makes sense for you. "
        "Call today or visit FedSafe Retirement dot com."
    ),
    "high-three-narration.mp3": (
        "Think your High-3 pension is based solely on your final calendar year? "
        "It's actually based on your thirty-six consecutive highest-earning months, including locality pay. "
        "Understanding your exact pension formula is the key to timing your retirement date. "
        "Call or visit FedSafe Retirement dot com."
    ),
    "why-fedsafe-narration.mp3": (
        "Federal retirement shouldn't be left to guesswork. "
        "At FedSafe Retirement, we are a SAM dot gov registered contractor with over eighty combined years of federal benefits experience. "
        "We are not generalists. Federal and postal retirement is all we do. "
        "The future favors the prepared. Call or visit FedSafe Retirement dot com."
    )
}

output_dir = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public"

for fname, text in batch_scripts.items():
    out_path = os.path.join(output_dir, fname)
    if os.path.exists(out_path):
        print(f"Already exists: {fname}")
        continue
    print(f"Generating voiceover: {fname}...")
    data = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.8,
            "style": 0.2,
            "use_speaker_boost": True
        }
    }
    res = requests.post(url, json=data, headers=headers)
    if res.status_code == 200:
        with open(out_path, "wb") as f:
            f.write(res.content)
        print(f"Generated {fname} ({len(res.content)} bytes)")
    else:
        print(f"Error {fname}: {res.status_code} {res.text}")
