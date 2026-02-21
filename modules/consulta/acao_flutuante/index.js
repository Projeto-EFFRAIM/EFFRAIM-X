import { criarPainelDeslizantePadrao } from "../../utils/interface.js";
import { obterManipuladorAcao } from "./mapeamento_acoes.js";

const LOG_PREFIX = "[EFFRAIM acao_flutuante]";
const CSS_ID = "effraim-acao-flutuante-css";
const FIELDSET_SELECTOR = "#fldAcoes";
const BOTOES_SELECTOR = "#fldAcoes a.infraButton";

let painel = null;
let conteudo = null;
let status = null;
let iframe = null;
let ancoraAtual = null;
let observador = null;
let listenersPosicao = false;
let manipuladorAtual = null;
let ultimoAlvoChave = "";
let timeoutFechamentoMouse = null;

function cancelarFechamentoPorMouse() {
	if (timeoutFechamentoMouse) {
		clearTimeout(timeoutFechamentoMouse);
		timeoutFechamentoMouse = null;
	}
}

function agendarFechamentoPorMouse(delay = 220) {
	cancelarFechamentoPorMouse();
	timeoutFechamentoMouse = setTimeout(() => {
		const painelHover = painel?.matches?.(":hover");
		const ancoraHover = ancoraAtual?.matches?.(":hover");
		if (painelHover || ancoraHover) return;
		fecharPainel();
	}, delay);
}

const bloquearMouseleaveHelper = (event) => {
	// impede o autoclose do helper padrao e delega para nosso controle.
	event.stopImmediatePropagation();
	agendarFechamentoPorMouse();
};

const bloquearMouseenterHelper = (event) => {
	// impede conflito com timers internos do helper padrao.
	event.stopImmediatePropagation();
	cancelarFechamentoPorMouse();
	const alvo = event.currentTarget;
	if (alvo === ancoraAtual && !estaAberto() && ultimoAlvoChave) {
		abrirPainel();
		logInfo("Painel reaberto ao retornar com mouse para a ancora.");
	}
};

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
	logInfo("CSS carregado.", { href: link.href });
}

function estaAberto() {
	return Boolean(painel) && painel.style.display !== "none" && painel.style.opacity !== "0";
}

function fecharPainel() {
	if (!painel) return;
	painel.style.opacity = "0";
	painel.style.maxHeight = "0";
	painel.style.pointerEvents = "none";
	painel.style.display = "none";
	logInfo("Painel fechado.");
}

function atualizarStatus(texto, tipo = "normal") {
	if (!status) return;
	status.textContent = texto;
	status.dataset.status = tipo;
}

function aplicarConfiguracaoPainelPorAcao(manipulador) {
	if (!painel) return;
	// O tamanho do painel deslizante agora e centralizado no CSS compartilhado.
	painel.style.width = "";
	painel.style.maxWidth = "";
	if (manipulador?.configuracaoPainel?.largura || manipulador?.configuracaoPainel?.larguraMaxima) {
		logInfo("Configuracao de largura do manipulador ignorada para manter padrao visual unificado.", {
			manipulador: manipulador?.id || "padrao"
		});
	}
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
			atualizarStatus
		});
		logInfo("Comportamento específico do manipulador aplicado.", {
			manipulador: manipulador.id || "padrao"
		});
	} catch (erro) {
		status.style.display = "block";
		atualizarStatus("Falha ao aplicar comportamento da ação flutuante.", "erro");
		logWarn("Erro ao aplicar comportamento especifico do manipulador.", erro);
	}
}

function obterMensagemAvisoNatural() {
	const nomeCfg =
		window?.EFFRAIM_CONFIGURACOES?.funcionalidades_ativas?.acao_flutuante?._meta?.nome ||
		"Ação Flutuante";
	return `Você está usando a funcionalidade ${nomeCfg}. Se desejar, desative nas configurações do EFFRAIM.`;
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

function posicionarAbaixoDaAncora() {
	if (!painel || !ancoraAtual?.isConnected) return;
	const rect = ancoraAtual.getBoundingClientRect();
	const margem = 8;
	painel.style.position = "fixed";
	painel.style.transform = "none";
	painel.style.top = `${Math.round(rect.bottom + margem)}px`;

	const largura = painel.offsetWidth || 0;
	const limiteDireito = Math.max(12, window.innerWidth - largura - 12);
	const left = Math.min(Math.max(12, rect.left), limiteDireito);
	painel.style.left = `${Math.round(left)}px`;
}

function rolarAncoraParaTopo(anchor) {
	if (!anchor?.isConnected) return;
	try {
		anchor.scrollIntoView({
			block: "start",
			inline: "nearest",
			behavior: "auto"
		});
		logInfo("Ancora rolada para o topo antes da abertura do painel.");
	} catch (e) {
		logWarn("Falha ao executar scrollIntoView da ancora.", e);
	}
}

function abrirPainel() {
	if (!painel) return;
	painel.style.display = "inline-block";
	painel.style.opacity = "1";
	painel.style.pointerEvents = "auto";
	requestAnimationFrame(() => {
		posicionarAbaixoDaAncora();
		const altura = painel.scrollHeight || 0;
		painel.style.maxHeight = `${altura}px`;
	});
}

function garantirPainel(anchor) {
	if (!anchor) return false;
	if (painel && anchor === ancoraAtual && painel.isConnected) return true;

	if (painel && painel.isConnected) painel.remove();

	const novoPainel = criarPainelDeslizantePadrao("painel-acao-flutuante", anchor, "Ação Flutuante");
	Object.assign(novoPainel.style, {
		background: "#f5fbff",
		color: "#0f314a",
		paddingRight: "12px",
		zIndex: "2147481000"
	});

	// O helper padrao fecha em mouseleave (comportamento de hover).
	// Aqui usamos um fechamento controlado: fecha ao sair do painel/ancora com pequeno delay.
	anchor.addEventListener("mouseenter", bloquearMouseenterHelper, true);
	anchor.addEventListener("mouseleave", bloquearMouseleaveHelper, true);
	novoPainel.addEventListener("mouseenter", bloquearMouseenterHelper, true);
	novoPainel.addEventListener("mouseleave", bloquearMouseleaveHelper, true);

	const novoConteudo = document.createElement("div");
	novoConteudo.id = "conteudo-acao-flutuante";
	novoConteudo.style.padding = "8px";

	const novoAviso = document.createElement("div");
	novoAviso.className = "effraim-acao-flutuante-aviso";
	novoAviso.textContent = obterMensagemAvisoNatural();

	const novoStatus = document.createElement("div");
	novoStatus.className = "effraim-acao-flutuante-status";
	novoStatus.style.display = "none";

	novoConteudo.appendChild(novoAviso);
	novoConteudo.appendChild(novoStatus);
	novoPainel.appendChild(novoConteudo);

	painel = novoPainel;
	conteudo = novoConteudo;
	status = novoStatus;
	iframe = null;
	ancoraAtual = anchor;

	if (!listenersPosicao) {
		window.addEventListener("resize", posicionarAbaixoDaAncora);
		window.addEventListener("scroll", posicionarAbaixoDaAncora, true);
		listenersPosicao = true;
	}

	return true;
}

async function carregarAcaoNoPainel(anchor) {
	const url = resolverUrlDaAcao(anchor);
	const chaveAcao = extrairChaveAcao(url);
	const alvoChave = `${chaveAcao}|${url}`;
	logInfo("Acao detectada.", { chaveAcao, url, texto: (anchor.textContent || "").trim().slice(0, 80) });

	if (!url) {
		atualizarStatus("Esta acao nao possui link compativel para abrir no painel flutuante.", "erro");
		logWarn("Acao sem URL compativel.", { href: anchor.getAttribute("href") || "" });
		return;
	}

	manipuladorAtual = await obterManipuladorAcao(chaveAcao);
	aplicarConfiguracaoPainelPorAcao(manipuladorAtual);
	const urlFinal = manipuladorAtual?.transformarUrl?.({ url, anchor }) || url;

	abrirPainel();

	if (!iframe) {
		iframe = document.createElement("iframe");
		iframe.id = "effraim-iframe-acao-flutuante";
		iframe.className = "effraim-iframe-acao-flutuante";
		iframe.style.width = "100%";
		iframe.addEventListener("load", async () => {
			logInfo("Iframe carregado.", { src: iframe?.src || "" });
			await aplicarComportamentoDoManipuladorNoIframe();
		});
		iframe.addEventListener("error", (e) => {
			status.style.display = "block";
			atualizarStatus("Falha ao carregar a acao no painel flutuante.", "erro");
			logWarn("Erro no iframe.", e);
		});
		conteudo.appendChild(iframe);
	}

	if (ultimoAlvoChave === alvoChave && estaAberto()) {
		fecharPainel();
		ultimoAlvoChave = "";
		return;
	}

	iframe.__effraimManipuladorAtual = manipuladorAtual;
	iframe.src = urlFinal;
	ultimoAlvoChave = alvoChave;
	logInfo("SRC atualizado no iframe.", { src: urlFinal, manipulador: manipuladorAtual?.id || "padrao" });
}

async function interceptarCliqueAcao(event) {
	if (event.__effraimAcaoFlutuanteHandled) return;
	const anchor = event.target?.closest?.(BOTOES_SELECTOR);
	if (!anchor) return;
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	event.__effraimAcaoFlutuanteHandled = true;
	event.preventDefault();
	event.stopPropagation();
	rolarAncoraParaTopo(anchor);

	if (!garantirPainel(anchor)) {
		logWarn("Nao foi possivel criar/obter painel para ancora.");
		return;
	}
	await carregarAcaoNoPainel(anchor);
}

function marcarBotoes() {
	const fieldset = document.querySelector(FIELDSET_SELECTOR);
	if (!fieldset) {
		logWarn("Fieldset de acoes nao encontrado.");
		return;
	}
	const botoes = fieldset.querySelectorAll("a.infraButton");
	logInfo("Mapeando botoes de acao.", { quantidade: botoes.length });
	botoes.forEach((anchor) => {
		if (anchor.dataset.effraimAcaoFlutuanteVinculado === "1") return;
		anchor.dataset.effraimAcaoFlutuanteVinculado = "1";
		anchor.addEventListener("click", interceptarCliqueAcao, true);
	});
}

function iniciarObservacao() {
	if (observador) return;
	observador = new MutationObserver(() => {
		marcarBotoes();
	});
	observador.observe(document.body, { childList: true, subtree: true });
}

function cliqueForaFecha(event) {
	if (!estaAberto()) return;
	const target = event.target;
	if (!target) return;
	if (painel?.contains(target)) return;
	if (target.closest?.(BOTOES_SELECTOR)) return;
	fecharPainel();
}

function escapeFecha(event) {
	if (event.key !== "Escape") return;
	if (!estaAberto()) return;
	fecharPainel();
}

export function init() {
	logInfo("Init iniciado.");
	garantirCss();
	marcarBotoes();
	iniciarObservacao();
	document.addEventListener("click", interceptarCliqueAcao, true);
	document.addEventListener("mousedown", cliqueForaFecha, true);
	document.addEventListener("keydown", escapeFecha, true);
	logInfo("Acao Flutuante iniciada.");
}
