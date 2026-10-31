"""Procedural era backgrounds for the trains explainer (flat, poster-style; 1920x1080)."""
import math, random, sys
from PIL import Image, ImageDraw, ImageFilter
W, H = 1920, 1080
OUT = sys.argv[1]

PALETTES = {
  "sepia":  ("#2b1d12", "#8a5a2b", "#d9b482", "#0f0a06"),
  "steel":  ("#0b1220", "#1e3a5f", "#9fb7d1", "#05080f"),
  "dawn":   ("#1a0f2e", "#8b3a62", "#f2a65a", "#0b0616"),
  "teal":   ("#06212b", "#0f6b7a", "#8fd3dc", "#02141a"),
  "night":  ("#050816", "#1b2550", "#6b7cff", "#020308"),
  "sun":    ("#2a1600", "#b4520f", "#ffd27a", "#140a00"),
  "mint":   ("#0d1f1a", "#1f7a5c", "#b7f0d4", "#06110e"),
  "slate":  ("#141821", "#3a4455", "#c9d1dc", "#0a0d12"),
}

def grad(d, top, bottom):
    t = Image.new("RGB", (1, H)); p = t.load()
    ct = Image.new("RGB",(1,1),top).getpixel((0,0)); cb = Image.new("RGB",(1,1),bottom).getpixel((0,0))
    for y in range(H):
        k = y / (H-1); p[0,y] = tuple(int(ct[i]*(1-k)+cb[i]*k) for i in range(3))
    return t.resize((W, H))

def base(pal):
    sky, mid, hi, ground = PALETTES[pal]
    img = grad(None, sky, mid)
    d = ImageDraw.Draw(img)
    # haze band
    d.rectangle([0, int(H*0.62), W, H], fill=ground)
    return img, d, (sky, mid, hi, ground)

def hills(d, hi, ground, y0=640, seed=1, n=3):
    rnd = random.Random(seed)
    for layer in range(n):
        pts=[(0,H)]
        x=0
        y=y0+layer*40
        while x<=W:
            pts.append((x, y + rnd.randint(-60,60) - layer*10)); x+=160
        pts.append((W,H))
        shade = tuple(max(0,int(c*(0.55-layer*0.12))) for c in Image.new("RGB",(1,1),hi).getpixel((0,0)))
        d.polygon(pts, fill=shade)

def rails(d, hi, y=870):
    # perspective track towards horizon
    vx = W//2
    for off in (-260, 260):
        d.polygon([(vx+off*4, H), (vx+off*4+40, H), (vx+off//3+6, y-240), (vx+off//3, y-240)], fill=hi)
    for i in range(14):
        k = i/14; yy = H - (H-(y-240))*k; half = (1-k)*900+40
        d.rectangle([vx-half, yy-8*(1-k)-2, vx+half, yy+2], fill=tuple(int(c*0.5) for c in Image.new("RGB",(1,1),hi).getpixel((0,0))))

def steam_loco(d, x, y, s, body, hi, smoke=True):
    # boiler
    d.rounded_rectangle([x, y-110*s, x+420*s, y-10*s], radius=40*s, fill=body)
    d.rectangle([x+330*s, y-190*s, x+440*s, y-10*s], fill=body)   # cab
    d.rectangle([x+345*s, y-170*s, x+425*s, y-110*s], fill=hi)      # window
    d.rectangle([x+40*s, y-220*s, x+90*s, y-110*s], fill=body)      # chimney
    d.ellipse([x-20*s, y-80*s, x+40*s, y-30*s], fill=hi)            # headlamp
    for cx in (90, 200, 310):
        d.ellipse([x+cx*s-55*s, y-55*s, x+cx*s+55*s, y+55*s], fill=body, outline=hi, width=int(8*s))
        d.ellipse([x+cx*s-12*s, y-12*s, x+cx*s+12*s, y+12*s], fill=hi)
    d.rectangle([x+60*s, y, x+340*s, y+12*s], fill=hi)              # rod
    if smoke:
        for i in range(6):
            r=(30+i*22)*s; cx=x+65*s-i*70*s; cy=y-250*s-i*55*s
            d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=(230,230,230, ))

def streamliner(d, x, y, s, body, hi):
    d.rounded_rectangle([x, y-120*s, x+900*s, y-10*s], radius=70*s, fill=body)
    d.polygon([(x,y-120*s),(x-140*s,y-10*s),(x,y-10*s)], fill=body)
    for i in range(7):
        d.rectangle([x+120*s+i*105*s, y-95*s, x+190*s+i*105*s, y-55*s], fill=hi)
    d.rectangle([x-60*s, y-40*s, x+900*s, y-28*s], fill=hi)
    for cx in range(120, 900, 150):
        d.ellipse([x+cx*s-30*s, y-30*s, x+cx*s+30*s, y+30*s], fill=hi)

def bullet(d, x, y, s, body, hi, stripe):
    d.rounded_rectangle([x+200*s, y-130*s, x+1300*s, y], radius=50*s, fill=body)
    d.polygon([(x+200*s,y-130*s),(x-220*s,y),(x+200*s,y)], fill=body)  # long nose
    d.rectangle([x-100*s, y-60*s, x+1300*s, y-40*s], fill=stripe)
    for i in range(12):
        d.rounded_rectangle([x+260*s+i*85*s, y-105*s, x+310*s+i*85*s, y-70*s], radius=6*s, fill=hi)

def maglev(d, x, y, s, body, hi, glow):
    # guideway
    d.rectangle([0, y+20, W, y+90], fill=hi)
    d.rectangle([0, y+90, W, y+120], fill=body)
    g = Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(g)
    gd.rectangle([x-300*s, y-10, x+1300*s, y+40], fill=glow+(140,))
    return g

def city(d, hi, ground, seed=3):
    rnd=random.Random(seed); x=0
    while x<W:
        w=rnd.randint(40,140); h=rnd.randint(120,420)
        d.rectangle([x, 680-h, x+w, 700], fill=tuple(int(c*0.35) for c in Image.new("RGB",(1,1),hi).getpixel((0,0))))
        for wy in range(690-h, 690, 28):
            for wx in range(x+8, x+w-8, 22):
                if rnd.random()<0.35: d.rectangle([wx,wy,wx+10,wy+14], fill=hi)
        x+=w+rnd.randint(6,30)

def vignette(img):
    v = Image.new("L",(W,H),0); vd=ImageDraw.Draw(v)
    vd.ellipse([-300,-250,W+300,H+250], fill=255)
    v = v.filter(ImageFilter.GaussianBlur(220))
    dark = Image.new("RGB",(W,H),(0,0,0))
    return Image.composite(img, dark, v.point(lambda p: 90+int(p*0.65)))

def rgb(h): return Image.new("RGB",(1,1),h).getpixel((0,0))

def save(img, name):
    vignette(img).convert("RGB").save(f"{OUT}/{name}.png", optimize=True)

# ── scenes ──
def s_hero_rocket():
    img,d,(sky,mid,hi,ground)=base("dawn"); hills(d,hi,ground,600,seed=11); rails(d,rgb(hi)); steam_loco(d,560,860,1.0,rgb(ground),rgb(hi)); save(img,"01_rocket_hero")
def s_shinkansen_today():
    img,d,(sky,mid,hi,ground)=base("steel"); city(d,rgb(hi),ground); d.rectangle([0,700,W,H],fill=ground); bullet(d,300,900,1.0,rgb("#e8eef5"),rgb(hi),rgb("#2563eb")); save(img,"02_shinkansen_today")
def s_timeline():
    img,d,(sky,mid,hi,ground)=base("slate"); d.line([(120,560),(W-120,560)],fill=rgb(hi),width=10)
    for i,yr in enumerate(["1804","1829","1869","1938","1964","2015"]):
        x=160+i*(W-320)//5; d.ellipse([x-26,534,x+26,586],fill=rgb(hi)); d.ellipse([x-12,548,x+12,572],fill=ground)
    save(img,"03_timeline")
def s_horse():
    img,d,(sky,mid,hi,ground)=base("sepia"); hills(d,hi,ground,560,seed=5)
    d.rectangle([0,760,W,H],fill=rgb(mid)); d.rectangle([900,700,1500,860],fill=rgb(ground)); # wagon
    for cx in (1000,1400): d.ellipse([cx-70,800,cx+70,940],fill=rgb(ground),outline=rgb(hi),width=10)
    d.polygon([(560,860),(620,700),(820,690),(860,860)],fill=rgb(ground)); d.rectangle([520,690,600,760],fill=rgb(ground)) # horse-ish block
    save(img,"04_horse_wagon")
def s_trevithick():
    img,d,(sky,mid,hi,ground)=base("sepia"); hills(d,hi,ground,620,seed=7); rails(d,rgb(hi)); steam_loco(d,700,860,0.8,rgb(ground),rgb(hi)); save(img,"05_trevithick")
def s_cracked():
    img,d,(sky,mid,hi,ground)=base("slate"); rails(d,rgb(hi)); 
    for i in range(9): x=640+i*80; d.line([(x,760+i*25),(x+60,740+i*25),(x+30,800+i*25)],fill=rgb("#ff4d4d"),width=10)
    save(img,"06_cracked_rails")
def s_station():
    img,d,(sky,mid,hi,ground)=base("sun"); d.rectangle([0,560,W,H],fill=rgb(ground))
    for x in range(100,W,220): d.rectangle([x,300,x+40,560],fill=rgb(mid)); d.polygon([(0,300),(W,300),(W//2,120)],fill=rgb(mid))
    streamliner(d,500,850,0.9,rgb(ground),rgb(hi)); save(img,"07_station")
def s_map():
    img,d,(sky,mid,hi,ground)=base("mint"); rnd=random.Random(2)
    pts=[(rnd.randint(200,W-200),rnd.randint(150,900)) for _ in range(40)]
    for a in pts:
        for b in rnd.sample(pts,3): d.line([a,b],fill=rgb(hi),width=4)
    for a in pts: d.ellipse([a[0]-14,a[1]-14,a[0]+14,a[1]+14],fill=rgb(hi))
    save(img,"08_map")
def s_clocks():
    img,d,(sky,mid,hi,ground)=base("night")
    for i in range(5):
        cx=250+i*355; cy=520; r=130; d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=rgb(ground),outline=rgb(hi),width=10)
        ang=math.radians(-90+i*47); d.line([(cx,cy),(cx+math.cos(ang)*90,cy+math.sin(ang)*90)],fill=rgb(hi),width=10)
    save(img,"09_clocks")
def s_spike():
    img,d,(sky,mid,hi,ground)=base("sun"); hills(d,hi,ground,600,seed=9); rails(d,rgb(hi)); d.polygon([(W//2-20,520),(W//2+20,520),(W//2+8,700),(W//2-8,700)],fill=rgb("#ffd700")); save(img,"10_golden_spike")
def s_bigsteam():
    img,d,(sky,mid,hi,ground)=base("steel"); city(d,rgb(hi),ground); d.rectangle([0,700,W,H],fill=ground); steam_loco(d,420,900,1.25,rgb(ground),rgb(hi)); save(img,"11_big_steam")
def s_mallard():
    img,d,(sky,mid,hi,ground)=base("teal"); hills(d,hi,ground,640,seed=13); d.rectangle([0,760,W,H],fill=rgb(ground)); streamliner(d,480,880,1.0,rgb("#1b4965"),rgb(hi))
    for i in range(12): d.line([(80+i*30,760+i*8),(380+i*30,760+i*8)],fill=rgb(hi),width=3)
    save(img,"12_mallard")
def s_coal():
    img,d,(sky,mid,hi,ground)=base("sun"); d.rectangle([0,0,W,H],fill=rgb(ground))
    for i in range(60):
        rnd=random.Random(i); x=rnd.randint(0,W); y=rnd.randint(500,H); r=rnd.randint(20,90); d.ellipse([x-r,y-r,x+r,y+r],fill=(rnd.randint(200,255),rnd.randint(60,140),0))
    save(img,"13_coal_fire")
def s_zephyr():
    img,d,(sky,mid,hi,ground)=base("dawn"); hills(d,hi,ground,620,seed=21); d.rectangle([0,760,W,H],fill=rgb(ground)); streamliner(d,560,880,1.05,rgb("#c0c7d1"),rgb(sky)); save(img,"14_zephyr")
def s_diesel():
    img,d,(sky,mid,hi,ground)=base("slate"); rails(d,rgb(hi))
    for i in range(3): d.rounded_rectangle([200+i*520,620,640+i*520,820],radius=30,fill=rgb(mid)); d.rectangle([220+i*520,650,620+i*520,700],fill=rgb(hi))
    save(img,"15_diesel_yard")
def s_catenary():
    img,d,(sky,mid,hi,ground)=base("teal"); rails(d,rgb(hi))
    for x in range(200,W,330): d.rectangle([x,200,x+24,860],fill=rgb(mid)); d.line([(x,260),(x+200,260)],fill=rgb(mid),width=12)
    d.line([(0,290),(W,290)],fill=rgb(hi),width=6); save(img,"16_catenary")
def s_tokyo():
    img,d,(sky,mid,hi,ground)=base("night"); city(d,rgb(hi),ground,seed=8); d.rectangle([0,700,W,H],fill=ground)
    for i in range(16): d.rounded_rectangle([60+i*118,760,160+i*118,860],radius=14,fill=rgb(mid))
    save(img,"17_crowded_tokyo")
def s_construction():
    img,d,(sky,mid,hi,ground)=base("sun"); hills(d,hi,ground,560,seed=17); rails(d,rgb(hi))
    for i in range(6): x=200+i*300; d.polygon([(x,760),(x+40,760),(x+20,380)],fill=rgb(mid)); d.line([(x+20,380),(x+260,420)],fill=rgb(mid),width=10)
    save(img,"18_construction")
def s_shinkansen64():
    img,d,(sky,mid,hi,ground)=base("dawn"); d.rectangle([0,700,W,H],fill=ground); hills(d,hi,ground,520,seed=23)
    d.polygon([(1500,520),(1700,180),(1900,520)],fill=rgb(hi))  # Fuji
    bullet(d,320,900,1.0,rgb("#f1f5f9"),rgb(sky),rgb("#1d4ed8")); save(img,"19_shinkansen_1964")
def s_passengers():
    img,d,(sky,mid,hi,ground)=base("mint")
    for r in range(4):
        for c in range(14): x=120+c*125; y=300+r*170; d.ellipse([x-30,y-30,x+30,y+30],fill=rgb(hi)); d.rounded_rectangle([x-45,y+40,x+45,y+120],radius=20,fill=rgb(hi))
    save(img,"20_passengers")
def s_tgv():
    img,d,(sky,mid,hi,ground)=base("steel"); hills(d,hi,ground,600,seed=31); d.rectangle([0,760,W,H],fill=rgb(ground)); bullet(d,300,900,1.0,rgb("#9ca3af"),rgb(hi),rgb("#f97316")); save(img,"21_tgv")
def s_shinkansen_now():
    img,d,(sky,mid,hi,ground)=base("teal"); city(d,rgb(hi),ground,seed=5); d.rectangle([0,700,W,H],fill=ground); bullet(d,240,900,1.05,rgb("#e2e8f0"),rgb(hi),rgb("#16a34a")); save(img,"22_shinkansen_now")
def s_maglev():
    img,d,(sky,mid,hi,ground)=base("night"); city(d,rgb(hi),ground,seed=12)
    g=maglev(d,300,900,1.0,rgb(mid),rgb(hi),rgb("#60a5fa")); bullet(d,300,890,1.0,rgb("#f8fafc"),rgb(hi),rgb("#60a5fa"))
    img=Image.alpha_composite(img.convert("RGBA"), g.filter(ImageFilter.GaussianBlur(30))); save(img,"23_maglev")
def s_timeline2():
    img,d,(sky,mid,hi,ground)=base("dawn"); d.line([(120,560),(W-120,560)],fill=rgb(hi),width=10)
    for i in range(7): x=160+i*(W-320)//6; d.ellipse([x-26,534,x+26,586],fill=rgb(hi))
    save(img,"24_timeline_end")
def s_horizon():
    img,d,(sky,mid,hi,ground)=base("sun"); hills(d,hi,ground,640,seed=41); rails(d,rgb(hi)); d.ellipse([W//2-160,420,W//2+160,740],fill=rgb(hi)); d.rectangle([0,740,W,H],fill=rgb(ground)); rails(d,rgb(hi)); save(img,"25_horizon")

for f in [v for k,v in list(globals().items()) if k.startswith("s_")]: f()
print("done")
