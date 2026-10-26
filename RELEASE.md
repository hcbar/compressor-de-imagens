# Candidato sem publicação

Preparação local concluída para revisão; fonte em commit Git independente, sem CI remoto próprio ainda. Build entregue noindex, siteUrl vazio e monetização desligada. CI/preflight herdados são somente verificação: não publicam.

Próximo mínimo: seguir TRANSFER.md após autorização de destino; obter CI verde no SHA transferido. Publicação e indexação exigem aprovação separada do proprietário para origem HTTPS e destino estático. Não é necessário criar orquestrador nem publisher automático.

Antes de um deploy autorizado, usar ferramenta com dependências travadas e revisadas e permissões mínimas; testar o build de produção final, registrar source SHA e SHA256 do manifest, publicar exatamente os bytes testados e registrar versão anterior para rollback manual. Verificar domínio/TLS, rotas, headers/CSP, robots e download. Reativar a versão anterior ou republicar seus bytes para rollback. Nenhuma dessas ações foi executada.

Limitações já documentadas não justificam nova auditoria geral nesta rodada. Revisão independente e CI remoto do candidato não são alegados como concluídos.
