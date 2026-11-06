"""Cut the skin shots in art-src/skins out of their backgrounds into art-src/skins-cut (needs: pip install rembg onnxruntime scipy). Run from art-src/."""
from rembg import remove, new_session
from PIL import Image
import glob, os, numpy as np
from scipy import ndimage
s = new_session('isnet-general-use')
for f in sorted(glob.glob('skins/*.webp')):
    n = os.path.basename(f)[:-5]; o = f'skins-cut/{n}.png'
    if os.path.exists(o): continue
    im = remove(Image.open(f).convert('RGB'), session=s)
    a = np.array(im.getchannel('A')); lab, k = ndimage.label(a > 20)
    if k > 1:  # drop stray bits of background
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, k + 1)); keep = np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z >= .04 * sizes.max()])
        a[~keep] = 0; im.putalpha(Image.fromarray(a))
    im.save(o); print(n, flush=True)
