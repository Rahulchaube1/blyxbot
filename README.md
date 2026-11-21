# BlyxBot

[![Source language: Blyx](https://img.shields.io/badge/source_language-Blyx-32684d)](https://github.com/Rahulchaube1/blyxxxx)

BlyxBot is a rule-based chatbot written in Blyx. It can look up English words, quiz you on their meanings, convert measurements and answer everyday questions. The terminal and browser use the same conversation engine. [Chat with BlyxBot on Hugging Face](https://huggingface.co/spaces/oncody/BlyxBot)

```text
You       Define bank
BlyxBot   bank (noun, 1 of 6) — sloping land (especially the slope beside a body of water).
You       Another meaning
BlyxBot   bank (noun, 2 of 6) — a financial institution that accepts deposits and channels the money into lending activities.
You       Convert 5 miles to km
BlyxBot   5 mi ≈ 8.04672 km.
```

## Run the terminal chat

On GNU/Linux, install Rust 1.90 or later with Cargo and a native linker. Then install the Blyx compiler revision that supports native text, command-line and file operations. The interactive terminal uses GNU coreutils to read one line at a time. [Blyx compiler](https://github.com/Rahulchaube1/blyxxxx/tree/3a4a089145d589448a7f6aae228c01fcbd7733c8)

```sh
cargo install --locked --git https://github.com/Rahulchaube1/blyxxxx --rev 3a4a089145d589448a7f6aae228c01fcbd7733c8 blyxc
git clone https://github.com/Rahulchaube1/blyxbot.git
cd blyxbot
mkdir -p build
blyxc build blyxbot.blyx -o build/blyxbot
./build/blyxbot
```

Type a message and press Enter. Use `/reset` for a fresh conversation and `/exit` to quit. For a single answer or a batch of messages, run

```sh
./build/blyxbot -p "What is the capital of Peru?"
printf '%s\n' "My name is Mira" "What's my name?" | ./build/blyxbot
```

## Run the browser chat

Compile the web entry point and serve it locally with a CGI-enabled BusyBox HTTP server. On Debian or Ubuntu, the `busybox-static` package provides the server.

```sh
mkdir -p build/cgi-bin
blyxc build web.blyx -o build/cgi-bin/chat
busybox httpd -f -p 127.0.0.1:8080 -h build
```

Open [the local chat](http://127.0.0.1:8080/cgi-bin/chat). Type a question and press Enter or choose **Send**. The page carries the last 20 exchanges and the conversation state between turns. **New chat** clears both. The Blyx executable renders the form and replies directly, including when browser scripting is disabled.

## Find your way around

| File or directory | What you'll find |
| --- | --- |
| [blyxbot.blyx](blyxbot.blyx) and [web.blyx](web.blyx) | Terminal and browser entry points |
| [bot/chat.blyx](bot/chat.blyx) and [bot/memory.blyx](bot/memory.blyx) | Reply selection, introductions, name recall and forgetting |
| [bot/understanding/](bot/understanding) | Tokenization, word matching and number parsing |
| [bot/lexicon/](bot/lexicon) | One compiled Blyx module per dictionary headword, with alphabetical indexes |
| [bot/knowledge/](bot/knowledge) | Capitals, dates, irregular verbs, word-choice guides and unit definitions |
| [bot/](bot) | Conversation handlers, dictionary lookups, word quizzes and conversions |
| [test.blyx](test.blyx) and [tests/](tests) | The test runner and example conversations |
| [tools/index_lexicon.blyx](tools/index_lexicon.blyx) | Builds the dictionary indexes from the entry filenames |

The application, tests and indexing tool are written in Blyx. The 2,091 dictionary entry modules were generated from WordNet. GitHub Linguist also considers how a language is used across independent developers and repositories when reviewing it for the Languages panel. [Linguist criteria](https://github.com/github-linguist/linguist/blob/main/CONTRIBUTING.md#language-extension-and-filename-usage-requirements)

## What you can ask

| Topic | Try it |
| --- | --- |
| Dictionary | “Define bank”, then “another meaning”, “give me an example” or “synonyms”. Select a meaning directly with “sense 2”. The offline dictionary covers 2,091 English words and phrases with 9,920 meanings. |
| Word browsing | “Words starting with br” shows ten entries at a time. Say “more words” or “previous page” to browse. |
| Vocabulary practice | “Word quiz” starts 24 rounds. Guess the word, ask for a hint, or say “reveal”, “next question” or “stop quiz”. |
| Word choice and verb forms | “Synonyms for happy” or “conjugate write”. There are 30 word-choice guides and 77 irregular verbs. |
| Measurements | “5 miles to km”, “how many inches are in a foot?” or “32 Fahrenheit to Celsius”. Convert among 33 units of length, mass, volume, time and temperature. |
| Place capitals | “What is the capital of New Zealand?” The table covers all 274 place names and aliases in PyBot's original capitals table. |
| Arithmetic | “What is 12 percent of 250?” Signed decimals, parentheses and operator precedence work too. |
| Calendar | “When is Easter in 2026?” The bot also calculates leap years and month lengths. |
| Everyday knowledge | “Why do onions make you cry?” or “How often should I water a cactus?” There are 52 science, kitchen and plant topics. |
| Follow-ups | Ask “How do I descale a kettle?” and then “How long does that take?” |
| Name memory | Say “My name is Mira”, ask “What's my name?”, then say “Forget my name”. |

The capital table, everyday topics, word-choice guides, irregular verbs and selected conversation rules were adapted from Hugging Face's PyBot under Apache 2.0. This is a partial port of the original 528-module project. [Original PyBot revision](https://github.com/huggingface/pybot/tree/7d63c7fbebb44c7e466e5c8b5c1f341ab767929e) · [Code license](LICENSE)

Definitions, sense-specific synonyms and usage examples come from Princeton WordNet 3.0, copyright 2006 by Princeton University. The dictionary runs from the compiled application and works offline. [Dictionary sources and selection](bot/lexicon/README.md) · [WordNet license](licenses/WordNet-3.0.txt)

## Run the tests

```sh
mkdir -p build
blyxc build test.blyx -o build/tests
./build/tests
```

The suite checks every dictionary entry and meaning, the alphabetical indexes, vocabulary conversations, quizzes, conversions, every capital lookup and the original chat regressions.

## Connect with Rahul Chaube

[Portfolio](https://www.rahulchaube1.com/) · [GitHub](https://github.com/Rahulchaube1) · [LinkedIn](https://www.linkedin.com/in/rahulchaube1) · [Hugging Face](https://huggingface.co/oncody) · [X](https://x.com/RahulChaube_) · [EverestQ](https://www.everestqai.com/) · [Contact](https://www.rahulchaube1.com/contact)

[Blyx website](https://www.blyx-lang.space/) · [BlyxTorch](https://www.blyx-lang.space/packages/blyxtorch) · [Handbook](https://doc.blyx-lang.space/) · [Community](https://www.blyx-lang.space/community)

Support Rahul’s open-source work through [GitHub Sponsors](https://github.com/sponsors/Rahulchaube1) or [Buy Me a Coffee](https://buymeacoffee.com/rahulchaube).
