#!/usr/bin/env python3
"""Convert chess.md to chess.html"""

import re
from pathlib import Path

def md_to_html(md: str) -> str:
    # Split into blocks first
    blocks = re.split(r'\n\n+', md.strip())

    result = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue

        # Check if block starts with **Title** on its own line
        match = re.match(r'^\*\*([^*]+)\*\*\n(.+)$', block, re.DOTALL)
        if match:
            title, body = match.groups()
            # Convert links in body
            body = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', body)
            body = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', body)
            result.append(f'<h2>{title}</h2>\n<p>{body.strip()}</p>')
        else:
            # Regular paragraph
            block = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', block)
            block = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', block)
            result.append(f'<p>{block}</p>')

    return '\n'.join(result)

def main():
    src = Path(__file__).parent / "chess.md"
    dst = Path(__file__).parent / "chess.html"

    md = src.read_text()
    body = md_to_html(md)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chess Engine Pitch</title>
    <style>
        body {{
            max-width: 650px;
            margin: 40px auto;
            padding: 0 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #222;
        }}
        p {{ margin: 1em 0; }}
        a {{ color: #0066cc; }}
        strong {{ font-weight: 600; }}
        h2 {{ margin-top: 1.5em; margin-bottom: 0.5em; font-size: 1.25em; }}
    </style>
</head>
<body>
{body}
</body>
</html>
"""

    dst.write_text(html)
    print(f"Wrote {dst}")

if __name__ == "__main__":
    main()
