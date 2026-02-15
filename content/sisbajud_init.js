// content/sisbajud_init.js

// Hook para interceptar navegações internas (ex: redirect inicial do Angular)
(() => {
	const originalPushState = history.pushState;
	history.pushState = function (...args) {
		const destino = args[2];
		console.log("[EFFRAIM] pushState interceptado:", destino);

		try {
			// verifica se a nova rota é /minuta ou /minuta/ (evita confundir com /minuta/cadastrar)
			if (typeof destino === "string" && /^\/minuta\/?$/.test(destino)) {
				console.log("[EFFRAIM] Redirecionamento detectado para /minuta. Aguardando DOM…");

				const acionar = async () => {
					try {
						console.log("[EFFRAIM] Executando minuta.js via interceptação de pushState");
						const modulo = await import(chrome.runtime.getURL("modules/juds/sisbajud/minuta.js"));
						await modulo.executar(window.__EFFRAIM_DADOS_PROCESSO);
						console.log("[EFFRAIM] minuta.js executado com sucesso via interceptação.");
					} catch (e) {
						console.error("[EFFRAIM] Erro ao executar minuta.js via interceptação:", e);
					}
				};

				if (document.readyState === "complete" || document.readyState === "interactive") {
					acionar();
				} else {
					document.addEventListener("DOMContentLoaded", acionar, { once: true });
				}
			}
		} catch (e) {
			console.error("[EFFRAIM] Erro no hook de pushState:", e);
		}

		return originalPushState.apply(this, args);
	};
})();


(async () => {
	const origem_sisbajud = window.location.origin;
	console.log("SISBAJUD iniciado em:", origem_sisbajud);

	// escuta mensagens vindas do Eproc
	window.addEventListener("message", (evento) => {
		const mensagem = evento.data;
		const origem_remetente = evento.origin;
		if (!mensagem || mensagem.type !== "EFFRAIM_DADOS_PROCESSO") return;
		if (!origem_remetente.includes("eproc")) return;
		if (!mensagem.origem) return;

		console.log("Mensagem recebida do Eproc:", mensagem.origem);
		console.log("Dados do processo:", mensagem.dados);

		window.__EFFRAIM_DADOS_PROCESSO = mensagem.dados;
		console.log("window.__EFFRAIM_DADOS_PROCESSO atualizado.");
	});

	console.log("Inserindo aviso");
	const { inserir_aviso_effraim } = await import(
		chrome.runtime.getURL("modules/utils/interface.js")
	);
	inserir_aviso_effraim(
		"EFFRAIM NÃO GUARDA SEUS DADOS. " +
		"Ele detecta automaticamente os dados do processo e reutiliza."
	);

	console.log("URL atual: ", window.location.href);

	const { monitorarMudancaDeRota } = await import(
		chrome.runtime.getURL("funcoes.js")
	);

	console.log("Iniciando monitoramento v14");
	const dados = window.__EFFRAIM_DADOS_PROCESSO;
	console.log("Dados no iframe: ", dados);

	const rotas = {
		"https://sisbajud.cnj.jus.br/minuta/cadastrar": async (url) => {
			console.log("[EFFRAIM] Entrou em minuta/cadastrar:", url);
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/minuta_cadastrar.js")
			);
			await executar(dados);
		},

		"https://sisbajud.cnj.jus.br/minuta/": async (url) => {
			console.log("[EFFRAIM] Entrou em minuta:", url);
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/minuta.js")
			);
			await executar(dados);
		},

		"https://sisbajud.cnj.jus.br/ordem-judicial": async (url) => {
			console.log("[EFFRAIM] Entrou em ordem-judicial:", url);
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/ordem_judicial.js")
			);
			await executar(dados);
		},

		"https://sisbajud.cnj.jus.br/teimosinha": async (url) => {
			console.log("[EFFRAIM] Entrou em teimosinha:", url);
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/teimosinha.js")
			);
			await executar(dados);
		},
	};

	const parar = await monitorarMudancaDeRota(rotas);
	console.log("monitorarMudancaDeRota iniciado. Função de parar:", !!parar, "\nrota atual:", window.location.pathname );

	// Aciona imediatamente a rota atual (não depende apenas de mudanças)
	let rotaAcionada = false;
	for (const [rota, acao] of Object.entries(rotas)) {
		if (location.href.startsWith(rota)) {
			console.log("[EFFRAIM] Rota atual corresponde a:", rota, " — acionando módulo agora.");
			try {
				await acao(location.href);
				console.log("[EFFRAIM] Rota atual acionada com sucesso:", rota);
				rotaAcionada = true;
			} catch (e) {
				console.error("[EFFRAIM] Erro ao acionar rota atual:", rota, e);
			}
			break;
		}
	}
	if (!rotaAcionada) {
		const host = location.hostname;
		// Evita log de alerta em iframes de login do SSO, onde não há rota a ser executada.
		if (host && host.includes("sso.cloud.pje.jus.br")) {
			console.log("[EFFRAIM] Aguardando login do SSO (rota não aplicável neste host).");
		} else {
			console.warn("[EFFRAIM] Nenhuma rota acionada imediatamente para", location.href);
		}
	}

// Verificação direta e única após injeção do script
(async () => {
	try {
		const url = new URL(window.location.href);
		const norm = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
		console.log("[EFFRAIM] Verificando rota após carregamento:", norm);

		if (norm === "/minuta") {
			console.log("[EFFRAIM] Página atual é /minuta. Executando módulo imediatamente…");
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/minuta.js")
			);
			await executar(window.__EFFRAIM_DADOS_PROCESSO);
			console.log("[EFFRAIM] minuta.js executado após carregamento inicial.");
		} else if (norm === "/ordem-judicial") {
			console.log("[EFFRAIM] Página atual é /ordem-judicial. Executando módulo imediatamente…");
			const { executar } = await import(
				chrome.runtime.getURL("modules/juds/sisbajud/ordem_judicial.js")
			);
			await executar(window.__EFFRAIM_DADOS_PROCESSO);
			console.log("[EFFRAIM] ordem_judicial.js executado após carregamento inicial.");
		} else {
			// Fallback: espera um pouco e verifica de novo
			setTimeout(async () => {
				const norm2 = window.location.pathname.replace(/\/+$/, "");
				console.log("[EFFRAIM] Rechecando rota após atraso:", norm2);
				if (norm2 === "/minuta") {
					console.log("[EFFRAIM] Agora em /minuta. Executando módulo…");
					const { executar } = await import(
						chrome.runtime.getURL("modules/juds/sisbajud/minuta.js")
					);
					await executar(window.__EFFRAIM_DADOS_PROCESSO);
					console.log("[EFFRAIM] minuta.js executado após atraso.");
				} else if (norm2 === "/ordem-judicial") {
					console.log("[EFFRAIM] Agora em /ordem-judicial. Executando módulo…");
					const { executar } = await import(
						chrome.runtime.getURL("modules/juds/sisbajud/ordem_judicial.js")
					);
					await executar(window.__EFFRAIM_DADOS_PROCESSO);
					console.log("[EFFRAIM] ordem_judicial.js executado após atraso.");
				}
			}, 500);
		}
	} catch (e) {
		console.error("[EFFRAIM] Erro ao tentar executar minuta.js na carga inicial:", e);
	}
})();


})();
