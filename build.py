#!/usr/bin/env python3
"""Costruisce www/index.html (APK) e artifact.html (versione dentro Claude). Funziona senza rete."""
import base64, pathlib
q = pathlib.Path(__file__).parent
ff = lambda nome, f, pes: f"@font-face{{font-family:'{nome}';font-weight:{pes};src:url(data:font/woff2;base64,{base64.b64encode((q/'font'/f).read_bytes()).decode()}) format('woff2');font-display:swap}}"
fonts = ff('SC Saira', 's500.woff2', 500) + ff('SC Saira', 's700.woff2', 700) + ff('SC Mono', 'mono.woff2', 400)
sim = (q/'sim.js').read_text().split('if(typeof module')[0]
js = sim + (q/'schede.js').read_text() + (q/'gioco.js').read_text()
corpo = f"""<canvas id="gioco" aria-label="Plancia della centrale"></canvas><div id="sc"></div><div id="ruota" class="ruota" hidden>Gira il tablet in orizzontale</div>
<span style="position:absolute;opacity:0;font-family:'SC Mono'">0</span><span style="position:absolute;opacity:0;font-family:'SC Saira';font-weight:700">0</span>
<script>{js}</script>"""
testa = f"""<title>Sala controllo</title><style>{fonts}{(q/'stile.css').read_text()}</style>"""
(q/'www').mkdir(exist_ok=True)
(q/'www'/'index.html').write_text(f'<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><meta name="theme-color" content="#1c2422">{testa}</head><body>{corpo}</body></html>')
(q/'artifact.html').write_text(f'{testa}\n{corpo}')
print('ok', len(corpo)+len(testa))
