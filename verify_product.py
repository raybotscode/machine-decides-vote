"""
verify_product.py — Post-creation verification for Machine Decides LMS products.

Usage:
  python3 verify_product.py <PRODUCT_NAME>

Example:
  python3 verify_product.py "CONDENSATION"

What it does:
  1. Queries LMS for all products matching the given name
  2. Reports count, variant count, image status, and handle for each
  3. If duplicates found, keeps the one with the most variants and deletes the rest
  4. Fixes the handle to clean-format if it has a random suffix
  5. Prints final state

Requirements:
  - /tmp/.lms_auth_header must exist (created by sourcing .env in terminal)
"""

import json, subprocess, sys

MCP_URL = "https://api.launchmystore.io/mcp"

def get_auth():
    with open("/tmp/.lms_auth_header") as f:
        return f.read().strip()

def mcp_call(method, args):
    auth = get_auth()
    payload = json.dumps({
        "jsonrpc": "2.0", "id": "1", "method": "tools/call",
        "params": {"name": method, "arguments": args}
    })
    cmd = ["curl", "-s", "-X", "POST", MCP_URL, "-H", auth,
           "-H", "Content-Type: application/json", "-d", payload]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    result = json.loads(r.stdout)
    text_content = result.get("result", {}).get("content", [{}])[0].get("text", "{}")
    return json.loads(text_content)

def expected_handle(name):
    slug = name.split("\u2014")[0].strip().lower()
    return slug + "-limited-edition"

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 verify_product.py <PRODUCT_NAME>")
        sys.exit(1)

    search_name = " ".join(sys.argv[1:]).upper()
    expected = expected_handle(search_name)
    print(f"Verifying: {search_name}")
    print(f"  Expected handle: {expected}")

    # Get all products
    response = mcp_call("get_products", {"sortBy": "-createdAt", "limit": 50})
    products = response.get("data", {}).get("data", [])
    print(f"  Total products in LMS: {len(products)}")

    # Filter by name
    matching = [p for p in products if search_name in p.get("name", "").upper()]
    print(f"  Matching '{search_name}': {len(matching)}")

    if not matching:
        print("  No products found!")
        return

    # Report
    matching.sort(key=lambda p: len(p.get("variants", [])), reverse=True)
    for p in matching:
        pid = p.get("productId", "?")
        variants = len(p.get("variants", []))
        img = "SET" if p.get("mainImageUrl") else "EMPTY"
        handle = p.get("handle", "?")
        tag = "KEEP" if p == matching[0] else "DELETE"
        print(f"  [{tag}] {pid[:8]} | {handle} | {variants} vars | img={img}")

    # Delete ghosts
    best = matching[0]
    best_pid = best.get("productId")
    best_handle = best.get("handle", "")
    deleted = 0
    for p in matching[1:]:
        pid = p.get("productId")
        result = mcp_call("delete_product", {"productId": pid})
        state = result.get("state", "?")
        print(f"  Deleted {pid[:8]}... (state={state})")
        deleted += 1

    # Fix handle
    if best_handle != expected:
        print(f"  Fixing handle: {best_handle} -> {expected}")
        result = mcp_call("update_product", {
            "productId": best_pid, "handle": expected
        })
        new_handle = result.get("data", {}).get("handle", "?")
        print(f"  Handle updated to: {new_handle}")
    else:
        print(f"  Handle clean: {best_handle}")

    print(f"\n  FINAL: {len(best.get('variants', []))} vars, {deleted} ghosts deleted")
    print(f"  URL: https://www.machinedecides.com/products/{expected}")

if __name__ == "__main__":
    main()
