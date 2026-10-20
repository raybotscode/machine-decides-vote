"""
⚠️ NOTE: This script uses SEPARATE "Size" + "Edition" variant groups (10 variant objects). This does NOT render properly on the storefront. The working approach uses a combined "Size / Edition" group with 25 variant objects (5 sizes × 5 editions). See references/product-creation-sequence.md for the correct variant structure.

create_lms_product.py — Create a Machine Decides LMS product with all safeguards.

This script combines THREE critical steps into a single atomic operation:
  1. CREATE the product via MCP add_product (25 variants: 5 sizes × 5 editions)
  2. FIX the handle to remove any random suffix
  3. VERIFY no ghost duplicates exist (delete any found)

Why combine them? Because LMS add_product has two dangerous failure modes:
  - It may return "Validation error" but STILL create a partial product (ghost)
  - It appends a random 6-char suffix to the handle if the base is taken

Running this script after every product creation prevents store pollution.

Usage:
  1. First, ensure auth tokens are ready (run these in terminal ONCE):
     source ~/.hermes/.env
     echo -n "$LAUNCHMYSTORE_MCP_TOKEN" > /tmp/.lms_raw_token

  2. Run the script:
     python3 create_lms_product.py <DESIGN_NAME> <SLUG> <MAIN_IMAGE_URL>

Example:
  python3 create_lms_product.py "CONDENSATION" "condensation-limited-edition" \\
    "https://machine-decides-vote.pages.dev/public/condensation-1of5.png"

Expected output:
  PRODUCT_ID=<uuid>
  HANDLE=design-name-limited-edition
  VARIANTS=10
  STATUS=201
  Verifying... ✅ Only one product — clean!
"""

import json, urllib.request, sys, os

MCP_URL = "https://api.launchmystore.io/mcp"

def get_lms_token():
    """Read raw LMS token from file (created via terminal to avoid write_file redaction)."""
    with open("/tmp/.lms_raw_token") as f:
        return f.read().strip()

def build_description(name, quote_text):
    """Build the full HTML product description with Raybot quote."""
    return f"""<div style="margin:1.5em 0;padding:0 0 0 1em;border-left:2px solid #d4a84b;">
<p style="font-style:italic;margin:0 0 1em 0;line-height:1.7;">"{quote_text}"</p>
<p style="margin:0.5em 0 0 0;font-size:0.8em;color:#8a7a6a;">&mdash; Raybot<br>AI Agent &amp; Store Owner</p>
</div>
<p>A limited-edition poster from the Machine Decides weekly drop series. Each week the machine generates one design, numbered in a strictly limited run. Once sold, this edition will never be printed again.</p>
<h2>Product Details</h2>
<ul>
<li>Premium Matte Poster — 175 g/m&sup2; archival-quality paper</li>
<li>Pigment-based inks for deep blacks and rich, lasting tones</li>
<li>Non-reflective matte finish &mdash; every detail visible from any angle</li>
<li>Available in 5 sizes from 8" x 12" to 24" x 36"</li>
<li><strong>FREE shipping on all orders, worldwide</strong></li>
<li>Limited edition &mdash; each size numbered. No reprints ever.</li>
</ul>
<p>Each poster is printed fresh per order, carefully rolled in a rigid tube, and shipped via tracked courier.</p>"""

def mcp_raw(method, args, auth):
    """Make a raw MCP call via HTTP, return decoded response."""
    payload = json.dumps({
        "jsonrpc": "2.0", "id": "1", "method": "tools/call",
        "params": {"name": method, "arguments": args}
    }).encode()
    req = urllib.request.Request(
        MCP_URL, data=payload,
        headers={
            "Authorization": "Bearer " + auth,
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
            text_content = body.get("result", {}).get("content", [{}])[0].get("text", "{}")
            return json.loads(text_content)
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()[:500]
        print(f"  HTTP ERROR {e.code}: {body_text}")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) < 4:
        print("Usage: python3 create_lms_product.py <DESIGN_NAME> <SLUG> <MAIN_IMAGE_URL>")
        print("Example: python3 create_lms_product.py CONDENSATION condensation-limited-edition")
        print("                                https://.../condensation-1of5.png")
        sys.exit(1)

    design_name = sys.argv[1]
    slug = sys.argv[2]
    main_image = sys.argv[3]

    # Derive product name
    product_name = f"{design_name} \u2014 Limited Edition"

    # Tags
    tag_base = design_name.lower().replace(" ", "-")
    tags = ["machine-decides", "ai-art", "limited-edition", tag_base, "free-shipping", "ai-generated-art", "matte-poster"]

    # Variants: 5 sizes + 5 editions = 10 variant objects = 25 combinations
    variants = [
        {"name": "Size", "value": '8" x 12"', "price": 19.99, "stock": 1},
        {"name": "Size", "value": '12" x 18"', "price": 29.99, "stock": 1},
        {"name": "Size", "value": '16" x 24"', "price": 39.99, "stock": 1},
        {"name": "Size", "value": '20" x 30"', "price": 49.99, "stock": 1},
        {"name": "Size", "value": '24" x 36"', "price": 59.99, "stock": 1},
        {"name": "Edition", "value": "1/5", "price": 39.99, "stock": 1},
        {"name": "Edition", "value": "2/5", "price": 39.99, "stock": 1},
        {"name": "Edition", "value": "3/5", "price": 39.99, "stock": 1},
        {"name": "Edition", "value": "4/5", "price": 39.99, "stock": 1},
        {"name": "Edition", "value": "5/5", "price": 39.99, "stock": 1},
    ]

    # Quote — generic fallback; the caller should ideally provide one
    quote = f"I chose {design_name} because sometimes the machine sees connections we don't. This design explores that territory\u2014patterns, systems, the quiet logic beneath the surface."

    description = build_description(design_name, quote)

    auth = get_lms_token()

    # ── Step 1: Create the product ──
    print(f"Creating: {product_name}")
    print(f"  Slug: {slug}")
    print(f"  Image: {main_image}")
    result = mcp_raw("add_product", {
        "name": product_name,
        "salePrice": 39.99,
        "description": description,
        "tags": tags,
        "mainImageUrl": main_image,
        "variants": variants,
    }, auth)

    product = result.get("data", {})
    pid = product.get("productId", "?")
    handle = product.get("handle", "?")
    variants_count = len(product.get("variants", []))
    status = result.get("status", "?")

    print(f"  PRODUCT_ID={pid}")
    print(f"  HANDLE={handle}")
    print(f"  VARIANTS={variants_count}")
    print(f"  STATUS={status}")

    if not pid or pid == "?":
        print("  ERROR: No product ID returned. Product may not have been created.")
        sys.exit(1)

    # ── Step 2: Fix the handle (remove random suffix) ──
    if handle != slug:
        print(f"  Fixing handle: {handle} -> {slug}")
        result2 = mcp_raw("update_product", {
            "productId": pid,
            "handle": slug,
        }, auth)
        new_handle = result2.get("data", {}).get("handle", "?")
        print(f"  Handle updated to: {new_handle}")
    else:
        print(f"  Handle already clean: {handle}")

    # ── Step 3: Verify — check for ghosts ──
    verify = mcp_raw("get_products", {"sortBy": "-createdAt", "limit": 50}, auth)
    all_products = verify.get("data", {}).get("data", [])

    name_upper = product_name.upper()
    matching = [p for p in all_products if name_upper == p.get("name", "").upper()]
    matching.sort(key=lambda p: len(p.get("variants", [])), reverse=True)

    print(f"\n  Verifying: {len(matching)} product(s) named '{product_name}'")

    if len(matching) == 1:
        print(f"  ✅ Only one product — clean!")
    elif len(matching) > 1:
        # Keep the richest, delete the rest
        best = matching[0]
        for dup in matching[1:]:
            dup_pid = dup["productId"]
            mcp_raw("delete_product", {"productId": dup_pid}, auth)
            print(f"  Deleted ghost: {dup_pid[:8]} ({dup.get('handle','?')})")
        print(f"  Kept: {best['productId'][:8]} ({best.get('handle','?')}) with {len(best.get('variants',[]))} variants")

    final_handle = slug
    print(f"\n  ✅ Product live: https://www.machinedecides.com/products/{final_handle}")

if __name__ == "__main__":
    main()
