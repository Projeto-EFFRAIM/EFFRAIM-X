console.log("EFFRAIM iniciado. Importando módulo de configurações.");

(async () => {
	
	const { zerarConfiguracoes, carregarConfiguracoes, prepararDOM, verificarRotasAtivas, verificarUsoSync } = await import(chrome.runtime.getURL("funcoes.js"));
	//Comentar em produção! Zera para o padrão json
	await zerarConfiguracoes();
	
	window.EFFRAIM_CONFIGURACOES = await carregarConfiguracoes();
	const effraim_configuracoes = window.EFFRAIM_CONFIGURACOES;
	console.log("Configurações carregadas:", effraim_configuracoes);
	console.log("Configurações na janela: ", window.EFFRAIM_CONFIGURACOES);
	
	await verificarUsoSync();  
	await prepararDOM();	

	const rotas = [
		{
			cond: () => window.location.href.includes("acao=processo_selecionar"),
			modulo: "modules/consulta/consulta_flutuante.js",
			nome: "consulta_flutuante",
			titulo: "Consulta Flutuante"
		},
		{
			cond: () => window.location.href.includes("acao=painel_secretaria_listar"),
			modulo: "modules/painel_inicial/painel_inicial_flutuante.js",
			nome: "painel_inicial_flutuante",
			titulo: "Painel Inicial Flutuante"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar"),
			modulo: "modules/consulta/consulta_sisbajud.js",
			nome: "sisbajud",
			titulo: "SISBAJUD"
		},
		{
			cond: () => window.location.href.includes("acao=processo_selecionar"),
			modulo: "modules/consulta/consulta_renajud.js",
			nome: "renajud",
			titulo: "RENAJUD"
		}

	];
	console.log(`Rotas disponíveis: ${rotas}`);

	const rotasAtivas = verificarRotasAtivas(rotas, effraim_configuracoes);
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
				<img src="${chrome.runtime.getURL("assets/icones/icone32.png")}" 
					style="width:32px; height:32px;" 
					title="EFFRAIM">
			</div>
		`;
		
		navbarContainer.insertBefore(controles, esquerda.nextSibling);
		console.log("effraim-logo-container inserido");

		try {
			const { criarPainelHoverLogo } = await import(chrome.runtime.getURL("modules/utils/interface.js"));
  			const opcoes = effraim_configuracoes._interno.opções;
			criarPainelHoverLogo(opcoes);
  			console.log("Painel hover do logo criado.");

		} catch (e) {
			console.warn("Falha ao criar painel hover do logo:", e);
		}

		// ativa automaticamente as funcionalidades
		ativarFuncionalidades(rotasAtivas);
	}
})();

// Painel principal do botão EFFRAIM
async function ativarFuncionalidades(rotasAtivas) {
	console.log("Ativando funcionalidades:", rotasAtivas.map(r => r.nome));

	const infra = document.querySelector("#divInfraBarraLocalizacao");
	if (!infra) {
		console.warn("Elemento #divInfraBarraLocalizacao não encontrado. Abortando ativação.");
		return;
	}

	const { criarContainer } = await import(chrome.runtime.getURL("modules/utils/interface.js"));
	const [painel, conteudo] = criarContainer("effraim-funcionalidades-container", infra, "EFFRAIM");
	//remove o botão de fechar
	painel.querySelector(".effraim-botao-fechar")?.remove();
	infra.insertAdjacentElement("afterend", painel);
	painel.classList.add("effraim-funcionalidades-container");


	for (const r of rotasAtivas) {
		try {
			console.log(`Importando módulo ${r.modulo}...`);
			const mod = await import(chrome.runtime.getURL(r.modulo));
			console.log(`Módulo ${r.nome} importado.`);
			const botao = document.createElement("button");
			botao.id = `btn-${r.nome}`;
			console.log(`Botão ${botao.id} criado`);
			botao.className = "btn btn-sm btn-outline-primary d-flex flex-column align-items-center effraim-btn-init";
			botao.title = r.titulo || r.nome;
			botao.innerHTML = `
				<img src="${chrome.runtime.getURL("assets/icones/" + r.nome + ".png")}"
					 style="width:32px; height:32px;">
			`;
			console.log(`Ativando módulo: ${r.nome}`);
			conteudo.appendChild(botao);
			console.log(`Botão ${r.nome} adicionado.`);
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
