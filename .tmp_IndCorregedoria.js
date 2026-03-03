if (location.href.indexOf("RelPainelIndicadores") == -1 && location.href.indexOf("RelProdutividade") == -1) {
    google.charts.load('current', { 'packages': ['corechart', 'controls', 'gauge', 'table'], 'language': 'pt' });
}
let url = "/Pages/PainelIndicadores/", arrayJsonGraficos, totalGraficos = 16;
let manutencao_rj = false;
let manutencao_es = false;

$(document).ready(function () {
    $.fn.select2.defaults.set("theme", "classic");
    let temGrid = location.href.indexOf("RelPainelIndicadores") > -1,
        orgao = NuloParaValor(getParametro("sec"), "51"),
        vara = NuloParaValor(getParametro("uni")), numGraf = "", mes = "", numgrafpremio = "", prazoaberto = "", opcaoSelecionada = "", filtros = "", novaUrl;

    if (temGrid) {
        let cor;
        numGraf = NuloParaValor(getParametro("gid"));
        mes = NuloParaValor(getParametro("mes"));
        prazoaberto = NuloParaValor(getParametro("pzaberto"));
        numgrafpremio = NuloParaValor(getParametro("numgrafpremio"));
        opcaoSelecionada = getParametro("sel");

        if (numGraf.indexOf("c") != -1) {
            cor = "#020202";
        } else {
            cor = getColor(numGraf - 1);
        }

        if (getParametro("tram") == "S") { filtros += "&tram=S"; }
        if (getParametro("ssen") == "S") { filtros += "&ssen=S"; }
        if (getParametro("conc") == "S") { filtros += "&conc=S"; }

        let mag = getParametro("mag");
        if (mag != "") { filtros += "&mag=" + mag; }

        $(".circle-spinner-geral").css("border-color", cor + " #fff " + cor + " " + cor);
        $(".barra-superior").css("background-color", cor);
        $('#lblTotalProcessos').hide();
    } else {
        $(".carousel-control.right").hide();
        $(".carousel-control.left").hide();

        $("#slcSituacao").multipleSelect({
            selectAll: false,
            formatAllSelected() { return 'Todos'; },
            displayTitle: true,
            width: "45%",
            maxHeight: 5,
            maxHeightUnit: 'row',
            showClear: true,
            animate: 'fade'
        });

        $("#slcSituacao").change(function (e) {
            gerarGrafico(true, 2);
        });

        $("#slcMagistrado").change(function (e) {
            gerarGrafico(false, 5);
        })
    }

    let alturaBarra = $('.barra-superior').outerHeight(true);
    $('.conteudo').css('padding-top', alturaBarra + 10 + 'px');
    $('.fixed-action-btn').css('top', alturaBarra + 'px');
    $(".aguarde").show();

    setTimeout(function () {
        $('#lblTotalProcessos').show();
        if (!temGrid) {
            $(".aguarde").hide();
            $('.fixed-action-btn').show();
        }
    }, 500);

    novaUrl = location.pathname + "?sec=" + orgao + (vara != 0 && vara != "" ? "&uni=" + vara : "");
    if (temGrid) {
        novaUrl += "&gid=" + numGraf +
            (mes != "" ? "&mes=" + mes : "") +
            (prazoaberto != "" ? "&pzaberto=" + prazoaberto : "") +
            (numgrafpremio != "" ? "&numgrafpremio=" + numgrafpremio : "") +
            (opcaoSelecionada != "" ? "&sel=" + opcaoSelecionada : "") + filtros;
    }
    window.history.pushState("data", "Title", novaUrl);

    $("input[name='orgao'][value='" + orgao + "']").prop("checked", true);
    gerarListaVara();

    $('#vara').select2({
        theme: 'classic',
        placeholder: 'Todas as Varas',
        width: '400px'
    });

    if (vara != 0 && vara != "") {
        if ((manutencao_rj && orgao == 51) || (manutencao_es && orgao == 50)) {
            $("#vara").prop("disabled", true);
            $(".bem-vindo").hide();
            $("#manutencao").show();
        } else {
            $(".bem-vindo").hide();
            $("#vara").prop("disabled", false);
            $("#manutencao").hide();
        }

        $(".row").show();

        if (temGrid) { $(".aguarde").hide(); }

    } else {
        $(".galeria-inner").empty();
        $(".row").hide();
        $(".bem-vindo").show();
        $("#manutencao").hide();
    }

    if (vara != 0 && vara != "") {
        if (temGrid) {
            carregarGrid(numGraf);
            $('#lblTotalProcessos').show();
        } else {
            if (location.href.indexOf("?") > -1) { //Default
                arrayJsonGraficos = new Array(totalGraficos);
                carregarDados();
            } 
        }
    }

    $("input[name='variacao_graf7']").change(function () {
        gerarGrafico(true,7);
    });

    $("input[name='variacao_graf8']").change(function () {
        gerarGrafico(true, 8);
    });

    $("input[name='variacao_graf9']").change(function () {
        gerarGrafico(true, 9);
    });

    $("input[name='prazo_aberto_graf6']").change(function () {
        gerarGrafico(true, 6);
    });

    $("input[name='orgao']").change(function () {
        $("input[name='orgao']").each(function () {
            if ($(this).attr("id") != $(this).attr("id")) {
                if ($(this).is(":checked")) {
                    $(this).prop("checked", false);
                }
            }
        });

        $('#vara option:selected').removeAttr('selected');

        let novaUrl = location.pathname + "?sec=" + $("input[name='orgao']:checked").val();

		if (location.pathname.indexOf("RelPainelIndicadores") > -1) {
			novaUrl += "&uni=0&gid=" + NuloParaValor(getParametro("gid"));
			novaUrl += "&mes=" + NuloParaValor(getParametro("mes"));
			novaUrl += "&sel=" + getParametro("sel");
		}

        window.history.pushState("data", "Title", novaUrl);
        window.location.reload(true);

        if ((manutencao_rj && $("input[name='orgao']:checked").val() == 51) || (manutencao_es && $("input[name='orgao']:checked").val() == 50)) {
            $("#vara").prop("disabled", true);
            $(".bem-vindo").hide();
            $("#manutencao").show();
        } else {
            $("#manutencao").hide();
            $(".bem-vindo").show();
            $("#vara").prop("disabled", false);
        }

        $(".galeria-inner").empty();
        $(".row").hide();
        $('#lblTotalProcessos').text("");
        gerarListaVara();
    });

    $("input[name='painel']").change(function () {
        let painel = $("input[name='painel']:checked").val();

        if (painel == "TR") {
            let orgaoSel = $("input[name='orgao']:checked").val();
            window.location = "/Pages/PainelIndicadoresRecursais/" + (orgaoSel ? "?sec=" + orgaoSel : "");
        }
    });

    $("#vara").change(function () {
        let temGrid = location.href.indexOf("RelPainelIndicadores") > -1, 
            vara = $("#vara").val(),
            orgao = NuloParaValor(getParametro("sec"), "51"), numGraf = "", novaUrl = "", mes = "", opcaoSelecionada = "";

        if (temGrid) {
			numGraf = NuloParaValor(getParametro("gid"));
			mes = NuloParaValor(getParametro("mes"));
            opcaoSelecionada = getParametro("sel");
            $(".fixed-action-btn").hide();

            if (vara != 0 && vara != "") {
                $(".aguarde").show();
            }
		}

        novaUrl = location.pathname + "?sec=" + orgao + (vara != 0 && vara != "" ? "&uni=" + vara : "");
        novaUrl += (temGrid ? "&gid=" + numGraf + "&mes=" + mes + "&sel=" + opcaoSelecionada : "");
        window.history.pushState("data", "Title", novaUrl);

        if (vara != 0 && vara != "") {
            if ((manutencao_rj && orgao == 51) || (manutencao_es && orgao == 50)) {
                $("#vara").prop("disabled", true);
                $(".bem-vindo").hide();
                $("#manutencao").show();
            } else {
                $("#vara").prop("disabled", false);
                $("#manutencao").hide();
                $(".bem-vindo").hide();
            }

            $(".row").show();

            if (temGrid) {
                carregarGrid(numGraf);
            } else {
                if (location.href.indexOf("?") > -1) { //Default
                    arrayJsonGraficos = new Array(totalGraficos);
                    carregarDados();
                }
                incluirLinkHistorico(vara);
            }
        } else {
            $("#manutencao").hide();
            $(".bem-vindo").show();
            $(".galeria-inner").empty();
            $(".row").hide();
        }

        return false;
    });
    
    $(".titulo-grafico2").click(function () {
        let orgao = NuloParaValor(getParametro("sec"), "51"),
            vara = NuloParaValor(getParametro("uni")), numGraf = "", mes = "", novaUrl = "", prazoaberto = "",
            subtitulo = ["Acervo", "Acervo por Ano de Autuação", "Conclusos x Não Conclusos", "Conclusos (Fase 11)", "Conclusão Vencida", "Parados Não Conclusos", "Total de Entradas", "Total de Saídas", "Produtividade",
                "Metas 2025", "Metas 2026", "Metas 1 e 2 (2026)", "Metas 2024", "Segredo de Justiça", "Ações e Situações Sujeitas à Verificação Obrigatória", "Tipo de Suspensão"];
        filtros = "";

        if ($("#slcSituacao").val().length > 0) {
            let itensSel = $("#slcSituacao option:selected").text();
            if (itensSel.includes("Trâmite")) { filtros += "&tram=S"; }
            if (itensSel.includes("Sem Sentença")) { filtros += "&ssen=S"; }
            if (itensSel.includes("Concluso")) { filtros += "&conc=S"; }
        }

        if ($("#slcMagistrado").val() > 0) {
            let itensSel = $("#slcMagistrado option:selected").text();
            filtros += "&mag=" + $("#slcMagistrado option:selected").val();
        }

        for (var st = 0; st <= subtitulo.length - 1; st++) {
            if (subtitulo[st] == $(this).text().replace("&nbsp;&nbsp;", "").trim()) {
                numGraf = st + 1;
                break;
            }
        }

        if (numGraf != 10 && numGraf != 11 && numGraf != 12 && numGraf != 13 && numGraf != 14 && numGraf != 15 && numGraf != 16) {
            if ($("#erro" + numGraf).text() == "") {
                mes = ((numGraf == 7 || numGraf == 8 || numGraf == 9) ? "&mes=" + $("input[name='variacao_graf" + numGraf + "']:checked").val() : "");

                prazoaberto = (numGraf == 6 ? "&pzaberto=" + $("input[name='prazo_aberto_graf6']:checked")
                    .map(function () {
                        return $(this).val();
                    }).get().toString() : "");

                novaUrl = url + "RelPainelIndicadores.aspx?sec=" + orgao + "&uni=" + vara + "&gid=" + numGraf +
                    (mes != "" ? "&mes=" + mes : "") +
                    (prazoaberto != "" ? "&pzaberto=" + prazoaberto : "") + filtros;
                window.open(novaUrl, '_blank');
            }
        }
    });

    $('.carousel-control.right').click(function () {
        $('.galeria-outer').animate({
            scrollLeft: "+=100px"
        }, 500);
    });

    $('.carousel-control.left').click(function () {
        $('.galeria-outer').animate({
            scrollLeft: "-=100px"
        }, 500);
    });

    if (vara != 0 && vara != "") {
        incluirLinkHistorico(vara);
    }
});

$(window).resize(function () {
    let alturaBarra = $('.barra-superior').outerHeight(true);
    let numgrafpremio = getParametro("numgrafpremio");
    $('.conteudo').css('padding-top', alturaBarra + 10 + 'px');
    $('.fixed-action-btn').css('top', alturaBarra + 'px');

    if (location.href.indexOf("RelPainelIndicadores") > -1) {
        ajustarColunas(getParametro("gid"), numgrafpremio);
        $("#gridView1").css("width", "100%");
    } else {
        for (var i = 1; i <= totalGraficos; i++) {
            try {
                Frafico(false, i);
            } catch (err) {
                $("#erro" + i).text("Erro ao gerar o gráfico")
                $("#errog" + i).show();
                console.log(err.message);
            }
        }
    }
});

function inicializarSpinners() {
    $(".spinner").each(function (i) {
        let cg = "#cg" + (i - 1), erro = "#errog" + (i - 1), cor = getColor(i);
        $(this).show();
        $(".circle-spinner").eq(i).css("border-color", cor + " #fff " + cor + " " + cor);
        $(cg).hide();
        $(erro).hide();
    });
}

function gerarCarousel() {
    let orgao = NuloParaValor(getParametro("sec"), "51"),
        vara = NuloParaValor(getParametro("uni")), urlCar, totalEtiquetas = 11; //quando for para produção, mudar para 10

    $("#vara").val(vara);
    $(".card-body").remove();

    let divCards, tit, iGrafico, hrefGrafico, linkGrafico, cor = "#002F6C", linkDrill, hrefDrill, iDrill, par;

    for (var itens = 1; itens <= totalEtiquetas; itens++)  {
        if (itens == 5) { itens += 1; }
        if (itens == 6) {
            if (orgao == "51") {
                if ($("input[name='orgao']:checked").val() == 51) {
                    divCards = $("<div class='galeria-tmb card-body col-xs-12 col-sm-6 col-md-2'></div>");
                    tit = $("<h5 class='card-title'>MonitoraPrev<br>Perícias Médicas" + "</h5>");
                    divCards.append(tit);

                    par = $("<p class='card-text'>CLIP - JFRJ</p>");
                    iDrill = $("<i class='fa fa-bar-chart fa-card'></i>");

                    $(".galeria-inner").append(divCards);
                    divCards.css("background-color", cor);
                    divCards.append(par);
                    par.append($("<span style='margin-left:5px;'></span>"));

                    linkDrill = "/Pages/Pbi/PainelMeta9.aspx";
                    hrefDrill = $("<a style='color: white;' target='_blank' href='" + linkDrill + "'></a>");
                    par.append(hrefDrill);
                    hrefDrill.append(iDrill);
                }
            }
        } else if (itens == 7) {
            divCards = $("<div class='galeria-tmb card-body col-xs-12 col-sm-6 col-md-2'></div>");
            tit = $("<h5 class='card-title'>Painel de Conciliação<br><br>" + "</h5>");
            divCards.append(tit);

            iDrill = $("<i class='fa fa-bar-chart fa-card'></i>");

            $(".galeria-inner").append(divCards);
            divCards.css("background-color", cor);
            tit.append($("<span style='margin-left:5px;'></span>"));

            linkDrill = "/arquivos/pbi/PainelConciliacao.aspx";
            hrefDrill = $("<a style='color: white;' target='_blank' href='" + linkDrill + "'></a>");
            tit.append(hrefDrill);
            hrefDrill.append(iDrill);
        } else if (itens == 8) {
            divCards = $("<div class='galeria-tmb card-body col-xs-12 col-sm-6 col-md-2'></div>");
            tit = $("<h5 class='card-title'>Painel de Saúde<br><br>" + "</h5>");
            divCards.append(tit);

            iDrill = $("<i class='fa fa-bar-chart fa-card'></i>");

            $(".galeria-inner").append(divCards);
            divCards.css("background-color", cor);
            tit.append($("<span style='margin-left:5px;'></span>"));

            linkDrill = "/arquivos/pbi/PainelSaude.aspx";
            hrefDrill = $("<a style='color: white;' target='_blank' href='" + linkDrill + "'></a>");
            tit.append(hrefDrill);
            hrefDrill.append(iDrill);
        } else if (itens == 11) {
            divCards = $("<div class='galeria-tmb card-body col-xs-12 col-sm-6 col-md-2'></div>");
            tit = $("<h5 class='card-title'>Painel Vícios<br>de Construção<br><br>" + "</h5>");
            divCards.append(tit);

            iDrill = $("<i class='fa fa-bar-chart fa-card'></i>");

            $(".galeria-inner").append(divCards);
            divCards.css("background-color", cor);
            tit.append($("<span style='margin-left:5px;'></span>"));

            linkDrill = "/arquivos/pbi/PainelVicioConstrucao.aspx";
            hrefDrill = $("<a style='color: white;' target='_blank' href='" + linkDrill + "'></a>");
            tit.append(hrefDrill);
            hrefDrill.append(iDrill);
        } else {
			urlCar = url + "ItensCarousel.aspx?op=g&gid=" + itens + "&uni=" + vara;

			$.ajaxSetup({ async: false });
			$.get(urlCar, function () {
			}).done(function (jsonData) {
				if (jsonData.length > 0) {
					let urlComparativo = "";
                    divCards = $("<div class='galeria-tmb card-body col-xs-12 col-sm-6 col-md-2'></div>");
					tit = $("<h5 class='card-title'>" + jsonData[0].Titulo.replace("vbcrlf", "<br>") + "</h5>");
					iGrafico = $("<i class='fa fa-bar-chart fa-card'></i>");

					$(".galeria-inner").append(divCards);
					divCards.append(tit);
					divCards.css("background-color", cor);

                    if (itens == 3) {
                        urlComparativo = "/arquivos/Pbi";
                        linkGrafico = urlComparativo + "/Metas2025.aspx";
                    } else if (itens == 4) {
                        urlComparativo = "/arquivos/Pbi";
                        linkGrafico = urlComparativo + "/Metas2026.aspx";
                    }

                    jsonData.map(function (item) {
                        let p = "<p class='card-text'>" + (item.Valor ? item.Valor + ":" : "") + item.Total.toLocaleString() +
                            (item.dtatualizacao ? item.dtatualizacao : "") + "</p>";

                        par = $(p);
                        divCards.append(par);
						par.append($("<span style='margin-left:5px;'></span>"));

						if (item.Total > 0) {
							iDrill = $("<i class='fa fa-table fa-card'></i>");
                            linkDrill = url + "RelPainelIndicadores.aspx?sec=" + orgao + "&uni=" + vara + "&gid=c" + itens + (item['Valor'] ? "&sel=" + item['Valor'] : "");

                            if (itens === 1) {
                                linkDrill += "&numgrafpremio=" + item.Ordem;
                            }

                            hrefDrill = $("<a style='color: white;' target='_blank' href='" + linkDrill + "'></a>");
							par.append(hrefDrill);
							hrefDrill.append(iDrill);
						}

						if (urlComparativo != "") {
                            hrefGrafico = $("<a style='color: white;' target='_blank' href='" + linkGrafico + "'></a>");
							tit.append($("<span style='margin-left:5px;'></span>"));
							tit.append(hrefGrafico);
							hrefGrafico.append(iGrafico);
						}
					});
				}
			}).fail(function (erro) {
				console.log(erro.statusText);
			});
		}
    }
}

function gerarGrafico(gerarJson, numGraf) {
    let orgao = NuloParaValor(getParametro("sec"), "51"), vara = NuloParaValor(getParametro("uni")), mes = "", prazoaberto = "", filtros = "", urlGraf, gid, ini, fim;
    $("#vara").val(vara);
    
    try {
        if (!numGraf) {
            gid = "t";
            ini = 1;
            fim = totalGraficos;
            mes = $("input[name='variacao_graf7']:checked").val()
        } else {
            gid = numGraf;
            ini = numGraf;
            fim = numGraf;
            mes = $("input[name='variacao_graf" + numGraf + "']:checked").val()
        }

        if ($("#slcSituacao").val().length > 0) {
            let itensSel = $("#slcSituacao option:selected").text();
            if (itensSel.includes("Trâmite")) { filtros += "&tram=S"; }
            if (itensSel.includes("Sem Sentença")) { filtros += "&ssen=S"; }
            if (itensSel.includes("Concluso")) { filtros += "&conc=S"; }
        }

        prazoaberto = $("input[name='prazo_aberto_graf6']:checked")
            .map(function () {
                return $(this).val();
            }).get().toString();

        urlGraf = url + "IndCorregedoria_Graf.aspx?gid=" + gid + "&uni=" + vara +
            (mes != "" ? "&mes=" + mes : "") +
            (prazoaberto != "" ? "&pzaberto=" + prazoaberto : "") + filtros;

        if (gerarJson) {
            if (gid == "t") { arrayJsonGraficos = gerarVetorArrayGraficos(urlGraf); }
            else {
                let arrayAux = gerarVetorArrayGraficos(urlGraf);
                arrayJsonGraficos["Grafico" + numGraf] = arrayAux["Grafico" + numGraf];
                if (numGraf == 2) { arrayJsonGraficos["Media2"] = arrayAux["Media2"]; }
            }
        }

        if (Object.keys(arrayJsonGraficos).length == 0) {
            $("span.erroSpan").each(function () {
                $(this).text("Erro ao gerar o gráfico");
            });
        }

        for (var g = ini; g <= fim; g++) {
            try {
                gerarGraficoGoogle(g);
            } catch(err) {
                $("#erro" + g).text("Erro ao gerar o gráfico")
                $("#errog" + g).show();
                console.log(err);
            }
        }
    } catch (err) {
        for (var i = ini; i <= fim; i++) {
            $("#erro" + i).text("Erro ao gerar o gráfico")
            $("#errog" + i).show();
        }
        console.log(err);
    }
}

function gerarGraficoGoogle(numGraf) {
    let divSpinner = $(".spinner"), divCg = $("#cg" + numGraf), divGraf = $("#g" + numGraf),
        erroSpan = $("#erro" + numGraf), erroDiv = $("#errog" + numGraf), chartSelector = "#g" + numGraf, tipoGraficoGoogle,
        orgao = NuloParaValor(getParametro("sec"), "51"), vara = NuloParaValor(getParametro("uni"));

    if (numGraf == 5) { tipoGraficoGoogle = "ColumnChart"; }
    else if (numGraf == 6 || numGraf == 10 || numGraf == 11 || numGraf == 13 || numGraf == 14 || numGraf == 16) { tipoGraficoGoogle = "BarChart"; }
    else if (numGraf == 2) { tipoGraficoGoogle = "ColumnChart2"; }
    else if (numGraf == 7 || numGraf == 8) { tipoGraficoGoogle = "StackedColumnChart"; }
    else if (numGraf == 12) { tipoGraficoGoogle = "Gauge"; }
    else if (numGraf == 15) { tipoGraficoGoogle = "Table"; }
    else { tipoGraficoGoogle = "PieChart"; }

    divCg.hide();
    erroSpan.text("");
    erroDiv.hide();

    let jsonData = arrayJsonGraficos ["Grafico" + numGraf];
    divSpinner.eq(numGraf - 1).hide();

    if (jsonData == "" || jsonData == "erro") {
        erroSpan.text(jsonData == "" ? "Nenhum item localizado" : "Erro ao gerar o gráfico");
        erroDiv.show();

        if (numGraf == 2) { $("#slcSituacao + div").hide();}
        if (numGraf == 5) { $("#slcMagistrado").hide(); }
        return;
    }

    if (numGraf == 2) { $("#slcSituacao + div").show(); }
    if (numGraf == 5) { $("#slcMagistrado").show(); }

    let chartContainer = $(chartSelector)[0], cores,
        options, grafico, tabela, colunas = [], totalGeral = 0;

    if (numGraf < 14) {
        cores = lerVetorCores(numGraf);
    } else {
        cores = [];
    }

	if (tipoGraficoGoogle == "PieChart") {
		tabela = new google.visualization.DataTable();
        tabela.addColumn('string', 'situacao');
        tabela.addColumn('number', 'totais');
        tabela.addColumn({ type: 'string', role: 'tooltip' });
        tabela.addColumn('number', 'totalInicio');

        colunas = [0, 1, 2];

        jsonData.map(function (item) {
            totalGeral += item.totais;
        });

		if (totalGeral == 0) {
			erroSpan.text("Nenhum item localizado");
			erroDiv.show();

			if (numGraf == 1) {
			    $("#hrefAcervo").hide();
            }
            if (numGraf == 4) {
                $("#hrefFluxoConclusos").hide();
            }
            if (numGraf == 9) {
                $("#hrefProdutividade").hide();
            }
			return;
		} else {
            jsonData.map((item, index) => {
                let percent = ((item.totais / totalGeral) * 100).toFixed(1);
                let valor = comparacao_faixa(item.totais, totalGeral);
                let tooltip = item.tipo + "\n" + item.totais.toLocaleString() + " (" + percent + "%)";
                tabela.addRow([item.tipo, valor, tooltip, item.totais]);
                cores.push(cores[index]);
            });

			options = {
				is3D: true,
				colors: cores,
				backgroundColor: { fill: 'transparent' },
				chartArea: { left: 15, top: 20, width: "90%", height: "95%" },
				legend: {
					position: 'right',
					alignment: 'center'
				},
				sliceVisibilityThreshold: 0
			}
		}
    }

    if (tipoGraficoGoogle == "Gauge") {
        let msgaplica = "", _total = 0;
        tabela = new google.visualization.DataTable();
        tabela.addColumn('string', 'situacao');
        tabela.addColumn('number', 'totais');
        tabela.addColumn('string', 'periodo');
        colunas = [0, 1];

        if (jsonData.length == 0) {
            erroSpan.text("Erro ao gerar o gráfico");
            erroDiv.show();
            return;
        }

        jsonData.map(function (item) {
            if (item.tipo.includes("Meta 1")) {
                msgaplica = (item.totais == -1 ? "Não se aplica" : "");
                tabela.addRow([msgaplica, item.totais, ""]);
            }  else if (item.tipo.includes("Meta 2")) {
                msgaplica = (item.totais == -1 ? "Não se aplica" : "");
                _total = (item.totais == -1 ? 0 : item.totais);
                tabela.addRow([msgaplica, _total, item.Periodo]);
            }
        });

        let formatter = new google.visualization.NumberFormat(
            { suffix: '%', decimalSymbol: ',', groupingSymbol: '.' }
        );
        formatter.format(tabela, 1);

        options = {
            redFrom: 0, redTo: 33,
            yellowFrom: 33, yellowTo: 66,
            greenFrom: 66, greenTo: 100,
            minorTicks: 0,
            min: 0, max: 100,
        }
    }

    if (tipoGraficoGoogle == "Table") {
        $("#g15").show();
        $("#g15").empty();

        let data = new google.visualization.DataTable();
        data.addColumn('string', 'CLASSE/ASSUNTO');
        data.addColumn('number', 'QUANTITATIVO');
        data.addColumn('string', 'Link');

        let link = "/Pages/RelInspecaoAnualCorrecaoOrdinaria/relinspecao.aspx?sec=" + orgao + "&uni=" + vara + "&gid=5";
        data.addRow(['5.1 AÇÃO CIVIL PÚBLICA', jsonData[0].AcaoCivilPublica, link + "&op1=65"]);
        data.addRow(['5.2 AÇÃO POPULAR', jsonData[0].AcaoPopular, link + "&op1=66"]);
        data.addRow(['5.3 MANDADO DE SEGURANÇA COLETIVO', jsonData[0].MandadoSeguranca, link + "&op1=119"]);
        data.addRow(['5.4 AÇÕES DE IMPROBIDADE ADMINISTRATIVA', jsonData[0].AcoesImprobidade, link + "&op1=64"]);
        data.addRow(['5.6 AÇÕES QUE VERSEM SOBRE INTERESSES METAINDIVIDUAIS', jsonData[0].AcoesInteresses, link + "&op1=63"]);
        data.addRow(['5.7 AÇÕES CRIMINAIS COM RÉU PRESO', jsonData[0].AcoesReuPreso, link + "&op1=RP"]);
 
        let tabela = new google.visualization.Table($("#g15")[0]);
        let formatter = new google.visualization.PatternFormat('<a target="_blank" href="{1}">{0}</a>');
        formatter.format(data, [1, 2]);

        let view = new google.visualization.DataView(data);
        view.setColumns([0, 1]);

        tabela.draw(view, {
            allowHtml: true,
            showRowNumber: false,
            cssClassNames: { headerCell: 'alinharEsquerda', tableCell: 'alinharEsquerda' }
        });

        if (data.getNumberOfRows() == 0) {
            $("#g15").find("table").DataTable({
                language: { zeroRecords: "Nenhum registro encontrado" },
                "dom": '',
                "ordering": false
            });
        } else {
            $("#g15 thead:eq(0) tr:eq(0) th:eq(0)").width("12%");
            $("#g15 thead:eq(0) tr:eq(0) th:eq(1)").width("5%");
        }

        erroDiv.text("");
        erroSpan.hide();
    }

    if (tipoGraficoGoogle == "BarChart" || tipoGraficoGoogle == "ColumnChart") {
	    tabela = new google.visualization.DataTable();
		tabela.addColumn('string', 'situacao');
		tabela.addColumn('number', 'totais');
		tabela.addColumn({ type: 'string', role: 'style' });
		tabela.addColumn({ type: 'string', role: 'tooltip' });
        tabela.addColumn('number', 'totalInicio');

        if (numGraf == 5) {
            colunas = [0, 1, 2, 3];
        } else if (numGraf == 6 || numGraf == 10 || numGraf == 11 || numGraf == 13 || numGraf == 14 || numGraf == 16) {
            tabela.addColumn({ type: 'string', role: 'annotation' });
            colunas = [0, 1, 2, 3, 5];
        }

        jsonData.map(function (item) {
            if (numGraf == 16) {
                totalGeral = item.total_geral;
            } else {
                totalGeral += item.totais;
            }
        });

		if (totalGeral == 0) {
			erroSpan.text("Nenhum item localizado");
            erroDiv.show();

            if (numGraf == 5) {
                $("#hrefConcVenc").hide();
            }
            if (numGraf == 6) {
                $("#hrefParadosNaoConc").hide();
            }
			return;
		} else {
            //gera Combo de magistrados do gráfico 5 (Conclusão Vencida)
            let selected = "", magistrado = [], magsel = $("#slcMagistrado option:selected").val() || 0;
            if (numGraf == 5) {
                $("#slcMagistrado").empty();
                $("#slcMagistrado").append("<option value='0'>Todos Magistrados</option>");
                jsonData.map((item, index) => {
                    if (!magistrado.includes(item.nome_magistrado) && item['cod_magist_unico'] != "99") {
                        magistrado.push(item.nome_magistrado);
                        selected = (item['cod_magist_unico'] == magsel ? "selected" : "");
                        $("#slcMagistrado").append("<option " + selected + " value='" + item['cod_magist_unico'] + "'>" + item.nome_magistrado + "</option>");
                    }
                });

                let array = [];
                if (magsel > 0) {
                    array = jsonData.filter(item => item['cod_magist_unico'].toString() == magsel);
                } else { array = jsonData; }

                jsonData = [];
                array.reduce((res, value) => {
                    if (!res[value.tipo]) {
                        res[value.tipo] = { tipo: value.tipo, totais: 0 };
                        jsonData.push(res[value.tipo]);
                    }
                    res[value.tipo].totais += value.totais;
                    return res;
                }, {});
            } 

            let tooltip = "";
            let tipo = "";

            jsonData.map((item, index) => {
                let valor = comparacao_faixa(item.totais, totalGeral);
                let percent = "";

                if (numGraf == 5 || numGraf == 6) {
                    percent = ((item.totais / totalGeral) * 100).toFixed(2);
                    tipo = numGraf == 6 ? item.tipo.split(")")[1] : item.tipo;
                    tooltip = tipo + " dias\n" + item.totais.toLocaleString() + " (" + percent + "%)";
                } else if (numGraf == 10 || numGraf == 11 || numGraf == 13) {
                    percent = item.totais.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }) + "%";
                    tipo = item.tipo;
                    tooltip = tipo + "(" + percent + ")";
                } else if (numGraf == 14) {
                    tooltip = item.tipo + "\n" + item.totais;

                }

                if (numGraf == 5) {
                    tabela.addRow([tipo, valor, cores[index], tooltip, item.totais]);
                } else if (numGraf == 6) {
                    tabela.addRow([tipo, valor, cores[index], tooltip, item.totais, item.totais.toLocaleString()]);
                } else if (numGraf == 10 || numGraf == 11 || numGraf == 13) {
                    if (item.totais > -1) {
                        tabela.addRow([tipo, valor, cores[index], tooltip, item.totais, percent]);
                    }

                    //let formatter = new google.visualization.NumberFormat(
                    //    { suffix: '%', decimalSymbol: ',', groupingSymbol: '.' , fractionDigits: 2}
                    //);
                    //formatter.format(tabela, 1);

                } else if (numGraf == 14) {
                    tabela.addRow([tipo, valor, "#632c62", tooltip, item.totais, item.totais.toLocaleString()]);
                } else if (numGraf == 16) {
                    let percent = ((item.total / item.total_geral) * 100).toFixed(1);
                    tabela.addRow([
                        !item.des_susp ? "Outros" : item.des_susp,
                        comparacao_faixa(item.total, item.total_geral),
                        'stroke-color: black; stroke-width: 0; fill-color: ' + !item.cor ? "#0099FF" : item.cor + ';',
                        (!item.des_susp ? "Outros" : item.des_susp.toLocaleString())  + "\n" + item.total.toLocaleString() + " (" + percent + "%)",
                        item.total,
                        item.total.toLocaleString() + "\n (" + percent + "%)"]
                    );
                }
            });

            if (numGraf == 5) {
                options = {
                    chartArea: { left: 60, top: 25, width: "80%", height: "70%" },
                    backgroundColor: { fill: 'transparent' },
                    bar: { groupWidth: "90%" },
                    legend: { position: "none" },
                    hAxis: {
                        textStyle: { fontSize: 12 }
                    }
                }
            } else if (numGraf == 6) {
                options = {
                    chartArea: { left: 110, top: 25, width: "65%", height: "75%" },
                    backgroundColor: { fill: 'transparent' },
                    bar: { groupWidth: "90%" },
                    legend: { position: "none" },
                    vAxis: {
                        textStyle: { fontSize: 12 }
                    }
                }
            } else if (numGraf == 10 || numGraf == 11 || numGraf == 13) {
                options = {
                    chartArea: { left: 130, top: 25, width: "60%", height: "70%" },
                    backgroundColor: { fill: 'transparent' },
                    bar: { groupWidth: "50%" },
                    legend: { position: "none" },
                    vAxis: {
                        textStyle: { fontSize: 12 }
                    }
                }
            } else if (numGraf == 14) {
                options = {
                    chartArea: { left: 130, top: 25, width: "50%", height: "60%" },
                    backgroundColor: { fill: 'transparent' },
                    bar: { groupWidth: "50%" },
                    legend: { position: "none" },
                    vAxis: {
                        textStyle: { fontSize: 12 }
                    }
                }
            } else if (numGraf == 16) {
                options = {
                    chartArea: { left: 220, top: 25, width: "50%", height:300 },
                    backgroundColor: { fill: 'transparent' },
                    bar: { groupWidth: "65%" },
                    legend: { position: "none" },
                    vAxis: {
                        textStyle: { fontSize: 10 }
                    }
                }
            }
		}
	}

    //Gráfico tratado em separado, devido as diferenças no resultado da query (mais colunas)
    if (tipoGraficoGoogle == "ColumnChart2") {
        $("#annotation1").text("");

        tabela = new google.visualization.DataTable();
        tabela.addColumn('string', 'ano');
        tabela.addColumn('number', 'totais');
        tabela.addColumn({ type: 'string', role: 'style' });
        tabela.addColumn({ type: 'string', role: 'tooltip' });
        tabela.addColumn('number', 'totalInicio');
        colunas = [0, 1, 2, 3];

        if (jsonData.length == 0) {
            erroSpan.text("Nenhum item localizado");
            erroDiv.show();
            return;
        }

        //Gera um vetor com os últimos 5 anos, para exibir todos no gráfico, caso algum não tenha nenhum processo.
        let totalTramitacao = arrayJsonGraficos["Media2"][0].media;
        totalGeral = jsonData.reduce((a, b) => a + b.total, 0);
        $("#annotation1").text("Tempo Médio: " + totalTramitacao.toLocaleString(undefined, { 'minimumFractionDigits': 0, 'maximumFractionDigits': 0 }) + " dias");

        jsonData.map((item, index) => {
            let percent = ((item.total / totalGeral) * 100).toFixed(1);
            let valor = comparacao_faixa(item.total, totalGeral);
            let tooltip = item.anoautuacao + "\n" + item.total.toLocaleString() + " (" + percent + "%)";
            tabela.addRow([item.anoautuacao, valor, cores[index], tooltip, item.total]);
        });

        options = {
            chartArea: { left: 60, top: 40, width: "80%", height: "60%" },
            backgroundColor: { fill: 'transparent' },
            bar: { groupWidth: "80%" },
            legend: { position: "none" },
            hAxis: {
                textStyle: { fontSize: 11 }
            }
        }
    }

	if (tipoGraficoGoogle == "StackedColumnChart") {
		jsonData.map(function (item) {
			totalGeral += item.totais;
		});

		if (totalGeral == 0) {
			erroSpan.text("Nenhum item localizado");
            erroDiv.show();

            if (numGraf == 7) {
                $("#hrefEntradas").hide();
            }
            if (numGraf == 8) {
                $("#hrefSaidas").hide();
            }

			return;
		} else {
		    let vetor = [[], []];
		    //Estrutura do vetor[0] -> coluna1 | tipo1 | tooltip1 | style1 | valorInicial1 | tipo2 | tooltip2 | style2 | valorInicial2 | tipo3 | tooltip3 | style3 | valorInicial3 | tipo4 | tooltip4 | style4 | valorInicial4
		    
			vetor[0].push(" ");
			vetor[1].push(" ");

			jsonData.map((item, index) => {
                let percent = ((item.totais / totalGeral) * 100).toFixed(1),
                    tipo = item.tipo.split(")")[1],
				    tooltip = tipo + "\n" + item.totais.toLocaleString() + " (" + percent + "%)",
                    style = "stroke-width: 1;stroke-color:" + cores[index] + ";";

				vetor[0].push(tipo);
				vetor[1].push(comparacao_faixa(item.totais, totalGeral));

				vetor[0].push({ type: 'string', role: 'tooltip' });
				vetor[1].push(tooltip);

				vetor[0].push({ type: 'string', role: 'style' });
				vetor[1].push(style);

				vetor[0].push("valorInicial" + index);
				vetor[1].push(item.totais);
			});

            tabela = google.visualization.arrayToDataTable(vetor);
            colunas = [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23];
			
			options = {
                chartArea: { left: 60, top: 25, width: "50%", height: "70%" },
				backgroundColor: { fill: 'transparent' },
				colors: cores,
				isStacked: true,
				legend: {
					position: 'right',
					alignment: 'center'
				}
			}
		}
	}

    divCg.show();

    if (numGraf != 15) {
        grafico = new google.visualization.ChartWrapper({
            chartType: tipoGraficoGoogle.indexOf("ColumnChart") > -1 ? "ColumnChart" : tipoGraficoGoogle,
            containerId: chartContainer,
            dataTable: tabela,
            options: options,
            view: { columns: colunas }
        });
    }

    if (numGraf != 10 && numGraf != 11 && numGraf != 12 && numGraf != 13 && numGraf != 14 && numGraf != 15) {
        google.visualization.events.addListener(grafico, 'select', function () {
            let selectedItem = grafico.getChart().getSelection()[0];
            let filtros = "";  //Filtros do gráfico 2 selecionados pelo dropdownlist

            if (numGraf == 5) { tipoGraficoGoogle = "ColumnChart"; }
            else if (numGraf == 6 || numGraf == 16) { tipoGraficoGoogle = "BarChart"; }
            else if (numGraf == 2) { tipoGraficoGoogle = "ColumnChart2"; }
            else if (numGraf == 7 || numGraf == 8) { tipoGraficoGoogle = "StackedColumnChart"; }
            else { tipoGraficoGoogle = "PieChart"; }

            if (selectedItem) {
                let opcaoSelecionada, valor, novaUrl = "";

                if (tipoGraficoGoogle == "PieChart" || tipoGraficoGoogle == "ColumnChart" || tipoGraficoGoogle == "ColumnChart2" || tipoGraficoGoogle == "BarChart") {
                    opcaoSelecionada = tabela.wg[selectedItem.row].c[0].v;
                    valor = tabela.wg[selectedItem.row].c[1].v;
                } else if (tipoGraficoGoogle == "StackedColumnChart") {
                    let colunaSel = grafico.getView().columns[selectedItem.column];
                    opcaoSelecionada = tabela.wg[0].c[colunaSel + 1].v.toString().split("\n")[0];
                    valor = tabela.wg[0].c[colunaSel].v;
                }

                if (valor > 0) {
                    if (numGraf == 6) {
                        if (opcaoSelecionada.indexOf("<=30") > -1) opcaoSelecionada = "0_30";
                        if (opcaoSelecionada.indexOf(">30") > -1) opcaoSelecionada = "31_60";
                        if (opcaoSelecionada.indexOf(">60") > -1) opcaoSelecionada = "61_90";
                        if (opcaoSelecionada.indexOf(">90") > -1) opcaoSelecionada = "91_120";
                        if (opcaoSelecionada.indexOf(">120") > -1) opcaoSelecionada = "121_150";
                        if (opcaoSelecionada.indexOf(">150") > -1) opcaoSelecionada = "151";
                    } else if (numGraf == 2) {
                        opcaoSelecionada = opcaoSelecionada.replace("<= ", "Antes");
                        if ($("#slcSituacao").val().length > 0) {
                            let itensSel = $("#slcSituacao option:selected").text();
                            if (itensSel.includes("Trâmite")) { filtros += "&tram=S"; }
                            if (itensSel.includes("Sem Sentença")) { filtros += "&ssen=S"; }
                            if (itensSel.includes("Concluso")) { filtros += "&conc=S"; }
                        }
                    } else if (numGraf == 5) {
                        if ($("#slcMagistrado").val() > 0) {
                            let itensSel = $("#slcMagistrado option:selected").text();
                            filtros += "&mag=" + $("#slcMagistrado option:selected").val();
                        }
                    } else if (numGraf == 16) {
                    } else {
                        opcaoSelecionada = opcaoSelecionada.replace(/ /g, "_").replace(/\//g, "_");
                    }

                    if (numGraf == 16) {
                        if (selectedItem) {
                            let codigo;

                            for (let i = 0; i < jsonData.length; i++) {
                                if (opcaoSelecionada.replace(/_/g, " ") == jsonData[i].des_susp) {
                                    codigo = jsonData[i].cod_susp;
                                    break;
                                }
                            }

                            novaUrl = "/Pages/consolidacao/secao/SecaoAcervoSuspenso/relsecaoacervosuspenso.aspx?gid=2" + "&sel=" + codigo + "&sec=" + orgao + "&uni=" + vara + "&loc=0&esp=0";
                        }
                    } else {
                        novaUrl = url + "RelPainelIndicadores.aspx?sec=" + orgao + "&uni=" + vara + "&gid=" + numGraf;
                        novaUrl += ((numGraf == 7 || numGraf == 8 || numGraf == 9) ? "&mes=" + $("input[name='variacao_graf" + numGraf + "']:checked").val() : "");
                        novaUrl += (numGraf == 6 ? "&pzaberto=" +
                            $("input[name='prazo_aberto_graf6']:checked").map(function () {
                                return $(this).val();
                            }).get().toString() : "");
                        novaUrl += "&sel=" + opcaoSelecionada + filtros;
                    }
                    window.open(novaUrl, '_blank');
                }
            }

            grafico.getChart().setSelection([]);
        });

        let evento = google.visualization.events.addListener(grafico, 'ready', function () {
            google.visualization.events.removeListener(evento);

            $(chartContainer).mouseover(function () {
                divGraf.css('cursor', 'pointer');
            });

            $(chartContainer).mouseout(function () {
                divGraf.css('cursor', 'default');
            });
        });
    }

    grafico.draw();

    let svg = $('svg', chartContainer),
        labelSelector = '> g g text', tabItem;

	if (tipoGraficoGoogle == "PieChart") {
        tabItem = 0;

        $(labelSelector, svg).each(function (i) {
            if ($(this).next().length == 0) {
                let totalItem = tabela.getValue(tabItem, 3);
                let newLabel = $(this).text() + ' : ' + totalItem.toLocaleString();
                $(this).text(newLabel);
                tabItem += 1;
            }
        });
    }

    if (tipoGraficoGoogle == "ColumnChart" || tipoGraficoGoogle == "ColumnChart2" ) {
        tabItem = 0;
 
        $(labelSelector, svg).each(function (i) {
            if ($(this).next().length == 0) {
                if (tabItem < tabela.jc.length) {
                    let pos = (tipoGraficoGoogle == "ColumnChart" ? 4 : 1);
                    let totalItem = tabela.getValue(tabItem, pos);
                    let newLabel = $(this).text() + ' : ' + totalItem.toLocaleString();
                    $(this).text(newLabel);
                    tabItem += 1;
                }
            }
        });
    }

	if (tipoGraficoGoogle == "StackedColumnChart") {
	    let tabItem = 24;

        $(labelSelector, svg).each(function (i) {
            if ($(this).next().length == 0) {
                if (tabItem > 0) {
                    let totalItem = parseInt(tabela.wg[0].c[tabItem].v);
                    let newLabel = $(this).text() + ' : ' + totalItem.toLocaleString();
                    $(this).text(newLabel);
                    tabItem -= 4;
                }
            }
        });
    }

    if (tipoGraficoGoogle = "Gauge") {
        $("#g" + numGraf + " table tbody tr td:eq(0)").append($("<div><span class='spanA'>Meta 1</span></div>"));
        $("#g" + numGraf + " table tbody tr td:eq(1)").append($("<div><span class='spanA'>Meta 2 <br> Até 31/12/2009</span></div>"));
        $("#g" + numGraf + " table tbody tr td:eq(2)").append($("<div><span class='spanA'>Meta 2 <br> Até 31/12/2021</span></div>"));
        $("#g" + numGraf + " table tbody tr td:eq(3)").append($("<div><span class='spanA'>Meta 2 <br> Até 31/12/2022</span></div>"));

        $("g text:contains('Não se aplica')").each(function () {
            $(this).css("fill", "red").css("font-size", "14px").css("font-weight", "bold");
        });
    }

    if (numGraf == 1) {
        let urlSuspenso = "/Pages/consolidacao/secao/SecaoAcervoSuspenso/",
            linkSuspenso = urlSuspenso + "?sec=" + orgao + "&uni=" +  vara,
            iGrafico = "<i class='fa fa-bar-chart fa-card' style='font-size:16px;'></i>",
            hrefSuspenso = "<a style='color: #337AB7;' href='" + linkSuspenso + "'>" + iGrafico + "</a>";

        $("#total1").html("Total: " + totalGeral.toLocaleString()); //+ "&nbsp;&nbsp; &nbsp;&nbsp; Suspensos " + hrefSuspenso);
        $("#hrefAcervo").attr("href", url + "EvolucaoAcervo/EvolucaoAcervo.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefAcervo").show();

    } else {
        $("#total" + numGraf).text("Total: " + totalGeral.toLocaleString());
    }

    if (numGraf == 4) {
        $("#hrefFluxoConclusos").attr("href", url + "FluxoProcessosConclusos/FluxoProcessosConclusos.aspx?sec=" + orgao + "&uni=" + vara);
    }

    if (numGraf == 5) {
        $("#hrefConcVenc").attr("href", url + "FluxoConclusaoVencida/FluxoConclusaoVencida.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefConcVenc").show();
    }
    if (numGraf == 6) {
        $("#hrefParadosNaoConc").attr("href", url + "FluxoParados/FluxoParados.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefParadosNaoConc").show();
    }
    if (numGraf == 7) {
        $("#hrefEntradas").attr("href", url + "FluxoEntradas/FluxoEntradas.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefEntradas").show();
    }
    if (numGraf == 8) {
        $("#hrefSaidas").attr("href", url + "FluxoSaidas/FluxoSaidas.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefSaidas").show();
    }
    if (numGraf == 9) {
        $("#hrefProdutividade").attr("href", url + "Produtividade/Produtividade.aspx?sec=" + orgao + "&uni=" + vara);
        $("#hrefProdutividade").show();
    }
}

function carregarGrid(numGraf) {
    let divSpinner = $(".spinner"), urlJson = "", subtitulo = "",
        mes = NuloParaValor(getParametro("mes")),
        prazoaberto = decodeURIComponent(NuloParaValor(getParametro("pzaberto"))),
        numgrafpremio = decodeURIComponent(NuloParaValor(getParametro("numgrafpremio"))),
        opcaoSelecionada = getParametro("sel"),
        vara = NuloParaValor(getParametro("uni"));

    divSpinner.show();
    $(".row").hide();

    if (numGraf.indexOf("c") != -1) {
       cor = "#020202";
    } else {
        cor = getColor(numGraf - 1);
    }

    $(".barra-superior").css("background-color", cor);
    $(".circle-spinner").css("border-color", cor + " #fff " + cor + " " + cor);

    $("#vara").val(vara);
    urlJson = url + "IndCorregedoria_Api.aspx?op=dg&uni=" + vara + "&gid=" + numGraf +
                    (mes != "" ? "&mes=" + mes : "") +
                    (prazoaberto != "" ? "&pzaberto=" + prazoaberto : "") +
                    (numgrafpremio != "" ? "&numgrafpremio=" + numgrafpremio : "") +
                    (opcaoSelecionada != "" ? "&sel=" + opcaoSelecionada : "");

    if (numGraf.indexOf("c") == -1) {
        subtitulo = ["Acervo", "Acervo por Ano de Autuação", "Conclusos x Não Conclusos", "Conclusos (Fase 11)", "Conclusão Vencida", "Parados Não Conclusos (Dias)", "Total de Entradas", "Total de Saídas", "Produtividade", "", "", "", ""];
    } else {
        subtitulo = ["Prêmio CNJ de Qualidade 2026", "Partes", "Metas 2025", "Metas 2026", "", "", "", "", "Grande Devedor", "Juízo 100% Digital", ""];
    }

    if (numGraf != 6 && numGraf != 9) opcaoSelecionada = opcaoSelecionada.replace(/_/g, " ");
    if (numGraf == 7 || numGraf == 8 || numGraf == 9) opcaoSelecionada = opcaoSelecionada.replace(/_/g, " ");

    if (numGraf == 6) {
        if (opcaoSelecionada == "0_30") opcaoSelecionada = "<=30 dias";
        if (opcaoSelecionada == "31_60") opcaoSelecionada = ">30 e <=60 dias";
        if (opcaoSelecionada == "61_90") opcaoSelecionada = ">60 e <=90 dias";
        if (opcaoSelecionada == "91_120") opcaoSelecionada = ">90 e <=120 dias";
        if (opcaoSelecionada == "121_150") opcaoSelecionada = ">120 e <=150 dias";
        if (opcaoSelecionada == "151") opcaoSelecionada = ">150 dias";
    }

    if (numGraf == 2) {
        opcaoSelecionada = opcaoSelecionada.replace("Antes", "<= ");
    }

    let subtitulo_barra_superior = subtitulo[parseInt(numGraf.replace("c", "") - 1)];
    if (numGraf == 7 || numGraf == 8 || numGraf == 9) { subtitulo_barra_superior += " - " + moment(mes.split("_")[0] + "/" + mes.split("_")[1] + "/01", "DD/MM/YYYY").locale("pt-br").format('MMMM');  }
    if (numGraf == 6) { subtitulo_barra_superior += " - Prazo Aberto : " + (prazoaberto == "Sim" || prazoaberto == "Não" ? prazoaberto : "Todos"); }
    if (numGraf == "c10") { subtitulo_barra_superior = subtitulo_barra_superior.replace("%", "%25") };
    //if (numGraf == "c3_2") { subtitulo_barra_superior = "Pendentes da Meta 2024"; }
    subtitulo_barra_superior += (opcaoSelecionada != "" ? " - " + opcaoSelecionada : "");
    $(".subtitulo-barra-superior").text(decodeURIComponent(subtitulo_barra_superior));

    $.ajaxSetup({ async: true });
    $.get(urlJson, function () {
    }).done(function (data) {
        divSpinner.hide();
        $(".row").show();
        inicializaDataTableProcessos($("#gridView1"), data, numGraf, numgrafpremio);
        if (numGraf == "c1") {
            carregarDescricaoTema(decodeURIComponent(opcaoSelecionada));
        }
    }).fail(function (erro) {
        divSpinner.hide();
        $(".row").show();
        console.log(erro);
    });
}

function retornarDataAtualizacao() {
    let orgao = NuloParaValor(getParametro("sec"), "51"),
        urlJson = url + "IndCorregedoria_Api.aspx?op=a&sec=" + orgao,
        mesCorrente, descrMesCorrente, anoMesCorrente, mesAnterior, descrMesAnterior, anoMesAnterior;

    $.get(urlJson, function () {
    }).done(function (data) {
        $("#dtAtualizacao").html("Atualizado em: " + data);

        mesCorrente = moment(data, "DD/MM/YYYY").format('M');
        descrMesCorrente = moment(data, "DD/MM/YYYY").locale('pt-br').format('MMMM');
        anoMesCorrente = moment(data, "DD/MM/YYYY").locale('pt-br').format('YYYY');

        mesAnterior = moment(data, "DD/MM/YYYY").subtract(1, "month").locale('pt-br').format('M');
        descrMesAnterior = moment(data, "DD/MM/YYYY").subtract(1, "month").locale('pt-br').format('MMMM');
        anoMesAnterior = parseInt(anoMesCorrente) + (parseInt(mesAnterior) == 12 ? -1 : 0);

        for (var numGraf = 7; numGraf <= 9; numGraf++) {
            if (numGraf == 7 || numGraf == 8 || numGraf == 9) {
                $("#mes_corrente_graf" + numGraf).val(anoMesCorrente + "_" + mesCorrente);
                $("label[for=mes_corrente_graf" + numGraf + "]").html(descrMesCorrente);

                $("#mes_anterior_graf" + numGraf).val(anoMesAnterior + "_" + mesAnterior);
                $("label[for=mes_anterior_graf" + numGraf + "]").html(descrMesAnterior);
                $("#mes_corrente_graf" + numGraf).prop("checked", true);
            }
        }
    }).fail(function (erro) {
        console.log(erro);
    });
}

function gerarListaVara() {
    let urlJson = url + "IndCorregedoria_Api.aspx?op=l&tp=vara&sec=" + $("input[name='orgao']:checked").val(),
		vara = NuloParaValor(getParametro("uni"));

    $.ajaxSetup({ async: false });
    $.get(urlJson, function () {
    }).done(function (data) {
        $("#vara").empty();
        $("#vara").append('<option value=""></option>');

        data.map(function (item) {
            let selected = (item['codvara'] == vara ? "selected" : "");
            $("#vara").append("<option " + selected + " value='" + item['codvara'] + "'>" + item['sigla'] + " - " + item['descr'] + "</option>");
        });

    }).fail(function (erro) {
        console.log(erro);
    });
}

function carregarDados() {
    $(".total span").html("");
    $("div[id^='g']").html("");
    inicializarSpinners();
    retornarDataAtualizacao();

    setTimeout(function () {
        gerarGrafico(true, "");
        gerarCarousel();
    }, 1000);
}

function inicializaDataTableProcessos(table, json, numGraf, numgrafpremio) {
    jsonToTable(json, numGraf);
    $.fn.dataTable.moment('DD/MM/YYYY');

    table.DataTable({
        "initComplete": function (settings, json) {
            if ($("div.aguarde").length) {
                $("div.aguarde").hide();
                $('.fixed-action-btn').show();
            }
        },
        "language": {
            "decimal": ",",
            "thousands": ".",
            "search": "",
            "searchPlaceholder": "Buscar...",
            "info": "Mostrando de _START_ a _END_ de _TOTAL_ Registros",
            "infoFiltered": "[ Filtrado de _MAX_ Registros ]",
            "infoEmpty": "Nenhum registro encontrado",
            "zeroRecords": "***Nenhum registro encontrado***",
        },
        "autoWidth": false,
        "ordering": false,
        "serverSide": false,
        "dom": 'Bt',
        "bLengthChange": false,
        "bPaginate": false,
        "stripeClasses": ['odd-row', 'even-row'],
        "destroy": true,
        "buttons": [
            {
                "extend": 'colvis',
                "text": 'Esconder Colunas',
                "className": 'gerarRel',
            },
            {
                "extend": 'excelHtml5',
                "customizeData": function (data) { for (var i = 0; i < data.body.length; i++) { for (var j = 0; j < data.body[i].length; j++) { data.body[i][j] = '\u200C' + data.body[i][j]; } } },
                "title": geraNomeRelatorio,
                "text": 'Exportar Busca para Excel',
                "className": 'gerarRel',
                "exportOptions": {
                    "columns": ':visible',
                    "format": {
                        "header": function (data, i) {
                            return $("#tituloHeader").val().split(",")[i];
                        }
                    }
                }
            },
            {
                "extend": 'pdfHtml5',
                "title": geraNomeRelatorio,
                "text": 'Exportar Busca para PDF',
                "className": 'gerarRel',
                "exportOptions": {
                    "columns": ':visible',
                    "format": {
                        "header": function (data, i) {
                            return $("#tituloHeader").val().split(",")[i];
                        }
                    }
                }
            }
        ]
    });

    const dt = table.DataTable();
    const lblTotal = $('#lblTotalProcessos');

    dt.on('draw', function () {
        const exibirPorcentagem = numGraf === "c1" ? false : true;
        exibirTotal(table, lblTotal, exibirPorcentagem);
    });

    $(".dt-buttons").css({ "float": "right", "margin-bottom": "10px", "margin-left": "5px", "margin-right": "1px" });

    $(".dt-button.buttons-collection.buttons-colvis").click(function () {
        //Não exibe a coluna com o nome iniciada com '*'
        for (var i = 0; i < $(".dt-button.buttons-columnVisibility").length; i++) {
            if ($(".dt-button.buttons-columnVisibility:eq(" + i + ") span:eq(0)").text().startsWith("*")) {
                $(".dt-button.buttons-columnVisibility:eq(" + i + ")").css("display", "none");
            }
        }

        $(".dt-button.buttons-columnVisibility").click(function () {
            if ($(this).hasClass("active")) {
                $(this).css("text-decoration", "");
            } else {
                $(this).css("text-decoration", "line-through");
            }
        });
    });

    $(".gerarRel").each(function (i) {
        let cor;
        if (numGraf.indexOf("c") != -1) {
            cor = "#020202";
        } else {
            cor = getColor(numGraf - 1);
        }

        $(".gerarRel").eq(i).css({ "background": cor, "color": "hsla(0,0%,100%,.87)" });
    });

    $("#gridView1").DataTable().columns().every(function () {
        let column = this;
        let title = $("#tituloHeader").val().split(",")[column.index()];
        if (title == "Último Movimento" || title == "Data" || title == "Data Início Fase" || title == "Data de Autuação") { //datePicker
            filtroDatePicker($("#gridView1"), column, $("#lblTotalProcessos"));
        }
        else if (title == "Processo" || title == "Expediente/Petição") { //Autocomplete 
            filtroAutoComplete($("#gridView1"), column, $("#lblTotalProcessos"));
        }
        else if (title == "Tempo Em Dias" || title.indexOf("Tempo Tramitação") > -1 ) { //Range
            let intervaloDias, max, min, startmin, startmax,
                valoresColuna = column.data().unique().map(Number).sort(function (a, b) {
                    return a - b;
                });

            numGraf = NuloParaValor(getParametro("gid"));
            intervaloDias = getParametro("sel");

            min = valoresColuna[0];
            max = valoresColuna[valoresColuna.length - 1];

            if (numGraf == 6 && column.index() == 2) {
                if (intervaloDias) {
                    startmin = parseInt(intervaloDias.split("_")[0]);

                    if (intervaloDias.split("_").length == 2) {
                        startmax = parseInt(intervaloDias.split("_")[1]);
                    } else {
                        startmax = valoresColuna[valoresColuna.length - 1];
                    }
                } else {
                    startmin = valoresColuna[0];
                    startmax = valoresColuna[valoresColuna.length - 1];
                }
            } else {
                startmin = min;
                startmax = max;
            }

            filtroSiderRange($("#gridView1"), column, $('#lblTotalProcessos'), min, startmin, max, startmax);

        } else { //Select
            let numGraf = NuloParaValor(getParametro("gid")), opcaoSelecionada = getParametro("sel"), valor = "";

            if (opcaoSelecionada != "") {
                let filtrosNumGrafOpcaoSel = [['1', 1], ['2', 1], ['3', 1], ['4', 3], ['5', 2], ['7', 1], ['8', 1], ['9', 1], ['c1', 3], ['c2', 1]];
                let outrasColunas = filtrosNumGrafOpcaoSel.filter(function (itemFiltro) {
                    return itemFiltro[0] == numGraf && itemFiltro[1] == column.index();
                }).length == 1 ? false : true;

                if (outrasColunas) {
                    valor = "";
                } else {
                    valor = removerAcentos(verificarPoints(numGraf, decodeURIComponent(opcaoSelecionada)));
                }
            }

            if (numGraf == 2) {
                if ((title == "Trâmite" && getParametro("tram") == "S") || (title == "Sem Sentença" && getParametro("ssen") == "S") ||
                    (title == "Concluso" && getParametro("conc") == "S")) { valor = "Sim"; }
            }

            if (numGraf == 5) {
                if (title == "Magistrado") {
                    let mag = getParametro("mag");
                    valor = mag != "" ? mag : "";
                }
            }

            if (numGraf == "c3" && (title.indexOf("Metas") > -1 || title.indexOf("Remanescente") > -1)) {
                filtroMeta($("#gridView1"), column, $('#lblTotalProcessos'));
            } else if (numGraf == "5" && title == "Magistrado") {
                filtroSelect2($("#gridView1"), column, $("#gridView1").DataTable().column(column.index() - 1), $('#lblTotalProcessos'), valor)
            } else {
                filtroSelect($("#gridView1"), column, $('#lblTotalProcessos'), valor);
            }
        }
    });

    $("#gridView1").DataTable().columns().every(function () {
        //Não exibe a coluna com o nome iniciada com '*'
        let title = $("#tituloHeader").val().split(",")[this.index()];
        if (title.startsWith("*")) {
            this.visible(false);
        }
    });

    ajustarColunas(numGraf, numgrafpremio);
    exibirTotal($("#gridView1"), $("#lblTotalProcessos"), (numGraf === "c1" ? false : true));
}

function ajustarColunas(numGraf, numgrafpremio) {
    let larguras = tamanhoColunasGraficos(numGraf, numgrafpremio);
    $("#gridView1 thead:eq(0) tr:eq(0) th").map(function (i, th) {
        $(this).width(larguras[i] + "%");
    });
}

function verificarPoints(numGraf, texto) {
    if (numGraf == 1) return texto.replace("Inquéritos", "Inquérito").replace("Suspensos", "Suspenso").replace("Ativos", "Ativo");
    if (numGraf == 2) return texto.replace("Antes", "<= ");
    if (numGraf == 3) return texto.indexOf("Não") != -1 ? "Não" : "Sim";
    if (numGraf == 4 || numGraf == 5) return texto.replace("_", "/");
    if (numGraf == 7 || numGraf == 8) {
        return texto.replace("Outras_Entradas", "Outras Entradas").replace("Outras_Saídas", "Outras Saídas").replace("Recebidos_do_TRF_TR", "Recebidos do TRF/TR").replace("Redistribuídos_CEJUSC_CEPER", "Redistribuídos CEJUSC/CEPER").replace("Remetidos_do_TRF_TR", "Remetidos do TRF/TR").replace("_", "/").replace(/_/g, " ");
    }
    if (numGraf == 9) return texto.replace(/_/g, " ");
    return texto;
}

function geraNomeRelatorio() {
    let d = new Date();
    return "Rel_Indicadores_" + (100 + d.getDate()).toString().substr(1, 2) + "_" +
        (100 + (d.getMonth() + 1)).toString().substr(1, 2) + "_" + d.getFullYear() + "_" +
        (100 + d.getHours()).toString().substr(1, 2) + (100 + d.getMinutes()).toString().substr(1, 2) +
        (100 + d.getSeconds()).toString().substr(1, 2);
}

function jsonToTable(data, numGraf) {
    let anoremanescente = "2024", table = $('#gridView1'), thead = $("<thead></thead>"), tbody = $("<tbody></tbody>"), tr = $("<tr></tr>"), url = "", titulo = [], 
        orgao = $("input[name='orgao']:checked").val();

    table.find("thead").remove();
    table.find("tbody").remove();
    table.append(thead);
    thead.append(tr);

    for (var k in data[0]) {
        if (k == "Remanescente_Meta2") {
            if (numGraf == "c2") { anoremanescente = "2025"; }
            tr.append($("<th>Remanescente " + anoremanescente  + "</th>"));
            titulo.push(k);
        }

        if (k == "meta2") {
            tr.append($("<th>Metas</th>"));
            titulo.push(k);
        }

        if (k.indexOf("Remanescente_Meta") == -1 && k.indexOf("meta") == -1) {
            tr.append($("<th>" + k + "</th>"));
            titulo.push(k);
        }
    }

    tr.before(tr.clone());
    $("#gridView1 thead tr:eq(0) th").css({"font-size" : ".8rem", "color": "#9e9e9e"});
    $("#gridView1 thead tr:eq(1) th").css("font-size", "1rem");
    $("#tituloHeader").val(titulo.join());
    $("#tituloHeader").val($("#tituloHeader").val().replace("Remanescente_Meta2", "Remanescente 2024"));
    $("#tituloHeader").val($("#tituloHeader").val().replace("meta2", "Metas"));
    $("#tituloHeader").val($("#tituloHeader").val().replace("_", " "));

    table.append(tbody);
    table.css("table-layout", "auto");

    $.each(data, function (index, value) {
        let trd = "<tr>";
        let listaMetas = numGraf == "c3" ? [2, 4, 8, 11, 12] : [2, 4, 6, 7, 10];

        $.each(value, function (key, val) {
            if (key == "Processo") {
                const codsecao = value["*codsecao"] === value["*codsecaosist"] ? orgao : value["*codsecaosist"];

                url = "/Pages/consultaprocessual/?s=2&i=" + codsecao + "&n=" + val;
                trd += "<td nowrap style='border: 1px solid transparent;'><a target='_blank' href='" + url + "'>" + val + "</a></td>";
            } else {
                if (key == "Remanescente_Meta2") {
                    let remanescente = "";
                    listaMetas.forEach(m => {
                        m = (m == "12" ? "10" : m);
                        remanescente += (value["Remanescente_Meta" + m] == "Sim" ? " " + m + "," : "")
                    });

                    let vremanescente = remanescente.split(",").filter(e => e);   //ignora itens nulos

                    if (vremanescente.length > 0) {
                        remanescente = "Meta" + (vremanescente.length > 1 ? "s" : "") + vremanescente.toString();
                    } else {
                        remanescente = "Não";
                    }

                    trd += "<td style='word-wrap:break-word; border: 1px solid transparent;'>" + remanescente + "</td>";
                }
                if (key == "meta2") {
                    let meta = "";
                    listaMetas.forEach(m => {
                        m = (m == "12" ? "10" : m);
                        meta += (value["meta" + m] == "Sim" ? " " + m + "," : "")
                    });
                    let vmeta = meta.split(",").filter(e => e);   //ignora itens nulos

                    if (vmeta.length > 0) {
                        meta = "Meta" + (vmeta.length > 1 ? "s" : "") + vmeta.toString();
                    } else {
                        meta = "Não";
                    }

                    trd += "<td style='word-wrap:break-word; border: 1px solid transparent;'>" + meta + "</td>";
                }

                if (key.indexOf("Remanescente_Meta") == -1 && key.indexOf("meta") == -1) {
                    trd += "<td style='word-wrap:break-word; border: 1px solid transparent;'>" + val + "</td>";
                }
            }
        });

        trd += "</tr>";
        tbody.append(trd);
    });
}

function getColor(numGraf) {
    return ["#388E3C", "#7B1FA2", "#1976D2", "#512DA8", "#00796B", "#D32F2F", "#32488d", "#3d6647", "#00796B", "#FFE4C5", "#FFE4C4", "#DA70D6"][numGraf];
}

function tamanhoColunasGraficos(numGraf, numgrafpremio) {
    if (numGraf == 1) { return [13, 9, 9, 10, 15, 8, 8, 9, 10, 9]; }
    if (numGraf == 2) { return [13, 8, 8, 11, 8, 8, 8, 15, 8, 8]; }
    if (numGraf == 3) { return [14, 8, 8, 8, 12, 22, 8, 10, 10]; }
    if (numGraf == 4) { return [15, 7, 8, 10, 10, 10, 25, 8, 8, 8]; }
    if (numGraf == 5) { return [12, 5, 10, 7, 12, 12, 12, 8, 8, 10, 8]; }
    if (numGraf == 6) { return [12, 14, 8, 8, 10, 25, 8, 8, 10, 8]; }
    if (numGraf == 7) { return [17, 13, 43, 8, 8, 10]; }
    if (numGraf == 8) { return [17, 13, 43, 8, 8, 10]; }
    if (numGraf == 9) { return [16, 13, 12, 20, 10, 21, 8]; }
    if (numGraf === "c1") {
        if (numgrafpremio === "0") {
            return [10, 16, 12, 14, 12, 8, 8, 8, 8];
        } else if (numgrafpremio === "2") {
            return [10, 12, 12, 10, 8, 8, 8, 8];
        } else if (numgrafpremio === "3") {
            return [10, 8, 12, 20, 8, 8];
        }
    }
    if (numGraf == "c2") { return [13, 8, 13, 10, 25, 8, 8]; }
    if (numGraf == "c4") { return [13, 8, 8, 12, 15, 8, 20, 8, 8]; }
    //if (numGraf == "c4_2") { return [13, 8, 12, 15, 8, 8]; }
    //if (numGraf == "c5") { return [13, 8, 8, 12, 15, 8, 20, 8, 8]; }
    if (numGraf == "c9") { return [13, 20, 20, 20, 10, 10, 10]; }
    if (numGraf == "c10") { return [13, 20, 20, 20, 10, 10, 10]; }
}

function lerVetorCores(numGraf) {
    if (numGraf == 1) { return ["#4CAF50", "#388E3C", "#1B5E20"]; }
    if (numGraf == 2) { return ["#C368C8", "#9C27B0", "#7B1FA2", "#9400D3", "#4B0082"]; }
    if (numGraf == 3) { return ["#64B5F6", "#2196F3"]; }
    if (numGraf == 4) { return ["#9575CD", "#673AB7"]; }
    if (numGraf == 5) { return ["#4DB6AC", "#009688"]; }
    if (numGraf == 6) { return ["#FFB6C1", "#E57373", "#F44336", "#D32F2F", "#B71C1C", "#8B0000"]; }
    if (numGraf == 7) { return ["#32488d", "#0069cf", "#426cda", "#1434A4", "#76C4D0", "#84a6fa"]; }
    if (numGraf == 8) { return ["#3d6647", "#008000", "#5c996b", "#4CAF50", "#7acc8f", "#F5F5DC"]; }
    if (numGraf == 9) { return ["#55916F", "#76C4D0", "#69B37E", "#A5D094"]; }
    if (numGraf == 10) { return ["#FFB6C1", "#E57373", "#F44336", "#D32F2F", "#B71C1C", "#8B0000", "#C368C8", "#9C27B0", "#7B1FA2", "#9400D3", "#4B0082"]; }
    if (numGraf == 11) { return ["#FFB6C1", "#E57373", "#F44336", "#D32F2F", "#B71C1C", "#8B0000", "#C368C8", "#9C27B0", "#7B1FA2", "#9400D3", "#4B0082"]; }
    if (numGraf == 13) { return ["#FFB6C1", "#E57373", "#F44336", "#D32F2F", "#B71C1C", "#8B0000", "#C368C8", "#9C27B0", "#7B1FA2", "#9400D3", "#4B0082"]; }
}

function incluirLinkHistorico(vara) {
   let urlJson = url + "IndCorregedoria_Api.aspx?op=o&uni=" + vara;

    $.ajaxSetup({ async: false });
    $.get(urlJson, function () {
    }).done(function (data) {
        if (data.length > 0) {
            $("#hrefHistorico").show();
            $("#hrefHistorico > span").text("Histórico de Magistrados");
            $("#hrefHistorico").attr("href", data[0].link);
            $("#hrefHistorico").attr("target", "_blank");
            $("#hrefHistorico").attr('rel', 'noopener noreferrer');
        } else {
            $("#hrefHistorico").hide();
        }
    }).fail(function (erro) {
        console.log(erro);
    });
}

function carregarDescricaoTema(tema) {
    let descricao = "";

    if (tema === "Saúde") {
        descricao = "<span class='spanDescricaoMeta_linha1'>Prêmio CNJ de Qualidade 2026 - Portaria CNJ nº 471, de 18 de dezembro de 2025 - Tema Saúde</span><br />" +
            "<span class='spanDescricaoMetaArt'>Art. 10, VII Celeridade e Conciliação nas ações de judicialização da saúde.</span><br />" +
            "<span class='spanDescricaoMetaArt'>a) tempo médio decorrido entre a data do início da ação e a data - base de cálculo nos processos de judicialização da saúde pendentes líquidos:</span><br />" +
            "<span class='spanDescricaoMetaArt'>a.1) até 300 dias(20 pontos);</span><br />" +
            "<span class='spanDescricaoMetaArt'>a.2) de 301 a 500 dias(10 pontos).</span><br /><br />" +
            "<span class='spanDescricaoMeta'>Listagem de processos com Tempo de tramitação líquida (Início da Fase até o dia de hoje, descontados os tempos de suspensão e / ou desativação *) acima de 500 dias</span><br />" +
            "<span class='spanDescricaoMeta'>* Tempo de desativação - Período em que o processo permaneceu baixado ou remetido para instância superior em grau de recurso.</span><br />";
    } else if (tema === "Direito Assistencial") {
        descricao = "<span class='spanDescricaoMeta_linha1'>Prêmio CNJ de Qualidade 2026 - Portaria CNJ nº 471, de 18 de dezembro de 2025 - Tema Direito Assistencial</span><br />" +
            "<span class='spanDescricaoMetaArt'>Art. 10, VIII Celeridade e Conciliação nas ações de Direito Assistencial.</span><br />" +
            "<span class='spanDescricaoMetaArt'>a) tempo médio decorrido entre a data do início da ação e a data - base de cálculo nos processos de Direito Assistencial pendentes líquidos:</span><br />" +
            "<span class='spanDescricaoMetaArt'>a.1) até 200 dias(20 pontos);</span><br />" +
            "<span class='spanDescricaoMetaArt'>a.2) de 201 a 400 dias(10 pontos).</span><br /><br />" +
            "<span class='spanDescricaoMeta'>Listagem de processos com Tempo de tramitação líquida (Início da Fase até o dia de hoje, descontados os tempos de suspensão e / ou desativação *) acima de 400 dias</span><br />" +
            "<span class='spanDescricaoMeta'>* Tempo de desativação - Período em que o processo permaneceu baixado ou remetido para instância superior em grau de recurso.</span><br />";
    } else if (tema === "Ambiental") {
        descricao = "<span class='spanDescricaoMeta_linha1'>Prêmio CNJ de Qualidade 2026 - Portaria CNJ nº 471, de 18 de dezembro de 2025 - Tema Ambiental</span><br />" +
            "<span class='spanDescricaoMetaArt'>Art. 10, XII Solucionar as ações ambientais, Resolução CNJ nº 433/2021.</span><br />" +
            "<span class='spanDescricaoMetaArt'>b) julgar, entre 1º/8/2025 e 31/7/2026, pelo menos 30,00% dos processos ambientais ingressados até 31/12/2022 e que não tinham sido julgados ou baixados até 31/7/2025 (20 pontos).</span><br />" +
            "<span class='spanDescricaoMeta'>Listagem de processos ambientais de conhecimento pendentes bruto (incluídos os suspensos), não julgados, autuados na instância até o ano de 2022</span><br />";
    }

    $('<div class="descricaoTema"></div><br><br>')
        .insertAfter('#gridView1_wrapper .dt-buttons')
        .html(descricao);
}
