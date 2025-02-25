/**
 * @module App
 * @submodule views/IndicatorView
 */
define(function (require) {
    const BB = require("backbone");
    const Locale = require("modules/Locale");
    /**
     * Feeds update indicator view
     * @class IndicatorView
     * @constructor
     * @extends Backbone.View
     */
    const IndicatorView = BB.View.extend({
        /**
         * Indicator element id
         * @property id
         * @default indicator
         */
        id: "indicator",
        events: {
            "click #indicator-stop": "handleButtonStop",
        },

        /**
         * @method initialize
         */
        initialize: function () {
            this.loaded = 0;
            this.maxSources = 0;
            const fragment = document
                .createRange()
                .createContextualFragment(
                    require("text!templates/indicatorView.html")
                );
            this.el.appendChild(fragment);
            let port = browser.runtime.connect({ name: "port-from-cs" });
            port.onMessage.addListener((m) => {
                if (m.key === "loading") {
                    this.loading = m.value;
                }
                if (m.key === "loaded") {
                    this.loaded = m.value;
                }
                if (m.key === "maxSources") {
                    this.maxSources = m.value;
                }
                this.render();
            });
            bg.sources.on("clear-events", this.handleClearEvents, this);

            this.render();
        },

        /**
         * Clears bg events it listens to
         * @method handleClearEvents
         * @param id {Integer} ID of the closed tab
         */
        handleClearEvents: function (id) {
            if (window == null || id === tabID) {
                bg.sources.off("clear-events", this.handleClearEvents, this);
            }
        },

        /**
         * Stops updating feeds
         * @method handleButtonStop
         * @triggered when user clicks on stop button
         */
        handleButtonStop: function () {
            app.actions.execute("feeds:stopUpdate");
        },

        /**
         * Renders the indicator (gradient/text)
         * @method render
         * @chainable
         */
        render: function () {
            this.el.classList.add("indicator-visible");

            const { loaded, maxSources } = this;
            if (maxSources === 0 || !this.loading) {
                this.el.classList.add("indicator-invisible");
                return;
            }
            const percentage = Math.round((loaded * 100) / maxSources);
            this.el.querySelector("#indicator-progress").style.background =
                "linear-gradient(to right,  #c5c5c5 " +
                percentage +
                "%, #eee " +
                percentage +
                "%)";
            this.el.querySelector("#indicator-progress").textContent =
                Locale.UPDATING_FEEDS + " (" + loaded + "/" + maxSources + ")";
            this.el.classList.remove("indicator-invisible");
            return this;
        },
    });

    return IndicatorView;
});
