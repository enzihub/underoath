"""Render the README/landing art from the HTML sources in this folder.
Run from the repo root:  python assets/source/render.py   (needs: pip install playwright pillow; playwright install chromium)"""
import asyncio, os, sys
from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
JOBS = [("hero", 1000, 540, "assets/hero.png", 2, True),
        ("collage", 1000, 700, "assets/collage.png", 2, True),
        ("og", 1200, 630, "docs/og.png", 1, False)]
EXE = os.environ.get("CHROME")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, executable_path=EXE or None, args=["--allow-file-access-from-files"])
        for name, w, h, out, dpr, transparent in JOBS:
            c = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=dpr)
            pg = await c.new_page()
            await pg.goto("file://" + os.path.join(HERE, name + ".html"))
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(700)
            dst = os.path.join(ROOT, out)
            await pg.screenshot(path=dst, omit_background=transparent, clip={"x": 0, "y": 0, "width": w, "height": h})
            fonts = await pg.evaluate("[document.fonts.check('700 40px Cinzel'), document.fonts.check('16px Inter')]")
            broken = await pg.evaluate("[...document.images].filter(i => !i.naturalWidth).map(i => i.src)")
            print(name, Image.open(dst).size, "fonts", fonts, "broken", broken)
            await c.close()
        await b.close()

asyncio.run(main())
