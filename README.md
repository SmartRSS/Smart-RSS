# Smart RSS extension

## Now officially unmaintained, I *may* fix some critical issue if any is found within few following weeks, but then I'll archive this repo. Feel free to fork and continue development as you wish

Originally developed for Opera 15+ by BS-Harou (Martin Kadlec)

Translations are in scripts/nls/\*.js

For technical bug reports use issues here on GitHub

## For users

Extension is available in following repositories:

#### AMO: https://addons.mozilla.org/firefox/addon/smart-rss-reader/

#### Chrome Web Store: https://chrome.google.com/webstore/detail/eggggihfcaabljfpjiiaohloefmgejic/

If you encounter issue with a specific feed for best results please back up and include current state of that feed in your report, this will be helpful in case the feed changes before I get to check it, thanks in advance

## Known issues:

-   in Firefox builds prior to `2017-08-09` and derivatives there's issue with CSP that causes extension to fail all requests following the one that got blocked, the only way to recover is to reload extension but it will happen again next time given source is loaded, issue reported to Waterfox MrAlex94/Waterfox#1780 in hope the fix will get ported to Classic - in the meantime attempted to work around this bug by removing CSP header from data loaded by the extension

## For developers

If you are interested in improving Smart RSS then there are few tips to get started.

First of all you will need several command line tools:

-   Git
-   Node.JS & npm
-   Grunt-cli

To setup your Smart RSS project open your console, go to your projects folders and type:

```
git clone git@github.com:zakius/Smart-RSS.git smartrss
cd smartrss
npm install
```

Sometimes you may encounter texts ending with `*` or `!` in app, first ones are fallbacks to English text when used locale lacks the needed one and the latter are actual keys displayed when even English text is missing, feel free to submit PR's to fill them. If you change wording or punctuation somewhere please comment that line (using GitHub interface) with reasoning like common conventions or special punctuation rules in given language.

To check for jshint errors:

```
jshint .
```

There are multiple grunt tasks defined for this project but only few are meant to be run directly:

```
grunt prepare
```

copies relevant source files to browser specific directories within `dist` subdirectory and cleans up manifests from values not needed by the given browser.

```
grunt watch
```

watches for changes in `src` directory and performs `prepare` every time it detects one

```
grunt release:{level=patch}
```

is all-in-one solution for releasing new versions of the extension

-   increases extension version in manifest by semver `level`
-   commits changes with relevant message
-   performs `prepare`
-   creates browser specific packages of the extension
