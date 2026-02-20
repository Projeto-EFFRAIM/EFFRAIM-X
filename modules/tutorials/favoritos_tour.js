import { iniciarTour } from "./core_tour.js";

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#tutorial-intro",
			titulo: "Tutorial Guiado",
			texto: "Você está na central de tutoriais. Agora vamos focar em Favoritos."
		},
		{
			selector: "#tutorial-card-favoritos",
			titulo: "Favoritos do Painel Inicial",
			texto: "Esta seção explica como salvar itens importantes para acesso rápido."
		},
		{
			selector: "#btn-iniciar-favoritos",
			titulo: "Iniciar Tutorial",
			texto: "Clique neste botão sempre que quiser rever o passo a passo de Favoritos."
		}
	]);
}
