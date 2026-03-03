export function normalizarTextoLocalizador(valor = "") {
	const div = document.createElement("div");
	div.innerHTML = String(valor);
	const textoVisivel = div.textContent || div.innerText || String(valor);
	return textoVisivel
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9\[\]\-_ ]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

export function deveDispararPorLocalizadores({
	localizadores = [],
	alvosConfigurados = [],
	alvosPadrao = [],
	operacao = "OU",
	prefixoLog = "[EFFRAIM disparo_localizadores]"
} = {}) {
	const alvos = Array.isArray(alvosConfigurados) && alvosConfigurados.length
		? alvosConfigurados
		: (Array.isArray(alvosPadrao) ? alvosPadrao : []);
	const operacaoNormalizada = String(operacao || "OU").toUpperCase() === "E" ? "E" : "OU";
	const localizadoresLista = Array.isArray(localizadores) ? localizadores : [];
	const localizadoresNormalizados = localizadoresLista.map(normalizarTextoLocalizador);
	const alvosNormalizados = alvos.map(normalizarTextoLocalizador).filter(Boolean);

	const deveExecutar = alvosNormalizados.length === 0
		? false
		: operacaoNormalizada === "E"
			? alvosNormalizados.every((alvo) => localizadoresNormalizados.includes(alvo))
			: alvosNormalizados.some((alvo) => localizadoresNormalizados.includes(alvo));

	console.log(`${prefixoLog} Avaliacao de localizadores para disparo automatico:`, {
		operacao: operacaoNormalizada,
		alvosConfigurados: alvos,
		localizadores: localizadoresLista,
		localizadoresNormalizados,
		alvosNormalizados,
		deveExecutar
	});

	return deveExecutar;
}

