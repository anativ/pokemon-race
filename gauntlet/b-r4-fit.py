import json, sys
from PIL import Image
img, hulljson, x0, x1 = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
parts = json.load(open(hulljson))
im = Image.open(img).convert('RGB'); px = im.load()
W, H = im.size

def top_of(poly, x):
    ys = []
    n = len(poly)
    for i in range(n):
        a = poly[i]; b = poly[(i+1) % n]
        if (a[0]-x)*(b[0]-x) <= 0 and a[0] != b[0]:
            t = (x-a[0])/(b[0]-a[0]); ys.append(a[1]+t*(b[1]-a[1]))
    return min(ys) if ys else None

def hulltop(x):
    vs = [top_of(p, x) for p in parts]
    vs = [v for v in vs if v is not None]
    return min(vs) if vs else None

def iskart(c):
    r, g, b = c
    # road/asphalt is near-neutral grey; kart paint is saturated (yellow/blue)
    # and its tyres/shadow line are near-black.
    return (max(c) - min(c) > 28) or (max(c) < 72)

bad = 0
for x in range(x0, x1, 10):
    ht = hulltop(x)
    if ht is None: continue
    pt = None
    for y in range(max(0, int(ht)-60), min(H, int(ht)+160)):
        if iskart(px[x, y]): pt = y; break
    d = None if pt is None else round(ht-pt)
    if pt is not None and ht - pt < -6: bad += 1
    print(x, 'hullTop', round(ht), 'paintTop', pt, 'slack', d)
print('columns where hull floats >6px above paint:', bad)
