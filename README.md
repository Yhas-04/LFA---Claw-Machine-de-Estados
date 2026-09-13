"Jogo" baseado em Visual Novel. A lógica de progresso é controlada por um autômato finito exportado do JFLAP (`1.jff`).

## Como funciona

1. `automaton.js` carrega `1.jff` com `fetch()` e `DOMParser`, lendo estados e transições.
2. Ao clicar numa ficha (5¢, 10¢ ou 25¢), `game.js` chama `inserirFicha(valor)`.
3. Se existir transição válida, o estado atual muda; se não, a ficha é recusada.
4. `visualizer.js` desenha o diagrama em SVG e anima a garra sobre a aresta usada.
5. `game.js` atualiza texto, cena e som conforme o estado.

## Executar localmente

Abrir `index.html` direto do disco pode falhar por CORS. Use um servidor:

```bash
python3 -m http.server 8000
ou
npx serve .
```
