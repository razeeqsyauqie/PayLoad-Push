import pathlib, shutil, json, base64
root = pathlib.Path(__file__).parent
d = root / 'src'
head = """<title>Payload Push</title>
<meta name="description" content="An Overwatch-inspired hero card battler prototype.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Saira+Condensed:wght@600;700;800&display=swap">
"""
body = f"""<style>
{(d/'style.css').read_text()}
{(d/'control.css').read_text()}
{(d/'herofx.css').read_text()}
</style>
{(d/'body.html').read_text()}
<script>
{(d/'engine.js').read_text()}
{(d/'art.js').read_text()}
{(d/'portraits.js').read_text()}
{(d/'voices.js').read_text() if (d/'voices.js').exists() else ''}
{(d/'game.js').read_text()}
{(d/'howto-pics.js').read_text() if (d/'howto-pics.js').exists() else ''}
{(d/'herofx.js').read_text()}
{(d/'control.js').read_text()}
{(d/'dm.js').read_text() if (d/'dm.js').exists() else ''}
{(d/'net.js').read_text()}
</script>
"""
html = head + body
(root / 'payload-push.html').write_text(html)
meta = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
# standalone version for opening directly in a browser
(root / 'payload-push-standalone.html').write_text(meta + html + '</html>')

# Web build: an installable app (PWA) ready to upload to any static host.
web = root / 'web'
web.mkdir(exist_ok=True)
pwa = """<meta name="theme-color" content="#0b1424">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Payload Push">
"""
reg = "<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>"
(web / 'index.html').write_text(meta + pwa + head + '</head><body>' + body + reg + '</body></html>')
(web / 'manifest.webmanifest').write_text(json.dumps({
  'name': 'Payload Push', 'short_name': 'Payload Push', 'description': 'An Overwatch-inspired hero card battler.',
  'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
  'background_color': '#0b1424', 'theme_color': '#0b1424',
  'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}, indent=2))
import hashlib
ver = hashlib.sha1(body.encode()).hexdigest()[:10]
(web / 'sw.js').write_text((d / 'sw.js').read_text().replace('__VERSION__', ver))
if (d / 'music').exists(): shutil.copytree(d / 'music', web / 'music', dirs_exist_ok=True)
if (d / 'music').exists(): shutil.copytree(d / 'music', root / 'music', dirs_exist_ok=True)  # for the standalone file  # menu music, loaded next to the page
for f in ['icon-192.png', 'icon-512.png', 'peerjs.min.js']:
    if (d / f).exists(): shutil.copy(d / f, web / f)
shutil.make_archive(str(root / 'payload-push-web'), 'zip', web)
print(len(html), 'web build', ver)
