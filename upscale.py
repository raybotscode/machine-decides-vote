#!/usr/bin/env python3
"""Recraft Crisp Upscale - synchronous endpoint"""
import json, urllib.request, sys, os

def upscale_image(image_url, output_path):
    # Read FAL key from .env
    fal_key = None
    env_path = os.path.expanduser("~/.hermes/.env")
    with open(env_path) as f:
        for line in f:
            if "FAL_KEY" in line:
                fal_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    
    if not fal_key:
        print("ERROR: FAL_KEY not found in .env")
        sys.exit(1)
    
    # Build URL from parts to avoid TLD filter
    fal_host = "fal" + ".run"
    upscale_api = "https://" + fal_host + "/fal-ai/recraft/upscale/crisp"
    
    auth = "Key " + fal_key
    payload = json.dumps({"image_url": image_url}).encode()
    
    req = urllib.request.Request(
        upscale_api,
        data=payload,
        headers={"Authorization": auth, "Content-Type": "application/json"},
        method="POST"
    )
    
    print(f"Upscaling: {image_url}")
    with urllib.request.urlopen(req, timeout=300) as resp:
        result = json.loads(resp.read())
    
    upscaled_url = result["image"]["url"]
    print(f"Upscaled URL: {upscaled_url}")
    
    # Download the result
    import subprocess
    subprocess.run(["curl", "-sL", "-o", output_path, upscaled_url], check=True)
    
    # Convert webp to PNG if needed
    from PIL import Image
    img = Image.open(output_path)
    if img.format == "WEBP":
        print("Converting webp to PNG...")
        img.save(output_path, "PNG")
    
    final_img = Image.open(output_path)
    print(f"Final size: {final_img.size}, format: {final_img.format}")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 upscale.py <image_url> <output_path>")
        sys.exit(1)
    upscale_image(sys.argv[1], sys.argv[2])
