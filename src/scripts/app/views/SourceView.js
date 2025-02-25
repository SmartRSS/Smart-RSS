define([
        'backbone', 'views/TopView', 'instances/contextMenus'
    ],
    function (BB, TopView, contextMenus) {
        return TopView.extend({
            className: 'sources-list-item source',
            list: null,
            initialize: function (opt, list) {
                this.list = list;
                this.model.on('change', this.render, this);
                this.model.on('destroy', this.handleModelDestroy, this);
                this.model.on('change:title', this.handleChangeTitle, this);
                bg.sources.on('clear-events', this.handleClearEvents, this);
                this.el.dataset.id = this.model.get('id');
                this.el.view = this;
            },
            handleClearEvents: function (id) {
                if (!window || id === tabID) {
                    this.clearEvents();
                }
            },
            clearEvents: function () {
                this.model.off('change', this.render, this);
                this.model.off('destroy', this.handleModelDestroy, this);
                this.model.off('change:title', this.handleChangeTitle, this);
                bg.sources.off('clear-events', this.handleClearEvents, this);
            },
            showContextMenu: function (e) {
                if (!this.el.classList.contains('selected')) {
                    app.feeds.feedList.select(this, e);
                }
                contextMenus.get('source').currentSource = this.model;
                contextMenus.get('source').show(e.clientX, e.clientY);
            },
            handleChangeTitle: function () {
                this.list.placeSource(this);
            },
            handleModelDestroy: function () {
                this.list.destroySource(this);
            },
            render: function () {
                this.el.classList.remove('has-unread');
                this.el.classList.remove('loading');
                this.el.classList.remove('broken');

                if (this.model.get('count') > 0) {
                    this.el.classList.add('has-unread');
                }

                if ((this.model.get('errorCount') > 0) && !this.model.get('isLoading')) {
                    this.el.classList.add('broken');
                }

                if (this.model.get('isLoading')) {
                    this.el.classList.add('loading');
                }


                if (this.model.get('folderID') !== '0') {
                    this.el.dataset.inFolder = this.model.get('folderID');
                } else {
                    this.el.hidden = false;
                    delete this.el.dataset.inFolder;
                }

                this.setTitle(this.model.get('count'), this.model.get('countAll'));

                while (this.el.firstChild) {
                    this.el.removeChild(this.el.firstChild);
                }
                const data = this.model.toJSON();
                const fragment = document.createRange().createContextualFragment(this.template);
                fragment.querySelector('.source-icon.icon').src = data.favicon;
                fragment.querySelector('.source-title').textContent = data.title;
                fragment.querySelector('.source-counter').textContent = data.count;
                this.el.appendChild(fragment);
                this.el.href = data.base;

                if (bg.sourceToFocus === this.model.get('id')) {
                    setTimeout(function () {
                        app.trigger('focus-feed', bg.sourceToFocus);
                        bg.sourceToFocus = null;
                    }, 0);
                }

                return this;
            }
        });
    });
