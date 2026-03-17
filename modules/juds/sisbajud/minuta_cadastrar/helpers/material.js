import { esperar, normalizar } from "/funcoes.js";

export function lerTextoMatSelect(campoInfix) {
	if (!(campoInfix instanceof Element)) return "";
	const candidatos = [
		".mat-select-value-text",
		".mat-mdc-select-value-text",
		".mat-select-trigger",
		".mat-mdc-select-trigger"
	];
	for (const seletor of candidatos) {
		const el = campoInfix.querySelector(seletor);
		const texto = String(el?.textContent || "").trim();
		if (texto) return texto;
	}
	return String(campoInfix.textContent || "").trim().replace(/\s+/g, " ");
}

export function localizarCampoBasicoSisbajud(rotuloEsperado, fallback = null) {
	const rotulos = Array.isArray(rotuloEsperado) ? rotuloEsperado : [rotuloEsperado];
	const alvosNorm = rotulos.map((r) => normalizar(String(r || ""))).filter(Boolean);
	const alvosRaw = rotulos.map((r) => String(r || "").trim().toLowerCase()).filter(Boolean);
	const campos = [...document.querySelectorAll(".mat-form-field, .mat-mdc-form-field")];
	for (const campo of campos) {
		const textos = [
			campo.querySelector(".mat-form-field-label")?.textContent,
			campo.querySelector(".mdc-floating-label")?.textContent,
			campo.querySelector("label")?.textContent,
			campo.querySelector("input")?.getAttribute?.("placeholder"),
			campo.querySelector("input")?.getAttribute?.("aria-label"),
			campo.querySelector(".mat-select-placeholder")?.textContent,
			campo.querySelector(".mat-select-value-text")?.textContent,
			campo.querySelector(".mat-mdc-select-value-text")?.textContent
		].map((t) => String(t || "").trim()).filter(Boolean);
		const combinado = textos.join(" ");
		const combinadoNorm = normalizar(combinado);
		const combinadoRaw = combinado.toLowerCase();
		if (!combinadoNorm && !combinadoRaw) continue;
		const matchNorm = alvosNorm.some((alvo) => combinadoNorm.includes(alvo));
		const matchRaw = alvosRaw.some((alvo) => combinadoRaw.includes(alvo));
		if (!matchNorm && !matchRaw) continue;
		const infix = campo.querySelector(".mat-form-field-infix, .mat-mdc-form-field-infix");
		if (infix) return infix;
	}
	return fallback || null;
}

export function campoTemSelect(campoInfix) {
	if (!(campoInfix instanceof Element)) return false;
	const campo = campoInfix.closest(".mat-form-field, .mat-mdc-form-field") || campoInfix;
	return !!campo.querySelector(".mat-select, .mat-mdc-select, .mat-select-trigger, .mat-mdc-select-trigger");
}

export function localizarCampoVaraJuizoSisbajud(campoTipoAcao = null, fallback = null) {
	const aliases = [
		"vara/juizo",
		"vara/juízo",
		"vara/juizo (campo obrigatorio)",
		"vara/juízo (campo obrigatório)"
	];
	const porRotulo = localizarCampoBasicoSisbajud(aliases, null);
	if (campoTemSelect(porRotulo)) return porRotulo;
	const infixesSelect = [...document.querySelectorAll(".mat-form-field-infix, .mat-mdc-form-field-infix")]
		.filter((el) => campoTemSelect(el));
	if (campoTipoAcao && infixesSelect.includes(campoTipoAcao)) {
		const idx = infixesSelect.indexOf(campoTipoAcao);
		if (idx > 0) return infixesSelect[idx - 1];
	}
	return fallback || null;
}

export function descreverCampoMat(campoInfix) {
	if (!(campoInfix instanceof Element)) return { encontrado: false };
	const campo = campoInfix.closest(".mat-form-field, .mat-mdc-form-field");
	const label = String(
		campo?.querySelector(".mat-form-field-label")?.textContent ||
		campo?.querySelector(".mdc-floating-label")?.textContent ||
		campo?.querySelector("label")?.textContent ||
		""
	).trim();
	const input = campo?.querySelector("input, textarea");
	const temSelect = !!campo?.querySelector(".mat-select, .mat-mdc-select");
	return { encontrado: true, label, temInput: !!input, temSelect };
}

export function formatarDataBR(iso) {
	const info = normalizarDataEntrada(iso);
	return info ? info.br : "";
}

export async function preencherCampoDataMaterial(el, valor) {
	if (!el) return;
	const info = normalizarDataEntrada(valor);
	if (!info) {
		console.warn("[preencherCampoDataMaterial] Data inválida para preenchimento:", valor);
		return;
	}

	const parent = el.closest(".mat-form-field");
	const toggleBtn = parent?.querySelector(".mat-datepicker-toggle button, button[aria-haspopup='dialog']");
	const wasDisabled = el.disabled;
	if (wasDisabled) el.disabled = false;

	el.focus();
	el.value = info.br;

	// Evita parsing ambíguo MM/DD vs DD/MM: manda Date explícita para o Angular Material.
	try {
		el.valueAsDate = info.dateObj;
	} catch {}

	const fireMatEvent = (name) => {
		const evt = new Event(name, { bubbles: true });
		evt.value = info.dateObj;
		el.dispatchEvent(evt);
	};
	fireMatEvent("dateInput");
	fireMatEvent("dateChange");

	// Alguns fluxos internos leem o campo após blur.
	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));

	if (dataCampoPareceInvertida(el.value, info)) {
		console.warn("[preencherCampoDataMaterial] Campo retornou data invertida (possível MM/DD). Reaplicando.", {
			preenchida: info.br,
			lida: el.value
		});
		el.value = info.br;
		fireMatEvent("dateInput");
		fireMatEvent("dateChange");
		el.dispatchEvent(new Event("blur", { bubbles: true }));
	}
	el.classList.remove("ng-pristine");
	el.classList.add("ng-dirty");
	el.classList.add("ng-touched");

	const overlayCalendario = document.querySelector(".cdk-overlay-pane mat-calendar");
	if (overlayCalendario && toggleBtn) toggleBtn.click();
	else if (overlayCalendario) {
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
	}

	if (wasDisabled) el.disabled = true;
	await esperar(150);
}

function normalizarDataEntrada(valor) {
	const texto = String(valor ?? "").trim();
	let ano = 0;
	let mes = 0;
	let dia = 0;

	let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (m) {
		ano = Number(m[1]);
		mes = Number(m[2]);
		dia = Number(m[3]);
	} else {
		m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
		if (!m) return null;
		dia = Number(m[1]);
		mes = Number(m[2]);
		ano = Number(m[3]);
	}

	const dateObj = new Date(ano, mes - 1, dia);
	const valida =
		dateObj instanceof Date &&
		!isNaN(dateObj) &&
		dateObj.getFullYear() === ano &&
		dateObj.getMonth() === mes - 1 &&
		dateObj.getDate() === dia;
	if (!valida) return null;

	const dd = String(dia).padStart(2, "0");
	const mm = String(mes).padStart(2, "0");
	return {
		dia,
		mes,
		ano,
		br: `${dd}/${mm}/${ano}`,
		iso: `${ano}-${mm}-${dd}`,
		dateObj
	};
}

function dataCampoPareceInvertida(valorCampo, info) {
	const m = String(valorCampo || "").trim().match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
	if (!m) return false;
	const diaLido = Number(m[1]);
	const mesLido = Number(m[2]);
	const anoLido = Number(m[3]);
	return anoLido === info.ano && diaLido === info.mes && mesLido === info.dia;
}

export async function esperarCampo(seletor) {
	for (let i = 0; i < 30; i++) {
		const campo = document.querySelector(seletor);
		if (campo) return campo;
		await esperar(100);
	}
	return null;
}

export function esperarNovoCampoValor(indiceEsperado) {
	return new Promise((resolve) => {
		const seletor = "input.input-valor-bloqueio.mat-input-element";
		const tabela = document.querySelector(".mat-table") || document.body;
		let timeoutInatividade, ultimoTotal = 0, timerGeral;
		const encerrar = () => {
			clearTimeout(timerGeral);
			observer.disconnect();
			const campos = document.querySelectorAll(seletor);
			const campoFinal = campos[indiceEsperado] || campos[campos.length - 1];
			resolve(campoFinal);
		};
		const observer = new MutationObserver(() => {
			const campos = document.querySelectorAll(seletor);
			const total = campos.length;
			if (total !== ultimoTotal) {
				ultimoTotal = total;
				clearTimeout(timeoutInatividade);
				timeoutInatividade = setTimeout(encerrar, 300);
			}
		});
		observer.observe(tabela, { childList: true, subtree: true });
		timerGeral = setTimeout(() => {
			observer.disconnect();
			const campos = document.querySelectorAll(seletor);
			const campoFinal = campos[indiceEsperado] || campos[campos.length - 1];
			resolve(campoFinal);
		}, 3000);
	});
}
