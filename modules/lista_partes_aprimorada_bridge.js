(() => {
	const LOG_PREFIXO = "[EFFRAIM lista_partes_bridge]";
	const EVENTO_CARREGAR = "EFFRAIM_PARTES_CARREGAR";
	const EVENTO_RESULTADO = "EFFRAIM_PARTES_CARREGAR_RESULT";
	const EVENTO_CANCELAR = "EFFRAIM_PARTES_CANCELAR";
	const EVENTO_CONTINUAR = "EFFRAIM_PARTES_CONTINUAR";

	if (window.__EFFRAIM_LISTA_PARTES_BRIDGE__) {
		console.info(`${LOG_PREFIXO} Bridge já inicializado.`);
		return;
	}
	window.__EFFRAIM_LISTA_PARTES_BRIDGE__ = true;

	let cancelado = false;
	let monitorAjaxInstalado = false;
	let monitorAjaxIndisponivelJaLogado = false;
	let carregarPartesOriginal = null;
	const xhrsAtivos = new Set();

	function logInfo(mensagem, dados) {
		if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
		else console.info(`${LOG_PREFIXO} ${mensagem}`);
	}

	function logWarn(mensagem, dados) {
		if (dados !== undefined) console.warn(`${LOG_PREFIXO} ${mensagem}`, dados);
		else console.warn(`${LOG_PREFIXO} ${mensagem}`);
	}

	function publicarResultado(detail = {}) {
		window.dispatchEvent(new CustomEvent(EVENTO_RESULTADO, { detail }));
	}

	function instalarMonitorAjax() {
		if (monitorAjaxInstalado) return;
		const jq = window.jQuery || window.$;
		if (!jq || typeof jq.ajax !== "function") {
			if (!monitorAjaxIndisponivelJaLogado) {
				monitorAjaxIndisponivelJaLogado = true;
				logInfo("jQuery.ajax indisponível no bridge; monitor de abort ficará desativado neste contexto.");
			}
			return;
		}
		const ajaxOriginal = jq.ajax.bind(jq);
		jq.ajax = function (...args) {
			const xhr = ajaxOriginal(...args);
			if (xhr && typeof xhr.abort === "function") {
				xhrsAtivos.add(xhr);
				const liberar = () => xhrsAtivos.delete(xhr);
				if (typeof xhr.always === "function") xhr.always(liberar);
				else setTimeout(liberar, 20000);
			}
			return xhr;
		};
		monitorAjaxInstalado = true;
		logInfo("Monitor de AJAX instalado.");
	}

	function abortarRequisicoesAtivas() {
		let total = 0;
		for (const xhr of xhrsAtivos) {
			try {
				xhr.abort();
				total += 1;
			} catch {}
		}
		xhrsAtivos.clear();
		logWarn("Requisições AJAX abortadas.", { total });
	}

	function instalarInterceptadorCarregarPartes() {
		if (typeof window.carregarPartes !== "function") return false;
		if (window.__EFFRAIM_WRAPPED_CARREGAR_PARTES__) return true;
		carregarPartesOriginal = window.carregarPartes;
		window.carregarPartes = function (...args) {
			if (cancelado) {
				logWarn("carregarPartes bloqueado por cancelamento.", { args });
				return false;
			}
			return carregarPartesOriginal.apply(this, args);
		};
		window.__EFFRAIM_WRAPPED_CARREGAR_PARTES__ = true;
		logInfo("Interceptador carregarPartes instalado.");
		return true;
	}

	function garantirHooks() {
		instalarMonitorAjax();
		const ok = instalarInterceptadorCarregarPartes();
		if (!ok) {
			logWarn("carregarPartes ainda indisponível; aguardando definição.");
		}
		return ok;
	}

	window.addEventListener(EVENTO_CONTINUAR, () => {
		cancelado = false;
		logInfo("Recebido CONTINUAR.");
		garantirHooks();
	});

	window.addEventListener(EVENTO_CANCELAR, () => {
		cancelado = true;
		logWarn("Recebido CANCELAR.");
		abortarRequisicoesAtivas();
	});

	window.addEventListener(EVENTO_CARREGAR, (ev) => {
		const detail = ev?.detail || {};
		const requestId = detail.requestId;
		const args = Array.isArray(detail.args) ? detail.args : [];
		const tipo = detail.tipo || "DESCONHECIDO";

		garantirHooks();

		if (cancelado) {
			logWarn("Requisição ignorada por cancelamento.", { requestId, tipo, args });
			publicarResultado({ requestId, ok: false, erro: "cancelado" });
			return;
		}

		if (typeof window.carregarPartes !== "function") {
			logWarn("carregarPartes indisponível na hora da requisição.", { requestId, tipo, args });
			publicarResultado({ requestId, ok: false, erro: "carregarPartes_indisponivel" });
			return;
		}

		try {
			window.carregarPartes(...args);
			logInfo("carregarPartes disparado via bridge.", { requestId, tipo, args });
			publicarResultado({ requestId, ok: true });
		} catch (e) {
			logWarn("Falha ao disparar carregarPartes via bridge.", { requestId, tipo, args, erro: e });
			publicarResultado({ requestId, ok: false, erro: String(e) });
		}
	});

	let tentativas = 0;
	const timer = setInterval(() => {
		tentativas += 1;
		const ok = garantirHooks();
		if (ok || tentativas >= 20) {
			clearInterval(timer);
			logInfo("Tentativas iniciais de hook finalizadas.", { tentativas, ok });
		}
	}, 500);

	logInfo("Bridge inicializado.");
})();
