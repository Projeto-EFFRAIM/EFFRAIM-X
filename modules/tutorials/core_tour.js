function criarBotao(label, onClick) {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "effraim-tour-btn";
	btn.textContent = label;
	btn.addEventListener("click", onClick);
	return btn;
}

function ensureTourStyles() {
	if (document.getElementById("effraim-tour-inline-style")) return;
	const style = document.createElement("style");
	style.id = "effraim-tour-inline-style";
	style.textContent = `
		.effraim-tour-overlay {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.55);
			z-index: 2147483000;
		}
		.effraim-tour-tooltip {
			position: absolute;
			max-width: 320px;
			background: #ffffff;
			color: #183749;
			border: 1px solid #9bc6d6;
			border-radius: 10px;
			box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
			padding: 10px 12px;
			z-index: 2147483001;
		}
		.effraim-tour-titulo { margin: 0 0 6px; font-size: 14px; }
		.effraim-tour-texto { margin: 0; font-size: 13px; }
		.effraim-tour-acoes { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
		.effraim-tour-btn {
			border: 1px solid #7caec2;
			background: #e7f5fb;
			color: #0e3f55;
			border-radius: 6px;
			padding: 5px 10px;
			cursor: pointer;
			font-weight: 600;
		}
		.effraim-tour-highlight {
			position: relative !important;
			z-index: 2147483002 !important;
			outline: 3px solid #ffd54f !important;
			outline-offset: 2px !important;
			border-radius: 8px !important;
		}
	`;
	document.head.appendChild(style);
}

export function iniciarTour(steps = []) {
	const passos = Array.isArray(steps) ? steps : [];
	if (!passos.length) return;
	ensureTourStyles();

	let idx = 0;
	let destaqueAtual = null;

	const overlay = document.createElement("div");
	overlay.className = "effraim-tour-overlay";

	const tooltip = document.createElement("div");
	tooltip.className = "effraim-tour-tooltip";

	const titulo = document.createElement("h3");
	titulo.className = "effraim-tour-titulo";

	const texto = document.createElement("p");
	texto.className = "effraim-tour-texto";

	const acoes = document.createElement("div");
	acoes.className = "effraim-tour-acoes";

	function limparDestaque() {
		if (destaqueAtual) {
			destaqueAtual.classList.remove("effraim-tour-highlight");
			destaqueAtual = null;
		}
	}

	function encerrar() {
		limparDestaque();
		overlay.remove();
		tooltip.remove();
	}

	function posicionarTooltip(alvo) {
		const rect = alvo.getBoundingClientRect();
		const gap = 10;
		let top = rect.bottom + gap;
		let left = rect.left;
		document.body.appendChild(tooltip);
		const tooltipRect = tooltip.getBoundingClientRect();
		if (left + tooltipRect.width > window.innerWidth - 8) {
			left = Math.max(8, window.innerWidth - tooltipRect.width - 8);
		}
		if (top + tooltipRect.height > window.innerHeight - 8) {
			top = Math.max(8, rect.top - tooltipRect.height - gap);
		}
		tooltip.style.top = `${top + window.scrollY}px`;
		tooltip.style.left = `${left + window.scrollX}px`;
	}

	function resolverAlvo(passo) {
		if (!passo) return null;
		if (typeof passo.selectorFn === "function") {
			try {
				return passo.selectorFn();
			} catch {
				return null;
			}
		}
		return passo?.selector ? document.querySelector(passo.selector) : null;
	}

	async function renderPasso() {
		limparDestaque();
		const passo = passos[idx];
		if (typeof passo?.onEnter === "function") {
			try {
				await passo.onEnter();
			} catch (e) {
				console.warn("[EFFRAIM tour] Falha no onEnter do passo:", e);
			}
		}

		const alvo = resolverAlvo(passo);
		if (!alvo) {
			if (idx < passos.length - 1) {
				idx += 1;
				await renderPasso();
			} else {
				encerrar();
			}
			return;
		}

		destaqueAtual = alvo;
		destaqueAtual.classList.add("effraim-tour-highlight");
		destaqueAtual.scrollIntoView({ behavior: "smooth", block: "center" });

		titulo.textContent = passo.titulo || `Passo ${idx + 1}`;
		texto.textContent = passo.texto || "";

		acoes.innerHTML = "";
		if (idx > 0) {
			acoes.appendChild(criarBotao("Voltar", () => {
				idx -= 1;
				void renderPasso();
			}));
		}
		if (idx < passos.length - 1) {
			acoes.appendChild(criarBotao("Próximo", () => {
				idx += 1;
				void renderPasso();
			}));
		} else {
			acoes.appendChild(criarBotao("Concluir", encerrar));
		}
		acoes.appendChild(criarBotao("Encerrar", encerrar));

		tooltip.innerHTML = "";
		tooltip.append(titulo, texto, acoes);
		posicionarTooltip(alvo);
	}

	document.body.appendChild(overlay);
	void renderPasso();
}
