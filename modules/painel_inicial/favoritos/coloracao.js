export const PALETA_PASTAS = [
	"#F2B84B",
	"#F2996E",
	"#EB6FB4",
	"#BB86FC",
	"#6C8EF5",
	"#4DA3FF",
	"#2BBBAD",
	"#7BC96F",
	"#E6C229",
	"#D98C5F",
	"#8FAAA3"
];

let paletaAtiva = null;
const linhasComHookHover = new WeakSet();

function fecharPaleta() {
	if (paletaAtiva?.parentNode) paletaAtiva.parentNode.removeChild(paletaAtiva);
	paletaAtiva = null;
	document.removeEventListener("click", fecharPaleta, true);
}

function hexParaRgb(hex) {
	const valor = String(hex || "").trim().replace("#", "");
	if (!/^[0-9a-fA-F]{6}$/.test(valor)) return null;
	const n = Number.parseInt(valor, 16);
	return {
		r: (n >> 16) & 255,
		g: (n >> 8) & 255,
		b: n & 255
	};
}

export function corHexParaRgba(hex, alpha = 0.22) {
	const rgb = hexParaRgb(hex);
	if (!rgb) return null;
	const a = Math.max(0, Math.min(1, Number(alpha)));
	return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

export function aplicarColoracaoElemento(elemento, corHex, alpha = 0.22) {
	if (!elemento) return;
	if (!corHex) {
		elemento.classList.remove("effraim-colorido");
		elemento.style.removeProperty("--effraim-cor-borda");
		elemento.style.removeProperty("--effraim-cor-fundo");
		return;
	}
	const fundo = corHexParaRgba(corHex, alpha);
	if (!fundo) return;
	elemento.classList.add("effraim-colorido");
	elemento.style.setProperty("--effraim-cor-borda", corHex);
	elemento.style.setProperty("--effraim-cor-fundo", fundo);
}

export function aplicarColoracaoLinhaTabela(linha, corHex, alpha = 0.22) {
	if (!linha) return;
	const tds = Array.from(linha.querySelectorAll(":scope > td"));
	const reaplicarNosTds = (fundo) => {
		const borda = linha.style.getPropertyValue("--effraim-cor-borda") || "";
		tds.forEach((td, idx) => {
			td.style.setProperty("background-color", fundo, "important");
			if (borda) {
				td.style.setProperty("border-top", `1px solid ${borda}`, "important");
				td.style.setProperty("border-bottom", `1px solid ${borda}`, "important");
				if (idx === 0) td.style.setProperty("border-left", `1px solid ${borda}`, "important");
				if (idx === tds.length - 1) td.style.setProperty("border-right", `1px solid ${borda}`, "important");
			}
		});
	};

	if (!linhasComHookHover.has(linha)) {
		const handleHover = () => {
			const fundoAtual = linha.dataset.effraimCorFundo || "";
			if (!fundoAtual) return;
			reaplicarNosTds(fundoAtual);
		};
		linha.addEventListener("mouseenter", handleHover, true);
		linha.addEventListener("mousemove", handleHover, true);
		linhasComHookHover.add(linha);
	}

	if (!corHex) {
		linha.classList.remove("effraim-colorido-linha");
		linha.style.removeProperty("--effraim-cor-borda");
		linha.style.removeProperty("--effraim-cor-fundo");
		delete linha.dataset.effraimCorFundo;
		tds.forEach(td => {
			td.style.removeProperty("background-color");
			td.style.removeProperty("border-top");
			td.style.removeProperty("border-bottom");
			td.style.removeProperty("border-left");
			td.style.removeProperty("border-right");
		});
		return;
	}
	const fundo = corHexParaRgba(corHex, alpha);
	if (!fundo) return;
	linha.classList.add("effraim-colorido-linha");
	linha.style.setProperty("--effraim-cor-borda", corHex);
	linha.style.setProperty("--effraim-cor-fundo", fundo);
	linha.dataset.effraimCorFundo = fundo;
	reaplicarNosTds(fundo);
}

function posicionarPaleta(paleta, anchor) {
	const rect = anchor.getBoundingClientRect();
	let top = rect.bottom + window.scrollY + 4;
	let left = rect.left + window.scrollX - 8;
	paleta.style.top = `${top}px`;
	paleta.style.left = `${left}px`;
	const p = paleta.getBoundingClientRect();
	const margem = 12;
	if (p.right > window.innerWidth) {
		left = Math.max(margem, window.innerWidth - p.width - margem) + window.scrollX;
		paleta.style.left = `${left}px`;
	}
	if (p.bottom > window.innerHeight) {
		top = Math.max(margem, window.innerHeight - p.height - margem) + window.scrollY;
		paleta.style.top = `${top}px`;
	}
}

export function abrirPaletaCores(anchorEl, onSelecionar) {
	if (!anchorEl || typeof onSelecionar !== "function") return;
	if (paletaAtiva && paletaAtiva.dataset.anchorId === anchorEl.dataset.paletteAnchorId) {
		fecharPaleta();
		return;
	}
	fecharPaleta();

	if (!anchorEl.dataset.paletteAnchorId) {
		anchorEl.dataset.paletteAnchorId = `p-${Math.random().toString(36).slice(2)}`;
	}

	const paleta = document.createElement("div");
	paleta.className = "effraim-paleta-cores";
	paleta.dataset.anchorId = anchorEl.dataset.paletteAnchorId;

	PALETA_PASTAS.forEach(cor => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "effraim-paleta-cor";
		btn.title = cor;
		btn.style.background = cor;
		btn.onclick = async (e) => {
			e.stopPropagation();
			await onSelecionar(cor);
			fecharPaleta();
		};
		paleta.appendChild(btn);
	});

	const btnLimpar = document.createElement("button");
	btnLimpar.type = "button";
	btnLimpar.className = "effraim-paleta-cor limpar";
	btnLimpar.title = "Remover cor";
	btnLimpar.textContent = "X";
	btnLimpar.onclick = async (e) => {
		e.stopPropagation();
		await onSelecionar(null);
		fecharPaleta();
	};
	paleta.appendChild(btnLimpar);

	document.body.appendChild(paleta);
	paletaAtiva = paleta;
	posicionarPaleta(paleta, anchorEl);
	setTimeout(() => document.addEventListener("click", fecharPaleta, true), 0);
}
