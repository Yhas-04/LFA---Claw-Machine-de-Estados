// Desenha o diagrama da maquina de estados

const RAIO = 34;
const LARGURA_SVG = 920;
const ALTURA_SVG = 640;
const MARGEM = 90;

let posicoes = {}; // id do estado -> {x, y} na tela
let elementosNo = {}; // id do estado -> elemento <g> do SVG
let elementosAresta = {}; // "from->to" -> {path, label}
let svgAtual = null;
let garraAnimFrame = null;

function criarSVG(tag, atributos = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const chave in atributos) {
    el.setAttribute(chave, atributos[chave]);
  }
  return el;
}

// calcula onde cada estado vai ficar na tela, a partir das coordenadas

function calcularPosicoes() {
  const xs = states.map((s) => s.x);
  const ys = states.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const largura = Math.max(maxX - minX, 1);
  const altura = Math.max(maxY - minY, 1);
  const areaLargura = LARGURA_SVG - MARGEM * 2;
  const areaAltura = ALTURA_SVG - MARGEM * 2;

  posicoes = {};
  states.forEach((s) => {
    posicoes[s.id] = {
      x: MARGEM + ((s.x - minX) / largura) * areaLargura,
      y: MARGEM + ((s.y - minY) / altura) * areaAltura,
    };
  });
}

function desenharDiagrama(container) {
  calcularPosicoes();

  const svg = criarSVG("svg", {
    viewBox: `0 0 ${LARGURA_SVG} ${ALTURA_SVG}`,
    class: "automaton-svg",
  });

  // seta reutilizada em todas as arestas
  const defs = criarSVG("defs");
  const marcador = criarSVG("marker", {
    id: "arrowhead",
    viewBox: "0 0 10 10",
    refX: "9",
    refY: "5",
    markerWidth: "7",
    markerHeight: "7",
    orient: "auto-start-reverse",
  });
  marcador.appendChild(
    criarSVG("path", { d: "M0,0 L10,5 L0,10 z", class: "arrow-fill" }),
  );
  defs.appendChild(marcador);
  svg.appendChild(defs);

  const camadaArestas = criarSVG("g", { class: "edges-layer" });
  const camadaNos = criarSVG("g", { class: "nodes-layer" });
  svg.appendChild(camadaArestas);
  svg.appendChild(camadaNos);

  desenharArestas(camadaArestas);
  desenharNos(camadaNos);

  container.innerHTML = "";
  container.appendChild(svg);
  svgAtual = svg;

  marcarEstadoAtual();
}

// junta transicoes com a mesma origem/destino numa unica seta
function agruparTransicoes() {
  const grupos = {};
  transitions.forEach((t) => {
    const chave = t.from + "->" + t.to;
    if (!grupos[chave]) grupos[chave] = { from: t.from, to: t.to, fichas: [] };
    grupos[chave].fichas.push(t.read);
  });
  return Object.values(grupos);
}

function desenharArestas(camada) {
  elementosAresta = {};
  agruparTransicoes().forEach((g) => {
    const chave = g.from + "->" + g.to;
    const texto = [...new Set(g.fichas)].sort().join(", ") + "¢";

    elementosAresta[chave] =
      g.from === g.to
        ? desenharLaco(camada, g.from, texto)
        : desenharSeta(camada, g.from, g.to, texto);
  });
}

function desenharSeta(camada, fromId, toId, texto) {
  const a = posicoes[fromId];
  const b = posicoes[toId];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  const r = RAIO + 4;
  const startX = a.x + ux * r;
  const startY = a.y + uy * r;
  const endX = b.x - ux * r;
  const endY = b.y - uy * r;

  // curva leve, so pra nao sobrepor setas parecidas chegando no mesmo no
  const meioX = (startX + endX) / 2 + -uy * 18;
  const meioY = (startY + endY) / 2 + ux * 18;

  const d = `M ${startX} ${startY} Q ${meioX} ${meioY} ${endX} ${endY}`;
  const path = criarSVG("path", {
    d,
    class: "edge-path",
    "marker-end": "url(#arrowhead)",
    fill: "none",
  });
  camada.appendChild(path);

  const label = criarRotulo(camada, meioX, meioY, texto);
  return { path, label };
}

function desenharLaco(camada, estadoId, texto) {
  const p = posicoes[estadoId];
  const r = RAIO;
  const x1 = p.x - r * 0.6;
  const y1 = p.y - r * 0.85;
  const x2 = p.x + r * 0.6;
  const y2 = p.y - r * 0.85;
  const d = `M ${x1} ${y1} C ${p.x - r * 1.6} ${p.y - r * 2.6}, ${p.x + r * 1.6} ${p.y - r * 2.6}, ${x2} ${y2}`;
  const path = criarSVG("path", {
    d,
    class: "edge-path edge-self-loop",
    "marker-end": "url(#arrowhead)",
    fill: "none",
  });
  camada.appendChild(path);

  const label = criarRotulo(camada, p.x, p.y - r * 2.5, texto);
  return { path, label };
}

function criarRotulo(camada, x, y, texto) {
  const g = criarSVG("g", { class: "edge-label" });
  const t = criarSVG("text", {
    x,
    y,
    class: "edge-label-text",
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  });
  t.textContent = texto;
  g.appendChild(t);
  camada.appendChild(g);

  requestAnimationFrame(() => {
    const bbox = t.getBBox();
    const fundo = criarSVG("rect", {
      x: bbox.x - 6,
      y: bbox.y - 2,
      width: bbox.width + 12,
      height: bbox.height + 4,
      rx: 4,
      class: "edge-label-bg",
    });
    g.insertBefore(fundo, t);
  });

  return g;
}

function desenharNos(camada) {
  elementosNo = {};

  states.forEach((estado) => {
    const p = posicoes[estado.id];
    const g = criarSVG("g", {
      class: "state-node",
      transform: `translate(${p.x}, ${p.y})`,
    });

    if (estado.initial) {
      const seta = criarSVG("path", {
        d: `M ${-RAIO - 34} 0 L ${-RAIO - 4} 0`,
        class: "initial-arrow",
        "marker-end": "url(#arrowhead)",
      });
      g.appendChild(seta);
      const rotulo = criarSVG("text", {
        x: -RAIO - 36,
        y: -8,
        class: "initial-label",
        "text-anchor": "end",
      });
      rotulo.textContent = "início";
      g.appendChild(rotulo);
    }

    if (estado.final) {
      g.appendChild(
        criarSVG("circle", { r: RAIO + 6, class: "state-final-ring" }),
      );
    }

    g.appendChild(criarSVG("circle", { r: RAIO, class: "state-circle" }));

    const nome = criarSVG("text", {
      y: -4,
      class: "state-id-text",
      "text-anchor": "middle",
    });
    nome.textContent = estado.name;
    g.appendChild(nome);

    const valor = criarSVG("text", {
      y: 14,
      class: "state-label-text",
      "text-anchor": "middle",
    });
    valor.textContent = estado.label;
    g.appendChild(valor);

    camada.appendChild(g);
    elementosNo[estado.id] = g;
  });
}

function marcarEstadoAtual() {
  for (const id in elementosNo) {
    elementosNo[id].classList.toggle("current", id === currentStateId);
  }
}

// chamado depois de uma ficha ser aceita: destaca a aresta usada,
// anima a garra e marca o novo estado atual
function destacarTransicao(fromId, toId) {
  marcarEstadoAtual();
  limparDestaques(false);

  const aresta = elementosAresta[fromId + "->" + toId];
  if (aresta) {
    aresta.path.classList.add("edge-pulse", "edge-current");
    aresta.label.classList.add("edge-label-pulse", "edge-label-current");
    animarGarra(aresta.path);
  }

  const noDestino = elementosNo[toId];
  if (noDestino) {
    noDestino.classList.remove("pulse-in");
    void noDestino.getBoundingClientRect();
    noDestino.classList.add("pulse-in");
  }
}

function destacarRecusa(estadoId) {
  const no = elementosNo[estadoId];
  if (!no) return;
  no.classList.remove("shake");
  void no.getBoundingClientRect();
  no.classList.add("shake");
}

function limparDestaques(reAtual = true) {
  for (const chave in elementosAresta) {
    const aresta = elementosAresta[chave];
    aresta.path.classList.remove("edge-current", "edge-pulse");
    aresta.label.classList.remove("edge-label-current", "edge-label-pulse");
  }
  if (reAtual) {
    cancelAnimationFrame(garraAnimFrame);
    const garra = svgAtual && svgAtual.querySelector(".claw-marker");
    if (garra) garra.setAttribute("opacity", "0");
    marcarEstadoAtual();
  }
}

// -- garra ------------------

function animarGarra(pathEl) {
  if (!svgAtual) return;

  let grupoGarra = svgAtual.querySelector(".claw-marker");
  if (!grupoGarra) {
    grupoGarra = criarSVG("g", { class: "claw-marker", opacity: "0" });
    const imagem = criarSVG("image", {
      x: -32,
      y: -16,
      width: 48,
      height: 32,
      class: "claw-img",
      href: "assets/images/garra.png",
    });
    grupoGarra.appendChild(imagem);
    svgAtual.appendChild(grupoGarra);
  }

  cancelAnimationFrame(garraAnimFrame);
  const comprimento = pathEl.getTotalLength();
  const inicio = performance.now();
  const duracao = 950;
  grupoGarra.setAttribute("opacity", "1");

  function passo(agora) {
    const t = Math.min(1, (agora - inicio) / duracao);
    const dist = t * comprimento;
    const p = pathEl.getPointAtLength(dist);
    const proximo = pathEl.getPointAtLength(Math.min(comprimento, dist + 1));
    const angulo =
      Math.atan2(proximo.y - p.y, proximo.x - p.x) * (180 / Math.PI);
    grupoGarra.setAttribute(
      "transform",
      `translate(${p.x}, ${p.y}) rotate(${angulo})`,
    );

    if (t < 1) {
      garraAnimFrame = requestAnimationFrame(passo);
    } else {
      setTimeout(() => grupoGarra.setAttribute("opacity", "0"), 260);
    }
  }

  garraAnimFrame = requestAnimationFrame(passo);
}
