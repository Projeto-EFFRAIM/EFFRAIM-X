PASTA DE PAGINAS-TIPO PARA TUTORIAIS

Objetivo
- Colocar aqui um HTML salvo de cada tipo de pagina real do eproc.
- O tutorial runner carrega estes arquivos com a flag de rota: ?effraim_tutorial=1.

Arquivos esperados
- painel_inicial_secretaria/painel_inicial_secretaria.html
- consulta_processual/consulta_processual.html (+ pasta consulta_processual_files ao lado, se existir)
- lista_processos.html

Regras
- Nao inclua dados sensiveis. Anonimize antes de salvar.
- Mantenha os elementos estruturais que os modulos usam (ids/classes/labels).
- Evite scripts inline novos; se houver no HTML salvo, o navegador pode bloquear por CSP.

Fluxo atual
- A pagina de Tutorial abre: ajuda/tutorial_runner.html?tipo=<tipo>&effraim_tutorial=1
- O runner carrega: ajuda/mock_pages/<tipo>.html?effraim_tutorial=1
- O iframe recebe marcacoes adicionais:
  - documentElement[data-effraim-tutorial="1"]
  - documentElement[data-effraim-tipo="<tipo>"]
  - window.EFFRAIM_TUTORIAL_ROUTE = true

Proxima etapa (pendente)
- Bootstrap dos modulos reais dentro do runner/iframe para reproduzir init igual ao eproc.
