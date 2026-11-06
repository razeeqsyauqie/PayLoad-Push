# Builds src/voices.js from art-src/voice/<Hero>_-_<Line>.ogg (Syauqie's voiceline files).
# Each file becomes a small mono MP3 (plays on every browser, iPhone included) embedded as a data URI.
import pathlib, subprocess, base64, json, re, unicodedata, tempfile
root = pathlib.Path(__file__).parent
src = root / 'art-src' / 'voice'
ids = json.loads(subprocess.run(['node', '-e', "const E=require('./src/engine.js');console.log(JSON.stringify(Object.values(E.HEROES).map(h=>[h.id,h.name])))"], cwd=root, capture_output=True, text=True).stdout)
key = lambda s: re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())
by_name = {key(n): [i] for i, n in ids}
by_name.update({key(i): [i] for i, n in ids})
by_name.update({'dva': ['dva_baby', 'dva'], 'dmon': ['dmon_baby', 'dmon'], 'soldier76': ['soldier']})
voices, missing = {}, []
tmp = pathlib.Path(tempfile.mkdtemp())
for f in sorted(src.glob('*.ogg')):
    hero, _, line = f.stem.partition('_-_')
    targets = by_name.get(key(hero))
    if not targets: missing.append(f.name); continue
    out = tmp / 'v.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(f), '-ac', '1', '-b:a', '56k', str(out)], check=True)
    uri = 'data:audio/mpeg;base64,' + base64.b64encode(out.read_bytes()).decode()
    text = line.replace('_', ' ')
    for t in targets: voices.setdefault(t, []).append({'text': text, 'src': uri})
# Real hero lines for the main menu buttons: art-src/voice-menu/<voice>_<button>_<Line>.ogg -> VOICES['menu_<voice>_<button>']
for f in sorted((root / 'art-src' / 'voice-menu').glob('*_*_*.ogg')):
    who, btn, line = f.stem.split('_', 2)
    out = tmp / 'v.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(f), '-ac', '1', '-b:a', '56k', str(out)], check=True)
    voices.setdefault('menu_' + who + '_' + btn, []).append({'text': line.replace('_', ' '), 'src': 'data:audio/mpeg;base64,' + base64.b64encode(out.read_bytes()).decode()})
(root / 'src' / 'voices.js').write_text('const VOICES = ' + json.dumps(voices, ensure_ascii=False) + ';\n')
print(len(voices), 'heroes with voicelines; no voice:', [i for i, n in ids if i not in voices], 'unmatched files:', missing)
