// Controla a tela do jogo e sons

const STATE_CONTENT = {
  q0: {
    title: "MÁQUINA",
    text: "Bem-vindo à máquina de fichas. Insira uma ficha (5¢, 10¢ ou 25¢) para começar o seu turno.",
    scene: "assets/images/bg-q0.jpg",
  },
  q2: {
    title: "MÁQUINA",
    text: "Ficha de 5¢ registrada. O visor mostra o saldo atual: 5¢.",
    scene: "assets/images/bg-q0.jpg",
  },
  q3: {
    title: "MÁQUINA",
    text: "10¢ registrados. Continue inserindo fichas para completar 30¢.",
    scene: "assets/images/bg-q0.jpg",
  },
  q5: {
    title: "MÁQUINA",
    text: "15¢ registrados. Você já está na metade do caminho para o PRÊMIO.",
    scene: "assets/images/bg-q0.jpg",
  },
  q7: {
    title: "MÁQUINA",
    text: "20¢ registrados. Faltam só mais 10¢ para liberar o PRÊMIO.",
    scene: "assets/images/bg-q0.jpg",
  },
  q4: {
    title: "MÁQUINA",
    text: "25¢ registrados. Mais uma ficha e o PRÊMIO sai.",
    scene: "assets/images/bg-q0.jpg",
  },
  q1: {
    title: "MÁQUINA",
    text: "30¢ completos! O PRÊMIO!! foi liberado. Bom turno!",
    scene: "assets/images/bg-q0.jpg",
  },
};

const MENSAGENS_RECUSA = [
  "Essa ficha não é aceita nesse momento. Confira o saldo e tente outro valor.",
  "A máquina não reconheceu a ficha. Nenhuma transição válida a partir daqui.",
  "Ficha recusada. Tente um dos valores destacados nos botões.",
];

let audioLigado = true;
let jogoComecou = false;

let el = {}; // referencias dos elementos da tela
let sfx = {}; // referencias dos efeitos sonoros
let bgm = null;

async function iniciarJogo() {
  el = {
    sceneImage: document.getElementById("scene-image"),
    dialogTitle: document.getElementById("dialog-title"),
    dialogText: document.getElementById("dialog-text"),
    feedback: document.getElementById("feedback"),
    coinButtons: [...document.querySelectorAll(".coin-btn")],
    resetButton: document.getElementById("reset-btn"),
    muteButton: document.getElementById("mute-btn"),
    startOverlay: document.getElementById("start-overlay"),
    startButton: document.getElementById("start-btn"),
    automatonWrap: document.getElementById("automaton-wrap"),
    scenePanel: document.getElementById("scene"),
    loadError: document.getElementById("load-error"),
    statusState: document.getElementById("status-state"),
    statusCoins: document.getElementById("status-coins"),
    dogPopup: document.getElementById("dog-popup"),
    dogPopupImg: document.getElementById("dog-popup-img"),
  };

  sfx = {
    coin: document.getElementById("sfx-coin"),
    success: document.getElementById("sfx-success"),
    error: document.getElementById("sfx-error"),
    final: document.getElementById("sfx-final"),
  };
  bgm = document.getElementById("bgm");

  try {
    await carregarAutomato("1.jff");
  } catch (erro) {
    console.error(erro);
    el.loadError.hidden = false;
    el.loadError.textContent = "Não foi possível carregar 1.jff.";
    return;
  }

  desenharDiagrama(el.automatonWrap);

  const statusCount = document.getElementById("status-count");
  if (statusCount) {
    statusCount.textContent =
      states.length + " estados · " + transitions.length + " transições";
  }

  ligarBotoes();
  atualizarTela(estadoAtual());
}

function ligarBotoes() {
  el.startButton.addEventListener("click", comecarTurno);

  el.coinButtons.forEach((botao) => {
    botao.addEventListener("click", () => clicarFicha(botao.dataset.value));
  });

  el.resetButton.addEventListener("click", () => {
    if (sfx.final) {
      sfx.final.pause();
      sfx.final.currentTime = 0;
    }

    if (audioLigado) {
      bgm.currentTime = 0;
      bgm.volume = 0.35;
      const tentarTocar = bgm.play();
      if (tentarTocar && tentarTocar.catch) {
        tentarTocar.catch((e) =>
          console.warn("nao foi possivel retomar o bgm:", e),
        );
      }
    }

    reiniciarAutomato();
    limparDestaques();
    atualizarTela(estadoAtual());
    el.resetButton.hidden = true;
    esconderPopupCachorro();
  });

  el.muteButton.addEventListener("click", alternarSom);
}

function comecarTurno() {
  jogoComecou = true;
  el.startOverlay.classList.add("hidden");
  if (audioLigado) {
    bgm.volume = 0.35;
    bgm.play().catch(() => {});
  }
}

function alternarSom() {
  audioLigado = !audioLigado;
  el.muteButton.textContent = audioLigado ? "🔊" : "🔇";
  if (!audioLigado) {
    bgm.pause();
  } else if (jogoComecou) {
    bgm.play().catch(() => {});
  }
}

function tocarSom(nome) {
  if (!audioLigado) return;
  const audio = sfx[nome];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// -- interacao --------------------------------------------

function clicarFicha(valor) {
  if (!jogoComecou || ehFinal()) return;

  tocarSom("coin");
  const estadoAnterior = currentStateId;
  const aceitou = inserirFicha(valor);

  if (!aceitou) {
    tocarSom("error");
    destacarRecusa(currentStateId);
    const msg =
      MENSAGENS_RECUSA[Math.floor(Math.random() * MENSAGENS_RECUSA.length)];
    mostrarFeedback(msg + " (ficha de " + valor + "¢ recusada)", true);
    el.scenePanel.classList.add("scene-shake");
    setTimeout(() => el.scenePanel.classList.remove("scene-shake"), 400);
    return;
  }

  destacarTransicao(estadoAnterior, currentStateId);
  const novoEstado = estadoAtual();
  atualizarTela(novoEstado);
  mostrarFeedback("");

  if (novoEstado.final) {
    // Toca o som de sucesso ao atingir 30¢
    tocarSom("success");

    // Um instante depois, pausa o bgm e toca o som final
    setTimeout(() => {
      bgm.pause();
      tocarSom("final");
    }, 280);

    el.resetButton.hidden = false;
    el.scenePanel.classList.add("scene-final-flash", "scene-final-shake");
    setTimeout(
      () =>
        el.scenePanel.classList.remove(
          "scene-final-flash",
          "scene-final-shake",
        ),
      700,
    );
    setTimeout(mostrarCachorroAleatorio, 320);
  }
}

// busca uma foto de cachorro aleatoria na Dog API e mostra no popup.
async function mostrarCachorroAleatorio() {
  try {
    const resposta = await fetch("https://dog.ceo/api/breeds/image/random");
    const dados = await resposta.json();
    if (dados.status !== "success") return;

    el.dogPopupImg.src = dados.message;
    el.dogPopup.classList.remove("hiding");
    void el.dogPopup.offsetWidth;
    el.dogPopup.classList.add("visible");

    setTimeout(esconderPopupCachorro, 2800);
  } catch (erro) {
    console.warn("não foi possível buscar imagem de cachorro", erro);
  }
}

function esconderPopupCachorro() {
  el.dogPopup.classList.remove("visible");
  el.dogPopup.classList.add("hiding");
}

// -- tela ------------------------------------------------------------------

function atualizarTela(estado) {
  const conteudo = STATE_CONTENT[estado.name];
  if (!conteudo) return;

  el.dialogTitle.textContent = conteudo.title;
  el.dialogText.textContent = conteudo.text;
  el.statusState.textContent =
    "estado: " + estado.name + (estado.final ? " (final)" : "");
  el.statusCoins.textContent = "valor: " + (estado.label || "—");

  if (el.sceneImage.getAttribute("src") !== conteudo.scene) {
    el.sceneImage.classList.add("fade");
    setTimeout(() => {
      el.sceneImage.setAttribute("src", conteudo.scene);
      el.sceneImage.classList.remove("fade");
    }, 150);
  }

  // realca, nos botoes, quais fichas a maquina aceita a partir daqui
  const aceitas = fichasAceitas(estado.id);
  el.coinButtons.forEach((botao) => {
    botao.classList.toggle("accepted", aceitas.includes(botao.dataset.value));
  });

  el.scenePanel.classList.toggle("is-final", !!estado.final);
}

function mostrarFeedback(mensagem, erro = false) {
  el.feedback.textContent = mensagem;
  el.feedback.classList.toggle("feedback-error", erro);
}

document.addEventListener("DOMContentLoaded", iniciarJogo);
