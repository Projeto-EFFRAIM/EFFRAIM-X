import { inserir_aviso_effraim } from "../utils/interface.js";
import { obterConfiguracao } from "../utils/configuracoes.js";
import { localizarUrlMenuEprocPorNome } from "../utils/menus_eproc.js";

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

function normalizarNumero(valor) {
	if (typeof valor === "number" && Number.isFinite(valor)) return valor;
	const n = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

function extrairRotuloItemGrafico(item) {
	if (!item || typeof item !== "object") return "";
	const candidatos = [
		"tipo",
		"Tipo",
		"Valor",
		"valor",
		"situacao",
		"Situação",
		"Situacao",
		"des_susp",
		"descricao",
		"descr"
	];
	for (const chave of candidatos) {
		const v = item[chave];
		if (typeof v === "string" && v.trim()) return v.trim();
	}
	return "";
}

function extrairValorItemGrafico(item) {
	if (!item || typeof item !== "object") return null;
	const candidatos = ["totais", "total", "Total", "qtd", "quantidade", "media"];
	for (const chave of candidatos) {
		const n = normalizarNumero(item[chave]);
		if (n !== null) return n;
	}
	return null;
}

function limparPrefixoNumerado(rotulo = "") {
	return String(rotulo || "").replace(/^\s*\d+\)\s*/, "").trim();
}

function somarItensPorTipo(lista = []) {
	const mapa = new Map();
	for (const item of lista) {
		const rotuloBruto = extrairRotuloItemGrafico(item) || "Total";
		const rotulo = limparPrefixoNumerado(rotuloBruto);
		const valor = extrairValorItemGrafico(item);
		if (!Number.isFinite(valor)) continue;
		mapa.set(rotulo, (mapa.get(rotulo) || 0) + valor);
	}
	return [...mapa.entries()].map(([rotulo, valor]) => ({ rotulo, valor }));
}

function criarGrupoResumo(id, titulo, itens = [], { usarSomaComoTotal = true, totalFixo = null } = {}) {
	const itensValidos = (Array.isArray(itens) ? itens : []).filter((x) => Number.isFinite(Number(x?.valor)));
	if (!itensValidos.length) return null;
	const total = Number.isFinite(totalFixo)
		? Number(totalFixo)
		: (usarSomaComoTotal ? itensValidos.reduce((acc, x) => acc + Number(x.valor), 0) : null);
	return {
		id,
		titulo,
		total,
		itens: itensValidos
	};
}

function resumirGraficosJson(payloadGraficos) {
	if (!payloadGraficos || typeof payloadGraficos !== "object") return [];
	const grafico1 = Array.isArray(payloadGraficos.Grafico1) ? payloadGraficos.Grafico1 : [];
	const grafico3 = Array.isArray(payloadGraficos.Grafico3) ? payloadGraficos.Grafico3 : [];
	const grafico4 = Array.isArray(payloadGraficos.Grafico4) ? payloadGraficos.Grafico4 : [];
	const grafico5 = Array.isArray(payloadGraficos.Grafico5) ? payloadGraficos.Grafico5 : [];
	const grafico6 = Array.isArray(payloadGraficos.Grafico6) ? payloadGraficos.Grafico6 : [];
	const grafico7 = Array.isArray(payloadGraficos.Grafico7) ? payloadGraficos.Grafico7 : [];
	const grafico8 = Array.isArray(payloadGraficos.Grafico8) ? payloadGraficos.Grafico8 : [];
	const grafico9 = Array.isArray(payloadGraficos.Grafico9) ? payloadGraficos.Grafico9 : [];
	const grafico16 = Array.isArray(payloadGraficos.Grafico16) ? payloadGraficos.Grafico16 : [];

	const grupos = [];

	const acervoItens = grafico1.map((item) => ({
		rotulo: extrairRotuloItemGrafico(item),
		valor: extrairValorItemGrafico(item)
	}));
	const grupoAcervo = criarGrupoResumo("Grafico1", "Acervo", acervoItens);
	if (grupoAcervo) grupos.push(grupoAcervo);

	const grupoConclusos = criarGrupoResumo(
		"Grafico3",
		"Conclusos x Não conclusos",
		grafico3.map((item) => ({
			rotulo: extrairRotuloItemGrafico(item),
			valor: extrairValorItemGrafico(item)
		}))
	);
	if (grupoConclusos) grupos.push(grupoConclusos);

	const grupoFase11 = criarGrupoResumo(
		"Grafico4",
		"Conclusos (fase 11)",
		grafico4.map((item) => ({
			rotulo: extrairRotuloItemGrafico(item),
			valor: extrairValorItemGrafico(item)
		}))
	);
	if (grupoFase11) grupos.push(grupoFase11);

	const grupoConclusaoVencidaTipo = criarGrupoResumo(
		"Grafico5",
		"Conclusão vencida",
		somarItensPorTipo(grafico5)
	);
	if (grupoConclusaoVencidaTipo) grupos.push(grupoConclusaoVencidaTipo);

	const grupoParados = criarGrupoResumo(
		"Grafico6",
		"Parados não conclusos",
		grafico6.map((item) => ({
			rotulo: limparPrefixoNumerado(extrairRotuloItemGrafico(item)),
			valor: extrairValorItemGrafico(item)
		}))
	);
	if (grupoParados) grupos.push(grupoParados);

	const grupoEntradas = criarGrupoResumo(
		"Grafico7",
		"Entradas",
		grafico7
			.map((item) => ({
				rotulo: limparPrefixoNumerado(extrairRotuloItemGrafico(item)),
				valor: extrairValorItemGrafico(item)
			}))
			.filter((x) => Number(x.valor) > 0)
	);
	if (grupoEntradas) grupos.push(grupoEntradas);

	const grupoSaidas = criarGrupoResumo(
		"Grafico8",
		"Saídas",
		grafico8
			.map((item) => ({
				rotulo: limparPrefixoNumerado(extrairRotuloItemGrafico(item)),
				valor: extrairValorItemGrafico(item)
			}))
			.filter((x) => Number(x.valor) > 0)
	);
	if (grupoSaidas) grupos.push(grupoSaidas);

	const grupoProdutividade = criarGrupoResumo(
		"Grafico9",
		"Produtividade",
		grafico9.map((item) => ({
			rotulo: extrairRotuloItemGrafico(item),
			valor: extrairValorItemGrafico(item)
		}))
	);
	if (grupoProdutividade) grupos.push(grupoProdutividade);

	const suspensoesTop = grafico16
		.map((item) => ({
			rotulo: String(item?.des_susp || "").trim(),
			valor: normalizarNumero(item?.total),
			totalGeral: normalizarNumero(item?.total_geral)
		}))
		.filter((x) => x.rotulo && Number.isFinite(x.valor))
		.sort((a, b) => Number(b.valor) - Number(a.valor))
		.slice(0, 5);
	const totalSuspensos = suspensoesTop.find((x) => Number.isFinite(x.totalGeral))?.totalGeral ?? null;
	const grupoSuspensoes = criarGrupoResumo(
		"Grafico16",
		"Suspensos (principais motivos)",
		suspensoesTop.map(({ rotulo, valor }) => ({ rotulo, valor })),
		{ totalFixo: totalSuspensos }
	);
	if (grupoSuspensoes) grupos.push(grupoSuspensoes);

	return grupos;
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

function escapeHtml(valor) {
	return String(valor || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function escapeAttr(valor) {
	return escapeHtml(valor);
}

function extrairDataBr(texto = "") {
	const m = String(texto || "").match(/\b\d{2}\/\d{2}\/\d{4}\b/);
	return m ? m[0] : String(texto || "").trim();
}

function extrairNumerosProcessoDeLinhas(linhas = []) {
	const vistos = new Set();
	const lista = [];
	for (const linha of Array.isArray(linhas) ? linhas : []) {
		const bruto = String(linha?.Processo || linha?.processo || "").trim();
		if (!bruto) continue;
		if (vistos.has(bruto)) continue;
		vistos.add(bruto);
		lista.push(bruto);
	}
	return lista;
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
	const linhasFiltradas = aplicarFiltrosDrill(linhasBase, drill.gid, drill.tagsAtivas || []);
	const processos = extrairNumerosProcessoDeLinhas(linhasFiltradas).slice(0, 300);
	if (!processos.length) {
		renderizarDrill(view, drill.titulo || "Drill", linhasBase, "Nenhum processo disponível para enviar ao Relatório Geral.", {
			gid: drill.gid,
			tags: drill.tags || [],
			tagsAtivas: drill.tagsAtivas || []
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

function normalizarTextoComparacao(texto = "") {
	return String(texto || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function normalizarTextoChaveComparacao(texto = "") {
	return normalizarTextoComparacao(texto).replace(/[\/\s_]+/g, "");
}

function obterGidNumericoDoGrupo(idGrupo = "") {
	const m = String(idGrupo || "").match(/Grafico(\d+)/i);
	return m ? Number(m[1]) : null;
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

function classificarFaixaParadosNaoConclusos(tempoDias) {
	const n = Number(tempoDias);
	if (!Number.isFinite(n)) return null;
	if (n <= 30) return "1)<=30";
	if (n <= 60) return "2)>30 e <=60";
	if (n <= 90) return "3)>60 e <=90";
	if (n <= 120) return "4)>90 e <=120";
	if (n <= 150) return "5)>120 e <=150";
	return "6)>150";
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

function extrairTagsFiltroParaGrupo(grupo) {
	if (!grupo || !Array.isArray(grupo.itens)) return [];
	return grupo.itens
		.map((item) => String(item?.rotulo || "").trim())
		.filter(Boolean)
		.slice(0, 12);
}

function linhaCorrespondeFiltroDrill(gid, linha, rotuloTag) {
	const tag = normalizarTextoComparacao(rotuloTag);
	if (!tag) return true;

	if (Number(gid) === 1) {
		const situacao = normalizarTextoComparacao(linha?.["Situação"] || linha?.Situacao || "");
		const classe = normalizarTextoComparacao(linha?.Classe || "");
		if (tag.startsWith("ativo")) return situacao.includes("ativo");
		if (tag.startsWith("suspens")) return situacao.includes("suspens");
		if (tag.startsWith("inquerit")) return classe.includes("inquerit") || situacao.includes("inquerit");
		return situacao.includes(tag) || classe.includes(tag);
	}

	if (Number(gid) === 3) {
		const concluso = normalizarTextoComparacao(linha?.Concluso || "");
		if (tag.includes("nao conclus")) return concluso === "nao" || concluso === "não";
		if (tag.includes("conclus")) return concluso === "sim";
		return false;
	}

	if (Number(gid) === 4 || Number(gid) === 5) {
		const conclusao = normalizarTextoChaveComparacao(linha?.Conclusão || linha?.Conclusao || "");
		const tagConclusao = normalizarTextoChaveComparacao(rotuloTag);
		return conclusao.includes(tagConclusao);
	}

	if (Number(gid) === 6) {
		const faixa = normalizarTextoComparacao(classificarFaixaParadosNaoConclusos(linha?.["Tempo Em Dias"]) || "");
		return faixa === normalizarTextoComparacao(rotuloTag);
	}

	if (Number(gid) === 7 || Number(gid) === 8) {
		const tipo = normalizarTextoComparacao(linha?.Tipo || linha?.tipo || "");
		const tagLimpa = tag.replace(/^[0-9]+\)/, "").trim();
		return tipo.includes(tagLimpa) || tagLimpa.includes(tipo);
	}

	if (Number(gid) === 9) {
		const tipo = normalizarTextoComparacao(linha?.Tipo || linha?.tipo || "");
		return tipo.includes(tag) || tag.includes(tipo);
	}

	// Fallback genérico: tenta casar com qualquer campo textual da linha.
	return Object.values(linha || {}).some((v) => typeof v === "string" && normalizarTextoComparacao(v).includes(tag));
}

function aplicarFiltrosDrill(linhas = [], gid, tagsAtivas = []) {
	if (!Array.isArray(linhas)) return [];
	if (!Array.isArray(tagsAtivas) || !tagsAtivas.length) return linhas;
	return linhas.filter((linha) => tagsAtivas.some((tag) => linhaCorrespondeFiltroDrill(gid, linha, tag)));
}

function renderizarDrill(view, titulo, linhas = [], erro = "", opcoes = {}) {
	if (!view?.drillWrap || !view?.drillTitulo || !view?.drillConteudo) return;
	if (!titulo && !erro) {
		view.drillWrap.style.display = "none";
		view.drillTitulo.textContent = "";
		view.drillConteudo.innerHTML = "";
		return;
	}

	view.drillWrap.style.display = "";
	view.drillTitulo.textContent = titulo || "";
	const tags = Array.isArray(opcoes.tags) ? opcoes.tags : [];
	const tagsAtivas = Array.isArray(opcoes.tagsAtivas) ? opcoes.tagsAtivas : [];

	if (erro) {
		view.drillConteudo.innerHTML = `<div class="effraim-corregedoria__drill-erro">${escapeHtml(erro)}</div>`;
		return;
	}

	const linhasFiltradas = aplicarFiltrosDrill(linhas, opcoes.gid, tagsAtivas);

	const htmlTags = tags.length
		? `<div class="effraim-corregedoria__drill-tags">${
			tags.map((tag) => {
				const ativa = tagsAtivas.includes(tag);
				return `<button type="button" class="effraim-corregedoria__drill-tag${ativa ? " effraim-corregedoria__drill-tag--ativa" : ""}" data-drill-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`;
			}).join("")
		}</div>`
		: "";

	if (!Array.isArray(linhasFiltradas) || !linhasFiltradas.length) {
		view.drillConteudo.innerHTML = `${htmlTags}<div class="effraim-corregedoria__drill-vazio">Sem registros.</div>`;
		return;
	}

	const amostra = linhasFiltradas;
	const colunas = Object.keys(amostra[0] || {});
	const th = colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
	const trs = amostra.map((linha) => {
		const tds = colunas.map((c) => `<td>${escapeHtml(linha?.[c] ?? "")}</td>`).join("");
		return `<tr>${tds}</tr>`;
	}).join("");

	view.drillConteudo.innerHTML = `
		${htmlTags}
		<div class="effraim-corregedoria__drill-meta">${escapeHtml(String(linhasFiltradas.length))} registros${linhasFiltradas.length !== linhas.length ? ` (de ${escapeHtml(String(linhas.length))})` : ""}</div>
		<div class="effraim-corregedoria__drill-tabela-wrap">
			<table class="effraim-corregedoria__drill-tabela">
				<thead><tr>${th}</tr></thead>
				<tbody>${trs}</tbody>
			</table>
		</div>
	`;
}

function criarWidget(wrap) {
	let widget = document.getElementById(ID_WIDGET);
	if (widget) return widget.__effraimView;

	widget = document.createElement("section");
	widget.id = ID_WIDGET;
	widget.className = "effraim-corregedoria-widget";
	widget.innerHTML = `
		<div class="effraim-corregedoria__cabecalho">
			<div>
				<div class="effraim-corregedoria__titulo">Painel da corregedoria TRF2</div>
				<div class="effraim-corregedoria__subtitulo"></div>
			</div>
			<div class="effraim-corregedoria__acoes">
				<button type="button" class="effraim-corregedoria__btn" data-acao="abrir-guia" title="">↗</button>
				<button type="button" class="effraim-corregedoria__btn" data-acao="toggle-iframe" title="">◱</button>
				<button type="button" class="effraim-corregedoria__btn" data-acao="minimizar" title="">—</button>
			</div>
		</div>
		<div class="effraim-corregedoria__alerta" data-role="alerta"></div>
		<div class="effraim-corregedoria__status" data-role="status"></div>
		<div class="effraim-corregedoria__valores" data-role="valores"></div>
		<div class="effraim-corregedoria__drill" data-role="drill" style="display:none;">
			<div class="effraim-corregedoria__drill-cabecalho">
				<div class="effraim-corregedoria__drill-titulo" data-role="drill-titulo"></div>
				<div class="effraim-corregedoria__drill-acoes">
					<button type="button" class="effraim-corregedoria__btn effraim-corregedoria__btn--texto" data-acao="gerar-relatorio-geral" title="">Gerar relatório geral (máximo 300 primeiros)</button>
					<button type="button" class="effraim-corregedoria__btn" data-acao="fechar-drill" title="">×</button>
				</div>
			</div>
			<div class="effraim-corregedoria__drill-conteudo" data-role="drill-conteudo"></div>
		</div>
		<div class="effraim-corregedoria__iframe-wrap" data-role="iframe-wrap">
			<iframe class="effraim-corregedoria__iframe" data-role="iframe"></iframe>
		</div>
	`;
	wrap.appendChild(widget);

	const view = {
		widget,
		titulo: widget.querySelector(".effraim-corregedoria__titulo"),
		subtitulo: widget.querySelector(".effraim-corregedoria__subtitulo"),
		alerta: widget.querySelector('[data-role="alerta"]'),
		status: widget.querySelector('[data-role="status"]'),
		valores: widget.querySelector('[data-role="valores"]'),
		drillWrap: widget.querySelector('[data-role="drill"]'),
		drillTitulo: widget.querySelector('[data-role="drill-titulo"]'),
		drillConteudo: widget.querySelector('[data-role="drill-conteudo"]'),
		iframeWrap: widget.querySelector('[data-role="iframe-wrap"]'),
		iframe: widget.querySelector('[data-role="iframe"]'),
		btnAbrirGuia: widget.querySelector('[data-acao="abrir-guia"]'),
		btnToggleIframe: widget.querySelector('[data-acao="toggle-iframe"]'),
		btnMinimizar: widget.querySelector('[data-acao="minimizar"]'),
		btnFecharDrill: widget.querySelector('[data-acao="fechar-drill"]'),
		btnGerarRelatorioGeral: widget.querySelector('[data-acao="gerar-relatorio-geral"]'),
		iframeVisivel: false,
		minimizado: true,
		modoConfiguracaoManual: false,
		carregando: false,
		resumoCache: null
	};

	const protegerCliqueCabecalho = (handler) => (event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		return handler();
	};

	view.btnToggleIframe?.addEventListener("click", protegerCliqueCabecalho(() => {
		if (view.carregando) return;
		view.iframeVisivel = !view.iframeVisivel;
		view.modoConfiguracaoManual = view.iframeVisivel;
		view.iframeWrap.style.display = view.iframeVisivel ? "" : "none";
		view.btnToggleIframe.textContent = view.iframeVisivel ? "▣" : "◱";
		view.btnToggleIframe.title = "";
		console.log(`${PREFIXO_LOG} Toggle configuracao.`, { iframeVisivel: view.iframeVisivel });
	}));

	view.btnMinimizar?.addEventListener("click", protegerCliqueCabecalho(() => {
		view.minimizado = !view.minimizado;
		view.widget.classList.toggle("effraim-corregedoria-widget--minimizado", view.minimizado);
		view.btnMinimizar.textContent = view.minimizado ? "+" : "—";
		view.btnMinimizar.title = "";
		console.log(`${PREFIXO_LOG} Toggle minimizado.`, { minimizado: view.minimizado });
	}));
	view.widget.classList.add("effraim-corregedoria-widget--minimizado");
	view.btnMinimizar.textContent = "+";
	view.btnMinimizar.title = "";

	view.btnAbrirGuia?.addEventListener("click", async (event) => {
		if (view.carregando) return;
		event?.preventDefault?.();
		event?.stopPropagation?.();
		const favoritos = await lerFavoritosCorregedoria();
		const url = (favoritos.urlFavorita && favoritos.urlFavorita.includes("portaldeestatisticas.trf2.jus.br"))
			? favoritos.urlFavorita
			: montarUrlPainel(favoritos);
		window.open(url, "_blank", "noopener,noreferrer");
		console.log(`${PREFIXO_LOG} Abrir guia.`, { url });
	});

	view.btnFecharDrill?.addEventListener("click", protegerCliqueCabecalho(() => {
		view.__drillAberto = null;
		renderizarDrill(view, "", []);
		renderizarValores(view, view.__gruposResumoAtuais || []);
	}));

	view.btnGerarRelatorioGeral?.addEventListener("click", protegerCliqueCabecalho(() => {
		void abrirRelatorioGeralComProcessos(view).catch((e) => {
			console.warn(`${PREFIXO_LOG} Falha ao abrir Relatório Geral a partir do drill.`, e);
		});
	}));

	view.valores?.addEventListener("click", async (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const card = alvo?.closest?.(".effraim-corregedoria__valor-card[data-gid]");
		if (!card || view.carregando) return;
		event.preventDefault();
		event.stopPropagation();

		const gid = Number(card.getAttribute("data-gid"));
		const titulo = String(card.getAttribute("data-titulo") || "Drill").trim();
		if (!Number.isFinite(gid)) return;
		if (view.__drillAberto?.gid === gid) {
			view.__drillAberto = null;
			renderizarDrill(view, "", []);
			renderizarValores(view, view.__gruposResumoAtuais || []);
			return;
		}

		try {
			const grupo = (view.__gruposResumoAtuais || []).find((g) => Number(obterGidNumericoDoGrupo(g?.id)) === gid) || null;
			const tags = extrairTagsFiltroParaGrupo(grupo);
			view.__drillAberto = { gid, titulo, tags, tagsAtivas: [], linhas: [] };
			renderizarValores(view, view.__gruposResumoAtuais || []);
			renderizarDrill(view, `${titulo}`, [], "", { gid, tags, tagsAtivas: [] });
			view.drillConteudo.innerHTML = `<div class="effraim-corregedoria__drill-carregando">Carregando...</div>`;
			const favoritos = await lerFavoritosCorregedoria();
			const linhas = await carregarDrillGrafico(favoritos, gid);
			if (view.__drillAberto?.gid !== gid) return;
			view.__drillAberto.linhas = linhas;
			renderizarDrill(view, titulo, linhas, "", {
				gid,
				tags: view.__drillAberto.tags || [],
				tagsAtivas: view.__drillAberto.tagsAtivas || []
			});
		} catch (e) {
			console.warn(`${PREFIXO_LOG} Falha no drill da Corregedoria.`, { gid, erro: e });
			renderizarDrill(view, titulo, [], String(e?.message || e || "Falha ao carregar drill"));
		}
	});

	view.drillConteudo?.addEventListener("click", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const tag = alvo?.closest?.("[data-drill-tag]");
		if (!tag || !view.__drillAberto) return;
		event.preventDefault();
		event.stopPropagation();

		const valorTag = String(tag.getAttribute("data-drill-tag") || "").trim();
		if (!valorTag) return;
		const ativas = new Set(view.__drillAberto.tagsAtivas || []);
		if (ativas.has(valorTag)) ativas.delete(valorTag);
		else ativas.add(valorTag);
		view.__drillAberto.tagsAtivas = [...ativas];

		renderizarDrill(
			view,
			view.__drillAberto.titulo || "Drill",
			view.__drillAberto.linhas || [],
			"",
			{
				gid: view.__drillAberto.gid,
				tags: view.__drillAberto.tags || [],
				tagsAtivas: view.__drillAberto.tagsAtivas || []
			}
		);
	});

	view.iframe?.addEventListener("load", () => {
		console.log(`${PREFIXO_LOG} Iframe carregado.`, { src: view.iframe?.src || "" });
	});

	widget.__effraimView = view;
	return view;
}

function renderizarStatus(view, favoritos, _resumo, erro = "") {
	const configurado = !!(favoritos.sec && favoritos.uni);
	const dataAtualizacao = extrairDataBr(_resumo?.dataAtualizacao || "");
	view.subtitulo.textContent = dataAtualizacao || "";
	view.status.innerHTML = "";
	if (erro || !configurado) {
		view.valores.innerHTML = "";
		renderizarDrill(view, "", []);
	}
}

function renderizarValores(view, gruposResumo = []) {
	if (!view?.valores) return;
	view.__gruposResumoAtuais = Array.isArray(gruposResumo) ? gruposResumo : [];
	const formatarValorHumano = (valor) => {
		const n = Number(valor);
		if (!Number.isFinite(n)) return String(valor ?? "");
		if (Number.isInteger(n)) return n.toLocaleString("pt-BR");
		return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
	};
	const blocos = [];
	for (const grupo of gruposResumo) {
		if (!Array.isArray(grupo?.itens) || !grupo.itens.length) continue;
		const titulo = String(grupo.titulo || grupo.id || "").trim();
		const totalGrupo = Number(grupo.total);
		const gid = obterGidNumericoDoGrupo(grupo.id);
		const cardAtivo = Number(view.__drillAberto?.gid) === Number(gid);
		const linhas = grupo.itens
			.slice(0, 8)
			.map((item) => {
				const rotulo = String(item?.rotulo || "Total").trim();
				const total = Number(item?.valor);
				const totalFmt = Number.isFinite(total) ? formatarValorHumano(total) : String(item?.valor ?? "");
				return `<div class="effraim-corregedoria__valor-linha"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(totalFmt)}</strong></div>`;
			})
			.join("");
		blocos.push(`
			<div class="effraim-corregedoria__valor-card${gid ? " effraim-corregedoria__valor-card--clicavel" : ""}${cardAtivo ? " effraim-corregedoria__valor-card--ativo" : ""}"${gid ? ` data-gid="${gid}" data-titulo="${escapeAttr(titulo)}"` : ""}>
				<div class="effraim-corregedoria__valor-titulo">
					${escapeHtml(titulo)}
					${Number.isFinite(totalGrupo) ? `<small class="effraim-corregedoria__valor-total">(${escapeHtml(formatarValorHumano(totalGrupo))})</small>` : ""}
				</div>
				${linhas}
			</div>
		`);
	}
	view.valores.innerHTML = blocos.join("");
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
	await atualizarWidget(view, { forcarResumo: true, forcarIframe: true });

	const virouConfiguradoAgora =
		!assinaturaTemFavoritoCompleto(assinaturaAnterior) &&
		assinaturaTemFavoritoCompleto(assinatura);

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

	const view = criarWidget(wrap);
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
