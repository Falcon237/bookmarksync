#!/usr/bin/env python3
"""Generate AI Tastatur 2.0 extension icons."""

import struct
import zlib

def create_png(width, height, pixels):
    def write_chunk(chunk_type, data):
        chunk = chunk_type + data
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = write_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    idat = write_chunk(b'IDAT', zlib.compress(raw))
    iend = write_chunk(b'IEND', b'')

    return header + ihdr + idat + iend

def lerp(a, b, t):
    return int(a + (b - a) * t)

def create_icon(size):
    pixels = [0] * (size * size * 4)

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            cx, cy = size / 2, size / 2
            r = size * 0.42

            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5

            corner_r = size * 0.2

            in_rounded_rect = True
            if x < corner_r and y < corner_r:
                if ((x - corner_r)**2 + (y - corner_r)**2) > corner_r**2:
                    in_rounded_rect = False
            elif x >= size - corner_r and y < corner_r:
                if ((x - (size - corner_r))**2 + (y - corner_r)**2) > corner_r**2:
                    in_rounded_rect = False
            elif x < corner_r and y >= size - corner_r:
                if ((x - corner_r)**2 + (y - (size - corner_r))**2) > corner_r**2:
                    in_rounded_rect = False
            elif x >= size - corner_r and y >= size - corner_r:
                if ((x - (size - corner_r))**2 + (y - (size - corner_r))**2) > corner_r**2:
                    in_rounded_rect = False

            if in_rounded_rect:
                t = y / size
                r_val = lerp(74, 124, t)
                g_val = lerp(144, 58, t)
                b_val = lerp(217, 237, t)
                pixels[idx] = r_val
                pixels[idx+1] = g_val
                pixels[idx+2] = b_val
                pixels[idx+3] = 255
            else:
                pixels[idx:idx+4] = [0, 0, 0, 0]

    s = size
    letter_color = (255, 255, 255, 255)

    # "AI" text
    a_left = int(s * 0.12)
    a_right = int(s * 0.48)
    i_left = int(s * 0.52)
    i_right = int(s * 0.88)
    top = int(s * 0.22)
    bottom = int(s * 0.78)
    mid_y = int(s * 0.52)
    thickness = max(2, int(s * 0.1))

    # A - left diagonal
    for t_val in range(100):
        frac = t_val / 99
        bx = lerp(a_left, (a_left + a_right) // 2, frac)
        by = lerp(bottom, top, frac)
        for dx in range(thickness):
            px, py = bx + dx, by
            if 0 <= px < s and 0 <= py < s:
                idx = (py * s + px) * 4
                pixels[idx:idx+4] = list(letter_color)

    # A - right diagonal
    for t_val in range(100):
        frac = t_val / 99
        bx = lerp((a_left + a_right) // 2, a_right, frac)
        by = lerp(top, bottom, frac)
        for dx in range(thickness):
            px, py = bx + dx, by
            if 0 <= px < s and 0 <= py < s:
                idx = (py * s + px) * 4
                pixels[idx:idx+4] = list(letter_color)

    # A - horizontal bar
    bar_left = int(a_left + (a_right - a_left) * 0.25)
    bar_right = int(a_left + (a_right - a_left) * 0.75)
    for bx in range(bar_left, bar_right):
        for dy in range(thickness):
            py = mid_y + dy
            if 0 <= bx < s and 0 <= py < s:
                idx = (py * s + bx) * 4
                pixels[idx:idx+4] = list(letter_color)

    # I - vertical bar
    i_cx = (i_left + i_right) // 2
    for by in range(top, bottom):
        for dx in range(thickness):
            px = i_cx - thickness // 2 + dx
            if 0 <= px < s and 0 <= by < s:
                idx = (by * s + px) * 4
                pixels[idx:idx+4] = list(letter_color)

    # I - top serif
    for bx in range(i_left + int(s*0.05), i_right - int(s*0.05)):
        for dy in range(thickness):
            py = top + dy
            if 0 <= bx < s and 0 <= py < s:
                idx = (py * s + bx) * 4
                pixels[idx:idx+4] = list(letter_color)

    # I - bottom serif
    for bx in range(i_left + int(s*0.05), i_right - int(s*0.05)):
        for dy in range(thickness):
            py = bottom - thickness + dy
            if 0 <= bx < s and 0 <= py < s:
                idx = (py * s + bx) * 4
                pixels[idx:idx+4] = list(letter_color)

    return create_png(s, s, pixels)

for icon_size in [16, 48, 128]:
    data = create_icon(icon_size)
    with open(f'icon{icon_size}.png', 'wb') as f:
        f.write(data)
    print(f'Created icon{icon_size}.png')
