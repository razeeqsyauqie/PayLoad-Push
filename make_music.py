# Builds src/music/<song>-inst.mp3 and <song>-full.mp3 from Syauqie's SOUNDTRACK folder (copied to art-src/music).
# Menu music only: the game loads these files next to the page instead of inlining them, to keep the page small.
import pathlib, subprocess
root = pathlib.Path(__file__).parent
src, out = root / 'art-src' / 'music', root / 'src' / 'music'
out.mkdir(exist_ok=True)
SONGS = {  # slug: (instrumental file, full song file)
  'ash': ('[Clean Instrumental] LE SSERAFIM - Ash.mp3', 'Ash.mp3'),
  'iffy': ('LE SSERAFIM - iffy iffy (Instrumental).mp3', 'iffy iffy.mp3'),
  'cynical': ('LE SSERAFIM - So Cynical (Badum) (Instrumental with backing vocals) [DolbyAtmos].mp3', 'So Cynical (Badum).mp3'),
  'night': ('Made My Night (Instrumental).mp3', "LE SSERAFIM 르세라핌 'Made My Night' Official Audio.mp3"),
  # added later; these came without instrumentals, so ours are made by vocal removal (UVR MDX-Net Inst HQ3 via audio-separator)
  # and saved as art-src/music/inst/<song> (Instrumental).mp3
  **{slug: (f'inst/{name} (Instrumental).mp3', f'{name}.mp3') for slug, name in {
    'catch': 'Catch Catch', 'cherish': 'Cherish (My Love)', 'lxxk': 'Lxxk 2 U', 'magnetic': 'Magnetic', 'midnight': 'Midnight Fiction',
    'notcute': 'NOT CUTE ANYMORE', 'notme': 'NOT ME', 'smiley': 'SMILEY (Feat. BIBI)', 'sugar': 'Sugar', 'ticktack': 'Tick-Tack'}.items()},
}
import sys
only = sys.argv[1:]  # optional: re-encode just these slugs
for slug, files in SONGS.items():
    if only and slug not in only: continue
    for kind, f in zip(('inst', 'full'), files):
        # vocal removal leaves the instrumental about 5 dB quieter than the store-bought ones, so level it to match (~-9.5 LUFS)
        level = ['-af', 'loudnorm=I=-9.5:TP=-1:LRA=11'] if kind == 'inst' and f.startswith('inst/') else []
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src / f), '-map', '0:a', *level, '-ac', '2', '-ar', '44100', '-b:a', '128k', str(out / f'{slug}-{kind}.mp3')], check=True)
print(sorted((p.name, p.stat().st_size // 1024) for p in out.glob('*.mp3')))
