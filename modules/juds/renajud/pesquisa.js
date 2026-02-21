// modules/juds/renajud/pesquisa.js

import { esperar } from "/funcoes.js";

const CAMPOS_PESQUISA = {
	numero_processo: "input#numeroProcesso, input[formcontrolname='numeroProcesso']",
	placa: "input#placa, input[formcontrolname='placa']",
	chassi: "input#chassi, input[formcontrolname='chassi']",
	cpf_cnpj: "input#documentoIdentificacao, input[formcontrolname='documentoIdentificacao']"
};

function normalizarParametro(dados) {
	const valor = String(dados?.opcoes?.parametro_pesquisa || "cpf_cnpj").toLowerCase();
	if (valor in CAMPOS_PESQUISA) return valor;
	return "cpf_cnpj";
}

function obterValorPesquisa(dados, parametro) {
	const processo = String(dados?.dados_processo?.capa?.numProcesso || "").trim();
	const consultado = (dados?.consultados || [])[0] || {};
	const documento = String(consultado?.cpf || "").trim();
	const valorManual = String(dados?.opcoes?.valor_manual_pesquisa || "").trim();

	if (parametro === "numero_processo") return processo;
	if (parametro === "placa") return valorManual;
	if (parametro === "chassi") return valorManual;
	return documento;
}

function sanitizarValorPesquisa(valor, parametro) {
	if (parametro === "cpf_cnpj") return String(valor || "").replace(/\D/g, "").slice(0, 14);
	if (parametro === "placa") return String(valor || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	if (parametro === "chassi") return String(valor || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	return String(valor || "").trim();
}

async function esperarCampo(seletor, tentativas = 25, delay = 200) {
	for (let i = 0; i < tentativas; i += 1) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await esperar(delay);
	}
	return null;
}

async function preencherCampo(input, valor) {
	input.focus();
	input.value = "";
	input.dispatchEvent(new Event("input", { bubbles: true }));

	for (const char of String(valor || "")) {
		input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
		input.value += char;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
		await esperar(35);
	}

	input.classList.remove("ng-pristine");
	input.classList.remove("ng-untouched");
	input.classList.add("ng-dirty");
	input.classList.add("ng-touched");
	input.dispatchEvent(new Event("change", { bubbles: true }));
	input.dispatchEvent(new Event("blur", { bubbles: true }));
}

function encontrarBotaoPesquisar() {
	const seletor = [
		"button[type='submit'].btn-primary",
		"button[type='submit']",
		"button.btn-primary",
		"input[type='submit']"
	].join(", ");
	const candidatos = [...document.querySelectorAll(seletor)];
	for (const el of candidatos) {
		const texto = String(el.textContent || el.value || "").toLowerCase();
		if (texto.includes("pesquisar")) return el;
	}
	return candidatos[0] || null;
}

export async function executar(dados) {
	try {
		const parametro = normalizarParametro(dados);
		const seletor = CAMPOS_PESQUISA[parametro];
		let valor = obterValorPesquisa(dados, parametro);
		valor = sanitizarValorPesquisa(valor, parametro);

		if (!valor) {
			console.warn("[renajud/pesquisa] Sem valor para parametro selecionado.", { parametro });
			return;
		}

		const input = await esperarCampo(seletor);
		if (!input) {
			console.warn("[renajud/pesquisa] Campo de pesquisa nao encontrado.", { parametro, seletor });
			return;
		}

		await preencherCampo(input, valor);

		const botao = await esperarCampo(
			"button[type='submit'], button.btn-primary, input[type='submit']",
			20,
			180
		);
		const botaoPesquisar = botao || encontrarBotaoPesquisar();
		if (!botaoPesquisar) {
			console.warn("[renajud/pesquisa] Botao de pesquisar nao encontrado.");
			return;
		}

		botaoPesquisar.click();
		console.log("[renajud/pesquisa] Pesquisa acionada.", { parametro, valor });
	} catch (e) {
		console.error("[renajud/pesquisa] Erro:", e);
	}
}
