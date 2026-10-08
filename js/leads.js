(function () {
  "use strict";

  var FONTE_PADRAO = "data/leads.json";
  var COR_STATUS = { Qualificado: "c-accent", Quente: "c-warning", Morno: "c-violet", Frio: "c-info" };

  var estado = { leads: [], busca: "", status: "todos", uf: "" };
  var el = {};

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // sem acento e em minúsculas, pra "sao" achar "São"
  function normalizar(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function soDigitos(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }

  // ?fonte=data/nao-existe.json força o estado de erro (só aceita data/<nome>.json)
  function fonteDaUrl() {
    var f = new URLSearchParams(location.search).get("fonte");
    return f && /^data\/[\w-]+\.json$/.test(f) ? f : FONTE_PADRAO;
  }

  function mostrar(qual) {
    el.carregando.hidden = qual !== "carregando";
    el.erro.hidden = qual !== "erro";
    el.conteudo.hidden = qual !== "lista";
  }

  function carregar() {
    mostrar("carregando");
    el.contador.textContent = "";
    fetch(fonteDaUrl(), { cache: "no-store" })
      .then(function (res) {
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
      .catch(mostrarErro);
  }

  function mostrarErro(e) {
    var rede = e instanceof TypeError; // fetch rejeita com TypeError quando nem chega a ter resposta
    el.erroMsg.textContent = rede ? "Falha de rede ao buscar o arquivo de dados." : e.message;
    if (location.protocol === "file:") {
      el.erroDica.innerHTML = "A página foi aberta direto do disco (<code>file://</code>) e o navegador bloqueia a leitura do JSON. " +
        "Rode um servidor local na pasta do projeto: <code>npx http-server -p 8080 -c-1 .</code>";
      el.erroDica.hidden = false;
    } else {
      el.erroDica.hidden = true;
    }
    mostrar("erro");
    console.error("[leads] falha ao carregar", e);
  }

  function montarFiltroUf() {
    var ufs = {};
    estado.leads.forEach(function (l) { if (l.uf) ufs[l.uf] = true; });
    el.filtroUf.innerHTML = '<option value="">Todas as UFs</option>' +
      Object.keys(ufs).sort().map(function (uf) {
        return '<option value="' + esc(uf) + '">' + esc(uf) + '</option>';
      }).join("");
    el.filtroUf.value = estado.uf;
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
    return '<div class="lead">' +
      '<div class="lead__avatar">' + esc(iniciais(l.empresa)) + '</div>' +
      '<div>' +
        '<div class="lead__nome">' + esc(l.empresa) + '</div>' +
        '<div class="lead__sub"><span class="lead__cnpj">' + esc(l.cnpj) + '</span> · ' + esc(l.cidade) + '/' + esc(l.uf) + '</div>' +
      '</div>' +
      '<div class="lead__seg">' + esc(l.segmento) + '</div>' +
      '<div class="lead__valor">' + esc(valor) + '</div>' +
      '<span class="badge ' + (COR_STATUS[l.status] || "c-info") + '">' + esc(l.status) + '</span>' +
    '</div>';
  }

  function renderizar() {
    var lista = filtrar();
    el.contador.textContent = lista.length + " de " + estado.leads.length + " leads";
    el.lista.innerHTML = lista.map(linhaLead).join("");
    el.lista.hidden = lista.length === 0;
    el.vazio.hidden = lista.length !== 0;
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

    carregar();
  });
}());
