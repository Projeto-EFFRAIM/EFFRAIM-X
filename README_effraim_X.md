# EFFRAIM-X

Este arquivo e o ponto de entrada para retomar conversas sobre expansao ou manutencao do EFFRAIM-X em um novo chat.

## Leitura obrigatoria ao iniciar

Antes de analisar, planejar ou editar qualquer arquivo, leia estes documentos em `assets/`:

1. `assets/componentes_sistema.txt`
   - Mapa tecnico da arquitetura, componentes, pontos sensiveis e arquivos-chave.
   - O proprio checklist define este arquivo como a primeira leitura obrigatoria.

2. `assets/checklist_funcionalidades.txt`
   - Regras de criacao, alteracao, validacao e finalizacao de funcionalidades.
   - Contem tambem regras de autorizacao, Git, tutoriais, logs, storage, paineis e convencoes.

3. `assets/pendencias.txt`
   - Lista atual de pendencias de produto/funcionalidade.
   - Use este arquivo para entender o que ainda esta aberto antes de propor proximos passos.

## Objetivo do novo chat

O objetivo normal de um novo chat sera expandir ou manutenir o EFFRAIM-X, dando continuidade ao trabalho anterior sem precisar reconstruir todo o contexto manualmente.

Depois de ler os tres arquivos acima, o chat deve:

- Tratar `componentes_sistema.txt` como o mapa atual da extensao.
- Tratar `checklist_funcionalidades.txt` como fonte de regras obrigatorias de trabalho.
- Tratar `pendencias.txt` como fila de assuntos abertos.
- Conferir o codigo real antes de assumir que a documentacao esta completa.
- Preservar mudancas existentes do usuario e nunca reverter alteracoes nao solicitadas.

## Regras praticas de continuidade

- Para nova funcionalidade, perguntar primeiro: "como voce quer que seja feito?"
- Nao iniciar implementacao de codigo sem autorizacao explicita do usuario no turno atual.
- Ao alterar ou criar funcionalidade, atualizar `assets/componentes_sistema.txt` quando houver mudanca relevante.
- Se houver mudanca estrutural relevante, atualizar tambem `assets/checklist_funcionalidades.txt`.
- Pendencias de produto devem ficar em `assets/pendencias.txt`, nao no checklist.
- Ao concluir implementacao, seguir as regras do checklist sobre `git add` e conferir `git status --short`.

## Arquivos de referencia rapida

- Bootstrap principal: `content/eproc_init.js`
- Configuracoes: `configuracoes.json`
- Barrel de utilitarios: `funcoes.js`
- UI central: `modules/utils/interface.js`
- Rotas ativas: `modules/utils/rotas.js`
- Preferencias: `preferencias.html` e `modules/utils/configuracoes.js`
- Manifest: `manifest.json`

## Contexto resumido

EFFRAIM-X e uma extensao Chrome Manifest V3 para o eproc e integracoes relacionadas. O sistema injeta UI no eproc, ativa modulos por rota/configuracao, usa content scripts para integracoes externas e centraliza varias regras de interface, storage, logs e tutoriais nos documentos de `assets/`.
