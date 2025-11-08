// ==========================================================
// Rotas e monitoramento de navegação
// ==========================================================

export function verificarRotasAtivas(rotas, cfg) {
  const disponiveis = rotas.filter(r => r.cond());
  return disponiveis.filter(r => cfg.funcionalidades_ativas?.[r.nome].valor);
}

export function monitorarMudancaDeRota(mapaRotas, intervalo = 1000) {
  let ultima = location.href;
  const checar = () => {
    const atual = location.href;
    if (atual === ultima) return;
    ultima = atual;
    for (const [rota, acao] of Object.entries(mapaRotas))
      if (atual.startsWith(rota)) acao(atual);
  };
  const id = setInterval(checar, intervalo);
  return () => clearInterval(id);
}
