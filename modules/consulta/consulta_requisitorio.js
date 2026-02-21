import { criarPainelDeslizantePadrao, atualizarBadgeRequisitorioBotao, forcarAberturaPainelDeslizante } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";

let iframeRequisitorioCompartilhado = null;
let consultaAutomaticaEmAndamento = false;

function isTutorialMode() {
	try {
		const params = new URLSearchParams(window.location.search);
		return params.get("effraim_tutorial") === "1" || window.EFFRAIM_TUTORIAL_ROUTE === true;
	} catch {
		return window.EFFRAIM_TUTORIAL_ROUTE === true;
	}
}

function renderMockRequisitorio(conteudo, botao) {
	conteudo.innerHTML = "";
	const box = document.createElement("div");
	box.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:center;";

	const info = document.createElement("div");
	info.textContent = "Modo tutorial: visual ilustrativo de Requisitorios.";
	info.style.cssText = "font-weight:600;color:#0d2f4f;";

	const img = document.createElement("img");
	img.id = "effraim-mock-requisitorio-img";
	img.src = chrome.runtime.getURL("ajuda/mock_pages/consulta_processual/mockreq.png");
	img.alt = "Mock da consulta de requisitorios";
	img.style.cssText = "width:100%;max-width:100%;height:auto;border:1px solid #cdd9e4;border-radius:6px;background:#fff;";
	img.addEventListener("error", () => {
		img.style.display = "none";
		const aviso = document.createElement("div");
		aviso.id = "effraim-mock-requisitorio-aviso";
		aviso.textContent = "Imagem mockreq.png nao encontrada. Adicione em ajuda/mock_pages/consulta_processual/mockreq.png.";
		aviso.style.cssText = "padding:10px;border:1px dashed #8aa3b8;border-radius:6px;background:#f8fbff;color:#24445f;";
		box.appendChild(aviso);
	});

	box.append(info, img);
	conteudo.appendChild(box);
	atualizarBadgeRequisitorioBotao(botao, "com", 1);
}

function normalizarTexto(texto = "") {
	return texto
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function normalizarNumeroProcesso(valor = "") {
	return String(valor).replace(/\D/g, "");
}

function aplicarEstiloIframe(iframe, silencioso = false) {
	if (!iframe) return;

	Object.assign(iframe.style, {
		width: "100%",
		height: "100%",
		minHeight: "320px",
		border: "none",
		background: "#fff",
		position: "",
		left: "",
		opacity: "1"
	});

	if (silencioso) {
		iframe.style.width = "1px";
		iframe.style.height = "1px";
		iframe.style.position = "absolute";
		iframe.style.left = "-99999px";
		iframe.style.opacity = "0";
	}
}

function localizarUrlRequisitorios() {
	console.log("[REQUISITORIOS] Iniciando busca do link no menu lateral...");
	const porHref = document.querySelector('a[href*="acao=oficio_requisitorio_listar"]');
	if (porHref) {
		const hrefAttr = porHref.getAttribute("href") || "";
		const url = porHref.href || new URL(hrefAttr.replaceAll("&amp;", "&"), window.location.href).href;
		console.log("[REQUISITORIOS] Link encontrado por href:", {
			hrefOriginal: hrefAttr,
			hrefResolvidoPeloBrowser: porHref.href || "",
			urlResolvida: url,
			ariaLabel: porHref.getAttribute("aria-label") || "",
			texto: (porHref.textContent || "").trim().slice(0, 120)
		});
		return url;
	}

	const alvo = [...document.querySelectorAll("a")]
		.find(a => {
			const aria = normalizarTexto(a.getAttribute("aria-label") || "");
			const texto = normalizarTexto(a.textContent || "");
			return aria.includes("consultar oficio requisitorio") || texto.includes("consultar oficio requisitorio");
		});

	if (alvo) {
		const hrefAttr = alvo.getAttribute("href") || "";
		if (hrefAttr) {
			const url = alvo.href || new URL(hrefAttr.replaceAll("&amp;", "&"), window.location.href).href;
			console.log("[REQUISITORIOS] Link encontrado por texto/aria-label:", {
				hrefOriginal: hrefAttr,
				hrefResolvidoPeloBrowser: alvo.href || "",
				urlResolvida: url,
				ariaLabel: alvo.getAttribute("aria-label") || "",
				texto: (alvo.textContent || "").trim().slice(0, 120)
			});
			return url;
		}
	}

	console.warn("[REQUISITORIOS] Nenhum link de menu para oficio_requisitorio_listar foi encontrado no DOM.");
	return null;
}

function montarUrlRequisitorios() {
	const urlMenu = localizarUrlRequisitorios();
	if (urlMenu) {
		console.log("[REQUISITORIOS] URL final (menu):", urlMenu);
		return urlMenu;
	}

	const atual = new URL(window.location.href);
	const fallback = `${atual.origin}${atual.pathname}?acao=oficio_requisitorio_listar`;
	console.warn("[REQUISITORIOS] URL final (fallback sem hash):", fallback);
	return fallback;
}

function obterNumeroProcesso() {
	const cache = window.__EFFRAIM_DADOS_PROCESSO;
	const numeroCache = cache?.capa?.numProcesso?.trim?.();
	if (numeroCache) {
		console.log("[REQUISITORIOS] Numero do processo obtido do cache global:", numeroCache);
		return numeroCache;
	}

	const dados = consulta_dados_processo();
	const numeroLido = dados?.capa?.numProcesso?.trim?.();
	if (numeroLido) {
		console.log("[REQUISITORIOS] Numero do processo obtido por leitura direta da capa:", numeroLido);
		return numeroLido;
	}

	console.warn("[REQUISITORIOS] Nao foi possivel obter o numero do processo.");
	return "";
}

function deveExecutarConsultaAutomaticaPorLocalizador() {
	const alvosConfigurados =
		window.EFFRAIM_CONFIGURACOES?.opcoes_requisitorio?.localizadores_disparo?.valor;
	const operacaoCfg =
		window.EFFRAIM_CONFIGURACOES?.opcoes_requisitorio?.operacao_logica_localizadores?.valor;
	const alvos = Array.isArray(alvosConfigurados) && alvosConfigurados.length
		? alvosConfigurados
		: ["[REQ]-expedir-requisitorio"];
	const operacao = String(operacaoCfg || "OU").toUpperCase() === "E" ? "E" : "OU";
	const dados = window.__EFFRAIM_DADOS_PROCESSO || consulta_dados_processo();
	const localizadores = Array.isArray(dados?.capa?.localizadores) ? dados.capa.localizadores : [];
	const normalizar = (txt = "") => {
		const div = document.createElement("div");
		div.innerHTML = String(txt);
		const textoVisivel = div.textContent || div.innerText || String(txt);
		return textoVisivel
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9\[\]\-_ ]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
	};

	const normalizados = localizadores.map(normalizar);
	const alvosNormalizados = alvos.map(normalizar).filter(Boolean);
	const deve = alvosNormalizados.length === 0
		? false
		: operacao === "E"
			? alvosNormalizados.every((alvo) => normalizados.includes(alvo))
			: alvosNormalizados.some((alvo) => normalizados.includes(alvo));

	console.log("[REQUISITORIOS] Avaliacao de localizadores para consulta automatica:", {
		operacao,
		alvosConfigurados: alvos,
		localizadores,
		localizadoresNormalizados: normalizados,
		alvosNormalizados,
		deveExecutar: deve
	});

	return deve;
}

function preencherEPesquisarNoIframe(iframe, numeroProcesso, onResultado) {
	if (!numeroProcesso) {
		console.warn("[REQUISITORIOS] Pesquisa automatica cancelada: numero do processo vazio.");
		if (typeof onResultado === "function") {
			onResultado({ numeroProcesso: "", quantidade: 0, haRequisitorio: false, erro: true });
		}
		return;
	}
	if (iframe.dataset.effraimPesquisaStatus === "concluida") {
		console.log("[REQUISITORIOS] Pesquisa automatica ja concluida para este iframe.");
		return;
	}

	if (iframe.__effraimPesquisaTimer) {
		clearInterval(iframe.__effraimPesquisaTimer);
		iframe.__effraimPesquisaTimer = null;
	}

	iframe.dataset.effraimPesquisaStatus = "aguardando";
	let tentativas = 0;
	const maxTentativas = 25;
	const intervalo = 200;

	const timer = setInterval(() => {
		if (iframe.dataset.effraimPesquisaStatus === "concluida") {
			clearInterval(timer);
			iframe.__effraimPesquisaTimer = null;
			return;
		}

		tentativas += 1;
		let doc;
		try {
			doc = iframe.contentDocument || iframe.contentWindow?.document;
		} catch (e) {
			console.warn("[REQUISITORIOS] Sem acesso ao documento do iframe na tentativa", tentativas, e);
			if (tentativas >= maxTentativas) {
				clearInterval(timer);
				iframe.__effraimPesquisaTimer = null;
				iframe.dataset.effraimPesquisaStatus = "falhou";
				if (typeof onResultado === "function") {
					onResultado({ numeroProcesso, quantidade: 0, haRequisitorio: false, erro: true });
				}
			}
			return;
		}

		const campo = doc?.querySelector("#txtNumProcesso");
		const botao = doc?.querySelector("#btnPesquisar");

		if (!campo || !botao) {
			if (tentativas === 1 || tentativas % 5 === 0) {
				console.log("[REQUISITORIOS] Aguardando campo/botao de pesquisa no iframe...", { tentativas });
			}
			if (tentativas >= maxTentativas) {
				clearInterval(timer);
				iframe.__effraimPesquisaTimer = null;
				iframe.dataset.effraimPesquisaStatus = "falhou";
				console.warn("[REQUISITORIOS] Campo #txtNumProcesso ou botao #btnPesquisar nao encontrados no prazo.");
				if (typeof onResultado === "function") {
					onResultado({ numeroProcesso, quantidade: 0, haRequisitorio: false, erro: true });
				}
			}
			return;
		}

		campo.focus();
		campo.value = numeroProcesso;
		campo.dispatchEvent(new Event("input", { bubbles: true }));
		campo.dispatchEvent(new Event("change", { bubbles: true }));
		console.log("[REQUISITORIOS] Campo #txtNumProcesso preenchido:", numeroProcesso);

		iframe.dataset.effraimPesquisaStatus = "concluida";
		botao.click();
		console.log("[REQUISITORIOS] Clique em #btnPesquisar acionado.");
		iniciarLeituraResultado(iframe, numeroProcesso, onResultado);

		clearInterval(timer);
		iframe.__effraimPesquisaTimer = null;
	}, intervalo);
	iframe.__effraimPesquisaTimer = timer;
}

function iniciarLeituraResultado(iframe, numeroProcesso, onResultado) {
	if (iframe.dataset.effraimLeituraStatus === "concluida") return;
	iframe.dataset.effraimLeituraStatus = "aguardando";
	const numeroAlvo = normalizarNumeroProcesso(numeroProcesso);

	let tentativas = 0;
	const maxTentativas = 40;
	const intervalo = 250;

	if (iframe.__effraimLeituraTimer) {
		clearInterval(iframe.__effraimLeituraTimer);
		iframe.__effraimLeituraTimer = null;
	}

	const timer = setInterval(() => {
		tentativas += 1;
		let doc;
		try {
			doc = iframe.contentDocument || iframe.contentWindow?.document;
		} catch (e) {
			if (tentativas >= maxTentativas) {
				clearInterval(timer);
				iframe.__effraimLeituraTimer = null;
				iframe.dataset.effraimLeituraStatus = "falhou";
				console.warn("[REQUISITORIOS] Falha ao ler documento do iframe para apurar resultados.", e);
				if (typeof onResultado === "function") {
					onResultado({ numeroProcesso, quantidade: 0, haRequisitorio: false, erro: true });
				}
			}
			return;
		}

		const tabela = doc?.querySelector("#divInfraAreaTabela");
		if (!tabela) {
			if (tentativas === 1 || tentativas % 8 === 0) {
				console.log("[REQUISITORIOS] Aguardando area de resultados (#divInfraAreaTabela)...", { tentativas });
			}
			if (tentativas >= maxTentativas) {
				clearInterval(timer);
				iframe.__effraimLeituraTimer = null;
				iframe.dataset.effraimLeituraStatus = "falhou";
				console.warn("[REQUISITORIOS] Area de resultados nao apareceu no prazo.");
				if (typeof onResultado === "function") {
					onResultado({ numeroProcesso, quantidade: 0, haRequisitorio: false, erro: true });
				}
			}
			return;
		}

		const linhas = tabela.querySelectorAll('tr[id^="tr_"]');
		const numerosDasLinhas = [...linhas].map((tr) => {
			const linkProcesso = tr.querySelector("td:nth-child(2) a");
			return normalizarNumeroProcesso(linkProcesso?.textContent || "");
		}).filter(Boolean);

		const consultaConcluida =
			linhas.length === 0 ||
			(numerosDasLinhas.length > 0 && numerosDasLinhas.every((num) => num === numeroAlvo));

		if (!consultaConcluida) {
			if (tentativas === 1 || tentativas % 8 === 0) {
				console.log("[REQUISITORIOS] Aguardando finalizacao da pesquisa por processo...", {
					tentativas,
					numeroAlvo,
					amostra: numerosDasLinhas.slice(0, 5)
				});
			}
			if (tentativas >= maxTentativas) {
				clearInterval(timer);
				iframe.__effraimLeituraTimer = null;
				iframe.dataset.effraimLeituraStatus = "falhou";
				console.warn("[REQUISITORIOS] Pesquisa nao convergiu para o processo alvo no prazo.", {
					numeroAlvo,
					numerosDasLinhas: numerosDasLinhas.slice(0, 10)
				});
				if (typeof onResultado === "function") {
					onResultado({ numeroProcesso, quantidade: 0, haRequisitorio: false, erro: true });
				}
			}
			return;
		}

		const quantidade = linhas.length;
		const haRequisitorio = quantidade > 0;
		const resultado = { numeroProcesso, quantidade, haRequisitorio };

		iframe.dataset.effraimLeituraStatus = "concluida";
		iframe.dataset.effraimQtdRequisitorios = String(quantidade);
		iframe.dataset.effraimHaRequisitorio = haRequisitorio ? "S" : "N";

		console.log("[REQUISITORIOS] Resultado da consulta:", resultado);
		if (typeof onResultado === "function") onResultado(resultado);

		clearInterval(timer);
		iframe.__effraimLeituraTimer = null;
	}, intervalo);

	iframe.__effraimLeituraTimer = timer;
}

export function init() {
	const botao = document.getElementById("btn-requisitorio");
	if (!botao) {
		console.warn("Botao #btn-requisitorio nao encontrado.");
		return;
	}

	atualizarBadgeRequisitorioBotao(botao, "carregando");

	const painel = criarPainelDeslizantePadrao("painel-requisitorio", botao, "REQUISITORIOS");
	Object.assign(painel.style, {
		background: "#f6fbff",
		color: "#0d2f4f",
		paddingRight: "12px"
	});

	const conteudo = document.createElement("div");
	conteudo.id = "conteudo-requisitorio";
	conteudo.style.padding = "8px";
	conteudo.textContent = "Aguardando consulta de requisitorios...";
	painel.appendChild(conteudo);

	if (isTutorialMode()) {
		renderMockRequisitorio(conteudo, botao);
		console.log("[REQUISITORIOS] Modo tutorial detectado. Renderizando mock de requisitorios.");
		botao.addEventListener("click", () => {
			forcarAberturaPainelDeslizante(painel);
		});
		console.log("Painel Requisitorios inicializado (tutorial/mock).");
		return;
	}

	const abrirPainel = () => {
		forcarAberturaPainelDeslizante(painel);
	};

	botao.addEventListener("click", () => {
		abrirPainel();
		if (!iframeRequisitorioCompartilhado || !iframeRequisitorioCompartilhado.isConnected) {
			iniciarConsultaAutomaticaNoPainel(conteudo, botao);
		}
	});

	// consulta silenciosa apenas para processos no localizador de expedir requisitorio
	if (deveExecutarConsultaAutomaticaPorLocalizador()) {
		iniciarConsultaAutomaticaNoPainel(conteudo, botao);
	} else {
		atualizarBadgeRequisitorioBotao(botao, "inativo");
		conteudo.textContent = "Consulta automática não realizada. Processo não tem localizador para disparo.";
	}

	console.log("Painel Requisitorios inicializado.");
}

function injetarIframe(conteudo, opcoes = {}) {
	const { silencioso = false, onResultado, onIframeCriado } = opcoes;
	const urlRequisitorios = montarUrlRequisitorios();
	const numeroProcesso = obterNumeroProcesso();
	console.log("[REQUISITORIOS] Preparando iframe com URL:", urlRequisitorios);
	conteudo.innerHTML = "";

	const iframe = document.createElement("iframe");
	iframe.id = silencioso ? "effraim-iframe-requisitorio-auto" : "effraim-iframe-requisitorio";
	iframe.src = urlRequisitorios;
	aplicarEstiloIframe(iframe, silencioso);

	conteudo.appendChild(iframe);
	console.log("[REQUISITORIOS] Iframe inserido no painel:", iframe.id);
	if (typeof onIframeCriado === "function") onIframeCriado(iframe);

	iframe.addEventListener("load", () => {
		let hrefInterno = "";
		let tituloInterno = "";
		try {
			hrefInterno = iframe.contentWindow?.location?.href || "";
			tituloInterno = iframe.contentDocument?.title || "";
		} catch (e) {
			console.warn("[REQUISITORIOS] Nao foi possivel ler location/title do iframe.", e);
		}
		console.log("[REQUISITORIOS] Iframe carregado:", {
			urlSolicitada: urlRequisitorios,
			hrefInterno,
			tituloInterno
		});
		preencherEPesquisarNoIframe(iframe, numeroProcesso, onResultado);
	});

	iframe.addEventListener("error", (e) => {
		console.error("[REQUISITORIOS] Erro no carregamento do iframe.", e);
	});

	if (!urlRequisitorios.includes("hash=")) {
		console.warn("[REQUISITORIOS] URL sem hash do menu; usando fallback:", urlRequisitorios);
	}
}

function iniciarConsultaAutomaticaNoPainel(conteudo, botao) {
	if (consultaAutomaticaEmAndamento) {
		console.log("[REQUISITORIOS] Consulta automatica ja em andamento.");
		return;
	}

	try {
		consultaAutomaticaEmAndamento = true;
		console.log("[REQUISITORIOS] Iniciando consulta automatica no painel.");
		atualizarBadgeRequisitorioBotao(botao, "carregando");

		injetarIframe(conteudo, {
			silencioso: false,
			onIframeCriado: (iframe) => {
				iframeRequisitorioCompartilhado = iframe;
			},
			onResultado: (resultado) => {
				consultaAutomaticaEmAndamento = false;
				if (resultado?.erro) {
					atualizarBadgeRequisitorioBotao(botao, "erro");
					return;
				}
				atualizarBadgeRequisitorioBotao(
					botao,
					resultado.haRequisitorio ? "com" : "sem",
					resultado.quantidade
				);
			}
		});
	} catch (e) {
		consultaAutomaticaEmAndamento = false;
		console.error("[REQUISITORIOS] Falha na consulta automatica no painel.", e);
		atualizarBadgeRequisitorioBotao(botao, "erro");
	}
}
