/**
 * @module BgProcess
 * @submodule models/Settings
 */
define(['backbone', 'preps/indexeddb'], function (BB) {
    /**
     * Test navigator.language and if it matches some avalable language
     */
    function getLangFromNavigator() {
        const ln = String(navigator.language)
            .split('-')[0];
        const available = ['en', 'cs', 'sk', 'de', 'tr', 'pl', 'ru', 'hu', 'nl', 'fr', 'pt', 'hr'];
        const index = available.indexOf(ln);
        if (index >= 0) {
            return available[index];
        }
        return 'en';
    }

    /**
     * User settings
     * @class Settings
     * @constructor
     * @extends Backbone.Model
     */
    let Settings = BB.Model.extend({
        defaults: {
            id: 'settings-id',
            lang: getLangFromNavigator(),
            dateType: 'normal', // normal = DD.MM.YYYY, ISO = YYYY-MM-DD, US = MM/DD/YYYY
            layout: 'horizontal', // or vertical
            lines: '2', // one-line, two-lines
            posA: '250,*',
            posB: '350,*',
            posC: '50%,*',
            sortOrder: 'desc',
            sortOrder2: 'asc',
            icon: 'orange',
            sourcesFoundIcon: 'arrow-orange',
            readOnVisit: false,
            askOnOpening: true,
            fullDate: false,
            hoursFormat: '24h',
            articleFontSize: '100',
            uiFontSize: '100',
            disableDateGroups: false,
            badgeMode: 'disabled',
            circularNavigation: true,
            sortBy: 'date',
            sortBy2: 'title',
            askRmPinned: 'trashed',
            titleIsLink: true,
            soundNotifications: false,
            defaultSound: '',
            useSound: ':user',
            soundVolume: 1, // min: 0, max: 1
            showSpinner: true,
            concurrentDownloads: 5,
            updateFrequency: 15, // in minutes
            disableAutoUpdate: false,
            openInNewTab: true,
            showFullHeadline: 0,
            selectFirstArticle: 1,
            selectAllFeeds: 1,
            openEnclosure: 'no',
            autoremove: 0,
            autoremovesetting: 'KEEP_UNREAD',
            autoremovetrash: 0,
            openNewTab: 'background',
            userStyle: '',
            defaultStyle: ':root {\n' +
                '\n' +
                '  --blue-40: #45a1ff;\n' +
                '  --blue-50: #0a84ff;\n' +
                '  --blue-50-a30: rgba(10, 132, 255, 0.3);\n' +
                '  --blue-60: #0060df;\n' +
                '  --blue-70: #003eaa;\n' +
                '  --blue-80: #002275;\n' +
                '  --blue-90: #000f40;\n' +
                '\n' +
                '  --grey-10: #f9f9fa;\n' +
                '  --grey-20: #ededf0;\n' +
                '  --grey-30: #d7d7db;\n' +
                '  --grey-40: #b1b1b3;\n' +
                '  --grey-50: #737373;\n' +
                '  --grey-60: #4a4a4f;\n' +
                '  --grey-70: #38383d;\n' +
                '  --grey-80: #2a2a2e;\n' +
                '  --grey-90: #0c0c0d;\n' +
                '\n' +
                '  --white: #fff;\n' +
                '}',
            hotkeys: {
                feeds: {
                    'up': 'feeds:selectPrevious',
                    'down': 'feeds:selectNext',
                    'u': 'feeds:selectPrevious',
                    'j': 'feeds:selectNext',

                    'ctrl+left': 'feeds:closeFolders',
                    'ctrl+right': 'feeds:openFolders',
                    'left': 'feeds:toggleFolder',
                    'right': 'feeds:showArticles',
                    'enter': 'feeds:showAndFocusArticles',

                    'shift+j': 'feeds:selectNext',
                    'shift+down': 'feeds:selectNext',
                    'shift+u': 'feeds:selectPrevious',
                    'shift+up': 'feeds:selectPrevious'
                },
                articles: {
                    'd': 'articles:delete',
                    'del': 'articles:delete',
                    'shift+d': 'articles:delete',
                    'shift+del': 'articles:delete',
                    'ctrl+f': 'articles:focusSearch',
                    'shift+enter': 'articles:fullArticle',
                    'enter': 'articles:fullArticle',
                    'k': 'articles:mark',
                    'j': 'articles:selectNext',
                    'down': 'articles:selectNext',
                    'u': 'articles:selectPrevious',
                    'up': 'articles:selectPrevious',

                    'shift+j': 'articles:selectNext',
                    'shift+down': 'articles:selectNext',
                    'shift+u': 'articles:selectPrevious',
                    'shift+up': 'articles:selectPrevious',

                    'g': 'articles:markAndNextUnread',
                    't': 'articles:markAndPrevUnread',
                    'h': 'articles:nextUnread',
                    'y': 'articles:prevUnread',
                    'z': 'articles:prevUnread',

                    'ctrl+shift+a': 'articles:markAllAsRead',
                    'ctrl+a': 'articles:selectAll',
                    'p': 'articles:pin',
                    'n': 'articles:undelete',
                    'space': 'articles:spaceThrough',
                    'r': 'articles:update',

                    'pgup': 'articles:pageUp',
                    'pgdown': 'articles:pageDown',
                    'end': 'articles:scrollToBottom',
                    'home': 'articles:scrollToTop'
                },
                content: {
                    'up': 'content:scrollUp',
                    'down': 'content:scrollDown',
                    'space': 'content:spaceThrough',
                    'pgup': 'content:pageUp',
                    'pgdown': 'content:pageDown',
                    'end': 'content:scrollToBottom',
                    'home': 'content:scrollToTop',
                    'del': 'content:delete',
                    'd': 'content:delete',
                    'k': 'content:mark',

                    'g': 'articles:markAndNextUnread',
                    't': 'articles:markAndPrevUnread',
                    'h': 'articles:nextUnread',
                    'y': 'articles:prevUnread',
                    'z': 'articles:prevUnread',
                    'j': 'articles:selectNext',
                    'u': 'articles:selectPrevious'
                },
                sandbox: {
                    'del': 'content:delete',
                    'd': 'content:delete',
                    'k': 'content:mark',
                    'space': 'content:spaceThrough',

                    'g': 'articles:markAndNextUnread',
                    't': 'articles:markAndPrevUnread',
                    'h': 'articles:nextUnread',
                    'y': 'articles:prevUnread',
                    'z': 'articles:prevUnread',
                    'j': 'articles:selectNext',
                    'u': 'articles:selectPrevious'
                },
                global: {
                    'shift+1': 'feeds:focus',
                    'shift+2': 'articles:focus',
                    'shift+3': 'content:focus',
                    'shift+4': 'content:focusSandbox',
                    'esc': 'global:hideOverlays'
                }
            },
            version: 1,
            showNewArticlesIcon: 'always',
            hideSubscribedFeeds: 'mark',
            detectFeeds: true,
            showAllFeeds: true,
            showPinned: true,
            showOnlyUnreadSources: 'no',
            displayFaviconInsteadOfPin: '0',
            faviconSource: 'internal',
            queries: [],
            invertColors: 'no',
            defaultView: 'feed',
            cacheParsedArticles: 'false',
            defaultToUnreadOnly: 'false',
            enableYoutubePreview: true,
        },
        /**
         * @property localStorage
         * @type Backbone.IndexedDB
         * @default *settings-backbone*
         */
        indexedDB: new Backbone.IndexedDB('settings-backbone')
    });
    return Settings;
});
