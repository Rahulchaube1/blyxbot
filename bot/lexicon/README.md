# BlyxBot's English dictionary

The dictionary contains 2,091 English headwords and 9,920 numbered meanings. Each headword has its own Blyx function under `entries/`. Both chat interfaces compile these functions into the application. A lookup needs no network connection.

## Where the entries come from

The definitions, synonyms and examples come from the Princeton WordNet 3.0 release, copyright 2006 by Princeton University. The source archive has SHA-256 digest `640db279c949a88f61f851dd54ebbb22d003f8b90b85267042ef85a3781d3a52`. [WordNet 3.0 archive](https://wordnetcode.princeton.edu/3.0/WordNet-3.0.tar.gz) · [License](../../licenses/WordNet-3.0.txt)

The selection includes lower-case alphabetic headwords and phrases with at least 20 tagged uses across WordNet's `index.sense`. Underscores in the source become spaces. The entry retains each distinct meaning with a positive tag count, ordered by descending count. Ties use the part of speech (noun, verb, adjective, adverb), then WordNet's sense rank. The ordering reflects WordNet's tagged corpus.

The comment above each meaning gives its part-of-speech file and original byte offset in WordNet. Synonyms are other words in the same synset. An entry includes a usage example when the source provides one containing the headword or a recognized inflection. The collection contains synonyms for 6,623 meanings and examples for 6,341.

## Edit an entry

Open the file for the headword, such as [bank](entries/b/w_bank.blyx). Sense zero returns the number of meanings. For each numbered sense, the function returns the part of speech, definition, synonyms and usage example as four tab-separated fields. The last two fields may be empty. An out-of-range sense returns an empty string.

To add a headword, follow the same format in the directory for its initial letter. Use the `w_` filename prefix, replace spaces with `_` and hyphens with `_hyphen_`, and give the public function the same name as the file. Keep the source and license for new material with the entry.

Editing an existing definition takes effect at the next build. After adding or renaming a headword, run the index builder from the repository root.

```sh
mkdir -p build
blyxc build tools/index_lexicon.blyx -o build/index-lexicon
for dir in bot/lexicon/entries/*; do
  letter=${dir##*/}
  ./build/index-lexicon "$letter" "$dir"/w_*.blyx > "build/index-$letter.blyx" || exit 1
  mv "build/index-$letter.blyx" "bot/lexicon/$letter.blyx" || exit 1
done
./build/index-lexicon catalog bot/lexicon/entries/* > build/catalog.blyx &&
  mv build/catalog.blyx bot/lexicon/catalog.blyx
```

Run the repository's Blyx test suite after changing the data. When intentionally changing the corpus size, update the expected word and meaning counts and this page.
