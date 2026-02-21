import { criarPainelDeslizantePadrao } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";

const RENAJUD_URL = "https://renajud.pdpj.jus.br/veiculo/pesquisa";

export function init() {
	const botao = document.getElementById("btn-renajud");
	if (!botao) {
		console.warn("Botão #btn-renajud não encontrado.");
		return;
	}

	const painel = criarPainelDeslizantePadrao("painel-renajud", botao, "RENAJUD");
	Object.assign(painel.style, {
		background: "#f7fbff",
		color: "#0b2e4b",
		maxHeight: "",
		overflowY: "",
		paddingRight: "12px"
	});

	const conteudo = document.createElement("div");
	conteudo.id = "conteudo-renajud";
	conteudo.style.padding = "8px";
	conteudo.textContent = "Clique no botão RENAJUD para montar a consulta.";
	painel.appendChild(conteudo);

	const abrirPainel = () => {
		painel.style.display = "inline-block";
		painel.style.opacity = "1";
		painel.style.pointerEvents = "auto";
	};

	botao.addEventListener("click", () => {
		abrirPainel();
		montarPainel(conteudo);
	});

	console.log("Painel RENAJUD inicializado.");
}

async function montarPainel(conteudo) {
	try {
		const dados_processo = window.__EFFRAIM_DADOS_PROCESSO || consulta_dados_processo();
		conteudo.innerHTML = "";

		const html = gerarPainelRenajud(dados_processo);
		conteudo.insertAdjacentHTML("beforeend", html);

		// máscara de moeda (R$) nos valores de penhora
		const { registrarMascaraMoeda } = await import(chrome.runtime.getURL("modules/utils/interface.js"));
		const valores = conteudo.querySelectorAll(".valor_consultado");
		registrarMascaraMoeda(valores);

		const btnProsseguir = conteudo.querySelector("#btn-prosseguir-renajud");
		btnProsseguir?.addEventListener("click", () => {
			const payload = coletarDados(conteudo, dados_processo);
			console.log("[RENAJUD] Dados coletados:", payload);
			injetarIframe(conteudo, payload);
		});
	} catch (e) {
		conteudo.textContent = "Erro ao montar painel RENAJUD.";
		console.error(e);
	}
}

function gerarPainelRenajud(dados) {
	return `
		<div style="max-height:480px; overflow-y:auto; padding:8px 16px 8px 8px; box-sizing:border-box;">
			<h3>Consultante (autores)</h3>
			${renderConsultanteFixo(dados.partes?.AUTOR)}
			<h3>Selecione os consultados</h3>
			${gerarListaPartes(dados.partes?.REU, "consultado", true)}
		</div>
		<div style="position:sticky; bottom:0; background:#f7fbff; padding:8px 0; text-align:center; border-top:1px solid #ccc;">
			<button id="btn-prosseguir-renajud">Prosseguir</button>
		</div>
	`;
}

function gerarListaPartes(partes = [], tipo, incluirValor = false) {
	if (!Array.isArray(partes) || partes.length === 0) {
		return `<p>Nenhum ${tipo === "consultante" ? "consultante" : "consultado"} encontrado.</p>`;
	}
	const checkType = tipo === "consultante" ? "radio" : "checkbox";
	return partes.map((parte, i) => {
		const nome = parte?.nome || "(sem nome)";
		const cpf = parte?.cpf || "";
		const cpfHtml = cpf ? `(${cpf})` : `<span class="effraim-texto-atencao">CPF/CNPJ não informado</span>`;
		const checked = i === 0 && tipo === "consultante" ? "checked" : "";
		const blocoValor = incluirValor
			? `<div style="margin-left:18px; margin-top:4px;">
				 <label>Valor penhora:
				   <input type="text" class="valor_consultado" data-idx="${i}" style="width:120px; text-align:right;">
				 </label>
			   </div>`
			: "";
		return `
			<div class="linha_parte" style="margin-bottom:6px;">
				<label>
					${tipo === "consultante" ? "" : `<input type="${checkType}" name="${tipo}" value="${i}" data-nome="${nome}" data-cpf="${cpf}" ${checked}>`}
					<span style="font-weight:600;">${nome}</span> ${cpfHtml}
				</label>
				${blocoValor}
			</div>
		`;
	}).join("");
}

function renderConsultanteFixo(autores = []) {
	if (!Array.isArray(autores) || autores.length === 0) {
		return `<p class="effraim-texto-atencao">Sem autores encontrados.</p>`;
	}
	return autores.map((a, i) => {
		const nome = a?.nome || "(sem nome)";
		const cpf = a?.cpf || "";
		const cpfHtml = cpf ? `(${cpf})` : `<span class="effraim-texto-atencao">CPF/CNPJ não informado</span>`;
		return `<div style="margin-bottom:4px; font-weight:600;">${nome} ${cpfHtml}</div>`;
	}).join("");
}

function coletarDados(conteudo, dados_processo) {
	const autores = dados_processo.partes?.AUTOR || [];
	const consultante = autores.length ? { nome: autores[0].nome, cpf: autores[0].cpf } : null;
	const consultadosSel = [...conteudo.querySelectorAll('input[name="consultado"]:checked')];

	const consultados = consultadosSel.map(cb => {
		const idx = cb.value;
		const input = conteudo.querySelector(`input.valor_consultado[data-idx="${idx}"]`);
		const raw = (input?.value || "").replace(/\./g, "").replace(",", ".");
		const valor = parseFloat(raw);
		return {
			nome: cb.dataset.nome,
			cpf: cb.dataset.cpf,
			valor_penhora: isNaN(valor) ? null : valor
		};
	});

	return { dados_processo, consultante, consultados };
}

function injetarIframe(conteudo, payload) {
	conteudo.innerHTML = "";
	const iframe = document.createElement("iframe");
	iframe.id = "effraim-iframe-renajud";
	iframe.src = RENAJUD_URL;
	Object.assign(iframe.style, {
		width: "100%",
		height: "100%",
		minHeight: "320px",
		border: "none",
		background: "#fff",
	});
	conteudo.appendChild(iframe);

	iframe.addEventListener("load", () => {
		console.log("[RENAJUD] Iframe carregado, enviando dados...");
		iframe.contentWindow.postMessage(
			{
				type: "EFFRAIM_DADOS_RENAJUD",
				dados: payload,
				origem: window.location.origin
			},
			"https://renajud.pdpj.jus.br"
		);
	});
}
