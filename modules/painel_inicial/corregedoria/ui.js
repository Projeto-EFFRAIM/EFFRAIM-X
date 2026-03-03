import {
	normalizarTextoComparacao,
	aplicarFiltrosDrill,
	aplicarFiltroDiasDrill,
	aplicarFiltrosColunasDrill
} from "../../utils/corregedoria_drill_filtros.js";
import {
	escapeHtml,
	escapeAttr,
	aplicarFiltroFaixaConclusosDrill,
	resumirGraficosFlutuantesConclusos,
	renderizarMiniBarrasConclusos,
	normalizarNumero,
	corGradienteFaixaPorIndice
} from "./helpers.js";

function posicionarDrillNoSubquadro(view) {
	if (!view?.drillWrap) return;
	if (!view.drillHostPadrao) return;
	if (view.drillWrap.parentElement !== view.drillHostPadrao) {
		view.drillHostPadrao.appendChild(view.drillWrap);
	}

	const gidAtivo = Number(view.__drillAberto?.gid);
	if (!Number.isFinite(gidAtivo)) {
		view.drillWrap.style.top = "";
		return;
	}
	const card = view.valores?.querySelector?.(`.effraim-corregedoria__valor-card[data-gid="${gidAtivo}"]`);
	if (!card) {
		view.drillWrap.style.top = "";
		return;
	}

	const widgetRect = view.widget?.getBoundingClientRect?.();
	const cardRect = card.getBoundingClientRect();
	if (!widgetRect) return;
	const topoRelativo = Math.max(0, (cardRect.bottom - widgetRect.top) + 6);
	view.drillWrap.style.top = `${Math.round(topoRelativo)}px`;
}

function obterGidNumericoDoGrupo(idGrupo = "") {
	const m = String(idGrupo || "").match(/Grafico(\d+)/i);
	return m ? Number(m[1]) : null;
}

export function renderizarDrill(view, titulo, linhas = [], erro = "", opcoes = {}) {
	if (!view?.drillWrap || !view?.drillTitulo || !view?.drillConteudo) return;
	if (!titulo && !erro) {
		view.drillWrap.style.display = "none";
		view.drillTitulo.textContent = "";
		view.drillConteudo.innerHTML = "";
		view.__drillColunasDisponiveis = [];
		view.__drillLinhasFiltradas = [];
		view.__drillCsvColunasSelecionadas = [];
		if (view.csvMenu) view.csvMenu.style.display = "none";
		if (typeof view.__atualizarMenuCsv === "function") view.__atualizarMenuCsv();
		posicionarDrillNoSubquadro(view);
		return;
	}

	view.drillWrap.style.display = "";
	posicionarDrillNoSubquadro(view);
	view.drillTitulo.textContent = titulo || "";
	const tags = Array.isArray(opcoes.tags) ? opcoes.tags : [];
	const tagsAtivas = Array.isArray(opcoes.tagsAtivas) ? opcoes.tagsAtivas : [];
	const diasMin = (opcoes.diasMin === null || opcoes.diasMin === undefined || opcoes.diasMin === "")
		? null
		: (Number.isFinite(Number(opcoes.diasMin)) ? Number(opcoes.diasMin) : null);
	const filtrosColunas = (opcoes.filtrosColunas && typeof opcoes.filtrosColunas === "object")
		? opcoes.filtrosColunas
		: {};
	const buscasColunas = (opcoes.buscasColunas && typeof opcoes.buscasColunas === "object")
		? opcoes.buscasColunas
		: {};
	const faixaConclusos = (opcoes.faixaConclusos && typeof opcoes.faixaConclusos === "object")
		? opcoes.faixaConclusos
		: null;

	if (erro) {
		view.drillConteudo.innerHTML = `<div class="effraim-corregedoria__drill-erro">${escapeHtml(erro)}</div>`;
		view.__drillColunasDisponiveis = [];
		view.__drillLinhasFiltradas = [];
		view.__drillCsvColunasSelecionadas = [];
		if (view.csvMenu) view.csvMenu.style.display = "none";
		if (typeof view.__atualizarMenuCsv === "function") view.__atualizarMenuCsv();
		return;
	}

	let linhasFiltradas = aplicarFiltrosDrill(linhas, opcoes.gid, tagsAtivas);
	linhasFiltradas = aplicarFiltroDiasDrill(linhasFiltradas, diasMin);
	linhasFiltradas = aplicarFiltroFaixaConclusosDrill(linhasFiltradas, Number(opcoes.gid) === 4 ? faixaConclusos : null);
	linhasFiltradas = aplicarFiltrosColunasDrill(linhasFiltradas, filtrosColunas);
	const suportaFiltroDias = [4, 5, 6].includes(Number(opcoes.gid));
	const linhasBaseColunas = aplicarFiltroDiasDrill(aplicarFiltrosDrill(linhas, opcoes.gid, tagsAtivas), diasMin);

	const htmlTags = tags.length
		? `<div class="effraim-corregedoria__drill-filtros">${tags.map((tag) => {
			const ativo = tagsAtivas.includes(tag);
			return `<button type="button" class="effraim-corregedoria__drill-tag${ativo ? " effraim-corregedoria__drill-tag--ativa" : ""}" data-drill-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`;
		}).join("")}</div>`
		: "";
	const htmlFiltroDias = suportaFiltroDias
		? `<div class="effraim-corregedoria__drill-filtros">
			<label class="effraim-corregedoria__drill-filtro-dias">
				<span>Dias mínimos:</span>
				<input type="number" min="0" step="1" data-drill-dias-min value="${diasMin ?? ""}">
				<span>dias</span>
			</label>
		</div>`
		: "";
	const htmlGraficosConclusos = Number(opcoes.gid) === 4 && Array.isArray(linhas) && linhas.length
		? (() => {
			const resumo = resumirGraficosFlutuantesConclusos(linhas);
			resumo.despacho.filtroAtivo = faixaConclusos;
			resumo.sentenca.filtroAtivo = faixaConclusos;
			return `
				<div class="effraim-corregedoria__drill-graficos-flutuantes">
					${renderizarMiniBarrasConclusos(resumo.despacho)}
					${renderizarMiniBarrasConclusos(resumo.sentenca)}
				</div>
			`;
		})()
		: "";
	const htmlFaixaConclusos = Number(opcoes.gid) === 4 && faixaConclusos?.rotulo
		? `<div class="effraim-corregedoria__drill-filtros">
			<button type="button" class="effraim-corregedoria__drill-tag effraim-corregedoria__drill-tag--ativa" data-drill-limpar-faixa-conclusos="1">
				${escapeHtml((faixaConclusos.tipo === "sentenca" ? "Sentença" : "Despacho/Decisão") + " • " + faixaConclusos.rotulo)} ×
			</button>
		</div>`
		: "";

	if (!Array.isArray(linhasFiltradas) || !linhasFiltradas.length) {
		view.drillConteudo.innerHTML = `${htmlGraficosConclusos}${htmlTags}${htmlFaixaConclusos}${htmlFiltroDias}<div class="effraim-corregedoria__drill-vazio">Sem registros.</div>`;
		const colunasSemRegistro = Object.keys((linhasBaseColunas && linhasBaseColunas[0]) || {});
		view.__drillColunasDisponiveis = colunasSemRegistro;
		view.__drillLinhasFiltradas = [];
		if (!Array.isArray(view.__drillCsvColunasSelecionadas) || !view.__drillCsvColunasSelecionadas.length) {
			view.__drillCsvColunasSelecionadas = colunasSemRegistro.length ? [colunasSemRegistro.find((c) => normalizarTextoComparacao(c).includes("processo")) || colunasSemRegistro[0]] : [];
		}
		if (typeof view.__atualizarMenuCsv === "function") view.__atualizarMenuCsv();
		return;
	}

	const amostra = linhasFiltradas;
	const colunas = Object.keys(amostra[0] || {});
	view.__drillColunasDisponiveis = [...colunas];
	view.__drillLinhasFiltradas = [...linhasFiltradas];
	if (!Array.isArray(view.__drillCsvColunasSelecionadas) || !view.__drillCsvColunasSelecionadas.length) {
		view.__drillCsvColunasSelecionadas = [colunas.find((c) => normalizarTextoComparacao(c).includes("processo")) || colunas[0]];
	} else {
		view.__drillCsvColunasSelecionadas = view.__drillCsvColunasSelecionadas.filter((c) => colunas.includes(c));
		if (!view.__drillCsvColunasSelecionadas.length) view.__drillCsvColunasSelecionadas = [colunas.find((c) => normalizarTextoComparacao(c).includes("processo")) || colunas[0]];
	}
	if (typeof view.__atualizarMenuCsv === "function") view.__atualizarMenuCsv();

	const linhaFiltros = colunas.map((coluna) => {
		const valoresDistintos = [...new Set(linhasBaseColunas.map((l) => String(l?.[coluna] ?? "").trim()))]
			.filter((v) => v !== "")
			.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }))
			.slice(0, 500);
		const selecionados = Array.isArray(filtrosColunas?.[coluna])
			? filtrosColunas[coluna].map((v) => String(v ?? "").trim()).filter(Boolean)
			: (String(filtrosColunas?.[coluna] ?? "").trim() ? [String(filtrosColunas[coluna]).trim()] : []);
		const busca = String(buscasColunas?.[coluna] ?? "").trim();
		const buscaNorm = normalizarTextoComparacao(busca);
		const valoresFiltradosBusca = !buscaNorm
			? valoresDistintos
			: valoresDistintos.filter((v) => normalizarTextoComparacao(v).includes(buscaNorm));
		const resumo = selecionados.length ? `${selecionados.length}/${valoresDistintos.length}` : "Todos";
		const opcoesChecklist = valoresFiltradosBusca.map((v) => {
			const checked = selecionados.includes(v);
			return `
				<label class="effraim-corregedoria__drill-coluna-opcao-linha" data-drill-coluna-opcao-linha="${escapeAttr(v)}">
					<input type="checkbox" data-drill-coluna-opcao="${escapeAttr(coluna)}" value="${escapeAttr(v)}"${checked ? " checked" : ""}>
					<span>${escapeHtml(v)}</span>
				</label>
			`;
		}).join("");
		return `
			<th>
				<details class="effraim-corregedoria__drill-coluna-menu" data-drill-coluna-menu="${escapeAttr(coluna)}" data-drill-coluna-total="${valoresDistintos.length}"${selecionados.length ? " open" : ""}>
					<summary class="effraim-corregedoria__drill-coluna-menu-resumo">${escapeHtml(resumo)}</summary>
					<div class="effraim-corregedoria__drill-coluna-menu-painel">
						<input type="text" class="effraim-corregedoria__drill-coluna-busca" data-drill-coluna-busca="${escapeAttr(coluna)}" placeholder="Buscar..." value="${escapeAttr(busca)}">
						<label class="effraim-corregedoria__drill-coluna-opcao-linha effraim-corregedoria__drill-coluna-opcao-linha--todos">
							<input type="checkbox" data-drill-coluna-todos="${escapeAttr(coluna)}"${selecionados.length === 0 ? " checked" : ""}>
							<span>Todos</span>
						</label>
						<div class="effraim-corregedoria__drill-coluna-opcoes">
							${opcoesChecklist || `<div class="effraim-corregedoria__drill-coluna-vazio">Sem valores</div>`}
						</div>
					</div>
				</details>
			</th>
		`;
	}).join("");
	const th = colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
	const trs = amostra.map((linha) => {
		const tds = colunas.map((c) => `<td>${escapeHtml(linha?.[c] ?? "")}</td>`).join("");
		return `<tr>${tds}</tr>`;
	}).join("");

	view.drillConteudo.innerHTML = `
		${htmlGraficosConclusos}
		${htmlTags}
		${htmlFaixaConclusos}
		${htmlFiltroDias}
		<div class="effraim-corregedoria__drill-meta">${escapeHtml(String(linhasFiltradas.length))} registros${linhasFiltradas.length !== linhas.length ? ` (de ${escapeHtml(String(linhas.length))})` : ""}</div>
		<div class="effraim-corregedoria__drill-tabela-wrap">
			<table class="effraim-corregedoria__drill-tabela">
				<thead>
					<tr>${th}</tr>
					<tr class="effraim-corregedoria__drill-filtros-colunas">${linhaFiltros}</tr>
				</thead>
				<tbody>${trs}</tbody>
			</table>
		</div>
	`;
}

export function renderizarStatus(view, favoritos, _resumo, erro = "") {
	const configurado = !!(favoritos.sec && favoritos.uni);
	const dataAtualizacao = String(_resumo?.dataAtualizacao || "").match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || String(_resumo?.dataAtualizacao || "").trim();
	view.subtitulo.textContent = dataAtualizacao || "";
	view.status.innerHTML = "";
	if (erro || !configurado) {
		view.valores.innerHTML = "";
		renderizarDrill(view, "", []);
	}
}

export function renderizarValores(view, gruposResumo = []) {
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
		const itensVisiveis = grupo.itens.slice(0, 8);
		const linhas = Number(gid) === 6
			? (() => {
				const max = Math.max(1, ...itensVisiveis.map((item) => Number(item?.valor)).filter((n) => Number.isFinite(n)));
				return itensVisiveis.map((item) => {
					const idx = itensVisiveis.findIndex((x) => x === item);
					const rotulo = String(item?.rotulo || "Total").trim();
					const total = Number(item?.valor);
					const totalFmt = Number.isFinite(total) ? formatarValorHumano(total) : String(item?.valor ?? "");
					const pct = Number.isFinite(total) ? Math.max(0, Math.min(100, (total / max) * 100)) : 0;
					const corBarra = corGradienteFaixaPorIndice(idx, itensVisiveis.length);
					return `
						<div class="effraim-corregedoria__barra-linha">
							<div class="effraim-corregedoria__barra-rotulo">${escapeHtml(rotulo)}</div>
							<div class="effraim-corregedoria__barra-linha-valores">
								<div class="effraim-corregedoria__barra-preenchimento" style="width:${pct.toFixed(2)}%;background:${escapeAttr(corBarra)}"></div>
								<span class="effraim-corregedoria__barra-valor">${escapeHtml(totalFmt)}</span>
							</div>
						</div>
					`;
				}).join("");
			})()
			: itensVisiveis.map((item) => {
				const rotulo = String(item?.rotulo || "Total").trim();
				const total = Number(item?.valor);
				const totalFmt = Number.isFinite(total) ? formatarValorHumano(total) : String(item?.valor ?? "");
				return `<div class="effraim-corregedoria__valor-linha"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(totalFmt)}</strong></div>`;
			}).join("");
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
	posicionarDrillNoSubquadro(view);
}
