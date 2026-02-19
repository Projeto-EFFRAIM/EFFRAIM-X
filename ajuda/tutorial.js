const MAPA_TIPO_TUTORIAL = {
	favoritos: "painel_inicial",
	consulta_flutuante: "consulta_processual",
	sisbajud: "consulta_processual",
	renajud: "consulta_processual",
	requisitorios: "consulta_processual",
	lista_partes_aprimorada: "consulta_processual"
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

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll(".btn-iniciar-tutorial").forEach(btn => {
		btn.addEventListener("click", () => {
			const id = btn.dataset.tutorial;
			iniciarTutorialPorRota(id);
		});
	});
});
