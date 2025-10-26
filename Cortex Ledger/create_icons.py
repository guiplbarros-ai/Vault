#!/usr/bin/env python3
"""
Script to extract the snake and coin from Cortex Ledger image and create icon files
"""
from PIL import Image
import os

# Paths
base_dir = "/Users/guilhermebarros/Documents/Coding/Cortex Ledger"
source_image = os.path.join(base_dir, "assets", "ChatGPT Image 25 de out. de 2025, 21_55_18.png")
icons_dir = os.path.join(base_dir, "assets", "icons")

# Load the source image
img = Image.open(source_image)
print(f"Loaded image: {img.size}")

# The snake and coin are in the left portion of the image
# Based on the image, approximate coordinates for snake + coin
# We need to crop this portion
width, height = img.size

# Crop coordinates (left, top, right, bottom)
# The snake and coin appear to be roughly in the left half, centered vertically
# Let's extract a square region around the snake and coin
crop_left = 80
crop_top = 350
crop_right = 520
crop_bottom = 790

# Extract the snake and coin
snake_coin = img.crop((crop_left, crop_top, crop_right, crop_bottom))
print(f"Cropped snake and coin: {snake_coin.size}")

# Save the extracted portion
extracted_path = os.path.join(icons_dir, "snake-coin-extracted.png")
snake_coin.save(extracted_path)
print(f"Saved extracted image: {extracted_path}")

# Create a square version with transparent background
max_dim = max(snake_coin.size)
square = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))

# Center the snake and coin in the square
offset_x = (max_dim - snake_coin.width) // 2
offset_y = (max_dim - snake_coin.height) // 2
square.paste(snake_coin, (offset_x, offset_y), snake_coin if snake_coin.mode == 'RGBA' else None)

# Save the square version
square_path = os.path.join(icons_dir, "snake-coin-square.png")
square.save(square_path)
print(f"Saved square version: {square_path}")

# Generate all icon sizes
sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
png_icons = []

for size in sizes:
    icon = square.resize((size, size), Image.Resampling.LANCZOS)
    icon_path = os.path.join(icons_dir, f"icon-{size}x{size}.png")
    icon.save(icon_path)
    png_icons.append(icon_path)
    print(f"Created {size}x{size} icon")

# Create favicon.ico (multiple sizes: 16, 32, 48)
favicon_sizes = [16, 32, 48]
favicon_images = [square.resize((s, s), Image.Resampling.LANCZOS) for s in favicon_sizes]
favicon_path = os.path.join(icons_dir, "favicon.ico")
favicon_images[0].save(favicon_path, format='ICO', sizes=[(s, s) for s in favicon_sizes], append_images=favicon_images[1:])
print(f"Created favicon.ico")

# Create Windows .ico file (multiple sizes: 16, 32, 48, 64, 128, 256)
windows_sizes = [16, 32, 48, 64, 128, 256]
windows_images = [square.resize((s, s), Image.Resampling.LANCZOS) for s in windows_sizes]
windows_ico_path = os.path.join(icons_dir, "app-icon.ico")
windows_images[0].save(windows_ico_path, format='ICO', sizes=[(s, s) for s in windows_sizes], append_images=windows_images[1:])
print(f"Created app-icon.ico for Windows")

# For macOS .icns, we need to use iconutil or a library
# Let's create the iconset folder structure that can be converted to .icns
iconset_dir = os.path.join(icons_dir, "AppIcon.iconset")
os.makedirs(iconset_dir, exist_ok=True)

# macOS iconset requires specific sizes and naming
iconset_sizes = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]

for size, filename in iconset_sizes:
    icon = square.resize((size, size), Image.Resampling.LANCZOS)
    icon_path = os.path.join(iconset_dir, filename)
    icon.save(icon_path)

print(f"Created iconset at {iconset_dir}")
print("\nAll icons created successfully!")
print(f"\nIcon files location: {icons_dir}")
print(f"- PNG icons: icon-{'{size}'}x{'{size}'}.png (16-1024)")
print(f"- Favicon: favicon.ico")
print(f"- Windows icon: app-icon.ico")
print(f"- macOS iconset: AppIcon.iconset/ (convert to .icns using: iconutil -c icns AppIcon.iconset)")
