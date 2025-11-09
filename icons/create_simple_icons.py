#!/usr/bin/env python3
"""Generate simple PNG icon files without external dependencies"""

import struct
import zlib

def create_png(width, height, rgb_color):
    """Create a simple solid color PNG file"""

    def create_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)

    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_chunk = create_chunk(b'IHDR', ihdr_data)

    # Create image data (solid color)
    r, g, b = rgb_color
    row = bytes([0]) + bytes([r, g, b] * width)  # 0 = no filter
    raw_data = row * height
    compressed_data = zlib.compress(raw_data, 9)

    # IDAT chunk
    idat_chunk = create_chunk(b'IDAT', compressed_data)

    # IEND chunk
    iend_chunk = create_chunk(b'IEND', b'')

    # Combine all chunks
    return png_signature + ihdr_chunk + idat_chunk + iend_chunk

# Create icons with a blue color (Microsoft Edge blue)
blue_color = (0, 120, 212)  # #0078d4

for size in [16, 48, 128]:
    png_data = create_png(size, size, blue_color)
    with open(f'/home/user/bookmarksync/icons/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon{size}.png')

print('All icons created successfully!')
