"""Real-browser smoke: localized two-field automatic compression with a result preview."""
import base64
import os
import socket
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HOST = 'http://127.0.0.1:4173'

from browser_smoke_fixture import fixture_png
from browser_formats import run_format_cases, run_locales

def wait_port():
    for _ in range(80):
        try:
            with socket.create_connection(('127.0.0.1', 4173), timeout=0.15):
                return
        except OSError:
            time.sleep(.1)
    raise RuntimeError('Local preview did not start')

def main():
    env = dict(os.environ, DEPLOY_TARGET='preview')
    with subprocess.Popen(['node', 'scripts/dev.mjs'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE) as server:
        try:
            wait_port()
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None, args=['--no-sandbox'])
                try:
                    requests = []
                    run_locales(browser,HOST)
                    page = browser.new_page(accept_downloads=True,viewport={'width':390,'height':844})
                    page.on('request', lambda req: requests.append(req.url))
                    res = page.goto(HOST)
                    assert res.status == 200
                    assert page.locator('meta[name="robots"]').get_attribute('content')=='noindex,nofollow'
                    assert page.locator('#download').is_hidden()
                    page.evaluate('''() => {window.__revokedURLs=[];const r=URL.revokeObjectURL;URL.revokeObjectURL=u=>{window.__revokedURLs.push(u);return r.call(URL,u);};}''')
                    png = fixture_png()
                    assert len(png)>16*1024
                    page.locator('#target').fill('16')
                    page.locator('#file').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':png})
                    page.locator('#download').wait_for(state='visible',timeout=30000)
                    assert page.locator('#preview-panel').is_visible()
                    page.wait_for_function("() => {const i=document.querySelector('#preview');return i.complete && i.naturalWidth>0;}")
                    assert page.locator('#preview').get_attribute('src').startswith('blob:')
                    assert '→' in page.locator('#result').inner_text()
                    with page.expect_download() as info:page.locator('#download').click()
                    d=info.value
                    assert d.suggested_filename.endswith(('.jpg','.webp'))
                    out=Path(d.path()).read_bytes()
                    assert out.startswith(bytes([255,216])) or out[8:12]==b'WEBP'
                    assert len(out)<=16*1024
                    # A new input revokes the preview and never exposes the stale file.
                    jpeg=page.evaluate("() => {const c=document.createElement('canvas');c.width=64;c.height=64;return c.toDataURL('image/jpeg').split(',')[1];}")
                    small=base64.b64decode(jpeg)
                    page.locator('#file').set_input_files({'name':'new.jpg','mimeType':'image/jpeg','buffer':small})
                    assert page.evaluate('window.__revokedURLs.length')>=1
                    page.locator('#target').fill('128')
                    page.locator('#download').wait_for(state='visible',timeout=30000)
                    with page.expect_download() as info:page.locator('#download').click()
                    assert len(Path(info.value.path()).read_bytes())>64
                    # Malformed MIME data must never become a downloadable result.
                    page.locator('#file').set_input_files({'name':'fake.jpg','mimeType':'image/jpeg','buffer':b'not a jpeg'})
                    page.locator('#status').get_by_text('Could not process',exact=False).wait_for(timeout=15000)
                    assert page.locator('#preview-panel').is_hidden()
                    assert page.locator('#download').is_hidden()
                    huge=bytearray(33)
                    huge[:16]=bytes([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82])
                    huge[16:20]=(30000).to_bytes(4,'big')
                    huge[20:24]=(30000).to_bytes(4,'big')
                    page.locator('#file').set_input_files({'name':'huge.png','mimeType':'image/png','buffer':bytes(huge)})
                    page.locator('#status').get_by_text('Could not process',exact=False).wait_for(timeout=15000)
                    assert page.locator('#preview-panel').is_hidden()
                    # Editing the target invalidates the existing preview immediately,
                    # and only the newest target can generate a new download.
                    page.locator('#file').set_input_files({'name':'photo.png','mimeType':'image/png','buffer':png})
                    page.locator('#target').fill('8')
                    page.locator('#download').wait_for(state='visible',timeout=30000)
                    page.locator('#target').fill('2')
                    assert page.locator('#download').is_hidden()
                    assert page.locator('#preview-panel').is_hidden()
                    page.locator('#download').wait_for(state='visible',timeout=30000)
                    assert page.locator('#preview-panel').is_visible()
                    run_format_cases(page)
                    assert not any(not (u.startswith(HOST) or u.startswith('data:') or u.startswith('blob:'+HOST)) for u in requests),requests
                    print('Browser smoke OK: 3 locales, auto compression, preview, transparent output, no stale download, zero uploads')
                finally:
                    browser.close()
        finally:
            server.terminate()
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:server.kill()

if __name__=='__main__':
    main()
