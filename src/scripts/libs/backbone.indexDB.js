/**
 * Backbone indexDB Adapter
 * Based on indexedDB adapter from jeromegn, but rewritten to use native Promises
 * instead of jQuery Deferred objects.
 *
 * Original: https://github.com/jeromegn/Backbone.localStorage
 */
(function (factory) {
    define(['backbone'], function (Backbone) {
        return factory(Backbone);
    });
}(function (Backbone) {
    // A simple module to replace `Backbone.sync` with *IndexedDB*-based
    // persistence. Models are given GUIDS, and saved into a JSON object.

    // Generate four random hex digits.
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    function guid() {
        return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
    }

    // Our Store is represented by a single JS object in *IndexedDB*. Create it
    // with a meaningful name, like the name you'd give a table.
    // window.Store is deprecated, use Backbone.IndexedDB instead
    Backbone.IndexedDB = function (name) {
        if (!window.indexedDB) {
            throw 'Backbone.indexedDB: Environment does not support IndexedDB.';
        }
        this.name = name;
        this.db = null;
        const request = window.indexedDB.open('backbone-indexeddb', Backbone.IndexedDB.version);
        this.dbRequest = request;
        const that = this;

        request.addEventListener('error', function (e) {
            // user probably disallowed idb
            throw 'Error code: ' + this.errorCode;
            // what are the possible codes???
        });

        request.addEventListener('success', function (e) {
            that.db = this.result;
        });

        request.addEventListener('upgradeneeded', function (e) {
            const db = this.result;
            Backbone.IndexedDB.prepare(db);
        });
    };

    Backbone.IndexedDB.prototype = Object.assign(Backbone.IndexedDB.prototype, {

        // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
        // have an id of it's own.
        create: function (model) {
            if (!model.id) {
                model.id = guid();
                model.set(model.idAttribute, model.id);
            }
            
            return new Promise((resolve, reject) => {
                try {
                    const request = this.indexedDB().add(model.toJSON());
                    request.onsuccess = () => resolve(model);
                    request.onerror = (error) => reject(error);
                } catch (error) {
                    reject(error);
                }
            });
        },

        // Update a model by replacing its copy in `this.data`.
        update: function (model) {
            return new Promise((resolve, reject) => {
                try {
                    const request = this.indexedDB().put(model.toJSON());
                    request.onsuccess = () => resolve(model);
                    request.onerror = (error) => reject(error);
                } catch (error) {
                    reject(error);
                }
            });
        },

        // Retrieve a model from `this.data` by id.
        find: function (model) {
            return new Promise((resolve, reject) => {
                const request = this.indexedDB().get(model.id);
                request.onsuccess = function () {
                    resolve(this.result);
                };
                request.onerror = function () {
                    reject('IndexDB Error: Can\'t read from or write to database');
                };
            });
        },

        // Return the array of all models currently in storage.
        findAll: function () {
            return new Promise((resolve, reject) => {
                const items = [];
                const request = this.indexedDB('readonly').openCursor();
                
                request.onsuccess = function (event) {
                    const cursor = this.result;
                    if (cursor) {
                        items.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(items);
                    }
                };
                
                request.onerror = function () {
                    reject('IndexDB Error: Can\'t read from or write to database');
                };
            });
        },

        // Delete a model from `this.data`, returning it.
        destroy: function (model) {
            if (model.isNew()) {
                return Promise.resolve(false);
            }
            
            return new Promise((resolve, reject) => {
                try {
                    const request = this.indexedDB().delete(model.id);
                    request.onsuccess = () => resolve(model);
                    request.onerror = (error) => reject(error);
                } catch (error) {
                    reject(error);
                }
            });
        },

        indexedDB: (function () {
            let tx;

            window.addEventListener('message', function (e) {
                if (e.data.action === 'clear-tx') {
                    tx = null;
                }
            });

            return function (type) {
                if (tx && !type) {
                    try {
                        const tmpStore = tx.objectStore(this.name);
                        // necessary to trigger error with <1ms async calls
                        tmpStore.get(-1);
                        return tmpStore;
                    } catch (e) {
                    }
                }

                const names = [...this.db.objectStoreNames].map((item) => {
                    return item;
                });
                const tmpTx = this.db.transaction(names, type || 'readwrite');

                const tmpStore = tmpTx.objectStore(this.name);
                if (!type) {
                    tx = tmpTx;
                    // setImmidiate polyfill , doesn't work very wll tho.
                    window.postMessage({action: 'clear-tx'}, '*');
                }

                return tmpStore;
            };
        })(),

        _clear: function () {
            return new Promise((resolve, reject) => {
                const req = this.indexedDB().clear();
                req.onsuccess = () => resolve();
                req.onerror = (error) => reject(error);
            });
        },

        // Size of indexedDB.
        _storageSize: function () {
            return new Promise((resolve, reject) => {
                const req = this.indexedDB().count();
                req.onsuccess = function() {
                    resolve(this.result);
                };
                req.onerror = function(error) {
                    reject(error);
                };
            });
        }

    });

    // localSync delegate to the model or collection's
    // *indexedDB* property, which should be an instance of `Store`.
    // window.Store.sync and Backbone.localSync is deprecated, use Backbone.IndexedDB.sync instead
    Backbone.IndexedDB.sync = function (method, model, options) {
        const store = model.indexedDB || model.collection.indexedDB;
        options = options || {};

        const that = this;

        // Use only native Promise
        return new Promise((resolve, reject) => {
            if (!store.db) {
                store.dbRequest.addEventListener('success', function (e) {
                    store.db = this.result;
                    // Call sync again and pass the promise handlers
                    Backbone.IndexedDB.sync.call(that, method, model, options)
                        .then(resolve)
                        .catch(reject);
                });
            } else {
                try {
                    switch (method) {
                        case 'read':
                            if (model.id !== undefined) {
                                store.find(model)
                                    .then(data => {
                                        if (options.success) options.success(data);
                                        if (options.complete) options.complete(data);
                                        resolve(data);
                                    })
                                    .catch(error => {
                                        if (options.error) options.error(error);
                                        if (options.complete) options.complete(null);
                                        reject(error);
                                    });
                            } else {
                                store.findAll()
                                    .then(data => {
                                        if (options.success) options.success(data);
                                        if (options.complete) options.complete(data);
                                        resolve(data);
                                    })
                                    .catch(error => {
                                        if (options.error) options.error(error);
                                        if (options.complete) options.complete(null);
                                        reject(error);
                                    });
                            }
                            break;
                        case 'create':
                            store.create(model)
                                .then(data => {
                                    const json = model.toJSON();
                                    if (options.success) options.success(json);
                                    if (options.complete) options.complete(json);
                                    resolve(json);
                                })
                                .catch(error => {
                                    if (options.error) options.error(error);
                                    if (options.complete) options.complete(null);
                                    reject(error);
                                });
                            break;
                        case 'update':
                            store.update(model)
                                .then(data => {
                                    const json = model.toJSON();
                                    if (options.success) options.success(json);
                                    if (options.complete) options.complete(json);
                                    resolve(json);
                                })
                                .catch(error => {
                                    if (options.error) options.error(error);
                                    if (options.complete) options.complete(null);
                                    reject(error);
                                });
                            break;
                        case 'delete':
                            store.destroy(model)
                                .then(data => {
                                    const json = model.toJSON();
                                    if (options.success) options.success(json);
                                    if (options.complete) options.complete(json);
                                    resolve(json);
                                })
                                .catch(error => {
                                    if (options.error) options.error(error);
                                    if (options.complete) options.complete(null);
                                    reject(error);
                                });
                            break;
                    }
                } catch (error) {
                    let errorMessage;
                    if (error.code === 22) { // && store._storageSize() === 0, what is code 22?
                        errorMessage = 'Private browsing is unsupported';
                    } else {
                        errorMessage = error.message;
                    }
                    if (options.error) options.error(errorMessage);
                    if (options.complete) options.complete(null);
                    reject(errorMessage);
                }
            }
        });
    };
    
    Backbone.ajaxSync = Backbone.sync;

    Backbone.getSyncMethod = function (model) {
        if (model.indexedDB || (model.collection && model.collection.indexedDB)) {
            return Backbone.IndexedDB.sync;
        }

        return Backbone.ajaxSync;
    };

    // Override 'Backbone.sync' to default to localSync,
    // the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
    Backbone.sync = function (method, model, options) {
        return Backbone.getSyncMethod(model).apply(this, [method, model, options]);
    };

    return Backbone.IndexedDB;
}));
