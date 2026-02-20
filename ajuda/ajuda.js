(() => {
	const form = document.getElementById("form-fale-conosco");
	if (!form) return;

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const assunto = document.getElementById("contato-assunto")?.value?.trim() || "";
		const descricao = document.getElementById("contato-descricao")?.value?.trim() || "";
		if (!assunto || !descricao) return;

		const destinatario = "effraim.projeto@gmail.com";
		const assuntoFinal = encodeURIComponent(`[EFFRAIM] ${assunto}`);
		const corpoFinal = encodeURIComponent(`Descrição:\n${descricao}`);
		window.location.href = `mailto:${destinatario}?subject=${assuntoFinal}&body=${corpoFinal}`;
	});
})();
