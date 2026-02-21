import {
	obterBucketPorCaminho,
	coletarItensPastaRecursivo,
	listarCaminhosPastas
} from "../../../utils/gestao_pastas.js";

export function localizarLinhaOriginal(fav) {
	switch (fav.secaoId) {
		case "fldProcessoDeUmLocalizador": {
			const td = document.getElementById("tdListaDeProcessosPorLocalizadorDesc" + fav.id);
			return td ? td.closest("tr") : null;
		}
		case "fldMeusLocalizadores": {
			const td = document.getElementById("tdMeusLocalizadoresDesc" + fav.id);
			return td ? td.closest("tr") : null;
		}
		case "fldMinutas": {
			const td = document.getElementById("tdMinutas" + fav.id);
			return td ? td.closest("tr") : null;
		}
		case "fldRelatorioGeral": {
			const td = document.getElementById("tdRelatorioGeralDesc" + fav.id);
			return td ? td.closest("tr") : null;
		}
		default:
			return null;
	}
}

export function removerIdsRecursivo(node) {
	if (node.removeAttribute) node.removeAttribute("id");
	node.childNodes.forEach(removerIdsRecursivo);
}

export function sincronizarRelatorio(origTd, cloneTd) {
	const sync = () => {
		cloneTd.innerHTML = origTd.innerHTML;
		removerIdsRecursivo(cloneTd);
	};
	sync();
	const obs = new MutationObserver(sync);
	obs.observe(origTd, { childList: true, subtree: true, characterData: true });
}

export function localizarBotaoFavoritoOriginal(secaoId, itemId) {
	const secaoEl = document.getElementById(secaoId);
	if (!secaoEl) return null;
	const linhas = secaoEl.querySelectorAll("tr.infraTrClara, tr.infraTrEscura, tr");
	for (const row of linhas) {
		const btn = row.querySelector("td.effraim-fav-cell img");
		if (!btn) continue;
		const mid = btn.dataset?.id;
		if (mid === itemId) return btn;
	}
	return null;
}

export function atualizarIcone(img, favorecido) {
	img.src = chrome.runtime.getURL(
		favorecido ? "assets/icones/desfavoritar.png" : "assets/icones/favoritar.png"
	);
	img.alt = favorecido ? "Desfavoritar" : "Favoritar";
}

export function ordenarSeNecessario(favs) {
	const clone = structuredClone ? structuredClone(favs) : JSON.parse(JSON.stringify(favs));
	const ordenarBucket = bucket => {
		if (!bucket) return;
		if (!bucket.ordenacao_manual && bucket.itens) {
			bucket.itens.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
		}
		if (bucket.pastas) {
			bucket.pastas.sort((a, b) => a.nome.localeCompare(b.nome));
			bucket.pastas.forEach(ordenarBucket);
		}
	};
	ordenarBucket(clone);
	return clone;
}

export function localizarPasta(favs, path) {
	return obterBucketPorCaminho(favs, path);
}

export function coletarItensRecursivos(folder) {
	return coletarItensPastaRecursivo(folder);
}

export function listarPastasExistentes(fav) {
	return listarCaminhosPastas(fav);
}
