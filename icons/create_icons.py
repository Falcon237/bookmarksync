#!/usr/bin/env python3
"""Generate icon files for the extension"""

from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create a new image with a blue background
    img = Image.new('RGB', (size, size), color='#0078d4')
    draw = ImageDraw.Draw(img)

    # Draw a bookmark shape
    margin = size // 8

    # Bookmark rectangle
    bookmark_color = '#ffffff'
    left = margin
    top = margin
    right = size - margin
    bottom = size - margin

    # Draw main rectangle
    draw.rectangle([left, top, right, bottom], fill=bookmark_color)

    # Draw the bookmark notch at the bottom
    notch_height = size // 6
    center_x = size // 2
    notch_width = size // 4

    points = [
        (center_x - notch_width // 2, bottom - notch_height),
        (center_x, bottom),
        (center_x + notch_width // 2, bottom - notch_height),
        (right, bottom - notch_height),
        (right, top),
        (left, top),
        (left, bottom - notch_height)
    ]

    draw.polygon(points, fill=bookmark_color)

    # Add sync arrows
    arrow_color = '#0078d4'
    arrow_margin = size // 4
    arrow_size = size // 8

    # Draw circular arrows to represent sync
    for i in range(0, 360, 90):
        x = center_x + int((size // 3) * 0.5)
        y = center_x + int((size // 3) * 0.5)

    return img

# Create icons in different sizes
for size in [16, 48, 128]:
    icon = create_icon(size)
    icon.save(f'/home/user/bookmarksync/icons/icon{size}.png')
    print(f'Created icon{size}.png')

print('All icons created successfully!')
