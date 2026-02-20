const LOG_PREFIXO = "[EFFRAIM paginacao_aprimorada]";
const CSS_ID = "effraim-paginacao-aprimorada-css";
const VALORES_EXTRAS = ["5", "10", "200"];
const SELETOR_RADIO = "#divPaginacao";
const SELETOR_LENGTH = "#tblProcessoLista_length";
const PREFIXO_STORAGE = "effraim_paginacao_aprimorada";

let observador = null;
let timerAplicacao = null;
let observadorPausado = false;

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

function logWarn(mensagem, dados) {
	if (dados !== undefined) console.warn(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.warn(`${LOG_PREFIXO} ${mensagem}`);
}

function garantirCss() {
	if (document.getElementById(CSS_ID)) return;
	const link = document.createElement("link");
	link.id = CSS_ID;
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/paginacao_aprimorada.css");
	(document.head || document.documentElement).appendChild(link);
}

function chaveCache(tipo, id) {
	const params = new URLSearchParams(window.location.search);
	const acao = params.get("acao") || "";
	return `${PREFIXO_STORAGE}::${window.location.pathname}::${acao}::${tipo}::${id}`;
}

function lerCache(tipo, id) {
	try {
		return localStorage.getItem(chaveCache(tipo, id));
	} catch {
		return null;
	}
}

function salvarCache(tipo, id, valor) {
	try {
		localStorage.setItem(chaveCache(tipo, id), String(valor));
	} catch (e) {
		logWarn("Falha ao gravar cache local.", e);
	}
}

function criarIconeEffraim() {
	const img = document.createElement("img");
	img.className = "effraim-paginacao-icone";
	img.src = chrome.runtime.getURL("assets/icones/icone16.png");
	img.alt = "EFFRAIM";
	img.title = "Opção adicionada pelo EFFRAIM";
	return img;
}

function obterBlocoRadioBase(container) {
	const blocos = [...container.querySelectorAll("div")];
	return blocos.find((bloco) => bloco.querySelector("input[type='radio'][name='paginacao']")) || null;
}

function ordenarBlocosRadio(container) {
	const blocos = [...container.children].filter((filho) =>
		filho?.querySelector?.("input[type='radio'][name='paginacao']")
	);
	const ordenados = blocos.sort((a, b) => {
		const va = Number(a.querySelector("input[type='radio'][name='paginacao']")?.value || 0);
		const vb = Number(b.querySelector("input[type='radio'][name='paginacao']")?.value || 0);
		return va - vb;
	});
	ordenados.forEach((bloco) => container.appendChild(bloco));
}

function garantirOpcoesRadio(container) {
	const blocoBase = obterBlocoRadioBase(container);
	if (!blocoBase) return { alterou: false, idEscopo: "divPaginacao" };

	const idEscopo = container.id || "divPaginacao";
	let alterou = false;

	for (const valor of VALORES_EXTRAS) {
		if (container.querySelector(`input[type='radio'][name='paginacao'][value='${valor}']`)) continue;

		const clone = blocoBase.cloneNode(true);
		const input = clone.querySelector("input[type='radio'][name='paginacao']");
		const label = clone.querySelector("label");
		if (!input || !label) continue;

		const novoId = `optPaginacao${valor}Effraim`;
		const novoLabelId = `lblPaginacao${valor}Effraim`;
		input.id = novoId;
		input.value = valor;
		input.checked = false;
		input.removeAttribute("checked");
		input.dataset.effraimOpcao = "1";
		label.id = novoLabelId;
		label.setAttribute("for", novoId);
		label.innerHTML = "";
		label.append(criarIconeEffraim(), document.createTextNode(` ${valor} processos por página`));
		container.appendChild(clone);
		alterou = true;
	}
	ordenarBlocosRadio(container);

	const radios = container.querySelectorAll("input[type='radio'][name='paginacao']");
	radios.forEach((radio) => {
		if (radio.dataset.effraimPaginacaoBind === "1") return;
		radio.dataset.effraimPaginacaoBind = "1";
		radio.addEventListener("change", () => {
			if (!radio.checked) return;
			salvarCache("radio", idEscopo, radio.value);
		});
	});

	const valorCache = lerCache("radio", idEscopo);
	if (valorCache) {
		const alvo = container.querySelector(`input[type='radio'][name='paginacao'][value='${valorCache}']`);
		if (alvo && !alvo.checked) {
			alvo.checked = true;
			alvo.dispatchEvent(new Event("change", { bubbles: true }));
			alvo.dispatchEvent(new Event("click", { bubbles: true }));
		}
	}

	return { alterou, idEscopo };
}

function garantirOpcoesSelect(container) {
	const select = container.querySelector("select");
	if (!select) return { alterou: false, idEscopo: "tblProcessoLista_length" };

	const idEscopo = container.id || "tblProcessoLista_length";
	let alterou = false;

	for (const valor of VALORES_EXTRAS) {
		const existente = select.querySelector(`option[value='${valor}']`);
		if (!existente) {
			const opt = document.createElement("option");
			opt.value = valor;
			opt.textContent = valor;
			opt.dataset.effraimOpcao = "1";
			select.appendChild(opt);
			alterou = true;
		} else {
			existente.dataset.effraimOpcao = "1";
		}
	}

	const opcoesOrdenadas = [...select.options].sort((a, b) => Number(a.value) - Number(b.value));
	opcoesOrdenadas.forEach((op) => select.appendChild(op));

	// Remove qualquer ícone no campo selecionado/texto lateral (pedido do usuário).
	select.classList.remove("effraim-paginacao-select-com-icone");
	select.style.removeProperty("background-image");
	const marcaLabel = container.querySelector(".effraim-paginacao-label-icone");
	if (marcaLabel) marcaLabel.remove();

	// Decora somente as opções criadas/geridas pelo EFFRAIM (5, 10, 200).
	const urlIcone = chrome.runtime.getURL("assets/icones/icone16.png");
	[...select.options].forEach((opt) => {
		if (opt.dataset.effraimOpcao === "1") {
			opt.classList.add("effraim-paginacao-option-icone");
			opt.style.backgroundImage = `url("${urlIcone}")`;
			opt.style.backgroundRepeat = "no-repeat";
			opt.style.backgroundPosition = "6px center";
			opt.style.backgroundSize = "12px 12px";
			opt.style.paddingLeft = "22px";
			opt.textContent = String(opt.value);
		} else {
			opt.classList.remove("effraim-paginacao-option-icone");
			opt.style.removeProperty("background-image");
			opt.style.removeProperty("background-repeat");
			opt.style.removeProperty("background-position");
			opt.style.removeProperty("background-size");
			opt.style.removeProperty("padding-left");
			opt.textContent = String(opt.value);
		}
	});

	if (select.dataset.effraimPaginacaoBind !== "1") {
		select.dataset.effraimPaginacaoBind = "1";
		select.addEventListener("change", () => {
			salvarCache("select", idEscopo, select.value);
		});
	}

	const valorCache = lerCache("select", idEscopo);
	if (valorCache && select.value !== valorCache && select.querySelector(`option[value='${valorCache}']`)) {
		select.value = valorCache;
		select.dispatchEvent(new Event("change", { bubbles: true }));
	}

	return { alterou, idEscopo };
}

function aplicarPaginacaoAprimorada() {
	observadorPausado = true;
	try {
		garantirCss();
		const radios = [...document.querySelectorAll(SELETOR_RADIO)];
		const lengths = [...document.querySelectorAll(SELETOR_LENGTH)];
		if (!radios.length && !lengths.length) return;

		let totalAlteracoes = 0;

		for (const container of radios) {
			const { alterou, idEscopo } = garantirOpcoesRadio(container);
			if (alterou) totalAlteracoes += 1;
			logInfo("Paginação por radio processada.", { idEscopo, alterou });
		}

		for (const container of lengths) {
			const { alterou, idEscopo } = garantirOpcoesSelect(container);
			if (alterou) totalAlteracoes += 1;
			logInfo("Paginação por select processada.", { idEscopo, alterou });
		}

		logInfo("Paginação aprimorada aplicada.", {
			radios: radios.length,
			selects: lengths.length,
			blocosAlterados: totalAlteracoes
		});
	} catch (e) {
		logWarn("Falha ao aplicar paginação aprimorada.", e);
	} finally {
		observadorPausado = false;
	}
}

function mutacaoRelevante(mutacoes) {
	for (const mutacao of mutacoes) {
		if (mutacao.type !== "childList") continue;
		const alvo = mutacao.target;
		if (alvo?.nodeType === 1) {
			const el = /** @type {Element} */ (alvo);
			if (el.id === "divPaginacao" || el.id === "tblProcessoLista_length") return true;
			if (el.closest?.("#divPaginacao, #tblProcessoLista_length")) return true;
		}
		for (const node of mutacao.addedNodes || []) {
			if (!node || node.nodeType !== 1) continue;
			const el = /** @type {Element} */ (node);
			if (el.id === "divPaginacao" || el.id === "tblProcessoLista_length") return true;
			if (el.querySelector?.("#divPaginacao, #tblProcessoLista_length")) return true;
			if (el.closest?.("#divPaginacao, #tblProcessoLista_length")) return true;
		}
	}
	return false;
}

function agendarAplicacao() {
	if (timerAplicacao) clearTimeout(timerAplicacao);
	timerAplicacao = setTimeout(() => {
		aplicarPaginacaoAprimorada();
	}, 200);
}

function iniciarObservador() {
	if (observador) return;
	observador = new MutationObserver((mutacoes) => {
		if (observadorPausado) return;
		if (!mutacaoRelevante(mutacoes)) return;
		agendarAplicacao();
	});
	observador.observe(document.body, { childList: true, subtree: true });
}

export function init() {
	logInfo("Init iniciado.");
	aplicarPaginacaoAprimorada();
	iniciarObservador();
}
