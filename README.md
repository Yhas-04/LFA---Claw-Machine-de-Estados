"Jogo" baseado em Visual Novel. A lógica de progresso é controlada por um autômato finito exportado do JFLAP (`1.jff`).

## Como funciona

1. `automaton.js` carrega `1.jff` com `fetch()` e `DOMParser`, lendo estados e transições.
2. Ao clicar numa ficha (5¢, 10¢ ou 25¢), `game.js` chama `inserirFicha(valor)`.
3. Se existir transição válida, o estado atual muda; se não, a ficha é recusada.
4. `visualizer.js` desenha o diagrama em SVG e anima a garra sobre a aresta usada.
5. `game.js` atualiza texto, cena e som conforme o estado.

## Sobre o AFD

O AFD vem do `1.jff`: estados `q0`, `q1`, `q2`, ..., alfabeto `5`, `10`, `25`, inicial `q0` e final `q1` (30¢).

## Os botões

- **Aceito:** LED verde, borda dourada. Avança o estado.
- **Não aceito:** LED apagado. Toca erro e recusa.
- **2¢:** isca fora do alfabeto. Nunca é aceito, mostra que símbolo inválido é sempre rejeitado.

## Sobre a garra

A garra desliza sobre a aresta da transição aceita, mostrando qual regra do AFD foi usada.
