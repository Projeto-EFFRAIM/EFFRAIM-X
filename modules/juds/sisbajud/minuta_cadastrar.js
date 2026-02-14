// modules/juds/sisbajud/minuta_cadastrar.js

import { pressionarEnter, esperar, normalizar } from "/funcoes.js";

// Pausa padrão entre dígitos nos campos com máscara (CPF/CNPJ)
const PAUSA_DIGITO = 200;

export async function executar(dados) {
	try {
		console.log("[minuta_cadastrar] Início. Dados recebidos:", dados);

		const { inserir_aviso_effraim } = await import(
			chrome.runtime.getURL("modules/utils/interface.js")
		);

		const campos = document.querySelectorAll(".mat-form-field-infix");
		if (!campos || campos.length < 7) {
			console.warn("[minuta_cadastrar] Campos insuficientes. Abortando.");
			return;
		}

		console.log("[1] Configurando rádios iniciais (tipo, sigilo, protocolo, teimosinha)");
		await configurarRadios(dados);
		await esperar(600);

		console.log("[2] Preenchendo magistrado:", dados?.capa?.magistrado);
		campos[1].click();
		await esperar(400);
		await selecionarOpcaoMatSelect(dados?.capa?.magistrado)



		console.log("[3] Selecionando órgão julgador");
		campos[2].click();
		await esperar(400);
		await selecionarOpcaoMatSelect(dados?.sisbajud_configuracoes?.favoritos?.orgaoJulgador?.valor);

		console.log("[4] Preenchendo número do processo");
		await preencherCampoSimples(
			campos[3]?.querySelector(".mat-input-element"),
			dados?.capa?.numProcesso
		);

		console.log("[5] Selecionando tipo de ação");
		campos[4].click();
		await esperar(400);
		await selecionarOpcaoMatSelect(dados?.sisbajud_configuracoes?.favoritos?.tipoAcao?.valor);

		console.log("[6] Preenchendo CPF do consultante");
		await preencherCampoConsultante(
			campos[5]?.querySelector(".mat-input-element"),
			dados?.dados_consulta?.consultante?.cpf
		);

		console.log("[7] Preenchendo nome do consultante");
		await preencherCampoSimples(
			campos[6]?.querySelector(".mat-input-element"),
			dados?.dados_consulta?.consultante?.nome
		);

		if (dados?.dados_consulta?.metadados_consulta?.tipo === "informacoes") {
			console.log("[8] Preenchendo opções de Requisição de Informações");
			await preencherRequisicaoInformacoes(dados);
			console.log("[9] Incluindo consultados de informações");
			await incluirConsultados(dados, true);
		} else {
			console.log("[8] Preenchendo datas (protocolo / teimosinha)");
			await preencherDatas(dados);
			console.log("[9] Incluindo consultados de bloqueio");
			await incluirConsultados(dados, false);
		}

		await clicarFinalizarSalvarProtocolar();

		console.log("[minuta_cadastrar] Execução finalizada com sucesso.");
	} catch (erro) {
		console.error("[minuta_cadastrar] Erro durante execução:", erro);
	}
}

async function configurarRadios(dados) {
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


async function preencherRequisicaoInformacoes(dados) {
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

async function preencherDatas(dados) {
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

async function incluirConsultados(dados, isInformacao = false) {
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
async function preencherCampoConsultante(el, valor) {
	if (!el) {
		console.warn("[preencherCampoConsultante] Elemento do campo não encontrado.");
		return;
	}

	const parent = el.closest(".mat-form-field");
	const textoOriginal = String(valor ?? "");
	const soDigitos = textoOriginal.replace(/[^\d]/g, "");
	const isCPF = soDigitos.length <= 11;
	const pausaDigito = PAUSA_DIGITO; // pausa entre dígitos críticos para CPF/CNPJ

	console.log(
		"[preencherCampoConsultante] Início",
		{
			valorBruto: textoOriginal,
			soDigitos,
			len: soDigitos.length,
			tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
		}
	);

	const pausaCritica = 80; // mesmo valor anterior

	el.focus();
	el.value = "";
	el.dispatchEvent(new Event("input", { bubbles: true }));
	parent?.dispatchEvent(new Event("input", { bubbles: true }));

	let index = 0;

	// Mantém exatamente a mesma lógica de "digitação" do código anterior,
	// apenas com logs extras e detecção de tipo.
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
				console.log(
					`[preencherCampoConsultante] Pausa crítica no dígito ${index} (char='${char}').`
				);
				await esperar(pausaCritica);
			}
		}
	} else {
		// -----------------------------------------------------
		// CNPJ — digitação simulada com pausas críticas
		// -----------------------------------------------------
		console.log("[preencherCampoConsultante] Modo CNPJ (digitação simulada).");

		const pauses = [2, 5, 8, 12, 13, 14];
		let index = 0;

		el.value = ""; // limpar antes de digitar

		for (const char of soDigitos) {
			index++;

			// Eventos padrão Angular Material
			el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));

			el.value += char;

			el.dispatchEvent(new Event("input", { bubbles: true }));
			parent?.dispatchEvent(new Event("input", { bubbles: true }));

			el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));

			// Pausas nos pontos críticos da máscara do CNPJ
			if (pauses.includes(index)) {
				console.log(`[CNPJ-consultante] Pausa crítica no dígito ${index} (char='${char}')`);
				await esperar(80);
			}
		}

		// Pequena pausa para consolidar
		await esperar(20);

		// Eventos finais
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

	console.log(
		"[preencherCampoConsultante] Final",
		{
			valorCampoFinal: el.value,
			lenFinal: String(el.value ?? "").replace(/[^\d]/g, "").length,
			tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
		}
	);
}



// ---------------------------------------------------------
// CONSULTADO — separação CPF/CNPJ + logs (mantendo comportamento original)
// ---------------------------------------------------------
async function preencherCampoConsultado(el, valor) {
	if (!el) {
		console.warn("[preencherCampoConsultado] Elemento do campo não encontrado.");
		return;
	}

	const parent = el.closest(".mat-form-field");
	const textoOriginal = String(valor ?? "");
	const soDigitos = textoOriginal.replace(/[^\d]/g, "");
	const isCPF = soDigitos.length <= 11;
	const pausaDigito = PAUSA_DIGITO; // pausa entre dígitos críticos para CPF/CNPJ

	console.log(
		"[preencherCampoConsultado] Início",
		{
			valorBruto: textoOriginal,
			soDigitos,
			len: soDigitos.length,
			tipoDetectado: isCPF ? "CPF" : "CNPJ/indefinido"
		}
	);

	el.focus();

	// -----------------------------------------------------
	// CPF — funciona bem, mantém exatamente como estava
	// -----------------------------------------------------
	if (isCPF) {
		console.log("[preencherCampoConsultado] Modo CPF (digitação simulada).");

		const pauses = [3, 6, 9, 10]; // pontos da máscara ###.###.###-##
		let index = 0;

		el.value = ""; // zera o campo antes de digitar

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

				// pausa após cada dígito para a máscara acompanhar
				console.log(`[CPF] Pausa após dígito ${index} (char='${char}')`);
				await esperar(pausa);
			}
		};

		// primeira digitação com pausa padrão
		await digitar(PAUSA_DIGITO);
		await esperar(100); // pausa pós digitação para a máscara/consulta remota

		// se a máscara apagou DV (len < 11), redigita mais devagar
		if (String(el.value ?? "").replace(/[^\d]/g, "").length < 11) {
			console.warn("[preencherCampoConsultado] CPF encolheu após máscara; redigitando com pausa maior.");
			await digitar(150);
			await esperar(300); // pausa pós redigitação
		}

		// pausa extra para a máscara consolidar antes de disparar change/blur
		await esperar(150);

		el.dispatchEvent(new Event("change", { bubbles: true }));
		parent?.dispatchEvent(new Event("change", { bubbles: true }));

		await esperar(50);

		el.dispatchEvent(new Event("blur", { bubbles: true }));
		parent?.dispatchEvent(new Event("blur", { bubbles: true }));

		console.log("[preencherCampoConsultado] CPF final:", el.value);
		return;
	}

	// -----------------------------------------------------
	// CNPJ — digitação simulada com pausas críticas
	// -----------------------------------------------------
	console.log("[preencherCampoConsultado] Modo CNPJ (digitação simulada).");

	const pauses = [2, 5, 8, 12, 13, 14];
	let index = 0;

	el.value = ""; // zera o campo antes de digitar

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

	// Após toda a digitação:
	await esperar(20);

	el.dispatchEvent(new Event("change", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));

	await esperar(20);

	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));

	console.log("[preencherCampoConsultado] CNPJ final:", el.value);

}


// ---------------------------------------------------------
// NOVA FUNÇÃO 3 — Campos simples (sem validação especial)
// ---------------------------------------------------------
async function preencherCampoSimples(el, valor) {
	if (!el) return;

	const parent = el.closest('.mat-form-field');

	el.focus();
	el.value = String(valor ?? "");

	el.dispatchEvent(new Event("input", { bubbles: true }));
	parent?.dispatchEvent(new Event("input", { bubbles: true }));

	el.dispatchEvent(new Event("change", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));

	el.dispatchEvent(new Event("blur", { bubbles: true }));
	parent?.dispatchEvent(new Event("blur", { bubbles: true }));
}



function formatarDataBR(iso) {
	// evita deslocamento de fuso ao criar Date()
	const m = String(iso ?? "").match(/(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return "";
	const [_, ano, mes, dia] = m;
	return `${dia}/${mes}/${ano}`;
}

// Dispara eventos esperados pelo matDatepicker em inputs tipo texto
async function preencherCampoDataMaterial(el, valor) {
	if (!el) return;
	const parent = el.closest(".mat-form-field");
	el.focus();
	el.value = String(valor ?? "");
	["input", "change", "blur"].forEach(ev =>
		el.dispatchEvent(new Event(ev, { bubbles: true }))
	);
	parent?.dispatchEvent(new Event("input", { bubbles: true }));
	parent?.dispatchEvent(new Event("change", { bubbles: true }));
	await esperar(120);
}


async function esperarCampo(seletor) {
	for (let i = 0; i < 30; i++) {
		const campo = document.querySelector(seletor);
		if (campo) return campo;
		await esperar(100);
	}
	return null;
}

function esperarNovoCampoValor(indiceEsperado) {
	return new Promise(resolve => {
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

function esperarSobreposicao(seletor) {
	return new Promise(resolve => {
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

async function selecionarOpcaoMatSelect(textoOpcao, seletor = "[id^='mat-option']") {
	if (!textoOpcao) return;
	const overlay = await esperarSobreposicao(seletor);
	const lista = [...overlay.querySelectorAll(seletor)];
	const alvo = normalizar(textoOpcao);
	const opcao = lista.find(e => normalizar(e.innerText).includes(alvo));
	if (!opcao) return;
	opcao.scrollIntoView({ block: "center" });
	opcao.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

async function clicarFinalizarSalvarProtocolar() {
	console.log("[clicarFinalizarSalvarProtocolar] Início");

	// espera curta para a tela estabilizar
	await esperar(300);

	// ----------------------------------------------
	// 1. CLICAR SALVAR (se existir)
	// ----------------------------------------------
	let botaoSalvar = [...document.querySelectorAll("button")]
		.find(b => /salvar/i.test(b.innerText));

	if (botaoSalvar) {
		console.log("[clicarFinalizarSalvarProtocolar] Botão SALVAR encontrado:", botaoSalvar.innerText);
		botaoSalvar.scrollIntoView({ block: "center" });
		await esperar(80);
		botaoSalvar.click();
		await esperar(350);
	} else {
		console.log("[clicarFinalizarSalvarProtocolar] Nenhum botão SALVAR encontrado. Prosseguindo...");
	}

	// ----------------------------------------------
	// 2. CLICAR PROTOCOLAR (independente se ficou oculto antes)
	// ----------------------------------------------
	let botaoProtocolar = [...document.querySelectorAll("button")]
		.find(b => /protocolar/i.test(b.innerText));

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
