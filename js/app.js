
"use strict";

let viagens = JSON.parse(localStorage.getItem("viagens")) || [];
let proximoId = 1;
let idEmEdicao = null;

for (const viagem of viagens) {
    if (viagem.id >= proximoId) {
        proximoId = viagem.id + 1;
    }
}

const formulario = document.querySelector("#cadastro form");
const campoDestino = document.querySelector("#destino");
const campoPais = document.querySelector("#pais");

const linhaPais = campoPais.parentElement;
const linhaDestino = campoDestino.parentElement;

linhaDestino.parentElement.insertBefore(linhaPais, linhaDestino);

campoDestino.disabled = true;
campoDestino.placeholder = "Selecione o país primeiro";

const listaDestinos = document.createElement("datalist");
listaDestinos.id = "sugestoes-destinos";
document.body.appendChild(listaDestinos);
campoDestino.setAttribute("list", "sugestoes-destinos");

const listaPaises = document.createElement("datalist");
listaPaises.id = "sugestoes-paises";
document.body.appendChild(listaPaises);
campoPais.setAttribute("list", "sugestoes-paises");

const nomesPaises = new Intl.DisplayNames(["pt-BR"], {
    type: "region"
});

const codigosPaises = {};

fetch("https://api.first.org/data/v1/countries?limit=300")
    .then(resposta => resposta.json())
    .then(dados => {
        for (const codigo of Object.keys(dados.data)) {
            const nome = nomesPaises.of(codigo);

            const opcao = document.createElement("option");
            opcao.value = nome;
            listaPaises.appendChild(opcao);

            codigosPaises[nome.toLowerCase()] = codigo;
        }
    })
    .catch(() => {
        console.log("Não foi possível carregar os países.");
    });

let sugestoesDestinos = [];
let tempoBusca;
let numeroBusca = 0;

campoPais.addEventListener("input", function() {
    const codigo = codigosPaises[campoPais.value.trim().toLowerCase()];

    campoDestino.disabled = !codigo;
    campoDestino.value = "";

    campoDestino.placeholder = codigo
        ? "Digite o destino"
        : "Selecione o país primeiro";

    listaDestinos.innerHTML = "";
    sugestoesDestinos = [];

    clearTimeout(tempoBusca);
    numeroBusca++;
});

campoDestino.addEventListener("input", function() {
    clearTimeout(tempoBusca);
    numeroBusca++;

    const texto = campoDestino.value.trim();
    const buscaAtual = numeroBusca;

    const cidadeSelecionada = sugestoesDestinos.find(cidade =>
        cidade.name.toLowerCase() === texto.toLowerCase()
    );

    if (cidadeSelecionada) {
        campoPais.value = nomesPaises.of(cidadeSelecionada.country_code);
        return;
    }

    listaDestinos.innerHTML = "";

    if (texto.length < 3) {
        return;
    }

    tempoBusca = setTimeout(function() {
        let endereco = "https://geocoding-api.open-meteo.com/v1/search?name="
            + encodeURIComponent(texto)
            + "&count=10&language=pt&format=json";

        const codigoPais = codigosPaises[campoPais.value.trim().toLowerCase()];

        if (codigoPais) {
            endereco += "&countryCode=" + codigoPais;
        }

        fetch(endereco)
            .then(resposta => resposta.json())
            .then(dados => {
                if (buscaAtual !== numeroBusca) {
                    return;
                }

                sugestoesDestinos = dados.results || [];
                listaDestinos.innerHTML = "";

                for (const cidade of sugestoesDestinos) {
                    const opcao = document.createElement("option");

                    opcao.value = cidade.name;
                    opcao.label = (cidade.admin1 || cidade.name)
                        + ", " + cidade.country;

                    listaDestinos.appendChild(opcao);
                }
            })
            .catch(() => {
                console.log("Não foi possível buscar destinos.");
            });
    }, 400);
});

formulario.addEventListener("reset", function() {
    campoDestino.disabled = true;
    campoDestino.placeholder = "Selecione o país primeiro";

    listaDestinos.innerHTML = "";
    sugestoesDestinos = [];

    clearTimeout(tempoBusca);
    numeroBusca++;

    idEmEdicao = null;

    document.querySelector('#cadastro button[type="submit"]').textContent =
        "Cadastrar viagem";
});

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const dataIda = document.querySelector("#data-ida").value;
    const dataVolta = document.querySelector("#data-volta").value;
    const orcamento = Number(document.querySelector("#orcamento").value);

    if (dataVolta < dataIda) {
        alert("A data de volta não pode ser anterior à data de ida.");
        return;
    }

    if (!Number.isFinite(orcamento) || orcamento < 0) {
        alert("Informe um orçamento válido.");
        return;
    }

    const viagem = {
        id: proximoId,
        destino: campoDestino.value.trim(),
        pais: campoPais.value.trim(),
        dataIda: dataIda,
        dataVolta: dataVolta,
        orcamento: orcamento,
        status: document.querySelector("#status").value,
        descricao: document.querySelector("#descricao").value
    };

    if (viagem.destino === "" || viagem.pais === "") {
        alert("Preencha o país e o destino.");
        return;
    }

    if (idEmEdicao === null) {
        viagem.roteiro = [];
        viagens.push(viagem);
        proximoId++;
    } else {
        for (let i = 0; i < viagens.length; i++) {
            if (viagens[i].id === idEmEdicao) {
                viagem.id = idEmEdicao;
                viagem.roteiro = viagens[i].roteiro || [];

                viagens[i] = viagem;
                break;
            }
        }
    }

    localStorage.setItem("viagens", JSON.stringify(viagens));

    mostrarViagens();
    formulario.reset();

    alert("Viagem salva com sucesso!");
});

function mostrarViagens() {
    const secao = document.querySelector("#viagens");
    const artigos = secao.querySelectorAll("article");

    for (const artigo of artigos) {
        artigo.remove();
    }

    const textoPesquisa = document.querySelector("#pesquisa").value
        .trim()
        .toLowerCase();

    const viagensEncontradas = viagens.filter(function(viagem) {
        return viagem.destino.toLowerCase().includes(textoPesquisa) ||
            viagem.pais.toLowerCase().includes(textoPesquisa);
    });

    const filtroStatus = document.querySelector("#filtro-status").value;
    const ordenacao = document.querySelector("#ordenacao").value;

    const viagensFiltradas = viagensEncontradas.filter(function(viagem) {
        return filtroStatus === "todos" || viagem.status === filtroStatus;
    });

    viagensFiltradas.sort(function(a, b) {
        if (ordenacao === "data") {
            return a.dataIda.localeCompare(b.dataIda);
        }

        if (ordenacao === "orcamento") {
            return Number(a.orcamento) - Number(b.orcamento);
        }

        return a.destino.localeCompare(b.destino, "pt-BR");
    });

    const nomesStatus = {
        planejamento: "Em planejamento",
        confirmada: "Confirmada",
        andamento: "Em andamento",
        concluida: "Concluída",
        cancelada: "Cancelada"
    };

    for (const viagem of viagensFiltradas) {
        const artigo = document.createElement("article");

        const titulo = document.createElement("h3");
        titulo.textContent = viagem.destino + ", " + viagem.pais;

        artigo.appendChild(titulo);

        const dataIda = viagem.dataIda.split("-").reverse().join("/");
        const dataVolta = viagem.dataVolta.split("-").reverse().join("/");

        const orcamento = Number(viagem.orcamento).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

        const dados = [
            "Data de ida: " + dataIda,
            "Data de volta: " + dataVolta,
            "Orçamento: " + orcamento,
            "Status: " + (nomesStatus[viagem.status] || viagem.status)
        ];

        for (const dado of dados) {
            const paragrafo = document.createElement("p");
            paragrafo.textContent = dado;
            artigo.appendChild(paragrafo);
        }

        const linkDetalhes = document.createElement("a");
        linkDetalhes.href = "pages/detalhes.html?id=" + viagem.id;
        linkDetalhes.textContent = "Ver detalhes";

        artigo.appendChild(linkDetalhes);

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.textContent = "Editar";

        botaoEditar.addEventListener("click", function() {
            idEmEdicao = viagem.id;

            campoPais.value = viagem.pais;
            campoDestino.disabled = false;
            campoDestino.value = viagem.destino;

            document.querySelector("#data-ida").value = viagem.dataIda;
            document.querySelector("#data-volta").value = viagem.dataVolta;
            document.querySelector("#orcamento").value = viagem.orcamento;
            document.querySelector("#status").value = viagem.status;
            document.querySelector("#descricao").value = viagem.descricao;

            document.querySelector('#cadastro button[type="submit"]').textContent =
                "Salvar alterações";

            document.querySelector("#cadastro").scrollIntoView();
        });

        artigo.appendChild(botaoEditar);

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.className = "excluir";

        botaoExcluir.addEventListener("click", function() {
            const confirmar = confirm("Deseja realmente excluir esta viagem?");

            if (confirmar) {
                viagens = viagens.filter(function(item) {
                    return item.id !== viagem.id;
                });

                localStorage.setItem("viagens", JSON.stringify(viagens));

                if (idEmEdicao === viagem.id) {
                    formulario.reset();
                }

                mostrarViagens();

                alert("Viagem excluída com sucesso!");
            }
        });

        artigo.appendChild(botaoExcluir);

        secao.appendChild(artigo);
    }
}

const campoPesquisa = document.querySelector("#pesquisa");

campoPesquisa.addEventListener("input", mostrarViagens);

const botaoPesquisar = document.querySelector("#viagens form button");

botaoPesquisar.addEventListener("click", mostrarViagens);

const seletorStatus = document.querySelector("#filtro-status");
const seletorOrdenacao = document.querySelector("#ordenacao");


const novosStatus = [
    ["andamento", "Em andamento"],
    ["cancelada", "Cancelada"]
];

for (const status of novosStatus) {
    const opcao = document.createElement("option");
    opcao.value = status[0];
    opcao.textContent = status[1];

    seletorStatus.appendChild(opcao);
}


seletorStatus.addEventListener("change", mostrarViagens);
seletorOrdenacao.addEventListener("change", mostrarViagens);

mostrarViagens();
