define(["helpers/stripTags", "modules/Locale", "controllers/comm"], function (
    stripTags,
    L,
    comm
) {
    return {
        global: {
            default: {
                title: "Unknown",
                fn: function () {
                    alert("no action");
                },
            },
            hideOverlays: {
                title: L.HIDE_OVERLAYS,
                fn: function () {
                    comm.trigger("hide-overlays");
                },
            },
            openOptions: {
                title: L.OPTIONS,
                icon: "options.png",
                fn: function () {
                    browser.runtime.openOptionsPage();
                },
            },
        },
        feeds: {
            toggleShowOnlyUnread: {
                // icon: 'icon16.png',
                glyph: "📰",
                state: "showOnlyUnreadSources",
                title: L.TOGGLE_SHOW_ONLY_UNREAD,
                fn: function () {
                    const currentUnread = bg.getBoolean(
                        "showOnlyUnreadSources"
                    );
                    bg.settings.save("showOnlyUnreadSources", !currentUnread);
                },
            },
            updateAll: {
                icon: "reload.png",
                title: L.UPDATE_ALL,
                fn: function () {
                    browser.runtime.sendMessage({ action: "load-all" });
                },
            },
            update: {
                icon: "reload.png",
                title: L.UPDATE,
                fn: function () {
                    const selectedItems =
                        require("views/feedList").selectedItems;
                    if (selectedItems.length) {
                        const models = selectedItems.map((item) => {
                            return item.model;
                        });
                        bg.loader.download(models);
                    }
                },
            },
            stopUpdate: {
                icon: "stop.png",
                title: L.STOP_UPDATE,
                fn: function () {
                    bg.loader.abortDownloading();
                },
            },
            mark: {
                icon: "read.png",
                title: L.MARK_ALL_AS_READ,
                fn: function () {
                    const selectedFeeds =
                        require("views/feedList").getSelectedFeeds();
                    if (!selectedFeeds.length) {
                        return;
                    }

                    bg.items.forEach(function (item) {
                        if (
                            item.get("unread") === true &&
                            selectedFeeds.indexOf(item.getSource()) >= 0
                        ) {
                            item.save({
                                unread: false,
                                visited: true,
                            });
                        }
                    });

                    selectedFeeds.forEach(function (source) {
                        if (source.get("hasNew")) {
                            source.save({ hasNew: false });
                        }
                    });
                },
            },
            openHome: {
                title: L.OPEN_HOME,
                fn: function () {
                    const selectedFeeds =
                        require("views/feedList").getSelectedFeeds();
                    if (!selectedFeeds.length) {
                        return;
                    }
                    selectedFeeds.forEach((source) => {
                        browser.tabs.create({
                            url: source.get("base"),
                            active: false,
                        });
                    });
                },
            },
            refetch: {
                title: L.REFETCH,
                fn: function () {
                    const selectedFeeds =
                        require("views/feedList").getSelectedFeeds();
                    if (!selectedFeeds.length) {
                        return;
                    }
                    selectedFeeds.forEach(function (source) {
                        bg.items
                            .where({ sourceID: source.get("id") })
                            .forEach(function (item) {
                                item.destroy();
                            });
                    });
                    app.actions.execute("feeds:update");
                },
            },
            delete: {
                icon: "delete.png",
                title: L.DELETE,
                fn: function () {
                    if (!confirm(L.REALLY_DELETE)) {
                        return;
                    }

                    const feeds = require("views/feedList").getSelectedFeeds();
                    const folders =
                        require("views/feedList").getSelectedFolders();

                    feeds.forEach(function (feed) {
                        feed.destroy();
                    });

                    folders.forEach(function (folder) {
                        folder.destroy();
                    });
                },
            },
            scrollIntoView: {
                icon: "back.png",
                title: L.SCROLL_INTO_VIEW,
                fn: function () {
                    const folders =
                        require("views/feedList").getSelectedFolders();

                    if (folders.length > 0) {
                        const id = folders[0].get("id");
                        const sourceElement = document.querySelector(
                            `[data-id="${id}"]`
                        );
                        sourceElement.scrollIntoView();
                        return;
                    }

                    const feeds = require("views/feedList").getSelectedFeeds();
                    if (feeds.length > 0) {
                        const id = feeds[0].get("id");
                        const sourceElement = document.querySelector(
                            `[data-id="${id}"]`
                        );
                        sourceElement.scrollIntoView();
                    }
                },
            },
            showProperties: {
                icon: "properties.png",
                title: L.PROPERTIES,
                fn: function () {
                    const properties = app.feeds.properties;
                    const feedList = require("views/feedList");
                    const feeds = feedList.getSelectedFeeds();
                    const folders = feedList.getSelectedFolders();

                    if (
                        feedList.selectedItems.length === 1 &&
                        folders.length === 1
                    ) {
                        properties.show(folders[0]);
                    } else if (!folders.length && feeds.length === 1) {
                        properties.show(feeds[0]);
                    } else if (feeds.length > 0) {
                        properties.show(feeds);
                    }
                },
            },
            addSource: {
                icon: "add.png",
                title: L.ADD_RSS_SOURCE,
                fn: function () {
                    let url = (prompt(L.RSS_FEED_URL) || "").trim();
                    if (!url) {
                        return;
                    }

                    let folderID = "0";
                    const list = require("views/feedList");
                    if (
                        list.selectedItems.length &&
                        list.selectedItems[0].el.classList.contains("folder")
                    ) {
                        const fid = list.selectedItems[0].model.get("id");
                        // make sure source is not added to folder which is not in db
                        if (bg.folders.get(fid)) {
                            folderID = fid;
                        }
                    }

                    url = app.fixURL(url);
                    const uid = url
                        .replace(/^(.*:)?(\/\/)?(www*?\.)?/, "")
                        .replace(/\/$/, "");
                    const duplicate = bg.sources.findWhere({ uid: uid });

                    if (!duplicate) {
                        const newFeed = bg.sources.create(
                            {
                                title: url,
                                url: url,
                                updateEvery: -1,
                                folderID: folderID,
                            },
                            { wait: true }
                        );
                        app.trigger("focus-feed", newFeed.get("id"));
                    } else {
                        app.trigger("focus-feed", duplicate.get("id"));
                    }
                },
            },
            addFolder: {
                icon: "add_folder.png",
                title: L.NEW_FOLDER,
                fn: function () {
                    const title = (prompt(L.FOLDER_NAME + ": ") || "").trim();
                    if (!title) {
                        return;
                    }

                    bg.folders.create(
                        {
                            title: title,
                        },
                        { wait: true }
                    );
                },
            },
            focus: {
                title: L.FOCUS_FEEDS,
                fn: function () {
                    app.setFocus("feeds");
                },
            },
            selectNext: {
                title: L.SELECT_NEXT_FEED,
                fn: function (event) {
                    require("views/feedList").selectNextSelectable(event);
                },
            },
            selectPrevious: {
                title: L.SELECT_PREVIOUS_FEED,
                fn: function (event) {
                    require("views/feedList").selectPrev(event);
                },
            },
            closeFolders: {
                title: L.CLOSE_FOLDERS,
                fn: function (event) {
                    const folders = Array.from(
                        document.querySelectorAll(".folder.opened")
                    );
                    if (!folders.length) {
                        return;
                    }
                    folders.forEach((folder) => {
                        if (folder.view) {
                            folder.view.handleClickArrow(event);
                        }
                    });
                },
            },
            openFolders: {
                title: L.OPEN_FOLDERS,
                fn: function (event) {
                    const folders = Array.from(
                        document.querySelectorAll(".folder:not(.opened)")
                    );
                    folders.forEach((folder) => {
                        if (folder.view) {
                            folder.view.handleClickArrow(event);
                        }
                    });
                },
            },
            toggleFolder: {
                title: L.TOGGLE_FOLDER,
                fn: function (event) {
                    event = event || {};
                    const selectedItems =
                        require("views/feedList").selectedItems;
                    if (
                        selectedItems.length &&
                        selectedItems[0].el.classList.contains("folder")
                    ) {
                        selectedItems[0].handleClickArrow(event);
                    }
                },
            },
            showArticles: {
                title: L.SHOW_ARTICLES,
                fn: function (event = {}) {
                    const target = event.target || {};
                    const feedList = require("views/feedList");
                    const feeds = feedList.getSelectedFeeds();
                    const feedIds = feeds.map((feed) => {
                        return feed.id;
                    });
                    let special = Array.from(
                        document.querySelectorAll(".special.selected")
                    )[0];
                    if (special) {
                        special = special.view.model;
                    }
                    const folder = Array.from(
                        document.querySelectorAll(".folder.selected")
                    )[0];

                    let unreadOnly = false;
                    if (bg.getBoolean("defaultToUnreadOnly")) {
                        unreadOnly = true;
                    }

                    if (bg.getBoolean("showOnlyUnreadSources")) {
                        unreadOnly = true;
                    }

                    if (
                        !!event.altKey ||
                        target.className === "source-counter"
                    ) {
                        unreadOnly = !unreadOnly;
                    }

                    app.trigger("select:" + feedList.el.id, {
                        action: "new-select",
                        feeds: feedIds,
                        filter: special
                            ? Object.assign({}, special.get("filter"))
                            : null,
                        name: special ? special.get("name") : null,
                        multiple: !!(special || folder),
                        unreadOnly: unreadOnly,
                    });

                    if (special && special.get("name") === "all-feeds") {
                        bg.sources.forEach((source) => {
                            if (source.get("hasNew")) {
                                source.save({ hasNew: false });
                            }
                        });
                    } else if (feedIds.length) {
                        bg.sources.forEach((source) => {
                            if (
                                source.get("hasNew") &&
                                feedIds.includes(source.id)
                            ) {
                                source.save({ hasNew: false });
                            }
                        });
                    }
                },
            },
            showAndFocusArticles: {
                title: L.SHOW_AND_FOCUS_ARTICLES,
                fn: function (event) {
                    event = event || {};
                    const selectedItems =
                        require("views/feedList").selectedItems;
                    if (selectedItems.length) {
                        app.actions.execute("feeds:showArticles", event);
                        app.actions.execute("articles:focus");
                    }
                },
            },
        },
        articles: {
            mark: {
                icon: "read.png",
                title: L.MARK_AS_READ,
                fn: function () {
                    require("views/articleList").changeUnreadState();
                },
            },
            toggleShowOnlyUnread: {
                // icon: 'icon16.png',
                glyph: "📰",
                state: "defaultToUnreadOnly",
                title: L.DEFAULT_TO_UNREAD_ONLY,
                fn: function () {
                    const currentUnread = bg.getBoolean("defaultToUnreadOnly");
                    bg.settings.save("defaultToUnreadOnly", !currentUnread);
                },
            },
            update: {
                icon: "reload.png",
                title: L.UPDATE,
                fn: function () {
                    const list = require("views/articleList");
                    if (list.currentData.feeds.length) {
                        list.currentData.feeds.forEach((id) => {
                            bg.loader.download(bg.sources.get(id));
                        });
                    } else {
                        browser.runtime.sendMessage({ action: "load-all" });
                    }
                },
            },
            delete: {
                icon: "delete.png",
                title: L.DELETE,
                fn: function (event) {
                    const activeElement = document.activeElement;
                    const toFocus = activeElement.closest(".region");
                    const list = require("views/articleList");
                    if (list.currentData.name === "trash" || event.shiftKey) {
                        if (!confirm("Remove selected items permanently?")) {
                            return;
                        }
                        list.destroyBatch(
                            list.selectedItems,
                            list.removeItemCompletely
                        );
                    } else {
                        list.destroyBatch(list.selectedItems, list.removeItem);
                    }
                    toFocus.focus();
                },
            },
            undelete: {
                icon: "undelete.png",
                title: L.UNDELETE,
                fn: function () {
                    const articleList = require("views/articleList");
                    if (
                        !articleList.selectedItems ||
                        !articleList.selectedItems.length ||
                        articleList.currentData.name !== "trash"
                    ) {
                        return;
                    }
                    articleList.destroyBatch(
                        articleList.selectedItems,
                        articleList.undeleteItem
                    );
                },
            },
            selectNext: {
                title: L.SELECT_NEXT_ARTICLE,
                fn: function (event) {
                    require("views/articleList").selectNextSelectable(event);
                },
            },
            selectPrevious: {
                title: L.SELECT_PREVIOUS_ARTICLE,
                fn: function (event) {
                    require("views/articleList").selectPrev(event);
                },
            },
            search: {
                title: L.SEARCH_TIP,
                fn: function (event) {
                    event = event || {
                        currentTarget:
                            document.querySelector("input[type=search]"),
                    };
                    let query = event.currentTarget.value || "";
                    const list = require("views/articleList");
                    if (query === "") {
                        [
                            ...document.querySelectorAll(
                                ".date-group, .articles-list-item"
                            ),
                        ].map((element) => {
                            element.classList.remove("hidden");
                        });
                        return;
                    } else {
                        [...document.querySelectorAll(".date-group")].map(
                            (element) => {
                                element.classList.add("hidden");
                            }
                        );
                    }

                    let searchInContent = false;
                    if (query[0] && query[0] === ":") {
                        query = query.replace(/^:/, "", query);
                        searchInContent = true;
                    }
                    RegExp.escape = function (text) {
                        return String(text).replace(
                            /[-[\]/{}()*+?.\\^$|]/g,
                            "\\$&"
                        );
                    };
                    const expression = new RegExp(RegExp.escape(query), "i");
                    const selectedSpecial = document.querySelector(
                        ".sources-list-item.selected.special"
                    );
                    list.views.some(function (view) {
                        if (!view.model) {
                            return false;
                        }
                        const sourceId = view.model.get("sourceID");
                        const sourceItem = document.querySelector(
                            '[data-id="' + sourceId + '"]'
                        );
                        if (!sourceItem) {
                            return false;
                        }
                        if (!sourceItem.classList.contains("selected")) {
                            const folderId =
                                sourceItem.view.model.get("folderID");
                            const folderItem = document.querySelector(
                                '[data-id="' + folderId + '"]'
                            );

                            if (!selectedSpecial && !folderItem) {
                                return false;
                            }
                        }
                        const cleanedTitle = view.model
                            .get("title")
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "");
                        const cleanedAuthor = view.model
                            .get("author")
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "");
                        const cleanedContent = searchInContent
                            ? view.model
                                  .get("content")
                                  .normalize("NFD")
                                  .replace(/[\u0300-\u036f]/g, "")
                            : "";

                        if (
                            !(
                                expression.test(cleanedTitle) ||
                                expression.test(cleanedAuthor) ||
                                (searchInContent &&
                                    expression.test(cleanedContent))
                            )
                        ) {
                            view.el.classList.add("hidden");
                        } else {
                            view.el.classList.remove("hidden");
                        }
                    });
                },
            },
            focusSearch: {
                title: L.FOCUS_SEARCH,
                fn: function () {
                    document.querySelector("input[type=search]").focus();
                },
            },
            focus: {
                title: L.FOCUS_ARTICLES,
                fn: function () {
                    app.setFocus("articles");
                },
            },
            fullArticle: {
                title: L.FULL_ARTICLE,
                icon: "full_article.png",
                fn: function (event) {
                    const articleList = app.articles.articleList;
                    if (
                        !articleList.selectedItems ||
                        !articleList.selectedItems.length
                    ) {
                        return;
                    }
                    if (
                        articleList.selectedItems.length > 10 &&
                        bg.getBoolean("askOnOpening")
                    ) {
                        if (
                            !confirm(
                                "Do you really want to open " +
                                    articleList.selectedItems.length +
                                    " articles?"
                            )
                        ) {
                            return;
                        }
                    }
                    const openNewTab = bg.settings.get("openNewTab");
                    const active =
                        openNewTab === "background"
                            ? !!event.shiftKey
                            : !event.shiftKey;
                    articleList.selectedItems.forEach(function (item) {
                        browser.tabs.create({
                            url: stripTags(item.model.get("url")),
                            active: active,
                        });
                    });
                },
            },
            oneFullArticle: {
                title: L.FULL_ARTICLE_SINGLE,
                fn: function (event) {
                    event = event || {};
                    const articleList = app.articles.articleList;
                    let view;
                    if ("currentTarget" in event) {
                        view = event.currentTarget.view;
                    } else {
                        if (
                            !articleList.selectedItems ||
                            !articleList.selectedItems.length
                        ) {
                            return;
                        }
                        view = articleList.selectedItems[0];
                    }
                    if (view.model) {
                        const openNewTab = bg.settings.get("openNewTab");
                        const active =
                            openNewTab === "background"
                                ? !!event.shiftKey
                                : !event.shiftKey;

                        browser.tabs.create({
                            url: stripTags(view.model.get("url")),
                            active: active,
                        });
                    }
                },
            },
            markAndNextUnread: {
                title: L.MARK_AND_NEXT_UNREAD,
                icon: "find_next.png",
                fn: function () {
                    require("views/articleList").changeUnreadState({
                        onlyToRead: true,
                    });
                    require("views/articleList").selectNextSelectable({
                        selectUnread: true,
                    });
                },
            },
            markAndPrevUnread: {
                title: L.MARK_AND_PREV_UNREAD,
                icon: "find_previous.png",
                fn: function () {
                    require("views/articleList").changeUnreadState({
                        onlyToRead: true,
                    });
                    require("views/articleList").selectPrev({
                        selectUnread: true,
                    });
                },
            },
            nextUnread: {
                title: L.NEXT_UNREAD,
                icon: "forward.png",
                fn: function () {
                    require("views/articleList").selectNextSelectable({
                        selectUnread: true,
                    });
                },
            },
            prevUnread: {
                title: L.PREV_UNREAD,
                icon: "back.png",
                fn: function () {
                    require("views/articleList").selectPrev({
                        selectUnread: true,
                    });
                },
            },
            markAllAsRead: {
                title: L.MARK_ALL_AS_READ,
                icon: "read_all.png",
                fn: function () {
                    const articleList = require("views/articleList");
                    const feeds = articleList.currentData.feeds;
                    var filter = articleList.currentData.filter;
                    if (feeds.length) {
                        (filter
                            ? bg.items.where(articleList.currentData.filter)
                            : bg.items
                        ).forEach(function (item) {
                            if (
                                item.get("unread") === true &&
                                feeds.indexOf(item.get("sourceID")) >= 0
                            ) {
                                item.save({ unread: false, visited: true });
                            }
                        });
                    } else if (articleList.currentData.name === "all-feeds") {
                        if (confirm(L.MARK_ALL_QUESTION)) {
                            bg.items.forEach(function (item) {
                                if (item.get("unread") === true) {
                                    item.save({ unread: false, visited: true });
                                }
                            });
                        }
                    } else if (articleList.currentData.filter) {
                        bg.items
                            .where(articleList.specialFilter)
                            .forEach(function (item) {
                                item.save({ unread: false, visited: true });
                            });
                    }
                },
            },
            selectAll: {
                title: L.SELECT_ALL_ARTICLES,
                fn: function () {
                    const articleList = require("views/articleList");
                    [...articleList.el.querySelectorAll(".selected")].forEach(
                        (element) => {
                            element.classList.remove("selected");
                        }
                    );

                    articleList.selectedItems = [];

                    [
                        ...articleList.el.querySelectorAll(
                            ".articles-list-item:not(.hidden)"
                        ),
                    ].forEach((element) => {
                        element.view.el.classList.add("selected");
                        articleList.selectedItems.push(element.view);
                    });

                    const lastSelected =
                        articleList.el.querySelector(".last-selected");
                    if (lastSelected) {
                        lastSelected.classList.remove("last-selected");
                    }

                    const lastVisible = articleList.el.querySelector(
                        ".articles-list-item:not(.hidden):last-child"
                    );
                    if (lastVisible) {
                        lastVisible.classList.add("last-selected");
                    }
                },
            },
            pin: {
                title: L.PIN,
                icon: "pinsource_context.png",
                fn: function () {
                    const articleList = require("views/articleList");
                    if (
                        !articleList.selectedItems ||
                        !articleList.selectedItems.length
                    ) {
                        return;
                    }
                    const isPinned =
                        !articleList.selectedItems[0].model.get("pinned");
                    articleList.selectedItems.forEach(function (item) {
                        item.model.save({ pinned: isPinned });
                    });
                },
            },
            spaceThrough: {
                title: "Space Through",
                fn: function () {
                    const articleList = require("views/articleList");
                    if (
                        !articleList.selectedItems ||
                        !articleList.selectedItems.length
                    ) {
                        return;
                    }
                    app.trigger("space-pressed");
                },
            },
            pageUp: {
                title: L.PAGE_UP,
                fn: function () {
                    var el = require("views/articleList").el;
                    el.scrollByPages(-1);
                },
            },
            pageDown: {
                title: L.PAGE_DOWN,
                fn: function () {
                    var el = require("views/articleList").el;
                    el.scrollByPages(1);
                },
            },
            scrollToBottom: {
                title: L.SCROLL_TO_BOTTOM,
                fn: function () {
                    var el = require("views/articleList").el;
                    el.scrollTop = el.scrollHeight;
                },
            },
            scrollToTop: {
                title: L.SCROLL_TO_TOP,
                fn: function () {
                    var el = require("views/articleList").el;
                    el.scrollTop = 0;
                },
            },
        },
        content: {
            changeView: {
                title: L.CHANGE_VIEW,
                icon: "report.png",
                fn: function () {
                    const contentView = require("views/contentView");
                    if (!contentView.model) {
                        return;
                    }
                    const view =
                        contentView.view === "feed" ? "mozilla" : "feed";
                    contentView.render(view);
                },
            },
            mark: {
                title: L.MARK_AS_READ,
                icon: "read.png",
                fn: function () {
                    var contentView = require("views/contentView");
                    if (!contentView.model) {
                        return;
                    }
                    contentView.model.save({
                        unread: !contentView.model.get("unread"),
                        visited: true,
                    });
                },
            },
            delete: {
                title: L.DELETE,
                icon: "delete.png",
                fn: function (e) {
                    const contentView = require("views/contentView");
                    if (!contentView.model) {
                        return;
                    }

                    const askRmPinned = bg.settings.get("askRmPinned");

                    if (e.shiftKey) {
                        if (
                            contentView.model.get("pinned") &&
                            askRmPinned &&
                            askRmPinned !== "none"
                        ) {
                            let conf = confirm(
                                L.PIN_QUESTION_A +
                                    contentView.model.escape("title") +
                                    L.PIN_QUESTION_B
                            );
                            if (!conf) {
                                return;
                            }
                        }
                        contentView.model.markAsDeleted();
                    } else {
                        if (
                            contentView.model.get("pinned") &&
                            askRmPinned === "all"
                        ) {
                            let conf = confirm(
                                L.PIN_QUESTION_A +
                                    contentView.model.escape("title") +
                                    L.PIN_QUESTION_B
                            );
                            if (!conf) {
                                return;
                            }
                        }

                        contentView.model.trash();
                    }
                },
            },
            showConfig: {
                title: L.SETTINGS,
                icon: "config.png",
                fn: function () {
                    let url = browser.runtime.getURL("options.html");
                    browser.tabs.query(
                        {
                            url: url,
                        },
                        function (tabs) {
                            if (tabs[0]) {
                                if (tabs[0].active) {
                                    browser.tabs.remove(tabs[0].id);
                                } else {
                                    browser.tabs.update(tabs[0].id, {
                                        active: true,
                                    });
                                }
                            } else {
                                browser.tabs.create(
                                    {
                                        url: url,
                                    },
                                    function () {}
                                );
                            }
                        }
                    );
                },
            },
            focus: {
                title: L.FOCUS_CONTENT,
                fn: function () {
                    app.setFocus("content");
                },
            },
            focusSandbox: {
                title: "Focus Article",
                fn: function () {
                    app.content.sandbox.el.focus();
                },
            },
            scrollDown: {
                title: L.SCROLL_DOWN,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    cw.scrollBy(0, 40);
                },
            },
            scrollUp: {
                title: L.SCROLL_UP,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    cw.scrollBy(0, -40);
                },
            },
            spaceThrough: {
                title: "Space trough",
                fn: function () {
                    require("views/contentView").handleSpace();
                },
            },
            pageUp: {
                title: L.PAGE_UP,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    const d = cw.document;
                    cw.scrollBy(0, -d.documentElement.clientHeight * 0.85);
                },
            },
            pageDown: {
                title: L.PAGE_DOWN,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    const d = cw.document;
                    cw.scrollBy(0, d.documentElement.clientHeight * 0.85);
                },
            },
            scrollToBottom: {
                title: L.SCROLL_TO_BOTTOM,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    const d = cw.document;
                    cw.scrollTo(0, d.documentElement.offsetHeight);
                },
            },
            scrollToTop: {
                title: L.SCROLL_TO_TOP,
                fn: function () {
                    const cw = document.querySelector("iframe").contentWindow;
                    cw.scrollTo(0, 0);
                },
            },
        },
    }; // end actions object
}); // end define function
