# Publicacao de teste — Compressor de Imagens

Escopo desta configuracao: **somente teste publico em workers.dev**, sem indexacao,
dominio proprio, anuncios, analytics ou deploy no microtool-starter/Recorte.
A UI publicada e a versao com os modos "Menor arquivo" e "Manter formato original".

## Primeiro deploy (no painel Cloudflare)

1. Acesse https://dash.cloudflare.com/ > **Workers & Pages** > **Create application**.
2. Escolha **GitHub**, autorize acesso ao repositório privado **hcbar/compressor-de-imagens**
   (se possivel, conceda acesso apenas a ele).
3. Nome do Worker: **image-compressor-preview**. Deve coincidir com `wrangler.jsonc`.
4. Repositorio: `hcbar/compressor-de-imagens`; branch: `main`; root directory: raiz.
5. Build command:
   `npm ci --ignore-scripts --no-audit --no-fund && npm run build`
6. Deploy command: `npx wrangler deploy`.
7. Confirme que o deploy sera publicado **somente em workers.dev**. Use
   autenticacao gerenciada pelo proprio Workers Builds; nao cole token de
   Cloudflare no GitHub, no chat ou no codigo.
8. Clique em **Save and Deploy**; copie a URL `workers.dev` mostrada no dashboard.

O `npm run build` usa `DEPLOY_TARGET=preview` por padrao e gera `dist/`
com meta robots `noindex,nofollow` e `robots.txt` bloqueando crawlers.
Isto **nao e controle de acesso**: qualquer pessoa com a URL pode abrir o site.
O app processa as imagens no navegador; nenhum arquivo e enviado ao servidor.

## Checklist apos deploy

- Verifique `/`, `/pt/` e `/es/`, links de idioma e responsividade.
- Verifique a presenca da meta `robots=noindex,nofollow` no HTML.
- Verifique `/robots.txt` e os headers `Content-Security-Policy`,
  `X-Content-Type-Options` e `Referrer-Policy`.
- Comprima um JPG opaco e um PNG transparente, em ambos os modos; abra os
  arquivos gerados. Verifique avisos de meta inatingivel e arquivo sem reducao.
- Confira no dashboard qual commit foi utilizado no build e se a URL final
  tem o comportamento esperado. CI do GitHub ja havia passado no
  `5bb31cf51f3899ba7c447e8100b95ab0d09c6ec3`.

## Rollback / publicacao definitiva

Em caso de problema, use o historico de deployments/rollback do Worker no
painel da Cloudflare, ou suspenda o projeto de teste; nao modifique o
starter nem o Recorte. O endereco `workers.dev` permanece temporario.
Antes da indexacao publica, definir um dominio definitivo, atualizar
`siteUrl` e `indexable` em `config/product.json`, testar o build de
producao (`DEPLOY_TARGET=production npm run build`) e revalidar o SEO.
Nao habilitar indexacao apenas por ter publicado em workers.dev.
