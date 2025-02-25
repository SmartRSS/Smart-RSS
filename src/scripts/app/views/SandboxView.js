define(["backbone", "modules/Locale"], function (BB, Locale) {
    return BB.View.extend({
        tagName: "iframe",
        loaded: false,
        events: {
            load: "handleLoad",
        },
        initialize: function () {
            this.el.setAttribute("src", "rss_content.html");
            this.el.setAttribute("name", "sandbox");
            this.el.setAttribute("frameborder", 0);
            this.el.setAttribute("tabindex", -1);
        },
        render: function () {
            return this;
        },
        handleLoad: function () {
            this.loaded = true;
            this.el.contentDocument.querySelector(
                "#smart-rss-url"
            ).textContent = Locale.translate("FULL_ARTICLE");
            this.el.contentDocument.addEventListener(
                "keydown",
                app.handleKeyDown
            );

            const baseStylePath = browser.runtime.getURL("styles/main.css");
            this.el.contentDocument
                .querySelector("[data-base-style]")
                .setAttribute("href", baseStylePath);

            const darkStylePath = browser.runtime.getURL("styles/dark.css");
            this.el.contentDocument
                .querySelector("[data-dark-style]")
                .setAttribute("href", darkStylePath);
            this.el.contentDocument.querySelector(
                "[data-custom-style]"
            ).innerHTML = bg.settings.get("userStyle");
            this.trigger("load");
        },
    });
});
