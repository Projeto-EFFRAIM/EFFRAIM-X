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
