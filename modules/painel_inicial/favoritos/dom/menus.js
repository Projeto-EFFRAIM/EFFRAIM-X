import { listarPastasExistentes } from "./helpers.js";

export function createMenuHandlers({
	obterFavoritosEstado,
	moverItem,
	removerPasta,
	ensureFavoritosCss,
	localizarPasta,
	coletarItensRecursivos,
	localizarBotaoFavoritoOriginal,
	atualizarIcone,
	renderizarSecaoFavoritos
}) {
	let menuMover = null;
	let confirmPasta = null;

	function posicionarMenu(menu, anchor) {
		const rect = anchor.getBoundingClientRect();
		let top = rect.bottom + window.scrollY + 2;
		let left = rect.left + window.scrollX - 20;
		menu.style.top = `${top}px`;
		menu.style.left = `${left}px`;
		const fit = () => {
			const mrect = menu.getBoundingClientRect();
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			if (mrect.right > vw) {
				left = Math.max(4, vw - mrect.width - 4) + window.scrollX;
				menu.style.left = `${left}px`;
			}
			if (mrect.bottom > vh) {
				top = Math.max(4, vh - mrect.height - 4) + window.scrollY;
				menu.style.top = `${top}px`;
			}
			if (mrect.top < 0) {
				top = window.scrollY + 4;
				menu.style.top = `${top}px`;
			}
			if (mrect.left < 0) {
				left = window.scrollX + 4;
				menu.style.left = `${left}px`;
			}
		};
		setTimeout(fit, 0);
	}

	function fecharMenus() {
		if (menuMover && menuMover.parentNode) menuMover.parentNode.removeChild(menuMover);
		if (confirmPasta && confirmPasta.parentNode) confirmPasta.parentNode.removeChild(confirmPasta);
		menuMover = null;
		confirmPasta = null;
		document.removeEventListener("click", fecharMenus);
	}

	function abrirMenuMoverPasta(meta, path, anchor) {
		fecharMenus();
		ensureFavoritosCss();
		const menu = document.createElement("div");
		menu.className = "effraim-mover-menu";

		const addItem = (label, destino) => {
			const div = document.createElement("div");
			div.className = "item";
			div.textContent = label;
			div.onclick = async e => {
				e.stopPropagation();
				await moverItem(meta, path, destino);
				await renderizarSecaoFavoritos();
				const origBtn = localizarBotaoFavoritoOriginal(meta.secaoId, meta.id);
				if (origBtn) atualizarIcone(origBtn, true);
				fecharMenus();
			};
			menu.appendChild(div);
		};

		addItem("Raiz", []);

		(async () => {
			const favs = await obterFavoritosEstado();
			const paths = listarPastasExistentes(favs).filter(p => p.join("/") !== path.join("/"));
			if (!paths.length) {
				const vazio = document.createElement("div");
				vazio.className = "item";
				vazio.textContent = "Sem pastas";
				vazio.classList.add("effraim-fav-empty");
				menu.appendChild(vazio);
			} else {
				paths.forEach(p => addItem(p.join("/"), p));
			}
		})();

		document.body.appendChild(menu);
		menuMover = menu;

		posicionarMenu(menu, anchor);
		setTimeout(() => document.addEventListener("click", fecharMenus), 0);
	}

	async function abrirConfirmExcluirPasta(nome, pathAtual, anchor, onAfterChange = null) {
		fecharMenus();
		ensureFavoritosCss();
		const menu = document.createElement("div");
		menu.className = "effraim-mover-menu wide";

		const label = document.createElement("div");
		label.textContent = `Excluir a pasta "${nome}"?`;
		label.className = "effraim-mover-menu-label";
		menu.appendChild(label);

		const fullPath = [...pathAtual, nome];
		const favsAtuais = await obterFavoritosEstado();
		const pastaAtual = localizarPasta(favsAtuais, fullPath);
		const favoritosNaPasta = pastaAtual ? coletarItensRecursivos(pastaAtual) : [];
		const pastaSemFavoritos = favoritosNaPasta.length === 0;

		const mkBtn = (txt, action) => {
			const b = document.createElement("div");
			b.className = "item";
			b.textContent = txt;
			b.onclick = async e => {
				e.stopPropagation();
				if (action === "delete" || action === "move-root") {
					const favs = await obterFavoritosEstado();
					const folder = localizarPasta(favs, fullPath);
					const itens = folder ? coletarItensRecursivos(folder) : [];
					await removerPasta(fullPath, action === "move-root");
					await renderizarSecaoFavoritos();
					itens.forEach(meta => {
						const origBtn = localizarBotaoFavoritoOriginal(meta.secaoId, meta.id);
						if (origBtn) atualizarIcone(origBtn, action === "move-root" ? true : false);
					});
					if (typeof onAfterChange === "function") {
						await onAfterChange();
					}
				}
				fecharMenus();
			};
			menu.appendChild(b);
		};

		if (pastaSemFavoritos) {
			mkBtn("Excluir pasta", "delete");
		} else {
			mkBtn("Excluir e apagar favoritos", "delete");
			mkBtn("Excluir e mover favoritos para a raiz", "move-root");
		}
		mkBtn("Cancelar", "cancel");

		document.body.appendChild(menu);
		confirmPasta = menu;
		posicionarMenu(menu, anchor);
		setTimeout(() => document.addEventListener("click", fecharMenus), 0);
	}

	return { abrirMenuMoverPasta, abrirConfirmExcluirPasta };
}
