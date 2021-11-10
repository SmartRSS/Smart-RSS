/**
 * @module App
 * @submodule views/contentView
 */
define(function (require) {
    const BB = require('backbone');
    const dateUtils = require('helpers/dateUtils');

    /**
     * Full view of one article (right column)
     * @class ContentView
     * @constructor
     * @extends Backbone.View
     */
    let ContentView = BB.View.extend({

        /**
         * Tag name of content view element
         * @property tagName
         * @default 'header'
         * @type String
         */
        tagName: 'header',
        events: {
            'mousedown': 'handleMouseDown',
            'click .pin-button': 'handlePinClick',
            'keydown': 'handleKeyDown'
        },

        view: '',

        /**
         * Changes pin state
         * @method handlePinClick
         * @triggered on click on pin button
         * @param event {MouseEvent}
         */
        handlePinClick: function (event) {
            const target = event.target;
            if (target.classList.contains('pinned')) {
                target.classList.remove('pinned');
            } else {
                target.classList.add('pinned');
            }
            this.model.save({
                pinned: target.classList.contains('pinned')
            });
        },


        /**
         * Called when new instance is created
         * @method initialize
         */
        initialize: function () {

            this.on('attach', this.handleAttached);

            bg.items.on('change:pinned', this.handleItemsPin, this);
            bg.sources.on('clear-events', this.handleClearEvents, this);
        },

        /**
         * Sets comm event listeners
         * @method handleAttached
         * @triggered when content view is attached to DOM
         */
        handleAttached: function () {
            app.on('select:article-list', function (data) {
                this.handleNewSelected(bg.items.findWhere({id: data.value}));
            }, this);

            app.on('space-pressed', function () {
                this.handleSpace();
            }, this);

            app.on('no-items:article-list', function () {
                if (this.renderTimeout) {
                    clearTimeout(this.renderTimeout);
                }
                this.model = null;
                this.hide();
            }, this);

        },

        /**
         * Next page in article or next unread article
         * @method handleSpace
         * @triggered when space is pressed in middle column
         */
        handleSpace: function () {
            const cw = document.querySelector('#content');
            if (cw.offsetHeight + cw.scrollTop >= cw.scrollHeight) {
                app.trigger('give-me-next');
            } else {
                cw.scrollBy(0, cw.offsetHeight * 0.85);
            }
        },

        /**
         * Unbinds all listeners to bg process
         * @method handleClearEvents
         * @triggered when tab is closed/refreshed
         * @param id {Number} id of the closed tab
         */
        handleClearEvents: function (id) {
            if (window == null || id === tabID) {
                bg.items.off('change:pinned', this.handleItemsPin, this);
                bg.sources.off('clear-events', this.handleClearEvents, this);
            }
        },

        /**
         * Sets the pin button state
         * @method handleItemsPin
         * @triggered when the pin state of the article is changed
         * @param model {Item} article that had its pin state changed
         */
        handleItemsPin: function (model) {
            if (model === this.model) {
                const pinButton = this.el.querySelector('.pin-button');
                if (this.model.get('pinned')) {
                    pinButton.classList.add('pinned');
                } else {
                    pinButton.classList.remove('pinned');
                }
            }
        },

        /**
         * Gets formatted date (according to settings) from given unix time
         * @method getFormattedDate
         * @param unixtime {Number}
         */
        getFormattedDate: function (unixtime) {
            const dateFormats = {normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY'};
            const pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

            const timeFormat = bg.settings.get('hoursFormat') === '12h' ? 'H:mm:ss a' : 'hh:mm:ss';

            return dateUtils.formatDate(unixtime, pickedFormat + ' ' + timeFormat);
        },

        /**
         * Rendering of article is delayed with timeout for 50ms to speed up quick select changes in article list.
         * This property contains descriptor for that timeout.
         * @property renderTimeout
         * @default null
         * @type Number
         */
        renderTimeout: null,

        /**
         * Renders articles content asynchronously
         * @method render
         * @chainable
         */
        render: function (overrideView = '') {
            clearTimeout(this.renderTimeout);

            this.renderTimeout = setTimeout(async () => {
                if (!this.model) {
                    return;
                }
                const modelUrl = this.model.get('url');

                this.show();
                const source = this.model.getSource();
                const openEnclosure = source.get('openEnclosure');
                const sourceDefaultView = source.get('defaultView');
                const defaultView = sourceDefaultView === 'global' ? bg.settings.get('defaultView') : sourceDefaultView;


                const open = openEnclosure === 'yes' || openEnclosure === 'global' && bg.settings.get('openEnclosure') === 'yes';

                const data = Object.create(this.model.attributes);
                data.date = this.getFormattedDate(this.model.get('date'));
                data.titleIsLink = bg.settings.get('titleIsLink');
                data.open = open;

                let content = '';


                if (overrideView !== '') {
                    this.view = overrideView;
                } else {
                    this.view = defaultView;
                }

                if (this.view === 'feed') {
                    content = this.model.get('content');
                } else {
                    // const parsedContent = this.model.get('parsedContent');
                    // if (this.view in parsedContent) {
                    //     content = parsedContent[this.view];
                    // } else {
                    if (this.view === 'mozilla') {
                        const response = await fetch(this.model.get('url'), {
                            method: 'GET',
                            redirect: 'follow', // manual, *follow, error
                            referrerPolicy: 'no-referrer'
                        });
                        const websiteContent = await response.text();

                        const parser = new DOMParser();
                        const websiteDocument = parser.parseFromString(websiteContent, 'text/html');
                        const Readability = require('../../libs/readability');
                        if(this.model.get('url') !== modelUrl){
                            return;
                        }
                        content = new Readability(websiteDocument).parse().content;
                    }
                    // }
                    // if (bg.settings.get('cacheParsedArticles') === 'true' && !(this.view in parsedContent)) {
                    //     parsedContent[this.view] = content;
                    //     this.model.set('parsedContent', parsedContent);
                    // }
                }
                const toRemove = chrome.runtime.getURL('');
                const re = new RegExp(toRemove, 'g');
                content = content.replace(re, '/');

                while (this.el.firstChild) {
                    this.el.removeChild(this.el.firstChild);
                }

                const fragment = document.createRange().createContextualFragment(require('text!templates/contentView.html'));
                fragment.querySelector('.author').textContent = data.author;
                fragment.querySelector('.date').textContent = data.date;
                if (data.pinned) {
                    fragment.querySelector('.pin-button').classList.add('pinned');
                }

                function createEnclosure(enclosureData) {
                    let newEnclosure;

                    switch (enclosureData.medium) {
                        case 'image':
                            newEnclosure = document
                                .createRange()
                                .createContextualFragment(require('text!templates/enclosureImage.html'));
                            const img = newEnclosure.querySelector('img');
                            img.src = enclosureData.url;
                            img.alt = enclosureData.name;
                            break;
                        case 'video':
                            newEnclosure = document
                                .createRange()
                                .createContextualFragment(require('text!templates/enclosureVideo.html'));
                            const video = newEnclosure.querySelector('video');
                            video.querySelector('source').src = enclosureData.url;
                            video.querySelector('source').type = enclosureData.type;
                            break;
                        case 'audio':
                            newEnclosure = document
                                .createRange()
                                .createContextualFragment(require('text!templates/enclosureAudio.html'));
                            const audio = newEnclosure.querySelector('audio');
                            audio.querySelector('source').src = enclosureData.url;
                            break;
                        case 'youtube':
                            // Do not create YouTube Preview if disabled
                            if (!bg.settings.get('enableYoutubePreview')) {
                                newEnclosure = document
                                    .createRange()
                                    .createContextualFragment(require('text!templates/enclosureGeneral.html'));
                                break;
                            }

                            newEnclosure = document
                                .createRange()
                                .createContextualFragment(require('text!templates/enclosureYoutubeCover.html'));
                            const videoId = /^.*\/(.*)\?(.*)$/.exec(enclosureData.url)[1];

                            const posterUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                            const videoUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
                            const cover = newEnclosure.querySelector('.youtube-cover');
                            cover.style.backgroundImage = `url("${posterUrl}")`;

                            cover.addEventListener('click', () => {
                                iframeEnclosure = document
                                    .createRange()
                                    .createContextualFragment(require('text!templates/enclosureYoutube.html'));
                                const iframe = iframeEnclosure.querySelector('iframe');
                                iframe.src = videoUrl;
                                cover.replaceWith(iframeEnclosure);
                                iframeEnclosure.focus();
                            });


                            break;
                        default:
                            newEnclosure = document
                                .createRange()
                                .createContextualFragment(require('text!templates/enclosureGeneral.html'));
                    }

                    newEnclosure.querySelector('a').href = enclosureData.url;
                    newEnclosure.querySelector('a').textContent = enclosureData.name;

                    return newEnclosure;
                }

                if (data.enclosure) {
                    const enclosures = Array.isArray(data.enclosure) ? data.enclosure : [data.enclosure];
                    enclosures.forEach((enclosureData) => {
                        const enclosure = createEnclosure(enclosureData);
                        fragment.querySelector('#below-h1').appendChild(enclosure);
                    });
                    if (data.open && enclosures.length === 1) {
                        fragment.querySelector('.enclosure').setAttribute('open', 'open');
                    }


                }
                this.el.appendChild(fragment);
                const h1 = this.el.querySelector('h1');
                if (data.titleIsLink) {
                    const link = document.createElement('a');
                    link.target = '_blank';
                    link.tabindex = '-1';
                    link.href = data.url ? data.url : '#';
                    link.textContent = data.title;
                    h1.appendChild(link);
                } else {
                    h1.textContent = data.title;
                }

                // first load might be too soon
                const sandbox = app.content.sandbox;
                const frame = sandbox.el;


                frame.setAttribute('scrolling', 'no');

                const resizeFrame = () => {
                    const scrollHeight = frame.contentDocument.body.scrollHeight;
                    frame.style.minHeight = '10px';
                    frame.style.minHeight = '70%';
                    frame.style.minHeight = `${scrollHeight}px`;

                    frame.style.height = '10px';
                    frame.style.height = '70%';
                    frame.style.height = `${scrollHeight}px`;
                };

                const loadContent = () => {
                    const body = frame.contentDocument.querySelector('body');
                    const articleUrl = this.model.get('url');
                    const articleDomain = new URL(articleUrl).origin;

                    let base = frame.contentDocument.querySelector('base');
                    base.href = articleDomain;
                    const shouldInvertColors = bg.settings.get('invertColors') === 'yes';
                    if (shouldInvertColors) {
                        body.classList.add('dark-theme');
                    } else {
                        body.classList.remove('dark-theme');
                    }

                    frame.contentWindow.scrollTo(0, 0);
                    document.querySelector('#content').scrollTo(0, 0);
                    frame.contentDocument.documentElement.style.fontSize = bg.settings.get('articleFontSize') + '%';

                    const contentElement = frame.contentDocument.querySelector('#smart-rss-content');

                    while (contentElement.firstChild) {
                        contentElement.removeChild(contentElement.firstChild);
                    }

                    let fragment;
                    switch (data.enclosure.medium) {
                        case 'youtube':
                            fragment = document.createRange().createContextualFragment(content.replace(/\r/g, '<br>'));
                            break;
                        default:
                            fragment = document.createRange().createContextualFragment(content);
                    }
                    contentElement.appendChild(fragment);


                    frame.contentDocument.querySelector('#smart-rss-url').href = articleUrl;
                    frame.contentDocument.querySelector('#full-article-url').textContent = articleUrl;

                    const clickHandler = (event) => {
                        if (event.target.matches('a')) {
                            event.stopPropagation();
                            const href = event.target.getAttribute('href');
                            if (!href || href[0] !== '#') {
                                return true;
                            }
                            event.preventDefault();
                            const name = href.substring(1);
                            const nameElement = frame.contentDocument.querySelector('[name="' + name + ']"');
                            const idElement = frame.contentDocument.getElementById(name);
                            let element = null;
                            if (nameElement) {
                                element = nameElement;
                            } else if (idElement) {
                                element = idElement;
                            }
                            if (element) {
                                const getOffset = function (el) {
                                    const box = el.getBoundingClientRect();

                                    return {
                                        top: box.top + frame.contentWindow.pageYOffset - frame.contentDocument.documentElement.clientTop,
                                        left: box.left + frame.contentWindow.pageXOffset - frame.contentDocument.documentElement.clientLeft
                                    };
                                };

                                const offset = getOffset(element);
                                frame.contentWindow.scrollTo(offset.left, offset.top);
                            }

                            return false;
                        }
                    };

                    frame.contentDocument.removeEventListener('click', clickHandler);
                    frame.contentDocument.addEventListener('click', clickHandler);

                    frame.contentDocument.removeEventListener('load', resizeFrame);
                    frame.contentDocument.addEventListener('load', resizeFrame);

                    if (typeof ResizeObserver !== 'undefined') {
                        const resizeObserver = new ResizeObserver(resizeFrame);
                        resizeObserver.observe(frame.contentDocument.body);
                    }

                    [...frame.contentDocument.querySelectorAll('img, picture, iframe, video, audio')]
                        .forEach((element) => {
                            if (element.src.startsWith('https://www.youtube.com/watch?')) {
                                element.src = element.src.replace('https://www.youtube.com/watch?v=', 'https://www.youtube-nocookie.com/embed/');
                                element.removeAttribute('allowfullscreen');
                                element.removeAttribute('height');
                                element.removeAttribute('width');
                                element.setAttribute('allowfullscreen', 'allowfullscreen');
                            }
                            element.onload = resizeFrame;
                        });
                    resizeFrame();
                };


                if (sandbox.loaded) {
                    loadContent();
                } else {
                    sandbox.on('load', loadContent);
                }
            }, 50);

            return this;
        },

        /**
         * Replaces old article model with newly selected one
         * @method handleNewSelected
         * @param model {Item} The new article model
         */
        handleNewSelected: function (model) {
            if (model === this.model) {
                return;
            }
            this.model = model;
            if (!this.model) {
                // should not happen but happens
                this.hide();
            } else {
                this.render();
            }
        },

        /**
         * Hides contents (header, iframe)
         * @method hide
         */
        hide: function () {
            [...document.querySelectorAll('header,iframe')].forEach((element) => {
                element.hidden = true;
            });
        },

        /**
         * Show contents (header, iframe)
         * @method hide
         */
        show: function () {
            [...document.querySelectorAll('header,iframe')].forEach((element) => {
                element.hidden = false;
            });
        }
    });

    return new ContentView();
});
