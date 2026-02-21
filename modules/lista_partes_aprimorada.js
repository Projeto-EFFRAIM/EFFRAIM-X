const LOG_PREFIXO = "[EFFRAIM lista_partes_aprimorada]";
const CSS_ID = "effraim-lista-partes-aprimorada-css";
const AVISO_ID = "effraim-lista-partes-aprimorada-aviso";
const EVENTO_LISTA_PARTES_PRONTA = "EFFRAIM_LISTA_PARTES_PRONTA";
const SCROLL_TABELA_CLASS = "effraim-lista-partes-scroll-tabela";
const ALTURA_PADRAO = 150;
const TIMEOUT_CARGA_MS = 5000;
const BRIDGE_SCRIPT_ID = "effraim-lista-partes-bridge-script";
const BRIDGE_EVENTO_CARREGAR = "EFFRAIM_PARTES_CARREGAR";
const BRIDGE_EVENTO_RESULTADO = "EFFRAIM_PARTES_CARREGAR_RESULT";
const BRIDGE_EVENTO_CANCELAR = "EFFRAIM_PARTES_CANCELAR";
const BRIDGE_EVENTO_CONTINUAR = "EFFRAIM_PARTES_CONTINUAR";

let observador = null;
let pausado = false;
let timeoutAplicacao = null;
let canceladoPeloUsuario = false;
let carregamentoAtivo = false;
let bridgePronto = false;
let bridgePromessa = null;
let bridgeRequestSeq = 0;

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

function logWarn(mensagem, dados) {
	if (dados !== undefined) console.warn(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.warn(`${LOG_PREFIXO} ${mensagem}`);
}

function obterAlturaMaximaColapsavel() {
	const opcoes = window?.EFFRAIM_CONFIGURACOES?.opcoes_lista_partes_aprimorada;
	const valor =
		opcoes?.altura_maxima_tabela?.valor ??
		opcoes?.altura_maxima_colapsavel?.valor;
	const numero = Number(valor);
	if (!Number.isFinite(numero) || numero <= 0) return ALTURA_PADRAO;
	return Math.min(Math.round(numero), 1000);
}

function aplicarVariavelAltura() {
	const altura = obterAlturaMaximaColapsavel();
	document.documentElement.style.setProperty("--effraim-lista-partes-max-height", `${altura}px`);
	logInfo("Altura máxima da tabela aplicada.", { alturaPx: altura });
}

function garantirScrollNaTabela() {
	const tabela = obterTabelaPartes();
	if (!tabela || !tabela.parentNode) return;
	const pai = tabela.parentNode;

	if (pai instanceof HTMLElement && pai.classList.contains(SCROLL_TABELA_CLASS)) {
		logInfo("Wrapper de scroll da tabela já existente.");
		return;
	}

	const wrapper = document.createElement("div");
	wrapper.className = SCROLL_TABELA_CLASS;
	pai.insertBefore(wrapper, tabela);
	wrapper.appendChild(tabela);
	logInfo("Wrapper de scroll da tabela criado.");
}

function garantirCss() {
	if (document.getElementById(CSS_ID)) return;
	const link = document.createElement("link");
	link.id = CSS_ID;
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/lista_partes_aprimorada.css");
	(document.head || document.documentElement).appendChild(link);
}

function obterFieldsetPartes() {
	return document.getElementById("fldPartes");
}

function obterTabelaPartes() {
	return document.getElementById("tblPartesERepresentantes");
}

function garantirAviso() {
	const fieldset = obterFieldsetPartes();
	if (!fieldset) return;
	if (document.getElementById(AVISO_ID)) return;
	const aviso = document.createElement("div");
	aviso.id = AVISO_ID;
	aviso.className = "effraim-lista-partes-aviso";

	const logo = document.createElement("img");
	logo.className = "effraim-lista-partes-aviso-logo";
	logo.src = chrome.runtime.getURL("assets/icones/icone32.png");
	logo.alt = "EFFRAIM";

	const texto = document.createElement("span");
	texto.textContent = "Você está usando a Lista de Partes aprimorada. Caso deseje desativar, vá em configurações.";
	aviso.append(logo, texto);

	const tabela = obterTabelaPartes();
	if (tabela && tabela.parentNode) tabela.parentNode.insertBefore(aviso, tabela);
}

function obterLinksCarregarOutros() {
	const fieldset = obterFieldsetPartes();
	if (!fieldset) return [];
	return [...fieldset.querySelectorAll("span[id^='carregarOutros'] a[href*='carregarPartes(']")];
}

function extrairArgsCarregarPartes(href = "") {
	const match = href.match(/carregarPartes\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/i);
	if (!match) return null;
	return [match[1], match[2], match[3]];
}

function identificarTipoPorSpan(link) {
	const span = link?.closest?.("span[id^='carregarOutros']");
	const id = span?.id || "";
	const sufixo = id.replace(/^carregarOutros/i, "").trim().toUpperCase();
	if (!sufixo) return "DESCONHECIDO";
	if (sufixo === "A") return "AUTOR";
	if (sufixo === "R") return "REU";
	return sufixo;
}

function garantirBridgeCarregarPartes() {
	if (bridgePronto) return Promise.resolve();
	if (bridgePromessa) return bridgePromessa;

	bridgePromessa = new Promise((resolve) => {
		if (document.getElementById(BRIDGE_SCRIPT_ID)) {
			bridgePronto = true;
			logInfo("Bridge de partes já presente.");
			resolve();
			return;
		}
		const script = document.createElement("script");
		script.id = BRIDGE_SCRIPT_ID;
		script.src = chrome.runtime.getURL("modules/lista_partes_aprimorada_bridge.js");
		script.onload = () => {
			bridgePronto = true;
			logInfo("Bridge de partes carregado.");
			script.remove();
			resolve();
		};
		script.onerror = (e) => {
			logWarn("Falha ao carregar bridge de partes.", e);
			resolve();
		};
		(document.documentElement || document.head || document.body).appendChild(script);
	});

	return bridgePromessa;
}

function dispararEventoBridge(nome, detail = {}) {
	window.dispatchEvent(new CustomEvent(nome, { detail }));
}

function solicitarCarregarPartesBridge(args, tipo) {
	return new Promise((resolve) => {
		const requestId = `req_${Date.now()}_${++bridgeRequestSeq}`;
		const timeout = setTimeout(() => {
			window.removeEventListener(BRIDGE_EVENTO_RESULTADO, onResult);
			logWarn("Bridge não retornou a tempo.", { tipo, requestId, timeoutMs: 900 });
			resolve({ ok: false, origem: "bridge_timeout" });
		}, 900);

		function onResult(ev) {
			const detail = ev?.detail || {};
			if (detail.requestId !== requestId) return;
			clearTimeout(timeout);
			window.removeEventListener(BRIDGE_EVENTO_RESULTADO, onResult);
			resolve({
				ok: Boolean(detail.ok),
				origem: "bridge",
				erro: detail.erro || null
			});
		}

		window.addEventListener(BRIDGE_EVENTO_RESULTADO, onResult);
		dispararEventoBridge(BRIDGE_EVENTO_CARREGAR, { requestId, args, tipo });
	});
}

async function aguardar(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarMudancaOuTimeout(timeoutMs = 900) {
	return new Promise((resolve) => {
		let resolvido = false;
		const fim = () => {
			if (resolvido) return;
			resolvido = true;
			obs.disconnect();
			clearTimeout(timer);
			resolve();
		};
		const obs = new MutationObserver(() => fim());
		obs.observe(document.body, { childList: true, subtree: true });
		const timer = setTimeout(fim, timeoutMs);
	});
}

function existeIndicadorCarregandoPartes() {
	const fieldset = obterFieldsetPartes();
	if (!fieldset) return false;
	const imgs = [...fieldset.querySelectorAll("img[src*='aguarde']")];
	return imgs.some((img) => {
		const estilo = window.getComputedStyle(img);
		return estilo.display !== "none" && estilo.visibility !== "hidden" && Number(estilo.opacity || "1") > 0;
	});
}

async function dispararCarregarOutros(link, tipo) {
	const href = link?.getAttribute?.("href") || "";
	const args = extrairArgsCarregarPartes(href);

	if (args) {
		const resposta = await solicitarCarregarPartesBridge(args, tipo);
		logInfo("Tentativa 1: bridge carregarPartes.", {
			tipo,
			origem: resposta.origem,
			ok: resposta.ok,
			erro: resposta.erro || null,
			idProcesso: args[0],
			idPessoa: args[1],
			siglaTipo: args[2]
		});
		if (resposta.ok) {
			return "bridge_carregarPartes";
		}
	}

	try {
		link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
		logInfo("Tentativa 2: dispatchEvent(click).", {
			tipo,
			href
		});
		return "dispatch_click";
	} catch (e) {
		logWarn("Tentativa 2 falhou.", { tipo, erro: e });
	}

	try {
		link.click();
		logInfo("Tentativa 3: link.click().", {
			tipo,
			href
		});
		return "click";
	} catch (e) {
		logWarn("Tentativa 3 falhou.", { tipo, erro: e });
	}

	if (args) {
		try {
			logInfo("Tentativa 4: chamada direta window.carregarPartes.", {
				tipo,
				idProcesso: args[0],
				idPessoa: args[1],
				siglaTipo: args[2]
			});
			window.carregarPartes(...args);
			return "window.carregarPartes";
		} catch (e) {
			logWarn("Tentativa 4 falhou.", { tipo, erro: e });
		}
	}

	return "nenhuma";
}

async function expandirPartesOcultas() {
	canceladoPeloUsuario = false;
	await garantirBridgeCarregarPartes();
	dispararEventoBridge(BRIDGE_EVENTO_CONTINUAR);
	carregamentoAtivo = true;
	logInfo("Iniciando expansão automática de partes ocultas.");

	let inicioJanela = Date.now();
	let tentativasSemMudanca = 0;
	let ciclo = 0;
	while (!canceladoPeloUsuario) {
		ciclo += 1;
		const links = obterLinksCarregarOutros();
		if (!links.length) break;
		logInfo("Ciclo de expansão detectado.", { ciclo, linksPendentes: links.length });

		let houveMudancaNoCiclo = false;
		for (const link of links) {
			if (canceladoPeloUsuario) break;
			const href = link.getAttribute("href") || "";
			if (!href.includes("carregarPartes(")) continue;
			const tipo = identificarTipoPorSpan(link);
			const qtdAntes = obterLinksCarregarOutros().length;
			const disparo = await dispararCarregarOutros(link, tipo);
			await aguardarMudancaOuTimeout(700);
			const qtdDepois = obterLinksCarregarOutros().length;
			logInfo("Retorno de tentativa de expansão.", {
				tipo,
				disparo,
				href,
				linksAntes: qtdAntes,
				linksDepois: qtdDepois,
				carregando: existeIndicadorCarregandoPartes()
			});
			if (qtdDepois !== qtdAntes || existeIndicadorCarregandoPartes()) houveMudancaNoCiclo = true;
		}

		tentativasSemMudanca = houveMudancaNoCiclo ? 0 : tentativasSemMudanca + 1;
		if (tentativasSemMudanca >= 2 && !existeIndicadorCarregandoPartes()) {
			logWarn("Sem mudança após disparo de carregarPartes; encerrando tentativa automática.", {
				ciclo,
				tentativasSemMudanca
			});
			break;
		}

		if (Date.now() - inicioJanela > TIMEOUT_CARGA_MS) {
			logWarn("Timeout de expansão atingido.", {
				timeoutMs: TIMEOUT_CARGA_MS,
				ciclo,
				linksPendentes: obterLinksCarregarOutros().length
			});
			const continuar = window.confirm(
				"As partes estão demorando para carregar. Deseja continuar esperando?\n\n" +
				"Escolha Cancelar para encerrar o carregamento."
			);
			if (!continuar) {
				canceladoPeloUsuario = true;
				dispararEventoBridge(BRIDGE_EVENTO_CANCELAR);
				logWarn("Carregamento de partes encerrado pelo usuário.");
				break;
			}
			logInfo("Usuário escolheu continuar aguardando carregamento.");
			inicioJanela = Date.now();
		}

		await aguardar(120);
	}

	carregamentoAtivo = false;
	logInfo("Expansão automática finalizada.", {
		canceladoPeloUsuario,
		linksRestantes: obterLinksCarregarOutros().length
	});
}

function criarColapsavel(htmlExcedente, rotuloGrupo) {
	const wrapper = document.createElement("div");
	wrapper.className = "effraim-lista-partes-colapsavel";
	wrapper.dataset.expandido = "0";
	const rotulo = (rotuloGrupo || "partes").replace(/\s+/g, " ").trim();
	const textoAbrir = `▸ Abrir demais ${rotulo}`;
	const textoFechar = `▾ Fechar demais ${rotulo}`;

	const linha = document.createElement("div");
	linha.className = "effraim-lista-partes-linha";

	const botao = document.createElement("button");
	botao.type = "button";
	botao.className = "effraim-lista-partes-toggle";
	botao.textContent = textoAbrir;
	botao.setAttribute("aria-expanded", "false");
	botao.title = textoAbrir;

	const conteudo = document.createElement("div");
	conteudo.className = "effraim-lista-partes-conteudo";
	conteudo.innerHTML = htmlExcedente;
	conteudo.hidden = true;
	conteudo.setAttribute("aria-hidden", "true");

	botao.addEventListener("click", () => {
		const aberto = wrapper.dataset.expandido === "1";
		wrapper.dataset.expandido = aberto ? "0" : "1";
		conteudo.hidden = aberto;
		conteudo.setAttribute("aria-hidden", aberto ? "true" : "false");
		botao.textContent = aberto ? textoAbrir : textoFechar;
		botao.setAttribute("aria-expanded", aberto ? "false" : "true");
		botao.title = aberto ? textoAbrir : textoFechar;
	});

	linha.append(botao, conteudo);
	wrapper.appendChild(linha);
	return wrapper;
}

function aplicarLargurasColunasTabelaInterna(tabelaInterna, cabecalho, primeiraLinha, qtdColunas, descricaoGrupo) {
	if (!tabelaInterna || qtdColunas <= 1) return;
	const referenciaCabecalho = [...cabecalho.querySelectorAll("th")];
	const referenciaLinha = [...primeiraLinha.querySelectorAll("td, th")];
	const referencia = referenciaCabecalho.length ? referenciaCabecalho : referenciaLinha;
	if (!referencia.length) return;

	const colgroup = document.createElement("colgroup");
	const larguras = [];
	for (let i = 0; i < qtdColunas; i += 1) {
		const col = document.createElement("col");
		const el = referencia[i];
		const largura = el ? Math.max(20, Math.round(el.getBoundingClientRect().width)) : 0;
		if (largura > 0) {
			col.style.width = `${largura}px`;
			larguras.push(largura);
		}
		colgroup.appendChild(col);
	}
	tabelaInterna.insertBefore(colgroup, tabelaInterna.firstChild);
	tabelaInterna.style.tableLayout = "fixed";
	logInfo("Larguras de colunas aplicadas na tabela interna.", {
		grupo: descricaoGrupo,
		qtdColunas,
		largurasPx: larguras
	});
}

function ehLinhaCabecalhoGrupo(tr) {
	return Boolean(tr.querySelector("th"));
}

function obterGruposDeLinhas(tbody) {
	const linhas = [...tbody.querySelectorAll(":scope > tr")];
	const grupos = [];
	let i = 0;
	while (i < linhas.length) {
		const linha = linhas[i];
		if (!ehLinhaCabecalhoGrupo(linha)) {
			i += 1;
			continue;
		}
		const cabecalho = linha;
		const dados = [];
		let j = i + 1;
		while (j < linhas.length && !ehLinhaCabecalhoGrupo(linhas[j])) {
			dados.push(linhas[j]);
			j += 1;
		}
		grupos.push({ cabecalho, dados });
		i = j;
	}
	return grupos;
}

function descreverGrupo(grupo) {
	const ths = [...(grupo?.cabecalho?.querySelectorAll("th") || [])]
		.map((th) => (th.textContent || "").replace(/\s+/g, " ").trim())
		.filter(Boolean);
	return ths.length ? ths.join(" | ") : "Grupo sem título";
}

function compactarGrupo(tbody, grupo) {
	const { cabecalho, dados } = grupo;
	if (!dados || dados.length <= 1) return false;
	if (cabecalho.dataset.effraimGrupoPartesAplicado === "1") return false;
	const descricao = descreverGrupo(grupo);

	const primeiraLinha = dados[0];
	const excedentes = dados.slice(1);
	if (!excedentes.length) return false;

	const tabelaInterna = document.createElement("table");
	tabelaInterna.className = "infraTable effraim-lista-partes-tabela-interna";
	tabelaInterna.style.width = "100%";
	const tbodyInterno = document.createElement("tbody");
	excedentes.forEach((linha) => tbodyInterno.appendChild(linha.cloneNode(true)));
	tabelaInterna.appendChild(tbodyInterno);

	const linhaColapsavel = document.createElement("tr");
	linhaColapsavel.className = "infraTrClara";
	linhaColapsavel.dataset.effraimLinhaColapsavel = "1";
	const tdColapsavel = document.createElement("td");
	const qtdColunas = cabecalho.querySelectorAll("th").length || primeiraLinha.querySelectorAll("td").length || 2;
	aplicarLargurasColunasTabelaInterna(tabelaInterna, cabecalho, primeiraLinha, qtdColunas, descricao);
	tdColapsavel.colSpan = qtdColunas;
	tdColapsavel.appendChild(criarColapsavel(tabelaInterna.outerHTML, descricao));
	linhaColapsavel.appendChild(tdColapsavel);

	primeiraLinha.insertAdjacentElement("afterend", linhaColapsavel);
	excedentes.forEach((linha) => linha.remove());
	cabecalho.dataset.effraimGrupoPartesAplicado = "1";
	logInfo("Grupo compactado.", {
		grupo: descricao,
		linhasTotais: dados.length,
		linhasColapsadas: excedentes.length
	});
	return true;
}

function compactarTabelaPartes() {
	const tabela = obterTabelaPartes();
	if (!tabela) return { alterados: 0, totalGrupos: 0 };
	const tbody = tabela.querySelector("tbody");
	if (!tbody) return { alterados: 0, totalGrupos: 0 };

	const grupos = obterGruposDeLinhas(tbody);
	let alterados = 0;
	logInfo("Grupos detectados para compactação.", {
		totalGrupos: grupos.length,
		grupos: grupos.map((g) => ({
			grupo: descreverGrupo(g),
			linhas: g.dados.length
		}))
	});
	for (const grupo of grupos) {
		if (compactarGrupo(tbody, grupo)) alterados += 1;
	}
	return { alterados, totalGrupos: grupos.length };
}

function sinalizarListaPartesPronta(detalhe = {}) {
	window.__EFFRAIM_LISTA_PARTES_PRONTA = true;
	window.__EFFRAIM_LISTA_PARTES_DETALHE = detalhe;
	window.dispatchEvent(new CustomEvent(EVENTO_LISTA_PARTES_PRONTA, { detail: detalhe }));
	logInfo("Evento de lista de partes pronta emitido.", detalhe);
}

async function aplicarListaPartesAprimorada() {
	pausado = true;
	try {
		garantirCss();
		aplicarVariavelAltura();
		const fieldset = obterFieldsetPartes();
		if (!fieldset) return;
		garantirScrollNaTabela();
		garantirAviso();
		await expandirPartesOcultas();
		const { alterados, totalGrupos } = compactarTabelaPartes();
		logInfo("Compactação aplicada.", { gruposAlterados: alterados, gruposAnalisados: totalGrupos });
		sinalizarListaPartesPronta({
			canceladoPeloUsuario,
			gruposAlterados: alterados,
			gruposAnalisados: totalGrupos,
			timestamp: Date.now()
		});
	} finally {
		pausado = false;
	}
}

function mutacaoRelevante(mutacoes) {
	for (const m of mutacoes) {
		if (m.type !== "childList") continue;
		const alvo = m.target;
		if (alvo?.nodeType === 1) {
			const el = /** @type {Element} */ (alvo);
			if (el.id === "fldPartes" || el.id === "tblPartesERepresentantes") return true;
			if (el.closest?.("#fldPartes, #tblPartesERepresentantes")) return true;
		}
		for (const node of m.addedNodes || []) {
			if (!node || node.nodeType !== 1) continue;
			const el = /** @type {Element} */ (node);
			if (el.id === "fldPartes" || el.id === "tblPartesERepresentantes") return true;
			if (el.querySelector?.("#fldPartes, #tblPartesERepresentantes")) return true;
			if (el.closest?.("#fldPartes, #tblPartesERepresentantes")) return true;
		}
	}
	return false;
}

function agendarAplicacao() {
	if (timeoutAplicacao) clearTimeout(timeoutAplicacao);
	timeoutAplicacao = setTimeout(() => {
		aplicarListaPartesAprimorada().catch((e) => logWarn("Falha ao reaplicar lista de partes.", e));
	}, 220);
}

function iniciarObservador() {
	if (observador) return;
	observador = new MutationObserver((mutacoes) => {
		if (pausado || canceladoPeloUsuario) return;
		if (!mutacaoRelevante(mutacoes)) return;
		agendarAplicacao();
	});
	observador.observe(document.body, { childList: true, subtree: true });
}

export async function init() {
	logInfo("Init iniciado.");
	await aplicarListaPartesAprimorada();
	iniciarObservador();
}
