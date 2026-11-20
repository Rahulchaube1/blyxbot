# BlyxBot

BlyxBot is a rule-based chatbot written in [Blyx](https://github.com/Rahulchaube1/blyxxxx). The terminal and browser run the same `.blyx` rules through the official WebAssembly interpreter. JavaScript handles input, output and saving conversation state.

## Run it

With Node.js 18 or later, clone this repository and run

```sh
git clone https://github.com/Rahulchaube1/blyxbot.git
cd blyxbot
npm start
```

Type a message and press Enter. Use `/reset` to clear the conversation and `/exit` to quit. For a single reply or a piped conversation, use

```sh
node cli.mjs -p "What is 17 times 24?"
printf '%s\n' "My name is Mira" "What's my name?" | node cli.mjs
```

For the interactive browser interface, run `npm run web` and open the URL it prints. The browser stores chat history on the device. The `web/` directory can also be served by a static web host. All fonts, rules and the interpreter are bundled with the project.

## Port coverage

This is a working port of selected features from Hugging Face’s 528-module PyBot. It supports

- First-name introductions, recall and forgetting a name
- National capital answers for all 274 country names and aliases in the original table
- Arithmetic with signed decimals, grouping, percentages and operator precedence
- Gregorian leap years, month lengths and Easter dates
- 52 everyday knowledge cards, including cooking, plant care and science, plus two kettle-descaling follow-ups

The original arbiter, general conversation memory and remaining specialist modules are outside this version’s coverage. The released Blyx interpreter supports a smaller set of text and collection operations than those Python modules use. [Upstream PyBot](https://github.com/huggingface/pybot/tree/7d63c7fbebb44c7e466e5c8b5c1f341ab767929e)

## Run a turn with the Blyx CLI

The portable interpreter takes a parameterless `main()`. The input adapter supplies each message as literal data. To inspect a complete turn or execute it with `blyxc` 0.2.0, run

```sh
node cli.mjs --emit-blyx "What is the capital of Peru?" > turn.blyx
blyxc check turn.blyx
blyxc run turn.blyx
```

The program prints the remembered name on the first line, the selected topic on the second, and the reply after that. A new conversation has a blank first line. In a normal chat the interface handles these fields for you.

Run `npm test` to check chat, arithmetic, calendar dates, capital matching, everyday prompts and the terminal entry point. The bot source is in [web/bot](web/bot). [Source credits and licenses](web/credits.txt)
