import { inserir_aviso_effraim } from "../utils/interface.js";
import { obterConfiguracao } from "../utils/configuracoes.js";
import { localizarUrlMenuEprocPorNome } from "../utils/menus_eproc.js";
import {
	classificarFaixaParadosNaoConclusos,
	normalizarTextoComparacao,
	extrairTagsFiltroParaGrupo,
	aplicarFiltrosDrill,
	aplicarFiltroDiasDrill,
	aplicarFiltrosColunasDrill
} from "../utils/corregedoria_drill_filtros.js";
import {
	normalizarNumero,
	criarGrupoResumo,
	resumirGraficosJson,
	extrairNumerosProcessoDeLinhas
} from "./corregedoria/helpers.js";
import { renderizarDrill, renderizarStatus, renderizarValores } from "./corregedoria/ui.js";
import { criarWidget } from "./corregedoria/widget.js";

const PREFIXO_LOG = "[EFFRAIM corregedoria_painel_inicial]";
const URL_BASE = "https://portaldeestatisticas.trf2.jus.br/Pages/PainelIndicadores/";
const URL_API_BASE = "https://portaldeestatisticas.trf2.jus.br/Pages/PainelIndicadores/IndCorregedoria_Api.aspx";
const URL_GRAFICOS_BASE = "https://portaldeestatisticas.trf2.jus.br/Pages/PainelIndicadores/IndCorregedoria_Graf.aspx";
const ID_WIDGET = "effraim-corregedoria-widget";
const ID_WRAP = "effraim-corregedoria-widget-wrap";
const CHAVE_PREFIXO_RELATORIO_GERAL_PENDENTE = "effraim_relatorio_geral_pendente_";

let timerMonitoramento = null;
let ultimaAssinaturaFavoritos = "";
let listenerStorageInstalado = false;
let timerDebounceStorage = null;

function ehErroContextoExtensaoInvalidado(erro) {
	return String(erro?.message || erro || "").toLowerCase().includes("extension context invalidated");
}

function assinaturaTemFavoritoCompleto(assinatura = "") {
	const [sec, uni] = String(assinatura || "").split("|");
	return !!(String(sec || "").trim() && String(uni || "").trim());
}

function garantirCss() {
	if (document.getElementById("effraim-corregedoria-painel-inicial-css")) return;
	const link = document.createElement("link");
	link.id = "effraim-corregedoria-painel-inicial-css";
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/corregedoria_painel_inicial.css");
	(document.head || document.documentElement).appendChild(link);
}

function setEstadoCarregando(view, carregando) {
	if (!view?.widget) return;
	view.carregando = !!carregando;
	view.widget.classList.toggle("effraim-corregedoria-widget--carregando", !!carregando);
	if (view.indicadorCarregando) {
		view.indicadorCarregando.style.display = carregando ? "" : "none";
	}

	const botoes = [view.btnAbrirGuia, view.btnToggleIframe];
	for (const btn of botoes) {
		if (!btn) continue;
		btn.disabled = !!carregando;
	}
	if (view.btnMinimizar) {
		view.btnMinimizar.textContent = carregando
			? "…"
			: (view.minimizado ? "+" : "—");
	}
}

function obterAncoraInfra() {
	return (
		document.querySelector("#navbar") ||
		document.querySelector("#divInfraBarraLocalizacao") ||
		document.querySelector("#divInfraBarraComandosSuperior") ||
		document.body
	);
}

function garantirWrap() {
	let wrap = document.getElementById(ID_WRAP);
	if (wrap) return wrap;
	const ancora = obterAncoraInfra();
	if (!ancora) return null;

	wrap = document.createElement("div");
	wrap.id = ID_WRAP;
	wrap.className = "effraim-corregedoria-widget-wrap";
	if (ancora === document.body) {
		document.body.prepend(wrap);
	} else {
		ancora.insertAdjacentElement("afterend", wrap);
	}

	return wrap;
}

function montarUrlPainel({ sec, uni } = {}) {
	const params = new URLSearchParams();
	if (sec) params.set("sec", String(sec).trim());
	if (uni) params.set("uni", String(uni).trim());
	const qs = params.toString();
	return qs ? `${URL_BASE}?${qs}` : URL_BASE;
}

async function lerFavoritosCorregedoria() {
	const [sec, uni, sigla, descricao, urlFavorita] = await Promise.all([
		obterConfiguracao("opcoes_corregedoria.sec_favorito"),
		obterConfiguracao("opcoes_corregedoria.uni_favorita"),
		obterConfiguracao("opcoes_corregedoria.sigla_unidade_favorita"),
		obterConfiguracao("opcoes_corregedoria.descricao_unidade_favorita"),
		obterConfiguracao("opcoes_corregedoria.url_favorita")
	]);
	return {
		sec: String(sec || "").trim(),
		uni: String(uni || "").trim(),
		sigla: String(sigla || "").trim(),
		descricao: String(descricao || "").trim(),
		urlFavorita: String(urlFavorita || "").trim()
	};
}

async function fetchTexto(url) {
	return fetchCorregedoriaViaBackground(url, { respostaComo: "text" });
}

async function fetchJson(url) {
	return fetchCorregedoriaViaBackground(url, { respostaComo: "json" });
}

async function fetchCorregedoriaViaBackground(url, { respostaComo = "json", metodo = "GET" } = {}) {
	return new Promise((resolve, reject) => {
		try {
			chrome.runtime.sendMessage(
				{
					type: "EFFRAIM_CORREGEDORIA_FETCH",
					url,
					respostaComo,
					metodo
				},
				(resposta) => {
					const erroRuntime = chrome.runtime.lastError;
					if (erroRuntime) {
						reject(new Error(erroRuntime.message || "runtime_sendMessage_falhou"));
						return;
					}
					if (!resposta?.ok) {
						reject(new Error(String(resposta?.erro || "fetch_corregedoria_falhou")));
						return;
					}
					resolve(resposta.data);
				}
			);
		} catch (e) {
			reject(e);
		}
	});
}

async function carregarResumoRemoto(favoritos) {
	if (!favoritos?.sec || !favoritos?.uni) return null;
	const urlAtualizacao = `${URL_API_BASE}?op=a&sec=${encodeURIComponent(favoritos.sec)}`;
	const urlHistorico = `${URL_API_BASE}?op=o&uni=${encodeURIComponent(favoritos.uni)}`;
	const [dataAtualizacao, historico] = await Promise.all([
		fetchTexto(urlAtualizacao).catch(() => ""),
		fetchJson(urlHistorico).catch(() => [])
	]);
	return {
		dataAtualizacao: String(dataAtualizacao || "").trim(),
		linkHistorico: Array.isArray(historico) ? String(historico?.[0]?.link || "").trim() : ""
	};
}

function obterMesAtualPainel() {
	const agora = new Date();
	const ano = agora.getFullYear();
	const mes = agora.getMonth() + 1; // sem zero à esquerda, como no portal (ex.: 2026_2)
	return `${ano}_${mes}`;
}

async function carregarValoresGraficos(favoritos) {
	if (!favoritos?.uni) return [];
	const uni = encodeURIComponent(favoritos.uni);
	const mes = encodeURIComponent(obterMesAtualPainel());
	const url = `${URL_GRAFICOS_BASE}?gid=t&uni=${uni}&mes=${mes}`;
	try {
		const json = await fetchCorregedoriaViaBackground(url, { respostaComo: "json", metodo: "POST" });
		const grupos = resumirGraficosJson(json);
		return await substituirParadosNaoConclusosSemPrazoAberto(grupos, favoritos);
	} catch (e) {
		console.warn(`${PREFIXO_LOG} Falha ao carregar JSON de graficos da Corregedoria.`, { url, erro: String(e?.message || e) });
		return [];
	}
}

function obterUrlRelatorioGeralPainelInicial() {
	return (
		localizarUrlMenuEprocPorNome("Relatório Geral", {
			hrefContem: "acao=relatorio_geral",
			prefixoLog: PREFIXO_LOG
		}) ||
		""
	);
}

async function salvarPayloadRelatorioGeralPendente(payload) {
	const token = `rg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const chave = `${CHAVE_PREFIXO_RELATORIO_GERAL_PENDENTE}${token}`;
	await chrome.storage.local.set({
		[chave]: {
			...payload,
			token,
			criadoEm: new Date().toISOString()
		}
	});
	return { token, chave };
}

async function abrirRelatorioGeralComProcessos(view) {
	const drill = view?.__drillAberto;
	if (!drill?.gid) return;
	const linhasBase = Array.isArray(drill.linhas) ? drill.linhas : [];
	let linhasFiltradas = aplicarFiltrosDrill(linhasBase, drill.gid, drill.tagsAtivas || []);
	linhasFiltradas = aplicarFiltroDiasDrill(linhasFiltradas, drill.diasMin);
	linhasFiltradas = aplicarFiltroFaixaConclusosDrill(linhasFiltradas, drill.faixaConclusos || null);
	linhasFiltradas = aplicarFiltrosColunasDrill(linhasFiltradas, drill.filtrosColunas || {});
	const processos = extrairNumerosProcessoDeLinhas(linhasFiltradas).slice(0, 300);
	if (!processos.length) {
		renderizarDrill(view, drill.titulo || "Drill", linhasBase, "Nenhum processo disponível para enviar ao Relatório Geral.", {
			gid: drill.gid,
			tags: drill.tags || [],
			tagsAtivas: drill.tagsAtivas || []
			,
			diasMin: drill.diasMin,
			filtrosColunas: drill.filtrosColunas || {},
			buscasColunas: drill.buscasColunas || {}
		});
		return;
	}

	const urlBase = obterUrlRelatorioGeralPainelInicial();
	if (!urlBase) {
		console.warn(`${PREFIXO_LOG} Link do campo Relatório Geral não encontrado no painel inicial.`);
		return;
	}

	const { token } = await salvarPayloadRelatorioGeralPendente({
		tipo: "corregedoria_drill",
		origem: {
			gid: drill.gid,
			titulo: drill.titulo || "",
			tagsAtivas: drill.tagsAtivas || []
		},
		processos
	});

	const url = new URL(urlBase, window.location.origin);
	url.hash = `effraim_relatorio_lote=${encodeURIComponent(token)}`;
	window.open(url.toString(), "_blank", "noopener,noreferrer");
	console.log(`${PREFIXO_LOG} Abrindo Relatório Geral com lote de processos.`, {
		total: processos.length,
		gid: drill.gid,
		token
	});
}

async function carregarDrillGrafico(favoritos, gid) {
	if (!favoritos?.uni || !Number.isFinite(Number(gid))) return [];
	const params = new URLSearchParams({
		op: "dg",
		uni: String(favoritos.uni),
		gid: String(Number(gid))
	});
	const mes = obterMesAtualPainel();
	if ([7, 8, 9].includes(Number(gid))) params.set("mes", mes);
	if (Number(gid) === 6) {
		params.set("mes", "0");
		params.set("pzaberto", "Não");
		params.set("numgrafpremio", "0");
	}
	const url = `${URL_API_BASE}?${params.toString()}`;
	const dados = await fetchJson(url);
	return Array.isArray(dados) ? dados : [];
}

async function carregarGrupoParadosNaoConclusosSemPrazoAberto(favoritos) {
	if (!favoritos?.uni) return null;
	const params = new URLSearchParams({
		op: "dg",
		uni: String(favoritos.uni),
		gid: "6",
		mes: "0",
		pzaberto: "Não",
		numgrafpremio: "0"
	});
	const url = `${URL_API_BASE}?${params.toString()}`;
	const lista = await fetchJson(url);
	if (!Array.isArray(lista)) return null;

	const ordem = [
		"1)<=30",
		"2)>30 e <=60",
		"3)>60 e <=90",
		"4)>90 e <=120",
		"5)>120 e <=150",
		"6)>150"
	];
	const contadores = new Map(ordem.map((k) => [k, 0]));

	for (const item of lista) {
		const faixa = classificarFaixaParadosNaoConclusos(item?.["Tempo Em Dias"]);
		if (!faixa) continue;
		contadores.set(faixa, (contadores.get(faixa) || 0) + 1);
	}

	const itens = ordem.map((rotulo) => ({ rotulo, valor: contadores.get(rotulo) || 0 }));
	return criarGrupoResumo("Grafico6", "Parados não conclusos (sem prazo aberto)", itens);
}

async function substituirParadosNaoConclusosSemPrazoAberto(grupos, favoritos) {
	if (!Array.isArray(grupos)) return [];
	try {
		const grupoSemPrazo = await carregarGrupoParadosNaoConclusosSemPrazoAberto(favoritos);
		if (!grupoSemPrazo) return grupos;
		const idx = grupos.findIndex((g) => String(g?.id || "") === "Grafico6");
		if (idx >= 0) {
			const copia = [...grupos];
			copia[idx] = grupoSemPrazo;
			return copia;
		}
		return [...grupos, grupoSemPrazo];
	} catch (e) {
		console.warn(`${PREFIXO_LOG} Falha ao ajustar Grafico6 para sem prazo aberto.`, e);
		return grupos;
	}
}

function atualizarIframe(view, favoritos, { forcar = false } = {}) {
	const urlDesejada = (favoritos.urlFavorita && favoritos.urlFavorita.includes("portaldeestatisticas.trf2.jus.br"))
		? favoritos.urlFavorita
		: montarUrlPainel(favoritos);
	if (!forcar && view.iframe.src === urlDesejada) return;
	view.iframe.src = urlDesejada;
	console.log(`${PREFIXO_LOG} Atualizando iframe.`, { url: urlDesejada });
}

async function atualizarWidget(view, { forcarResumo = false, forcarIframe = false } = {}) {
	const favoritos = await lerFavoritosCorregedoria();
	const assinatura = `${favoritos.sec}|${favoritos.uni}|${favoritos.urlFavorita}`;
	let erro = "";
	let resumo = view.resumoCache;
	let valoresGraficos = view.__valoresGraficosCache || [];

	if (forcarResumo || assinatura !== view.__ultimaAssinaturaResumo) {
		try {
			const [resumoNovo, valoresNovos] = await Promise.all([
				carregarResumoRemoto(favoritos),
				carregarValoresGraficos(favoritos)
			]);
			resumo = resumoNovo;
			valoresGraficos = valoresNovos;
			view.resumoCache = resumo;
			view.__valoresGraficosCache = valoresGraficos;
			view.__ultimaAssinaturaResumo = assinatura;
		} catch (e) {
			erro = String(e?.message || e || "Falha ao consultar Corregedoria");
			console.warn(`${PREFIXO_LOG} Falha ao carregar resumo.`, e);
		}
	}

	renderizarStatus(view, favoritos, resumo, erro);
	renderizarValores(view, valoresGraficos);
	view.alerta.textContent = "";

	const configurado = !!(favoritos.sec && favoritos.uni);
	if (configurado && !view.modoConfiguracaoManual) {
		view.iframeVisivel = false;
		view.iframeWrap.style.display = "none";
		view.btnToggleIframe.textContent = "◱";
		view.btnToggleIframe.title = "";
	}
	if (!configurado) {
		view.iframeVisivel = true;
		view.modoConfiguracaoManual = true;
		view.iframeWrap.style.display = "";
		view.btnToggleIframe.textContent = "▣";
		view.btnToggleIframe.title = "";
	}
	if (!configurado) renderizarDrill(view, "", []);

	if (view.iframeVisivel) {
		atualizarIframe(view, favoritos, { forcar: forcarIframe });
	}
	return favoritos;
}

async function sincronizarWidgetSeFavoritosMudaram(view, { origem = "desconhecida" } = {}) {
	const favoritos = await lerFavoritosCorregedoria();
	const assinatura = `${favoritos.sec}|${favoritos.uni}|${favoritos.urlFavorita}`;
	const assinaturaAnterior = ultimaAssinaturaFavoritos;

	const vazio = !favoritos.sec && !favoritos.uni && !favoritos.urlFavorita;
	if (vazio) {
		if (!assinaturaAnterior) return;
		ultimaAssinaturaFavoritos = "";
		await atualizarWidget(view, { forcarResumo: true, forcarIframe: true });
		return;
	}

	if (assinatura === assinaturaAnterior) return;
	ultimaAssinaturaFavoritos = assinatura;
	setEstadoCarregando(view, true);
	try {
		await atualizarWidget(view, { forcarResumo: true, forcarIframe: true });
	} finally {
		setEstadoCarregando(view, false);
	}

	const virouConfiguradoAgora =
		!assinaturaTemFavoritoCompleto(assinaturaAnterior) &&
		assinaturaTemFavoritoCompleto(assinatura);

	// Primeira configuração pode ocorrer enquanto a página/armazenamento ainda estabiliza.
	// Faz algumas retentativas curtas para evitar quadro vazio no primeiro uso.
	if (virouConfiguradoAgora) {
		if (view.__timerRetentativasPrimeiraCarga) {
			clearTimeout(view.__timerRetentativasPrimeiraCarga);
			view.__timerRetentativasPrimeiraCarga = null;
		}
		const semValores = !Array.isArray(view.__valoresGraficosCache) || view.__valoresGraficosCache.length === 0;
		if (semValores) {
			let tentativa = 0;
			const tentar = async () => {
				tentativa += 1;
				try {
					setEstadoCarregando(view, true);
					await atualizarWidget(view, { forcarResumo: true, forcarIframe: false });
				} catch (e) {
					console.warn(`${PREFIXO_LOG} Retentativa da primeira carga da Corregedoria falhou.`, { tentativa, erro: e });
				} finally {
					setEstadoCarregando(view, false);
				}
				const aindaSemValores = !Array.isArray(view.__valoresGraficosCache) || view.__valoresGraficosCache.length === 0;
				if (aindaSemValores && tentativa < 3) {
					view.__timerRetentativasPrimeiraCarga = window.setTimeout(() => { void tentar(); }, 1200);
				} else {
					view.__timerRetentativasPrimeiraCarga = null;
				}
			};
			view.__timerRetentativasPrimeiraCarga = window.setTimeout(() => { void tentar(); }, 500);
		}
	}

	if (virouConfiguradoAgora) {
		inserir_aviso_effraim(
			"<strong>Aviso (Corregedoria):</strong> favoritos (sec/uni) salvos automaticamente. Se precisar, apague nas Configurações.",
			7000,
			"topo"
		);
		console.log(`${PREFIXO_LOG} Favoritos detectados e quadro atualizado.`, { origem, assinatura });
	}
}

function iniciarMonitoramento(view) {
	if (timerMonitoramento) return;
	timerMonitoramento = window.setInterval(async () => {
		try {
			await sincronizarWidgetSeFavoritosMudaram(view, { origem: "monitor" });
		} catch (e) {
			if (ehErroContextoExtensaoInvalidado(e)) {
				console.debug(`${PREFIXO_LOG} Contexto da extensao invalidado; encerrando monitoramento antigo.`);
				clearInterval(timerMonitoramento);
				timerMonitoramento = null;
				return;
			}
			console.warn(`${PREFIXO_LOG} Erro no monitoramento.`, e);
		}
	}, 3000);
}

function instalarListenerStorage(view) {
	if (listenerStorageInstalado) return;
	if (!chrome?.storage?.onChanged?.addListener) return;

	chrome.storage.onChanged.addListener((changes, areaName) => {
		if (areaName !== "sync") return;
		const chaves = Object.keys(changes || {});
		const tocouConfigCorregedoria =
			chaves.includes("effraim_cfg_index_v1") ||
			chaves.some((k) => k.startsWith("effraim_cfg_sec__")) ||
			chaves.includes("effraim_configuracoes");
		if (!tocouConfigCorregedoria) return;

		if (timerDebounceStorage) clearTimeout(timerDebounceStorage);
		timerDebounceStorage = window.setTimeout(() => {
			timerDebounceStorage = null;
			void sincronizarWidgetSeFavoritosMudaram(view, { origem: "storage.onChanged" })
				.catch((e) => console.warn(`${PREFIXO_LOG} Falha ao reagir a storage.onChanged.`, e));
		}, 250);
	});

	listenerStorageInstalado = true;
}

export async function init() {
	garantirCss();
	const wrap = garantirWrap();
	if (!wrap) {
		console.warn(`${PREFIXO_LOG} Nao foi possivel criar area do quadro.`);
		return;
	}

	const view = criarWidget(wrap, {
		ID_WIDGET,
		PREFIXO_LOG,
		lerFavoritosCorregedoria,
		montarUrlPainel,
		renderizarDrill,
		renderizarValores,
		abrirRelatorioGeralComProcessos,
		carregarDrillGrafico
	});
	setEstadoCarregando(view, true);
	setTimeout(() => {
		// failsafe visual: nao deixa o botao de minimizar preso em "..." se a carga atrasar/travar
		if (view.carregando) setEstadoCarregando(view, false);
	}, 5000);
	void atualizarWidget(view, { forcarResumo: true, forcarIframe: true })
		.then((favoritos) => {
			ultimaAssinaturaFavoritos = `${favoritos?.sec || ""}|${favoritos?.uni || ""}|${favoritos?.urlFavorita || ""}`;
		})
		.catch((e) => {
			console.warn(`${PREFIXO_LOG} Falha na carga inicial do quadro.`, e);
		})
		.finally(() => {
			setEstadoCarregando(view, false);
		});
	instalarListenerStorage(view);
	iniciarMonitoramento(view);
	console.log(`${PREFIXO_LOG} Quadro perene inicializado.`);
}

