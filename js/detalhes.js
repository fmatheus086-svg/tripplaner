
"use strict";

const parametros = new URLSearchParams(window.location.search);
const id = Number(parametros.get("id"));

const viagens = JSON.parse(localStorage.getItem("viagens")) || [];

const viagem = viagens.find(function(item) {
    return item.id === id;
});

if (viagem) {
    const secao = document.querySelector("main section");
    const titulo = secao.querySelector("h2");
    const paragrafos = secao.querySelectorAll("p");

    titulo.textContent = viagem.destino + ", " + viagem.pais;

    const dataIda = viagem.dataIda.split("-").reverse().join("/");
    const dataVolta = viagem.dataVolta.split("-").reverse().join("/");

    const orcamento = Number(viagem.orcamento).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });

    const nomesStatus = {
        planejamento: "Em planejamento",
        confirmada: "Confirmada",
        andamento: "Em andamento",
        concluida: "Concluída",
        cancelada: "Cancelada"
    };

    const dados = [
        ["Data de ida", dataIda],
        ["Data de volta", dataVolta],
        ["Orçamento", orcamento],
        ["Status", nomesStatus[viagem.status] || viagem.status]
    ];

    for (let i = 0; i < dados.length; i++) {
        const negrito = document.createElement("strong");
        negrito.textContent = dados[i][0] + ": ";

        paragrafos[i].replaceChildren(
            negrito,
            document.createTextNode(dados[i][1])
        );
    }

    paragrafos[4].textContent = viagem.descricao || "Sem descrição.";

    const roteiro = document.querySelectorAll("main section")[1];
    const artigos = roteiro.querySelectorAll("article");

    for (const artigo of artigos) {
        artigo.remove();
    }

    const mensagem = document.createElement("p");
    mensagem.textContent = "Nenhum ponto turístico adicionado ao roteiro.";

    roteiro.appendChild(mensagem);
} else {
    document.querySelector("main").textContent = "Viagem não encontrada.";
}

if (viagem) {
    
viagem.roteiro = viagem.roteiro || [];

const secaoRoteiro = document.querySelectorAll("main section")[1];

function atualizarRoteiro() {
    const elementos = secaoRoteiro.querySelectorAll("p, article");

    for (const elemento of elementos) {
        elemento.remove();
    }

    let total = 0;

    for (const atividade of viagem.roteiro) {
        total += Number(atividade.custo);
    }

    const resumo = document.createElement("p");

    resumo.textContent =
        "Orçamento: " + Number(viagem.orcamento).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        }) +
        " | Planejado: " + total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        }) +
        " | Disponível: " + (viagem.orcamento - total).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    secaoRoteiro.appendChild(resumo);

    if (viagem.roteiro.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum ponto turístico adicionado ao roteiro.";
        secaoRoteiro.appendChild(mensagem);
    }

    for (const atividade of viagem.roteiro) {
        const artigo = document.createElement("article");

        const titulo = document.createElement("h3");
        titulo.textContent = atividade.nome;

        const dados = document.createElement("p");
        dados.textContent = "Data: " +
            atividade.data.split("-").reverse().join("/") +
            " | Custo: " + Number(atividade.custo).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

        artigo.appendChild(titulo);
        artigo.appendChild(dados);
        secaoRoteiro.appendChild(artigo);
    }
}

atualizarRoteiro();

    const secaoAtracoes = document.createElement("section");

    const tituloAtracoes = document.createElement("h2");
    tituloAtracoes.textContent = "Pontos turísticos de " + viagem.destino;

    const mensagemAtracoes = document.createElement("p");
    mensagemAtracoes.textContent = "Buscando atrações...";

    const listaAtracoes = document.createElement("div");

    const botaoBuscar = document.createElement("button");
    botaoBuscar.type = "button";
    botaoBuscar.textContent = "Atualizar atrações";

    secaoAtracoes.appendChild(tituloAtracoes);
    secaoAtracoes.appendChild(mensagemAtracoes);
    secaoAtracoes.appendChild(botaoBuscar);
    secaoAtracoes.appendChild(listaAtracoes);

    const creditos = document.createElement("a");
    creditos.href = "https://www.openstreetmap.org/copyright";
    creditos.textContent = "Dados: OpenStreetMap contributors";
    secaoAtracoes.appendChild(creditos);

    document.querySelector("main").appendChild(secaoAtracoes);

    function buscarAtracoes() {
        mensagemAtracoes.textContent = "Buscando atrações...";
        listaAtracoes.innerHTML = "";

        const endereco = "https://geocoding-api.open-meteo.com/v1/search?name="
            + encodeURIComponent(viagem.destino)
            + "&count=30&language=pt&format=json";

        fetch(endereco)
            .then(resposta => {
                if (!resposta.ok) {
                    throw new Error("Erro ao buscar a cidade");
                }
                return resposta.json();
            })
            .then(dados => {
                const cidades = dados.results || [];

                const cidade = cidades.find(item =>
                    item.name.toLowerCase() === viagem.destino.trim().toLowerCase()
                    && item.country.toLowerCase() === viagem.pais.trim().toLowerCase()
                );

                if (!cidade) {
                    throw new Error("Cidade não encontrada no país selecionado");
                }

                const consulta = '[out:json][timeout:20];'
    + 'nwr(around:3000,'
    + cidade.latitude + ',' + cidade.longitude
    + ')["tourism"~"^(attraction|museum|viewpoint|gallery)$"]["name"];'
    + 'out center 20;';

                const url = "https://overpass-api.de/api/interpreter?data="
                    + encodeURIComponent(consulta);

                return fetch(url);
            })
            .then(resposta => {
                if (!resposta.ok) {
                    throw new Error("Erro ao buscar atrações");
                }
                return resposta.json();
            })
            .then(dados => {
                const atracoes = dados.elements || [];
                const nomes = [];
                let quantidade = 0;

                const categorias = {
                    attraction: "Ponto turístico",
                    museum: "Museu",
                    viewpoint: "Mirante",
                    gallery: "Galeria"
                };

                for (const atracao of atracoes) {
                    const nome = atracao.tags.name;

                    if (nomes.includes(nome.toLowerCase())) {
                        continue;
                    }

                    nomes.push(nome.toLowerCase());

                    const artigo = document.createElement("article");

                    const titulo = document.createElement("h3");
                    titulo.textContent = nome;

                    const categoria = document.createElement("p");
                    categoria.textContent = "Categoria: "
                        + (categorias[atracao.tags.tourism] || "Ponto turístico");

                    
artigo.appendChild(titulo);
artigo.appendChild(categoria);


const botaoAdicionar = document.createElement("button");
botaoAdicionar.type = "button";
botaoAdicionar.textContent = "Adicionar ao roteiro";

const painel = document.createElement("div");
painel.className = "formulario-atracao";
painel.style.display = "none";

const rotuloData = document.createElement("label");
rotuloData.textContent = "Data da visita (DD/MM/AAAA)";

const campoData = document.createElement("input");
campoData.type = "text";
campoData.placeholder = "DD/MM/AAAA";
campoData.maxLength = 10;
campoData.value = viagem.dataIda.split("-").reverse().join("/");

rotuloData.appendChild(campoData);

const rotuloCusto = document.createElement("label");
rotuloCusto.textContent = "Custo estimado (R$)";

const campoCusto = document.createElement("input");
campoCusto.type = "number";
campoCusto.min = "0";
campoCusto.step = "0.01";
campoCusto.placeholder = "0,00";

rotuloCusto.appendChild(campoCusto);

const mensagem = document.createElement("p");

const botaoSalvar = document.createElement("button");
botaoSalvar.type = "button";
botaoSalvar.textContent = "Confirmar atividade";

const botaoCancelar = document.createElement("button");
botaoCancelar.type = "button";
botaoCancelar.textContent = "Cancelar";
botaoCancelar.className = "cancelar";

painel.appendChild(rotuloData);
painel.appendChild(rotuloCusto);
painel.appendChild(mensagem);
painel.appendChild(botaoSalvar);
painel.appendChild(botaoCancelar);

botaoAdicionar.addEventListener("click", function() {
    painel.style.display = painel.style.display === "none"
        ? "flex"
        : "none";
});

botaoCancelar.addEventListener("click", function() {
    painel.style.display = "none";
    mensagem.textContent = "";
});

botaoSalvar.addEventListener("click", function() {
    mensagem.textContent = "";

    const partes = campoData.value.trim().split("/");

    if (partes.length !== 3 ||
        partes[0].length !== 2 ||
        partes[1].length !== 2 ||
        partes[2].length !== 4) {
        mensagem.textContent = "Informe a data no formato DD/MM/AAAA.";
        return;
    }

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    const dataValidacao = new Date(ano, mes - 1, dia);

    if (dataValidacao.getDate() !== dia ||
        dataValidacao.getMonth() !== mes - 1 ||
        dataValidacao.getFullYear() !== ano) {
        mensagem.textContent = "Informe uma data válida.";
        return;
    }

    const data = partes[2] + "-" + partes[1] + "-" + partes[0];

    if (data < viagem.dataIda || data > viagem.dataVolta) {
        mensagem.textContent = "A data deve estar dentro do período da viagem.";
        return;
    }

    if (campoCusto.value.trim() === "") {
        mensagem.textContent = "Informe o custo estimado.";
        return;
    }

    const custo = Number(campoCusto.value);

    if (!Number.isFinite(custo) || custo < 0) {
        mensagem.textContent = "Informe um custo válido.";
        return;
    }

    for (const atividade of viagem.roteiro) {
        if (atividade.nome === nome) {
            mensagem.textContent = "Esta atração já está no roteiro.";
            return;
        }
    }

    let total = 0;

    for (const atividade of viagem.roteiro) {
        total += Number(atividade.custo);
    }

    if (total + custo > viagem.orcamento) {
        mensagem.textContent = "Esta atividade ultrapassa o orçamento disponível.";
        return;
    }

    viagem.roteiro.push({
        nome: nome,
        categoria: categorias[atracao.tags.tourism] || "Ponto turístico",
        data: data,
        custo: custo
    });

    localStorage.setItem("viagens", JSON.stringify(viagens));

    atualizarRoteiro();

    painel.style.display = "none";
    botaoAdicionar.textContent = "Adicionado ao roteiro";
    botaoAdicionar.disabled = true;
});

artigo.appendChild(botaoAdicionar);
artigo.appendChild(painel);

listaAtracoes.appendChild(artigo);


                    quantidade++;

                    if (quantidade === 12) {
                        break;
                    }
                }

                mensagemAtracoes.textContent = quantidade === 0
                    ? "Nenhuma atração encontrada nesta região."
                    : quantidade + " atrações encontradas.";
            })
            .catch(erro => {
                console.error(erro);
                mensagemAtracoes.textContent =
                    "Não foi possível carregar as atrações. Tente novamente.";
            });
    }

    botaoBuscar.addEventListener("click", buscarAtracoes);

    buscarAtracoes();
}
