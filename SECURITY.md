# Segurança e limites do candidato

Processamento local usando Canvas; nenhum upload implementado, cookie, analytics ou terceiro. Perfil local, monetização desligada. CSP restringe scripts, estilos e conexões à própria origem e bloqueia objetos/frames. Headers e noindex devem ser confirmados também na hospedagem real.

Mantidos os limites de entrada (25 MiB, 24 MP), inspeção limitada de cabeçalho antes do decode e validação após decode. Alpha é varrido em faixas de 64 linhas, sem copiar todo o RGBA para JavaScript. O bitmap e o Canvas ainda exigem memória proporcional aos pixels; imagens grandes podem falhar em dispositivos com pouca memória. Automático pode executar dois codecs, com maior tempo/custo local. Canvas nativo não oferece interrupção imediata. Bitmaps são fechados e URLs revogadas; resultados atrasados são descartados.

Regressões cobrem MIME falso, arquivos truncados, limites, cancelamento, MIME retornado pelo encoder e alpha. Não é auditoria de segurança independente nem garantia absoluta. Sem dependências JavaScript de produção; harness Python com versões/hashes herdados. Ferramenta de publicação privilegiada e suas dependências exigem revisão independente antes do uso.
