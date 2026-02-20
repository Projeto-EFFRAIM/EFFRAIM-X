import { obterFavoritos, moverItem, reordenarPastas, criarPastaRaiz, criarSubpasta } from "./state.js";
import { renderizarSecaoFavoritos, abrirConfirmExcluirPasta } from "./dom.js";
import { inserir_aviso_effraim } from "../../utils/interface.js";
import { ensureFavoritosCss } from "./styles.js";

let painelRef = null;
let anchorRef = null;

export async function mostrarPainelFavoritos(anchorBtn) {
	ensureFavoritosCss();
	anchorRef = anchorBtn || anchorRef;
	if (!anchorRef) return;

	const painelId = "effraim-fav-deslizante";
	if (!painelRef) {
		painelRef = document.createElement("div");
		painelRef.id = painelId;
		painelRef.className = "effraim-painel-deslizante fav";

		const header = document.createElement("div");
		header.className = "effraim-fav-panel-header";
		const h3 = document.createElement("h3");
		h3.textContent = "Favoritos";
		h3.className = "effraim-fav-panel-title";
		const actions = document.createElement("div");
		actions.className = "effraim-fav-panel-actions";

		const btnNovaPasta = document.createElement("img");
		btnNovaPasta.src = chrome.runtime.getURL("assets/icones/adicionarpasta.png");
		btnNovaPasta.alt = "Criar pasta na raiz";
		btnNovaPasta.title = "Criar pasta na raiz";
		btnNovaPasta.className = "effraim-fav-add-folder-icon root";
		btnNovaPasta.onclick = async () => {
			const nome = (window.prompt("Nome da nova pasta:") || "").trim();
			if (!nome) return;
			const res = await criarPastaRaiz(nome);
			if (!res?.ok && res?.motivo === "limite") {
				inserir_aviso_effraim("Limite de favoritos atingido", 6000);
				alert("Limite de favoritos atingido");
				return;
			}
			if (res?.ok && res?.criado) {
				await renderizarSecaoFavoritos();
				await recarregar();
			}
		};
		actions.appendChild(btnNovaPasta);

		const close = document.createElement("button");
		close.textContent = "✕";
		close.title = "Fechar";
		close.className = "effraim-fav-panel-close";
		close.onclick = () => esconderPainel();
		actions.append(close);
		header.append(h3, actions);

		const corpo = document.createElement("div");
		corpo.id = "effraim-fav-tree";

		painelRef.append(header, document.createElement("hr"), corpo);
		document.body.appendChild(painelRef);
	}

	if (painelRef.dataset.open === "true") {
		esconderPainel();
		return;
	}

	await recarregar();
	posicionar(anchorRef, painelRef);
	mostrarPainel();
}

function mostrarPainel() {
	if (!painelRef) return;
	painelRef.dataset.open = "true";
	painelRef.style.display = "block";
	requestAnimationFrame(() => {
		painelRef.style.opacity = "1";
		painelRef.style.transform = "translateY(0)";
	});
	document.addEventListener("click", handleOutsideClick, true);
}

function esconderPainel() {
	if (!painelRef) return;
	painelRef.dataset.open = "false";
	painelRef.style.opacity = "0";
	painelRef.style.transform = "translateY(-6px)";
	setTimeout(() => {
		if (painelRef.dataset.open === "false") painelRef.style.display = "none";
	}, 180);
	document.removeEventListener("click", handleOutsideClick, true);
}

function handleOutsideClick(e) {
	if (!painelRef || painelRef.contains(e.target) || anchorRef?.contains(e.target)) return;
	esconderPainel();
}

async function recarregar() {
	if (!painelRef) return;
	const corpo = painelRef.querySelector("#effraim-fav-tree");
	if (!corpo) return;
	const fav = await obterFavoritos();
	corpo.innerHTML = "";
	corpo.appendChild(renderTree(fav));
}

function renderTree(fav) {
	const root = document.createElement("ul");
	root.className = "effraim-tree";

	const addItens = (itens, path, ul) => {
		(itens || []).forEach(it => {
			const li = document.createElement("li");
			li.textContent = it.titulo || it.id;
			li.className = "effraim-tree-item";
			li.draggable = true;
			li.dataset.id = it.id;
			li.dataset.secao = it.secaoId;
			li.dataset.path = path.join("/");
			li.onclick = e => {
				e.stopPropagation();
				abrirItemOriginal(it);
			};
			li.addEventListener("dragstart", e => {
				e.dataTransfer.setData("text/plain", JSON.stringify({ id: it.id, secaoId: it.secaoId, fromPath: path }));
				e.dataTransfer.effectAllowed = "move";
			});
			li.addEventListener("dragover", e => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
			});
			li.addEventListener("drop", e => handleDropItem(e, path));
			ul.appendChild(li);
		});
	};

	const addFolder = (folder, path, ul) => {
		const fullPath = [...path, folder.nome];
		const li = document.createElement("li");
		li.className = "effraim-tree-folder";
		li.draggable = true;
		li.dataset.folder = folder.nome;
		li.dataset.path = path.join("/");

		li.addEventListener("dragstart", e => {
			e.dataTransfer.setData("text/plain", JSON.stringify({ folder: folder.nome, fromPath: path }));
			e.dataTransfer.effectAllowed = "move";
		});

		const header = document.createElement("div");
		header.className = "effraim-tree-folder-header";
		const titulo = document.createElement("span");
		titulo.textContent = folder.nome;
		header.appendChild(titulo);

		// apenas pastas de nível 1 podem criar subpastas (nível 2)
		if (fullPath.length === 1) {
			const btnSubpasta = document.createElement("img");
			btnSubpasta.src = chrome.runtime.getURL("assets/icones/adicionarpasta.png");
			btnSubpasta.alt = "Criar subpasta";
			btnSubpasta.title = "Criar subpasta";
			btnSubpasta.className = "effraim-fav-add-folder-icon sub";
			btnSubpasta.onclick = async (e) => {
				e.stopPropagation();
				const nome = (window.prompt(`Nova subpasta em "${folder.nome}":`) || "").trim();
				if (!nome) return;
				const res = await criarSubpasta(fullPath, nome);
				if (!res?.ok && res?.motivo === "limite") {
					inserir_aviso_effraim("Limite de favoritos atingido", 6000);
					alert("Limite de favoritos atingido");
					return;
				}
				if (res?.ok && res?.criado) {
					await renderizarSecaoFavoritos();
					await reloadTree();
				}
			};
			header.appendChild(btnSubpasta);
		}

		const btnExcluir = document.createElement("img");
		btnExcluir.src = chrome.runtime.getURL("assets/icones/excluir.png");
		btnExcluir.alt = "Excluir pasta";
		btnExcluir.title = "Excluir pasta";
		btnExcluir.className = "effraim-folder-action-icon delete";
		btnExcluir.onclick = (e) => {
			e.stopPropagation();
			abrirConfirmExcluirPasta(folder.nome, path, btnExcluir, async () => {
				await reloadTree();
			});
		};
		header.appendChild(btnExcluir);

		header.onclick = e => { e.stopPropagation(); childUl.classList.toggle("fechado"); };
		header.addEventListener("dragover", e => e.preventDefault());
		header.addEventListener("drop", e => handleDropFolder(e, path));
		li.appendChild(header);

		const childUl = document.createElement("ul");
		childUl.className = "effraim-tree";
		childUl.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
		childUl.addEventListener("drop", e => handleDropItem(e, [...path, folder.nome]));
		addItens(folder.itens, fullPath, childUl);
		(folder.pastas || []).forEach(sub => addFolder(sub, fullPath, childUl));
		li.appendChild(childUl);
		ul.appendChild(li);
	};

	addItens(fav.itens_soltos, [], root);
	(fav.pastas || []).forEach(p => addFolder(p, [], root));

	root.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; });
	root.addEventListener("drop", e => handleDropItem(e, []));

	return root;
}

async function handleDropItem(e, targetPath) {
	e.preventDefault();
	const data = e.dataTransfer.getData("text/plain");
	if (!data) return;
	let meta;
	try { meta = JSON.parse(data); } catch { return; }
	if (!meta.id) return;
	const fromPath = meta.fromPath || [];
	const toPath = targetPath || [];

	// reordenar dentro do mesmo bucket quando solta sobre um item
	const dropTargetId = e.currentTarget?.dataset?.id;
	if (dropTargetId && fromPath.join("/") === toPath.join("/")) {
		const ul = e.currentTarget.parentElement;
		if (ul) {
			const ids = Array.from(ul.querySelectorAll("li[data-id]")).map(li => li.dataset.id);
			const draggingId = meta.id;
			const filtered = ids.filter(id => id !== draggingId);
			const idx = filtered.indexOf(dropTargetId);
			if (idx >= 0) filtered.splice(idx, 0, draggingId);
			await reordenarItens(toPath, filtered);
			await renderizarSecaoFavoritos();
			reloadTree();
			return;
		}
	}

	// mover entre pastas/listas
	await moverItem({ id: meta.id, secaoId: meta.secaoId }, fromPath, toPath);
	await renderizarSecaoFavoritos();
	reloadTree();
}

async function handleDropFolder(e, targetPath) {
	e.preventDefault();
	const data = e.dataTransfer.getData("text/plain");
	if (!data) return;
	let meta;
	try { meta = JSON.parse(data); } catch { return; }
	if (!meta.folder) return;
	const parent = targetPath;
	const fav = await obterFavoritos();
	const bucket = parent.length === 0 ? fav : getBucket(fav, parent);
	if (!bucket || !bucket.pastas) return;
	const current = bucket.pastas.map(p => p.nome);
	if (meta.fromPath.join("/") !== parent.join("/")) return;
	const draggingName = meta.folder;
	const targetName = e.currentTarget?.textContent;
	if (!targetName || !current.includes(draggingName) || !current.includes(targetName)) return;
	const newOrder = current.filter(n => n !== draggingName);
	const idx = newOrder.indexOf(targetName);
	newOrder.splice(idx, 0, draggingName);
	await reordenarPastas(parent, newOrder);
	await renderizarSecaoFavoritos();
	reloadTree();
}

function getBucket(fav, path) {
	let node = fav;
	for (const n of path) {
		node = node.pastas?.find(p => p.nome === n);
		if (!node) return null;
	}
	return node;
}

async function reloadTree() {
	const corpo = document.getElementById("effraim-fav-tree");
	if (!corpo) return;
	const fav = await obterFavoritos();
	corpo.innerHTML = "";
	corpo.appendChild(renderTree(fav));
}

function abrirItemOriginal(meta) {
	const { secaoId, id } = meta;
	let link = null;
	switch (secaoId) {
		case "fldProcessoDeUmLocalizador":
			link = document.querySelector(`#tdListaDeProcessosPorLocalizador${id} a`);
			break;
		case "fldMeusLocalizadores":
			link = document.querySelector(`#tdMeusLocalizadores${id} a`);
			break;
		case "fldMinutas":
			link = document.querySelector(`#tdMinutas${id} a`);
			break;
		case "fldRelatorioGeral":
			link = document.querySelector(`#tdRelatorioGeral${id} a`);
			break;
	}
	if (link && link.href) window.open(link.href, "_blank");
}

function posicionar(anchor, painel) {
	if (!anchor || !painel) return;
	const rect = anchor.getBoundingClientRect();
	const top = rect.bottom + window.scrollY + 6;
	const left = rect.left + window.scrollX - 10;
	painel.style.top = `${top}px`;
	painel.style.left = `${left}px`;
}

