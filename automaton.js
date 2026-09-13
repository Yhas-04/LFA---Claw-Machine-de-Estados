// Le o arquivo 1.jff (exportado do JFLAP)

let states = []; // {id, name, label, x, y, initial, final}
let transitions = []; // {from, to, read}
let currentStateId = null;

async function carregarAutomato(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error("nao foi possivel carregar " + url);
  }
  const texto = await resposta.text();
  lerXML(texto);
}

// le o XML do JFLAP e preenche states e transitions
function lerXML(texto) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(texto, "application/xml");

  states = [];
  transitions = [];

  const nosDeEstado = doc.querySelectorAll("automaton > state");
  nosDeEstado.forEach((no) => {
    const id = no.getAttribute("id");
    const name = no.getAttribute("name") || "q" + id;
    const xNo = no.querySelector("x");
    const yNo = no.querySelector("y");
    const labelNo = no.querySelector("label");
    const inicial = no.querySelector("initial") !== null;
    const final = no.querySelector("final") !== null;

    states.push({
      id: id,
      name: name,
      label: labelNo ? labelNo.textContent.trim() : "",
      x: xNo ? parseFloat(xNo.textContent) : 0,
      y: yNo ? parseFloat(yNo.textContent) : 0,
      initial: inicial,
      final: final,
    });

    if (inicial) currentStateId = id;
  });

  const nosDeTransicao = doc.querySelectorAll("automaton > transition");
  nosDeTransicao.forEach((no) => {
    const from = no.querySelector("from").textContent.trim();
    const to = no.querySelector("to").textContent.trim();
    const readNo = no.querySelector("read");
    const read = readNo ? readNo.textContent.trim() : "";
    transitions.push({ from: from, to: to, read: read });
  });
}

function buscarEstado(id) {
  return states.find((s) => s.id === id);
}

function estadoAtual() {
  return buscarEstado(currentStateId);
}

function ehFinal(id = currentStateId) {
  const estado = buscarEstado(id);
  return estado ? estado.final : false;
}

// quais fichas sao aceitas a partir de um estado (default: estado atual)
function fichasAceitas(id = currentStateId) {
  return transitions.filter((t) => t.from === id).map((t) => t.read);
}

function buscarTransicao(id, ficha) {
  return transitions.find((t) => t.from === id && t.read === String(ficha));
}

// tenta inserir uma ficha a partir do estado atual.
// retorna true se aceitou (e ja troca de estado), false se recusou.
function inserirFicha(ficha) {
  const transicao = buscarTransicao(currentStateId, ficha);
  if (!transicao) return false;

  currentStateId = transicao.to;
  return true;
}

// volta pro estado inicial do .jff
function reiniciarAutomato() {
  const inicial = states.find((s) => s.initial);
  currentStateId = inicial.id;
}
