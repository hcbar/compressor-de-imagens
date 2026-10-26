# Image Compressor / Compressor de Imagens

Compressor local derivado da main do starter, Issue #14. Dois modos: Menor arquivo (recomendado) e Manter formato original. Sem upload.

Node >=22.13.0:

```
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Rotas: `/`, `/pt/`, `/es/` em http://127.0.0.1:4173/.

Verificação afetada por esta rodada:

```
npm run build
node --test tests/image.test.mjs tests/formats.test.mjs tests/build.test.mjs tests/config.test.mjs
python tests/browser-modes.py
```

Browser: Python 3.12 e Playwright/Chromium conforme lock em tests/requirements-browser.txt. CHROMIUM_PATH permite navegador instalado. O CI próprio já incluído executa a suíte completa e o smoke, sem deploy. Consulte TRANSFER.md para transferir o mesmo commit, PRODUCT.md para limites e RELEASE.md para os gates de publicação.
