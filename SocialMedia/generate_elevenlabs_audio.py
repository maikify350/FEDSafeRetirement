import os
import requests
import json

# Read API Key from SocialMedia/.env
env_path = r"c:\WIP\FEDSafeRetirement\SocialMedia\.env"
eleven_key = None
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("ELEVENLABS_API_KEY="):
            eleven_key = line.strip().split("=", 1)[1]

if not eleven_key or "your_" in eleven_key:
    print("ElevenLabs API Key not found or placeholder.")
    exit(1)

# Voice ID (e.g. Rachel / Adam / Charlie or professional narrator voice)
# Using a trustworthy, professional voice: '21m00Tcm4TlvDq8ikWAM' (Rachel) or 'ErXwobaYiN019PkySvjV' (Antoni) or 'pNInz6obpgDQGcFmaJgB' (Adam)
VOICE_ID = "pNInz6obpgDQGcFmaJgB" # Adam (Deep, trustworthy, authoritative male)

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": eleven_key
}

scripts = {
    "usps-narration-v1.mp3": (
        "Attention Postal and USPS employees nearing retirement. "
        "Planning your postal retirement requires knowing the critical details. "
        "The new PSHB rules change your healthcare choices, and coordination with Medicare Part B can permanently affect your monthly costs. "
        "If you are retiring under FERS at MRA with thirty years of service, make sure you verify your special supplement bridge payment before you submit your online application. "
        "FedSafe Retirement is a SAM dot gov registered contractor specializing exclusively in federal and postal benefits. "
        "The future favors the prepared. Call the number below to schedule your complimentary postal benefit analysis."
    ),
    "usps-narration-v2-carrier.mp3": (
        "Letter carriers, clerks, and mail handlers: You only get one shot at your postal retirement. "
        "One wrong election on your survivor benefits, FEGLI, or healthcare transition can cost you thousands in retirement. "
        "At FedSafe Retirement, we are not generalists. We help postal workers across the nation retire with clarity, confidence, and peace of mind. "
        "Call us today or visit FedSafe Retirement dot com to claim your free consultation."
    )
}

output_dir = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public"

for filename, text in scripts.items():
    print(f"Generating narration for: {filename}...")
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
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        out_path = os.path.join(output_dir, filename)
        with open(out_path, "wb") as f:
            f.write(response.content)
        print(f"Successfully generated {out_path} ({len(response.content)} bytes)")
    else:
        print(f"Failed to generate {filename}: {response.status_code} - {response.text}")
