---
name: avaliar-cobertura
description: "Mede a cobertura atual e mostra os pontos mais e menos cobertos para priorizar novos testes."
argument-hint: "Escopo opcional, por exemplo: backend/src/controllers"
agent: cobertura
---

Avalie a cobertura de testes atual do Document Management System.

Use o argumento informado como escopo. Se nenhum argumento for informado,
avalie todo o backend. Execute os testes e a cobertura nativa do Node quando
disponivel, depois apresente o resultado usando o formato definido pelo agente.

Priorize testes que protejam upload, listagem e download, incluindo validacao,
isolamento por usuario, autorizacao, persistencia local e respostas de erro.
Nao altere codigo nem escreva testes durante esta avaliacao.