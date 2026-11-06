
"use strict";

const parametros = new URLSearchParams(window.location.search);
const id = Number(parametros.get("id"));
const viagens = JSON.parse(localStorage.getItem("viagens")) || [];
const viagem = viagens.find(item => item.id === id);
const principal = document.querySelector("main");

if (!viagem) {
    principal.textContent = "Viagem não encontrada.";
} else {
    viagem.roteiro = viagem.roteiro || [];

    const secoes = principal.querySelectorAll("section");
    const secaoDetalhes = secoes[0];
    const secaoRoteiro = secoes[1];

    const nomesStatus = {
        planejamento: "Em planejamento",
        confirmada: "Confirmada",
        andamento: "Em andamento",
        concluida: "Concluída",
        cancelada: "Cancelada"
    };

    function moeda(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function dataBR(data) {
        return String(data).split("-").reverse().join("/");
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function salvar() {
        localStorage.setItem("viagens", JSON.stringify(viagens));
    }

    function criarElemento(tag, texto, classe) {
        const elemento = document.createElement(tag);

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        if (classe) {
            elemento.className = classe;
        }

        return elemento;
    }

    async function consultar(url, limite = 10000) {
        const controlador = new AbortController();

        const temporizador = setTimeout(function() {
            controlador.abort();
        }, limite);

        try {
            const resposta = await fetch(url, {
                signal: controlador.signal
            });

            if (!resposta.ok) {
                throw new Error("HTTP " + resposta.status);
            }

            return await resposta.json();
        } finally {
            clearTimeout(temporizador);
        }
    }

    const titulo = secaoDetalhes.querySelector("h2");
    const paragrafos = secaoDetalhes.querySelectorAll("p");

    titulo.textContent = viagem.destino + ", " + viagem.pais;

    const informacoes = [
        ["Data de ida", dataBR(viagem.dataIda)],
        ["Data de volta", dataBR(viagem.dataVolta)],
        ["Orçamento", moeda(viagem.orcamento)],
        ["Status", nomesStatus[viagem.status] || viagem.status]
    ];

    for (let i = 0; i < informacoes.length; i++) {
        const forte = criarElemento("strong", informacoes[i][0] + ": ");

        if (paragrafos[i]) {
            paragrafos[i].replaceChildren(
                forte,
                document.createTextNode(informacoes[i][1])
            );
        }
    }

    if (paragrafos[4]) {
        paragrafos[4].textContent = viagem.descricao || "Sem descrição.";
    }

    const capa = criarElemento("figure", undefined, "capa-viagem");
    const imagemCapa = document.createElement("img");

    imagemCapa.alt = "Fotografia de " + viagem.destino;
    imagemCapa.hidden = true;

    const conteudoCapa = criarElemento(
        "figcaption",
        undefined,
        "capa-conteudo"
    );

    conteudoCapa.appendChild(
        criarElemento("h2", viagem.destino + ", " + viagem.pais)
    );

    conteudoCapa.appendChild(
        criarElemento("p", "Descubra atrações e organize sua viagem.")
    );

    const creditoFoto = criarElemento(
        "a",
        "Fotografia e informações de licença",
        "credito-capa"
    );

    creditoFoto.hidden = true;
    creditoFoto.target = "_blank";
    creditoFoto.rel = "noopener noreferrer";

    capa.appendChild(imagemCapa);
    capa.appendChild(conteudoCapa);
    capa.appendChild(creditoFoto);

    principal.insertBefore(capa, secaoDetalhes);

    imagemCapa.onerror = function() {
        imagemCapa.hidden = true;
        imagemCapa.removeAttribute("src");
        creditoFoto.hidden = true;
    };

    async function carregarFoto() {
        const endereco = "https://en.wikipedia.org/w/api.php"
            + "?action=query&format=json&formatversion=2"
            + "&redirects=1&prop=pageimages"
            + "&piprop=thumbnail%7Cname"
            + "&pithumbsize=1400"
            + "&titles=" + encodeURIComponent(viagem.destino)
            + "&origin=*";

        try {
            const dados = await consultar(endereco, 8000);
            const paginas = dados.query ? dados.query.pages || [] : [];
            const pagina = paginas.find(item => item.thumbnail);

            if (!pagina) {
                return;
            }

            imagemCapa.src = pagina.thumbnail.source;
            imagemCapa.hidden = false;

            if (pagina.pageimage) {
                creditoFoto.href =
                    "https://commons.wikimedia.org/wiki/File:"
                    + encodeURIComponent(
                        pagina.pageimage.replaceAll(" ", "_")
                    );

                creditoFoto.hidden = false;
            }
        } catch (erro) {
            console.warn("Imagem indisponível:", erro.message);
        }
    }

    carregarFoto();

    const artigosAntigos = secaoRoteiro.querySelectorAll("article");

    for (const artigo of artigosAntigos) {
        artigo.remove();
    }

    for (const paragrafo of secaoRoteiro.querySelectorAll("p")) {
        paragrafo.remove();
    }

    const conteudoRoteiro = criarElemento("div");
    secaoRoteiro.appendChild(conteudoRoteiro);

    let listaAtracoes = null;

    function atualizarBotoes() {
        if (!listaAtracoes) {
            return;
        }

        for (const artigo of listaAtracoes.querySelectorAll("article")) {
            const nome = artigo.querySelector("h3").textContent;
            const botao = artigo.querySelector(".botao-adicionar-atracao");

            const existe = viagem.roteiro.some(item =>
                normalizar(item.nome) === normalizar(nome)
            );

            if (botao) {
                botao.disabled = existe;
                botao.textContent = existe
                    ? "Já está no roteiro"
                    : "Adicionar ao roteiro";
            }
        }
    }

    function atualizarRoteiro() {
        conteudoRoteiro.replaceChildren();

        let planejado = 0;

        for (const atividade of viagem.roteiro) {
            planejado += Number(atividade.custo);
        }

        const resumo = criarElemento(
            "div",
            undefined,
            "resumo-financeiro"
        );

        const valores = [
            ["Orçamento total", Number(viagem.orcamento)],
            ["Valor planejado", planejado],
            ["Saldo disponível", Number(viagem.orcamento) - planejado]
        ];

        for (const valor of valores) {
            const card = criarElemento("div");

            card.appendChild(criarElemento("strong", valor[0]));
            card.appendChild(criarElemento("p", moeda(valor[1])));

            resumo.appendChild(card);
        }

        conteudoRoteiro.appendChild(resumo);

        if (viagem.roteiro.length === 0) {
            conteudoRoteiro.appendChild(
                criarElemento("p", "Nenhum passeio adicionado ao roteiro.")
            );
        }

        const atividades = viagem.roteiro.slice();

        atividades.sort(function(a, b) {
            return a.data.localeCompare(b.data);
        });

        let diaAnterior = "";

        for (const atividade of atividades) {
            if (atividade.data !== diaAnterior) {
                conteudoRoteiro.appendChild(
                    criarElemento(
                        "h3",
                        "Dia " + dataBR(atividade.data),
                        "dia-roteiro"
                    )
                );

                diaAnterior = atividade.data;
            }

            const artigo = criarElemento("article");

            artigo.appendChild(criarElemento("h3", atividade.nome));

            artigo.appendChild(
                criarElemento(
                    "p",
                    (atividade.categoria || "Passeio")
                    + " · " + dataBR(atividade.data)
                    + " · " + moeda(atividade.custo)
                )
            );

            const remover = criarElemento(
                "button",
                "Remover atividade",
                "remover-atividade"
            );

            remover.type = "button";

            remover.addEventListener("click", function() {
                if (!confirm("Deseja remover esta atividade?")) {
                    return;
                }

                viagem.roteiro = viagem.roteiro.filter(
                    item => item !== atividade
                );

                salvar();
                atualizarRoteiro();
                atualizarBotoes();
            });

            artigo.appendChild(remover);
            conteudoRoteiro.appendChild(artigo);
        }
    }

    function adicionarAtividade(nome, categoria, data, custo, mensagem) {
        mensagem.textContent = "";

        if (!nome.trim() || !data || !Number.isFinite(custo) || custo < 0) {
            mensagem.textContent = "Preencha todos os dados corretamente.";
            return false;
        }

        if (data < viagem.dataIda || data > viagem.dataVolta) {
            mensagem.textContent =
                "A data deve estar dentro do período da viagem.";
            return false;
        }

        const existe = viagem.roteiro.some(function(item) {
            return normalizar(item.nome) === normalizar(nome)
                && item.data === data;
        });

        if (existe) {
            mensagem.textContent = "Este passeio já existe nessa data.";
            return false;
        }

        let planejado = 0;

        for (const atividade of viagem.roteiro) {
            planejado += Number(atividade.custo);
        }

        if (planejado + custo > Number(viagem.orcamento) + 0.001) {
            mensagem.textContent =
                "O custo ultrapassa o orçamento disponível.";
            return false;
        }

        viagem.roteiro.push({
            nome: nome.trim(),
            categoria: categoria,
            data: data,
            custo: custo
        });

        salvar();
        atualizarRoteiro();
        atualizarBotoes();

        return true;
    }

    const secaoManual = criarElemento(
        "section",
        undefined,
        "secao-atividade-manual"
    );

    secaoManual.appendChild(
        criarElemento("h2", "Adicionar passeio manualmente")
    );

    secaoManual.appendChild(
        criarElemento(
            "p",
            "Cadastre atrações, restaurantes e passeios mesmo sem a busca automática."
        )
    );

    const formularioManual = document.createElement("form");
    formularioManual.className = "form-passeio-manual";

    formularioManual.innerHTML = `
        <label>Nome do passeio
            <input name="nome" type="text" required placeholder="Nome da atividade">
        </label>
        <label>Categoria
            <select name="categoria">
                <option>Ponto turístico</option>
                <option>Restaurante</option>
                <option>Museu</option>
                <option>Mirante</option>
                <option>Parque temático</option>
                <option>Monumento</option>
                <option>Parque</option>
                <option>Hotel e cassino</option>
                <option>Outro</option>
            </select>
        </label>
        <label>Data da visita
            <input name="data" type="date" required>
        </label>
        <label>Custo estimado (R$)
            <input name="custo" type="number" min="0" step="0.01" value="0" required>
        </label>
        <p class="mensagem-passeio" role="status"></p>
        <button type="submit">Adicionar ao roteiro</button>
    `;

    secaoManual.appendChild(formularioManual);
    principal.appendChild(secaoManual);

    const dataManual = formularioManual.elements.data;

    dataManual.min = viagem.dataIda;
    dataManual.max = viagem.dataVolta;
    dataManual.value = viagem.dataIda;

    formularioManual.addEventListener("submit", function(evento) {
        evento.preventDefault();

        const mensagem = formularioManual.querySelector(".mensagem-passeio");
        const custoTexto = formularioManual.elements.custo.value;

        if (custoTexto.trim() === "") {
            mensagem.textContent = "Informe o custo estimado.";
            return;
        }

        const sucesso = adicionarAtividade(
            formularioManual.elements.nome.value,
            formularioManual.elements.categoria.value,
            dataManual.value,
            Number(custoTexto),
            mensagem
        );

        if (sucesso) {
            formularioManual.reset();
            dataManual.value = viagem.dataIda;
            mensagem.textContent = "Passeio adicionado com sucesso.";
        }
    });

    const secaoAtracoes = criarElemento(
        "section",
        undefined,
        "secao-atracoes"
    );

    secaoAtracoes.appendChild(
        criarElemento("h2", "Pontos turísticos de " + viagem.destino)
    );

    const mensagemAtracoes = criarElemento(
        "p",
        "Buscando atrações...",
        "mensagem-atracoes"
    );

    mensagemAtracoes.setAttribute("role", "status");

    const botaoBuscar = criarElemento(
        "button",
        "Atualizar atrações",
        "atualizar-atracoes"
    );

    botaoBuscar.type = "button";

    listaAtracoes = criarElemento("div", undefined, "lista-atracoes");

    secaoAtracoes.appendChild(mensagemAtracoes);
    secaoAtracoes.appendChild(botaoBuscar);
    secaoAtracoes.appendChild(listaAtracoes);

    secaoAtracoes.appendChild(
        criarElemento(
            "p",
            "Preços não informados devem ser preenchidos pelo usuário. O valor zero inicial não significa entrada gratuita.",
            "nota-precos"
        )
    );

    const creditos = criarElemento(
        "a",
        "Dados: OpenStreetMap contributors"
    );

    creditos.href = "https://www.openstreetmap.org/copyright";
    creditos.target = "_blank";
    creditos.rel = "noopener noreferrer";

    secaoAtracoes.appendChild(creditos);
    principal.appendChild(secaoAtracoes);

    function identificarCategoria(titulo, descricao) {
        const texto = normalizar(titulo + " " + descricao);

        const categorias = [
            ["Museu", /\bmuseum\b|\bmuseu\b/],
            ["Parque temático", /theme park|amusement park|parque tematico/],
            ["Mirante", /observation deck|viewpoint|mirante|observation wheel/],
            ["Monumento", /monument|memorial|monumento|statue|estatua/],
            ["Galeria", /art gallery|galeria de arte/],
            ["Aquário", /aquarium|aquario/],
            ["Zoológico", /\bzoo\b|zoologico/],
            ["Hotel e cassino", /casino|resort/],
            ["Parque", /\bpark\b|\bparque\b|garden|jardim/],
            ["Igreja histórica", /historic church|historic cathedral|historic chapel/],
            ["Ponto turístico", /tourist attraction|landmark|fountain|fremont street|las vegas strip|historic building|historic site/]
        ];

        for (const categoria of categorias) {
            if (categoria[1].test(texto)) {
                return categoria[0];
            }
        }

        return null;
    }

    function precoSugerido(categoria, tags = {}) {
        if (String(tags.fee).toLowerCase() === "no") {
            return {
                valor: 0,
                descricao: "Entrada cadastrada como gratuita. Confirme."
            };
        }

        const tarifa = String(tags.charge || tags["fee:amount"] || "");

        const encontrado = tarifa.match(
            /(?:R\$|BRL)\s*(\d+(?:[.,]\d{1,2})?)/i
        ) || tarifa.match(
            /^(\d+(?:[.,]\d{1,2})?)\s*(?:BRL|R\$)/i
        );

        if (encontrado) {
            const valor = Number(encontrado[1].replace(",", "."));

            if (Number.isFinite(valor)) {
                return {
                    valor: valor,
                    descricao: "Tarifa cadastrada: " + moeda(valor)
                        + ". Confirme o valor antes de viajar."
                };
            }
        }

        if (tarifa) {
            return {
                valor: 0,
                descricao: "Tarifa informada na fonte: " + tarifa
                    + ". Informe o custo em reais."
            };
        }

        return {
            valor: 0,
            descricao: "Preço não informado. Defina o custo ao planejar."
        };
    }

    function mostrarAtracoes(atracoes, origem) {
        listaAtracoes.replaceChildren();

        let quantidade = 0;
        const nomes = [];

        for (const atracao of atracoes) {
            if (!atracao.nome || nomes.includes(normalizar(atracao.nome))) {
                continue;
            }

            nomes.push(normalizar(atracao.nome));

            const artigo = criarElemento(
                "article",
                undefined,
                "card-atracao"
            );

            artigo.appendChild(criarElemento("h3", atracao.nome));

            artigo.appendChild(
                criarElemento("p", "Categoria: " + atracao.categoria)
            );

            artigo.appendChild(
                criarElemento(
                    "p",
                    atracao.descricao || "Descrição não disponível em português.",
                    "descricao-atracao"
                )
            );

            const preco = precoSugerido(
                atracao.categoria,
                atracao.tags || {}
            );

            artigo.appendChild(
                criarElemento(
                    "p",
                    preco.descricao,
                    "informacao-preco"
                )
            );

            const botao = criarElemento(
                "button",
                "Adicionar ao roteiro",
                "botao-adicionar-atracao"
            );

            botao.type = "button";

            const formulario = document.createElement("form");
            formulario.className = "formulario-atracao";
            formulario.hidden = true;

            formulario.innerHTML = `
                <label>Data da visita
                    <input name="data" type="date" required>
                </label>
                <label>Custo previsto (R$)
                    <input name="custo" type="number" min="0" step="0.01" required>
                </label>
                <p class="mensagem-passeio" role="status"></p>
                <button type="submit">Confirmar passeio</button>
                <button type="button" class="cancelar">Cancelar</button>
            `;

            formulario.elements.data.min = viagem.dataIda;
            formulario.elements.data.max = viagem.dataVolta;
            formulario.elements.data.value = viagem.dataIda;
            formulario.elements.custo.value = String(preco.valor);

            botao.addEventListener("click", function() {
                formulario.hidden = !formulario.hidden;
            });

            formulario.querySelector(".cancelar").addEventListener(
                "click",
                function() {
                    formulario.hidden = true;
                }
            );

            formulario.addEventListener("submit", function(evento) {
                evento.preventDefault();

                const mensagem = formulario.querySelector(".mensagem-passeio");
                const textoCusto = formulario.elements.custo.value;

                if (textoCusto.trim() === "") {
                    mensagem.textContent = "Informe o custo.";
                    return;
                }

                const sucesso = adicionarAtividade(
                    atracao.nome,
                    atracao.categoria,
                    formulario.elements.data.value,
                    Number(textoCusto),
                    mensagem
                );

                if (sucesso) {
                    formulario.hidden = true;
                }
            });

            if (atracao.url) {
                const link = criarElemento(
                    "a",
                    origem === "Wikipédia"
                        ? "Conhecer o local na Wikipédia"
                        : "Site da atração"
                );

                link.href = atracao.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";

                artigo.appendChild(link);
            }

            artigo.appendChild(botao);
            artigo.appendChild(formulario);

            listaAtracoes.appendChild(artigo);

            quantidade++;

            if (quantidade === 15) {
                break;
            }
        }

        mensagemAtracoes.textContent = quantidade
            ? quantidade + " atrações sugeridas via " + origem
                + ". Confira as informações antes de adicionar."
            : "Nenhuma atração identificada. Cadastre seu passeio manualmente.";

        atualizarBotoes();
    }

    function converterOSM(elementos) {
        const categorias = {
            attraction: "Ponto turístico",
            museum: "Museu",
            viewpoint: "Mirante",
            gallery: "Galeria",
            theme_park: "Parque temático",
            zoo: "Zoológico",
            aquarium: "Aquário"
        };

        return elementos
            .filter(item => item.tags && item.tags.name)
            .map(function(item) {
                const tags = item.tags;
                const site = tags.website || tags["contact:website"];

                return {
                    nome: tags["name:pt"] || tags.name,
                    categoria: categorias[tags.tourism] || "Ponto turístico",
                    descricao: tags["description:pt"] ||
                        "Descrição não disponível em português.",
                    tags: tags,
                    url: /^https?:\/\//i.test(site || "") ? site : ""
                };
            });
    }

    async function buscarNoOpenStreetMap(latitude, longitude) {
        mensagemAtracoes.textContent =
            "Consultando pontos turísticos no OpenStreetMap...";

        const consulta = '[out:json][timeout:12];'
            + 'nwr(around:4000,'
            + latitude + ',' + longitude
            + ')["tourism"~"^(attraction|museum|viewpoint|gallery|theme_park|zoo|aquarium)$"]["name"];'
            + 'out center 30;';

        const url = "https://overpass-api.de/api/interpreter?data="
            + encodeURIComponent(consulta);

        const dados = await consultar(url, 9000);

        return converterOSM(dados.elements || []);
    }

    async function buscarNaWikipedia(latitude, longitude) {
        mensagemAtracoes.textContent =
            "Buscando atrações turísticas na Wikipédia...";

        const urlGeo = "https://en.wikipedia.org/w/api.php"
            + "?action=query&format=json&list=geosearch"
            + "&gscoord=" + encodeURIComponent(latitude + "|" + longitude)
            + "&gsradius=10000&gslimit=50&origin=*";

        const dadosGeo = await consultar(urlGeo, 12000);

        const locais = dadosGeo.query
            ? dadosGeo.query.geosearch || []
            : [];

        const ignorar = [
            "timeline",
            "archdiocese",
            "fire & rescue",
            "post office",
            "courthouse",
            "city hall",
            "school district",
            "police department",
            "list of",
            "history of"
        ];

        const candidatos = [];

        for (let i = 0; i < locais.length; i += 15) {
            const grupo = locais.slice(i, i + 15);
            const ids = grupo.map(item => item.pageid).join("|");

            const urlDetalhes = "https://en.wikipedia.org/w/api.php"
                + "?action=query&format=json&formatversion=2"
                + "&prop=extracts%7Clanglinks"
                + "&exintro=1&explaintext=1&exchars=450"
                + "&lllang=pt"
                + "&pageids=" + encodeURIComponent(ids)
                + "&origin=*";

            let paginas = [];

            try {
                const dados = await consultar(urlDetalhes, 10000);

                paginas = dados.query
                    ? dados.query.pages || []
                    : [];
            } catch (erro) {
                console.warn("Falha ao consultar um grupo:", erro.message);
                continue;
            }

            for (const pagina of paginas) {
                const titulo = pagina.title || "";
                const descricao = pagina.extract || "";
                const texto = normalizar(titulo);

                const ignorado = ignorar.some(function(termo) {
                    return texto.includes(normalizar(termo));
                });

                if (ignorado || texto === normalizar(viagem.destino)) {
                    continue;
                }

                const categoria = identificarCategoria(titulo, descricao);

                if (!categoria) {
                    continue;
                }

                const traducao = (pagina.langlinks || []).find(
                    item => item.lang === "pt"
                );

                const tituloPt = traducao
                    ? traducao.title || traducao["*"] || ""
                    : "";

                candidatos.push({
                    nome: tituloPt || titulo,
                    tituloPortugues: tituloPt,
                    categoria: categoria,
                    descricao: "Descrição não disponível em português.",
                    tags: {},
                    url: tituloPt
                        ? "https://pt.wikipedia.org/wiki/"
                            + encodeURIComponent(tituloPt.replaceAll(" ", "_"))
                        : "https://en.wikipedia.org/?curid=" + pagina.pageid
                });
            }
        }

        const comTraducao = candidatos.filter(
            item => item.tituloPortugues
        );

        for (let i = 0; i < comTraducao.length; i += 15) {
            const grupo = comTraducao.slice(i, i + 15);

            const titulos = grupo
                .map(item => item.tituloPortugues)
                .join("|");

            const urlPt = "https://pt.wikipedia.org/w/api.php"
                + "?action=query&format=json&formatversion=2"
                + "&redirects=1&prop=extracts"
                + "&exintro=1&explaintext=1&exchars=350"
                + "&titles=" + encodeURIComponent(titulos)
                + "&origin=*";

            try {
                const dados = await consultar(urlPt, 10000);

                const paginas = dados.query
                    ? dados.query.pages || []
                    : [];

                for (const candidato of grupo) {
                    const pagina = paginas.find(item =>
                        normalizar(item.title) ===
                        normalizar(candidato.tituloPortugues)
                    );

                    if (pagina && pagina.extract) {
                        candidato.descricao = pagina.extract;
                    }
                }
            } catch (erro) {
                console.warn(
                    "Traduções indisponíveis:",
                    erro.message
                );
            }
        }

        return candidatos;
    }

    async function buscarAtracoes() {
        botaoBuscar.disabled = true;
        listaAtracoes.replaceChildren();

        try {
            mensagemAtracoes.textContent = "Localizando o destino...";

            const nomesPaises = new Intl.DisplayNames(["pt-BR"], {
                type: "region"
            });

            const urlCidade =
                "https://geocoding-api.open-meteo.com/v1/search?name="
                + encodeURIComponent(viagem.destino)
                + "&count=100&language=pt&format=json";

            const dadosCidade = await consultar(urlCidade, 10000);

            const cidades = (dadosCidade.results || []).filter(
                function(item) {
                    return normalizar(item.name) === normalizar(viagem.destino)
                        && normalizar(nomesPaises.of(item.country_code))
                        === normalizar(viagem.pais);
                }
            );

            cidades.sort(function(a, b) {
                return (b.population || 0) - (a.population || 0);
            });

            if (cidades.length === 0) {
                throw new Error("Cidade não encontrada.");
            }

            const cidade = cidades[0];

            let atracoes = [];
            let origem = "OpenStreetMap";

            try {
                atracoes = await buscarNoOpenStreetMap(
                    cidade.latitude,
                    cidade.longitude
                );
            } catch (erro) {
                console.warn(
                    "OpenStreetMap indisponível:",
                    erro.message
                );
            }

            if (atracoes.length === 0) {
                origem = "Wikipédia";

                atracoes = await buscarNaWikipedia(
                    cidade.latitude,
                    cidade.longitude
                );
            }

            mostrarAtracoes(atracoes, origem);

        } catch (erro) {
            console.error("Erro na busca:", erro);

            mensagemAtracoes.textContent =
                "Não foi possível buscar atrações agora. "
                + "Você pode cadastrar passeios manualmente.";
        } finally {
            botaoBuscar.disabled = false;
        }
    }

    botaoBuscar.addEventListener("click", buscarAtracoes);

    atualizarRoteiro();
    buscarAtracoes();
}
