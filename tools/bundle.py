#!/usr/bin/env python3
"""Inline css/js into one self-contained HTML file (dist/symbiont.html).
Useful for sharing a single file or hosting somewhere without the folder structure.
The PWA bits (manifest, service worker) are dropped in the bundle."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
head = re.search(r'<!--HEAD-->(.*?)<!--/HEAD-->', html, re.S).group(1).strip()
body = re.search(r'<!--BODY-->(.*?)<!--/BODY-->', html, re.S).group(1).strip()
css = (root / 'css/style.css').read_text()
eng = (root / 'js/engine.js').read_text()
app = (root / 'js/app.js').read_text()
out = f"""{head}
<style>
{css}
</style>
{body}
<script>
{eng}
</script>
<script>
{app}
</script>
"""
dist = root / 'dist'; dist.mkdir(exist_ok=True)
(dist / 'symbiont.html').write_text(out)
print('wrote', dist / 'symbiont.html', len(out), 'bytes')
