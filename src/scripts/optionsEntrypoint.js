require.config({
    baseUrl: "scripts/app",
    waitSeconds: 0,

    paths: {
        jquery: "../libs/jquery.min",
        underscore: "../libs/underscore.min",
        backbone: "../libs/backbone.min",
        text: "../libs/require.text",
    },

    shim: {
        jquery: {
            exports: "$",
        },
        backbone: {
            deps: ["underscore"],
            exports: "Backbone",
        },
        underscore: {
            exports: "_",
        },
    },
});
browser.runtime.getBackgroundPage(function (bg) {
    /**
     * Setup work, that has to be done before any dependencies get executed
     */
    window.bg = bg;
    bg.appStarted.then(() => {
        requirejs(["options"], function () {});
    });
});
