//Funções auxiliares para as páginas que utilizam o Google Charts, Bootstrap Chosen, leitura de parâmetros.
function getParametro(valor) {
    //let urlPagina = window.location.href, res, lista;
    //if (urlPagina.split("?").length == 1) { return ""; }
    //lista = (urlPagina.split("?")[1]).split("&");

    //lista.forEach(function (item, index) {
    //    if (item.indexOf(valor) > -1) {
    //        res = item.split("=")[1];
    //        return true;
    //    }
    //});
    //return (res ? res : "");

    var result = "", tmp = [];
    var items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === valor) result = decodeURIComponent(tmp[1]);
    }
    return result;

}

function retornarDataAtualizacao(url) {
    $.post(url, function () {
    }).done(function (data) {
        $("#dtAtualizacao").html(data);
    }).fail(function (erro) {
        console.log(erro.statusText);
    });
}

function retornarSomenteDataAtualizacao(url) {
    let dtAt = "";
    $.post(url, function () {
    }).done(function (data) {
        dtAt = data;
    }).fail(function (erro) {
        console.log(erro.statusText);
    });
    return dtAt;
}

function inicializarSelectChosen(combos) {
    combos.map(function (combo) {
        $(combo).chosen({
            allow_single_deselect: true,
            search_contains: true,
            no_results_text: "Nenhum resultado encontrado!"
        });
    });
}

function formatarLegendaPizza(grafId) {
    $("#" + grafId + " svg g g text").each(function (i) {
        $(this).attr({ 'fill': 'black' });
    });
}

function formatarPorcentagem(grafId) {
    $("#" + grafId + " svg g text").each(function (i) {
        if (!isNaN($(this).text().replace("%",""))) {
            if ($(this).text().indexOf(".") == -1) {
                $(this).text($(this).text().replace("%", ".0%"));
            }
        }
    });
}

function comparacao_faixa(n1, n2) {
    if (n1 == 0) { return n1; }
    return (n1 < 0.01 * n2) ? Math.floor(0.01 * n2) : n1;
}

function calcularPorcentagem(table) {
    let porcentagem = 0;
    if (table.rows().count() > 0) { porcentagem = table.page.info().recordsDisplay / table.rows().count(); }
    return "(" + parseFloat(porcentagem * 100).toFixed(1) + "%)";
}

function removerAcentos(str) {
    let com_acento = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŔÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŕ",
        sem_acento = "AAAAAAACEEEEIIIIDNOOOOOOUUUUYRsBaaaaaaaceeeeiiiionoooooouuuuybyr", novastr = "";

    for (i = 0; i < str.length; i++) {
        let troca = false;
        for (a = 0; a < com_acento.length; a++) {
            if (str.substr(i, 1) == com_acento.substr(a, 1)) {
                novastr += sem_acento.substr(a, 1);
                troca = true;
                break;
            }
        }
        if (!troca) {
            novastr += str.substr(i, 1);
        }
    }
    return novastr;
}

function gerarVetorArrayGraficos(urlGraf) {
    let arrayJsonGraficos = [];
    $.ajaxSetup({ async: false });
    $.post(urlGraf, function () {
    }).done(function (jsonData) {
        Object.keys(jsonData).map(function (grafico) {
            try {
                arrayJsonGraficos[grafico] = jsonData[grafico];
            } catch (ex) {
                arrayJsonGraficos[grafico] = "erro";
            }
        });
    });
    return arrayJsonGraficos;
}

function NuloParaValor(valorInicial, valorAlterado) {
    return valorInicial != "" ? valorInicial : (valorAlterado ? valorAlterado : "0");
}

function NuloParaValor2(valorInicial, valorAlterado) {
    return valorInicial ? valorInicial : (valorAlterado ? valorAlterado : 0);
}

//Fonte : https://www.codigofonte.com.br/codigos/funcao-left-e-right-no-javascript
function Left(str, n) {
if (n <= 0)
    return "";
else if (n > String(str).length)
    return str;
else
    return String(str).substring(0, n);
}

function Right(str, n) {
    if (n <= 0)
        return "";
    else if (n > String(str).length)
        return str;
    else {
        var iLen = String(str).length;
        return String(str).substring(iLen, iLen - n);
    }
}

function exibirMediaExtenso(total, quantidade) {
    let media = total / quantidade,
        ano = Math.floor(media / 365),
        dia = Math.trunc(media % 365),
        mediaExtenso = "";

    if (ano == 0) { mediaExtenso = ""; }
    else if (ano == 1) { mediaExtenso = ano + " ano "; }
    else if (ano > 1) { mediaExtenso = ano + " anos "; }

    if (dia == 0) { mediaExtenso += ""; }
    else if (dia == 1) { mediaExtenso += dia + " dia"; }
    else if (dia > 1) { mediaExtenso += dia + " dias"; }

    return mediaExtenso;
}

function menuResponsivo() {
    var x = document.getElementById("divTopnav");
    if (x.className === "topnav") {
        x.className += " responsive";
    } else {
        x.className = "topnav";
    }
}

function setParametrosUrl(campos, valores) {
    let resultado = "";

    campos.map(function (campo, index) {
        if (valores[index] !== "") {
            resultado = (resultado == "" ? "?" : "&") + campo + "=" + valores[index];
        }
    });

    return resultado;
}

function formatarData(dt) {
    return ("0" + dt.getDate()).slice(-2) + "/" + ("0" + (dt.getMonth() + 1).toString()).slice(-2) + "/" + dt.getFullYear();
}

function avisoMaximoProcessos(data, max) {
    return data.length < max ? "" : "&emsp; É possível a visualização de no máximo " + max.toLocaleString() + " processos";
}
