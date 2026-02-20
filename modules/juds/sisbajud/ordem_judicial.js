// modules/juds/sisbajud/ordem_judicial.js

import { esperar, normalizar } from "/funcoes.js";

export async function executar(dados) {
	try {
		console.log("[ordem_judicial] Início. Dados:", dados);

		// garante que está na rota /ordem-judicial
		const urlAlvo = "https://sisbajud.cnj.jus.br/ordem-judicial";
	if (!location.href.startsWith(urlAlvo)) {
		console.log("[ordem_judicial] Redirecionando para /ordem-judicial...");
		location.href = urlAlvo;
		return;
	}

	// espera DOM ficar pronto
	await esperarDOM();

	// garante que estamos na aba de filtros
	let filtroOk = false;
	for (let i = 0; i < 10 && !filtroOk; i++) {
		console.log(`[ordem_judicial] Tentativa ${i + 1}/10 de abrir aba filtros...`);
		filtroOk = clicarTabFiltros();
		if (!filtroOk) await esperar(300);
	}
	if (filtroOk) {
		console.log("[ordem_judicial] 'Busca por filtros de pesquisa' clicado.");
		await esperar(500);
	} else {
		console.warn("[ordem_judicial] Aba 'Busca por filtros de pesquisa' não encontrada.");
	}

	const inputProc = await esperarElemento(() =>
		document.querySelector("input[placeholder*='Número do Processo'], input[placeholder*='processo'], input[aria-label*='processo']")
	, 12, 300);
	if (!inputProc) {
		console.error("[ordem_judicial] Campo 'Número do Processo' não encontrado.");
		return;
	}

		const numero = dados?.capa?.numProcesso || "";
		preencherCampoSimples(inputProc, numero);
		await esperar(150);

		const btnConsultar = [...document.querySelectorAll("button")].find(b =>
			/consultar/i.test(b.innerText || "")
		);
		if (btnConsultar) {
			btnConsultar.click();
			console.log("[ordem_judicial] Consulta acionada para processo:", numero);
		} else {
			console.warn("[ordem_judicial] Botão 'Consultar' não encontrado.");
		}
	} catch (e) {
		console.error("[ordem_judicial] Erro durante execução:", e);
	}
}

async function esperarDOM() {
	if (document.readyState === "complete" || document.readyState === "interactive") return;
	await new Promise(res => document.addEventListener("DOMContentLoaded", res, { once: true }));
}

async function esperarElemento(fn, tentativas = 10, delay = 200) {
	for (let i = 0; i < tentativas; i++) {
		const el = fn();
		if (el) return el;
		await esperar(delay);
	}
	return null;
}

function clicarTabFiltros() {
	const labels = [...document.querySelectorAll(".mat-tab-label")];
	const alvo = labels.find(d => /filtros\s+de\s+pesquisa/i.test(normalizar(d.innerText || "")));
	console.log("[ordem_judicial] tentando achar div de filtros");
	if (alvo) {
		console.log("[ordem_judicial] clicando na aba filtros (label):", (alvo.innerText || "").trim());
		alvo.click();
		const ativa = document.querySelector(".mat-tab-label-active");
		if (ativa) {
			console.log("[ordem_judicial] aba ativa após clique:", (ativa.innerText || "").trim());
			return /filtros\s+de\s+pesquisa/i.test(normalizar(ativa.innerText || ""));
		}
		return true;
	}
	// fallback simples
	const div = [...document.querySelectorAll("div")].find(d => /filtros\s+de\s+pesquisa/i.test(normalizar(d.innerText || "")));
	if (div) {
		console.log("[ordem_judicial] clicando na aba filtros (div fallback):", (div.innerText || "").trim());
		div.click();
		return true;
	}
	console.log("[ordem_judicial] aba filtros não encontrada no DOM.");
	return false;
}

function preencherCampoSimples(el, valor) {
	if (!el) return;
	const parent = el.closest(".mat-form-field");
	el.focus();
	el.value = String(valor ?? "");
	el.dispatchEvent(new Event("input", { bubbles: true }));
	parent?.dispatchEvent(new Event("input", { bubbles: true }));
	el.dispatchEvent(new Event("change", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));
	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));
}
