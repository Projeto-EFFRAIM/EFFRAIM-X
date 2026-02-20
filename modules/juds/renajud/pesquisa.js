// modules/juds/renajud/pesquisa.js

import { esperar } from "/funcoes.js";

export async function executar(dados) {
	try {
		console.log("[renajud/pesquisa] Início. Dados:", dados);

		// aguarda campo CPF/CNPJ
		const inputDoc = await esperarCampo("input#documentoIdentificacao, input[formcontrolname='documentoIdentificacao']");
		if (!inputDoc) {
			console.warn("[renajud/pesquisa] Campo documentoIdentificacao não encontrado.");
			return;
		}

		const consultados = dados?.consultados || dados?.dados_consulta?.consultados || [];
		const alvo = consultados[0];
		if (!alvo?.cpf) {
			console.warn("[renajud/pesquisa] Nenhum CPF de consultado disponível.");
			return;
		}

		await preencherCPF(inputDoc, alvo.cpf);
		console.log("[renajud/pesquisa] CPF preenchido:", alvo.cpf);

		await acionarPesquisa(valorDoc => preencherCPF(inputDoc, valorDoc), alvo.cpf);
	} catch (e) {
		console.error("[renajud/pesquisa] Erro:", e);
	}
}

async function esperarCampo(seletor, tentativas = 20, delay = 200) {
	for (let i = 0; i < tentativas; i++) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await esperar(delay);
	}
	return null;
}

async function preencherCPF(el, valor) {
	const soDigitos = String(valor ?? "").replace(/\D/g, "").slice(0, 14);
	el.focus();
	el.value = "";
	el.dispatchEvent(new Event("input", { bubbles: true }));

	for (const char of soDigitos) {
		el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
		el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
		el.value += char;
		el.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
		await esperar(60);
	}

	el.classList.remove("ng-pristine");
	el.classList.add("ng-dirty");
	el.classList.add("ng-touched");

	el.dispatchEvent(new Event("change", { bubbles: true }));
	el.dispatchEvent(new Event("blur", { bubbles: true }));
	// evento custom para reactive forms, se existir
	el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function acionarPesquisa(preencherFn, documento) {
	const tentar = async () => {
		const input = await esperarCampo("input#documentoIdentificacao, input[formcontrolname='documentoIdentificacao']");
		if (!input) return false;
		await preencherFn(documento);
		const btn = await esperarCampo("button[type='submit'].btn-primary");
		if (!btn) return false;
		btn.click();
		console.log("[renajud/pesquisa] Botão 'Pesquisar' acionado.");
		return true;
	};

	// primeira tentativa
	if (await tentar()) return;

	// se falhar (ex.: redirecionou para login), rechecamos por alguns segundos
	for (let i = 0; i < 15; i++) {
		await esperar(400);
		if (await tentar()) return;
	}
	console.warn("[renajud/pesquisa] Não foi possível acionar a pesquisa após múltiplas tentativas.");
}
