const LOG_PREFIX = "[EFFRAIM acao_flutuante][baixa_definitiva_de_processo]";

function logInfo(msg, data) {
	if (data !== undefined) console.info(`${LOG_PREFIX} ${msg}`, data);
	else console.info(`${LOG_PREFIX} ${msg}`);
}

function obterCandidatosBotao(documento) {
	return Array.from(
		documento.querySelectorAll(
			"button.infraButton, input.infraButton[type='button'], input.infraButton[type='submit'], button[type='submit']"
		)
	).filter((el) => {
		const estilo = documento.defaultView?.getComputedStyle?.(el);
		if (!estilo) return true;
		return estilo.display !== "none" && estilo.visibility !== "hidden";
	});
}

function selecionarBotaoInferior(documento) {
	const candidatos = obterCandidatosBotao(documento);
	if (!candidatos.length) return null;

	const relevantes = candidatos.filter((el) => {
		const txt = `${el.textContent || ""} ${el.value || ""}`.toLowerCase();
		return txt.includes("baix") || txt.includes("confirm");
	});
	const base = relevantes.length ? relevantes : candidatos;

	const ordenados = base
		.map((el) => ({ el, top: el.getBoundingClientRect().top }))
		.sort((a, b) => a.top - b.top);

	return ordenados[ordenados.length - 1].el;
}

function dispararEnter(botao, janela) {
	const eventoBase = {
		key: "Enter",
		code: "Enter",
		bubbles: true,
		cancelable: true
	};
	botao.dispatchEvent(new janela.KeyboardEvent("keydown", eventoBase));
	botao.dispatchEvent(new janela.KeyboardEvent("keypress", eventoBase));
	botao.dispatchEvent(new janela.KeyboardEvent("keyup", eventoBase));
}

function existeFieldsetSucesso(documento) {
	const legends = Array.from(documento.querySelectorAll("fieldset legend"));
	return legends.some((legend) =>
		String(legend.textContent || "")
			.toLowerCase()
			.includes("processos baixados com sucesso")
	);
}

function observarSucessoEFecharGuia(documento, atualizarStatus, solicitarFechamentoGuia) {
	const tentarFechar = async () => {
		if (!existeFieldsetSucesso(documento)) return false;
		atualizarStatus?.("Processos baixados com sucesso. Fechando guia...", "ok");
		logInfo("Fieldset de sucesso detectado. Solicitando fechamento da guia.");
		if (typeof solicitarFechamentoGuia === "function") {
			const resposta = await solicitarFechamentoGuia();
			logInfo("Resposta do fechamento da guia.", resposta || {});
		} else {
			logInfo("Callback de fechamento da guia indisponivel.");
		}
		return true;
	};

	tentarFechar().then((fechou) => {
		if (fechou) return;
		const observador = new MutationObserver(async () => {
			const conseguiu = await tentarFechar();
			if (conseguiu) observador.disconnect();
		});
		observador.observe(documento.body || documento.documentElement, {
			childList: true,
			subtree: true
		});
	});
}

export function criarManipulador() {
	return {
		id: "baixa_definitiva_de_processo",
		titulo: "Baixar",
		transformarUrl({ url }) {
			return url;
		},
		async aoCarregarIframe({ documento, janela, atualizarStatus, solicitarFechamentoGuia }) {
			if (existeFieldsetSucesso(documento)) {
				atualizarStatus?.("Processos baixados com sucesso. Fechando guia...", "ok");
				logInfo("Página de sucesso detectada no carregamento do iframe.");
				// O fechamento deve ser feito no contexto pai (aba que contém o iframe).
				if (typeof solicitarFechamentoGuia === "function") {
					const resposta = await solicitarFechamentoGuia();
					logInfo("Resposta do fechamento da guia (deteccao imediata).", resposta || {});
				}
				return;
			}

			const botao = selecionarBotaoInferior(documento);
			if (!botao) {
				atualizarStatus?.("Botão da ação Baixar não encontrado.", "erro");
				logInfo("Nenhum botão candidato encontrado.");
				return;
			}

			botao.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
			botao.focus();
			logInfo("Botão inferior selecionado para ação Baixar.", {
				texto: (botao.textContent || botao.value || "").trim()
			});

			// Regra solicitada: acionar via Enter com foco no botão.
			dispararEnter(botao, janela);
			atualizarStatus?.("Botão da ação Baixar selecionado e acionado via Enter.", "ok");
			observarSucessoEFecharGuia(
				documento,
				atualizarStatus,
				solicitarFechamentoGuia
			);
		}
	};
}
