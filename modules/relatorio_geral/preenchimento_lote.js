const PREFIXO_LOG = "[EFFRAIM relatorio_geral_lote]";
const CHAVE_PREFIXO = "effraim_relatorio_geral_pendente_";

function obterTokenHash() {
	const hash = String(window.location.hash || "").replace(/^#/, "");
	if (!hash) return "";
	const params = new URLSearchParams(hash);
	return String(params.get("effraim_relatorio_lote") || "").trim();
}

function encontrarCampoListaProcessos() {
	const campoDireto = document.querySelector("#txtMultiplosProcessos");
	if (campoDireto && !campoDireto.disabled && !campoDireto.readOnly) return campoDireto;

	const candidatos = [
		...document.querySelectorAll("textarea"),
		...document.querySelectorAll("input[type='text'], input:not([type])")
	];

	const pontuar = (el) => {
		let score = 0;
		const id = String(el.id || "").toLowerCase();
		const name = String(el.name || "").toLowerCase();
		const placeholder = String(el.getAttribute("placeholder") || "").toLowerCase();
		const title = String(el.getAttribute("title") || "").toLowerCase();
		const texto = `${id} ${name} ${placeholder} ${title}`;
		if (texto.includes("process")) score += 8;
		if (texto.includes("num")) score += 3;
		if (el.tagName === "TEXTAREA") score += 6;
		if (typeof el.rows === "number") score += Math.min(8, el.rows);
		if (typeof el.cols === "number") score += Math.min(4, Math.floor(el.cols / 20));
		const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
		const labelTexto = String(label?.textContent || "").toLowerCase();
		if (labelTexto.includes("process")) score += 10;
		if (labelTexto.includes("lista")) score += 4;
		return score;
	};

	const elegiveis = candidatos
		.filter((el) => !el.disabled && !el.readOnly && el.offsetParent !== null)
		.map((el) => ({ el, score: pontuar(el) }))
		.sort((a, b) => b.score - a.score);

	return elegiveis[0]?.el || null;
}

function encontrarBotaoConsultar() {
	return (
		document.querySelector("button.btnConsultar[form='frmProcessoLista']") ||
		document.querySelector("#frmProcessoLista button.btnConsultar") ||
		document.querySelector("button.btnConsultar")
	);
}

function preencherCampo(campo, processos) {
	const texto = processos.join("\n");
	campo.value = texto;
	campo.dispatchEvent(new Event("input", { bubbles: true }));
	campo.dispatchEvent(new Event("change", { bubbles: true }));
}

async function lerPayloadPendente(token) {
	const chave = `${CHAVE_PREFIXO}${token}`;
	const dados = await chrome.storage.local.get(chave);
	return { chave, payload: dados?.[chave] || null };
}

async function limparPayloadPendente(chave) {
	try {
		await chrome.storage.local.remove(chave);
	} catch (e) {
		console.warn(`${PREFIXO_LOG} Falha ao limpar payload pendente.`, e);
	}
}

async function tentarPreencher(token, tentativa = 1) {
	const { chave, payload } = await lerPayloadPendente(token);
	if (!payload || !Array.isArray(payload.processos) || !payload.processos.length) {
		console.warn(`${PREFIXO_LOG} Payload pendente não encontrado ou vazio.`, { token });
		return true; // encerra
	}

	const campo = encontrarCampoListaProcessos();
	if (!campo) {
		if (tentativa < 20) return false;
		console.warn(`${PREFIXO_LOG} Campo de lista de processos não encontrado.`, { tentativa });
		return true;
	}

	preencherCampo(campo, payload.processos);
	const botaoConsultar = encontrarBotaoConsultar();
	console.log(`${PREFIXO_LOG} Campo de processos preenchido automaticamente.`, {
		total: payload.processos.length,
		campo: { id: campo.id || "", name: campo.name || "", tag: campo.tagName },
		botaoConsultarEncontrado: !!botaoConsultar
	});
	if (botaoConsultar && !botaoConsultar.disabled) {
		botaoConsultar.click();
		console.log(`${PREFIXO_LOG} Botão Consultar acionado automaticamente.`);
	} else {
		console.warn(`${PREFIXO_LOG} Botão Consultar não encontrado ou desabilitado; preenchimento realizado sem envio automático.`);
	}
	await limparPayloadPendente(chave);
	return true;
}

export async function init() {
	if (!window.location.href.includes("acao=relatorio_geral")) return;
	const token = obterTokenHash();
	if (!token) return;

	console.log(`${PREFIXO_LOG} Token detectado no hash.`, { token });
	let tentativas = 0;
	const timer = window.setInterval(() => {
		tentativas += 1;
		void tentarPreencher(token, tentativas).then((encerrar) => {
			if (encerrar) clearInterval(timer);
		}).catch((e) => {
			console.warn(`${PREFIXO_LOG} Falha ao preencher Relatório Geral.`, e);
			clearInterval(timer);
		});
	}, 400);
}
