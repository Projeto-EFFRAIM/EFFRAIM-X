// ==========================================================
// Interação com DOM e CSS
// ==========================================================


//preparar DOM==================================================

export async function prepararDOM(estilo = "assets/css/estilos.css") {
	await aguardarDOM();
	await injetarCSS(estilo);
}

export function aguardarDOM() {
return new Promise(resolve => {
	if (document.readyState === "complete" || document.readyState === "interactive")
	resolve();
	else document.addEventListener("DOMContentLoaded", resolve);
});
}

export function injetarCSS(caminho) {
return new Promise(resolve => {
	const link = Object.assign(document.createElement("link"), {
	rel: "stylesheet",
	href: chrome.runtime.getURL(caminho)
	});
	link.onload = resolve;
	document.head.appendChild(link);
});
}

//fim de preparar DOM===============================================


// observar==========================================================
export function esperarElemento(seletor, callback) {
const el = document.querySelector(seletor);
if (el) return callback(el);

const obs = new MutationObserver(() => {
	const encontrado = document.querySelector(seletor);
	if (encontrado) {
	obs.disconnect();
	callback(encontrado);
	}
});
obs.observe(document.body, { childList: true, subtree: true });
}

export function limparEventos(el) {
const clone = el.cloneNode(true);
el.replaceWith(clone);
return clone;
}


export function esperar(ms = 200) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//fim de observar===============================================================



// pressionar teclas========================================================

export function pressionarEnter(el) {
	if (!el) return;
	el.dispatchEvent(new KeyboardEvent("keydown", {
		key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
	}));
	el.dispatchEvent(new KeyboardEvent("keyup", {
		key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true
	}));
}

//Fim de pressioanr teclas=====================================================