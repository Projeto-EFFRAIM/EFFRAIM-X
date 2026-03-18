import {
	criarPainelDeslizantePadrao,
	forcarAberturaPainelDeslizante
} from "../../utils/interface.js";
import { obterManipuladorAcao } from "./mapeamento_acoes.js";

const LOG_PREFIX = "[EFFRAIM acao_flutuante]";
const CSS_ID = "effraim-acao-flutuante-css";
const FIELDSET_SELECTOR = "#fldAcoes";
const BOTOES_SELECTOR = "#fldAcoes a.infraButton";
const TOOLBAR_CONTAINER_SELECTOR = "#effraim-funcionalidades-container .effraim-painel-conteudo";
const TOOLBAR_BUTTON_ID = "btn-acao_flutuante-hub";
const PANEL_ID = "painel-acao-flutuante";

let botaoHub = null;
let painel = null;
let conteudo = null;
let aviso = null;
let status = null;
let navegacao = null;
let corpo = null;
let iframe = null;
let manipuladorAtual = null;
let ultimoAlvoChave = "";
let estadoAtual = "lista";
let podeReabrirPorHover = false;
let acaoCarregadaEmMemoria = "";

function logInfo(msg, data) {
	if (data !== undefined) console.info(`${LOG_PREFIX} ${msg}`, data);
	else console.info(`${LOG_PREFIX} ${msg}`);
}

function logWarn(msg, data) {
	if (data !== undefined) console.warn(`${LOG_PREFIX} ${msg}`, data);
	else console.warn(`${LOG_PREFIX} ${msg}`);
}

function garantirCss() {
	if (document.getElementById(CSS_ID)) return;
	const link = document.createElement("link");
	link.id = CSS_ID;
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/acao_flutuante.css");
	(document.head || document.documentElement).appendChild(link);
}

function obterContainerToolbar() {
	return document.querySelector(TOOLBAR_CONTAINER_SELECTOR);
}

function obterAncoraTopologica() {
	return document.getElementById("effraim-funcionalidades-container") || botaoHub;
}

function extrairRotuloAcao(anchor) {
	return String(anchor?.textContent || anchor?.title || "Ação")
		.replace(/\s+/g, " ")
		.trim();
}

function obterMensagemAvisoNatural() {
	const nomeCfg =
		window?.EFFRAIM_CONFIGURACOES?.funcionalidades_ativas?.acao_flutuante?._meta?.nome ||
		"Ação Flutuante";
	return `Você está usando a funcionalidade ${nomeCfg}. Se desejar, desative nas configurações do EFFRAIM.`;
}

function atualizarStatus(texto = "", tipo = "normal") {
	if (!status) return;
	const textoLimpo = String(texto || "").trim();
	status.textContent = textoLimpo;
	status.dataset.status = tipo;
	status.style.display = textoLimpo ? "block" : "none";
}

function estaAberto() {
	return Boolean(painel) && painel.style.display !== "none" && painel.style.opacity !== "0";
}

function posicionarPainelFixo() {
	if (!painel) return;
	const ancora = obterAncoraTopologica();
	const rect = ancora?.getBoundingClientRect?.();
	const topo = rect ? Math.round(rect.bottom + 8) : 72;
	painel.style.position = "fixed";
	painel.style.top = `${Math.max(48, topo)}px`;
	painel.style.left = "50%";
	painel.style.right = "auto";
	painel.style.transform = "translateX(-50%)";
	painel.style.zIndex = "2147481000";
}

function abrirPainel() {
	if (!painel) return;
	podeReabrirPorHover = true;
	forcarAberturaPainelDeslizante(painel);
	posicionarPainelFixo();
	requestAnimationFrame(() => {
		posicionarPainelFixo();
	});
}

function fecharPainel() {
	if (!painel) return;
	painel.style.opacity = "0";
	painel.style.maxHeight = "0";
	painel.style.pointerEvents = "none";
	painel.style.display = "none";
}

function listarAcoesDisponiveis() {
	return [...document.querySelectorAll(BOTOES_SELECTOR)].filter((anchor) => {
		if (!(anchor instanceof HTMLAnchorElement)) return false;
		if (!anchor.isConnected) return false;
		if (anchor.dataset.effraimAcaoHubIgnorar === "1") return false;
		return !!extrairRotuloAcao(anchor);
	});
}

function renderizarCabecalhoInterno({ titulo = "Ações do processo", mostrarVoltar = false } = {}) {
	if (!navegacao) return;
	navegacao.innerHTML = "";

	const barra = document.createElement("div");
	barra.className = "effraim-acao-flutuante-topbar";

	const esquerda = document.createElement("div");
	esquerda.className = "effraim-acao-flutuante-topbar-esquerda";

	if (mostrarVoltar) {
		const btnVoltar = document.createElement("button");
		btnVoltar.type = "button";
		btnVoltar.className = "effraim-acao-flutuante-btn-secundario";
		btnVoltar.textContent = "Voltar";
		btnVoltar.addEventListener("click", () => {
			renderizarListaAcoes({ abrir: true });
		});
		esquerda.appendChild(btnVoltar);
	}

	const tituloEl = document.createElement("div");
	tituloEl.className = "effraim-acao-flutuante-topbar-titulo";
	tituloEl.textContent = titulo;
	esquerda.appendChild(tituloEl);

	barra.appendChild(esquerda);
	navegacao.appendChild(barra);
}

function garantirBotaoHub() {
	const existente = document.getElementById(TOOLBAR_BUTTON_ID);
	if (existente) {
		botaoHub = existente;
		return botaoHub;
	}

	const container = obterContainerToolbar();
	if (!container) {
		logWarn("Container do toolbar EFFRAIM nao encontrado para inserir o botao do hub.");
		return null;
	}

	const botao = document.createElement("button");
	botao.id = TOOLBAR_BUTTON_ID;
	botao.className = "btn btn-sm btn-outline-primary d-flex flex-column align-items-center effraim-btn-init";
	botao.title = "Ações Flutuantes";
	botao.innerHTML = `
		<img src="${chrome.runtime.getURL("assets/icones/acoes_flutuantes.png")}" style="width:32px; height:32px;">
	`;

	const referencia = document.getElementById("btn-sisbajud");
	if (referencia?.parentElement === container) {
		container.insertBefore(botao, referencia);
	} else {
		container.appendChild(botao);
	}

	botao.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		renderizarListaAcoes({ abrir: true });
	});

	botao.addEventListener("mouseenter", (event) => {
		if (!podeReabrirPorHover && !estaAberto()) {
			event.stopImmediatePropagation();
		}
	}, true);

	botao.addEventListener("mouseenter", () => {
		if (!painel) return;
		if (!estaAberto() && (estadoAtual === "lista" || ultimoAlvoChave)) {
			abrirPainel();
		}
	});

	botaoHub = botao;
	logInfo("Botao do hub de acoes flutuantes inserido no toolbar.");
	return botaoHub;
}

function garantirPainel() {
	if (painel?.isConnected) return true;
	const ancora = garantirBotaoHub();
	if (!ancora) return false;

	painel = criarPainelDeslizantePadrao(PANEL_ID, ancora);
	if (!painel) return false;

	painel.classList.add("effraim-acao-flutuante-painel");
	Object.assign(painel.style, {
		width: "92vw",
		maxWidth: "92vw",
		minHeight: "78vh",
		maxHeight: "92vh",
		background: "#f5fbff",
		color: "#0f314a",
		padding: "0",
		overflowY: "auto",
		overflowX: "hidden"
	});

	conteudo = document.createElement("div");
	conteudo.className = "effraim-acao-flutuante-conteudo";

	aviso = document.createElement("div");
	aviso.className = "effraim-acao-flutuante-aviso";
	aviso.textContent = obterMensagemAvisoNatural();

	status = document.createElement("div");
	status.className = "effraim-acao-flutuante-status";
	status.style.display = "none";

	navegacao = document.createElement("div");
	navegacao.className = "effraim-acao-flutuante-navegacao";

	corpo = document.createElement("div");
	corpo.className = "effraim-acao-flutuante-corpo";

	conteudo.appendChild(aviso);
	conteudo.appendChild(status);
	conteudo.appendChild(navegacao);
	conteudo.appendChild(corpo);
	painel.appendChild(conteudo);

	window.addEventListener("resize", posicionarPainelFixo);
	window.addEventListener("scroll", posicionarPainelFixo, true);
	painel.addEventListener("mouseenter", () => {
		posicionarPainelFixo();
	});

	logInfo("Painel central de acoes flutuantes criado.");
	return true;
}

function aplicarConfiguracaoPainelPorAcao(manipulador) {
	if (!painel) return;
	painel.style.width = manipulador?.configuracaoPainel?.largura || "92vw";
	painel.style.maxWidth = manipulador?.configuracaoPainel?.larguraMaxima || "92vw";
	painel.style.minHeight = manipulador?.configuracaoPainel?.alturaMinima || "78vh";
	painel.style.maxHeight = manipulador?.configuracaoPainel?.alturaMaxima || "92vh";
	if (iframe?.isConnected) {
		iframe.style.height = manipulador?.configuracaoPainel?.alturaIframe || "";
		iframe.style.minHeight = manipulador?.configuracaoPainel?.alturaIframeMinima || "";
	}
}

async function solicitarFechamentoGuiaAtual() {
	return await new Promise((resolve) => {
		chrome.runtime.sendMessage({ type: "EFFRAIM_FECHAR_ABA_ATUAL" }, (resposta) => {
			const erro = chrome.runtime.lastError;
			if (erro) {
				resolve({ ok: false, erro: erro.message || "runtime_sendmessage_falhou" });
				return;
			}
			resolve(resposta?.ok ? { ok: true } : { ok: false, erro: resposta?.erro || "fechamento_rejeitado" });
		});
	});
}

async function aplicarComportamentoDoManipuladorNoIframe() {
	const manipulador = iframe?.__effraimManipuladorAtual || manipuladorAtual;
	if (!manipulador || typeof manipulador.aoCarregarIframe !== "function") return;

	try {
		const documento = iframe.contentDocument || iframe.contentWindow?.document;
		if (!documento) return;
		await manipulador.aoCarregarIframe({
			iframe,
			documento,
			janela: iframe.contentWindow,
			atualizarStatus,
			solicitarFechamentoGuia: solicitarFechamentoGuiaAtual
		});
	} catch (erro) {
		atualizarStatus("Falha ao aplicar comportamento da ação flutuante.", "erro");
		logWarn("Erro ao aplicar comportamento especifico do manipulador.", erro);
	}
}

function extrairUrlDeHrefJavascript(href) {
	if (!href?.startsWith("javascript:")) return "";
	const mSubFrm = href.match(/exibirSubFrm\('([^']+)'/i);
	if (mSubFrm?.[1]) return mSubFrm[1];
	return "";
}

function resolverUrlDaAcao(anchor) {
	const hrefRaw = (anchor.getAttribute("href") || "").replaceAll("&amp;", "&");
	if (!hrefRaw) return "";
	if (hrefRaw.startsWith("javascript:")) {
		const extraida = extrairUrlDeHrefJavascript(hrefRaw);
		if (!extraida) return "";
		try {
			return new URL(extraida, window.location.href).href;
		} catch {
			return "";
		}
	}
	try {
		return new URL(hrefRaw, window.location.href).href;
	} catch {
		return anchor.href || "";
	}
}

function extrairChaveAcao(url) {
	if (!url) return "sem_acao";
	try {
		const u = new URL(url, window.location.href);
		const acao = u.searchParams.get("acao");
		if (acao) return acao;
		const path = u.pathname.split("/").filter(Boolean).pop() || "";
		return path || "sem_acao";
	} catch {
		return "sem_acao";
	}
}

function renderizarListaAcoes({ abrir = false } = {}) {
	if (!garantirPainel()) return;
	estadoAtual = "lista";
	manipuladorAtual = null;
	atualizarStatus("");
	renderizarCabecalhoInterno({ titulo: "Ações do processo", mostrarVoltar: false });
	corpo.innerHTML = "";

	const acoes = listarAcoesDisponiveis();
	if (!acoes.length) {
		const vazio = document.createElement("div");
		vazio.className = "effraim-acao-flutuante-vazio";
		vazio.textContent = "Nenhuma ação disponível no fieldset.";
		corpo.appendChild(vazio);
	} else {
		const lista = document.createElement("div");
		lista.className = "effraim-acao-flutuante-lista";

		for (const anchor of acoes) {
			const item = document.createElement("button");
			item.type = "button";
			item.className = "effraim-acao-flutuante-item";
			item.textContent = extrairRotuloAcao(anchor);
			item.title = item.textContent;
			item.addEventListener("click", () => {
				void abrirAcaoPorAnchor(anchor, { alternarMesmoAlvo: false });
			});
			lista.appendChild(item);
		}

		corpo.appendChild(lista);
	}

	if (abrir) abrirPainel();
}

async function abrirAcaoPorAnchor(anchor, { alternarMesmoAlvo = true } = {}) {
	if (!anchor || !garantirPainel()) return;

	const url = resolverUrlDaAcao(anchor);
	const chaveAcao = extrairChaveAcao(url);
	const alvoChave = `${chaveAcao}|${url}`;
	if (!url) {
		atualizarStatus("Esta ação não possui link compatível para abrir no painel flutuante.", "erro");
		renderizarListaAcoes({ abrir: true });
		return;
	}

	if (alternarMesmoAlvo && ultimoAlvoChave === alvoChave && estadoAtual === "acao" && estaAberto()) {
		fecharPainel();
		ultimoAlvoChave = "";
		podeReabrirPorHover = false;
		return;
	}

	estadoAtual = "acao";
	manipuladorAtual = await obterManipuladorAcao(chaveAcao);
	aplicarConfiguracaoPainelPorAcao(manipuladorAtual);
	const urlFinal = manipuladorAtual?.transformarUrl?.({ url, anchor }) || url;
	const rotulo = extrairRotuloAcao(anchor);

	renderizarCabecalhoInterno({ titulo: rotulo, mostrarVoltar: true });
	atualizarStatus("");
	corpo.innerHTML = "";

	if (!iframe) {
		iframe = document.createElement("iframe");
		iframe.id = "effraim-iframe-acao-flutuante";
		iframe.className = "effraim-iframe-acao-flutuante";
		iframe.addEventListener("load", async () => {
			await aplicarComportamentoDoManipuladorNoIframe();
		});
		iframe.addEventListener("error", (erro) => {
			atualizarStatus("Falha ao carregar a ação no painel flutuante.", "erro");
			logWarn("Erro no iframe da acao flutuante.", erro);
		});
	}

	if (acaoCarregadaEmMemoria === alvoChave && iframe.src) {
		iframe.__effraimManipuladorAtual = manipuladorAtual;
		corpo.appendChild(iframe);
		ultimoAlvoChave = alvoChave;
		abrirPainel();
		logInfo("Acao reaproveitada sem recarregar iframe.", { chaveAcao, rotulo });
		return;
	}

	iframe.__effraimManipuladorAtual = manipuladorAtual;
	corpo.appendChild(iframe);
	iframe.src = urlFinal;
	ultimoAlvoChave = alvoChave;
	acaoCarregadaEmMemoria = alvoChave;
	abrirPainel();
	logInfo("Acao carregada no hub.", { chaveAcao, url: urlFinal, rotulo });
}

function cliqueForaFecha(event) {
	if (!estaAberto()) return;
	const alvo = event.target instanceof Element ? event.target : null;
	if (!alvo) return;
	if (painel?.contains(alvo)) return;
	if (botaoHub?.contains?.(alvo) || alvo === botaoHub) return;
	if (alvo.closest?.(BOTOES_SELECTOR)) return;
	fecharPainel();
}

function escapeFecha(event) {
	if (event.key !== "Escape") return;
	if (!estaAberto()) return;
	fecharPainel();
}

async function interceptarCliqueAcao(event) {
	if (event.__effraimAcaoFlutuanteHandled) return;
	const anchor = event.target?.closest?.(BOTOES_SELECTOR);
	if (!anchor) return;
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	event.__effraimAcaoFlutuanteHandled = true;
	event.preventDefault();
	event.stopPropagation();
	await abrirAcaoPorAnchor(anchor, { alternarMesmoAlvo: true });
}

export function init() {
	logInfo("Init iniciado.");
	garantirCss();
	garantirBotaoHub();
	garantirPainel();
	renderizarListaAcoes({ abrir: false });
	document.addEventListener("click", interceptarCliqueAcao, true);
	document.addEventListener("mousedown", cliqueForaFecha, true);
	document.addEventListener("keydown", escapeFecha, true);
	logInfo("Hub de acoes flutuantes iniciado.");
}
