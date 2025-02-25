# Smart RSS extension

## Now officially unmaintained, I _may_ fix some critical issue if any is found within few following weeks, but then I'll archive this repo. Feel free to fork and continue development as you wish

Originally developed for Opera 15+ by BS-Harou (Martin Kadlec)

Translations are in scripts/nls/\*.js

For technical bug reports use issues here on GitHub

## For users

Extension is available in following repositories:

#### AMO: https://addons.mozilla.org/firefox/addon/smart-rss-reader/

~#### Chrome Web Store: https://chrome.google.com/webstore/detail/eggggihfcaabljfpjiiaohloefmgejic/~

If you encounter issue with a specific feed for best results please back up and include current state of that feed in your report, this will be helpful in case the feed changes before I get to check it, thanks in advance

## Known issues:

-   in Firefox builds prior to `2017-08-09` and derivatives there's issue with CSP that causes extension to fail all requests following the one that got blocked, the only way to recover is to reload extension but it will happen again next time given source is loaded, issue reported to Waterfox MrAlex94/Waterfox#1780 in hope the fix will get ported to Classic - in the meantime attempted to work around this bug by removing CSP header from data loaded by the extension

## For developers

If you are interested in improving Smart RSS then there are few tips to get started.

First of all you will need several command line tools:

-   Git
-   Node.JS (v12 or higher recommended) & npm

To setup your Smart RSS project open your console, go to your projects folders and type:

```
git clone git@github.com:zakius/Smart-RSS.git smartrss
cd smartrss
npm install
```

Sometimes you may encounter texts ending with `*` or `!` in app, first ones are fallbacks to English text when used locale lacks the needed one and the latter are actual keys displayed when even English text is missing, feel free to submit PR's to fill them. If you change wording or punctuation somewhere please comment that line (using GitHub interface) with reasoning like common conventions or special punctuation rules in given language.

### Code Quality

The project uses a clear separation of concerns for code quality:

-   **ESLint** checks for logical and semantic issues (potential bugs, unused variables, etc.)
-   **EditorConfig** handles all formatting concerns (indentation, line endings, quotes, etc.)

This separation ensures that ESLint focuses on code correctness while EditorConfig manages consistent formatting across different editors and IDEs.

To lint your code:

```
npm run lint
```

This will check your code for:

-   Syntax errors and potential bugs
-   Logical issues and best practices
-   Browser extension-specific concerns

### Build System

The build system has been simplified to a plain Node.js script. You can use npm scripts to run the build tasks:

```bash
# Copy files from src to dist and strip comments
npm run prepare

# Prepare and create zip package
npm run package

# Bump version, commit, prepare, and create zip package (patch version)
npm run release

# Bump minor version, commit, prepare, and create zip package
npm run release:minor

# Bump major version, commit, prepare, and create zip package
npm run release:major

# Watch for changes in src directory
npm run watch

# Bump version number (patch by default)
npm run bump-version
```

Or you can use the build script directly:

```bash
node build.js prepare
node build.js package
node build.js release [patch|minor|major]
node build.js watch
node build.js bump-version [patch|minor|major]
```

For more details about the build system, see [BUILD.md](BUILD.md).
