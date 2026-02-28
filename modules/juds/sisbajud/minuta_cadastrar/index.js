// modules/juds/sisbajud/minuta_cadastrar/index.js

import { esperar } from "/funcoes.js";
import {
	preencherCampoConsultante,
	preencherCampoSimples,
	preencherAutocompleteMat,
	selecionarOpcaoMatSelect,
	lerTextoMatSelect,
	lerValorCampo,
	localizarCampoBasicoSisbajud,
	localizarCampoVaraJuizoSisbajud,
	descreverCampoMat,
	clicarFinalizarSalvarProtocolar
} from "./helpers.js";
import {
	configurarRadios,
	preencherRequisicaoInformacoes,
	preencherDatas,
	incluirConsultados
} from "./fluxo.js";

export async function executar(dados) {
	try {
		console.log("[minuta_cadastrar] Início. Dados recebidos:", dados);

		const campos = document.querySelectorAll(".mat-form-field-infix");
		if (!campos || campos.length < 7) {
			console.warn("[minuta_cadastrar] Campos insuficientes. Abortando.");
			return;
		}
		const campoMagistrado = localizarCampoBasicoSisbajud("juiz solicitante", campos[1]);
		const campoNumeroProcesso = localizarCampoBasicoSisbajud("numero do processo", campos[3]);
		const campoTipoAcao = localizarCampoBasicoSisbajud("tipo/natureza da acao", campos[4]);
		const campoOrgaoJulgador = localizarCampoVaraJuizoSisbajud(campoTipoAcao, campos[2]);
		const campoCpfConsultante = localizarCampoBasicoSisbajud("cpf/cnpj do autor/exequente", campos[5]);
		const campoNomeConsultante = localizarCampoBasicoSisbajud("nome do autor/exequente", campos[6]);

		console.log("[minuta_cadastrar] Mapeamento de campos básicos:", {
			magistrado: descreverCampoMat(campoMagistrado),
			orgaoJulgador: descreverCampoMat(campoOrgaoJulgador),
			numeroProcesso: descreverCampoMat(campoNumeroProcesso),
			tipoAcao: descreverCampoMat(campoTipoAcao),
			cpfConsultante: descreverCampoMat(campoCpfConsultante),
			nomeConsultante: descreverCampoMat(campoNomeConsultante)
		});

		console.log("[1] Configurando rádios iniciais (tipo, sigilo, protocolo, teimosinha)");
		await configurarRadios(dados);
		await esperar(600);

		console.log("[2] Preenchendo magistrado:", dados?.capa?.magistrado);
		const inputMagistrado = campoMagistrado?.querySelector(".mat-input-element, input");
		campoMagistrado?.click();
		await esperar(400);
		await preencherAutocompleteMat(inputMagistrado, dados?.capa?.magistrado);
		console.log("[2.1] Resultado magistrado:", {
			esperado: dados?.capa?.magistrado || "",
			exibido: lerValorCampo(inputMagistrado) || lerTextoMatSelect(campoMagistrado)
		});



		console.log("[3] Selecionando órgão julgador");
		campoOrgaoJulgador?.click();
		await esperar(400);
		await selecionarOpcaoMatSelect(dados?.sisbajud_configuracoes?.favoritos?.orgaoJulgador?.valor);
		console.log("[3.1] Resultado órgão julgador:", {
			esperado: dados?.sisbajud_configuracoes?.favoritos?.orgaoJulgador?.valor || "",
			exibido: lerTextoMatSelect(campoOrgaoJulgador)
		});

		console.log("[4] Preenchendo número do processo:", dados?.capa?.numProcesso);
		await preencherCampoSimples(
			campoNumeroProcesso?.querySelector(".mat-input-element"),
			dados?.capa?.numProcesso
		);
		console.log("[4.1] Resultado número do processo:", {
			esperado: dados?.capa?.numProcesso || "",
			exibido: lerValorCampo(campoNumeroProcesso?.querySelector(".mat-input-element"))
		});

		console.log("[5] Selecionando tipo de ação:", dados?.sisbajud_configuracoes?.favoritos?.tipoAcao?.valor);
		campoTipoAcao?.click();
		await esperar(400);
		await selecionarOpcaoMatSelect(dados?.sisbajud_configuracoes?.favoritos?.tipoAcao?.valor);
		console.log("[5.1] Resultado tipo de ação:", {
			esperado: dados?.sisbajud_configuracoes?.favoritos?.tipoAcao?.valor || "",
			exibido: lerTextoMatSelect(campoTipoAcao)
		});

		console.log("[6] Preenchendo CPF do consultante");
		await preencherCampoConsultante(
			campoCpfConsultante?.querySelector(".mat-input-element"),
			dados?.dados_consulta?.consultante?.cpf
		);

		console.log("[7] Preenchendo nome do consultante");
		await preencherCampoSimples(
			campoNomeConsultante?.querySelector(".mat-input-element"),
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

