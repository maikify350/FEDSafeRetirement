import os
from PIL import Image

def fix_icon(input_path, output_path, target_size=128, artwork_size=96):
    print(f"Fixing icon: {input_path}")
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # Resize artwork to fit the artwork_size
        # We want to maintain aspect ratio, so we'll scale it down to fit within artwork_size
        img.thumbnail((artwork_size, artwork_size), Image.Resampling.LANCZOS)
        
        # Create new transparent canvas
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        
        # Center the artwork on the canvas
        offset_x = (target_size - img.width) // 2
        offset_y = (target_size - img.height) // 2
        canvas.paste(img, (offset_x, offset_y), img)
        
        # Save the result
        canvas.save(output_path, "PNG")
        print(f"Saved to: {output_path} ({target_size}x{target_size} with artwork {img.width}x{img.height})")
    except Exception as e:
        print(f"Error fixing {input_path}: {e}")

icon_dir = r"c:\WIP\FEDSafeRetirement_App\extension\icons"
store_icon_path = os.path.join(icon_dir, "icon128.png")

# Fix the 128x128 icon with 96x96 artwork (16px padding)
fix_icon(store_icon_path, os.path.join(icon_dir, "icon128_fixed.png"), 128, 96)

# Also create a version for the store listing specifically if needed
# The user can rename this to whatever they want to upload
