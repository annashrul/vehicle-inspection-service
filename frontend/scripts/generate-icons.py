"""Generate original application monograms; requires Pillow only for regeneration."""
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'public'/'icons'
root.mkdir(parents=True,exist_ok=True)
color='#165c4c'
paths=[([(158,134),(158,350),(282,350)],'#ffffff',36), ([(292,260),(332,300),(404,216)],'#bde7d2',32)]
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="{color}"/>'
for points,stroke,width in paths:
    svg+=f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" fill="none" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
svg+='</svg>\n'
(root/'icon.svg').write_text(svg)
for size,maskable in [(192,False),(512,False),(512,True)]:
    scale=4
    canvas=Image.new('RGBA',(512*scale,512*scale),color if maskable else (0,0,0,0))
    draw=ImageDraw.Draw(canvas)
    if not maskable: draw.rounded_rectangle((0,0,512*scale-1,512*scale-1),radius=112*scale,fill=color)
    for points,stroke,width in paths:
        points=[(x*scale,y*scale) for x,y in points]
        draw.line(points,fill=stroke,width=width*scale,joint='curve')
        r=width*scale/2
        for x,y in points: draw.ellipse((x-r,y-r,x+r,y+r),fill=stroke)
    canvas=canvas.resize((size,size),Image.Resampling.LANCZOS)
    canvas.save(root/(f'icon-maskable-{size}.png' if maskable else f'icon-{size}.png'),optimize=True)
