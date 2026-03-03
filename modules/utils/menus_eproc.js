function normalizarTextoMenu(texto = "") {
	return String(texto || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function resolverHrefAnchor(anchor) {
	if (!anchor) return "";
	const hrefAttr = String(anchor.getAttribute("href") || "").trim();
	if (!hrefAttr) return "";
	try {
		return anchor.href || new URL(hrefAttr.replaceAll("&amp;", "&"), window.location.href).href;
	} catch {
		return anchor.href || hrefAttr;
	}
}

export function localizarUrlMenuEprocPorNome(nomeMenu, opcoes = {}) {
	const nome = String(nomeMenu || "").trim();
	if (!nome) return null;

	const nomeNormalizado = normalizarTextoMenu(nome);
	const hrefContem = String(opcoes?.hrefContem || "").trim();
	const prefixoLog = String(opcoes?.prefixoLog || "[EFFRAIM menus_eproc]").trim();

	console.log(`${prefixoLog} Buscando menu por nome.`, { nomeMenu: nome, hrefContem });

	const anchors = [...document.querySelectorAll("a[href]")];

	// 1) prioridade: aria-label exato (normalizado), conforme regra solicitada
	let alvo = anchors.find((a) => normalizarTextoMenu(a.getAttribute("aria-label") || "") === nomeNormalizado);

	// 2) texto exato
	if (!alvo) {
		alvo = anchors.find((a) => normalizarTextoMenu(a.textContent || "") === nomeNormalizado);
	}

	// 3) aria/texto contém + href ajuda
	if (!alvo) {
		alvo = anchors.find((a) => {
			const aria = normalizarTextoMenu(a.getAttribute("aria-label") || "");
			const texto = normalizarTextoMenu(a.textContent || "");
			const href = String(a.getAttribute("href") || "");
			const casaNome = aria.includes(nomeNormalizado) || texto.includes(nomeNormalizado);
			const casaHref = !hrefContem || href.includes(hrefContem);
			return casaNome && casaHref;
		});
	}

	// 4) fallback por href
	if (!alvo && hrefContem) {
		alvo = document.querySelector(`a[href*="${hrefContem.replaceAll('"', '\\"')}"]`);
	}

	if (!alvo) {
		console.warn(`${prefixoLog} Menu não encontrado.`, { nomeMenu: nome, hrefContem });
		return null;
	}

	const url = resolverHrefAnchor(alvo);
	console.log(`${prefixoLog} URL de menu encontrada.`, {
		nomeMenu: nome,
		url,
		ariaLabel: alvo.getAttribute("aria-label") || "",
		texto: String(alvo.textContent || "").trim().slice(0, 120)
	});
	return url || null;
}

