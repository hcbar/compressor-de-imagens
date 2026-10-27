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


def make_rich_pdf():
    """One-page valid PDF with selectable text, link, editable widget and image."""
    import zlib
    w = h = 128
    raw = bytearray()
    for y in range(h):
        for x in range(w):
            raw.extend(((x+y)&255, (x*3+y*2)&255, (x*y//127)&255))
    img = zlib.compress(raw, 6)
    txt = (b'BT /F1 18 Tf 50 700 Td (Searchable PDF text) Tj ET\n'
           b'q 180 0 0 180 50 400 cm /Im1 Do Q\n')
    def stream(data, params):
        return b'<< '+params+b' /Length '+str(len(data)).encode()+b' >>\nstream\n'+data+b'\nendstream'
    objects = [
      b'<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [8 0 R] /NeedAppearances true /DA (/F1 12 Tf 0 g) /DR << /Font << /F1 4 0 R >> >> >> >>',
      b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 5 0 R /Annots [7 0 R 8 0 R] >>',
      b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      stream(txt,b''),
      stream(img,b'/Type /XObject /Subtype /Image /Width 128 /Height 128 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode'),
      b'<< /Type /Annot /Subtype /Link /Rect [50 680 280 715] /Border [0 0 0] /A << /S /URI /URI (https://example.org/pdf) >> >>',
      b'<< /Type /Annot /Subtype /Widget /FT /Tx /T (UserField) /V (Saved value) /Rect [50 250 300 280] /F 4 /P 3 0 R >>',
    ]
    buf=bytearray(b'%PDF-1.5\n%\xe2\xe3\xcf\xd3\n'); offsets=[0]
    for n, body in enumerate(objects,1):
        offsets.append(len(buf))
        buf+=f'{n} 0 obj\n'.encode()+body+b'\nendobj\n'
    pos=len(buf);buf+=f'xref\n0 {len(objects)+1}\n0000000000 65535 f \n'.encode()
    for offset in offsets[1:]:buf+=f'{offset:010d} 00000 n \n'.encode()
    buf+=f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{pos}\n%%EOF\n'.encode()
    return bytes(buf)

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
                    diagnostics = []
                    page.on('request', lambda req: requests.append((req.method, req.url)))
                    page.on('console', lambda m: diagnostics.append('console: ' + m.type + ' ' + m.text))
                    page.on('pageerror', lambda exc: diagnostics.append('pageerror: ' + str(exc)))
                    page.on('requestfailed', lambda req: diagnostics.append('requestfailed: ' + req.url + ' ' + str(req.failure)))
                    response = page.goto(HOST + '/pdf/')
                    assert response.status == 200
                    assert page.locator('meta[name="robots"]').get_attribute('content') == 'noindex,nofollow'
                    assert page.locator('#pdf-download').is_hidden()
                    pdf = make_pdf()
                    page.locator('#pdf-file').set_input_files({'name': 'test.pdf', 'mimeType': 'application/pdf', 'buffer': pdf})
                    page.locator('#pdf-start').click()
                    try:
                        page.wait_for_function("""() => !document.querySelector('#pdf-download').hidden ||
                            document.querySelector('#pdf-status').dataset.state === 'error'""", timeout=30000)
                    except Exception:
                        print('PDF TEST TIMEOUT: status=', page.locator('#pdf-status').inner_text(), flush=True)
                        print('PDF TEST DIAGNOSTICS:', diagnostics, flush=True)
                        raise
                    print('PDF TEST STATUS:', page.locator('#pdf-status').inner_text(), flush=True)
                    print('PDF TEST DIAGNOSTICS:', diagnostics, flush=True)
                    assert page.locator('#pdf-download').is_visible(), 'PDF compression failed before download'
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

                    # Matrix: structured PDF must preserve text, links, forms and image objects.
                    from pypdf import PdfReader
                    from io import BytesIO
                    rich = make_rich_pdf()
                    original_doc = PdfReader(BytesIO(rich))
                    assert 'Searchable PDF text' in original_doc.pages[0].extract_text()
                    assert len(original_doc.pages[0].get('/Annots', [])) == 2
                    assert original_doc.get_fields()['UserField'].get('/V') == 'Saved value'
                    for mode in ('preserve', 'smaller'):
                        page.locator('#pdf-mode').select_option(mode)
                        page.locator('#pdf-file').set_input_files({'name':'rich.pdf','mimeType':'application/pdf','buffer':rich})
                        page.locator('#pdf-start').click()
                        page.wait_for_function("""() => !document.querySelector('#pdf-download').hidden ||
                            document.querySelector('#pdf-status').dataset.state === 'error'""", timeout=30000)
                        assert page.locator('#pdf-download').is_visible(), (mode, page.locator('#pdf-status').inner_text(), diagnostics)
                        with page.expect_download() as info: page.locator('#pdf-download').click()
                        out = Path(info.value.path()).read_bytes()
                        assert len(out) <= len(rich)
                        doc = PdfReader(BytesIO(out))
                        assert len(doc.pages) == 1
                        assert 'Searchable PDF text' in doc.pages[0].extract_text()
                        assert any(a.get_object().get('/A', {}).get('/URI') == 'https://example.org/pdf' for a in doc.pages[0]['/Annots'])
                        assert doc.get_fields()['UserField'].get('/V') == 'Saved value'
                        assert '/XObject' in doc.pages[0]['/Resources']
                    # Signed PDFs must not be modified: intentionally recognizable signature marker.
                    signed = rich + b'\n% /ByteRange [0 10 20 30]\n'
                    page.locator('#pdf-file').set_input_files({'name':'signed.pdf','mimeType':'application/pdf','buffer':signed})
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
