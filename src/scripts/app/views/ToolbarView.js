define([
        'backbone', 'collections/ToolbarItems', 'factories/ToolbarItemsFactory'
    ],
    function (BB, ToolbarItems, ToolbarItemsFactory) {
        return BB.View.extend({
            tagName: 'div',
            className: 'toolbar',
            items: null,
            doNotRegenerate: false,
            events: {
                'click .button': 'handleButtonClick',
                'input input[type=search]': 'handleButtonClick',
            },
            initialize: function () {
                this.el.view = this;
                this.items = new ToolbarItems();

                this.listenTo(this.items, 'add', this.addToolbarItem);
                this.listenTo(this.model, 'change', this.handleChange);
                bg.sources.on('clear-events', this.handleClearEvents, this);


                this.model.get('actions').forEach(this.createToolbarItem, this);
                this.hideItems('articles:undelete');
            },

            /**
             * If the tab is closed, it will remove all events bound to bgprocess
             * @method handleClearEvents
             * @triggered when bgprocesses triggers clear-events event
             * @param id {Number} ID of closed tab
             */
            handleClearEvents: function (id) {
                if (!window || id === tabID) {
                    this.stopListening();
                    bg.sources.off('clear-events', this.handleClearEvents, this);
                }
            },

            /**
             * Regenerates DOM of items according to new changes
             * @triggered when some change to Toolbar model happens
             * @method handleChange
             */
            handleChange: function () {
                if (!this.doNotRegenerate) {
                    while (this.el.firstChild) {
                        this.el.removeChild(this.el.firstChild);
                    }
                    this.items.reset();

                    this.model.get('actions').forEach(this.createToolbarItem, this);

                    if (app.articles.articleList.currentData.name === 'trash') {
                        this.hideItems('articles:update');
                    } else {
                        this.hideItems('articles:undelete');
                    }
                }
            },
            /**
             * List of hidden toolbar items. The reason for storing hidden items is so that we can show all hidden items when customizing ui.
             * @param hiddenItems
             * @type Array
             */
            hiddenItems: [],

            /**
             * Hides items from toolbar (e.g. update action while in trash)
             * @method hideItems
             * @chainable
             */
            hideItems: function (action) {
                const list = [...this.el.querySelectorAll('[data-action="' + action + '"]')];

                list.forEach((item) => {
                    item.hidden = true;
                });

                this.hiddenItems = [...new Set(this.hiddenItems.concat(list))];

                return this;
            },

            /**
             * Shows again hidden items from toolbar (e.g. update action while going away from trash)
             * @method showItems
             * @chainable
             */
            showItems: function (action) {
                this.hiddenItems = this.hiddenItems.filter((item) => {
                    if (item.dataset.action === action) {
                        item.hidden = false;
                        return false;
                    }
                    return true;
                });

                return this;
            },


            /**
             * Called for every Toolbar action when ToolbarView is initialized
             * @method createToolbarItem
             * @param action {String} Name of the action
             */
            createToolbarItem: function (action) {
                if (action === '!dynamicSpace') {
                    this.items.add({type: 'dynamicSpace'});
                    return null;
                }
                this.items.add({actionName: action, type: 'button'});
            },
            handleButtonClick: function (e) {
                const button = e.currentTarget.view.model;
                app.actions.execute(button.get('actionName'), e);
            },
            render: function () {
                return this;
            },

            /**
             * Called when new model was added to _items_ collection
             * @method addToolbarItem
             * @param toolbarItem {ToolbarButton} Model added to the collection
             */
            addToolbarItem: function (toolbarItem) {
                let view;
                if (toolbarItem.get('actionName') === 'articles:search') {
                    view = ToolbarItemsFactory.create('search', toolbarItem);
                } else if (toolbarItem.get('type') !== 'dynamicSpace') {
                    view = ToolbarItemsFactory.create('button', toolbarItem);
                } else {
                    view = ToolbarItemsFactory.create('dynamicSpace', toolbarItem);
                }

                this.el.insertAdjacentElement('beforeend', view.render().el);
                toolbarItem.view = view;
            }
        });
    });
