"""Only synthetic input; inspect network requests including same-origin data sends."""
from pathlib import Path
from urllib.parse import urlparse
from browser_smoke_fixture import fixture_png


def watch_requests(page, host):
    unexpected = []
    def inspect(req):
        u = urlparse(req.url)
        if u.scheme not in ('http', 'https'):
            return
        static = u.path in ('/', '/pt/', '/es/') or u.path.startswith('/assets/')
        if not req.url.startswith(host + '/') or not static or u.query or req.method != 'GET' or req.post_data_buffer is not None:
            unexpected.append({'method': req.method, 'url': req.url})
    page.context.on('request', inspect)
    page.on('websocket', lambda _: unexpected.append({'type': 'websocket'}))
    return unexpected


def run_network_case(browser, host):
    page = browser.new_page(accept_downloads=True)
    try:
        unexpected = watch_requests(page, host)
        page.goto(host + '/')
        page.locator('#target').fill('16')
        page.locator('#file').set_input_files({'name': 'PRIVATE_SENTINEL.png', 'mimeType': 'image/png', 'buffer': fixture_png()})
        page.locator('#download').wait_for(state='visible', timeout=30000)
        with page.expect_download() as info:
            page.locator('#download').click()
        assert len(Path(info.value.path()).read_bytes()) <= 16 * 1024
        assert unexpected == [], unexpected
    finally:
        page.close()
    print('Local processing network check passed: static GETs only, compression and download', flush=True)


def run_diagnostic_cases(browser, host):
    import json
    notices = {
        'en': ('Your files never leave your device.', 'Diagnostic copied.'),
        'pt': ('Seus arquivos nunca saem do seu dispositivo.', 'Diagnóstico copiado.'),
        'es': ('Tus archivos nunca salen de tu dispositivo.', 'Diagnóstico copiado.'),
    }
    for lang, route in [('en', '/'), ('pt', '/pt/'), ('es', '/es/')]:
        for mobile in (False, True):
            page = browser.new_page(viewport={'width': 390 if mobile else 1280, 'height': 844})
            try:
                unexpected = watch_requests(page, host)
                page.add_init_script("Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async text=>{window.copiedDiagnostic=text;}}});")
                page.goto(host + route)
                assert page.locator('#local-privacy strong').inner_text() == notices[lang][0]
                assert page.locator('#local-privacy').is_visible()
                page.locator('#file').set_input_files({'name': 'PRIVATE_FILENAME.png', 'mimeType': 'image/png', 'buffer': b'PRIVATE_CONTENT_METADATA'})
                page.locator('#error-code').get_by_text('IC_INVALID_IMAGE', exact=True).wait_for()
                page.locator('#diagnostic-details summary').click()
                report = page.locator('#diagnostic-report').input_value()
                assert json.loads(report) == {'tool': 'Image Compressor', 'version': '0.1.1', 'stage': 'opening', 'code': 'IC_INVALID_IMAGE', 'category': 'input'}
                assert 'PRIVATE' not in report and 'http' not in report and 'stack' not in report
                page.locator('#copy-diagnostic').click()
                page.wait_for_function('() => window.copiedDiagnostic !== undefined')
                assert page.evaluate('window.copiedDiagnostic') == report
                assert page.locator('#copy-status').inner_text() == notices[lang][1]
                page.evaluate("() => { navigator.clipboard.writeText=async()=>{throw Error('PRIVATE_CLIPBOARD_ERROR');}; }")
                page.locator('#copy-diagnostic').click()
                page.wait_for_function("() => document.activeElement.id==='diagnostic-report'")
                assert page.locator('#diagnostic-report').evaluate('(t)=>t.selectionEnd-t.selectionStart') == len(report)
                assert 'PRIVATE' not in page.locator('#diagnostic-panel').inner_text()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                # A replacement clears the old report and can process immediately.
                page.locator('#file').set_input_files({'name': 'PRIVATE_REPLACEMENT.png', 'mimeType': 'image/png', 'buffer': fixture_png()})
                page.locator('#download').wait_for(state='visible', timeout=30000)
                assert page.locator('#diagnostic-panel').is_hidden()
                assert page.locator('#diagnostic-report').input_value() == ''
                assert unexpected == [], unexpected
                if mobile and lang == 'pt':
                    page.screenshot(path='test-results/privacy-mobile-pt.png', full_page=True)
            finally:
                page.close()
    # Clipboard success through the actual secure-context browser API.
    context = browser.new_context(permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    try:
        unexpected = watch_requests(page, host)
        page.goto(host + '/')
        page.locator('#file').set_input_files({'name': 'PRIVATE.png', 'mimeType': 'image/png', 'buffer': b'PRIVATE'})
        page.locator('#copy-diagnostic').wait_for()
        page.locator('#copy-diagnostic').click()
        page.wait_for_function("() => document.querySelector('#copy-status').textContent==='Diagnostic copied.'")
        assert page.evaluate('navigator.clipboard.readText()') == page.locator('#diagnostic-report').input_value()
        assert unexpected == [], unexpected
    finally:
        context.close()
    # Fault injection exercises conversion, preview rendering and export creation.
    for stage in ('conversion', 'rendering', 'export'):
        page = browser.new_page()
        try:
            unexpected = watch_requests(page, host)
            page.goto(host + '/')
            page.locator('#target').fill('1')
            if stage == 'conversion':
                page.evaluate("() => { HTMLCanvasElement.prototype.toBlob=()=>{throw Error('PRIVATE_CODEC_DETAILS');}; }")
            if stage == 'export':
                page.evaluate("() => { URL.createObjectURL=()=>{throw Error('PRIVATE_EXPORT_DETAILS');}; }")
            if stage == 'rendering':
                page.evaluate("() => { URL.createObjectURL=()=> 'blob:'+location.origin+'/invalid-synthetic-object'; }")
            page.locator('#file').set_input_files({'name': 'PRIVATE.png', 'mimeType': 'image/png', 'buffer': fixture_png()})
            page.locator('#diagnostic-panel').wait_for(state='visible', timeout=30000)
            report = page.locator('#diagnostic-report').input_value()
            assert json.loads(report)['stage'] == stage, report
            assert 'PRIVATE' not in report and 'stack' not in report and 'http' not in report
            assert page.locator('#download').is_hidden()
            assert unexpected == [], unexpected
        finally:
            page.close()
    print('Privacy diagnostics OK: EN/PT/ES desktop/mobile, normalization, real clipboard/fallback, replacement and 3 fault stages', flush=True)
