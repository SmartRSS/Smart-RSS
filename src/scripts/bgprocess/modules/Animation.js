/**
 * @module BgProcess
 * @submodule modules/Animation
 */
define(function () {
    /**
     * Handles animation of browser action button icon
     * @class Animation
     * @constructor
     * @extends Object
     */
    const Animation = {
        i: 2,
        interval: null,
        update: function () {
            browser.browserAction.setIcon({
                path: "/images/reload_anim_" + this.i + ".png",
            });
            this.i++;
            if (this.i > 4) {
                this.i = 1;
            }
        },
        stop: function () {
            clearInterval(this.interval);
            this.interval = null;
            this.i = 1;
            this.handleIconChange();
        },
        start: function () {
            if (this.interval) {
                return;
            }
            this.interval = setInterval(() => {
                this.update();
            }, 400);
            this.update();
        },
        handleIconChange: function () {
            if (this.interval) {
                return;
            }
            const icon = settings.get("icon");
            if (sources.findWhere({ hasNew: true }) && icon !== "disabled") {
                browser.browserAction.setIcon({
                    path: "/images/icon19-" + icon + ".png",
                });
            } else {
                browser.browserAction.setIcon({
                    path: "/images/icon19.png",
                });
            }
        },
    };
    return Animation;
});
