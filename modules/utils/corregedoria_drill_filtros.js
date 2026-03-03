function normalizarNumeroBasico(valor) {
	if (typeof valor === "number" && Number.isFinite(valor)) return valor;
	const n = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

export function classificarFaixaParadosNaoConclusos(tempoDias) {
	const n = Number(tempoDias);
	if (!Number.isFinite(n)) return null;
	if (n <= 30) return "1)<=30";
	if (n <= 60) return "2)>30 e <=60";
	if (n <= 90) return "3)>60 e <=90";
	if (n <= 120) return "4)>90 e <=120";
	if (n <= 150) return "5)>120 e <=150";
	return "6)>150";
}

export function normalizarTextoComparacao(texto = "") {
	return String(texto || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

export function normalizarTextoChaveComparacao(texto = "") {
	return normalizarTextoComparacao(texto).replace(/[\/\s_]+/g, "");
}

export function extrairTagsFiltroParaGrupo(grupo) {
	if (!grupo || !Array.isArray(grupo.itens)) return [];
	return grupo.itens.map((item) => String(item?.rotulo || "").trim()).filter(Boolean).slice(0, 12);
}

export function linhaCorrespondeFiltroDrill(gid, linha, rotuloTag) {
	const tag = normalizarTextoComparacao(rotuloTag);
	if (!tag) return true;

	if (Number(gid) === 1) {
		const situacao = normalizarTextoComparacao(linha?.["Situação"] || linha?.Situacao || "");
		const classe = normalizarTextoComparacao(linha?.Classe || "");
		if (tag.startsWith("ativo")) return situacao.includes("ativo");
		if (tag.startsWith("suspens")) return situacao.includes("suspens");
		if (tag.startsWith("inquerit")) return classe.includes("inquerit") || situacao.includes("inquerit");
		return situacao.includes(tag) || classe.includes(tag);
	}

	if (Number(gid) === 3) {
		const concluso = normalizarTextoComparacao(linha?.Concluso || "");
		if (tag.includes("nao conclus")) return concluso === "nao" || concluso === "não";
		if (tag.includes("conclus")) return concluso === "sim";
		return false;
	}

	if (Number(gid) === 4 || Number(gid) === 5) {
		const conclusao = normalizarTextoChaveComparacao(linha?.Conclusão || linha?.Conclusao || "");
		const tagConclusao = normalizarTextoChaveComparacao(rotuloTag);
		return conclusao.includes(tagConclusao);
	}

	if (Number(gid) === 6) {
		const faixa = normalizarTextoComparacao(classificarFaixaParadosNaoConclusos(linha?.["Tempo Em Dias"]) || "");
		return faixa === normalizarTextoComparacao(rotuloTag);
	}

	if (Number(gid) === 7 || Number(gid) === 8) {
		const tipo = normalizarTextoComparacao(linha?.Tipo || linha?.tipo || "");
		const tagLimpa = tag.replace(/^[0-9]+\)/, "").trim();
		return tipo.includes(tagLimpa) || tagLimpa.includes(tipo);
	}

	if (Number(gid) === 9) {
		const tipo = normalizarTextoComparacao(linha?.Tipo || linha?.tipo || "");
		return tipo.includes(tag) || tag.includes(tipo);
	}

	return Object.values(linha || {}).some((v) => typeof v === "string" && normalizarTextoComparacao(v).includes(tag));
}

export function aplicarFiltrosDrill(linhas = [], gid, tagsAtivas = []) {
	if (!Array.isArray(linhas)) return [];
	return linhas.filter((linha) => {
		if (Array.isArray(tagsAtivas) && tagsAtivas.length) {
			if (!tagsAtivas.some((tag) => linhaCorrespondeFiltroDrill(gid, linha, tag))) return false;
		}
		return true;
	});
}

export function obterTempoEmDiasLinha(linha) {
	return normalizarNumeroBasico(linha?.["Tempo Em Dias"]);
}

export function aplicarFiltroDiasDrill(linhas = [], diasMin = null) {
	if (!Array.isArray(linhas)) return [];
	if (diasMin === null || diasMin === undefined || diasMin === "") return linhas;
	if (!Number.isFinite(Number(diasMin))) return linhas;
	const minimo = Number(diasMin);
	return linhas.filter((linha) => {
		const tempo = obterTempoEmDiasLinha(linha);
		return Number.isFinite(tempo) && tempo > minimo;
	});
}

export function aplicarFiltrosColunasDrill(linhas = [], filtrosColunas = {}) {
	if (!Array.isArray(linhas)) return [];
	const filtros = filtrosColunas && typeof filtrosColunas === "object" ? filtrosColunas : {};
	const ativos = Object.entries(filtros)
		.map(([coluna, valores]) => {
			const arr = Array.isArray(valores)
				? valores.map((v) => String(v ?? "").trim()).filter(Boolean)
				: [String(valores ?? "").trim()].filter(Boolean);
			return [String(coluna || ""), arr];
		})
		.filter(([coluna, valores]) => coluna && valores.length);
	if (!ativos.length) return linhas;

	return linhas.filter((linha) => ativos.every(([coluna, valores]) => valores.includes(String(linha?.[coluna] ?? "").trim())));
}

