# For each dry-burst frame: walk BACKWARD down the burst's own axis from the
# drawn near cap and assert there is no daylight - no road, grass or sky - before
# the kart. Flame-orange and kart-yellow are not separable by colour, so the test
# is stated the other way round: any BACKGROUND pixel found immediately behind
# the flame's near end means the fire is floating off the bodywork.
import json, sys, math, os
from PIL import Image

def isbg(c):
    r, g, b = c
    if g > r + 12 and g > b + 12: return True                  # grass
    if max(c) - min(c) <= 26 and 80 <= max(c) <= 215: return True  # asphalt / kerb grey
    if b > r + 30 and b > g + 14 and max(c) > 170: return True  # sky / water
    return False

bad = 0
for line in open(sys.argv[1]):
    if not line.startswith('SHOT '): continue
    _, tag, cone = line.split(' ', 2)
    cone = json.loads(cone)
    p = f'gauntlet/shots/b-r4-sw-{tag}.png'
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB'); px = im.load(); W, H = im.size
    ux = cone['x1'] - cone['x0']; uy = cone['y1'] - cone['y0']
    n = math.hypot(ux, uy) or 1
    ux /= n; uy /= n
    worst = 0
    for k in (-0.7, -0.35, 0, 0.35, 0.7):
        sx = cone['x0'] - uy * cone['r0'] * k
        sy = cone['y0'] + ux * cone['r0'] * k * 0.62
        hits = 0
        for t in range(0, 17):
            x = int(round(sx - ux * t)); y = int(round(sy - uy * t))
            if not (0 <= x < W and 0 <= y < H): break
            if isbg(px[x, y]): hits += 1
        worst = max(worst, hits)
    flag = 'OK' if worst <= 3 else 'FAIL'
    if worst > 3: bad += 1
    print(tag, 'bgPixelsBehindNearCap', worst, flag)
print('FAILS', bad)
