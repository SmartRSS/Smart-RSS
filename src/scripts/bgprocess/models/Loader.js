/**
 * @module BgProcess
 * @submodule models/Loader
 */
define([
    "backbone",
    "modules/RSSParser",
    "modules/Animation",
    "favicon",
    "models/FeedLoader",
], function (BB, RSSParser, animation, Favicon, FeedLoader) {
    /**
     * Updates feeds and keeps info about progress
     * @class Loader
     * @constructor
     * @extends Backbone.Model
     */
    return class Loader {
        connected(p) {
            this.port = p;
            p.onDisconnect.addListener(() => {
                this.port = null;
            });
        }

        get loading() {
            return this._loading;
        }

        get loaded() {
            return this._loaded;
        }

        get maxSources() {
            return this._maxSources;
        }

        set loading(value) {
            this._loading = value;
            if (this.port !== null) {
                this.port.postMessage({
                    key: "loading",
                    value: value,
                });
            }
        }

        set maxSources(value) {
            this._maxSources = value;
            if (this.port !== null) {
                this.port.postMessage({
                    key: "maxSources",
                    value: value,
                });
            }
        }

        set loaded(value) {
            this._loaded = value;
            if (this.port !== null) {
                this.port.postMessage({
                    key: "loaded",
                    value: value,
                });
            }
        }

        constructor() {
            browser.runtime.onConnect.addListener(this.connected.bind(this));
            this.port = null;
            this._maxSources = 0;
            this._loaded = 0;
            this._loading = false;
            this.sourcesToLoad = [];
            this.sourcesLoading = [];
            this.itemsDownloaded = false;
            this.sourcesLoading = [];
            this.loaders = [];
            this.timestamps = {};
        }

        addSources(source) {
            if (source instanceof Folder) {
                this.addSources(
                    sources.where({
                        folderID: source.id,
                    })
                );
                return;
            }
            if (Array.isArray(source)) {
                source.forEach((s) => {
                    this.addSources(s);
                });
                return;
            }
            if (source instanceof Source) {
                // don't add source to list if it is there already, it's going to get loaded soon enough
                if (this.sourcesToLoad.includes(source)) {
                    return;
                }
                this.sourcesToLoad.push(source);
                this.maxSources = this.maxSources + 1;
            }
        }

        abortDownloading() {
            this.sourcesToLoad = [];
            this.loaders.forEach((loader) => {
                loader.request.abort();
                loader.request = null;
                delete loader.request;
                loader = null;
            });
            this.loaders = [];
            this.sourcesLoading = [];
            this.workersFinished();
        }

        startDownloading() {
            const workersRunning = this.loaders.length;
            this.loading = true;
            animation.start();
            const maxWorkers = Math.min(
                settings.get("concurrentDownloads"),
                this.sourcesToLoad.length
            );
            const workers = Math.max(0, maxWorkers - workersRunning);
            for (let i = 0; i < workers; i++) {
                const feedLoader = new FeedLoader(this);
                this.loaders.push(feedLoader);
                feedLoader.downloadNext();
            }
        }

        download(sourcesToDownload) {
            if (!sourcesToDownload) {
                return;
            }
            if (!Array.isArray(sourcesToDownload)) {
                sourcesToDownload = [sourcesToDownload];
            }
            this.addSources(sourcesToDownload);
            this.startDownloading();
        }

        downloadAll(force) {
            let sourcesArr = sources.toArray();
            if (!force) {
                let globalUpdateFrequency = settings.get("updateFrequency");
                sourcesArr = sourcesArr.filter(function (source) {
                    let sourceUpdateFrequency = source.get("updateEvery");
                    if (sourceUpdateFrequency === 0) {
                        return false;
                    }
                    let updateFrequency =
                        sourceUpdateFrequency > 0
                            ? sourceUpdateFrequency
                            : globalUpdateFrequency;
                    if (updateFrequency === 0) {
                        return false;
                    }
                    const lastChecked = source.get("lastChecked");
                    if (!lastChecked) {
                        return true;
                    }
                    const multiplier = 1 + source.get("errorCount");
                    const finalFrequency =
                        Math.min(
                            updateFrequency * 60 * 1000 * multiplier,
                            7 * 24 * 60 * 60 * 1000
                        ) -
                        60 * 1000;
                    // reduce by a minute to not delay loading by extra minute if new load starts early
                    return lastChecked <= Date.now() - finalFrequency;
                });
            }
            // no sources to load yet
            if (sourcesArr.length === 0) {
                return;
            }
            // add sources to list
            this.addSources(sourcesArr);
            this.startDownloading();
        }

        handleNotifications() {
            if (settings.get("soundNotifications")) {
                this.playNotificationSound();
            }
            if (settings.get("systemNotifications")) {
                this.displaySystemNotification();
            }
        }

        displaySystemNotification() {
            browser.notifications.create({
                type: "basic",
                title: "Smart RSS",
                message: "New articles found",
            });
        }

        playNotificationSound() {
            let audio;
            if (
                !settings.get("useSound") ||
                settings.get("useSound") === ":user"
            ) {
                audio = new Audio(settings.get("defaultSound"));
            } else if (settings.get("useSound") === ":none") {
                audio = false;
            } else {
                audio = new Audio(
                    "/sounds/" + settings.get("useSound") + ".ogg"
                );
            }
            if (audio) {
                audio.volume = parseFloat(settings.get("soundVolume"));
                audio.play();
            }
        }

        workerFinished(worker) {
            const loaderIndex = this.loaders.indexOf(worker);
            if (loaderIndex > -1) {
                this.loaders[loaderIndex] = null;
                this.loaders.splice(loaderIndex, 1);
            }
            if (this.loaders.length > 0) {
                return;
            }
            this.workersFinished();
        }

        workersFinished() {
            // IF DOWNLOADING FINISHED, DELETE ITEMS WITH DELETED SOURCE (should not really happen)
            const sourceIDs = sources.pluck("id");
            let foundSome = false;
            items.toArray().forEach((item) => {
                if (sourceIDs.indexOf(item.get("sourceID")) === -1) {
                    item.destroy();
                    foundSome = true;
                }
            });
            if (foundSome) {
                info.refreshSpecialCounters();
            }
            if (this.itemsDownloaded) {
                this.handleNotifications();
            }
            this.maxSources = 0;
            this.loaded = 0;
            this.loading = false;
            this.itemsDownloaded = false;
            this.sourcesToLoad = [];
            this.loaders = [];
            this.sourcesLoading = [];
            animation.stop();
        }

        sourceLoaded(model) {
            this.loaded++;
            const modelIndex = this.sourcesLoading.indexOf(model);
            if (modelIndex > -1) {
                this.sourcesLoading.splice(modelIndex, 1);
            }
        }
    };
});
