import { iniciarTour } from "./core_tour.js";

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
			texto: "Use este botão para abrir o painel de gerenciamento de favoritos."
		},
		{
			selector: "#fldFavoritosPainel",
			titulo: "Seção de Favoritos",
			texto: "Aqui ficam os seus favoritos organizados para acesso rápido."
		}
	]);
}
