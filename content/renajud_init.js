// content/renajud_init.js

(async () => {
	console.log("RENAJUD init em:", window.location.href);
	const CHAVE_DADOS_CACHE = "__EFFRAIM_DADOS_RENAJUD_CACHE__";

	function obterAcao(dados) {
		const acao = String(dados?.opcoes?.acao || "inserir").toLowerCase();
		if (acao === "retirar" || acao === "consultar") return acao;
		return "inserir";
	}

	function obterAmbiente(dados) {
		const ambiente = String(dados?.opcoes?.ambiente || "novo").toLowerCase();
		return ambiente === "antigo" ? "antigo" : "novo";
	}

	function destinoAntigoPorAcao(acao) {
		if (acao === "retirar") return "https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-retirar.jsf";
		if (acao === "consultar") return "https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-consultar.jsf";
		return "https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-insercao.jsf";
	}

	// recebe dados do Eproc (ou cache de sessão)
	const dadosProntos = new Promise((resolve) => {
		if (window.__EFFRAIM_DADOS_RENAJUD) {
			console.log("[RENAJUD] Dados carregados da janela.");
			return resolve(window.__EFFRAIM_DADOS_RENAJUD);
		}

		let dadosCache = null;
		try {
			const cache = sessionStorage.getItem(CHAVE_DADOS_CACHE);
			if (cache) dadosCache = JSON.parse(cache);
		} catch (e) {
			console.warn("[RENAJUD] Falha ao ler cache da sessão.", e);
		}

		const handler = (evento) => {
			const mensagem = evento.data;
			const origemRemetente = evento.origin;
			if (!mensagem || (mensagem.type !== "EFFRAIM_DADOS_PROCESSO" && mensagem.type !== "EFFRAIM_DADOS_RENAJUD")) return;
			if (!origemRemetente.includes("eproc")) return;
			window.__EFFRAIM_DADOS_RENAJUD = mensagem.dados || mensagem;
			try {
				sessionStorage.setItem(CHAVE_DADOS_CACHE, JSON.stringify(window.__EFFRAIM_DADOS_RENAJUD));
			} catch (e) {
				console.warn("[RENAJUD] Falha ao gravar cache da sessão.", e);
			}
			window.removeEventListener("message", handler);
			console.log("[RENAJUD] Dados recebidos por postMessage (prioridade).", {
				parametro: window.__EFFRAIM_DADOS_RENAJUD?.opcoes?.parametro_pesquisa,
				acao: window.__EFFRAIM_DADOS_RENAJUD?.opcoes?.acao,
				ambiente: window.__EFFRAIM_DADOS_RENAJUD?.opcoes?.ambiente
			});
			resolve(window.__EFFRAIM_DADOS_RENAJUD);
		};
		window.addEventListener("message", handler);

		// Prioriza mensagem nova; usa cache apenas como fallback.
		setTimeout(() => {
			window.removeEventListener("message", handler);
			if (dadosCache) {
				window.__EFFRAIM_DADOS_RENAJUD = dadosCache;
				console.log("[RENAJUD] Sem mensagem nova no prazo. Usando cache da sessão.", {
					parametro: dadosCache?.opcoes?.parametro_pesquisa,
					acao: dadosCache?.opcoes?.acao,
					ambiente: dadosCache?.opcoes?.ambiente
				});
				resolve(dadosCache);
				return;
			}
			resolve(null);
		}, 1500);
	});

	const dados = await dadosProntos;
	if (!dados) {
		console.warn("[RENAJUD] Sem dados do Eproc apos aguardo; abortando automação.");
		return;
	}

	const ambiente = obterAmbiente(dados);
	const acao = obterAcao(dados);
	const urlAtual = window.location.href;

	if (window.__EFFRAIM_RENAJUD_EXECUTED) {
		console.log("[RENAJUD] Automacao ja executada nesta pagina; ignorando duplicacao.");
		return;
	}

	try {
		// Fluxo do RENAJUD antigo
		if (ambiente === "antigo") {
			if (urlAtual.startsWith("https://renajud.denatran.serpro.gov.br/renajud/restrito/index.jsf")) {
				const destino = destinoAntigoPorAcao(acao);
				if (urlAtual !== destino) {
					console.log("[RENAJUD] Login detectado no antigo. Redirecionando para tela da acao.", { acao, destino });
					window.location.href = destino;
					return;
				}
			}

			const rotasAntigasAcao = [
				"https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-insercao.jsf",
				"https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-retirar.jsf",
				"https://renajud.denatran.serpro.gov.br/renajud/restrito/restricoes-consultar.jsf"
			];
			if (rotasAntigasAcao.some((rota) => urlAtual.startsWith(rota))) {
				const { executar } = await import(chrome.runtime.getURL("modules/juds/renajud/pesquisa_antigo.js"));
				await executar(dados);
				window.__EFFRAIM_RENAJUD_EXECUTED = true;
				return;
			}

			if (urlAtual.startsWith("https://renajud.denatran.serpro.gov.br/renajud/login.jsf")) {
				console.log("[RENAJUD] Aguardando login no RENAJUD antigo ate /renajud/restrito/index.jsf");
				return;
			}
		}

		// Fluxo do RENAJUD novo: tela de pesquisa
		if (
			urlAtual.startsWith("https://renajud.pdpj.jus.br/veiculo/pesquisa") ||
			urlAtual.startsWith("https://renajud.pdpj.jus.br/veiculo/restricao/pesquisa")
		) {
			const { executar } = await import(chrome.runtime.getURL("modules/juds/renajud/pesquisa.js"));
			await executar(dados);
			window.__EFFRAIM_RENAJUD_EXECUTED = true;
			return;
		}

		// Fluxo do RENAJUD novo: tela de inclusao de restricao
		if (urlAtual.startsWith("https://renajud.pdpj.jus.br/veiculo/restricao/inclusao")) {
			const { executar } = await import(chrome.runtime.getURL("modules/juds/renajud/inclusao.js"));
			await executar(dados);
			window.__EFFRAIM_RENAJUD_EXECUTED = true;
			return;
		}
	} catch (e) {
		console.error("[RENAJUD] Erro ao acionar rota atual:", e);
	}
})();
