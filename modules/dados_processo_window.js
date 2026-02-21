import { consulta_dados_processo } from "../funcoes.js";

const LOG_PREFIXO = "[EFFRAIM dados_processo_window]";
const EVENTO_LISTA_PARTES_PRONTA = "EFFRAIM_LISTA_PARTES_PRONTA";
const TIMEOUT_ESPERA_PARTES_MS = 5500;

let listenerRegistrado = false;

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

function logWarn(mensagem, dados) {
	if (dados !== undefined) console.warn(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.warn(`${LOG_PREFIXO} ${mensagem}`);
}

function resumirPartes(partes = {}) {
	const resumo = {};
	for (const [tipo, lista] of Object.entries(partes || {})) {
		resumo[tipo] = Array.isArray(lista) ? lista.length : 0;
	}
	return resumo;
}

function capturarDadosProcesso(motivo = "desconhecido") {
	try {
		const dados = consulta_dados_processo();
		window.__EFFRAIM_DADOS_PROCESSO = dados;
		logInfo("Dados do processo atualizados na window.", {
			motivo,
			numProcesso: dados?.capa?.numProcesso || null,
			partes: resumirPartes(dados?.partes)
		});
		return dados;
	} catch (e) {
		logWarn("Falha ao capturar dados do processo.", { motivo, erro: e });
		return null;
	}
}

function aguardarListaPartesPronta(timeoutMs = TIMEOUT_ESPERA_PARTES_MS) {
	return new Promise((resolve) => {
		if (window.__EFFRAIM_LISTA_PARTES_PRONTA === true) {
			logInfo("Flag de lista de partes pronta já estava ativa.");
			resolve({ pronto: true, origem: "flag_preexistente" });
			return;
		}

		let resolvido = false;
		const finalizar = (resultado) => {
			if (resolvido) return;
			resolvido = true;
			window.removeEventListener(EVENTO_LISTA_PARTES_PRONTA, onPronto);
			clearTimeout(timer);
			resolve(resultado);
		};

		const onPronto = (ev) => {
			finalizar({ pronto: true, origem: "evento", detalhe: ev?.detail || null });
		};

		window.addEventListener(EVENTO_LISTA_PARTES_PRONTA, onPronto, { once: true });
		const timer = setTimeout(() => finalizar({ pronto: false, origem: "timeout" }), timeoutMs);
	});
}

function registrarListenerRecalculo() {
	if (listenerRegistrado) return;
	window.addEventListener(EVENTO_LISTA_PARTES_PRONTA, (ev) => {
		logInfo("Evento de lista de partes pronta recebido para recaptura.", { detalhe: ev?.detail || null });
		capturarDadosProcesso("evento_lista_partes_pronta");
	});
	listenerRegistrado = true;
}

export async function init() {
	logInfo("Init iniciado.");
	registrarListenerRecalculo();

	const temPartesNoDom = Boolean(document.querySelector("#fldPartes, #tblPartesERepresentantes"));
	if (!temPartesNoDom) {
		capturarDadosProcesso("sem_fieldset_partes");
		return;
	}

	logInfo("Aguardando conclusão da lista de partes aprimorada para capturar dados completos.", {
		timeoutMs: TIMEOUT_ESPERA_PARTES_MS
	});
	const espera = await aguardarListaPartesPronta(TIMEOUT_ESPERA_PARTES_MS);
	logInfo("Espera da lista de partes finalizada.", espera);

	if (espera.pronto) capturarDadosProcesso("lista_partes_pronta");
	else capturarDadosProcesso("timeout_lista_partes");
}
