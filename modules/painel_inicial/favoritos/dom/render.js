import {
	obterFavoritos,
	removerFavorito,
	reordenarItens,
	moverItem,
	removerPasta,
	criarSubpasta
} from "../state.js";
import { obterFavoritos as obterFavoritosEstado } from "../state.js";
import { inserir_aviso_effraim } from "../../../utils/interface.js";
import { ensureFavoritosCss } from "../styles.js";
import {
	localizarLinhaOriginal,
	removerIdsRecursivo,
	sincronizarRelatorio,
	localizarBotaoFavoritoOriginal,
	atualizarIcone,
	ordenarSeNecessario,
	localizarPasta,
	coletarItensRecursivos
} from "./helpers.js";
import { createMenuHandlers } from "./menus.js";

let abrirMenuMoverPastaHandler;
let abrirConfirmExcluirPastaHandler;

function ensureMenuHandlers() {
	if (abrirMenuMoverPastaHandler && abrirConfirmExcluirPastaHandler) return;
	const handlers = createMenuHandlers({
		obterFavoritosEstado,
		moverItem,
		removerPasta,
		ensureFavoritosCss,
		localizarPasta,
		coletarItensRecursivos,
		localizarBotaoFavoritoOriginal,
		atualizarIcone,
		renderizarSecaoFavoritos
	});
	abrirMenuMoverPastaHandler = handlers.abrirMenuMoverPasta;
	abrirConfirmExcluirPastaHandler = handlers.abrirConfirmExcluirPasta;
}

export async function renderizarSecaoFavoritos(tentativa = 1) {
	ensureFavoritosCss();
	ensureMenuHandlers();
	const favs = ordenarSeNecessario(await obterFavoritos());
	document.querySelectorAll("fieldset.infraFieldset[id^='fldFavoritosPainel']").forEach(fs => fs.remove());

	const fieldsets = Array.from(document.querySelectorAll("fieldset.infraFieldset[id^='fld']")).filter(
		fs => fs.id !== "fldFavoritosPainel"
	);
	const alvo = fieldsets[0];
	if (!alvo) {
		if (tentativa < 5) setTimeout(() => renderizarSecaoFavoritos(tentativa + 1), 300);
		return;
	}
	const parent = alvo.parentNode;
	if (!parent) return;
	const referencia = parent.contains(alvo) ? alvo : null;

	const fieldset = document.createElement("fieldset");
	fieldset.id = "fldFavoritosPainel";
	fieldset.className = "infraFieldset";

	const legend = document.createElement("legend");
	legend.className = "infraLegendObrigatorio";
	legend.tabIndex = 0;
	const img = document.createElement("img");
	img.className = "imgAbreFechaElemento";
	img.alt = "Favoritos";
	img.title = "Favoritos";
	img.src = "infra_css/imagens/ver_tudo.gif";
	img.id = "imgFavoritosPainel";
	const ico = document.createElement("img");
	ico.src = chrome.runtime.getURL("assets/icones/painel_inicial_favoritos.png");
	ico.alt = "Favoritos";
	ico.className = "effraim-fav-legend-icon";
	legend.append(img, " ", ico, " Favoritos do Painel");

	const conteudo = document.createElement("div");
	conteudo.id = "conteudoFavoritosPainel";
	conteudo.className = "effraim-pasta-conteudo";

	if (!hasFavoritos(favs)) {
		const vazio = document.createElement("div");
		vazio.textContent = "Você ainda não tem favoritos.";
		vazio.className = "effraim-fav-empty-box";
		conteudo.appendChild(vazio);
	} else {
		if (favs.itens_soltos?.length) {
			conteudo.appendChild(criarTabelaFavoritos("Favoritos", favs.itens_soltos, []));
		}
		(favs.pastas || []).forEach(folder => {
			conteudo.appendChild(criarFieldsetPasta(folder, []));
		});
	}

	fieldset.append(legend, conteudo);
	parent.insertBefore(fieldset, referencia);
}

function hasFavoritos(favs) {
	if (favs.itens_soltos?.length) return true;
	if (favs.pastas?.length) return true;
	return false;
}

function criarTabelaFavoritos(titulo, itens, path) {
	const wrapper = document.createElement("div");
	const tabela = document.createElement("table");
	tabela.width = "99%";
	tabela.className = "infraTable";
	tabela.summary = titulo;

	const tbody = document.createElement("tbody");
	const header = document.createElement("tr");
	const thDesc = document.createElement("th");
	thDesc.width = "70%";
	thDesc.className = "infraTh";
	thDesc.textContent = titulo;
	const thRel = document.createElement("th");
	thRel.className = "infraTh";
	thRel.textContent = "Relatórios";
	const thFav = document.createElement("th");
	thFav.className = "infraTh effraim-fav-head";
	thFav.textContent = "Ações";
	header.append(thDesc, thRel, thFav);
	tbody.appendChild(header);

	(itens || []).forEach(it => {
		const tr = criarLinhaFavorito(it, path);
		if (tr) tbody.appendChild(tr);
	});

	ativarDragAndDrop(tbody, path);

	tabela.appendChild(tbody);
	wrapper.appendChild(tabela);
	return wrapper;
}

function criarFieldsetPasta(folder, pathAtual) {
	const container = document.createElement("div");
	container.className = "effraim-pasta-container";
	if (pathAtual.length > 0) container.classList.add("nested");

	const header = document.createElement("div");
	header.className = "effraim-pasta-header";
	const arrow = document.createElement("span");
	arrow.textContent = "▾";
	arrow.className = "effraim-pasta-arrow";
	const nome = document.createElement("span");
	nome.textContent = folder.nome;
	nome.className = "effraim-pasta-nome";
	header.append(arrow, nome);

	if (pathAtual.length === 0) {
		const btnSubpasta = document.createElement("img");
		btnSubpasta.src = chrome.runtime.getURL("assets/icones/adicionarpasta.png");
		btnSubpasta.alt = "Criar subpasta";
		btnSubpasta.title = "Criar subpasta";
		btnSubpasta.className = "effraim-folder-action-icon add";
		btnSubpasta.onclick = async e => {
			e.stopPropagation();
			const nomeSubpasta = (window.prompt(`Nova subpasta em "${folder.nome}":`) || "").trim();
			if (!nomeSubpasta) return;
			const res = await criarSubpasta([folder.nome], nomeSubpasta);
			if (!res?.ok && res?.motivo === "limite") {
				inserir_aviso_effraim("Limite de favoritos atingido", 6000);
				alert("Limite de favoritos atingido");
				return;
			}
			if (res?.ok && res?.criado) {
				await renderizarSecaoFavoritos();
			}
		};
		header.appendChild(btnSubpasta);
	}

	const btnExcluir = document.createElement("img");
	btnExcluir.src = chrome.runtime.getURL("assets/icones/excluir.png");
	btnExcluir.alt = "Excluir pasta";
	btnExcluir.title = "Excluir pasta";
	btnExcluir.className = "effraim-folder-action-icon delete";
		btnExcluir.onclick = e => {
			e.stopPropagation();
			abrirConfirmExcluirPastaHandler(folder.nome, pathAtual, btnExcluir);
		};
	header.appendChild(btnExcluir);

	const conteudo = document.createElement("div");
	conteudo.className = "effraim-pasta-conteudo";

	if (folder.itens?.length) {
		conteudo.appendChild(criarTabelaFavoritos(folder.nome, folder.itens, [...pathAtual, folder.nome]));
	}
	(folder.pastas || []).forEach(sub => {
		conteudo.appendChild(criarFieldsetPasta(sub, [...pathAtual, folder.nome]));
	});

	header.onclick = () => {
		const aberto = conteudo.style.display !== "none";
		conteudo.style.display = aberto ? "none" : "block";
		arrow.textContent = aberto ? "▸" : "▾";
	};

	container.append(header, conteudo);
	return container;
}

function criarLinhaFavorito(meta, path) {
	const original = localizarLinhaOriginal(meta);
	if (!original) return null;
	const origTds = original.querySelectorAll("td");
	if (origTds.length < 2) return null;

	const tr = document.createElement("tr");
	tr.className = original.className || "";
	tr.draggable = false;
	tr.dataset.id = meta.id;
	tr.dataset.path = path.join("/");

	const tdDesc = document.createElement("td");
	tdDesc.textContent = origTds[0].textContent?.trim() || meta.titulo || "";

	const tdRel = origTds[1].cloneNode(true);
	removerIdsRecursivo(tdRel);
	sincronizarRelatorio(origTds[1], tdRel);

	const tdFav = document.createElement("td");
	tdFav.className = "effraim-fav-cell";

	const img = document.createElement("img");
	img.src = chrome.runtime.getURL("assets/icones/desfavoritar.png");
	img.alt = "Desfavoritar";
	img.title = "Remover dos favoritos";
	img.className = "effraim-action-icon effraim-fav-star-icon";
	img.onclick = async e => {
		e.stopPropagation();
		const removed = await removerFavorito(meta.secaoId, meta.id);
		if (removed) {
			await renderizarSecaoFavoritos();
			const origBtn = localizarBotaoFavoritoOriginal(meta.secaoId, meta.id);
			if (origBtn) atualizarIcone(origBtn, false);
		}
	};
	tdFav.appendChild(img);

	const drag = document.createElement("img");
	drag.src = chrome.runtime.getURL("assets/icones/mover.png");
	drag.alt = "Reordenar";
	drag.title = "Arrastar para reordenar";
	drag.className = "effraim-handle";
	drag.draggable = true;
	drag.addEventListener("dragstart", e => {
		e.dataTransfer.setData("text/plain", JSON.stringify({ id: meta.id, path: path.join("/") }));
		e.dataTransfer.effectAllowed = "move";
		tr.classList.add("effraim-dragging");
	});
	drag.addEventListener("dragend", () => tr.classList.remove("effraim-dragging"));
	tdFav.appendChild(drag);

	const moverPasta = document.createElement("img");
	moverPasta.src = chrome.runtime.getURL("assets/icones/moverpasta.png");
	moverPasta.alt = "Mover para pasta";
	moverPasta.title = "Mover para outra pasta";
	moverPasta.className = "effraim-action-icon";
	moverPasta.addEventListener("click", async e => {
		e.stopPropagation();
		abrirMenuMoverPastaHandler(meta, path, moverPasta);
	});
	tdFav.appendChild(moverPasta);

	tr.append(tdDesc, tdRel, tdFav);
	return tr;
}

function ativarDragAndDrop(tbody, path) {
	const rows = Array.from(tbody.querySelectorAll("tr")).filter(tr => tr.dataset.id);
	rows.forEach(row => {
		row.addEventListener("dragover", e => {
			e.preventDefault();
			const dragging = tbody.querySelector("tr.effraim-dragging");
			if (!dragging || dragging === row) return;
			const rowsArr = Array.from(tbody.querySelectorAll("tr")).filter(r => r.dataset.id);
			const draggingIndex = rowsArr.indexOf(dragging);
			const targetIndex = rowsArr.indexOf(row);
			if (draggingIndex < targetIndex) {
				row.after(dragging);
			} else {
				row.before(dragging);
			}
		});
		row.addEventListener("drop", async e => {
			e.preventDefault();
			const dragging = tbody.querySelector("tr.effraim-dragging");
			if (!dragging) return;
			const novoOrder = Array.from(tbody.querySelectorAll("tr"))
				.filter(r => r.dataset.id)
				.map(r => r.dataset.id);
			const pathArr = (path && path.length)
				? path
				: (dragging.dataset.path ? dragging.dataset.path.split("/").filter(Boolean) : []);
			const ok = await reordenarItens(pathArr, novoOrder);
			if (ok) await renderizarSecaoFavoritos();
		});
	});
}

export async function abrirConfirmExcluirPasta(nome, pathAtual, anchor, onAfterChange = null) {
	ensureMenuHandlers();
	return abrirConfirmExcluirPastaHandler(nome, pathAtual, anchor, onAfterChange);
}
