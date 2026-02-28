import { esperar } from "/funcoes.js";

const PAUSA_DIGITO = 200;

export async function preencherCampoConsultante(el, valor) {
	if (!el) {
		console.warn("[preencherCampoConsultante] Elemento do campo não encontrado.");
		return;
	}

	const parent = el.closest(".mat-form-field");
	const textoOriginal = String(valor ?? "");
	const soDigitos = textoOriginal.replace(/[^\d]/g, "");
	const isCPF = soDigitos.length <= 11;
	const pausaDigito = PAUSA_DIGITO;

	console.log("[preencherCampoConsultante] Início", {
		valorBruto: textoOriginal,
		soDigitos,
		len: soDigitos.length,
		tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
	});

	const pausaCritica = 80;
	el.focus();
	el.value = "";
	el.dispatchEvent(new Event("input", { bubbles: true }));
	parent?.dispatchEvent(new Event("input", { bubbles: true }));

	let index = 0;
	if (isCPF) {
		console.log("[preencherCampoConsultante] Modo CPF (lógica original).");
		for (const char of textoOriginal) {
			index++;
			el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
			el.value += char;
			el.dispatchEvent(new Event("input", { bubbles: true }));
			parent?.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
			if ([9, 10].includes(index)) {
				console.log(`[preencherCampoConsultante] Pausa crítica no dígito ${index} (char='${char}').`);
				await esperar(pausaCritica);
			}
		}
	} else {
		console.log("[preencherCampoConsultante] Modo CNPJ (digitação simulada).");
		const pauses = [2, 5, 8, 12, 13, 14];
		index = 0;
		el.value = "";
		for (const char of soDigitos) {
			index++;
			el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
			el.value += char;
			el.dispatchEvent(new Event("input", { bubbles: true }));
			parent?.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
			if (pauses.includes(index)) {
				console.log(`[CNPJ-consultante] Pausa crítica no dígito ${index} (char='${char}')`);
				await esperar(80);
			}
		}
		await esperar(20);
		el.dispatchEvent(new Event("change", { bubbles: true }));
		parent?.dispatchEvent(new Event("change", { bubbles: true }));
		await esperar(20);
		el.dispatchEvent(new Event("blur", { bubbles: true }));
		parent?.dispatchEvent(new Event("blur", { bubbles: true }));
		console.log("[preencherCampoConsultante] CNPJ final:", el.value);
	}

	await esperar(20);
	el.dispatchEvent(new Event("change", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));
	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));

	console.log("[preencherCampoConsultante] Final", {
		valorCampoFinal: el.value,
		lenFinal: String(el.value ?? "").replace(/[^\d]/g, "").length,
		tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
	});
}

export async function preencherCampoConsultado(el, valor) {
	if (!el) {
		console.warn("[preencherCampoConsultado] Elemento do campo não encontrado.");
		return;
	}
	const parent = el.closest(".mat-form-field");
	const textoOriginal = String(valor ?? "");
	const soDigitos = textoOriginal.replace(/[^\d]/g, "");
	const isCPF = soDigitos.length <= 11;
	const pausaDigito = PAUSA_DIGITO;

	console.log("[preencherCampoConsultado] Início", {
		valorBruto: textoOriginal,
		soDigitos,
		len: soDigitos.length,
		tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
	});

	el.focus();
	if (isCPF) {
		console.log("[preencherCampoConsultado] Modo CPF (digitação simulada).");
		let index = 0;
		el.value = "";
		const digitar = async (pausa) => {
			index = 0;
			el.value = "";
			for (const char of soDigitos) {
				index++;
				el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
				el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
				el.value += char;
				el.dispatchEvent(new Event("input", { bubbles: true }));
				parent?.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
				console.log(`[CPF] Pausa após dígito ${index} (char='${char}')`);
				await esperar(pausa);
			}
		};
		await digitar(PAUSA_DIGITO);
		await esperar(100);
		if (String(el.value ?? "").replace(/[^\d]/g, "").length < 11) {
			console.warn("[preencherCampoConsultado] CPF encolheu após máscara; redigitando com pausa maior.");
			await digitar(150);
			await esperar(300);
		}
		await esperar(150);
		el.dispatchEvent(new Event("change", { bubbles: true }));
		parent?.dispatchEvent(new Event("change", { bubbles: true }));
		await esperar(50);
		el.dispatchEvent(new Event("blur", { bubbles: true }));
		parent?.dispatchEvent(new Event("blur", { bubbles: true }));
		console.log("[preencherCampoConsultado] CPF final:", el.value);
		return;
	}

	console.log("[preencherCampoConsultado] Modo CNPJ (digitação simulada).");
	const pauses = [2, 5, 8, 12, 13, 14];
	let index = 0;
	el.value = "";
	for (const char of soDigitos) {
		index++;
		el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
		el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
		el.value += char;
		el.dispatchEvent(new Event("input", { bubbles: true }));
		parent?.dispatchEvent(new Event("input", { bubbles: true }));
		el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
		if (pauses.includes(index)) {
			console.log(`[CNPJ] Pausa crítica no dígito ${index} (char='${char}')`);
			await esperar(pausaDigito);
		}
	}
	await esperar(20);
	el.dispatchEvent(new Event("change", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));
	await esperar(20);
	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));
	console.log("[preencherCampoConsultado] CNPJ final:", el.value);
}

export async function preencherCampoSimples(el, valor) {
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

export function lerValorCampo(el) {
	if (!el) return "";
	return String(el.value ?? el.getAttribute?.("value") ?? "").trim();
}

