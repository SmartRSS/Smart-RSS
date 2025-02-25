/**
 * @module BgProcess
 */

define(function (require) {
    const Animation = require("modules/Animation");
    const Settings = require("models/Settings");
    const Info = require("models/Info");
    const Source = require("models/Source");
    const Sources = require("collections/Sources");
    const Item = require("models/Item");
    const Items = require("collections/Items");
    const Folders = require("collections/Folders");
    const Loader = require("models/Loader");
    const Folder = require("models/Folder");
    const Toolbars = require("collections/Toolbars");

    /**
     * Messages
     */
    function addSource(address) {
        address = address.replace(/^feed:/i, "https:");

        const duplicate = sources.findWhere({ url: address });

        if (duplicate) {
            duplicate.trigger("change");
            openRSS(false, duplicate.get("id"));
            return;
        }
        const source = sources.create(
            {
                title: address,
                url: address,
            },
            { wait: true }
        );
        openRSS(false, source.get("id"));
    }

    function createLinksMenu() {
        if (!getBoolean("displaySubscribeToLink")) {
            return;
        }
        browser.contextMenus.create({
            title: "Subscribe to this feed",
            contexts: ["link"],
            checked: false,
            onclick: (info) => {
                addSource(info.linkUrl);
            },
        });
    }

    function onMessage(message) {
        if (!message.hasOwnProperty("action")) {
            return;
        }

        if (message.action === "load-all") {
            loader.downloadAll(true);
            return;
        }

        if (message.action === "new-rss" && message.value) {
            addSource(message.value);
            return;
        }
        if (message.action === "list-feeds") {
            browser.contextMenus.removeAll();
            createLinksMenu();
            if (!settings.get("detectFeeds")) {
                return;
            }
            setTimeout(() => {
                let feeds = message.value;
                let subscribedFound = 0;
                let unsubscribedFound = 0;
                if (settings.get("hideSubscribedFeeds") === "hide") {
                    feeds = feeds.filter((feed) => {
                        const isFound = !sources.where({ url: feed.url })
                            .length;
                        if (isFound) {
                            subscribedFound++;
                        } else {
                            unsubscribedFound++;
                        }
                        return isFound;
                    });
                } else {
                    feeds = feeds.map((feed) => {
                        const isFound = sources.where({ url: feed.url }).length;
                        if (isFound) {
                            subscribedFound++;
                            feed.title = "[*] " + feed.title;
                        } else {
                            unsubscribedFound++;
                        }
                        return feed;
                    });
                }

                if (feeds.length === 0) {
                    Animation.handleIconChange();
                    return;
                }

                const whenToChangeIcon = settings.get("showNewArticlesIcon");
                let shouldChangeIcon = true;
                if (
                    whenToChangeIcon === "not-subscribed-found" &&
                    unsubscribedFound === 0
                ) {
                    shouldChangeIcon = false;
                }
                if (
                    whenToChangeIcon === "no-subscribed-found" &&
                    subscribedFound > 0
                ) {
                    shouldChangeIcon = false;
                }
                if (whenToChangeIcon === "never") {
                    shouldChangeIcon = false;
                }
                if (shouldChangeIcon) {
                    browser.browserAction.setIcon({
                        path:
                            "/images/icon19-" +
                            settings.get("sourcesFoundIcon") +
                            ".png",
                    });
                }
                browser.contextMenus.create(
                    {
                        id: "SmartRss",
                        contexts: ["browser_action"],
                        title: "Subscribe",
                    },
                    function () {
                        feeds.forEach(function (feed) {
                            browser.contextMenus.create({
                                id: feed.url,
                                title: feed.title,
                                contexts: ["browser_action"],
                                parentId: "SmartRss",
                                onclick: function () {
                                    addSource(feed.url);
                                },
                            });
                        });
                    }
                );
                if (settings.get("badgeMode") === "sources") {
                    browser.browserAction.setBadgeText({
                        text: feeds.length.toString(),
                    });
                }
            }, 250);
        }
        if (message.action === "visibility-lost") {
            Animation.handleIconChange();
            browser.contextMenus.removeAll();
            createLinksMenu();
            if (settings.get("badgeMode") === "sources") {
                browser.browserAction.setBadgeText({ text: "" });
            }
        }
        if (message.action === "get-setting") {
            return new Promise((resolve) => {
                resolve(settings.get(message.key));
            });
        }
        if (message.action === "save-setting") {
            return new Promise((resolve) => {
                settings.save(message.key, message.value);
                resolve(settings.get(message.key));
            });
        }

        if (message.action === "get-settings") {
            return new Promise((resolve) => {
                resolve(settings.attributes);
            });
        }
    }

    browser.runtime.onMessage.addListener(onMessage);

    function openRSS(closeIfActive, focusSource) {
        const url = browser.runtime.getURL("rss.html");
        browser.tabs.query({ url: url }, (tabs) => {
            if (tabs[0]) {
                if (tabs[0].active && closeIfActive) {
                    browser.tabs.remove(tabs[0].id);
                    return;
                }
                browser.tabs.update(tabs[0].id, {
                    active: true,
                });
                if (focusSource) {
                    window.sourceToFocus = focusSource;
                }
                return;
            }
            window.sourceToFocus = focusSource;
            if (settings.get("openInNewTab")) {
                browser.tabs.create(
                    {
                        url: url,
                    },
                    () => {}
                );
            } else {
                browser.tabs.update({ url: url });
            }
        });
    }

    function openInNewTab() {
        browser.tabs.create(
            {
                url: browser.runtime.getURL("rss.html"),
            },
            () => {}
        );
    }

    browser.browserAction.onClicked.addListener(function (tab, onClickData) {
        if (typeof onClickData !== "undefined") {
            if (onClickData.button === 1) {
                openInNewTab();
                return;
            }
        }
        openRSS(true);
    });

    window.openRSS = openRSS;

    /**
     * Update animations
     */
    Animation.start();

    /**
     * Items
     */
    window.Source = Source;
    window.Item = Item;
    window.Folder = Folder;

    /**
     * DB models
     */
    window.settings = new Settings();
    window.info = new Info();
    window.sources = new Sources();
    window.items = new Items();
    window.folders = new Folders();
    window.loaded = false;

    /**
     * This is used for when new feed is subscribed and smart rss tab is opened to focus the newly added feed
     */
    window.sourceToFocus = null;

    window.toolbars = new Toolbars();

    window.loader = new Loader();

    window.valueToBoolean = function (value) {
        if (
            value === 1 ||
            value === "1" ||
            value === "on" ||
            value === "yes" ||
            value === "true" ||
            value === true
        ) {
            return true;
        }
        if (
            value === 0 ||
            value === "0" ||
            value === "off" ||
            value === "no" ||
            value === "false" ||
            value === false
        ) {
            return false;
        }
        return value;
    };

    window.getBoolean = function (name) {
        return valueToBoolean(settings.get(name));
    };

    window.getElementBoolean = function (element, setting) {
        const elementValue = element.get(setting);
        if (elementValue === "global") {
            return getBoolean(setting);
        }
        return valueToBoolean(elementValue);
    };

    window.getElementSetting = function (element, setting) {
        const elementSetting = element.get(setting);
        return elementSetting === "global" || elementSetting === "USE_GLOBAL"
            ? settings.get(setting)
            : elementSetting;
    };

    function fetchOne(tasks) {
        return new Promise((resolve) => {
            if (tasks.length === 0) {
                resolve(true);
                return;
            }
            const oneTask = tasks.shift();
            oneTask.always(function () {
                resolve(fetchOne(tasks));
            });
        });
    }

    function fetchAll() {
        const tasks = [];
        tasks.push(settings.fetch({ silent: true }));
        tasks.push(folders.fetch({ silent: true }));
        tasks.push(sources.fetch({ silent: true }));
        tasks.push(toolbars.fetch({ silent: true }));
        tasks.push(items.fetch({ silent: true }));

        return fetchOne(tasks);
    }

    window.fetchAll = fetchAll;
    window.fetchOne = fetchOne;
    window.reloadExt = function () {
        browser.runtime.reload();
    };

    window.appStarted = new Promise((resolve) => {
        /**
         * Init
         */

        fetchAll().then(function () {
            window.items.sort();
            /**
             * Load counters for specials
             */
            info.refreshSpecialCounters();

            /**
             * Set events
             */

            sources.on("add", function (source) {
                loader.download(source);
            });

            sources.on("change:url", function (source) {
                loader.download(source);
            });

            sources.on("change:title", function (source) {
                if (!source.get("title")) {
                    loader.download(source);
                }
                sources.sort();
            });

            sources.on("change:hasNew", Animation.handleIconChange);
            settings.on("change:icon", Animation.handleIconChange);

            info.setEvents(sources);

            /**
             * Init
             */

            const version = settings.get("version") || 0;
            if (version < 1) {
                items.forEach((item) => {
                    item.save("id", item.get("id") + item.get("sourceID"));
                });
                settings.save("version", 1);
            }

            browser.alarms.create("scheduler", {
                periodInMinutes: 1,
            });

            browser.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name === "scheduler") {
                    if (!settings.get("disableAutoUpdate")) {
                        loader.downloadAll();
                    }
                    const trashCleaningDelay = settings.get("autoremovetrash");
                    if (trashCleaningDelay === 0) {
                        return;
                    }
                    const now = Date.now();
                    const trashCleaningDelayInMs =
                        trashCleaningDelay * 1000 * 60 * 60 * 24;
                    items
                        .where({ trashed: true, deleted: false })
                        .forEach((item) => {
                            if (
                                now - item.get("trashedOn") >
                                trashCleaningDelayInMs
                            ) {
                                item.markAsDeleted();
                            }
                        });
                }
            });

            /**
             * onclick:button -> open RSS
             */
            createLinksMenu();

            /**
             * Set icon
             */
            Animation.stop();
            window.loaded = true;
            resolve(true);
        });
    });
});
