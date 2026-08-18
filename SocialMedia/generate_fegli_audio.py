import os
import requests
import json

env_path = r"c:\WIP\FEDSafeRetirement\SocialMedia\.env"
eleven_key = None
with open(env_path, "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("ELEVENLABS_API_KEY="):
            eleven_key = line.strip().split("=", 1)[1]

VOICE_ID = "pNInz6obpgDQGcFmaJgB" # Adam (Authoritative & Trustworthy)

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"

headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": eleven_key
}

fegli_script = (
    "Did you know your FEGLI Option B premiums can jump by over five hundred percent once you turn sixty-five? "
    "Thousands of federal and postal retirees are shocked when hundreds of dollars are suddenly deducted from their monthly pension check. "
    "At FedSafe Retirement, we review your insurance, pension, and survivor benefit elections before you retire so you can avoid costly surprises. "
    "The future favors the prepared. Call the number below or visit FedSafe Retirement dot com to schedule your free consultation."
)

data = {
    "text": fegli_script,
    "model_id": "eleven_turbo_v2_5",
    "voice_settings": {
        "stability": 0.55,
        "similarity_boost": 0.8,
        "style": 0.2,
        "use_speaker_boost": True
    }
}

output_path = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel\public\fegli-shock-narration.mp3"
response = requests.post(url, json=data, headers=headers)
if response.status_code == 200:
    with open(output_path, "wb") as f:
        f.write(response.content)
    print(f"Successfully generated {output_path} ({len(response.content)} bytes)")
else:
    print(f"Error: {response.status_code} {response.text}")
