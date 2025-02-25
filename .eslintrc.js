module.exports = {
    env: {
        browser: true,
        es2021: true,
        amd: true, // Add AMD environment for RequireJS
    },
    extends: ["eslint:recommended"],
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
    },
    globals: {
        // Application globals
        app: true,
        bg: true,
        tabID: true,

        // WebExtension API globals
        browser: "readonly", // Firefox WebExtensions API
        chrome: "readonly", // Chrome Extensions API

        // Module system
        define: false,
        require: false,
        requirejs: false,

        // Browser APIs
        requestAnimationFrame: true,
        URL: true,
        HTMLCollection: true,
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        indexedDB: "readonly",
        Notification: "readonly",
        WebSocket: "readonly",

        // WebExtension specific globals
        Blob: "readonly",
        FileReader: "readonly",

        // Firefox specific
        InstallTrigger: "readonly",

        // Extension messaging
        runtime: "readonly",

        // Common WebExtension APIs
        tabs: "readonly",
        storage: "readonly",
        contextMenus: "readonly",
        webRequest: "readonly",
        permissions: "readonly",
        i18n: "readonly",

        // Background process globals
        sourceToFocus: true,
        Source: true,
        Item: true,
        Folder: true,
        settings: true,
        info: true,
        sources: true,
        items: true,
        folders: true,
        loaded: true,
        toolbars: true,
        loader: true,
        valueToBoolean: true,
        getBoolean: true,
        getElementBoolean: true,
        getElementSetting: true,
        fetchAll: true,
        fetchOne: true,
        reloadExt: true,
        appStarted: true,
        parsedData: true,

        // Libraries
        $: true,
        jQuery: true,
        _: true,
        Backbone: true,
        BB: true,

        // AMD modules that might be used globally
        RSSParser: true,
        Favicon: true,
        Animation: true,
        Locale: true,
        dateUtils: true,
        escapeHtml: true,
        stripTags: true,

        // Models and collections
        Settings: true,
        Info: true,
        Sources: true,
        Items: true,
        Folders: true,
        Toolbars: true,
        Loader: true,
        Special: true,

        // Views and layouts
        Layout: true,
        ArticlesLayout: true,
        ContentLayout: true,
        FeedsLayout: true,

        // Allow console for debugging
        console: true,
    },
    rules: {
        // Disable all formatting rules
        indent: "off",
        "linebreak-style": "off",
        quotes: "off",
        semi: "off",
        "comma-dangle": "off",
        "max-len": "off",
        "brace-style": "off",
        "space-before-function-paren": "off",
        "space-before-blocks": "off",
        "keyword-spacing": "off",
        "object-curly-spacing": "off",
        "array-bracket-spacing": "off",
        "computed-property-spacing": "off",
        "space-in-parens": "off",
        "comma-spacing": "off",
        "no-trailing-spaces": "off",
        "eol-last": "off",

        // Keep logical/semantic rules
        "no-unused-vars": "warn",
        curly: "error",
        eqeqeq: "error",
        "no-empty": "error",

        // Browser-specific rules
        "no-alert": "off", // Allow alert, confirm, and prompt
        "no-console": "off", // Allow console for extension debugging

        // Rules for messy codebase
        "no-undef": "warn", // Warn instead of error for undefined variables
        "no-global-assign": "warn", // Warn instead of error for global reassignments
        "no-useless-escape": "warn", // Warn instead of error for unnecessary escape characters
    },
    // Allow globals to be declared via comments
    noInlineConfig: false,
    overrides: [
        {
            // For AMD modules
            files: ["src/scripts/**/*.js"],
            env: {
                amd: true,
            },
            globals: {
                define: "readonly",
                require: "readonly",
            },
        },
        {
            // For background process
            files: ["src/scripts/bgprocess/**/*.js"],
            globals: {
                browser: "readonly",
                chrome: "readonly",
            },
        },
    ],
};
