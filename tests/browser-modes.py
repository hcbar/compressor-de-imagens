"""Run only the browser cases affected by the mode/copy change."""
import importlib.util,os,subprocess
from playwright.sync_api import sync_playwright
from browser_formats import run_format_cases,run_locales
from pathlib import Path
spec=importlib.util.spec_from_file_location('smoke',Path(__file__).with_name('browser-smoke.py'))
smoke=importlib.util.module_from_spec(spec);spec.loader.exec_module(smoke)
with subprocess.Popen(['node','scripts/dev.mjs'],cwd=smoke.ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE) as server:
    try:
        smoke.wait_port()
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None,args=['--no-sandbox'])
            try:
                run_locales(browser,smoke.HOST)
                page=browser.new_page(accept_downloads=True);page.goto(smoke.HOST)
                run_format_cases(page)
                print('Affected browser tests OK',flush=True)
            finally:browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill()
