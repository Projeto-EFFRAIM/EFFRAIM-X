// modules/juds/sisbajud/minuta_cadastrar/fluxo.js

import { pressionarEnter, esperar } from "/funcoes.js";
import {
	formatarDataBR,
	preencherCampoDataMaterial,
	esperarCampo,
	preencherCampoConsultado,
	preencherCampoSimples,
	esperarNovoCampoValor
} from "./helpers.js";

export async function configurarRadios(dados) {
	const meta = dados?.dados_consulta?.metadados_consulta ?? {};
	const radios = document.querySelectorAll(".mat-radio-label");
	if (!radios.length) {
		console.warn("[configurarRadios] Nenhum .mat-radio-label encontrado.");
		return;
	}

	console.log("[configurarRadios] Início. Metadados:", meta);

	// função auxiliar para forçar o clique em rádios Angular Material
	const acionarRadio = (elemento, nome) => {
		if (!elemento) {
			console.warn(`[configurarRadios] Rádio '${nome}' não encontrado.`);
			return false;
		}
		const input = elemento.querySelector("input[type='radio']");
		if (!input) {
			console.warn(`[configurarRadios] Rádio '${nome}' não possui input interno.`);
			return false;
		}
		const eventos = ["mousedown", "mouseup", "click", "input", "change"];
		for (const ev of eventos) {
			input.dispatchEvent(new Event(ev, { bubbles: true }));
		}
		elemento.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		console.log(`[configurarRadios] Rádio '${nome}' acionado com eventos completos.`);
		return true;
	};

	// tipo de ordem
	if (meta.tipo === "informacoes") {
		const radioInfo = [...radios].find(e => /informa/i.test(e.innerText));
		acionarRadio(radioInfo, "Requisição de informações");
	} else {
		const radioBloq = [...radios].find(e => /bloqueio/i.test(e.innerText));
		acionarRadio(radioBloq, "Bloqueio de valores");
	}

	// sigilo
	if (meta.ordem_sigilosa) {
		const radioSig = [...radios].find(e => e.innerText.trim().toLowerCase() === "sim");
		if (acionarRadio(radioSig, "Ordem sigilosa (Sim)")) {
			await esperar(500);
			window.scrollTo({ top: 0, behavior: "smooth" });
			const { inserir_aviso_effraim } = await import(
				chrome.runtime.getURL("modules/utils/interface.js")
			);
			inserir_aviso_effraim(
				"Você selecionou uma <span style='font-weight:bold;'>ordem sigilosa</span>. " +
				"Se for o caso, inclua mais <span style='font-weight:bold;'>Visualizadores</span>."
			);
		}
	}

	// conta salário
	if (meta.conta_salario) {
		// apenas slide-toggle (SISBAJUD)
		let slide = [...document.querySelectorAll("mat-slide-toggle")]
			.find(el => /conta\s*sal[áa]rio/i.test(el.innerText || ""));
		// fallback: pega o primeiro slide-toggle da sessão de bloqueio
		if (!slide) {
			const bloco = [...document.querySelectorAll("mat-card, form, div")]
				.find(e => /agendar protocolo|bloqueio/i.test(e.innerText || ""));
			slide = bloco?.querySelector("mat-slide-toggle") || document.querySelector("mat-slide-toggle");
		}
		const thumb = slide?.querySelector(".mat-slide-toggle-thumb-container") || slide?.querySelector(".mat-slide-toggle-bar");
		if (thumb) {
			thumb.scrollIntoView({ block: "center" });
			["mousedown", "mouseup", "click"].forEach(ev =>
				thumb.dispatchEvent(new MouseEvent(ev, { bubbles: true }))
			);
			slide.dispatchEvent(new Event("change", { bubbles: true }));
			console.log("[configurarRadios] Conta salário ativada via slide-toggle.");
			await esperar(200);
		} else {
			console.warn("[configurarRadios] Slide-toggle 'conta salário' não encontrado.");
		}
	}

	// --- agendar protocolo ---
	if (meta.agendar_protocolo) {
	const blocoProt = [...document.querySelectorAll(".sisbajud-label")]
		.find(e => /agendar.*protocolo/i.test(e.innerText));
	if (blocoProt) {
		const grupo = blocoProt.closest(".row")?.nextElementSibling;
		const radioSim = grupo?.querySelector("mat-radio-button label.mat-radio-label-content");
		const radioBtn = grupo?.querySelectorAll("mat-radio-button") ?? [];
		const alvo = [...radioBtn].find(r => /sim/i.test(r.innerText));
		if (alvo) {
		const input = alvo.querySelector("input[type='radio']");
		["mousedown", "mouseup", "click", "input", "change"].forEach(ev =>
			input?.dispatchEvent(new Event(ev, { bubbles: true }))
		);
		alvo.querySelector(".mat-radio-container")?.click();
		console.log("[configurarRadios] 'Agendar protocolo' marcado como Sim.");
		} else {
		console.warn("[configurarRadios] Rádio 'Sim' para agendamento não encontrado.");
		}
	} else {
		console.warn("[configurarRadios] Bloco 'Agendar protocolo' não localizado.");
	}
	} else {
	console.log("[configurarRadios] Meta.agendar_protocolo falso ou indefinido.");
	}

	// --- teimosinha ---
	if (meta.teimosinha) {
	console.log("[configurarRadios] Tentando marcar Teimosinha...");
	const cards = [...document.querySelectorAll("mat-card")];
	const cardTeimo = cards.find(c => /repeti/i.test(c.innerText) || /teimos/i.test(c.innerText));
	if (!cardTeimo) {
		console.warn("[configurarRadios] Card de teimosinha não localizado.");
	} else {
		const radios = [...cardTeimo.querySelectorAll("mat-radio-button")];
		console.log("[configurarRadios] Rádios detectados dentro do card:", radios.map(r => r.innerText.trim()));
		const alvo = radios.find(r => /repetir\s+a\s+ordem\s+até\s+a\s+data/i.test(r.innerText) || /até a data/i.test(r.innerText) || /sim/i.test(r.innerText));
		if (!alvo) {
		console.warn("[configurarRadios] Nenhum rádio com texto 'Repetir' ou 'até a data' localizado.");
		} else {
			const input = alvo.querySelector("input[type='radio']");
			const container = alvo.querySelector(".mat-radio-container");
			if (!input || !container) {
				console.warn("[configurarRadios] Falha ao localizar input/container no rádio teimosinha.");
			} else {
				// sequência robusta de eventos
				["mousedown", "mouseup", "click"].forEach(ev => container.dispatchEvent(new MouseEvent(ev, { bubbles: true })));
				["input", "change"].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
				container.click();
				await esperar(200);
				// clique extra no label para garantir binding Angular
				alvo.querySelector(".mat-radio-label")?.click();
				await esperar(200);
				console.log("[configurarRadios] Rádio 'Teimosinha' marcado (até a data).");
			}

		}
	}
	} else {
	console.log("[configurarRadios] Meta.teimosinha falso ou indefinido.");
	}

	await esperar(400);
	console.log("[configurarRadios] Concluído.");
}


export async function preencherRequisicaoInformacoes(dados) {
	const meta = dados?.dados_consulta?.metadados_consulta ?? {};
	console.log("[preencherRequisicaoInformacoes] Início:", meta);

	const clicar = (labelTexto, nome) => {
		const label = [...document.querySelectorAll(".mat-checkbox-label")]
			.find(e => e.innerText.trim().toLowerCase().includes(labelTexto));
		const area = label?.closest(".mat-checkbox")?.querySelector(".mat-checkbox-inner-container");
		if (area) {
			area.scrollIntoView({ block: "center" });
			area.click();
			console.log(`[preencherRequisicaoInformacoes] ${nome} selecionado.`);
		} else {
			console.warn(`[preencherRequisicaoInformacoes] Campo ${nome} não encontrado.`);
		}
	};

	if (meta.saldo) clicar("saldo", "Saldo");
	if (meta.enderecos) clicar("endere", "Endereços");
	if (meta.agencias) clicar("agênc", "Relação de agências e contas");

	// Correção: localizar o grupo de rádios "ativos encerrados"
	const perguntaEncerr = [...document.querySelectorAll(".sisbajud-label")]
		.find(e => /encerrad/i.test(e.innerText));
	if (perguntaEncerr) {
		const grupo = perguntaEncerr.closest(".row")?.nextElementSibling;
		if (grupo) {
			const radios = [...grupo.querySelectorAll("mat-radio-button")];
			const alvo = meta.incluir_encerrados
				? radios.find(r => /sim/i.test(r.innerText))
				: radios.find(r => /não/i.test(r.innerText));
			if (alvo) {
				alvo.scrollIntoView({ block: "center" });
				const container = alvo.querySelector(".mat-radio-container");
				container?.click();
				container?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				container?.dispatchEvent(new Event("change", { bubbles: true }));
				console.log(`[preencherRequisicaoInformacoes] Incluir encerrados definido para: ${meta.incluir_encerrados ? "Sim" : "Não"}`);
			} else {
				console.warn("[preencherRequisicaoInformacoes] Opção de rádio 'Sim/Não' não encontrada.");
			}
		} else {
			console.warn("[preencherRequisicaoInformacoes] Grupo de rádio 'Encerrados' não localizado após o texto da pergunta.");
		}
	} else {
		console.warn("[preencherRequisicaoInformacoes] Pergunta 'Encerrados' não encontrada.");
	}

	console.log("[preencherRequisicaoInformacoes] Concluído");
}

export async function preencherDatas(dados) {
	const meta = dados?.dados_consulta?.metadados_consulta ?? {};
	console.log("[preencherDatas] Início:", meta);

	if (meta.agendar_protocolo && meta.data_protocolo) {
		const campoProt = await esperarCampo("input[placeholder*='Data do protocolo']");
		if (campoProt) {
			const data = formatarDataBR(meta.data_protocolo);
			await preencherCampoDataMaterial(campoProt, data);
			console.log("[preencherDatas] Data do protocolo preenchida:", data);
		}
	}

	if (meta.teimosinha && meta.data_limite_teimosinha) {
		const campoTeimosinha = await esperarCampo("input[placeholder*='Data limite']");
		if (campoTeimosinha) {
			const data = formatarDataBR(meta.data_limite_teimosinha);
			// garante que o campo esteja habilitado antes de preencher
			for (let i = 0; i < 10 && campoTeimosinha.disabled; i++) {
				await esperar(100);
			}
			await preencherCampoDataMaterial(campoTeimosinha, data);
			await esperar(200);
			console.log("[preencherDatas] Data limite teimosinha preenchida:", data);
		}
	}
}

export async function incluirConsultados(dados, isInformacao = false) {
	console.log("[incluirConsultados] Início");
	const consultados = dados?.dados_consulta?.consultados ?? [];
	const meta = dados?.dados_consulta?.metadados_consulta ?? {};
	if (!consultados.length) {
		console.warn("[incluirConsultados] Nenhum consultado encontrado.");
		return;
	}

	const placeholder = isInformacao
		? "CPF/CNPJ da pessoa pesquisada"
		: "CPF/CNPJ do réu/executado";

	const inputCpf = document.querySelector(`input[placeholder*='${placeholder}']`);

	if (!inputCpf) {
		console.warn(`[incluirConsultados] Campo '${placeholder}' não encontrado.`);
		return;
	}

	// -------------------------------------------------------------
	// NOVO BLOCO RESILIENTE PARA ENCONTRAR O BOTÃO "ADICIONAR"
	// -------------------------------------------------------------

	console.log("[incluirConsultados] Procurando botão 'Adicionar'...");

	// 1. Identifica container lógico do bloco
	let container =
		inputCpf.closest("mat-card, form, .row, .container, .card-body") ||
		inputCpf.closest("[class*='col']") ||
		document;

	console.log("[incluirConsultados] Container identificado:", container);

	// 2. Busca botão dentro desse container
	let botaoAdicionar = container.querySelector(".btn-adicionar");

	// 3. Fallback global caso não encontrado
	if (!botaoAdicionar) {
		console.warn("[incluirConsultados] Botão não encontrado no container. Tentando global...");
		botaoAdicionar = document.querySelector(".btn-adicionar");
	}

	if (!botaoAdicionar) {
		console.error("[incluirConsultados] Botão 'Adicionar' NÃO encontrado. Abortando inclusão.");
		return;
	}

	console.log("[incluirConsultados] Botão encontrado:", botaoAdicionar);

	// -------------------------------------------------------------
	// PROCESSO DE INCLUSÃO DOS CONSULTADOS
	// -------------------------------------------------------------

	for (let i = 0; i < consultados.length; i++) {
		const c = consultados[i];
		console.log(`[incluirConsultados] Preenchendo consultado ${i + 1}/${consultados.length}`);

		// Preenche CPF/CNPJ
		await preencherCampoConsultado(inputCpf, c.cpf);

		// Clica no botão adicionar
		console.log("[incluirConsultados] Clicando no botão 'Adicionar'...");
		await botaoAdicionar.click();

		// Espera o campo de valor aparecer
		const campoValor = await esperarNovoCampoValor(i);

		if (!campoValor) {
			console.warn("[incluirConsultados] Campo de valor não encontrado após adicionar.");
			continue;
		}

		// Preenche valor bruto (somente dígitos)
		const bruto = c.valor_bloqueado ?? "";
		const soDigitos = String(bruto).replace(/[^\d]/g, "");

		console.log(
			`[incluirConsultados] Campo valor localizado. Preenchendo:`,
			{ bruto, soDigitos }
		);

		await preencherCampoSimples(campoValor, soDigitos);

		// Pressiona Enter para validar
		await pressionarEnter(campoValor);
		await esperar(200);

		// Ativa "bloquear conta salário?" na linha, se solicitado nos metadados
		if (meta.conta_salario) {
			const linhas = document.querySelectorAll(".mat-row.element-row");
			const linhaAlvo = linhas[linhas.length - 1];
			const toggle = linhaAlvo?.querySelector(".cdk-column-bloqueioConta mat-slide-toggle .mat-slide-toggle-thumb-container");
			if (toggle) {
				["mousedown", "mouseup", "click"].forEach(ev =>
					toggle.dispatchEvent(new MouseEvent(ev, { bubbles: true }))
				);
				linhaAlvo.querySelector("mat-slide-toggle")?.dispatchEvent(new Event("change", { bubbles: true }));
				console.log("[incluirConsultados] Conta salário ativada na linha", i + 1);
			} else {
				console.warn("[incluirConsultados] Toggle conta salário não localizado na linha", i + 1);
			}
		}

		console.log(`[incluirConsultados] Consultado ${i + 1} incluído.`);
	}

	console.log("[incluirConsultados] Concluído");
}

// ---------------------------------------------------------
// CONSULTANTE — separação CPF/CNPJ + logs (mantendo comportamento original)
// ---------------------------------------------------------
