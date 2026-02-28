import { esperar, normalizar } from "/funcoes.js";
import { preencherCampoSimples } from "./campos.js";

export function esperarSobreposicao(seletor) {
	return new Promise((resolve) => {
		const container = document.querySelector(".cdk-overlay-container");
		if (container?.querySelector(seletor)) return resolve(container);
		const observer = new MutationObserver(() => {
			const ativo = document.querySelector(".cdk-overlay-container");
			if (ativo?.querySelector(seletor)) {
				observer.disconnect();
				resolve(ativo);
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
		setTimeout(() => {
			observer.disconnect();
			resolve(document.querySelector(".cdk-overlay-container"));
		}, 1500);
	});
}

export async function selecionarOpcaoMatSelect(textoOpcao, seletor = "[id^='mat-option']") {
	if (!textoOpcao) return;
	const overlay = await esperarSobreposicao(seletor);
	const lista = [...(overlay?.querySelectorAll?.(seletor) || [])];
	const alvo = normalizar(textoOpcao);
	const opcao = lista.find((e) => normalizar(e.innerText).includes(alvo));
	if (!opcao) return;
	opcao.scrollIntoView({ block: "center" });
	opcao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

export async function preencherAutocompleteMat(input, textoOpcao) {
	if (!input || !textoOpcao) return false;
	await preencherCampoSimples(input, textoOpcao);
	input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
	input.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
	await esperar(250);
	await selecionarOpcaoMatSelect(textoOpcao);
	return true;
}

export async function clicarFinalizarSalvarProtocolar() {
	console.log("[clicarFinalizarSalvarProtocolar] Início");
	await esperar(300);

	let botaoSalvar = [...document.querySelectorAll("button")].find((b) => /salvar/i.test(b.innerText));
	if (botaoSalvar) {
		console.log("[clicarFinalizarSalvarProtocolar] Botão SALVAR encontrado:", botaoSalvar.innerText);
		botaoSalvar.scrollIntoView({ block: "center" });
		await esperar(80);
		botaoSalvar.click();
		await esperar(350);
	} else {
		console.log("[clicarFinalizarSalvarProtocolar] Nenhum botão SALVAR encontrado. Prosseguindo...");
	}

	let botaoProtocolar = [...document.querySelectorAll("button")].find((b) => /protocolar/i.test(b.innerText));
	if (!botaoProtocolar) {
		console.warn("[clicarFinalizarSalvarProtocolar] Botão PROTOCOLAR não encontrado.");
		return;
	}

	console.log("[clicarFinalizarSalvarProtocolar] Botão PROTOCOLAR encontrado:", botaoProtocolar.innerText);
	botaoProtocolar.scrollIntoView({ block: "center" });
	await esperar(80);
	botaoProtocolar.click();
	await esperar(350);
	console.log("[clicarFinalizarSalvarProtocolar] Concluído.");
}

