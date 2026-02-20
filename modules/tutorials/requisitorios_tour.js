import { iniciarTour } from "./core_tour.js";

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#tutorial-intro",
			titulo: "Tutorial Guiado",
			texto: "Agora vamos focar no uso da consulta de Requisitórios."
		},
		{
			selector: "#tutorial-card-requisitorios",
			titulo: "Requisitórios",
			texto: "Aqui você encontra a visão geral, funcionamento e limitações dessa funcionalidade."
		},
		{
			selector: "#btn-iniciar-requisitorios",
			titulo: "Rever Quando Quiser",
			texto: "Este botão reinicia o guia de Requisitórios."
		}
	]);
}
