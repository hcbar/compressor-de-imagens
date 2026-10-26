# Transferir o candidato e obter CI próprio

O pacote contém `image-compressor.bundle`, um histórico Git local independente, com branch `main`, sem áudio ou orquestração. É um commit raiz do produto: não carrega o histórico do starter. PROVENANCE.json registra a origem e a exportação anterior. Logs/hashes anteriores continuam nos diretórios originais, sem sobrescrita.

1. Conferir `SHA256SUMS` e o SHA informado em `handoff.json`. Em uma pasta nova, restaurar e verificar:

```sh
git clone ./image-compressor.bundle image-compressor
cd image-compressor
git rev-parse HEAD
git status --short
git fsck --full
```

O SHA deve coincidir com `candidate_commit` em handoff.json; árvore deve estar limpa. O bundle é suficiente para restaurar os arquivos rastreados. O ZIP separado contém o build preview e os logs desta rodada.

2. Somente após aprovação do proprietário, ele deve disponibilizar um repositório remoto **vazio**, sem README/commit inicial. Não usar microtool-starter como destino. Após confirmar a URL desse remoto aprovado:

```sh
git remote set-url origin URL_DO_REPOSITORIO_APROVADO
git push -u origin main
```

Os comandos acima são instruções; não foram executados. Não criar remoto, forçar push, mesclar ao starter nem configurar domínio por inferência.

3. No repositório independente, permitir GitHub Actions e as actions travadas por SHA já usadas em `.github/workflows/ci.yml`. O push em main aciona o CI próprio: npm ci, verify completo, harness Python travado por hashes, smoke Chromium e manifest. O workflow tem somente `contents: read`, não requer Cloudflare nem outros secrets e não faz deploy. Se Actions estiver desabilitado por política da conta, habilitar para esse repositório e executar “Verify starter-derived product” por workflow_dispatch.

4. Confirmar que `head_sha` da execução corresponde ao commit transferido e que todos os passos passaram. Baixar o artifact `tested-site-<SHA>` (dist + release-manifest.json). O manifest deve conter esse SHA; conferir hashes dos assets. Esse resultado estabelece CI próprio, sem reutilizar o CI da main do starter como prova do produto.

Nesta rodada foram executados somente os testes afetados; a suíte completa fica para o CI próprio, sem nova auditoria geral. Deploy, DNS, indexação e domínio permanecem dependentes de autorização separada.
