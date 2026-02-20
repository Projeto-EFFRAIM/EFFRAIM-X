const MAPEAMENTO_ACOES = {
	processo_enviar_email_listar: () => import("./manipuladores/processo_enviar_email_listar.js"),
	arvore_documento_listar: () => import("./manipuladores/arvore_documento_listar.js")
};

export async function obterManipuladorAcao(chaveAcao) {
	const carregador = MAPEAMENTO_ACOES[chaveAcao] || (() => import("./manipuladores/padrao.js"));
	try {
		const mod = await carregador();
		if (typeof mod?.criarManipulador === "function") {
			return mod.criarManipulador();
		}
	} catch (e) {
		console.warn("[EFFRAIM acao_flutuante] Falha ao carregar manipulador da acao.", { chaveAcao, erro: e });
	}
	const modPadrao = await import("./manipuladores/padrao.js");
	return modPadrao.criarManipulador();
}
