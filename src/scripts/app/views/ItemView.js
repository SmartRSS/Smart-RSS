/**
 * @module App
 * @submodule views/ItemView
 */
define([
    'backbone', 'helpers/dateUtils', 'instances/contextMenus', 'helpers/stripTags', 'text!templates/itemView.html'
], function (BB, dateUtils, contextMenus, stripTags, itemTemplate) {

    /**
     * View of one article item in article list
     * @class ItemView
     * @constructor
     * @extends Backbone.View
     */
    let ItemView = BB.View.extend({

        /**
         * Tag name of article item element
         * @property tagName
         * @default 'a'
         * @type String
         */
        tagName: 'a',

        /**
         * Class name of article item element
         * @property className
         * @default 'item'
         * @type String
         */
        className: 'articles-list-item',

        /**
         * Reference to view/articleList instance. It should be replaced with require('views/articleList')
         * @property list
         * @default null
         * @type Backbone.View
         */
        list: null,

        /**
         * Initializations (*constructor*)
         * @method initialize
         * @param opt {Object} I don't use it, but it is automatically passed by Backbone
         * @param list {Backbone.View} Reference to articleList
         */
        initialize: function (opt, list) {
            this.multiple = opt.model.multiple;
            this.list = list;
            // this.el.setAttribute('draggable', 'true');
            this.el.view = this;
            this.setEvents();
        },

        /**
         * Set events that are binded to bgprocess
         * @method setEvents
         */
        setEvents: function () {
            this.model.on('change', this.handleModelChange, this);
            this.model.on('destroy', this.handleModelDestroy, this);
            bg.sources.on('clear-events', this.handleClearEvents, this);
        },


        /**
         * If the tab is closed, it will remove all events bound to bgprocess
         * @method handleClearEvents
         * @triggered when bgprocesses triggers clear-events event
         * @param id {Number} ID of closed tab
         */
        handleClearEvents: function (id) {
            if (!window || id === tabID) {
                this.clearEvents();
            }
        },

        /**
         * Removes all events binded to bgprocess
         * @method clearEvents
         */
        clearEvents: function () {
            if (this.model) {
                this.model.off('change', this.handleModelChange, this);
                this.model.off('destroy', this.handleModelDestroy, this);
            }
            bg.sources.off('clear-events', this.handleClearEvents, this);
        },

        /**
         * Renders article item view
         * @method render
         * @chainable
         */
        render: function () {
            const classList = this.el.classList;
            classList.remove('pinned');
            classList.remove('unvisited');
            classList.remove('unread');
            classList.remove('one-line');

            if (!this.model.get('visited')) {
                classList.add('unvisited');
            }
            if (this.model.get('unread')) {
                classList.add('unread');
            }
            if (this.model.get('pinned')) {
                classList.add('pinned');
            }
            if (bg.settings.get('lines') === '1') {
                classList.add('one-line');
            }

            const changedAttributes = this.model.changedAttributes();
            if (changedAttributes) {
                const caKeys = Object.keys(changedAttributes);
                if ((('unread' in changedAttributes || 'visited' in changedAttributes) && caKeys.length === 1) || ('unread' in changedAttributes && 'visited' in changedAttributes && caKeys.length === 2)) {
                    return this;
                }
            }

            let article = this.model.toJSON();
            article.datetime = new Date(article.date).toISOString();
            article.date = this.getItemDate(article.date);
            if (this.multiple) {
                const source = bg.sources.find({id: this.model.get('sourceID')});
                article.sourceTitle = source.get('title');
                if (bg.getBoolean('displayFaviconInsteadOfPin')) {
                    article.favicon = source.get('favicon');
                }
                article.author = article.sourceTitle !== article.author ? article.sourceTitle + ' - ' + article.author : article.author;
            }
            this.el.setAttribute('href', article.url);
            if (bg.getBoolean('showFullHeadline')) {
                this.el.classList.add('full-headline');
            } else {
                this.el.setAttribute('title', article.title);
            }


            while (this.el.firstChild) {
                this.el.removeChild(this.el.firstChild);
            }

            const fragment = document.createRange().createContextualFragment(itemTemplate);
            const itemPin = fragment.querySelector('.item-pin');
            const icon = itemPin.querySelector('.icon');
            if (typeof article.favicon !== 'undefined') {
                icon.src = article.favicon;
            } else {
                itemPin.removeChild(icon);
            }
            fragment.querySelector('.item-author').textContent = article.author;
            fragment.querySelector('.item-title').textContent = article.title;
            fragment.querySelector('.item-date').textContent = article.date;
            fragment.querySelector('.item-date').setAttribute('datetime', article.datetime);

            this.el.appendChild(fragment);

            return this;
        },

        /**
         * Returns formatted date according to user settings and time interval
         * @method getItemDate
         * @param date {Number} UTC time
         * @return String
         */
        getItemDate: function (date) {
            const dateFormats = {normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY'};
            const pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

            const timeFormat = bg.settings.get('hoursFormat') === '12h' ? 'H:mm a' : 'hh:mm';

            if (date) {
                if (bg.getBoolean('fullDate')) {
                    date = dateUtils.formatDate(date, pickedFormat + ' ' + timeFormat);
                } else if (Math.floor(dateUtils.formatDate(date, 'T') / 86400000) >= Math.floor(dateUtils.formatDate(Date.now(), 'T') / 86400000)) {
                    date = dateUtils.formatDate(date, timeFormat);
                } else if ((new Date(date)).getFullYear() === (new Date()).getFullYear()) {
                    date = dateUtils.formatDate(date, pickedFormat.replace(/\/?YYYY(?!-)/, ''));
                } else {
                    date = dateUtils.formatDate(date, pickedFormat);
                }
            }

            return date;
        },

        /**
         * Shows context menu on right click
         * @method handleMouseUp
         * @triggered on mouse up + condition for right click only
         * @param event {MouseEvent}
         */
        handleMouseUp: function (event) {
            if (event.button === 2) {
                this.showContextMenu(event);
            }
        },

        /**
         * Shows context menu for article item
         * @method showContextMenu
         * @param event {MouseEvent}
         */
        showContextMenu: function (event) {
            if (!this.el.classList.contains('selected')) {
                this.list.select(this, event);
            }
            contextMenus.get('items').currentSource = this.model;
            contextMenus.get('items').show(event.clientX, event.clientY);
        },

        /**
         * When model is changed rerender it or remove it from DOM (depending on what is changed)
         * @method handleModelChange
         * @triggered when model is changed
         */
        handleModelChange: function () {
            if (this.model.get('deleted') || (this.list.currentData.name !== 'trash' && this.model.get('trashed'))) {
                this.list.destroyItem(this);
            } else {
                this.render();
            }
        },

        /**
         * When model is removed from DB/Backbone remove it from DOM as well
         * @method handleModelDestroy
         * @triggered when model is destroyed
         */
        handleModelDestroy: function () {
            this.list.destroyItem(this);
        },

        /**
         * Changes pin state (true/false)
         * @method when user clicked on pin button in article item
         * @triggered when model is destroyed
         */
        handleClickPin: function (event) {
            event.stopPropagation();
            this.model.save({pinned: !this.model.get('pinned')});
        }
    });

    return ItemView;
});
