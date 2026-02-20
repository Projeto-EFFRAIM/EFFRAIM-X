// content/renajud_init.js

(async () => {
	console.log("RENAJUD init em:", window.location.href);

	// recebe dados do Eproc (resolve promessa quando chegar)
	const dadosProntos = new Promise(resolve => {
		if (window.__EFFRAIM_DADOS_RENAJUD) return resolve(window.__EFFRAIM_DADOS_RENAJUD);
		const handler = (evento) => {
			const mensagem = evento.data;
			const origem_remetente = evento.origin;
			if (!mensagem || (mensagem.type !== "EFFRAIM_DADOS_PROCESSO" && mensagem.type !== "EFFRAIM_DADOS_RENAJUD")) return;
			if (!origem_remetente.includes("eproc")) return;
			window.__EFFRAIM_DADOS_RENAJUD = mensagem.dados || mensagem;
			console.log("[RENAJUD] Dados recebidos:", window.__EFFRAIM_DADOS_RENAJUD);
			window.removeEventListener("message", handler);
			resolve(window.__EFFRAIM_DADOS_RENAJUD);
		};
		window.addEventListener("message", handler);
		// fallback: timeout se nada chegar
		setTimeout(() => resolve(null), 5000);
	});

	const dados = await dadosProntos;
	if (!dados) {
		console.warn("[RENAJUD] Sem dados do Eproc após aguardo; abortando automação.");
		return;
	}

	const rotas = {
		"https://renajud.pdpj.jus.br/veiculo/pesquisa": async () => {
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/renajud/pesquisa.js")
			);
			await executar(window.__EFFRAIM_DADOS_RENAJUD);
		},
	};

	// dispara rota atual
	for (const [rota, acao] of Object.entries(rotas)) {
		if (location.href.startsWith(rota)) {
			if (window.__EFFRAIM_RENAJUD_EXECUTED) {
				console.log("[RENAJUD] Automação já executada nesta página; ignorando duplicação.");
				return;
			}
			try {
				await acao(location.href);
				window.__EFFRAIM_RENAJUD_EXECUTED = true;
			} catch (e) {
				console.error("[RENAJUD] Erro ao acionar rota atual:", e);
			}
			break;
		}
	}
})();
