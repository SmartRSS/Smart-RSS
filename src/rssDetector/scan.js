(function () {
    let oldHref = document.location.href;
    const feedsData = [];
    let scanTimeout = null;
    let visibilityTimeout = null;

    function init() {
        scan();
        document.addEventListener(
            "visibilitychange",
            updateAvailableSourcesList,
            false
        );
        document.addEventListener(
            "pagehide",
            updateAvailableSourcesList,
            false
        );

        if (oldHref.includes("youtube")) {
            let bodyList = document.querySelector("body");
            const observer = new MutationObserver(function () {
                if (oldHref === document.location.href) {
                    return;
                }
                oldHref = document.location.href;
                if (scanTimeout) {
                    clearTimeout(scanTimeout);
                }
                scanTimeout = setTimeout(scan, 1500);
            });

            const observerConfig = {
                childList: true,
                subtree: true,
            };
            observer.observe(bodyList, observerConfig);
        }
    }

    function docReady(fn) {
        // see if DOM is already available
        if (
            document.readyState === "complete" ||
            document.readyState === "interactive"
        ) {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    function updateAvailableSourcesList() {
        if (document.hidden) {
            browser.runtime.sendMessage({ action: "visibility-lost" });
            return;
        }
        if (visibilityTimeout) {
            clearTimeout(visibilityTimeout);
        }

        visibilityTimeout = setTimeout(() => {
            browser.runtime.sendMessage({
                action: "list-feeds",
                value: feedsData,
            });
        }, 500);
    }

    function scan() {
        feedsData.length = 0;
        const address = document.location.href;
        if (typeof document.getRootNode !== "undefined") {
            let rootNode = document.getRootNode();
            if (rootNode) {
                let rootDocumentElement = rootNode.documentElement;
                // for chrome

                let d = document.getElementById("webkit-xml-viewer-source-xml");

                if (d && d.firstChild) {
                    rootDocumentElement = d.firstChild;
                }

                const rootName = rootDocumentElement.nodeName.toLowerCase();

                let isRSS1 = false;

                if (rootName === "rdf" || rootName === "rdf:rdf") {
                    if (rootDocumentElement.attributes["xmlns"]) {
                        isRSS1 =
                            rootDocumentElement.attributes[
                                "xmlns"
                            ].nodeValue.search("rss") > 0;
                    }
                }
                if (
                    rootName === "rss" ||
                    rootName === "channel" || // rss2
                    rootName === "feed" || // atom
                    isRSS1
                ) {
                    feedsData.push({ url: address, title: "This feed" });
                }
            }
        }

        if (address.match(/^https:\/\/github.com\/.+\/.+/)) {
            const base = address.replace(
                /(^https:\/\/github.com\/.+\/.+)(\/.+)/,
                "$1"
            );
            feedsData.push({
                url: base + "/releases.atom",
                title:
                    base.match(/^https:\/\/github.com\/(.+\/.+)/)[1] +
                    " - Releases",
            });
        }

        function findFeedsForYoutubeAddress(address) {
            const youtubeFeeds = [];
            const userMatch = /c\/(.+)/.exec(address);
            let deeperScan = true;
            let feedUrl = "";
            if (userMatch) {
                feedUrl =
                    "https://www.youtube.com/feeds/videos.xml?user=" +
                    userMatch[1];
                deeperScan = false;
                youtubeFeeds.push({ url: feedUrl, title: "User feed" });
            }
            const channelMatch = /channel\/(.+)/.exec(address);
            if (channelMatch) {
                feedUrl =
                    "https://www.youtube.com/feeds/videos.xml?channel_id=" +
                    channelMatch[1];
                deeperScan = false;
                youtubeFeeds.push({ url: feedUrl, title: "Channel feed" });
            }
            const playlistMatch = /list=([a-zA-Z\d\-_]+)/.exec(address);
            if (playlistMatch) {
                feedUrl =
                    "https://www.youtube.com/feeds/videos.xml?playlist_id=" +
                    playlistMatch[1];
                youtubeFeeds.push({
                    url: feedUrl,
                    title: "Current playlist feed",
                });
            }
            return [youtubeFeeds, deeperScan];
        }

        if (address.includes("youtube")) {
            const [youtubeFeeds, deeperScan] =
                findFeedsForYoutubeAddress(address);
            feedsData.push(...youtubeFeeds);
            if (deeperScan && address.includes("watch")) {
                const channelLink = document.querySelector(
                    "#upload-info .ytd-channel-name>a"
                );
                if (channelLink) {
                    const href = channelLink.getAttribute("href");
                    if (href) {
                        const linkFeeds = findFeedsForYoutubeAddress(href)[0];
                        feedsData.push(...linkFeeds);
                    }
                }
            }

            return updateAvailableSourcesList(feedsData);
        }

        if (address.includes("bitchute.com")) {
            const channelLink = document.querySelector(".owner>a");
            if (channelLink) {
                const channelName = channelLink.textContent;
                const href =
                    "https://www.bitchute.com/feeds/rss/channel/" + channelName;
                feedsData.push({ url: href, title: "Channel feed" });
            }

            return updateAvailableSourcesList(feedsData);
        }

        if (address.includes("odysee.com")) {
            const currentUrl = window.location.href;
            const channelNameMatch = /@(.+?):/.exec(currentUrl);
            if (channelNameMatch) {
                const channelName = channelNameMatch[1];

                const href =
                    "https://lbryfeed.melroy.org/channel/" + channelName;
                feedsData.push({ url: href, title: "Channel feed" });
            }

            return updateAvailableSourcesList(feedsData);
        }

        if (address.includes("vimeo.com")) {
            const currentUrl = window.location.href;
            const channelNameMatch = /vimeo\.com\/(.+)/.exec(currentUrl);
            if (channelNameMatch) {
                const potentialChannelName = channelNameMatch[1];
                const match2 = /([a-zA-Z]+?)/.exec(potentialChannelName);
                let channelName = "";
                if (match2) {
                    channelName = potentialChannelName;
                } else {
                    const channelLink =
                        document.querySelector("a.js-user-link");
                    if (channelLink) {
                        channelName = channelLink.href.replace("/", "");
                    }
                }
                if (!channelName) {
                    return;
                }
                const href =
                    "https://vimeo.com/" + channelName + "/videos/rss/";
                feedsData.push({ url: href, title: "Channel feed" });
            }

            return updateAvailableSourcesList();
        }

        if (address.includes("steemit.com")) {
            const currentUrl = window.location.href;
            const channelNameMatch = /steemit\.com\/(.+)/.exec(currentUrl);
            if (channelNameMatch) {
                const channelName = channelNameMatch[1];
                const href = "https://www.hiverss.com/" + channelName + "/feed";
                feedsData.push({ url: href, title: "Channel feed" });
            }
            return updateAvailableSourcesList();
        }

        if (address.includes("hive.blog")) {
            const currentUrl = window.location.href;
            const channelNameMatch = /hive\.blog\/(.+)/.exec(currentUrl);
            if (channelNameMatch) {
                const channelName = channelNameMatch[1];
                const href = "https://www.hiverss.com/" + channelName + "/feed";
                feedsData.push({ url: href, title: "Channel feed" });
            }
            return updateAvailableSourcesList();
        }

        const selector =
            'link[type="application/rss+xml"], link[type="application/atom+xml"]';

        feedsData.push(
            ...[...document.querySelectorAll(selector)].map((feed) => {
                return { url: feed.href, title: feed.title || feed.href };
            })
        );

        // no feeds found yet, try to bruteforce something
        if (feedsData.length === 0) {
            const generator = document.querySelector('meta[name="generator"]');

            if (
                generator &&
                generator.getAttribute("content").includes("WordPress")
            ) {
                const url = document.URL;

                const feedUrl =
                    url.charAt(url.length - 1) === "/"
                        ? url + "feed"
                        : url + "/feed";

                feedsData.push({ url: feedUrl, title: feedUrl });
            }
        }

        updateAvailableSourcesList(feedsData);
    }

    docReady(init);
})();
