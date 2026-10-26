# Compressor de Imagens — Issue #14

Tarefa única: selecionar imagem → definir alvo em KB e modo → baixar.
Nomes descritivos por idioma: Image Compressor, Compressor de Imagens, Compresor de Imágenes. Nome/domínio não têm disponibilidade verificada.

Dois modos:

- **Menor arquivo (recomendado)**, padrão: compara os bytes de JPEG/WebP para entradas opacas e PNG/WebP quando há alpha. Nunca transforma transparência em branco. Entre candidatos que atingem o alvo, prioriza maior resolução e depois menor tamanho; se nenhum atinge, entrega o menor encontrado com aviso. Os codecs não têm qualidade perceptual equivalente; o nome do modo não promete mínimo global.
- **Manter formato original**: JPEG continua JPEG, PNG continua PNG e WebP continua WebP. MIME retornado pelo Canvas é verificado; fallback silencioso é rejeitado. JPEG/WebP podem perder informação. PNG não usa controle de qualidade; sua codificação é sem perdas no raster atual, mas as dimensões podem diminuir. Manter formato não significa manter metadados, animação, resolução ou arquivo byte a byte.

Nos dois modos, UI mostra formato efetivo, bytes aproximados em KB, dimensões, meta atingida/não atingida e aviso se não houve redução. Entrada: JPEG/PNG/WebP até 25 MiB e 24 MP; saída até 12 MP, alvo 1–20480 KB (1 KB = 1024 bytes). Limites e algoritmo de busca do compressor existente foram preservados. Não promete tamanho exato, ganho nem fidelidade universal.

Perfil local, sem upload, contas, analytics, anúncios ou pagamentos. EN/PT-BR/ES. Build entregue noindex. Memória/tempo dependem do dispositivo; operações nativas não são imediatamente canceláveis, mas resultados obsoletos são descartados. Chromium Linux e mobile emulado são o escopo de teste, sem homologação de hardware mobile, Safari ou Firefox.

Origem: hcbar/microtool-starter@e5e88173b84804cca4d749f79b99065c37b2020c; derivação da exportação anterior identificada em PROVENANCE.json. Histórico Git deste candidato é independente. Nenhuma branch do starter, áudio ou infraestrutura de orquestração foi modificada.
