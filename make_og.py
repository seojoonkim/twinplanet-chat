#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, math

W, H = 1200, 630
BASE = os.path.expanduser("~/triples-chat/public")

# ── 1. 그라디언트 배경 ─────────────────────────────────────
bg = Image.new("RGBA", (W, H))
draw = ImageDraw.Draw(bg)
for y in range(H):
    t = y / H
    r = int(59 + (219-59)*t)
    g = int(7  + (39-7)*t)
    b = int(100+ (119-100)*t)
    draw.line([(0,y),(W,y)], fill=(r,g,b,255))

# ── 2. 멤버 사진 타일 배경 (낮은 opacity) ─────────────────
idol_ids = [
    'chaeyeon','chaewon','yooyeon','seoyeon','hyerin','sumin',
    'jiwoo','kaede','naekyung','kotone','dahyun','hayeon',
    'sohyun','yubin','rin','seoa','mayu','nien','jiyeon',
    'yeonji','shinwi','seollin','sion','jubin',
]
TILE = 100
cols = math.ceil(W / TILE) + 1
rows_bg = math.ceil(H / TILE) + 1
tile_bg = Image.new("RGBA", (W, H), (0,0,0,0))
idx = 0
for row in range(rows_bg):
    for col in range(cols):
        iid = idol_ids[idx % len(idol_ids)]
        idx += 1
        path = f"{BASE}/idols/{iid}/profile.jpg"
        if not os.path.exists(path): continue
        try:
            tile = Image.open(path).convert("RGBA").resize((TILE, TILE))
            tile_bg.paste(tile, (col*TILE, row*TILE))
        except: pass

import numpy as np
tile_bg.putalpha(Image.fromarray(np.full((H,W), 35, dtype=np.uint8)))
bg = Image.alpha_composite(bg.convert("RGBA"), tile_bg)

# ── 3. 오버레이 ─────────────────────────────────────────
overlay = Image.new("RGBA", (W, H), (0,0,0,0))
od = ImageDraw.Draw(overlay)
for y in range(H//2):
    a = int(100 * (1 - y/(H//2)))
    od.line([(0,y),(W,y)], fill=(30,5,80,a))
for y in range(H//2):
    a = int(140 * (1 - y/(H//2)))
    od.line([(0, H-1-y),(W, H-1-y)], fill=(80,5,50,a))
bg = Image.alpha_composite(bg.convert("RGBA"), overlay)

# ── 4. 로고 (상단) ────────────────────────────────────────
logo_path = f"{BASE}/logo.png"
if os.path.exists(logo_path):
    logo = Image.open(logo_path).convert("RGBA")
    lr, lg, lb, la = logo.split()
    white = Image.new("RGBA", logo.size, (255,255,255,255))
    logo_white = Image.composite(white, Image.new("RGBA", logo.size, (0,0,0,0)), la)
    logo_white.putalpha(la)
    logo_h = 110   # ← 더 크게
    ratio = logo_h / logo.height
    logo_w = int(logo.width * ratio)
    logo_white = logo_white.resize((logo_w, logo_h), Image.LANCZOS)
    lx = (W - logo_w) // 2
    ly = 42
    bg.paste(logo_white, (lx, ly), logo_white)

# ── 5. 24명 아바타 2행 ────────────────────────────────────
AV = 62          # 아바타 크기
OVERLAP = 12     # 겹치기
BORDER = 4       # 흰 테두리

row1_ids = idol_ids[:12]
row2_ids = idol_ids[12:]

def paste_avatar_row(bg_img, ids, ay):
    n = len(ids)
    row_w = n * AV - (n-1) * OVERLAP
    ax_start = (W - row_w) // 2
    for i, aid in enumerate(ids):
        path = f"{BASE}/idols/{aid}/profile.jpg"
        if not os.path.exists(path): continue
        try:
            av = Image.open(path).convert("RGBA").resize((AV, AV), Image.LANCZOS)
            mask = Image.new("L", (AV,AV), 0)
            ImageDraw.Draw(mask).ellipse([(0,0),(AV-1,AV-1)], fill=255)
            av.putalpha(mask)
            total = AV + BORDER*2
            border_img = Image.new("RGBA", (total, total), (0,0,0,0))
            ImageDraw.Draw(border_img).ellipse([(0,0),(total-1,total-1)], fill=(255,255,255,200))
            border_img.paste(av, (BORDER, BORDER), av)
            bx = ax_start + i*(AV-OVERLAP) - BORDER
            bg_img.paste(border_img, (bx, ay-BORDER), border_img)
        except: pass

# 아바타 영역: 중앙보다 약간 위
av_center_y = H // 2 - 10
paste_avatar_row(bg, row1_ids, av_center_y - AV - 8)
paste_avatar_row(bg, row2_ids, av_center_y + 8)

# ── 6. 텍스트 (하단) ──────────────────────────────────────
font_paths = [
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]
font_title = None
font_sub = None
for fp in font_paths:
    if os.path.exists(fp):
        try:
            font_title = ImageFont.truetype(fp, 88)   # ← 더 크게
            font_sub   = ImageFont.truetype(fp, 38)   # ← 더 크게
            break
        except: pass
if not font_title:
    font_title = ImageFont.load_default()
    font_sub   = ImageFont.load_default()

final = bg.convert("RGB")
fd = ImageDraw.Draw(final)

title_text = "tripleS chat"
sub_text   = "tripleS 24명과 AI 채팅"   # ← "AI 채팅"으로 변경

tb = fd.textbbox((0,0), title_text, font=font_title)
tx = (W - (tb[2]-tb[0])) // 2
ty = H - 190

sb = fd.textbbox((0,0), sub_text, font=font_sub)
sx = (W - (sb[2]-sb[0])) // 2
sy = ty + (tb[3]-tb[1]) + 16

# 그림자 + 텍스트
fd.text((tx+3, ty+4), title_text, font=font_title, fill=(0,0,0,160))
fd.text((tx,   ty),   title_text, font=font_title, fill=(255,255,255,255))
fd.text((sx+2, sy+3), sub_text,   font=font_sub,   fill=(0,0,0,120))
fd.text((sx,   sy),   sub_text,   font=font_sub,   fill=(255,220,255,230))

out = os.path.expanduser("~/triples-chat/public/og-image.png")
final.save(out, "PNG", optimize=True)
print(f"saved → {out} ({os.path.getsize(out)//1024}KB)")
