export function criarManipulador() {
	return {
		id: "padrao",
		titulo: "Ação Flutuante",
		descricao: "Ação carregada no painel flutuante.",
		transformarUrl({ url }) {
			return url;
		}
	};
}
