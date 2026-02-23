(() => {
	const PREFIXO_LOG = "[EFFRAIM corregedoria]";
	const CAMINHO_PAINEL = "/Pages/PainelIndicadores/";

	if (!window.location.href.includes("portaldeestatisticas.trf2.jus.br")) return;
	if (!window.location.pathname.includes(CAMINHO_PAINEL)) return;

	console.log(`${PREFIXO_LOG} Init.`, { url: window.location.href });
	let ultimaChaveLogUrlIncompleta = "";

	function obterParametrosUrl() {
		try {
			const params = new URLSearchParams(window.location.search);
			const sec = String(params.get("sec") || "").trim();
			const uni = String(params.get("uni") || "").trim();
			return { sec, uni };
		} catch (e) {
			console.warn(`${PREFIXO_LOG} Falha ao ler URLSearchParams.`, e);
			return { sec: "", uni: "" };
		}
	}

	function obterRotuloOrgaoSelecionado() {
		const radio = document.querySelector("input[name='orgao']:checked");
		if (!radio) return "";
		const id = radio.getAttribute("id");
		if (!id) return "";
		const label = document.querySelector(`label[for="${id}"]`);
		return String(label?.textContent || "").trim();
	}

	function obterSecSelecionadaNoDom() {
		const radio = document.querySelector("input[name='orgao']:checked");
		return String(radio?.value || "").trim();
	}

	function obterUniSelecionadaNoDom() {
		const select = document.querySelector("#vara");
		return String(select?.value || "").trim();
	}

	function obterDadosUnidadeSelecionada(uniAtual) {
		const select = document.querySelector("#vara");
		if (!select) return { sigla: "", descricao: "" };
		const option =
			[...select.options].find((opt) => String(opt.value || "").trim() === String(uniAtual || "").trim()) ||
			select.options?.[select.selectedIndex] ||
			null;
		if (!option) return { sigla: "", descricao: "" };

		const texto = String(option.textContent || "").trim();
		if (!texto) return { sigla: "", descricao: "" };
		const [sigla, ...resto] = texto.split(" - ");
		return {
			sigla: String(sigla || "").trim(),
			descricao: String(resto.join(" - ") || texto).trim()
		};
	}

	async function carregarApiConfiguracoes() {
		if (!chrome?.runtime?.getURL) throw new Error("chrome.runtime.getURL indisponivel");
		return import(chrome.runtime.getURL("modules/utils/configuracoes.js"));
	}


	async function tentarSalvarFavorito() {
		const { sec, uni } = obterParametrosUrl();
		if (!sec || !uni || uni === "0") {
			const chave = `${window.location.href}|${sec}|${uni}`;
			if (chave !== ultimaChaveLogUrlIncompleta) {
				ultimaChaveLogUrlIncompleta = chave;
				console.log(`${PREFIXO_LOG} URL ainda sem sec/uni final.`, { sec, uni, url: window.location.href });
			}
			return;
		}
		ultimaChaveLogUrlIncompleta = "";

		try {
			const { obterConfiguracao, gravarConfiguracao } = await carregarApiConfiguracoes();
			const [secSalva, uniSalva] = await Promise.all([
				obterConfiguracao("opcoes_corregedoria.sec_favorito"),
				obterConfiguracao("opcoes_corregedoria.uni_favorita")
			]);

			const secAtualSalva = String(secSalva || "").trim();
			const uniAtualSalva = String(uniSalva || "").trim();

			console.log(`${PREFIXO_LOG} Estado atual de favoritos.`, {
				secUrl: sec,
				uniUrl: uni,
				secSalva: secAtualSalva,
				uniSalva: uniAtualSalva
			});

			if (secAtualSalva && uniAtualSalva) {
				console.log(`${PREFIXO_LOG} Favoritos ja definidos; mantendo valores existentes.`);
				return;
			}

			const orgaoRotulo = obterRotuloOrgaoSelecionado();
			const unidade = obterDadosUnidadeSelecionada(uni);

			if (!secAtualSalva) await gravarConfiguracao("opcoes_corregedoria.sec_favorito", sec);
			if (!uniAtualSalva) await gravarConfiguracao("opcoes_corregedoria.uni_favorita", uni);
			await gravarConfiguracao("opcoes_corregedoria.url_favorita", window.location.href);
			if (unidade.sigla) await gravarConfiguracao("opcoes_corregedoria.sigla_unidade_favorita", unidade.sigla);
			if (unidade.descricao) await gravarConfiguracao("opcoes_corregedoria.descricao_unidade_favorita", unidade.descricao);

			window.alert(
				"Aviso: parâmetros da Corregedoria (sec/uni) foram salvos automaticamente. " +
				"Se precisar, apague nas Configurações (Opções Corregedoria)."
			);

			console.log(`${PREFIXO_LOG} Favoritos salvos automaticamente.`, {
				sec,
				uni,
				orgaoRotulo,
				sigla: unidade.sigla,
				descricao: unidade.descricao
			});
		} catch (e) {
			console.warn(`${PREFIXO_LOG} Falha ao salvar favoritos automaticamente.`, e);
		}
	}

	async function tentarSalvarFavoritoPorDom(origem = "dom") {
		const sec = obterSecSelecionadaNoDom();
		const uni = obterUniSelecionadaNoDom();
		if (!sec || !uni || uni === "0") {
			const chave = `dom|${origem}|${sec}|${uni}`;
			if (chave !== ultimaChaveLogUrlIncompleta) {
				ultimaChaveLogUrlIncompleta = chave;
				console.log(`${PREFIXO_LOG} DOM ainda sem sec/uni final.`, { origem, sec, uni });
			}
			return;
		}
		ultimaChaveLogUrlIncompleta = "";

		try {
			const { obterConfiguracao, gravarConfiguracao } = await carregarApiConfiguracoes();
			const [secSalva, uniSalva] = await Promise.all([
				obterConfiguracao("opcoes_corregedoria.sec_favorito"),
				obterConfiguracao("opcoes_corregedoria.uni_favorita")
			]);

			if (String(secSalva || "").trim() && String(uniSalva || "").trim()) return;

			const unidade = obterDadosUnidadeSelecionada(uni);
			const urlConstruida = `${window.location.origin}${window.location.pathname}?sec=${encodeURIComponent(sec)}&uni=${encodeURIComponent(uni)}`;

			if (!String(secSalva || "").trim()) await gravarConfiguracao("opcoes_corregedoria.sec_favorito", sec);
			if (!String(uniSalva || "").trim()) await gravarConfiguracao("opcoes_corregedoria.uni_favorita", uni);
			await gravarConfiguracao("opcoes_corregedoria.url_favorita", urlConstruida);
			if (unidade.sigla) await gravarConfiguracao("opcoes_corregedoria.sigla_unidade_favorita", unidade.sigla);
			if (unidade.descricao) await gravarConfiguracao("opcoes_corregedoria.descricao_unidade_favorita", unidade.descricao);

			console.log(`${PREFIXO_LOG} Favoritos salvos por leitura do DOM (antes da navegacao).`, {
				origem,
				sec,
				uni,
				sigla: unidade.sigla,
				descricao: unidade.descricao
			});
		} catch (e) {
			console.warn(`${PREFIXO_LOG} Falha ao salvar favoritos via DOM.`, { origem, erro: e });
		}
	}

	function agendarTentativasSalvar() {
		setTimeout(() => void tentarSalvarFavorito(), 150);
		setTimeout(() => void tentarSalvarFavorito(), 700);
		setTimeout(() => void tentarSalvarFavorito(), 1600);
	}

	function instalarMonitorUrl() {
		let ultimaHref = window.location.href;
		const verificar = () => {
			const atual = window.location.href;
			if (atual === ultimaHref) return;
			ultimaHref = atual;
			console.log(`${PREFIXO_LOG} Mudanca de URL detectada.`, { url: atual });
			agendarTentativasSalvar();
		};

		const patchHistory = (fnName) => {
			const original = history?.[fnName];
			if (typeof original !== "function") return;
			history[fnName] = function (...args) {
				const out = original.apply(this, args);
				setTimeout(verificar, 0);
				return out;
			};
		};

		patchHistory("pushState");
		patchHistory("replaceState");
		window.addEventListener("popstate", verificar);
	}

	function instalarListenersInteracao() {
		const bindVara = () => {
			const select = document.querySelector("#vara");
			if (!select || select.dataset.effraimCorregBind === "1") return;
			select.dataset.effraimCorregBind = "1";
			select.addEventListener("change", () => {
				console.log(`${PREFIXO_LOG} Alteracao no select #vara detectada.`, {
					valor: String(select.value || "").trim()
				});
				agendarTentativasSalvar();
			});
		};

		const bindSelect2Vara = () => {
			const span = document.querySelector("#select2-vara-container");
			if (!span || span.dataset.effraimCorregSelect2Bind === "1") return;
			span.dataset.effraimCorregSelect2Bind = "1";

			let ultimoTexto = String(span.textContent || "").trim();
			let ultimoTitulo = String(span.getAttribute("title") || "").trim();

			const parecePlaceholder = (texto, titulo) => {
				const base = `${texto} ${titulo}`.toLowerCase();
				if (!base.trim()) return true;
				return (
					base.includes("selecione") ||
					base.includes("selectionar") ||
					base.includes("selecionar") ||
					base.includes("placeholder")
				);
			};

			const reagirMudanca = () => {
				const texto = String(span.textContent || "").trim();
				const titulo = String(span.getAttribute("title") || "").trim();
				if (texto === ultimoTexto && titulo === ultimoTitulo) return;
				ultimoTexto = texto;
				ultimoTitulo = titulo;

				if (!texto && !titulo) return;
				if (parecePlaceholder(texto, titulo)) return;

				console.log(`${PREFIXO_LOG} Select2 da vara mudou para valor final.`, { texto, titulo });
				void tentarSalvarFavoritoPorDom("select2_vara_observer");
				agendarTentativasSalvar();
			};

			const obsSpan = new MutationObserver(reagirMudanca);
			obsSpan.observe(span, {
				characterData: true,
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["title"]
			});
		};

		// Listener em captura para tentar salvar antes do handler da pagina navegar.
		document.addEventListener("change", (evento) => {
			const alvo = evento?.target;
			if (!(alvo instanceof Element)) return;
			if (alvo.matches?.("#vara")) {
				void tentarSalvarFavoritoPorDom("change_capture_vara");
				return;
			}
			if (alvo.matches?.("input[name='orgao']")) {
				void tentarSalvarFavoritoPorDom("change_capture_orgao");
			}
		}, true);

		bindVara();
		bindSelect2Vara();
		const obs = new MutationObserver(() => {
			bindVara();
			bindSelect2Vara();
		});
		obs.observe(document.documentElement, { childList: true, subtree: true });
	}


	// Tenta cedo e novamente apos carregamento dos combos (o select #vara e preenchido via AJAX).
	void tentarSalvarFavorito();
	agendarTentativasSalvar();
	window.addEventListener("load", () => agendarTentativasSalvar());
	instalarMonitorUrl();
	instalarListenersInteracao();
})();
