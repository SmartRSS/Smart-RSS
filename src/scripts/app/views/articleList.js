/**
 * @module App
 * @submodule views/articleList
 */
define([
        'backbone', 'collections/Groups', 'models/Group', 'views/GroupView',
        'views/ItemView', 'mixins/selectable', 'modules/Locale'
    ],
    function (BB, Groups, Group, GroupView, ItemView, selectable, Locale) {

        const groups = new Groups();

        /**
         * List of articles
         * @class ArticleListView
         * @constructor
         * @extends Backbone.View
         */
        let ArticleListView = BB.View.extend({

            /**
             * Tag name of article list element
             * @property tagName
             * @default 'div'
             * @type String
             */
            tagName: 'div',

            /**
             * ID of article list
             * @property id
             * @default 'article-list'
             * @type String
             */
            id: 'article-list',

            /**
             * Class of article views
             * @property itemClass
             * @default 'item'
             * @type string
             */
            itemClass: 'articles-list-item',

            /**
             * Unordered list of all article views
             * @property views
             * @default []
             * @type Array
             */
            views: [],

            /**
             * Data received from feedList about current selection (feed ids, name of special, filter, unreadOnly)
             * @property currentData
             * @default { feeds: [], name: 'all-feeds', filter: { trashed: false}, unreadOnly: false }
             * @type Object
             */
            currentData: {
                feeds: [],
                name: 'all-feeds',
                filter: {trashed: false},
                unreadOnly: false
            },

            /**
             * Flag to prevent focusing more items in one tick
             * @property noFocus
             * @default false
             * @type Boolean
             */
            noFocus: false,

            currentRenderId: 0,

            events: {
                // 'dragstart .articles-list-item': 'handleDragStart',
                'mousedown .articles-list-item': 'handleMouseDown',
                'click .articles-list-item': 'handleClick',
                'mouseup .articles-list-item': 'handleMouseUp',
                'dblclick .articles-list-item': 'handleItemDblClick',
                'mousedown .item-pin,.item-pinned': 'handleClickPin'
            },

            /**
             * Opens articles url in new tab
             * @method handleItemDblClick
             * @triggered on double click on article
             */
            handleItemDblClick: function () {
                app.actions.execute('articles:oneFullArticle');
            },

            handleMouseDown(event) {
                if (event.button === 1) {
                    const linkElement = event.target.closest('a');
                    if (typeof browser !== 'undefined') {
                        this.prefetcher.href = linkElement.href;
                    }
                }
            },

            /**
             * Selects article
             * @method handleClick
             * @triggered on click on article
             * @param event {MouseEvent}
             */
            handleClick: function (event) {
                this.handleSelectableMouseDown(event);
            },

            /**
             * Changes pin state
             * @method handleClickPin
             * @triggered on click on pin button
             * @param event {MouseEvent}
             */
            handleClickPin: function (event) {
                event.currentTarget.parentNode.view.handleClickPin(event);
            },

            /**
             * Calls necessary select methods
             * @method handleMouseUp
             * @triggered on mouse up on article
             * @param event {MouseEvent}
             */
            handleMouseUp: function (event) {
                event.currentTarget.view.handleMouseUp(event);
                this.handleSelectableMouseUp(event);
            },

            /**
             * Called when new instance is created
             * @method initialize
             */
            initialize: function () {
                if (typeof browser !== 'undefined') {
                    this.prefetcher = document.createElement('link');
                    this.prefetcher.rel = 'preload';
                    this.prefetcher.setAttribute('as', 'fetch');
                    this.prefetcher.setAttribute('crossorigin', 'crossorigin');
                    document.head.appendChild(this.prefetcher);
                }


                bg.items.on('reset', this.addItems, this);
                bg.items.on('add', this.addItem, this);
                bg.items.on('sort', this.handleSort, this);
                bg.items.on('search', this.handleSearch, this);
                bg.sources.on('destroy', this.handleSourcesDestroy, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);
                bg.settings.on('change', this.onSettingsChange, this);

                groups.on('add', this.addGroup, this);

                this.on('attach', this.handleAttached, this);
                this.on('pick', this.handlePick, this);
            },

            onSettingsChange: function(){
                this.unreadOnly = bg.getBoolean('defaultToUnreadOnly');
                this.handleNewSelected(this.currentData);
            },

            /**
             * Sends msg to show selected article
             * @method handlePick
             * @triggered when one article is selected
             * @param view {views/ItemView}
             */
            handlePick: function (view) {
                if (!view.model.collection) {
                    // This shouldn't usually happen
                    // It might happen when source is deleted and created in the same tick
                    return;
                }
                app.trigger('select:' + this.el.id, {action: 'new-select', value: view.model.id});

                if (view.model.get('unread') && bg.getBoolean('readOnVisit')) {
                    view.model.save({
                        visited: true,
                        unread: false
                    });
                } else if (!view.model.get('visited')) {
                    view.model.save('visited', true);
                }
            },

            /**
             * Sets comm event listeners
             * @method handleAttached
             * @triggered when article list is attached to DOM
             */
            handleAttached: function () {
                app.on('select:feed-list', function (data) {
                    this.el.scrollTop = 0;
                    this.unreadOnly = bg.getBoolean('defaultToUnreadOnly');

                    if (data.action === 'new-select') {
                        this.handleNewSelected(data);
                    }
                }, this);

                app.on('give-me-next', function () {
                    if (this.selectedItems[0] && this.selectedItems[0].model.get('unread') === true) {
                        this.selectedItems[0].model.save({unread: false});
                    }
                    this.selectNextSelectable({selectUnread: true});
                    app.actions.execute('content:focus');
                }, this);

                if (bg.sourceToFocus) {
                    setTimeout(function () {
                        app.trigger('focus-feed', bg.sourceToFocus);
                        bg.sourceToFocus = null;
                    }, 0);
                    return;
                }
                if (bg.getBoolean('selectAllFeeds') && bg.getBoolean('showAllFeeds')) {
                    this.loadAllFeeds();
                }
            },

            /**
             * Loads all untrashed feeds
             * @method loadAllFeeds
             * @chainable
             */
            loadAllFeeds: function () {
                setTimeout(() => {
                    const unread = bg.items.where({trashed: false, unread: true});

                    if (unread.length) {
                        this.addItems(unread);
                    } else {
                        this.addItems(bg.items.where({trashed: false}));
                    }
                    const event = new MouseEvent('mousedown', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });

                    const cb = document.querySelector('.special');
                    cb.dispatchEvent(event);


                }, 0);

                return this;
            },

            /**
             * Renders unrendered articles in view by calling handleScroll
             * @method handleSearch
             * @triggered when new items arr added or when source is destroyed
             */
            handleSearch: function () {
                if (document.querySelector('input[type="search"]').value.trim() !== '') {
                    app.actions.execute('articles:search');
                }
            },


            /**
             * Unbinds all listeners to bg process
             * @method handleClearEvents
             * @triggered when tab is closed/refreshed
             * @param id {Number} id of the closed tab
             */
            handleClearEvents: function (id) {
                if (window === null || id === tabID) {
                    bg.items.off('reset', this.addItems, this);
                    bg.items.off('add', this.addItem, this);
                    bg.items.off('sort', this.handleSort, this);
                    bg.items.off('search', this.handleSearch, this);

                    bg.sources.off('destroy', this.handleSourcesDestroy, this);
                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },


            /**
             * Clears searchbox and sorts the list
             * @method handleSort
             * @triggered when sort setting is changed
             */
            handleSort: function () {
                document.querySelector('input[type="search"]').value = '';
                this.handleNewSelected(this.currentData);
            },

            /**
             * Selects new item when the last selected is deleted
             * @method selectAfterDelete
             * @param view {views/ItemView}
             */
            selectAfterDelete: function (view) {
                const children = Array.from(this.el.children);
                const length = children.length;
                if (children[length - 1].view === view) {
                    this.selectPrev({currentIsRemoved: true});
                } else {
                    this.selectNextSelectable({currentIsRemoved: true});
                }
            },

            /**
             * Tests whether newly fetched item should be added to current list.
             * (If the item's feed is selected)
             * @method inCurrentData
             * @return Boolean
             * @param item {Item} bg.Item
             */
            inCurrentData: function (item) {
                const feeds = this.currentData.feeds;
                if (!feeds.length) {
                    if (!this.currentData.filter) {
                        return true;
                    } else if (item.query(this.currentData.filter)) {
                        return true;
                    }
                } else if (feeds.indexOf(item.get('sourceID')) >= 0) {
                    return true;
                }

                return false;
            },

            /**
             * Adds new article item to the list
             * @method addItem
             * @param item {Item} bg.Item
             */
            addItem: function (item) {
                //Don't add newly fetched items to middle column, when they shouldn't be
                if (!this.inCurrentData(item)) {
                    return false;
                }

                let after = null;
                [
                    ...document
                        .querySelectorAll('#article-list .articles-list-item, #article-list .date-group')
                ]
                    .some((itemEl) => {
                        if (bg.items.comparator(itemEl.view.model, item) === 1) {
                            after = itemEl;
                            return true;
                        }
                    });

                const view = new ItemView({model: item}, this);

                if (!after) {
                    view.render();
                    this.views.push(view);
                    this.el.insertAdjacentElement('beforeend', view.el);
                    if (this.selectedItems.length === 0 && bg.getBoolean('selectFirstArticle')) {
                        this.select(view);
                    }
                } else {
                    // is this block even executed?
                    after.insertAdjacentElement('afterend', view.render().el);
                    const indexElement = after.view instanceof ItemView ? after : after.nextElementSibling;
                    const index = indexElement ? this.views.indexOf(indexElement.view) : -1;
                    this.views.splice(index, 0, view);
                }

                if (!bg.getBoolean('disableDateGroups') && bg.settings.get('sortBy') === 'date') {
                    const group = Group.getGroup(item.get('date'));
                    if (!groups.findWhere({title: group.title})) {
                        groups.add(new Group(group), {before: view.el});
                    }
                }
            },

            /**
             * Adds new date group to the list
             * @method addGroup
             * @param model {models/Group} group create by groups.create
             * @param col {collections/Groups}
             * @param opt {Object} options { before: insertBeforeItem }
             */
            addGroup: function (model, col, opt) {
                const before = opt.before;
                const view = new GroupView({model: model}, groups);
                before.insertAdjacentElement('beforebegin', view.render().el);
            },


            /**
             * Removes everything from lists and adds new collection of articles
             * @method setItemHeight
             * @param items {Backbone.Collection} bg.Items
             * @param multiple
             */
            addItems: function (items, multiple = false) {
                groups.reset();
                /**
                 * Select removal
                 */
                this.selectedItems = [];
                while (this.el.firstChild) {
                    this.el.removeChild(this.el.firstChild);
                }

                this.selectPivot = null;

                const length = items.length;
                if (length === 0) {
                    return;
                }
                const that = this;

                const renderBlock = (renderId, startingPoint = 0) => {
                    if (that.currentRenderId !== renderId) {
                        return;
                    }

                    let internalCounter = 0;
                    while (internalCounter !== 100 && startingPoint + internalCounter !== length) {
                        const item = items[startingPoint + internalCounter];
                        if (!item) {
                            break;
                        }
                        item.multiple = multiple;
                        that.addItem(item, true);
                        internalCounter++;
                    }
                    if (startingPoint + internalCounter === length) {
                        if (document.querySelector('input[type="search"]').value !== '') {
                            app.actions.execute('articles:search');
                        }
                        return;
                    }
                    window.requestIdleCallback(renderBlock.bind(this, renderId, startingPoint + internalCounter));
                };
                this.currentRenderId = Date.now();
                window.requestIdleCallback(renderBlock.bind(this, this.currentRenderId, 0));
            },

            /**
             * Called every time when new feed is selected and before it is rendered
             * @method clearOnSelect
             */
            clearOnSelect: function () {
                // if prev selected was trash, hide undelete buttons
                if (this.currentData.name === 'trash') {
                    app.articles.toolbar.showItems('articles:update');
                    app.articles.toolbar.hideItems('articles:undelete');
                    document.querySelector('#context-undelete').hidden = true;
                    // document.querySelector('#context-undelete').classList.add('hidden');
                }

                this.currentData = {
                    feeds: [],
                    name: 'all-feeds',
                    filter: {trashed: false},
                    unreadOnly: false
                };

            },

            /**
             * Called every time when new feed is selected. Gets the right data from store.
             * @method handleNewSelected
             * @param data {Object} data object received from feed list
             */
            handleNewSelected: function (data) {
                this.clearOnSelect();
                this.currentData = data;

                const searchIn = data.filter ? bg.items.where(data.filter) : bg.items.where({trashed: false});

                // if newly selected is trash
                if (this.currentData.name === 'trash') {
                    app.articles.toolbar.hideItems('articles:update').showItems('articles:undelete');
                    document.querySelector('#context-undelete').hidden = false;
                }
                const items = searchIn.filter((item) => {
                    if (!item.get('unread') && this.unreadOnly) {
                        return false;
                    }
                    return data.name || data.feeds.includes(item.get('sourceID'));
                }, this);
                this.addItems(items, data.multiple);
            },


            /**
             * If current feed is removed, select all feeds
             * @triggered when any source is destroyed
             * @method handleSourcesDestroy
             * @param source {Source} Destroyed source
             */
            handleSourcesDestroy: function (source) {
                const data = this.currentData;
                const index = data.feeds.indexOf(source.id);

                if (index >= 0) {
                    data.feeds.splice(index, 1);
                }

                if (!data.feeds.length && !data.filter) {
                    this.clearOnSelect();

                    if (document.querySelector('.articles-list-item')) {
                        this.once('items-destroyed', () => {
                            this.loadAllFeeds();
                        }, this);
                    } else {
                        this.loadAllFeeds();
                    }
                }

            },

            /**
             * Moves item from trash back to its original source
             * @method undeleteItem
             * @param view {views/ItemView} Undeleted article view
             */
            undeleteItem: function (view) {
                view.model.save({
                    'trashed': false
                });
                this.destroyItem(view);
            },

            /**
             * Moves item to trash
             * @method removeItem
             * @param view {views/ItemView} Removed article view
             */
            removeItem: function (view) {
                const askRmPinned = bg.settings.get('askRmPinned');
                if (view.model.get('pinned') && askRmPinned === 'all') {
                    const confirmation = confirm(Locale.PIN_QUESTION_A + view.model.escape('title') + Locale.PIN_QUESTION_B);
                    if (!confirmation) {
                        return;
                    }
                }
                view.model.trash();
                this.destroyItem(view);
                this.trigger('items-destroyed');
            },

            /**
             * Removes item from both source and trash leaving only info it has been already fetched and deleted
             * @method removeItemCompletely
             * @param view {views/ItemView} Removed article view
             */
            removeItemCompletely: function (view) {
                const askRmPinned = bg.settings.get('askRmPinned');
                if (view.model.get('pinned') && askRmPinned && askRmPinned !== 'none') {
                    const confirmation = confirm(Locale.PIN_QUESTION_A + view.model.escape('title') + Locale.PIN_QUESTION_B);
                    if (!confirmation) {
                        return;
                    }
                }
                view.model.markAsDeleted();
            },

            /**
             * Calls undeleteItem/removeItem/removeItemCompletely in a batch for several items
             * @method destroyBatch
             * @param arr {Array} List of views
             * @param fn {Function} Function to be called on each view
             */
            destroyBatch: function (arr, fn) {
                for (let i = 0, j = arr.length; i < j; i++) {
                    fn.call(this, arr[i]);
                }
            },

            /**
             * List of views to be closed when nextFrame animation frame is called
             * @property nextFrame
             * @default null
             * @type Object
             */
            nextFrameStore: [],

            /**
             * RequestAnimationFrame return value for next destroy item call.
             * @property nextFrame
             * @default null
             * @type Object
             */
            nextFrame: null,

            /**
             * Removes article view (clearing events and all)
             * @method destroyItem
             * @param view {views/ItemView} Destroyed article view
             */
            destroyItem: function (view) {
                this.nextFrameStore.push(view);
                if (!this.nextFrame) {
                    this.nextFrame = requestAnimationFrame(() => {
                        const lastView = this.nextFrameStore[this.nextFrameStore.length - 1];
                        this.selectAfterDelete(lastView);
                        for (let i = 0, j = this.nextFrameStore.length - 1; i < j; i++) {
                            this.destroyItemFrame(this.nextFrameStore[i]);
                        }

                        this.destroyItemFrame(lastView);

                        this.nextFrame = null;
                        this.nextFrameStore = [];


                    });
                }
            },

            /**
             * Called asynchronously from destroyItem. It does the real removing job.
             * @method destroyItemFrame
             * @param view {views/ItemView} Destroyed article view
             */
            destroyItemFrame: function (view) {
                // START: REMOVE DATE GROUP
                const prev = view.el.previousElementSibling;
                const next = view.el.nextElementSibling;
                if (prev && prev.classList.contains('date-group')) {
                    if (!next || next.classList.contains('date-group')) {
                        groups.remove(prev.view.model);
                    }
                }
                // END: REMOVE DATE GROUP

                view.clearEvents();
                view.remove();

                const selectedItemIndex = this.selectedItems.indexOf(view);
                if (selectedItemIndex >= 0) {
                    this.selectedItems.splice(selectedItemIndex, 1);
                }
                const viewIndex = this.views.indexOf(view);
                if (viewIndex >= 0) {
                    this.views.splice(viewIndex, 1);
                }
            },

            /**
             * Toggles unread state of selected items (with onlyToRead option)
             * @method changeUnreadState
             * @param options {Object} Options { onlyToRead: bool }
             */
            changeUnreadState: function (options) {
                options = options || {};
                const unread = this.selectedItems.length && !options.onlyToRead ? !this.selectedItems[0].model.get('unread') : false;
                this.selectedItems.forEach(function (item) {
                    if (!options.onlyToRead || item.model.get('unread') === true) {
                        item.model.save({unread: unread, visited: true});
                    }
                }, this);
            }
        });

        ArticleListView = ArticleListView.extend(selectable);

        return new ArticleListView();
    });
