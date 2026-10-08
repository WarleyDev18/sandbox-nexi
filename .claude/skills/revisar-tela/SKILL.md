---
name: revisar-tela
description: Revisa uma tela HTML/CSS/JS pura do sandbox-nexi contra 4 regras — texto vindo de dado entra por textContent (nunca innerHTML), cor só por variável CSS, funciona no celular e erro de rede aparece na tela. Use quando o usuário pedir para "revisar a tela", "rodar o revisar-tela", "checar a tela X" ou antes de subir uma tela nova ou alterada para o GitHub.
---

# Revisar tela

Revisa **uma tela** (ex.: `leads.html` + o CSS e o JS que ela carrega) contra as 4 regras abaixo.
Para cada regra: rodar a checagem, anotar o resultado, corrigir o que falhar e checar de novo.
No fim, entregar o relatório no formato da última seção.

Antes de começar, descobrir os arquivos da tela: os `<link rel="stylesheet">` e `<script src>`
do HTML, e os arquivos de dados que o JS busca com `fetch`.

## Regra 1 — Texto com `textContent`

Todo texto que vem de dado (JSON, URL, input, mensagem de erro) entra no DOM por
`textContent` (ou `createElement` + `textContent`, `new Option(texto, valor)`, `setAttribute`).
**Nunca** por `innerHTML`, `outerHTML`, `insertAdjacentHTML` ou `document.write` — nem
"escapado" com uma função `esc()`, porque basta esquecer uma vez.

Checagem:

    grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write" <arquivos .js e .html>

- Zero ocorrências → passa.
- `innerHTML = ""` para limpar um container é aceito, mas prefira `replaceChildren()`.
- Qualquer outra ocorrência → falha. Reescrever montando os nós com `createElement` e
  `textContent`. Texto fixo com marcação (ex.: um `<code>`) vai no HTML da página,
  escondido com `hidden`, e o JS só mostra/esconde.

## Regra 2 — Cor só por variável

Cor literal (`#hex`, `rgb()`, `rgba()`, `hsl()`, nome de cor como `red`/`white`) só pode
existir **dentro do bloco `:root`** do CSS. Fora dele, toda cor é `var(--token)`.
Vale para CSS, atributos `style=""` no HTML e `.style.*` no JS. `currentColor`,
`transparent` e `inherit` são permitidos.

Checagem (CSS sem o `:root`, depois HTML e JS):

    awk '/^:root/{r=1} r&&/^}/{r=0;next} !r' <arquivo.css> | grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|:\s*(red|white|black|blue|green|gray|grey)\b"
    grep -nE "style=\"[^\"]*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()" <arquivo.html>
    grep -nE "\.style\.[a-zA-Z]*([cC]olor|[bB]ackground|[bB]order)|#[0-9a-fA-F]{6}\b|rgba?\(" <arquivo.js>

- Zero ocorrências → passa.
- Ocorrência → criar o token no `:root` (nome pelo papel, ex.: `--topbar-bg`) e usar `var()`.
  Se a tela tem os tokens duplicados em outro arquivo, manter os dois iguais.

## Regra 3 — Funciona no celular

1. Estático: o HTML tem `<meta name="viewport" content="width=device-width,initial-scale=1">`
   e o CSS tem pelo menos um `@media (max-width: ...)` que ajusta o layout.
2. Renderizado: abrir a tela por servidor local com largura de celular (375px) e checar
   que **não há rolagem horizontal** e que nada fica cortado.

   ⚠️ **Não confie em `--window-size=375,...` no Edge/Chrome headless do Windows.** A janela
   tem largura mínima (~500px): a página é desenhada mais larga e o screenshot sai *cortado*,
   parecendo que a tela quebra no celular quando não quebra (falso negativo real, 08/10/2026).
   Use a página de medição com `<iframe>` de 375px da seção "Medição" — ela dá o número e,
   com `--screenshot` numa janela larga (ex.: `--window-size=800,830`), a imagem certa.

Para medir a rolagem horizontal, ver a seção "Medição" abaixo.

- Passa se: viewport presente, há media query, a página cabe em 375px (`scrollWidth <= 375`)
  e o screenshot não mostra texto/botão cortado ou sobreposto.
- Margem lateral no celular: pelo menos 16px.

## Regra 4 — Erro de rede na tela

Toda leitura de dado (`fetch`) tem que terminar em **um de dois estados visíveis**: dados
na tela, ou uma caixa de erro na tela (com `role="alert"`) dizendo o que houve e com um
jeito de tentar de novo. Nunca: tela parada em "Carregando…", lista vazia no lugar do
erro, ou erro só no `console`.

Checagem de código — cada `fetch` precisa ter:
- `.catch(...)` (ou `try/catch` com `await`) que mostra o erro **na tela**;
- teste de `res.ok` (HTTP 404/500 não rejeita o `fetch` sozinho);
- tratamento de JSON inválido / formato inesperado, separado de "lista vazia";
- **tempo limite** (`AbortController` + `setTimeout`) — sem isso, servidor que não responde
  deixa a tela em "Carregando…" para sempre;
- botão "Tentar novamente".

Checagem de comportamento (servidor local rodando):
- arquivo inexistente (ex.: `?fonte=` apontando para um JSON que não existe) → caixa de erro com HTTP 404;
- página aberta por `file://` → caixa de erro de rede com dica de rodar servidor local;
- servidor fora do ar → caixa de erro de rede (pode testar parando o servidor e clicando em "Tentar novamente");
- servidor que **demora** mais que o tempo limite → caixa de erro "não respondeu".

⚠️ **O teste de tempo limite não funciona no navegador headless.** Com `--virtual-time-budget`
o relógio virtual para enquanto há requisição pendente; com `--timeout` os timers da página
não chegam a disparar. Nos dois casos a tela fica em "Carregando…" e parece bug, sem ser
(falso negativo real, 08/10/2026). Teste assim:
- um servidor local que segura o JSON por mais tempo que o limite (ex.: Python com
  `time.sleep(25)` no `do_GET` quando o caminho é o JSON), e
- rodar o **JS real da tela no Node** com um DOM mínimo falso (`document.getElementById`
  devolvendo objetos simples, `fetch` apontando para o servidor lento) e conferir, depois
  do limite, que o erro está visível e com a mensagem certa. Ou abrir num navegador normal
  e esperar.

## Medição de rolagem horizontal

Criar **temporariamente** na raiz do repo um `_medir.html` que carrega a tela num `<iframe>`
de 375px e escreve as medidas num `<pre id="medida">`:

    <!doctype html><meta charset="utf-8"><body style="margin:0">
    <iframe id="f" src="<tela>.html" style="width:375px;height:812px;border:0"></iframe>
    <script>
    document.getElementById("f").onload = function () {
      var f = this;
      setTimeout(function () {
        var d = f.contentDocument, w = f.contentWindow;
        var largos = [].filter.call(d.querySelectorAll("body *"), function (n) {
          var r = n.getBoundingClientRect(); return r.right > w.innerWidth + 0.5 && r.width > 0; })
          .slice(0, 5).map(function (n) { return n.tagName.toLowerCase() + "." + n.className; });
        var out = d.createElement("pre"); out.id = "medida";
        out.textContent = "innerWidth=" + w.innerWidth + " scrollWidth=" + d.documentElement.scrollWidth +
          " transbordam=" + JSON.stringify(largos);
        document.body.appendChild(out);
      }, 1500);
    };
    </script>

e ler com `--dump-dom "http://localhost:8080/_medir.html" | grep -o 'id="medida">[^<]*'`.
Passa se `scrollWidth <= innerWidth` e `transbordam=[]`. **Apagar o `_medir.html` no fim**
(é ferramenta de revisão, não parte da tela). Alternativa manual: DevTools (F12 → modo
dispositivo, 375px) e no console `document.documentElement.scrollWidth <= window.innerWidth`.

## Relatório

Entregar uma tabela, uma linha por regra:

| Regra | Resultado antes | O que foi corrigido | Resultado depois |
|---|---|---|---|
| 1. Texto com textContent | ❌ 3 usos de innerHTML (js/x.js:12, …) | trocado por createElement/textContent | ✅ |
| 2. Cor só por variável | … | … | … |
| 3. Funciona no celular | … | … | … |
| 4. Erro de rede na tela | … | … | … |

Citar arquivo e linha de cada falha. Se algo não pôde ser verificado (ex.: sem navegador
headless), dizer isso na linha — não marcar ✅ sem ter checado.
