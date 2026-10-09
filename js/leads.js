(function () {
  "use strict";

  var FONTE_PADRAO = "data/leads.json";
  var TEMPO_LIMITE_MS = 10000;
  var COR_STATUS = { Qualificado: "c-accent", Quente: "c-warning", Morno: "c-violet", Frio: "c-info" };
  var STATUS_VALIDOS = ["todos", "Qualificado", "Quente", "Morno", "Frio"];

  var estado = { leads: [], busca: "", status: "todos", uf: "" };
  var el = {};

  // cria um elemento com classe e texto — texto sempre por textContent, nunca innerHTML
  function criar(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = String(texto);
    return n;
  }

  // sem acento e em minúsculas, pra "sao" achar "São"
  function normalizar(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function soDigitos(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }

  // ?fonte=data/nao-existe.json força o estado de erro (só aceita data/<nome>.json)
  function fonteDaUrl() {
    var f = new URLSearchParams(location.search).get("fonte");
    return f && /^data\/[\w-]+\.json$/.test(f) ? f : FONTE_PADRAO;
  }

  // Filtros na URL (?q=&status=&uf=): o link filtrado pode ser compartilhado e sobrevive ao recarregar.
  // Valor desconhecido na URL é ignorado, nunca quebra a tela.
  function lerFiltrosDaUrl() {
    var p = new URLSearchParams(location.search);
    estado.busca = (p.get("q") || "").slice(0, 100);
    var status = p.get("status");
    estado.status = STATUS_VALIDOS.indexOf(status) !== -1 ? status : "todos";
    var uf = (p.get("uf") || "").toUpperCase();
    estado.uf = /^[A-Z]{2}$/.test(uf) ? uf : ""; // se a UF não existir nos dados, montarFiltroUf zera
  }

  // replaceState, não pushState: digitar na busca não enche o histórico do "voltar".
  // Preserva os outros parâmetros (ex.: ?fonte=).
  function gravarFiltrosNaUrl() {
    var p = new URLSearchParams(location.search);
    var q = estado.busca.trim();
    if (q) p.set("q", q); else p.delete("q");
    if (estado.status !== "todos") p.set("status", estado.status); else p.delete("status");
    if (estado.uf) p.set("uf", estado.uf); else p.delete("uf");
    var busca = p.toString();
    var nova = location.pathname + (busca ? "?" + busca : "") + location.hash;
    if (nova !== location.pathname + location.search + location.hash) history.replaceState(null, "", nova);
  }

  function mostrar(qual) {
    el.carregando.hidden = qual !== "carregando";
    el.erro.hidden = qual !== "erro";
    el.conteudo.hidden = qual !== "lista";
  }

  function carregar() {
    mostrar("carregando");
    el.contador.textContent = "";
    // sem tempo limite, um servidor que não responde deixaria a tela em "Carregando…" para sempre
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TEMPO_LIMITE_MS);
    fetch(fonteDaUrl(), { cache: "no-store", signal: ctrl.signal })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error("O arquivo de dados respondeu HTTP " + res.status + " (" + (res.statusText || "erro") + ").");
        return res.json().catch(function () {
          throw new Error("O arquivo de dados não é um JSON válido.");
        });
      })
      .then(function (dados) {
        if (!Array.isArray(dados)) throw new Error("Formato inesperado: o JSON deveria ser uma lista de leads.");
        estado.leads = dados;
        montarFiltroUf();
        contarStatus();
        mostrar("lista");
        renderizar();
      })
      .catch(function (e) {
        clearTimeout(timer);
        mostrarErro(e);
      });
  }

  function mostrarErro(e) {
    var msg;
    if (e && e.name === "AbortError") {
      msg = "O servidor não respondeu em " + (TEMPO_LIMITE_MS / 1000) + " segundos.";
    } else if (e instanceof TypeError) { // fetch rejeita com TypeError quando nem chega a ter resposta
      msg = navigator.onLine === false ? "Sem conexão com a internet." : "Falha de rede ao buscar o arquivo de dados.";
    } else {
      msg = e.message;
    }
    el.erroMsg.textContent = msg;
    el.erroDica.hidden = location.protocol !== "file:"; // a dica (texto fixo) mora no HTML
    mostrar("erro");
    console.error("[leads] falha ao carregar", e);
  }

  function montarFiltroUf() {
    var ufs = {};
    estado.leads.forEach(function (l) { if (l.uf) ufs[l.uf] = true; });
    var opcoes = [new Option("Todas as UFs", "")].concat(Object.keys(ufs).sort().map(function (uf) {
      return new Option(uf, uf);
    }));
    el.filtroUf.replaceChildren.apply(el.filtroUf, opcoes);
    el.filtroUf.value = estado.uf;
    if (el.filtroUf.value !== estado.uf) estado.uf = ""; // UF da URL que não existe nos dados
  }

  function contarStatus() {
    var n = { todos: estado.leads.length };
    estado.leads.forEach(function (l) { n[l.status] = (n[l.status] || 0) + 1; });
    el.filtroStatus.querySelectorAll(".chip").forEach(function (chip) {
      chip.querySelector(".chip__n").textContent = n[chip.dataset.status] || 0;
    });
  }

  function filtrar() {
    var q = normalizar(estado.busca.trim());
    var qd = soDigitos(estado.busca);
    return estado.leads.filter(function (l) {
      if (estado.status !== "todos" && l.status !== estado.status) return false;
      if (estado.uf && l.uf !== estado.uf) return false;
      if (!q) return true;
      var texto = normalizar([l.empresa, l.cidade, l.segmento].join(" "));
      return texto.indexOf(q) !== -1 || (qd.length >= 3 && soDigitos(l.cnpj).indexOf(qd) !== -1);
    });
  }

  function iniciais(nome) {
    return String(nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase();
  }

  function linhaLead(l) {
    var valor = typeof l.valor_estimado === "number"
      ? l.valor_estimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : "—";
    var linha = criar("div", "lead");

    var info = criar("div");
    var sub = criar("div", "lead__sub");
    sub.append(criar("span", "lead__cnpj", l.cnpj), " · " + l.cidade + "/" + l.uf);
    info.append(criar("div", "lead__nome", l.empresa), sub);

    linha.append(
      criar("div", "lead__avatar", iniciais(l.empresa)),
      info,
      criar("div", "lead__seg", l.segmento),
      criar("div", "lead__valor", valor),
      criar("span", "badge " + (COR_STATUS[l.status] || "c-info"), l.status)
    );
    return linha;
  }

  function renderizar() {
    var lista = filtrar();
    el.contador.textContent = lista.length + " de " + estado.leads.length + " leads";
    el.lista.replaceChildren.apply(el.lista, lista.map(linhaLead));
    el.lista.hidden = lista.length === 0;
    el.vazio.hidden = lista.length !== 0;
    gravarFiltrosNaUrl();
  }

  function limparFiltros() {
    estado.busca = ""; estado.status = "todos"; estado.uf = "";
    el.busca.value = ""; el.filtroUf.value = "";
    marcarChip("todos");
    renderizar();
  }

  function marcarChip(status) {
    el.filtroStatus.querySelectorAll(".chip").forEach(function (chip) {
      chip.classList.toggle("chip--ativo", chip.dataset.status === status);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["busca", "filtroUf", "filtroStatus", "contador", "carregando", "erro", "erroMsg", "erroDica",
     "btnTentar", "conteudo", "lista", "vazio", "btnLimpar"].forEach(function (id) {
      el[id] = document.getElementById(id);
    });

    el.busca.addEventListener("input", function () { estado.busca = el.busca.value; renderizar(); });
    el.filtroUf.addEventListener("change", function () { estado.uf = el.filtroUf.value; renderizar(); });
    el.filtroStatus.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      estado.status = chip.dataset.status;
      marcarChip(estado.status);
      renderizar();
    });
    el.btnTentar.addEventListener("click", carregar);
    el.btnLimpar.addEventListener("click", limparFiltros);

    lerFiltrosDaUrl();
    el.busca.value = estado.busca;
    marcarChip(estado.status);
    carregar();
  });
}());
