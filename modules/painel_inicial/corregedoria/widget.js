import { inserir_aviso_effraim } from "../../utils/interface.js";
import {
	normalizarTextoComparacao,
	extrairTagsFiltroParaGrupo
} from "../../utils/corregedoria_drill_filtros.js";
import {
	escapeHtml,
	escapeAttr,
	normalizarNomeArquivo,
	construirCsv,
	baixarTextoComoArquivo,
	selecionarColunasPadraoCsv
} from "./helpers.js";

export function criarWidget(wrap, deps) {
	const {
		ID_WIDGET,
		PREFIXO_LOG,
		lerFavoritosCorregedoria,
		montarUrlPainel,
		renderizarDrill,
		renderizarValores,
		abrirRelatorioGeralComProcessos,
		carregarDrillGrafico
	} = deps;

	let widget = document.getElementById(ID_WIDGET);
	if (widget) return widget.__effraimView;

	widget = document.createElement("section");
	widget.id = ID_WIDGET;
	widget.className = "effraim-corregedoria-widget";
	widget.innerHTML = `
		<div class="effraim-corregedoria__cabecalho">
			<div>
				<div class="effraim-corregedoria__titulo">Painel da corregedoria TRF2</div>
				<div class="effraim-corregedoria__subtitulo-wrap">
					<div class="effraim-corregedoria__subtitulo"></div>
					<span class="effraim-corregedoria__carregando-indicador" data-role="carregando-indicador" style="display:none;" aria-hidden="true">⟳</span>
				</div>
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
					<button type="button" class="effraim-corregedoria__btn effraim-corregedoria__btn--texto" data-acao="abrir-exportador-csv" title="">Exportar CSV</button>
					<button type="button" class="effraim-corregedoria__btn effraim-corregedoria__btn--texto" data-acao="gerar-relatorio-geral" title="">Gerar relatório geral (máximo 300 primeiros)</button>
					<button type="button" class="effraim-corregedoria__btn" data-acao="fechar-drill" title="">×</button>
				</div>
			</div>
			<div data-role="csv-menu" style="display:none; border:1px solid #c7d6e0; border-radius:6px; padding:8px; margin:6px 0 8px 0; background:#f7fbff;">
				<div style="font-weight:600; margin-bottom:6px;">Selecione as colunas para exportar</div>
				<div data-role="csv-colunas" style="max-height:180px; overflow:auto; border:1px solid #d9e4ec; border-radius:4px; padding:6px; background:#fff;"></div>
				<div style="margin-top:8px; display:flex; justify-content:flex-end; gap:6px;">
					<button type="button" class="effraim-corregedoria__btn effraim-corregedoria__btn--texto" data-acao="exportar-csv">Exportar</button>
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
		indicadorCarregando: widget.querySelector('[data-role="carregando-indicador"]'),
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
		btnAbrirExportadorCsv: widget.querySelector('[data-acao="abrir-exportador-csv"]'),
		btnGerarRelatorioGeral: widget.querySelector('[data-acao="gerar-relatorio-geral"]'),
		btnExportarCsv: widget.querySelector('[data-acao="exportar-csv"]'),
		csvMenu: widget.querySelector('[data-role="csv-menu"]'),
		csvColunas: widget.querySelector('[data-role="csv-colunas"]'),
		iframeVisivel: false,
		minimizado: true,
		modoConfiguracaoManual: false,
		carregando: false,
		resumoCache: null,
		timerDebounceFiltroDias: null,
		__drillCsvColunasSelecionadas: [],
		__drillColunasDisponiveis: [],
		__drillLinhasFiltradas: [],
		__dataAtualizacaoPainelBr: ""
	};

	const protegerCliqueCabecalho = (handler) => (event) => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		return handler();
	};

	const obterGrupoResumoPorGid = (gid) => {
		const grupos = Array.isArray(view.__gruposResumoAtuais) ? view.__gruposResumoAtuais : [];
		return grupos.find((grupo) => {
			const m = String(grupo?.id || "").match(/Grafico(\d+)/i);
			return Number(m?.[1]) === Number(gid);
		}) || null;
	};

	const renderizarMenuCsv = () => {
		if (!view.csvColunas) return;
		const colunas = Array.isArray(view.__drillColunasDisponiveis) ? view.__drillColunasDisponiveis : [];
		if (!colunas.length) {
			view.csvColunas.innerHTML = `<div class="effraim-corregedoria__drill-coluna-vazio">Sem colunas disponíveis.</div>`;
			return;
		}

		const selecionadas = new Set(
			(Array.isArray(view.__drillCsvColunasSelecionadas) && view.__drillCsvColunasSelecionadas.length
				? view.__drillCsvColunasSelecionadas
				: selecionarColunasPadraoCsv(colunas))
				.filter((c) => colunas.includes(c))
		);

		view.__drillCsvColunasSelecionadas = [...selecionadas];
		view.csvColunas.innerHTML = colunas.map((coluna) => `
			<label style="display:flex; align-items:center; gap:6px; margin:3px 0;">
				<input type="checkbox" data-drill-csv-coluna="${escapeAttr(coluna)}"${selecionadas.has(coluna) ? " checked" : ""}>
				<span>${escapeHtml(coluna)}</span>
			</label>
		`).join("");
	};

	const exportarCsvDrillAtual = () => {
		const colunas = (view.__drillCsvColunasSelecionadas || []).filter(Boolean);
		const linhas = Array.isArray(view.__drillLinhasFiltradas) ? view.__drillLinhasFiltradas : [];
		if (!colunas.length) {
			inserir_aviso_effraim("<strong>Aviso:</strong> selecione ao menos uma coluna para exportar.", 5000, "topo");
			return;
		}
		if (!linhas.length) {
			inserir_aviso_effraim("<strong>Aviso:</strong> não há linhas para exportar no drill atual.", 5000, "topo");
			return;
		}

		const csv = construirCsv(colunas, linhas);
		const titulo = normalizarNomeArquivo(view.__drillAberto?.titulo || "drill");
		const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
		baixarTextoComoArquivo({
			nomeArquivo: `relatorio_geral_${titulo}_${stamp}.csv`,
			conteudo: csv,
			tipo: "text/csv;charset=utf-8"
		});
	};

	view.__atualizarMenuCsv = renderizarMenuCsv;

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

	view.btnAbrirExportadorCsv?.addEventListener("click", protegerCliqueCabecalho(() => {
		if (!view.csvMenu) return;
		const abrindo = view.csvMenu.style.display === "none" || !view.csvMenu.style.display;
		if (abrindo) renderizarMenuCsv();
		view.csvMenu.style.display = abrindo ? "" : "none";
	}));

	view.btnExportarCsv?.addEventListener("click", protegerCliqueCabecalho(() => {
		exportarCsvDrillAtual();
	}));

	view.csvColunas?.addEventListener("change", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const checkbox = alvo?.matches?.("[data-drill-csv-coluna]") ? alvo : null;
		if (!checkbox) return;
		const coluna = String(checkbox.getAttribute("data-drill-csv-coluna") || "").trim();
		if (!coluna) return;
		const atuais = new Set(Array.isArray(view.__drillCsvColunasSelecionadas) ? view.__drillCsvColunasSelecionadas : []);
		if (checkbox.checked) atuais.add(coluna);
		else atuais.delete(coluna);
		view.__drillCsvColunasSelecionadas = [...atuais];
	});

	view.btnGerarRelatorioGeral?.addEventListener("click", protegerCliqueCabecalho(() => {
		void abrirRelatorioGeralComProcessos(view).catch((e) => {
			console.warn(`${PREFIXO_LOG} Falha ao abrir Relatório Geral a partir do drill.`, e);
		});
	}));

	view.valores?.addEventListener("click", async (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		if (alvo?.closest?.(".effraim-corregedoria__drill")) return;
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
			const grupoResumo = obterGrupoResumoPorGid(gid);
			const tags = extrairTagsFiltroParaGrupo(grupoResumo);
			view.__drillAberto = {
				gid,
				titulo,
				tags,
				tagsAtivas: [],
				linhas: [],
				diasMin: null,
				dataBasePainel: view.__dataAtualizacaoPainelBr || "",
				dataVenceAte: "",
				filtrosColunas: {},
				buscasColunas: {},
				faixaConclusos: null
			};
			renderizarValores(view, view.__gruposResumoAtuais || []);
			renderizarDrill(view, `${titulo}`, [], "", {
				gid,
				tags,
				tagsAtivas: [],
				diasMin: null,
				dataBasePainel: view.__dataAtualizacaoPainelBr || "",
				dataVenceAte: "",
				filtrosColunas: {},
				buscasColunas: {},
				faixaConclusos: null
			});
			view.drillConteudo.innerHTML = `<div class="effraim-corregedoria__drill-carregando">Carregando...</div>`;
			const favoritos = await lerFavoritosCorregedoria();
			const linhas = await carregarDrillGrafico(favoritos, gid);
			if (view.__drillAberto?.gid !== gid) return;
			view.__drillAberto.linhas = linhas;
			renderizarDrill(view, titulo, linhas, "", {
				gid,
				tags: view.__drillAberto.tags || [],
				tagsAtivas: view.__drillAberto.tagsAtivas || [],
				diasMin: view.__drillAberto.diasMin,
				dataBasePainel: view.__drillAberto.dataBasePainel || "",
				dataVenceAte: view.__drillAberto.dataVenceAte || "",
				filtrosColunas: view.__drillAberto.filtrosColunas || {},
				buscasColunas: view.__drillAberto.buscasColunas || {},
				faixaConclusos: view.__drillAberto.faixaConclusos || null
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
		renderizarDrill(view, view.__drillAberto.titulo || "Drill", view.__drillAberto.linhas || [], "", {
			gid: view.__drillAberto.gid,
			tags: view.__drillAberto.tags || [],
			tagsAtivas: view.__drillAberto.tagsAtivas || [],
			diasMin: view.__drillAberto.diasMin,
			dataBasePainel: view.__drillAberto.dataBasePainel || "",
			dataVenceAte: view.__drillAberto.dataVenceAte || "",
			filtrosColunas: view.__drillAberto.filtrosColunas || {},
			buscasColunas: view.__drillAberto.buscasColunas || {},
			faixaConclusos: view.__drillAberto.faixaConclusos || null
		});
	});

	view.drillConteudo?.addEventListener("input", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const inputDias = alvo?.matches?.("[data-drill-dias-min]") ? alvo : null;
		if (!inputDias || !view.__drillAberto) return;
		const valorBruto = String(inputDias.value || "").trim();
		if (view.timerDebounceFiltroDias) clearTimeout(view.timerDebounceFiltroDias);
		view.timerDebounceFiltroDias = window.setTimeout(() => {
			view.timerDebounceFiltroDias = null;
			if (!view.__drillAberto) return;
			const valor = Number(valorBruto);
			view.__drillAberto.diasMin = Number.isFinite(valor) ? valor : null;
			renderizarDrill(view, view.__drillAberto.titulo || "Drill", view.__drillAberto.linhas || [], "", {
				gid: view.__drillAberto.gid,
				tags: view.__drillAberto.tags || [],
				tagsAtivas: view.__drillAberto.tagsAtivas || [],
				diasMin: view.__drillAberto.diasMin,
				dataBasePainel: view.__drillAberto.dataBasePainel || "",
				dataVenceAte: view.__drillAberto.dataVenceAte || "",
				filtrosColunas: view.__drillAberto.filtrosColunas || {},
				buscasColunas: view.__drillAberto.buscasColunas || {},
				faixaConclusos: view.__drillAberto.faixaConclusos || null
			});
		}, 2000);
	});

	view.drillConteudo?.addEventListener("change", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const inputVenceAte = alvo?.matches?.("[data-drill-vence-ate]") ? alvo : null;
		if (!inputVenceAte || !view.__drillAberto) return;
		view.__drillAberto.dataVenceAte = String(inputVenceAte.value || "").trim();
		rerenderDrillAtual();
	});

	function rerenderDrillAtual() {
		if (!view.__drillAberto) return;
		renderizarDrill(view, view.__drillAberto.titulo || "Drill", view.__drillAberto.linhas || [], "", {
			gid: view.__drillAberto.gid,
			tags: view.__drillAberto.tags || [],
			tagsAtivas: view.__drillAberto.tagsAtivas || [],
			diasMin: view.__drillAberto.diasMin,
			dataBasePainel: view.__drillAberto.dataBasePainel || "",
			dataVenceAte: view.__drillAberto.dataVenceAte || "",
			filtrosColunas: view.__drillAberto.filtrosColunas || {},
			buscasColunas: view.__drillAberto.buscasColunas || {},
			faixaConclusos: view.__drillAberto.faixaConclusos || null
		});
	}

	function atualizarResumoFiltroColunaEmTempoReal(menu, coluna) {
		if (!menu || !view.__drillAberto) return;
		const resumo = menu.querySelector(".effraim-corregedoria__drill-coluna-menu-resumo");
		const chkTodosMenu = menu.querySelector("[data-drill-coluna-todos]");
		const total = Number(menu.getAttribute("data-drill-coluna-total")) || menu.querySelectorAll("[data-drill-coluna-opcao]").length;
		const selecionados = Array.isArray(view.__drillAberto.filtrosColunas?.[coluna])
			? view.__drillAberto.filtrosColunas[coluna].length
			: 0;

		if (chkTodosMenu) chkTodosMenu.checked = selecionados === 0;
		if (resumo) resumo.textContent = selecionados ? `${selecionados}/${total}` : "Todos";
	}

	view.drillConteudo?.addEventListener("change", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		if (!view.__drillAberto) return;
		const checkTodos = alvo?.matches?.("[data-drill-coluna-todos]") ? alvo : null;
		const checkOpcao = alvo?.matches?.("[data-drill-coluna-opcao]") ? alvo : null;
		if (!checkTodos && !checkOpcao) return;
		const coluna = String(checkTodos?.getAttribute("data-drill-coluna-todos") || checkOpcao?.getAttribute("data-drill-coluna-opcao") || "").trim();
		if (!coluna) return;
		if (!view.__drillAberto.filtrosColunas || typeof view.__drillAberto.filtrosColunas !== "object") {
			view.__drillAberto.filtrosColunas = {};
		}
		const menu = alvo?.closest?.(".effraim-corregedoria__drill-coluna-menu") || null;
		if (checkTodos) {
			delete view.__drillAberto.filtrosColunas[coluna];
			const opcoes = menu?.querySelectorAll?.("[data-drill-coluna-opcao]");
			opcoes?.forEach((opcao) => { opcao.checked = false; });
		} else {
			const valor = String(checkOpcao?.value || "").trim();
			const atuais = new Set(Array.isArray(view.__drillAberto.filtrosColunas[coluna]) ? view.__drillAberto.filtrosColunas[coluna] : []);
			if (checkOpcao.checked) atuais.add(valor);
			else atuais.delete(valor);
			if (atuais.size) view.__drillAberto.filtrosColunas[coluna] = [...atuais];
			else delete view.__drillAberto.filtrosColunas[coluna];
			const chkTodosMenu = menu?.querySelector?.("[data-drill-coluna-todos]");
			if (chkTodosMenu) chkTodosMenu.checked = false;
		}
		atualizarResumoFiltroColunaEmTempoReal(menu, coluna);
		view.__drillFiltrosColunasPendentes = true;
	});

	view.drillConteudo?.addEventListener("toggle", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const menu = alvo?.matches?.(".effraim-corregedoria__drill-coluna-menu") ? alvo : null;
		if (!menu || !view.__drillAberto) return;
		if (menu.hasAttribute("open")) return;
		if (!view.__drillFiltrosColunasPendentes) return;
		view.__drillFiltrosColunasPendentes = false;
		rerenderDrillAtual();
	});

	view.drillConteudo?.addEventListener("input", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		const buscaColuna = alvo?.matches?.("[data-drill-coluna-busca]") ? alvo : null;
		if (!buscaColuna || !view.__drillAberto) return;
		const coluna = String(buscaColuna.getAttribute("data-drill-coluna-busca") || "").trim();
		if (!coluna) return;
		if (!view.__drillAberto.buscasColunas || typeof view.__drillAberto.buscasColunas !== "object") {
			view.__drillAberto.buscasColunas = {};
		}
		const termo = String(buscaColuna.value || "");
		view.__drillAberto.buscasColunas[coluna] = termo;
		const painel = buscaColuna.closest(".effraim-corregedoria__drill-coluna-menu-painel");
		const linhasOpcoes = painel?.querySelectorAll?.("[data-drill-coluna-opcao-linha]");
		if (!linhasOpcoes) return;
		const termoNorm = normalizarTextoComparacao(termo);
		linhasOpcoes.forEach((linha) => {
			const valorLinha = String(linha.getAttribute("data-drill-coluna-opcao-linha") || "");
			const mostrar = !termoNorm || normalizarTextoComparacao(valorLinha).includes(termoNorm);
			linha.style.display = mostrar ? "" : "none";
		});
	});

	view.drillConteudo?.addEventListener("click", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		if (!alvo || !view.__drillAberto) return;
		const btnLimparFaixa = alvo.closest?.("[data-drill-limpar-faixa-conclusos]");
		if (btnLimparFaixa) {
			event.preventDefault();
			event.stopPropagation();
			view.__drillAberto.faixaConclusos = null;
			rerenderDrillAtual();
			return;
		}
		const mini = alvo.closest?.("[data-drill-mini-tipo][data-drill-mini-faixa]");
		if (!mini || Number(view.__drillAberto.gid) !== 4) return;
		event.preventDefault();
		event.stopPropagation();
		const tipo = String(mini.getAttribute("data-drill-mini-tipo") || "").trim();
		const rotulo = String(mini.getAttribute("data-drill-mini-faixa") || "").trim();
		if (!tipo || !rotulo) return;
		const atual = view.__drillAberto.faixaConclusos || {};
		const repetido = atual.tipo === tipo && atual.rotulo === rotulo;
		view.__drillAberto.faixaConclusos = repetido ? null : { tipo, rotulo };
		view.__drillAberto.diasMin = null;
		view.__drillAberto.tagsAtivas = [];
		rerenderDrillAtual();
	});

	document.addEventListener("click", (event) => {
		const alvo = event.target instanceof Element ? event.target : null;
		if (!alvo) return;
		if (!view.drillWrap?.isConnected) return;
		if (view.csvMenu && !alvo.closest("[data-role='csv-menu']") && !alvo.closest("[data-acao='abrir-exportador-csv']")) {
			view.csvMenu.style.display = "none";
		}
		if (alvo.closest(".effraim-corregedoria__drill-coluna-menu")) return;
		const menusAbertos = view.drillConteudo?.querySelectorAll?.(".effraim-corregedoria__drill-coluna-menu[open]");
		menusAbertos?.forEach((menu) => { try { menu.removeAttribute("open"); } catch {} });
		if (view.__drillFiltrosColunasPendentes) {
			view.__drillFiltrosColunasPendentes = false;
			rerenderDrillAtual();
		}
	});

	view.iframe?.addEventListener("load", () => {
		console.log(`${PREFIXO_LOG} Iframe carregado.`, { src: view.iframe?.src || "" });
	});

	widget.__effraimView = view;
	view.drillHostPadrao = view.drillWrap.parentElement;
	return view;
}
