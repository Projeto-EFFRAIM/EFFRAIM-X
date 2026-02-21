import { iniciarTour } from "./core_tour.js";

async function aguardarSeletor(seletor, timeoutMs = 4000) {
	const inicio = Date.now();
	while ((Date.now() - inicio) < timeoutMs) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await new Promise(resolve => setTimeout(resolve, 120));
	}
	return null;
}

async function garantirPainelFavoritosAberto() {
	const btnFavoritos = await aguardarSeletor("#btn-painel_inicial_favoritos");
	if (!btnFavoritos) return;
	const painelAberto = document.querySelector("#effraim-fav-deslizante[data-open='true']");
	if (!painelAberto) {
		btnFavoritos.click();
		await aguardarSeletor("#effraim-fav-deslizante[data-open='true']", 3000);
	}
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-painel_inicial_flutuante",
			titulo: "Painel Inicial Flutuante",
			texto: "Este botão abre o painel deslizante das seções do painel inicial."
		},
		{
			selector: "#btn-painel_inicial_favoritos",
			titulo: "Favoritos",
			texto: "Use este botão para abrir o painel de gerenciamento de favoritos.",
			onEnter: async () => {
				await garantirPainelFavoritosAberto();
			}
		},
		{
			selector: "td.effraim-fav-cell img.effraim-fav-icon",
			titulo: "Adicionar aos Favoritos",
			texto: "A estrela adiciona ou remove o item dos favoritos visíveis."
		},
		{
			selector: "td.effraim-fav-cell img.effraim-colorir-icon",
			titulo: "Colorir Sem Favoritar",
			texto: "O ícone de colorir pode destacar a linha mesmo sem favoritar. Nesse caso, o item é salvo silenciosamente apenas para manter a cor."
		},
		{
			selector: "#fldFavoritosPainel",
			titulo: "Seção de Favoritos",
			texto: "Aqui ficam os favoritos organizados para acesso rápido, com pastas, subpastas e cores."
		},
		{
			selector: "#fldFavoritosPainel .effraim-folder-action-icon.color, #fldFavoritosPainel .effraim-action-icon[title='Colorir favorito']",
			titulo: "Colorir Pasta ou Item",
			texto: "Use o ícone de colorir para abrir a paleta de 12 opções, incluindo X vermelho para remover a cor.",
			onEnter: async () => {
				await garantirPainelFavoritosAberto();
				const botaoColorir = await aguardarSeletor(
					"#fldFavoritosPainel .effraim-folder-action-icon.color, #fldFavoritosPainel .effraim-action-icon[title='Colorir favorito']",
					3000
				);
				if (botaoColorir) botaoColorir.click();
			}
		},
		{
			selector: ".effraim-paleta-cores",
			titulo: "Limites de Cor",
			texto: "Os favoritos seguem o limite de 50 entradas (favoritos + pastas). A coloração silenciosa tem limite separado de 50 itens.",
			onEnter: async () => {
				await garantirPainelFavoritosAberto();
				let paleta = document.querySelector(".effraim-paleta-cores");
				if (paleta) return;
				const botaoColorir = await aguardarSeletor(
					"#fldFavoritosPainel .effraim-folder-action-icon.color, #fldFavoritosPainel .effraim-action-icon[title='Colorir favorito']",
					2500
				);
				if (botaoColorir) {
					botaoColorir.click();
					paleta = await aguardarSeletor(".effraim-paleta-cores", 1500);
				}
				return paleta;
			}
		}
	]);
}
