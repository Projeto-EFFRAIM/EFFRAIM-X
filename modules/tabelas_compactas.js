const LOG_PREFIXO = "[EFFRAIM tabelas_compactas]";
const CSS_ID = "effraim-tabelas-compactas-css";
const AVISO_ID = "effraim-tabelas-compactas-aviso";
const AVISO_TOGGLE_ID = "effraim-tabelas-compactas-toggle";
const IDS_TABELAS_ALVO = ["tblProcessoLista", "tabelaNomAJG", "tabelaLocalizadores"];
const INDICES_COLUNAS_EXCLUIDAS_COMPACTACAO = new Set([0, 1]); // checkbox + número do processo
const ALTURA_MAXIMA_PADRAO = 50;
let observador = null;
let timerReaplicar = null;
let observadorPausado = false;
let expandirTodosAtivo = false;
let linhaHoverAtiva = null;
let bloqueioHoverAte = 0;
let overlayLinha = null;
let overlayLinhaHover = false;
let overlayLinhaFonte = null;
const BLOQUEIO_HOVER_MS = 900;

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

function logWarn(mensagem, dados) {
	if (dados !== undefined) console.warn(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.warn(`${LOG_PREFIXO} ${mensagem}`);
}

function obterAlturaMaximaCelula() {
	const valorConfigurado =
		window?.EFFRAIM_CONFIGURACOES?.opcoes_tabelas_compactas?.altura_maxima_celula?.valor;
	const numero = Number(valorConfigurado);
	if (!Number.isFinite(numero)) return ALTURA_MAXIMA_PADRAO;
	if (numero <= 0) return ALTURA_MAXIMA_PADRAO;
	return Math.min(Math.round(numero), 300);
}

function aplicarVariavelDeAltura() {
	const altura = obterAlturaMaximaCelula();
	document.documentElement.style.setProperty("--effraim-tabelas-compactas-max-height", `${altura}px`);
	logInfo("Altura máxima configurada.", { alturaPx: altura });
}

function garantirCss() {
	if (document.getElementById(CSS_ID)) return;
	const link = document.createElement("link");
	link.id = CSS_ID;
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/tabelas_compactas.css");
	(document.head || document.documentElement).appendChild(link);
	logInfo("CSS carregado.", { href: link.href });
}

function localizarTabelasAlvo() {
	const tabelas = [];
	for (const id of IDS_TABELAS_ALVO) {
		const elemento = document.getElementById(id);
		if (!elemento) continue;
		if (elemento.tagName?.toLowerCase() === "table") {
			tabelas.push(elemento);
			continue;
		}
		const tabelaInterna = elemento.querySelector("table");
		if (tabelaInterna) tabelas.push(tabelaInterna);
	}
	return tabelas;
}

function montarControleAviso(aviso) {
	const controle = document.createElement("label");
	controle.className = "effraim-tabelas-compactas-aviso-toggle-wrap";
	controle.setAttribute("for", AVISO_TOGGLE_ID);

	const texto = document.createElement("span");
	texto.className = "effraim-tabelas-compactas-aviso-toggle-texto";
	texto.textContent = "Expandir todos";

	const toggle = document.createElement("input");
	toggle.id = AVISO_TOGGLE_ID;
	toggle.type = "checkbox";
	toggle.className = "effraim-tabelas-compactas-aviso-toggle";
	toggle.checked = expandirTodosAtivo;
	toggle.setAttribute("aria-label", "Expandir ou recolher todos os colapsáveis");

	toggle.addEventListener("change", () => {
		expandirTodosAtivo = Boolean(toggle.checked);
		if (expandirTodosAtivo) expandirTodosColapsaveis();
		else recolherTodosColapsaveis();
		logInfo("Estado global dos colapsáveis atualizado.", { expandirTodosAtivo });
	});

	controle.append(texto, toggle);
	aviso.appendChild(controle);
}

function expandirTodosColapsaveis() {
	ocultarOverlayLinha();
	linhaHoverAtiva = null;
	document.documentElement.classList.add("effraim-tabelas-compactas--expandir-todos");
	const itens = document.querySelectorAll(".effraim-tabelas-compactas-colapsavel");
	let total = 0;
	for (const item of itens) {
		item.dataset.expandido = "1";
		total += 1;
	}
	ajustarLayoutTabelasExpandidas(true);
	logInfo("Todos os colapsáveis foram expandidos.", { total });
}

function recolherTodosColapsaveis() {
	ocultarOverlayLinha();
	linhaHoverAtiva = null;
	document.documentElement.classList.remove("effraim-tabelas-compactas--expandir-todos");
	const itens = document.querySelectorAll(".effraim-tabelas-compactas-colapsavel");
	let total = 0;
	for (const item of itens) {
		item.dataset.expandido = "0";
		total += 1;
	}
	ajustarLayoutTabelasExpandidas(false);
	logInfo("Todos os colapsáveis foram recolhidos.", { total });
}

function centralizarLinhaNaViewport(linha) {
	if (!(linha instanceof HTMLElement)) return;
	try {
		linha.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
	} catch {
		linha.scrollIntoView({ block: "center", inline: "center" });
	}
	requestAnimationFrame(() => {
		const rect = linha.getBoundingClientRect();
		const margem = 8;
		const alvoTopo = margem;
		const alvoBase = window.innerHeight - margem;
		const alvoEsq = margem;
		const alvoDir = window.innerWidth - margem;
		let deltaY = 0;
		let deltaX = 0;
		if (rect.top < alvoTopo) deltaY = rect.top - alvoTopo;
		else if (rect.bottom > alvoBase) deltaY = rect.bottom - alvoBase;
		if (rect.left < alvoEsq) deltaX = rect.left - alvoEsq;
		else if (rect.right > alvoDir) deltaX = rect.right - alvoDir;
		if (deltaX !== 0 || deltaY !== 0) {
			window.scrollBy({ left: deltaX, top: deltaY, behavior: "smooth" });
		}
	});
}

function garantirOverlayLinha() {
	if (overlayLinha?.isConnected) return overlayLinha;
	const host = document.createElement("div");
	host.className = "effraim-tabelas-compactas-overlay-linha";
	host.style.display = "none";
	host.addEventListener("mouseenter", () => {
		overlayLinhaHover = true;
	});
	host.addEventListener("mouseleave", () => {
		overlayLinhaHover = false;
		if (!expandirTodosAtivo && overlayLinhaFonte && !overlayLinhaFonte.matches(":hover")) {
			recolherLinha(overlayLinhaFonte);
			linhaHoverAtiva = null;
		}
	});
	host.addEventListener(
		"wheel",
		(evento) => {
			if (!(evento instanceof WheelEvent)) return;
			const deltaY = evento.deltaY || 0;
			if (deltaY === 0) return;
			const maxScrollTop = Math.max(0, host.scrollHeight - host.clientHeight);
			if (maxScrollTop <= 0) return; // deixa a rolagem normal da página acontecer

			const noTopo = host.scrollTop <= 0;
			const noFim = host.scrollTop >= maxScrollTop - 1;
			const tentandoSubirNoTopo = deltaY < 0 && noTopo;
			const tentandoDescerNoFim = deltaY > 0 && noFim;
			if (!tentandoSubirNoTopo && !tentandoDescerNoFim) return;

			evento.preventDefault();
			window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
		},
		{ passive: false }
	);
	document.body.appendChild(host);
	overlayLinha = host;
	return host;
}

function clonarLinhaExpandida(linha) {
	const cloneTabela = document.createElement("table");
	cloneTabela.className = "effraim-tabelas-compactas-overlay-tabela";
	const tbody = document.createElement("tbody");
	const linhaClone = linha.cloneNode(true);
	linhaClone.classList.add("effraim-tabelas-compactas-overlay-row");
	tbody.appendChild(linhaClone);
	cloneTabela.appendChild(tbody);

	const celulasOriginais = [...linha.children].filter((el) => el instanceof HTMLElement);
	const celulasClone = [...linhaClone.children].filter((el) => el instanceof HTMLElement);
	celulasClone.forEach((celulaClone, idx) => {
		const celulaOriginal = celulasOriginais[idx];
		if (!celulaOriginal) return;
		const largura = Math.max(1, Math.round(celulaOriginal.getBoundingClientRect().width));
		celulaClone.style.width = `${largura}px`;
		celulaClone.style.minWidth = `${largura}px`;
		celulaClone.style.maxWidth = `${largura}px`;
		const wrappers = celulaClone.querySelectorAll(".effraim-tabelas-compactas-colapsavel");
		wrappers.forEach((w) => {
			w.dataset.expandido = "1";
		});
	});

	return cloneTabela;
}

function mostrarOverlayLinha(linha) {
	if (!(linha instanceof HTMLElement)) return;
	const host = garantirOverlayLinha();
	const rect = linha.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return;

	host.innerHTML = "";
	host.appendChild(clonarLinhaExpandida(linha));
	Object.assign(host.style, {
		display: "",
		top: `${Math.round(rect.top)}px`,
		left: `${Math.round(rect.left)}px`,
		width: `${Math.round(rect.width)}px`
	});
	overlayLinhaFonte = linha;
}

function ocultarOverlayLinha() {
	if (overlayLinha) {
		overlayLinha.style.display = "none";
		overlayLinha.innerHTML = "";
	}
	overlayLinhaHover = false;
	overlayLinhaFonte = null;
}

function expandirLinha(linha) {
	linha.classList.add("effraim-tabelas-compactas-linha-hover");
	mostrarOverlayLinha(linha);
}

function recolherLinha(linha) {
	linha.classList.remove("effraim-tabelas-compactas-linha-hover");
	if (overlayLinhaFonte === linha) ocultarOverlayLinha();
}

function ativarHoverEmLinhas(tabela) {
	const linhas = tabela.querySelectorAll("tr");
	for (const linha of linhas) {
		if (linha.dataset.effraimTabelaCompactaHoverBind === "1") continue;
		const possuiCompactada = linha.querySelector("td[data-effraim-tabela-compacta-aplicada='1']");
		if (!possuiCompactada) continue;
		linha.dataset.effraimTabelaCompactaHoverBind = "1";
		linha.addEventListener("mouseenter", () => {
			if (expandirTodosAtivo) return;
			const agora = Date.now();
			if (agora < bloqueioHoverAte && linhaHoverAtiva && linha !== linhaHoverAtiva) return;
			linhaHoverAtiva = linha;
			bloqueioHoverAte = agora + BLOQUEIO_HOVER_MS;
			expandirLinha(linha);
		});
		linha.addEventListener("mouseleave", () => {
			if (expandirTodosAtivo) return;
			if (linha !== linhaHoverAtiva) return;
			const agora = Date.now();
			if (agora < bloqueioHoverAte) {
				const espera = bloqueioHoverAte - agora + 10;
				setTimeout(() => {
					if (expandirTodosAtivo) return;
					if (linha !== linhaHoverAtiva) return;
					if (linha.matches(":hover")) return;
					if (overlayLinhaHover) return;
					recolherLinha(linha);
					linhaHoverAtiva = null;
				}, espera);
				return;
			}
			if (overlayLinhaHover) return;
			recolherLinha(linha);
			linhaHoverAtiva = null;
		});
	}
}

function ajustarLayoutTabelasExpandidas(ativo) {
	const tabelas = localizarTabelasAlvo();
	for (const tabela of tabelas) {
		if (!(tabela instanceof HTMLElement)) continue;
		if (ativo) {
			tabela.dataset.effraimLayoutOriginal = tabela.style.tableLayout || "";
			tabela.style.tableLayout = "auto";
			const pai = tabela.parentElement;
			if (pai) {
				pai.dataset.effraimOverflowXOriginal = pai.style.overflowX || "";
				pai.style.overflowX = "auto";
			}
		} else {
			const original = tabela.dataset.effraimLayoutOriginal;
			if (typeof original === "string") tabela.style.tableLayout = original;
			delete tabela.dataset.effraimLayoutOriginal;
			const pai = tabela.parentElement;
			if (pai) {
				const overflowOriginal = pai.dataset.effraimOverflowXOriginal;
				if (typeof overflowOriginal === "string") pai.style.overflowX = overflowOriginal;
				delete pai.dataset.effraimOverflowXOriginal;
			}
		}
	}
	logInfo("Layout das tabelas ajustado para estado expandido.", { ativo, tabelas: tabelas.length });
}

function garantirAvisoUso(tabelas) {
	if (!Array.isArray(tabelas) || !tabelas.length) return;
	if (document.getElementById(AVISO_ID)) return;

	const tabelaRef = tabelas[0];
	const parent = tabelaRef?.parentNode;
	if (!parent) return;

	const aviso = document.createElement("div");
	aviso.id = AVISO_ID;
	aviso.className = "effraim-tabelas-compactas-aviso";

	const logo = document.createElement("img");
	logo.className = "effraim-tabelas-compactas-aviso-logo";
	logo.src = chrome.runtime.getURL("assets/icones/icone32.png");
	logo.alt = "EFFRAIM";

	const texto = document.createElement("span");
	texto.textContent = "Você está usando a função de tabelas compactas. Se desejar, desative nas configurações.";

	aviso.append(logo, texto);
	montarControleAviso(aviso);
	parent.insertBefore(aviso, tabelaRef);
}

function criarItemColapsavel(htmlOriginal, corFundo = "") {
	const wrapper = document.createElement("div");
	wrapper.className = "effraim-tabelas-compactas-colapsavel";
	wrapper.dataset.expandido = "0";
	if (corFundo) wrapper.style.setProperty("--effraim-tabelas-compactas-overlay-bg", corFundo);

	const conteudo = document.createElement("div");
	conteudo.className = "effraim-tabelas-compactas-celula-conteudo";
	conteudo.innerHTML = htmlOriginal;
	wrapper.append(conteudo);
	return wrapper;
}

function ehCorTransparente(valor) {
	const v = String(valor || "").trim().toLowerCase();
	return !v || v === "transparent" || v === "rgba(0, 0, 0, 0)";
}

function obterCorFundoEfetiva(celula) {
	if (!(celula instanceof HTMLElement)) return "";
	const candidatos = [celula, celula.parentElement, celula.closest("tbody"), celula.closest("table")];
	for (const el of candidatos) {
		if (!(el instanceof HTMLElement)) continue;
		const cor = getComputedStyle(el).backgroundColor;
		if (!ehCorTransparente(cor)) return cor;
	}
	return "";
}

function medirAlturaNaturalConteudo(celula, htmlOriginal) {
	const medidor = document.createElement("div");
	medidor.className = "effraim-tabelas-compactas-medidor";
	medidor.innerHTML = htmlOriginal;

	const larguraBase = Math.max((celula.clientWidth || 0) - 8, 40);
	medidor.style.width = `${larguraBase}px`;
	document.body.appendChild(medidor);
	const altura = Math.max(medidor.scrollHeight || 0, medidor.clientHeight || 0);
	medidor.remove();
	return altura;
}

function aplicarNaTabela(tabela) {
	const celulas = tabela.querySelectorAll("td");
	let convertidas = 0;
	const alturaMaxima = obterAlturaMaximaCelula();

	for (const celula of celulas) {
		if (celula.dataset.effraimTabelaCompactaAplicada === "1") continue;
		if (INDICES_COLUNAS_EXCLUIDAS_COMPACTACAO.has(celula.cellIndex)) continue;
		const htmlOriginal = celula.innerHTML;
		const alturaConteudo = medirAlturaNaturalConteudo(celula, htmlOriginal);
		if (alturaConteudo <= alturaMaxima) continue;

		celula.textContent = "";
		const item = criarItemColapsavel(htmlOriginal, obterCorFundoEfetiva(celula));
		celula.appendChild(item);
		celula.dataset.effraimTabelaCompactaAplicada = "1";
		if (expandirTodosAtivo) item.dataset.expandido = "1";
		convertidas += 1;
	}

	return convertidas;
}

function aplicarTabelasCompactas() {
	observadorPausado = true;
	try {
		garantirCss();
		aplicarVariavelDeAltura();
		const tabelas = localizarTabelasAlvo();
		if (tabelas.length === 0) {
			logInfo("Nenhuma tabela alvo encontrada nesta página.");
			return;
		}
		garantirAvisoUso(tabelas);

		let totalConvertidas = 0;
		for (const tabela of tabelas) {
			const qtd = aplicarNaTabela(tabela);
			totalConvertidas += qtd;
			ativarHoverEmLinhas(tabela);
			logInfo("Tabela processada.", { id: tabela.id || "(sem id)", celulasConvertidas: qtd });
		}

		logInfo("Tabelas compactas aplicadas.", { tabelas: tabelas.length, celulasConvertidas: totalConvertidas });
	} finally {
		observadorPausado = false;
	}
}

function agendarReaplicacao() {
	if (timerReaplicar) clearTimeout(timerReaplicar);
	timerReaplicar = setTimeout(() => {
		aplicarTabelasCompactas();
	}, 180);
}

function mutacaoRelevante(mutacoes) {
	for (const mutacao of mutacoes) {
		if (mutacao.type !== "childList") continue;

		const alvo = mutacao.target;
		if (alvo?.nodeType === 1) {
			const el = /** @type {Element} */ (alvo);
			if (IDS_TABELAS_ALVO.includes(el.id)) return true;
			if (el.closest && IDS_TABELAS_ALVO.some((id) => el.closest(`#${id}`))) return true;
		}

		for (const node of mutacao.addedNodes || []) {
			if (!node || node.nodeType !== 1) continue;
			const el = /** @type {Element} */ (node);
			if (IDS_TABELAS_ALVO.includes(el.id)) return true;
			if (el.querySelector && IDS_TABELAS_ALVO.some((id) => el.querySelector(`#${id}`))) return true;
			if (el.closest && IDS_TABELAS_ALVO.some((id) => el.closest(`#${id}`))) return true;
		}
	}
	return false;
}

function iniciarObservador() {
	if (observador) return;
	observador = new MutationObserver((mutacoes) => {
		if (observadorPausado) return;
		if (!mutacaoRelevante(mutacoes)) return;
		agendarReaplicacao();
	});
	observador.observe(document.body, { childList: true, subtree: true });
	logInfo("Observador de DOM iniciado para reaplicar legibilidade.");
}

export function init() {
	try {
		logInfo("Init iniciado.");
		aplicarTabelasCompactas();
		iniciarObservador();
	} catch (erro) {
		logWarn("Falha ao aplicar tabelas compactas.", erro);
	}
}

