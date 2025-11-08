// modules/juds/sisbajud/minuta.js

export async function executar(dados) {
	console.log("[EFFRAIM] Executando minuta.js com dados:", dados);

	try {
		// Localiza todos os botões possíveis e filtra pelo texto "Nova"
		const botoes = Array.from(document.querySelectorAll('button.mat-fab.mat-primary span.mat-button-wrapper'));
		const alvo = botoes.find(el => el.textContent.trim().includes("Nova"));

		if (alvo) {
			console.log("[EFFRAIM] Botão 'Nova' encontrado. Clicando…");
			alvo.click();
		} else {
			console.warn("[EFFRAIM] Botão 'Nova' não encontrado na página.");
		}
	} catch (e) {
		console.error("[EFFRAIM] Erro ao executar minuta.js:", e);
	}
}
