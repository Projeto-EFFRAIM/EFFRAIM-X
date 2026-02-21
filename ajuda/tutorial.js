const MAPA_TIPO_TUTORIAL = {
	favoritos: "painel_inicial",
	consulta_flutuante: "consulta_processual",
	sisbajud: "consulta_processual",
	renajud: "consulta_processual",
	requisitorios: "consulta_processual",
	lista_partes_aprimorada: "consulta_processual",
	tabelas_compactas: "lista_processos",
	paginacao_aprimorada: "lista_processos"
};

function iniciarTutorialPorRota(id) {
	const tipo = MAPA_TIPO_TUTORIAL[id];
	if (!tipo) return;

	const url = chrome.runtime.getURL(
		`ajuda/tutorial_runner.html?tipo=${encodeURIComponent(tipo)}&tutorial=${encodeURIComponent(id)}&effraim_tutorial=1`
	);

	window.open(
		url,
		"effraim_tutorial_runner",
		"popup=yes,width=1280,height=900,resizable=yes,scrollbars=yes"
	);
}

function normalizarTexto(texto) {
	return String(texto || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function iniciarBuscaTutorial() {
	const input = document.getElementById("tutorial-search");
	const avisoVazio = document.getElementById("tutorial-search-empty");
	if (!input) return;

	const cards = [...document.querySelectorAll(".secao-preferencia")];
	const indice = cards.map((card) => ({
		card,
		texto: normalizarTexto(card.textContent)
	}));

	const aplicarFiltro = () => {
		const termo = normalizarTexto(input.value);
		let visiveis = 0;

		for (const item of indice) {
			const mostrar = !termo || item.texto.includes(termo);
			item.card.style.display = mostrar ? "" : "none";
			if (mostrar) visiveis += 1;
		}

		if (avisoVazio) {
			avisoVazio.style.display = visiveis === 0 ? "block" : "none";
		}
	};

	input.addEventListener("input", aplicarFiltro);
	aplicarFiltro();
	input.focus();
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll(".btn-iniciar-tutorial").forEach(btn => {
		btn.addEventListener("click", () => {
			const id = btn.dataset.tutorial;
			iniciarTutorialPorRota(id);
		});
	});

	iniciarBuscaTutorial();
});
