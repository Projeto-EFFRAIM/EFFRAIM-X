const LOG_PREFIX = "[EFFRAIM acao_flutuante][enviar_email]";
const ID_ESTILO = "effraim-textos-padrao-email-estilo";
const ID_BOTAO = "effraim-btn-texto-padrao-email";
const ID_MENU = "effraim-menu-texto-padrao-email";
const LIMITE_TEXTOS = 15;
const LIMITE_PALAVRAS = 150;
const CAMINHO_CFG = ["opcoes_acao_flutuante", "enviar_email_flutuante", "textos_padrao_email"];
const CAMINHO_LEGADO = ["opcoes_acao_flutuante", "textos_padrao_email"];

function logInfo(mensagem, dados) {
	if (dados !== undefined) {
		console.info(`${LOG_PREFIX} ${mensagem}`, dados);
		return;
	}
	console.info(`${LOG_PREFIX} ${mensagem}`);
}

function contarPalavras(texto = "") {
	const limpo = String(texto).replace(/\s+/g, " ").trim();
	return limpo ? limpo.split(" ").length : 0;
}

function normalizarLista(lista) {
	const base = Array.isArray(lista) ? lista : [];
	return base
		.map((item) => String(item || "").replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.filter((item) => contarPalavras(item) <= LIMITE_PALAVRAS)
		.slice(0, LIMITE_TEXTOS);
}

async function lerConfiguracoes() {
	return new Promise((resolve) => {
		chrome.storage.sync.get("effraim_configuracoes", (dados) => {
			resolve(dados?.effraim_configuracoes || {});
		});
	});
}

async function obterTextosPadrao() {
	const cfg = await lerConfiguracoes();
	const listaNova = cfg?.[CAMINHO_CFG[0]]?.[CAMINHO_CFG[1]]?.[CAMINHO_CFG[2]]?.valor;
	const listaLegada = cfg?.[CAMINHO_LEGADO[0]]?.[CAMINHO_LEGADO[1]]?.valor;
	const lista = Array.isArray(listaNova) && listaNova.length ? listaNova : listaLegada;
	return normalizarLista(lista);
}

async function salvarTextosPadrao(lista) {
	const cfg = await lerConfiguracoes();
	delete cfg.painel_favoritos;
	if (!cfg[CAMINHO_CFG[0]]) cfg[CAMINHO_CFG[0]] = {};
	if (!cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]]) {
		cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]] = {};
	}
	if (!cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]][CAMINHO_CFG[2]]) {
		cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]][CAMINHO_CFG[2]] = { valor: [], _meta: {} };
	}
	cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]][CAMINHO_CFG[2]].valor = normalizarLista(lista);
	await new Promise((resolve) => {
		chrome.storage.sync.set({ effraim_configuracoes: cfg }, resolve);
	});
	return cfg[CAMINHO_CFG[0]][CAMINHO_CFG[1]][CAMINHO_CFG[2]].valor;
}

async function migrarConfiguracaoLegadaSeNecessario() {
	const cfg = await lerConfiguracoes();
	const listaNova = cfg?.[CAMINHO_CFG[0]]?.[CAMINHO_CFG[1]]?.[CAMINHO_CFG[2]]?.valor;
	if (Array.isArray(listaNova) && listaNova.length) return;
	const listaLegada = cfg?.[CAMINHO_LEGADO[0]]?.[CAMINHO_LEGADO[1]]?.valor;
	if (!Array.isArray(listaLegada) || !listaLegada.length) return;
	await salvarTextosPadrao(listaLegada);
	logInfo("Configuracao legada migrada para subcaixa enviar_email_flutuante.");
}

function inserirTextoNoCampo(textarea, texto) {
	const atual = String(textarea.value || "").trim();
	const novoTexto = String(texto || "").trim();
	if (!novoTexto) return;
	textarea.value = atual ? `${atual}\n\n${novoTexto}` : novoTexto;
	textarea.dispatchEvent(new Event("input", { bubbles: true }));
	textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function garantirEstilo(documento) {
	if (documento.getElementById(ID_ESTILO)) return;
	const estilo = documento.createElement("style");
	estilo.id = ID_ESTILO;
	estilo.textContent = `
		#${ID_BOTAO} {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 22px;
			height: 22px;
			margin-left: 6px;
			border: 1px solid #9bb6c7;
			border-radius: 4px;
			background: #fff;
			cursor: pointer;
			vertical-align: middle;
		}
		#${ID_BOTAO}:hover {
			background: #f2f8fc;
		}
		#${ID_BOTAO} img {
			width: 14px;
			height: 14px;
		}
		#${ID_MENU} {
			position: absolute;
			z-index: 2147482000;
			min-width: 360px;
			max-width: 520px;
			max-height: 360px;
			overflow: auto;
			background: #fff;
			border: 1px solid #9bb6c7;
			border-radius: 8px;
			box-shadow: 0 6px 20px rgba(0,0,0,0.18);
			padding: 8px;
			display: none;
			font-size: 12px;
		}
		.effraim-email-texto-item {
			border: 1px solid #d8e5ee;
			border-radius: 6px;
			padding: 6px;
			margin-bottom: 6px;
			background: #f9fcff;
			display: flex;
			gap: 8px;
			align-items: flex-start;
		}
		.effraim-email-texto-item p {
			margin: 0 0 6px 0;
			white-space: pre-wrap;
		}
		.effraim-email-texto-conteudo {
			flex: 1;
			cursor: pointer;
			padding: 2px;
			border-radius: 4px;
		}
		.effraim-email-texto-conteudo:hover {
			background: #eef6fb;
		}
		.effraim-email-texto-btn {
			border: 1px solid #9bb6c7;
			background: #fff;
			border-radius: 4px;
			padding: 2px 6px;
			cursor: pointer;
			font-size: 12px;
		}
		.effraim-email-texto-btn-lixeira {
			width: 24px;
			height: 24px;
			border: 1px solid #d9a4a4;
			background: #fff;
			border-radius: 4px;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 0;
			flex: 0 0 auto;
		}
		.effraim-email-texto-btn-lixeira img {
			width: 14px;
			height: 14px;
		}
		.effraim-email-texto-topo {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
			font-weight: 600;
		}
	`;
	(documento.head || documento.documentElement).appendChild(estilo);
}

function posicionarMenu(documento, botao, menu) {
	const rect = botao.getBoundingClientRect();
	const top = rect.bottom + 6 + (documento.defaultView?.scrollY || 0);
	const left = rect.left + (documento.defaultView?.scrollX || 0);
	menu.style.top = `${Math.round(top)}px`;
	menu.style.left = `${Math.round(left)}px`;
}

function criarTextoNovo() {
	return window.prompt(
		`Digite o novo texto padrão (máximo ${LIMITE_PALAVRAS} palavras):`,
		""
	);
}

async function abrirMenu({ documento, textarea, botao, menu, atualizarStatus }) {
	const textos = await obterTextosPadrao();
	menu.innerHTML = "";

	const topo = documento.createElement("div");
	topo.className = "effraim-email-texto-topo";
	topo.textContent = `Textos padrão (${textos.length}/${LIMITE_TEXTOS})`;
	menu.appendChild(topo);

	const botaoNovo = documento.createElement("button");
	botaoNovo.type = "button";
	botaoNovo.className = "effraim-email-texto-btn";
	botaoNovo.textContent = "+ Novo texto padrão";
	botaoNovo.addEventListener("click", async () => {
		const novo = String(criarTextoNovo() || "").trim();
		if (!novo) return;

		if (textos.length >= LIMITE_TEXTOS) {
			alert(`Limite atingido: no máximo ${LIMITE_TEXTOS} textos padrão.`);
			return;
		}

		const qtdPalavras = contarPalavras(novo);
		if (qtdPalavras > LIMITE_PALAVRAS) {
			alert(`Texto excede o limite de ${LIMITE_PALAVRAS} palavras (${qtdPalavras}).`);
			return;
		}

		textos.push(novo);
		await salvarTextosPadrao(textos);
		inserirTextoNoCampo(textarea, novo);
		atualizarStatus?.(`Texto padrão criado e inserido na mensagem.`, "ok");
		await abrirMenu({ documento, textarea, botao, menu, atualizarStatus });
	});
	menu.appendChild(botaoNovo);

	if (!textos.length) {
		const vazio = documento.createElement("p");
		vazio.textContent = "Nenhum texto padrão salvo.";
		vazio.style.margin = "8px 0 0 0";
		menu.appendChild(vazio);
	} else {
		textos.forEach((texto, indice) => {
			const item = documento.createElement("div");
			item.className = "effraim-email-texto-item";

			const conteudo = documento.createElement("div");
			conteudo.className = "effraim-email-texto-conteudo";
			conteudo.title = "Clique para inserir este texto na mensagem";

			const pre = documento.createElement("p");
			pre.textContent = texto;
			pre.style.margin = "0";
			conteudo.appendChild(pre);
			item.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				logInfo("Texto padrao selecionado para insercao.", { indice });
				inserirTextoNoCampo(textarea, texto);
				atualizarStatus?.("Texto padrão inserido na mensagem.", "ok");
				menu.style.display = "none";
			});

			const btnExcluir = documento.createElement("button");
			btnExcluir.type = "button";
			btnExcluir.className = "effraim-email-texto-btn-lixeira";
			btnExcluir.title = "Excluir texto padrão";
			btnExcluir.setAttribute("aria-label", "Excluir texto padrão");
			const iconeLixeira = documento.createElement("img");
			iconeLixeira.src = chrome.runtime.getURL("assets/icones/excluir.png");
			iconeLixeira.alt = "Excluir";
			btnExcluir.appendChild(iconeLixeira);
			btnExcluir.addEventListener("click", async (event) => {
				event.preventDefault();
				event.stopPropagation();
				const confirmarFn = documento.defaultView?.confirm || window.confirm;
				const confirmar = confirmarFn(
					"Deseja excluir este texto padrão?"
				);
				if (!confirmar) return;
				textos.splice(indice, 1);
				await salvarTextosPadrao(textos);
				await abrirMenu({ documento, textarea, botao, menu, atualizarStatus });
			});

			item.append(conteudo, btnExcluir);
			menu.appendChild(item);
		});
	}

	posicionarMenu(documento, botao, menu);
	menu.style.display = "block";
}

function registrarFechamentoAoClicarFora(documento, botao, menu) {
	if (documento.__effraimEmailFecharMenuRegistrado) return;
	documento.addEventListener("mousedown", (event) => {
		if (menu.style.display !== "block") return;
		const alvo = event.target;
		if (menu.contains(alvo) || botao.contains(alvo)) return;
		menu.style.display = "none";
	});
	documento.__effraimEmailFecharMenuRegistrado = true;
}

async function injetarTextosPadrao({ documento, atualizarStatus }) {
	await migrarConfiguracaoLegadaSeNecessario();
	const label = documento.getElementById("lblMensagem");
	const textarea = documento.getElementById("txaMensagem");
	if (!label || !textarea) {
		logInfo("Label/textarea de mensagem nao encontrados no formulario de email.");
		return;
	}

	if (documento.getElementById(ID_BOTAO)) {
		logInfo("Botao de texto padrao ja injetado neste documento.");
		return;
	}

	garantirEstilo(documento);

	const botao = documento.createElement("button");
	botao.id = ID_BOTAO;
	botao.type = "button";
	botao.title = "Textos padrão da mensagem";
	botao.setAttribute("aria-label", "Textos padrão da mensagem");

	const icone = documento.createElement("img");
	icone.src = chrome.runtime.getURL("assets/icones/adicionartextopadrao.png");
	icone.alt = "Adicionar texto padrão";
	botao.appendChild(icone);

	const menu = documento.createElement("div");
	menu.id = ID_MENU;

	botao.addEventListener("click", async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (menu.style.display === "block") {
			menu.style.display = "none";
			return;
		}
		await abrirMenu({ documento, textarea, botao, menu, atualizarStatus });
	});

	label.insertAdjacentElement("afterend", botao);
	(documento.body || documento.documentElement).appendChild(menu);
	registrarFechamentoAoClicarFora(documento, botao, menu);
	logInfo("Botao de textos padrao injetado ao lado da label Mensagem.");
}

export function criarManipulador() {
	return {
		id: "processo_enviar_email_listar",
		titulo: "Enviar Email",
		transformarUrl({ url }) {
			return url;
		},
		async aoCarregarIframe({ documento, atualizarStatus }) {
			await injetarTextosPadrao({ documento, atualizarStatus });
		}
	};
}
