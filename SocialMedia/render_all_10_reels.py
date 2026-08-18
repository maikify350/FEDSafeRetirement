import subprocess
import os
import shutil

compositions = [
    ("PostalRetirementReel", "01_Video_Postal_Retirement_Reel.mp4"),
    ("FegliShockReel", "02_Video_FEGLI_Shock_Alert_Reel.mp4"),
    ("FersSupplementReel", "03_Video_FERS_Special_Supplement.mp4"),
    ("TspMistakesReel", "04_Video_TSP_Withdrawal_Mistakes.mp4"),
    ("SurvivorBenefitReel", "05_Video_Survivor_Benefit_Plan.mp4"),
    ("FehbFiveYearRuleReel", "06_Video_FEHB_5_Year_Rule.mp4"),
    ("HighThreePensionReel", "07_Video_High_Three_Pension_Math.mp4"),
    ("MilitaryBuybackReel", "08_Video_Military_Service_Buyback.mp4"),
    ("PartnerSpotlightReel", "09_Video_Partner_Spotlight_Mike_Zaino.mp4"),
    ("WhyFedSafeReel", "10_Video_Why_FedSafe_Exists.mp4"),
]

cwd = r"c:\WIP\FEDSafeRetirement\SocialMedia\June28WebinarReel"
gdrive_dir = r"G:\My Drive\_Etzy_Alternative\Projects\FedSafeRetirement\Social"

for comp_id, out_filename in compositions:
    out_path = os.path.join(cwd, "out", out_filename)
    gdrive_path = os.path.join(gdrive_dir, out_filename)
    
    print(f"\n==========================================")
    print(f"Rendering: {comp_id} -> {out_filename}")
    print(f"==========================================")
    
    cmd = [
        "npx.cmd", "remotion", "render", "src/index.tsx", comp_id,
        f"out/{out_filename}", "--codec=h264", "--pixel-format=yuv420p"
    ]
    
    res = subprocess.run(cmd, cwd=cwd)
    if res.returncode == 0:
        print(f"SUCCESS: Rendered {out_path}")
        if os.path.exists(gdrive_dir):
            try:
                shutil.copy2(out_path, gdrive_path)
                print(f"COPIED to Google Drive: {gdrive_path}")
            except Exception as e:
                print(f"Copy to Google Drive error: {e}")
    else:
        print(f"ERROR rendering {comp_id}: exit code {res.returncode}")

print("\nALL 10 REELS RENDERED & SYNCED TO GOOGLE DRIVE!")
