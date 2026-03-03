import { normalizarTextoComparacao } from "../../utils/corregedoria_drill_filtros.js";

export function normalizarNumero(valor) {
	if (typeof valor === "number" && Number.isFinite(valor)) return valor;
	const n = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

export function extrairRotuloItemGrafico(item) {
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

export function extrairValorItemGrafico(item) {
	if (!item || typeof item !== "object") return null;
	const candidatos = ["totais", "total", "Total", "qtd", "quantidade", "media"];
	for (const chave of candidatos) {
		const n = normalizarNumero(item[chave]);
		if (n !== null) return n;
	}
	return null;
}

export function limparPrefixoNumerado(rotulo = "") {
	return String(rotulo || "").replace(/^\s*\d+\)\s*/, "").trim();
}

export function somarItensPorTipo(lista = []) {
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

export function criarGrupoResumo(id, titulo, itens = [], { usarSomaComoTotal = true, totalFixo = null } = {}) {
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

export function resumirGraficosJson(payloadGraficos) {
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

export function escapeHtml(valor) {
	return String(valor || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function escapeAttr(valor) {
	return escapeHtml(valor);
}

export function normalizarNomeArquivo(texto = "") {
	return String(texto || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9_-]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.toLowerCase() || "relatorio";
}

export function construirCsv(colunas = [], linhas = []) {
	const sep = ";";
	const escapar = (valor) => {
		const txt = String(valor ?? "");
		return `"${txt.replace(/"/g, "\"\"")}"`;
	};
	const cabecalho = colunas.map(escapar).join(sep);
	const corpo = (Array.isArray(linhas) ? linhas : []).map((linha) =>
		colunas.map((coluna) => escapar(linha?.[coluna] ?? "")).join(sep)
	).join("\n");
	return `\uFEFF${cabecalho}\n${corpo}`;
}

export function baixarTextoComoArquivo({ nomeArquivo, conteudo, tipo = "text/plain;charset=utf-8" }) {
	const blob = new Blob([conteudo], { type: tipo });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = nomeArquivo;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function selecionarColunasPadraoCsv(colunas = []) {
	const lista = Array.isArray(colunas) ? colunas : [];
	if (!lista.length) return [];
	const colunaProcesso = lista.find((coluna) => {
		const n = normalizarTextoComparacao(coluna);
		return n.includes("processo");
	});
	return colunaProcesso ? [colunaProcesso] : [lista[0]];
}

export function extrairDataBr(texto = "") {
	const m = String(texto || "").match(/\b\d{2}\/\d{2}\/\d{4}\b/);
	return m ? m[0] : String(texto || "").trim();
}

export function normalizarTipoConclusaoLinha(linha) {
	const valor = normalizarTextoComparacao(linha?.["Conclusão"] || linha?.Conclusao || "");
	if (valor.includes("sentenc")) return "sentenca";
	if (valor.includes("despacho") || valor.includes("decis")) return "despacho";
	return "";
}

export function rotuloFaixaDias(tempo, passo = 15) {
	const n = Number(tempo);
	if (!Number.isFinite(n) || n < 0) return "Sem dias";
	const base = Math.max(1, Number(passo) || 15);
	const inicio = Math.floor(Math.max(0, n - 1) / base) * base + 1;
	const fim = inicio + (base - 1);
	return `${inicio}-${fim}`;
}

export function ordenarRotulosFaixaConclusao(a, b) {
	if (a === "Vencidos") return 1;
	if (b === "Vencidos") return -1;
	if (a === "Sem dias") return 1;
	if (b === "Sem dias") return -1;
	const na = Number(String(a).split("-")[0]);
	const nb = Number(String(b).split("-")[0]);
	if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
	return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

export function parseRotuloFaixaDias(rotulo = "") {
	const m = String(rotulo || "").match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
	if (!m) return null;
	return { min: Number(m[1]), max: Number(m[2]) };
}

export function aplicarFiltroFaixaConclusosDrill(linhas = [], faixaConclusos = null) {
	if (!Array.isArray(linhas)) return [];
	if (!faixaConclusos || typeof faixaConclusos !== "object") return linhas;
	const tipo = String(faixaConclusos.tipo || "").trim();
	const rotulo = String(faixaConclusos.rotulo || "").trim();
	if (!tipo || !rotulo) return linhas;

	return linhas.filter((linha) => {
		const tipoLinha = normalizarTipoConclusaoLinha(linha);
		if (tipoLinha !== tipo) return false;

		const vencido = normalizarTextoComparacao(linha?.Vencido || "") === "sim";
		if (rotulo === "Vencidos") return vencido;
		if (vencido) return false;

		const faixa = parseRotuloFaixaDias(rotulo);
		if (!faixa) return false;
		const tempo = normalizarNumero(linha?.["Tempo Em Dias"]);
		if (!Number.isFinite(tempo)) return false;
		return tempo >= faixa.min && tempo <= faixa.max;
	});
}

export function corGradienteFaixaPorIndice(indice, total, { forcarVermelho = false } = {}) {
	if (forcarVermelho) {
		return "linear-gradient(180deg, #ef9a9a 0%, #e25b5b 100%)";
	}
	const t = total <= 1 ? 0 : Math.max(0, Math.min(1, indice / (total - 1)));
	const hue = Math.round(120 - (120 * t));
	const cor1 = `hsl(${hue} 70% 72%)`;
	const cor2 = `hsl(${hue} 68% 58%)`;
	return `linear-gradient(180deg, ${cor1} 0%, ${cor2} 100%)`;
}

export function resumirGraficosFlutuantesConclusos(linhas = []) {
	const acumuladores = {
		despacho: new Map(),
		sentenca: new Map()
	};

	for (const linha of Array.isArray(linhas) ? linhas : []) {
		const tipo = normalizarTipoConclusaoLinha(linha);
		if (!tipo || !acumuladores[tipo]) continue;
		const vencido = normalizarTextoComparacao(linha?.Vencido || "") === "sim";
		const passo = tipo === "sentenca" ? 30 : 15;
		const rotulo = vencido ? "Vencidos" : rotuloFaixaDias(linha?.["Tempo Em Dias"], passo);
		acumuladores[tipo].set(rotulo, (acumuladores[tipo].get(rotulo) || 0) + 1);
	}

	const montar = (mapa, titulo) => {
		const itens = [...mapa.entries()]
			.map(([rotulo, valor]) => ({ rotulo, valor }))
			.sort((a, b) => ordenarRotulosFaixaConclusao(a.rotulo, b.rotulo));
		return { titulo, itens };
	};

	return {
		despacho: montar(acumuladores.despacho, "Conclusos despacho"),
		sentenca: montar(acumuladores.sentenca, "Conclusos sentença")
	};
}

export function renderizarMiniBarrasConclusos(bloco) {
	const itens = Array.isArray(bloco?.itens) ? bloco.itens : [];
	if (!itens.length) {
		return `
			<div class="effraim-corregedoria__drill-mini-card">
				<div class="effraim-corregedoria__drill-mini-titulo">${escapeHtml(bloco?.titulo || "")}</div>
				<div class="effraim-corregedoria__drill-vazio">Sem dados.</div>
			</div>
		`;
	}

	const max = Math.max(1, ...itens.map((i) => Number(i.valor)).filter((n) => Number.isFinite(n)));
	const linhas = itens.map((item) => {
		const idx = itens.findIndex((x) => x === item);
		const valor = Number(item.valor);
		const pct = Number.isFinite(valor) ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
		const ehVencido = String(item.rotulo || "") === "Vencidos";
		const corBarra = corGradienteFaixaPorIndice(idx, itens.length, { forcarVermelho: ehVencido });
		const tipoData = String(bloco?.titulo || "").toLowerCase().includes("senten") ? "sentenca" : "despacho";
		const ativo = bloco?.filtroAtivo?.tipo === tipoData && bloco?.filtroAtivo?.rotulo === item.rotulo;
		return `
			<button type="button" class="effraim-corregedoria__drill-mini-coluna${ativo ? " effraim-corregedoria__drill-mini-coluna--ativa" : ""}" data-drill-mini-tipo="${escapeAttr(tipoData)}" data-drill-mini-faixa="${escapeAttr(String(item.rotulo))}">
				<div class="effraim-corregedoria__drill-mini-valor">${escapeHtml(String(valor))}</div>
				<div class="effraim-corregedoria__drill-mini-barra-area">
					<div class="effraim-corregedoria__drill-mini-barra" style="height:${pct.toFixed(2)}%;background:${escapeAttr(corBarra)}"></div>
				</div>
				<div class="effraim-corregedoria__drill-mini-rotulo">${escapeHtml(item.rotulo)}</div>
			</button>
		`;
	}).join("");

	return `
		<div class="effraim-corregedoria__drill-mini-card">
			<div class="effraim-corregedoria__drill-mini-titulo">${escapeHtml(bloco.titulo || "")}</div>
			<div class="effraim-corregedoria__drill-mini-corpo effraim-corregedoria__drill-mini-corpo--vertical">${linhas}</div>
		</div>
	`;
}

export function extrairNumerosProcessoDeLinhas(linhas = []) {
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
