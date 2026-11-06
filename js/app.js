
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

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const viagem = {
        id: proximoId,
        destino: document.querySelector("#destino").value,
        pais: document.querySelector("#pais").value,
        dataIda: document.querySelector("#data-ida").value,
        dataVolta: document.querySelector("#data-volta").value,
        orcamento: Number(document.querySelector("#orcamento").value),
        status: document.querySelector("#status").value,
        descricao: document.querySelector("#descricao").value
    };

    

if (idEmEdicao === null) {
    viagens.push(viagem);
    proximoId++;
} else {
    for (let i = 0; i < viagens.length; i++) {
        if (viagens[i].id === idEmEdicao) {
            viagem.id = idEmEdicao;
            viagens[i] = viagem;
            break;
        }
    }
}

localStorage.setItem("viagens", JSON.stringify(viagens));

mostrarViagens();
formulario.reset();
idEmEdicao = null;
document.querySelector('#cadastro button[type="submit"]').textContent = "Cadastrar viagem";

});

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

        const codigoPais = codigosPaises[campoPais.value.toLowerCase()];

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
});


function mostrarViagens() {
    const secao = document.querySelector("#viagens");
    const artigos = secao.querySelectorAll("article");

    for (const artigo of artigos) {
        artigo.remove();
    }

    for (const viagem of viagens) {
        const artigo = document.createElement("article");

        const titulo = document.createElement("h3");
        titulo.textContent = viagem.destino + ", " + viagem.pais;
        artigo.appendChild(titulo);

        const dados = [
            "Data de ida: " + viagem.dataIda,
            "Data de volta: " + viagem.dataVolta,
            "Orçamento: R$ " + viagem.orcamento.toFixed(2),
            "Status: " + viagem.status
        ];

        for (const dado of dados) {
            const paragrafo = document.createElement("p");
            paragrafo.textContent = dado;
            artigo.appendChild(paragrafo);
        }
        
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

    document.querySelector('#cadastro button[type="submit"]').textContent = "Salvar alterações";

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

mostrarViagens();
