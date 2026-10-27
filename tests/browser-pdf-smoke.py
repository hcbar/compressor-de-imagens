"""Real Chromium verification of browser-local PDF optimization and download."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_smoke_fixture import fixture_png  # noqa: F401
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
HOST = 'http://127.0.0.1:4173'
import socket, time

def wait_port():
    for _ in range(80):
        try:
            with socket.create_connection(('127.0.0.1', 4173), timeout=.15):
                return
        except OSError:
            time.sleep(.1)
    raise RuntimeError('Local preview did not start')

def make_pdf():
    parts = [b'%PDF-1.4\n%\xE2\xE3\xCF\xD3\n']
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << >> /Contents 4 0 R >>',
        b'<< /Length 0 >>\nstream\n\nendstream',
    ]
    offsets = [0]
    for i, body in enumerate(objs, 1):
        offsets.append(sum(len(x) for x in parts))
        parts.append(f'{i} 0 obj\n'.encode() + body + b'\nendobj\n')
    xref = sum(len(x) for x in parts)
    parts.append(b'xref\n0 5\n0000000000 65535 f \n')
    for offset in offsets[1:]:
        parts.append(f'{offset:010d} 00000 n \n'.encode())
    parts.append(b'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' +
                 str(xref).encode() + b'\n%%EOF\n')
    return b''.join(parts)

def main():
    env = dict(os.environ, DEPLOY_TARGET='preview')
    with subprocess.Popen(['node', 'scripts/dev.mjs'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE) as server:
        try:
            wait_port()
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None, args=['--no-sandbox'])
                try:
                    page = browser.new_page(accept_downloads=True)
                    requests = []
                    page.on('request', lambda req: requests.append((req.method, req.url)))
                    response = page.goto(HOST + '/pdf/')
                    assert response.status == 200
                    assert page.locator('meta[name="robots"]').get_attribute('content') == 'noindex,nofollow'
                    assert page.locator('#pdf-download').is_hidden()
                    pdf = make_pdf()
                    page.locator('#pdf-file').set_input_files({'name': 'test.pdf', 'mimeType': 'application/pdf', 'buffer': pdf})
                    page.locator('#pdf-start').click()
                    page.locator('#pdf-download').wait_for(state='visible', timeout=120000)
                    with page.expect_download() as info:
                        page.locator('#pdf-download').click()
                    data = Path(info.value.path()).read_bytes()
                    assert b'%PDF-' in data[:1024]
                    assert data.rstrip().endswith(b'%%EOF')
                    assert len(data) <= len(pdf)
                    assert page.locator('#pdf-result').inner_text().count('→') == 1
                    # No bogus PDF should be downloadable, and the previous result must be revoked.
                    page.locator('#pdf-file').set_input_files({'name': 'fake.pdf', 'mimeType': 'application/pdf', 'buffer': b'not a PDF file!'})
                    assert page.locator('#pdf-download').is_hidden()
                    page.locator('#pdf-start').click()
                    page.locator('#pdf-status[data-state=error]').wait_for(timeout=10000)
                    assert page.locator('#pdf-download').is_hidden()
                    # Only same-origin static requests, never document uploads.
                    assert all(method in ('GET', 'HEAD') for method, _ in requests), requests
                    assert all(url.startswith(HOST) for _, url in requests), requests
                    print('PDF Chromium smoke OK: lossless optimization, download, invalid input and no uploads')
                finally:
                    browser.close()
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()

if __name__ == '__main__':
    main()
