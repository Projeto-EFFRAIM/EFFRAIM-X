import {
	isFavorito,
	adicionarFavorito,
	removerFavorito,
	obterFavoritos,
	contarFavoritosEPastas,
	FAVORITOS_LIMITE_TOTAL,
	criarSubpasta
} from "./state.js";
import { renderizarSecaoFavoritos } from "./dom.js";
import { inserir_aviso_effraim } from "../../utils/interface.js";
import { ensureFavoritosCss } from "./styles.js";

export function getSecoesFavoritaveis(secoes) {
	return secoes.filter(s => s.favoritavel);
}

// ---------- UI principal ----------

export function aplicarFavoritosNasSecoes(secoes) {
	setTimeout(() => {
		try {
			getSecoesFavoritaveis(secoes).forEach(secao => {
				if (typeof secao.matcher === "function") {
					inserirIcones(secao.id, secao.matcher);
				}
			});
		} catch (e) {
			console.error("[EFFRAIM] aplicarFavoritosNasSecoes erro:", e);
		}
	}, 300);
}

function inserirIcones(secaoId, rowMatcher) {
	const secaoEl = document.getElementById(secaoId);
	if (!secaoEl) return;
	const linhas = secaoEl.querySelectorAll("tr.infraTrClara, tr.infraTrEscura, tr");
	linhas.forEach(async row => {
		const meta = rowMatcher(row);
		if (!meta) return;
		meta.secaoId = secaoId;
		const btn = adicionarCelulaFav(row, meta);
		const fav = await isFavorito(secaoId, meta.id);
		atualizarIcone(btn, fav);
		btn.onclick = e => {
			e.stopPropagation();
			toggleFavorito(meta, btn);
		};
	});
}

function criarBotao(meta) {
	const img = document.createElement("img");
	img.className = "effraim-fav-icon";
	img.alt = "Favoritar";
	img.src = chrome.runtime.getURL("assets/icones/favoritar.png");
	img.dataset.id = meta.id;
	img.dataset.secao = meta.secaoId;
	return img;
}

function adicionarCelulaFav(row, meta) {
	let td = row.querySelector("td.effraim-fav-cell");
	if (!td) {
		td = document.createElement("td");
		td.className = "effraim-fav-cell";
		row.appendChild(td);
	}
	const btn = criarBotao(meta);
	td.innerHTML = "";
	td.appendChild(btn);
	return btn;
}

async function toggleFavorito(meta, imgEl) {
	const isFav = await isFavorito(meta.secaoId, meta.id);
	if (isFav) {
		await removerFavorito(meta.secaoId, meta.id);
		atualizarIcone(imgEl, false);
		await renderizarSecaoFavoritos();
		return;
	}

	const fav = await obterFavoritos();
	const totalAtual = contarFavoritosEPastas(fav);
	if (totalAtual >= FAVORITOS_LIMITE_TOTAL) {
		inserir_aviso_effraim("Limite de favoritos atingido", 6000);
		alert("Limite de favoritos atingido");
		return;
	}

	abrirMenuFavorito(meta, imgEl);
}

function atualizarIcone(img, favorecido) {
	img.src = chrome.runtime.getURL(
		favorecido ? "assets/icones/desfavoritar.png" : "assets/icones/favoritar.png"
	);
	img.alt = favorecido ? "Desfavoritar" : "Favoritar";
}

// ---------- Menu flutuante ----------

let menuAtivo = null;
let menuAnchor = null;

function fecharMenu() {
	if (menuAtivo && menuAtivo.parentNode) menuAtivo.parentNode.removeChild(menuAtivo);
	menuAtivo = null;
	menuAnchor = null;
	document.removeEventListener("click", fecharMenu);
}

function abrirMenuFavorito(meta, anchorEl) {
	if (menuAtivo && menuAnchor === anchorEl) {
		fecharMenu();
		return;
	}

	fecharMenu();
	ensureFavoritosCss();

	const menu = document.createElement("div");
	menu.className = "effraim-fav-menu";

	const titulo = document.createElement("div");
	titulo.className = "item titulo";
	const logo = document.createElement("img");
	logo.src = chrome.runtime.getURL("assets/icones/icone128.png");
	logo.alt = "EFFRAIM";
	logo.width = 32;
	logo.height = 32;
	const textoTitulo = document.createElement("span");
	textoTitulo.textContent = "Adicionar a favoritos";
	titulo.append(logo, textoTitulo);
	menu.appendChild(titulo);

	const sepTitulo = document.createElement("div");
	sepTitulo.className = "sep";
	menu.appendChild(sepTitulo);

	const addItem = (label, onClick) => {
		const div = document.createElement("div");
		div.className = "item";
		div.textContent = label;
		div.onclick = async e => {
			e.stopPropagation();
			await onClick();
			fecharMenu();
		};
		menu.appendChild(div);
	};

	const addFolderItem = (path, onSelectFolder) => {
		const div = document.createElement("div");
		div.className = "item folder-row";
		const label = document.createElement("span");
		label.className = "folder-label";
		label.textContent = path.join("/");
		div.appendChild(label);

		// apenas pastas de nível 1 podem criar subpastas (nível 2)
		if (path.length === 1) {
			const actions = document.createElement("span");
			actions.className = "folder-actions";
			const addFolderIcon = document.createElement("img");
			addFolderIcon.src = chrome.runtime.getURL("assets/icones/adicionarpasta.png");
			addFolderIcon.alt = "Adicionar subpasta";
			addFolderIcon.title = "Adicionar subpasta";
			addFolderIcon.className = "effraim-fav-add-folder-icon sub";
			addFolderIcon.onclick = async e => {
				e.stopPropagation();
				const nomeSubpasta = (window.prompt(`Nova subpasta em "${path[0]}":`) || "").trim();
				if (!nomeSubpasta) return;
				const criar = await criarSubpasta([path[0]], nomeSubpasta);
				if (!criar?.ok && criar?.motivo === "limite") {
					avisarLimite();
					return;
				}
				if (!criar?.ok) return;
				const destino = [path[0], nomeSubpasta];
				const res = await adicionarFavorito(meta, destino);
				if (!res?.ok && res?.motivo === "limite") {
					avisarLimite();
					return;
				}
				atualizarIcone(anchorEl, true);
				await renderizarSecaoFavoritos();
				fecharMenu();
			};
			actions.appendChild(addFolderIcon);
			div.appendChild(actions);
		}

		div.onclick = async e => {
			e.stopPropagation();
			await onSelectFolder();
			fecharMenu();
		};
		menu.appendChild(div);
	};

	const avisarLimite = () => {
		inserir_aviso_effraim("Limite de favoritos atingido", 6000);
		alert("Limite de favoritos atingido");
	};

	addItem("Sem pasta (raiz)", async () => {
		const res = await adicionarFavorito(meta, []);
		if (!res?.ok && res?.motivo === "limite") {
			avisarLimite();
			return;
		}
		atualizarIcone(anchorEl, true);
		await renderizarSecaoFavoritos();
	});

	addItem("Criar pasta…", async () => {
		const nome = window.prompt("Nome da pasta (use / para subpasta, máx 2 níveis)", "");
		const caminho = nome ? nome.split("/").filter(Boolean).slice(0, 2) : [];
		const res = await adicionarFavorito(meta, caminho);
		if (!res?.ok && res?.motivo === "limite") {
			avisarLimite();
			return;
		}
		atualizarIcone(anchorEl, true);
		await renderizarSecaoFavoritos();
	});

	menu.appendChild(document.createElement("div")).className = "sep";

	(async () => {
		const fav = await obterFavoritos();
		const paths = listarPastasExistentes(fav);
		if (!paths.length) {
			const empty = document.createElement("div");
			empty.className = "item";
			empty.textContent = "Sem pastas";
			empty.classList.add("effraim-fav-empty");
			empty.onclick = e => e.stopPropagation();
			menu.appendChild(empty);
		} else {
			paths.forEach(path => {
				addFolderItem(path, async () => {
					const res = await adicionarFavorito(meta, path);
					if (!res?.ok && res?.motivo === "limite") {
						avisarLimite();
						return;
					}
					atualizarIcone(anchorEl, true);
					await renderizarSecaoFavoritos();
				});
			});
		}
	})();

	document.body.appendChild(menu);
	menuAtivo = menu;
	menuAnchor = anchorEl;

	const rect = anchorEl.getBoundingClientRect();
	let top = rect.bottom + window.scrollY + 2;
	let left = rect.right + window.scrollX - menu.offsetWidth - 24;
	menu.style.top = `${top}px`;
	menu.style.left = `${left}px`;

	// ajuste para caber na tela
	const fit = () => {
		const mrect = menu.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const margin = 12;
		if (mrect.right > vw) {
			left = Math.max(margin, vw - mrect.width - margin) + window.scrollX;
			menu.style.left = `${left}px`;
		}
		if (mrect.bottom > vh) {
			top = Math.max(margin, vh - mrect.height - margin) + window.scrollY;
			menu.style.top = `${top}px`;
		}
		if (mrect.top < 0) {
			top = window.scrollY + margin;
			menu.style.top = `${top}px`;
		}
		if (mrect.left < 0) {
			left = window.scrollX + margin;
			menu.style.left = `${left}px`;
		}
	};
	fit();

	setTimeout(() => document.addEventListener("click", fecharMenu), 0);
}

function listarPastasExistentes(fav) {
	const paths = [];
	const walk = (folder, path = []) => {
		const currentPath = [...path, folder.nome];
		paths.push(currentPath);
		(folder.pastas || []).forEach(sub => walk(sub, currentPath));
	};
	(fav.pastas || []).forEach(p => walk(p, []));
	return paths;
}
