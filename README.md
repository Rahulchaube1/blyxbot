# BlyxBot

BlyxBot is a rule-based chatbot written in Blyx. You can talk to it in a terminal or a browser. Both entry points call the same conversation engine, which reads the question, picks a reply and carries your name and the current topic into the next turn.

```text
You       My name is Mira.
BlyxBot   Nice to meet you, Mira. What can I help with?
You       What's my name?
BlyxBot   You're Mira.
You       What is 17 times 24?
BlyxBot   That's 408.
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
| [bot/knowledge/](bot/knowledge) | The capital table and Gregorian date calculations |
| [bot/](bot) | Handlers for geography, arithmetic, dates, science, cooking, plants and follow-up questions |
| [test.blyx](test.blyx) and [tests/](tests) | The test runner and example conversations |

Every application and test source file here uses the `.blyx` extension. GitHub's Linguist catalog does not currently include Blyx, so GitHub can leave the repository's Languages panel empty. [Linguist language catalog](https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml)

## What you can ask

| Topic | Try it |
| --- | --- |
| Place capitals | “What is the capital of New Zealand?” The table covers all 274 place names and aliases in PyBot's original capitals table. |
| Arithmetic | “What is 12 percent of 250?” Signed decimals, parentheses and operator precedence work too. |
| Calendar | “When is Easter in 2026?” The bot also calculates leap years and month lengths. |
| Everyday knowledge | “Why do onions make you cry?” or “How often should I water a cactus?” There are 52 science, kitchen and plant topics. |
| Follow-ups | Ask “How do I descale a kettle?” and then “How long does that take?” |
| Name memory | Say “My name is Mira”, ask “What's my name?”, then say “Forget my name”. |

BlyxBot ports these features from Hugging Face's PyBot. The larger Python project has 528 modules. Its general conversation engine and remaining specialist topics are outside this port's coverage. The adapted knowledge and rules are distributed under Apache 2.0. [Original PyBot revision](https://github.com/huggingface/pybot/tree/7d63c7fbebb44c7e466e5c8b5c1f341ab767929e) · [License](LICENSE)

## Run the tests

```sh
mkdir -p build
blyxc build test.blyx -o build/tests
./build/tests
```

The suite checks exact replies, topic selection, every capital lookup, and multi-turn conversations. It exits with the first question and mismatched answer if a check fails.
