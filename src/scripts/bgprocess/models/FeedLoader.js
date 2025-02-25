/**
 * @module BgProcess
 * @submodule models/FeedLoader
 */
define(["modules/RSSParser", "favicon"], function (RSSParser, Favicon) {
    return class FeedLoader {
        constructor(loader) {
            this.loader = loader;
            this.request = new XMLHttpRequest();
            this.request.timeout = 1000 * 15; // TODO: make configurable
            this.request.onload = this.onLoad.bind(this);
            this.request.onerror = this.onError.bind(this);
            this.request.ontimeout = this.onTimeout.bind(this);
            this.request.onabort = this.onAbort.bind(this);
        }

        onAbort() {
            this.model.save({ isLoading: false });
        }

        parseProxyResponse() {
            const response = JSON.parse(this.request.responseText);
            return response.items.map((item) => {
                const canonical = item.canonical
                    ? item.canonical[0]
                    : item.alternate[0];
                return {
                    id: item.originId,
                    title: item.title,
                    url: canonical.href,
                    date: item.updated
                        ? item.updated
                        : item.published
                        ? item.published
                        : Date.now(),
                    author: item.author ? item.author : "",
                    content: item.content
                        ? item.content.content
                        : item.summary.content,
                    sourceID: this.model.get("id"),
                    dateCreated: Date.now(),
                };
            });
        }

        parseResponse() {
            const response = this.request.responseText;
            const parser = new RSSParser(response, this.model);
            return parser.parse();
        }

        onLoad() {
            let parsedData = [];
            const queries = settings.get("queries");
            let modelUrl = this.model.get("url");
            const proxy = this.model.get("proxyThroughFeedly");
            const modelId = this.model.get("id");
            let lastArticle = this.model.get("lastArticle");

            try {
                parsedData = proxy
                    ? this.parseProxyResponse()
                    : this.parseResponse();
            } catch (e) {
                console.log(`Couldn't parse`, modelUrl, e);
                return this.onFeedProcessed({ success: false });
            }

            let foundNewArticles = false;
            let createdNo = 0;
            const currentItems = items.where({
                sourceID: modelId,
            });
            const earliestDate = Math.min(
                0,
                ...currentItems.map((item) => {
                    return item.get("date");
                })
            );

            RegExp.escape = function (text) {
                return String(text).replace(/[\-\[\]\/{}()*+?.\\^$|]/g, "\\$&");
            };
            const insert = [];

            parsedData.forEach((item) => {
                const existingItem =
                    items.get(item.id) || items.get(item.oldId);

                if (existingItem) {
                    if (existingItem.get("deleted")) {
                        return;
                    }
                    const areDifferent = function (newItem, existingItem) {
                        const existingContent = existingItem.get("content");
                        const newContent = newItem.content;
                        if (existingContent !== newContent) {
                            const existingContentFragment = document
                                .createRange()
                                .createContextualFragment(existingContent);
                            if (!existingContentFragment) {
                                return true;
                            }
                            const newContentFragment = document
                                .createRange()
                                .createContextualFragment(newContent);
                            if (!newContentFragment) {
                                return true;
                            }
                            let existingContentText = "";
                            [...existingContentFragment.children].forEach(
                                (child) => {
                                    existingContentText += child.innerText;
                                }
                            );

                            let newContentText = "";
                            [...newContentFragment.children].forEach(
                                (child) => {
                                    newContentText += child.innerText;
                                }
                            );

                            if (!existingContentText) {
                                return true;
                            }
                            if (
                                existingContentText.trim() !==
                                newContentText.trim()
                            ) {
                                return true;
                            }
                        }
                        return (
                            existingItem.get("title").trim() !==
                            newItem.title.trim()
                        );
                    };

                    if (areDifferent(item, existingItem)) {
                        insert.push({
                            id: item.id,
                            content: item.content,
                            title: item.title,
                            date: item.date,
                            author: item.author,
                            enclosure: item.enclosure,
                            unread: true,
                            visited: false,
                            parsedContent: {},
                        });
                        // existingItem.save({
                        //     content: item.content,
                        //     title: item.title,
                        //     date: item.date,
                        //     author: item.author,
                        //     enclosure: item.enclosure,
                        //     unread: true,
                        //     visited: false,
                        //     parsedContent: {}
                        // });
                    }
                    return;
                }
                if (earliestDate > item.date) {
                    console.log(
                        "discarding entry with date older than the earliest know article in the feed",
                        modelUrl
                    );
                    return;
                }
                foundNewArticles = true;
                item.pinned = queries.some((query) => {
                    query = query.trim();
                    if (!query) {
                        return false;
                    }
                    let searchInContent = false;
                    if (query[0] && query[0] === ":") {
                        query = query.replace(/^:/, "", query);
                        searchInContent = true;
                    }
                    if (!query) {
                        return false;
                    }
                    const expression = new RegExp(RegExp.escape(query), "i");

                    const cleanedTitle = item.title
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                    const cleanedAuthor = item.author
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                    const cleanedContent = searchInContent
                        ? item.content
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                        : "";
                    return (
                        expression.test(cleanedTitle) ||
                        expression.test(cleanedAuthor) ||
                        (searchInContent && expression.test(cleanedContent))
                    );
                });

                insert.push(item);
                lastArticle = Math.max(lastArticle, item.date);
                createdNo++;
            });
            items.add(insert, { sort: false, merge: true });

            // Explicitly save each new item to ensure persistence
            if (insert.length > 0) {
                insert.forEach((item) => {
                    const model = items.get(item.id);
                    if (model) {
                        model.save();
                    }
                });
            }

            items.sort({
                silent: true,
            });
            if (foundNewArticles) {
                items.trigger("search");
                loader.itemsDownloaded = true;
                // remove old deleted content
                const fetchedIDs = parsedData.map((item) => {
                    return item.id;
                });
                if (fetchedIDs.length > 0) {
                    items
                        .where({
                            sourceID: modelId,
                            deleted: true,
                        })
                        .forEach((item) => {
                            if (item.emptyDate) {
                                return;
                            }
                            if (fetchedIDs.includes(item.id)) {
                                return;
                            }
                            item.destroy();
                        });
                }
            }

            const articlesCount = items.where({
                sourceID: modelId,
                trashed: false,
            }).length;

            const unreadArticlesCount = items.where({
                sourceID: this.model.get("id"),
                unread: true,
                trashed: false,
            }).length;

            if (this.request.responseURL !== modelUrl) {
                modelUrl = this.request.responseURL;
            }

            const modelUpdate = {
                count: unreadArticlesCount,
                countAll: articlesCount,
                lastUpdate: Date.now(),
                hasNew: foundNewArticles || this.model.get("hasNew"),
                lastStatus: 200,
                lastArticle: lastArticle,
                url: modelUrl,
            };

            info.set({
                allCountUnvisited: info.get("allCountUnvisited") + createdNo,
            });

            function isFaviconExpired(model) {
                return (
                    model.get("faviconExpires") <
                    Math.round(new Date().getTime() / 1000)
                );
            }

            if (isFaviconExpired(this.model)) {
                return Favicon.getFavicon(this.model)
                    .then(
                        (response) => {
                            modelUpdate.favicon = response.favicon;
                            modelUpdate.faviconExpires =
                                response.faviconExpires;
                        },
                        (err) => {
                            modelUpdate.faviconExpires =
                                Math.round(new Date().getTime() / 1000) +
                                60 * 60 * 24 * 7;
                            console.warn(
                                `Couldn't load favicon for:`,
                                modelUrl,
                                err
                            );
                        }
                    )
                    .finally(() => {
                        return this.onFeedProcessed({ data: modelUpdate });
                    });
            }

            return this.onFeedProcessed({ data: modelUpdate });
        }

        onTimeout() {
            return this.onFeedProcessed({ success: false });
        }

        onError() {
            this.model.save({
                lastStatus: this.request.status,
            });
            return this.onFeedProcessed({
                success: false,
                isOnline: this.request.status > 0,
            });
        }

        getAutoRemoveTime(model) {
            return parseInt(model.get("autoremove")) === -1
                ? parseInt(settings.get("autoremove"))
                : parseInt(model.get("autoremove"));
        }

        getAutoRemoveSetting(model) {
            return getElementSetting(model, "autoremovesetting");
        }

        removeOldItems() {
            const autoRemove = this.getAutoRemoveTime(this.model);
            if (!autoRemove) {
                return;
            }
            const itemsFilter = {
                sourceID: this.model.get("id"),
                deleted: false,
                pinned: false,
            };

            const autoRemoveSetting = this.getAutoRemoveSetting(this.model);
            if (autoRemoveSetting === "KEEP_UNVISITED") {
                itemsFilter["visited"] = true;
            }

            if (autoRemoveSetting === "KEEP_UNREAD") {
                itemsFilter["unread"] = false;
                itemsFilter["visited"] = true;
            }

            const now = Date.now();
            items.where(itemsFilter).forEach((item) => {
                const date = item.get("dateCreated") || item.get("date");
                const removalDelayInMs =
                    this.getAutoRemoveTime(this.model) * 24 * 60 * 60 * 1000;
                if (now - date > removalDelayInMs) {
                    item.markAsDeleted();
                }
            });
        }

        onFeedProcessed(result = {}) {
            const success = `success` in result ? result.success : true;
            const isOnline =
                `isOnline` in result
                    ? result.isOnline &&
                      (typeof navigator.onLine !== "undefined"
                          ? navigator.onLine
                          : true)
                    : true;
            if (success && isOnline) {
                this.removeOldItems(this.model);
            }
            const data = `data` in result ? result.data : {};
            Object.assign(data, {
                isLoading: false,
                lastChecked: Date.now(),
                errorCount: success
                    ? 0
                    : isOnline
                    ? this.model.get("errorCount") + 1
                    : this.model.get("errorCount"),
                folderID:
                    this.model.get("folderID") === ""
                        ? "0"
                        : this.model.get("folderID"),
            });

            this.model.save(data);
            this.model.trigger("update", { ok: success || !isOnline });
            this.loader.sourceLoaded(this.model);
            this.downloadNext();
        }

        downloadNext() {
            this.model = this.loader.sourcesToLoad.shift();
            if (!this.model) {
                return this.loader.workerFinished(this);
            }
            if (loader.sourcesLoading.includes(this.model)) {
                // may happen if source is still loading after last attempt
                return this.downloadNext();
            }

            let sourceUrl = this.model.get("url");
            const origin = new URL(sourceUrl).origin;
            navigator.locks
                .request(origin, () => {
                    if (
                        Date.now() <
                            (this.loader.timestamps[origin] || 0) + 1000 * 1 &&
                        origin.includes("openrss.org")
                    ) {
                        return false;
                    }
                    this.loader.timestamps[origin] = Date.now();
                    return true;
                })
                .then((canContinue) => {
                    if (!canContinue) {
                        this.loader.sourcesToLoad.push(this.model);
                        return this.downloadNext();
                    }

                    this.loader.sourcesLoading.push(this.model);
                    if (settings.get("showSpinner")) {
                        this.model.set("isLoading", true);
                    }
                    const shouldUseFeedlyCache =
                        this.model.get("proxyThroughFeedly");
                    if (shouldUseFeedlyCache) {
                        const itemsArray = items.where({
                            sourceID: this.model.get("sourceID"),
                        });
                        let date = 0;
                        itemsArray.forEach((item) => {
                            if (item.date > date) {
                                date = item.date;
                            }
                        });
                        sourceUrl =
                            "https://cloud.feedly.com/v3/streams/contents?streamId=feed%2F" +
                            encodeURIComponent(sourceUrl) +
                            "&count=" +
                            1000 +
                            ("&newerThan=" + date);
                    }
                    this.request.open("GET", sourceUrl);
                    if (sourceUrl.startsWith("https://openrss.org/")) {
                        this.request.setRequestHeader(
                            "User-Agent",
                            navigator.userAgent + " + SmartRSS"
                        );
                    }
                    if (
                        !shouldUseFeedlyCache &&
                        (this.model.get("username") ||
                            this.model.get("password"))
                    ) {
                        const username = this.model.get("username") || "";
                        const password = this.model.getPass() || "";
                        this.request.withCredentials = true;
                        this.request.setRequestHeader(
                            "Authorization",
                            "Basic " + btoa(`${username}:${password}`)
                        );
                    }
                    this.request.send();
                });
        }
    };
});
