// ==========================================================
// Leitura de dados do processo (Eproc)
// ==========================================================

export function consulta_dados_processo() {
  const get = s => document.querySelector(s)?.textContent?.trim() || null;

  const capa = {
    numProcesso:
      document.querySelector("#txtNumProcesso")?.value?.trim() ||
      get("#txtNumProcesso"),
    magistrado: get("#txtMagistrado"),
    classe: get("#txtClasse"),
    competencia: get("#txtCompetencia"),
    autuacao: get("#txtAutuacao"),
    localidade: get("#txtLocalidade"),
    situacao: get("#txtSituacao"),
    localizadores: consultar_localizadores_consulta_processual(),
    orgaoJulgador: get("#txtOrgaoJulgador")
  };

  const tipos = ["AUTOR", "REU", "INTERESSADO", "MPF", "PERITO"];
  const partes = Object.fromEntries(
    tipos.map(tipo => {
      const seletores = document.querySelectorAll(`.infraNomeParte[data-parte="${tipo}"]`);
      const lista = Array.from(seletores).map((el, i) => ({
        nome: el.textContent?.trim() || null,
        cpf:
          document.querySelector(`#spnCpfParte${tipo[0] + tipo.slice(1).toLowerCase()}${i}`)
            ?.textContent?.trim() || null
      }));
      return [tipo, lista];
    })
  );

  return { capa, partes };
}

// ==========================================================
// Localizadores do processo (Eproc)
// ==========================================================

function normalizarTextoLocalizador(texto = "") {
  return String(texto)
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function limparTextoLocalizador(texto = "") {
  return String(texto)
    .replace(/\s+/g, " ")
    .replace(/[⌛✅⚠️🟣]/g, "")
    .trim();
}

// Consulta processual (acao=processo_selecionar):
// localizadores aparecem em #dvLocalizadoresOrgao, nos anchors id="AbreLocalizadores"
export function consultar_localizadores_consulta_processual() {
  const encontrados = new Set();

  document.querySelectorAll("#dvLocalizadoresOrgao a#AbreLocalizadores").forEach((a) => {
    const txt = String(a.innerHTML || "").replace(/\s+/g, " ").trim();
    if (txt) encontrados.add(txt);
  });

  return Array.from(encontrados);
}

// Lista de processos / tabelas:
// localizadores geralmente aparecem em células de tabela e/ou blocos com input numIdLocalizadorOrgao
export function consultar_localizadores_lista_processos() {
  const encontrados = new Set();

  document.querySelectorAll("input[name='numIdLocalizadorOrgao']").forEach((input) => {
    const txt = limparTextoLocalizador(input.parentElement?.textContent || "");
    if (txt) {
      txt
        .split(/\s-\s/g)
        .map(limparTextoLocalizador)
        .filter(Boolean)
        .forEach((item) => encontrados.add(item));
    }
  });

  document.querySelectorAll("td[id^='tdListaDeProcessosPorLocalizadorDesc'], td[id^='tdMeusLocalizadoresDesc']").forEach((td) => {
    const txt = limparTextoLocalizador(td.textContent || "");
    if (txt) encontrados.add(txt);
  });

  document.querySelectorAll("#fldLocalizadores").forEach((secao) => {
    const txt = limparTextoLocalizador(secao.textContent || "");
    if (txt) {
      txt
        .split(/\s-\s/g)
        .map(limparTextoLocalizador)
        .filter(Boolean)
        .forEach((item) => encontrados.add(item));
    }
  });

  return Array.from(encontrados);
}

export function consultar_localizadores_processo() {
  const daConsulta = consultar_localizadores_consulta_processual();
  if (daConsulta.length) return daConsulta;
  return consultar_localizadores_lista_processos();
}

export function processo_tem_localizador(alvos = []) {
  const lista = consultar_localizadores_processo();
  if (!Array.isArray(alvos) || alvos.length === 0) return lista.length > 0;

  const normalizados = lista.map(normalizarTextoLocalizador);
  const termos = alvos
    .map(normalizarTextoLocalizador)
    .filter(Boolean);

  return termos.some((termo) => normalizados.some((item) => item.includes(termo)));
}
