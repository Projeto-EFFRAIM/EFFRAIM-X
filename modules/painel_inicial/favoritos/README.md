Arquitetura resumida dos favoritos do painel inicial:

- `state.js`: persistência (get/save, isFavorito, adicionarFavorito, removerFavorito).
- `dom.js`: renderiza o fieldset de favoritos e suas pastas, cria linhas espelhadas e sincroniza contagens.
- `menu.js`: insere ícones nas seções favoritáveis, menu flutuante de inclusão e atualização de ícones.
- `painel.js`: modal simples que lista todos os favoritos.
- `index.js`: re-exporta funções usadas externamente.
