export function criarManipulador() {
	return {
		id: "arvore_documento_listar",
		titulo: "Árvore",
		configuracaoPainel: {
			largura: "90vw",
			larguraMaxima: "90vw"
		},
		transformarUrl({ url }) {
			return url;
		}
	};
}
