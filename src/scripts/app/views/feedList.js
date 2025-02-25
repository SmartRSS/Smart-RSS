/**
 * @module App
 * @submodule views/feedList
 */
define([
        'backbone', 'views/SourceView', 'views/FolderView', 'views/SpecialView', 'models/Special',
        'instances/contextMenus', 'mixins/selectable', 'instances/specials'
    ],
    function (BB, SourceView, FolderView, SpecialView, Special, contextMenus, selectable, specials) {

        /**
         * List of feeds (in left column)
         * @class FeedListView
         * @constructor
         * @extends Backbone.View
         */
        let FeedListView = BB.View.extend({

            selectedItems: [],
            /**
             * Tag name of the list
             * @property tagName
             * @default 'div'
             * @type String
             */
            tagName: 'div',

            /**
             * Class of feed list views
             * @property itemClass
             * @default 'list-item'
             * @type String
             */
            itemClass: 'sources-list-item',

            /**
             * ID of feed list
             * @property id
             * @default 'feed-list'
             * @type String
             */
            id: 'feed-list',

            events: {
                'click .sources-list-item': 'handleMouseDown',
                'mousedown .sources-list-item': 'handleMouseDown',
                'mouseup .sources-list-item': 'handleMouseUp'
            },

            /**
             * Called when new instance is created
             * @method initialize
             */
            initialize: function () {

                this.el.view = this;

                this.on('attach', this.handleAttach);

                bg.sources.on('reset', this.addSources, this);
                bg.sources.on('add', this.addSource, this);
                bg.sources.on('change:folderID', this.handleChangeFolder, this);
                bg.folders.on('add', this.addFolder, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);
                bg.settings.on('change:showOnlyUnreadSources', this.insertFeeds, this);

                this.on('pick', this.handlePick);

            },

            /**
             * Sets comm event listeners and inserts feeds
             * @method handleAttached
             * @triggered when feed list is attached to DOM
             */
            handleAttach: function () {
                app.on('select-all-feeds', () => {
                    const allFeeds = document.querySelector('.special.all-feeds');
                    if (!allFeeds) {
                        return;
                    }
                    this.select(allFeeds.view);
                });

                app.on('select-folder', (id) => {
                    const folder = document.querySelector('.folder[data-id="' + id + '"]');
                    if (!folder) {
                        return;
                    }
                    this.select(folder.view);
                });

                app.on('focus-feed', (id) => {
                    const feed = document.querySelector('.sources-list-item[data-id="' + id + '"]');
                    if (!feed) {
                        return;
                    }
                    this.select(feed.view);
                    feed.view.el.focus();
                    app.actions.execute('feeds:showAndFocusArticles');
                });

                this.insertFeeds();
            },

            /**
             * Adds folders specials and sources
             * @method insertFeeds
             * @@chainable
             */
            insertFeeds: function () {
                while (this.el.firstChild) {
                    this.el.removeChild(this.el.lastChild);
                }
                this.addFolders(bg.folders);
                if (bg.getBoolean('showPinned')) {
                    this.addSpecial(specials.pinned);
                }
                if (bg.getBoolean('showAllFeeds')) {
                    this.addSpecial(specials.allFeeds);
                }

                this.addSources(bg.sources);


                this.addSpecial(specials.trash);


                return this;
            },

            /**
             * If one list-item was selected by left mouse button, show its articles.
             * @triggered by selectable mixin.
             * @method handlePick
             * @param view {TopView} Picked source, folder or special
             * @param event {Event} Mouse or key event
             */
            handlePick: function (view, event) {
                if (event.type && event.type === 'mousedown' && event.which === 1) {
                    app.actions.execute('feeds:showAndFocusArticles', event);
                }
            },

            /**
             * Selectable mixin bindings. The selectable mixing will trigger "pick" event when items are selected.
             * @method handleClick
             * @triggered on mouse down
             * @param event {Event} Mouse event
             */
            handleMouseDown: function (event) {
                this.handleSelectableMouseDown(event);
            },

            /**
             * Selectable mixin bindings, item bindings
             * @method handleMouseUp
             * @triggered on mouse up
             * @param event {Event} Mouse event
             */
            handleMouseUp: function (event) {
                event.currentTarget.view.handleMouseUp(event);
                this.handleSelectableMouseUp(event);
            },
            /**
             * Place feed to the right place
             * @method handleDragStart
             * @triggered when folderID of feed is changed
             * @param source {Source} Source tha has its folderID changed
             */
            handleChangeFolder: function (source) {
                source = document.querySelector('.source[data-id="' + source.get('id') + '"]');
                if (!source) {
                    return;
                }

                this.placeSource(source.view);
            },

            /**
             * Unbinds all listeners to bg process
             * @method handleClearEvents
             * @triggered when tab is closed/refershed
             * @param id {Number} id of the closed tab
             */
            handleClearEvents: function (id) {
                if (!window || id === tabID) {
                    bg.sources.off('reset', this.addSources, this);
                    bg.sources.off('add', this.addSource, this);
                    bg.sources.off('change:folderID', this.handleChangeFolder, this);
                    bg.folders.off('add', this.addFolder, this);
                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },

            /**
             * Adds one special (all feeds, pinned, trash)
             * @method addSpecial
             * @param special {models/Special} Special model to add
             */
            addSpecial: function (special) {
                const view = new SpecialView({model: special});
                if (view.model.get('position') === 'top') {
                    const element = view.render().el;
                    element.classList.add('topSpecial');
                    element.classList.add(view.model.get('name'));
                    this.el.insertAdjacentElement('afterbegin', element);
                } else {
                    this.el.insertAdjacentElement('beforeend', view.render().el);
                }

            },

            /**
             * Adds one folder
             * @method addFolder
             * @param folder {models/Folder} Folder model to add
             */
            addFolder: function (folder) {
                if (folder.get('count') === 0 && bg.getBoolean('showOnlyUnreadSources')) {
                    return;
                }
                const view = new FolderView({model: folder}, this);
                const folderViews = [...document.querySelectorAll('.folder')];
                if (folderViews.length) {
                    this.insertBefore(view, folderViews);
                } else {
                    const special = document.querySelector('.topSpecial:last-of-type');
                    if (special) {
                        special.insertAdjacentElement('afterend', view.render().el);
                    } else {
                        this.el.insertAdjacentElement('beforeend', view.render().el);
                    }
                }
            },

            /**
             * Adds more folders ta once
             * @method addFolders
             * @param folders {Array} Array of folder models to add
             */
            addFolders: function (folders) {
                const existingFolders = [...document.querySelectorAll('.folder')];
                if (existingFolders.length > 0) {
                    existingFolders.forEach((folder) => {
                        if (!folder.view || !(folder instanceof FolderView)) {
                            return;
                        }
                        this.destroySource(folder.view);
                    });
                }

                folders.forEach((folder) => {
                    this.addFolder(folder);
                });
            },

            /**
             * Adds one source
             * @method addSource
             * @param source {models/Source} Source model to add
             * @param noManualSort {Boolean} When false, the rigt place is computed
             */
            addSource: function (source, noManualSort) {
                this.placeSource(new SourceView({model: source}, this), noManualSort === true);
            },

            /**
             * Places source to its right place
             * @method placeSource
             * @param view {views/TopView} Feed/Folder/Special to add
             * @param noManualSort {Boolean} When false, the right place is computed
             */
            placeSource: function (view, noManualSort) {
                let sourceViews;
                const source = view.model;

                if (source.get('count') === 0 && bg.getBoolean('showOnlyUnreadSources')) {
                    return;
                }

                if (source.get('folderID')) {
                    const folder = document.querySelector('.folder[data-id="' + source.get('folderID') + '"]');
                    if (folder) {
                        sourceViews = [...document.querySelectorAll('.source[data-in-folder="' + source.get('folderID') + '"]')];
                        if (sourceViews.length && noManualSort) {
                            sourceViews[sourceViews.length - 1].insertAdjacentElement('afterend', view.render().el);
                        } else if (sourceViews.length) {
                            this.insertBefore(view, sourceViews);
                        } else {
                            folder.insertAdjacentElement('afterend', view.render().el);
                        }

                        if (!folder.view.model.get('opened')) {
                            view.el.hidden = true;
                        }

                        return;
                    }
                }

                sourceViews = [...document.querySelectorAll('.source:not([data-in-folder])')];

                if (sourceViews.length && noManualSort) {
                    sourceViews[sourceViews.length - 1].insertAdjacentElement('afterend', view.render().el);
                    return;

                }
                if (sourceViews.length) {
                    this.insertBefore(view, sourceViews);
                    return;
                }
                const fls = [...document.querySelectorAll('[data-in-folder],.folder')];
                if (fls.length) {
                    fls[fls.length - 1].insertAdjacentElement('afterend', view.render().el);
                    return;
                }
                const first = document.querySelector('.topSpecial:last-of-type');
                if (first) {
                    // .special-first = all feeds, with more "top" specials this will have to be changed
                    first.insertAdjacentElement('afterend', view.render().el);
                    return;
                }
                this.el.insertAdjacentElement('beforeend', view.render().el);

            },

            /**
             * Insert element after another element
             * @method insertBefore
             * @param what {HTMLElement} Element to add
             * @param where {Array} Element to add after
             */
            insertBefore: function (what, where) {
                let before = null;
                where.some(function (el) {
                    if (el.view.model !== what.model && bg.sources.comparator(el.view.model, what.model) === 1) {
                        return before = el;
                    }
                });
                if (before) {
                    before.insertAdjacentElement('beforebegin', what.render().el);
                    return;
                }
                if (what instanceof FolderView) {
                    const folderSources = [...document.querySelectorAll('[data-in-folder="' + where[where.length - 1].view.model.get('id') + '"]')];
                    if (folderSources.length) {
                        where[where.length - 1] = folderSources[folderSources.length - 1];
                    }
                }
                where[where.length - 1].insertAdjacentElement('afterend', what.render().el);

            },

            /**
             * Add more sources at once
             * @method addSources
             * @param sources {Array} Array of source models to add
             */
            addSources: function (sources) {
                [...document.querySelectorAll('.source')].forEach((source) => {
                    if (!source.view || !(source instanceof SourceView)) {
                        return;
                    }
                    this.destroySource(source.view);
                });
                sources.forEach((source) => {
                    this.addSource(source, true);
                });
            },

            /**
             * Destroy feed
             * @method removeSource
             * @param view {views/SourceView} View containing the model to be destroyed
             */
            removeSource: function (view) {
                view.model.destroy();
            },


            /**
             * Closes item view
             * @method destroySource
             * @param view {views/TopView} View to be closed
             */
            destroySource: function (view) {
                view.clearEvents();
                view.undelegateEvents();
                view.off();
                view.remove();
                const indexOf = this.selectedItems.indexOf(view);
                if (indexOf >= 0) {
                    this.selectedItems.splice(indexOf, 1);
                }
            },

            /**
             * Get array of selected feeds (including feeds in selected folders)
             * @method getSelectedFeeds
             * @param arr {Array} List of selected items
             */
            getSelectedFeeds: function (arr = []) {
                const selectedItems = arr.length > 0 ? arr : this.selectedItems.map((item) => {
                    return item.model;
                });
                const selectedFeeds = [];
                selectedItems.forEach((item) => {
                    if (item instanceof bg.Source) {
                        selectedFeeds.push(item);
                        return;
                    }
                    if (item instanceof bg.Folder) {
                        const folderFeeds = bg.sources.toArray().filter((source) => {
                            return source.get('folderID') === item.id;
                        });
                        if (folderFeeds.length > 0) {
                            selectedFeeds.push(...this.getSelectedFeeds(folderFeeds));
                        }
                    }
                });
                return selectedFeeds;
            },

            /**
             * Get array of selected folders
             * @method getSelectedFolders
             * @param selectedItems {Array} List of selected items
             */
            getSelectedFolders: function (selectedItems) {
                const currentlySelectedItems = selectedItems || this.selectedItems.map((item) => {
                    return item.model;
                });
                const selectedFolders = [];
                currentlySelectedItems.forEach((folder) => {
                    if (folder instanceof bg.Folder) {
                        selectedFolders.push(folder);
                    }
                });
                return selectedFolders;
            }
        });

        FeedListView = FeedListView.extend(selectable);

        return new FeedListView();
    });
