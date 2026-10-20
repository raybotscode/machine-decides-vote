"""Flexible edition stamper for Machine Decides posters.
Usage: python3 stamp_flex.py <input-image> <output-dir> <TITLE>
Stamps 5 numbered edition images (1/5 through 5/5) with V4 approved plaque."""
import sys, os
from PIL import Image, ImageDraw, ImageFont

def stamp_editions(input_path, output_dir, title, total=5):
    os.makedirs(output_dir, exist_ok=True)
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    print(f"Image: {w}x{h}, ratio={w/h:.4f}")

    base_pt = max(12, int(w * 0.008))
    try:
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", base_pt + 2)
        font_reg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", base_pt)
        font_domain = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(base_pt * 0.9075))
    except:
        font_bold = font_reg = font_domain = ImageFont.load_default()

    margin_x = int(w * 0.04)
    margin_y = int(h * 0.04)
    padding = int(w * 0.012)

    for i in range(1, total + 1):
        canvas = img.copy().convert("RGBA")
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        line1 = f"{title} Edition {i}/{total}"
        domain = "machinedecides.com"

        tb = draw.textbbox((0, 0), line1, font=font_bold)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        db = draw.textbbox((0, 0), domain, font=font_domain)
        dw, dh = db[2] - db[0], db[3] - db[1]

        rect_w = max(tw, dw) + padding * 2
        line_h = th + int(padding * 0.4)
        rect_h = line_h + dh + padding * 2 + 4

        rx = w - margin_x - rect_w
        ry = h - margin_y - rect_h

        radius = int(base_pt * 0.6)
        draw.rounded_rectangle([rx, ry, rx + rect_w, ry + rect_h], radius=radius, fill=(0, 0, 0, 140))
        draw.text((rx + rect_w - padding - tw, ry + padding), line1, font=font_bold, fill=(255, 255, 255, 230))
        draw.text((rx + rect_w - padding - dw, ry + padding + line_h + 2), domain, font=font_domain, fill=(200, 200, 200, 200))

        result = Image.alpha_composite(canvas, overlay)
        slug = title.lower().replace(" ", "-")
        out_path = os.path.join(output_dir, f"{slug}-{i}of{total}.png")
        result.convert("RGB").save(out_path, "PNG")
        print(f"  [{i}/{total}] {os.path.basename(out_path)} ({os.path.getsize(out_path)//1024}KB)")

    print(f"\nDone! {total} editions in {output_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 stamp_flex.py <input-image> <output-dir> <TITLE>")
        sys.exit(1)
    stamp_editions(sys.argv[1], sys.argv[2], sys.argv[3])
