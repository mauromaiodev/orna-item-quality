# Qualidade do item no Orna

Cola um print do item ou escolha o nome na lista. A tela fica em português ou inglês: o print define o idioma, e os botões no topo trocam quando quiser.

## Rodar

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre http://localhost:3010.

A chave gratuita do Gemini fica em `GEMINI_API_KEY`, criada no [Google AI Studio](https://aistudio.google.com/docs/get-started). Se o modelo estiver congestionado, a leitura tenta outro modelo gratuito. Sem a chave, o cálculo manual continua.

## Conta

A base 100% vem do Codex em playorna.com. A escala por nível segue a fórmula do [OrnaCodex](https://github.com/67au/OrnaCodex) (MIT):

- nível 1: `ceil(base * qualidade / 100)`
- níveis 2–10: incremento `ceil(base / 10)` no item normal e `ceil(base / 8)` no de boss
- Masterforged, Demonforged e Godforged são os níveis 11, 12 e 13, com +1%, +2% e +3%

A linha de Anguish e os números entre parênteses não entram. Destreza e crítico não definem a porcentagem.

```bash
pnpm test
```
