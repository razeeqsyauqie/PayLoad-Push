"""Turn the hero cutouts in art-src/ into src/portraits.js for full art cards.
Cutouts: art-src/<hero id>.png, plus the newer art-src/*.webp files named in NEW_ART.
Skins: art-src/skins/<Hero>_Skin_<Name>.webp (square shots with a background), cut out into art-src/skins-cut by cut_skins.py."""
import pathlib, base64, io, json
from PIL import Image, ImageOps
root = pathlib.Path(__file__).parent
src = root / 'art-src'
NEW_ART = {'Doctrine': 'doctrine', 'OW2_Anran': 'anran', 'OW2_DMon': 'dmon_baby', 'OW2_DMonBeast': 'dmon', 'OW2_Domina': 'domina',
           'OW2_Emre': 'emre', 'OW2_Jetpack_Cat': 'jetpackcat', 'OW2_Mizuki': 'mizuki', 'OW2_Shion': 'shion', 'OW2_Sierra': 'sierra',
           'OW2_Vendetta': 'vendetta'}
SKIN_HERO = {'Ana': 'ana', 'Anran': 'anran', 'D.Va': 'dva', 'Doomfist': 'doomfist', 'Genji': 'genji', 'Juno': 'juno', 'Kiriko': 'kiriko',
             'Mauga': 'mauga', 'Mercy': 'mercy', 'Orisa': 'orisa', 'Roadhog': 'roadhog', 'S76': 'soldier', 'Sigma': 'sigma',
             'Tracer': 'tracer', 'Zarya': 'zarya', 'Ashe': 'ashe', 'Baptiste': 'baptiste', 'Bastion': 'bastion', 'Brigitte': 'brigitte',
             'Cassidy': 'cassidy', 'Domina': 'domina', 'Echo': 'echo', 'Emre': 'emre', 'Freja': 'freja', 'Hanzo': 'hanzo', 'Hazard': 'hazard',
             'Illari': 'illari', 'Jetpack_Cat': 'jetpackcat', 'Junker_Queen': 'junkerqueen', 'Junkrat': 'junkrat', 'Lucio': 'lucio',
             'Lifeweaver': 'lifeweaver', 'Mei': 'mei', 'Mizuki': 'mizuki', 'Moira': 'moira', 'Pharah': 'pharah', 'Ramattra': 'ramattra',
             'Reaper': 'reaper', 'Reinhardt': 'reinhardt', 'Shion': 'shion', 'Sierra': 'sierra', 'Sojourn': 'sojourn', 'Sombra': 'sombra',
             'Symmetra': 'symmetra', 'Torbjorn': 'torbjorn', 'Vendetta': 'vendetta', 'Venture': 'venture', 'Widowmaker': 'widowmaker',
             'Winston': 'winston', 'Wrecking_Ball': 'wreckingball', 'Wuyang': 'wuyang', 'Zenyatta': 'zenyatta'}
# File names are plain ASCII; these put the accents and punctuation back for display.
SKIN_NAME = {'Junkensteins Monster': 'Junkenstein’s Monster', 'Nyan Cafe': 'Nyan Café', 'Selecao': 'Seleção', 'Jotunn': 'Jötunn',
             'Hop Online': 'Hop Online!', 'Jack-O-Lantern': 'Jack-O’-Lantern', 'Cote dAzur': 'Côte d’Azur', 'Hello Kitty Skin': 'Hello Kitty'}
out, skins = {}, {}
def webp(im, q):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
def add(hid, im):
    im = im.convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box: im = im.crop(box)
    if im.height > 460: im = im.resize((round(im.width * 460 / im.height), 460), Image.LANCZOS)
    if im.width > 520: im = im.resize((520, round(im.height * 520 / im.width)), Image.LANCZOS)
    out[hid] = {'src': webp(im, 82), 'w': im.width, 'h': im.height}
for f in sorted(src.glob('*.png')):
    if f.stem != 'city': add(f.stem, Image.open(f))
for stem, hid in NEW_ART.items():
    add(hid, Image.open(src / (stem + '.webp')))
def shrink(im):  # skins are a bit smaller than the base art so 200+ of them keep the page light
    im = im.convert('RGBA'); box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box: im = im.crop(box)
    if im.height > 400: im = im.resize((round(im.width * 400 / im.height), 400), Image.LANCZOS)
    if im.width > 460: im = im.resize((460, round(im.height * 460 / im.width)), Image.LANCZOS)
    return im
for f in sorted((src / 'skins-cut').glob('*.png')):  # cut out of their backgrounds by cut_skins.py
    hero, name = f.stem.split('_Skin_')
    im = shrink(Image.open(f))
    skins.setdefault(SKIN_HERO[hero], []).append({'name': SKIN_NAME.get(name.replace('_', ' '), name.replace('_', ' ')), 'src': webp(im, 74), 'w': im.width, 'h': im.height})
city = ImageOps.grayscale(Image.open(src / 'city.png').convert('RGB')).resize((640, 360), Image.LANCZOS)
js = '/* Hero art for full art cards, made by make_portraits.py from art-src/. */\n'
js += 'const PORTRAITS = ' + json.dumps(out) + ';\n'
js += 'const SKINS = ' + json.dumps(skins) + ';\n'
js += 'const CITY_BG = ' + json.dumps(webp(city.convert('RGB'), 70)) + ';\n'
(root / 'src' / 'portraits.js').write_text(js)
print(len(out), 'portraits,', sum(map(len, skins.values())), 'skins,', len(js) // 1024, 'KB')
