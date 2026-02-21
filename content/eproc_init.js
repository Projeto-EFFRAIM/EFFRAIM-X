console.log("EFFRAIM iniciado. Importando módulo de configurações.");
const TUTORIAL_LOG_PREFIX = "[EFFRAIM tutorial_bootstrap]";

const effraimRuntime =
	globalThis?.chrome?.runtime ||
	globalThis?.parent?.chrome?.runtime ||
	null;

function getRuntimeUrl(path) {
	if (!effraimRuntime?.getURL) {
		throw new Error("EFFRAIM runtime indisponível (chrome.runtime.getURL).");
	}
	return effraimRuntime.getURL(path);
}

(async () => {
	if (!effraimRuntime?.getURL) {
		console.warn("EFFRAIM: runtime da extensão indisponível neste contexto.");
		return;
	}

	const tutorialParams = new URLSearchParams(window.location.search);
	const isTutorialRoute = tutorialParams.get("effraim_tutorial") === "1" || window.EFFRAIM_TUTORIAL_ROUTE === true;
	const tutorialTipo = (tutorialParams.get("tipo") || window.EFFRAIM_TUTORIAL_TIPO || "").toLowerCase();

	
	const { zerarConfiguracoes, carregarConfiguracoes, prepararDOM, verificarRotasAtivas, verificarUsoSync } = await import(getRuntimeUrl("funcoes.js"));
	//Comentar em produção! Zera para o padrão json
	//await zerarConfiguracoes();
	
	window.EFFRAIM_CONFIGURACOES = await carregarConfiguracoes();
	const effraim_configuracoes = window.EFFRAIM_CONFIGURACOES;
	console.log("Configurações carregadas:", effraim_configuracoes);
	console.log("Configurações na janela: ", window.EFFRAIM_CONFIGURACOES);
	
	await verificarUsoSync();  
	await prepararDOM();	

	const rotas = [
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/dados_processo_window.js",
			nome: "dados_processo_window",
			titulo: "Dados do Processo (Window)",
			ocultarNoPainel: true
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/consulta/consulta_flutuante.js",
			nome: "consulta_flutuante",
			titulo: "Consulta Flutuante"
		},
		{
			cond: () => window.location.href.includes("acao=painel_secretaria_listar") || (isTutorialRoute && tutorialTipo === "painel_inicial"),
			modulo: "modules/painel_inicial/painel_inicial_flutuante.js",
			nome: "painel_inicial_flutuante",
			titulo: "Painel Inicial Flutuante"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/consulta/consulta_requisitorio.js",
			nome: "requisitorio",
			titulo: "Requisitórios"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/consulta/consulta_sisbajud.js",
			nome: "sisbajud",
			titulo: "SISBAJUD"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/consulta/consulta_renajud.js",
			nome: "renajud",
			titulo: "RENAJUD"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar") || (isTutorialRoute && tutorialTipo === "consulta_processual"),
			modulo: "modules/consulta/acao_flutuante/index.js",
			nome: "acao_flutuante",
			titulo: "Ação Flutuante",
			ocultarNoPainel: true
		},
		{
			cond: () =>
				window.location.href.includes("acao=localizador_processos_lista") ||
				window.location.href.includes("acao=relatorio_geral") ||
				Boolean(document.querySelector("#tblProcessoLista, #tabelaNomAJG, #tabelaLocalizadores")),
			modulo: "modules/tabelas_compactas.js",
			nome: "tabelas_compactas",
			titulo: "Tabelas Compactas",
			ocultarNoPainel: true
		},
		{
			cond: () =>
				window.location.href.includes("acao=processo_selecionar") ||
				Boolean(document.querySelector("#fldPartes, #tblPartesERepresentantes")),
			modulo: "modules/lista_partes_aprimorada.js",
			nome: "lista_partes_aprimorada",
			titulo: "Lista de Partes Aprimorada",
			ocultarNoPainel: true
		},
		{
			cond: () =>
				window.location.href.includes("acao=localizador_processos_lista") ||
				window.location.href.includes("acao=relatorio_geral") ||
				Boolean(document.querySelector("#divPaginacao, #tblProcessoLista_length")),
			modulo: "modules/paginacao_aprimorada.js",
			nome: "paginacao_aprimorada",
			titulo: "Paginação Aprimorada",
			ocultarNoPainel: true
		}

	];
	console.log(`Rotas disponíveis: ${rotas}`);

	const rotasAtivas = isTutorialRoute
		? rotas.filter(r => r.cond())
		: verificarRotasAtivas(rotas, effraim_configuracoes);
	console.log(`Rotas ativas: ${rotasAtivas}`);
	if (rotasAtivas.length === 0) {
		console.log("Nenhuma rota ativa. Encerrando extensão.");
		console.log(`Rotas ativas: ${rotasAtivas}`);
		return;
	}

	const navbarContainer = document.querySelector("#navbar > div");
	if (navbarContainer && !document.querySelector("#effraim-controles")) {
		const esquerda = navbarContainer.children[0];
		const controles = document.createElement("div");
		controles.id = "effraim-controles";
		controles.className = "d-flex align-items-center mx-3";
		console.log("effraim-controles criada");

		// apenas a logo, sem botão
		controles.innerHTML = `
			<div id="effraim-logo-container" style="position: relative;">
				<img src="${getRuntimeUrl("assets/icones/icone32.png")}" 
					style="width:32px; height:32px;" 
					title="EFFRAIM">
			</div>
		`;
		
		navbarContainer.insertBefore(controles, esquerda.nextSibling);
		console.log("effraim-logo-container inserido");

		try {
			const { criarPainelHoverLogo } = await import(getRuntimeUrl("modules/utils/interface.js"));
  			const opcoes = effraim_configuracoes._interno.opções;
			criarPainelHoverLogo(opcoes);
  			console.log("Painel hover do logo criado.");

		} catch (e) {
			console.warn("Falha ao criar painel hover do logo:", e);
		}

		// ativa automaticamente as funcionalidades
		ativarFuncionalidades(rotasAtivas, { tutorial: isTutorialRoute });
		return;
	}

	// No modo tutorial, a estrutura da página salva pode não ter navbar completa.
	if (isTutorialRoute) {
		console.log("Modo tutorial ativo sem navbar padrão. Ativando funcionalidades diretamente.");
		ativarFuncionalidades(rotasAtivas, { tutorial: true });
	}
})();

window.addEventListener("message", async (event) => {
	if (event?.data?.tipo !== "EFFRAIM_START_TUTORIAL") return;
	const tutorialId = String(event?.data?.tutorialId || "").trim().toLowerCase();
	if (!tutorialId) return;
	console.info(`${TUTORIAL_LOG_PREFIX} Evento de inicio de tutorial recebido.`, {
		tutorialId,
		origem: event?.origin || "(sem origem)"
	});

	const mapa = {
		favoritos: "modules/tutorials/live_favoritos_tour.js",
		consulta_flutuante: "modules/tutorials/live_consulta_flutuante_tour.js",
		sisbajud: "modules/tutorials/live_sisbajud_tour.js",
		renajud: "modules/tutorials/live_renajud_tour.js",
		requisitorios: "modules/tutorials/live_requisitorios_tour.js",
		lista_partes_aprimorada: "modules/tutorials/live_lista_partes_aprimorada_tour.js"
	};
	const moduloPath = mapa[tutorialId];
	if (!moduloPath) {
		console.warn(`${TUTORIAL_LOG_PREFIX} Tutorial sem mapeamento.`, { tutorialId });
		return;
	}

	try {
		console.info(`${TUTORIAL_LOG_PREFIX} Importando modulo de tutorial...`, { tutorialId, moduloPath });
		const mod = await import(getRuntimeUrl(moduloPath));
		if (typeof mod?.iniciarTutorial === "function") {
			await mod.iniciarTutorial();
			console.info(`${TUTORIAL_LOG_PREFIX} Tutorial iniciado com sucesso.`, { tutorialId });
		} else {
			console.warn(`${TUTORIAL_LOG_PREFIX} Modulo nao expoe iniciarTutorial().`, { tutorialId, moduloPath });
		}
	} catch (e) {
		console.warn(`${TUTORIAL_LOG_PREFIX} Falha ao iniciar tutorial guiado:`, e);
	}
});

// Painel principal do botão EFFRAIM
async function ativarFuncionalidades(rotasAtivas, { tutorial = false } = {}) {
	console.log("Ativando funcionalidades:", rotasAtivas.map(r => r.nome));

	let infra =
		document.querySelector("#divInfraBarraLocalizacao") ||
		document.querySelector("#divInfraBarraComandosSuperior") ||
		document.querySelector("#navbar") ||
		document.body;

	if (tutorial) {
		let ancoraTutorial = document.getElementById("effraim-tutorial-anchor");
		if (!ancoraTutorial) {
			ancoraTutorial = document.createElement("div");
			ancoraTutorial.id = "effraim-tutorial-anchor";
			ancoraTutorial.style.cssText = `
				position: fixed;
				top: 12px;
				right: 12px;
				z-index: 2147482000;
				background: rgba(255,255,255,0.96);
				border: 1px solid #9bc4cf;
				border-radius: 10px;
				padding: 6px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.2);
			`;
			document.body.appendChild(ancoraTutorial);
		}
		infra = ancoraTutorial;
	}

	if (!infra) {
		console.warn("Elemento âncora para painel EFFRAIM não encontrado. Abortando ativação.");
		return;
	}

	const { criarContainer } = await import(getRuntimeUrl("modules/utils/interface.js"));
	const [painel, conteudo] = criarContainer("effraim-funcionalidades-container", infra, "EFFRAIM");
	//remove o botão de fechar
	painel.querySelector(".effraim-botao-fechar")?.remove();
	if (tutorial) {
		infra.appendChild(painel);
	} else {
		infra.insertAdjacentElement("afterend", painel);
	}
	painel.classList.add("effraim-funcionalidades-container");


	for (const r of rotasAtivas) {
		try {
			console.log(`Importando módulo ${r.modulo}...`);
			const mod = await import(getRuntimeUrl(r.modulo));
			console.log(`Módulo ${r.nome} importado.`);
			if (!r.ocultarNoPainel) {
				const botao = document.createElement("button");
				botao.id = `btn-${r.nome}`;
				console.log(`Botão ${botao.id} criado`);
				botao.className = "btn btn-sm btn-outline-primary d-flex flex-column align-items-center effraim-btn-init";
				botao.title = r.titulo || r.nome;
				botao.innerHTML = `
					<img src="${getRuntimeUrl("assets/icones/" + r.nome + ".png")}"
						 style="width:32px; height:32px;">
				`;
				console.log(`Ativando módulo: ${r.nome}`);
				conteudo.appendChild(botao);
				console.log(`Botão ${r.nome} adicionado.`);
			} else {
				console.log(`Módulo ${r.nome} configurado para iniciar sem botão no painel.`);
			}
			try {
					await mod.init();
					console.log(`Módulo ${r.nome} iniciado.`);
				} catch (e) {
					console.warn(`Erro ao iniciar módulo ${r.nome}:`, e);
				}
		} catch (e) {
			console.warn(`Falha ao importar módulo ${r.modulo}:`, e);
		}
	}
}

