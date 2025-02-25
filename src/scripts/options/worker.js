const request = indexedDB.open("backbone-indexeddb", 4);

let db;
let content;

request.addEventListener("error", function () {
    throw "Error code: " + this.errorCode;
});

request.addEventListener("success", function () {
    db = this.result;
    if (content) {
        startImport();
    }
});

onmessage = function (e) {
    if (e.data.action === "file-content") {
        content = e.data.value;
        if (db) {
            startImport();
        }
    }
    if (e.data.action === "settings") {
        content = e.data.value;
        if (db) {
            startSettingsImport();
        }
    }
};

let writes = 0;

function handleReq(req) {
    writes++;
    req.onsuccess = req.onerror = function () {
        writes--;
        if (writes <= 0) {
            postMessage({ action: "finished" });
        }
    };
}

function startSettingsImport() {
    const transaction = db.transaction(["settings-backbone"], "readwrite");
    const settings = transaction.objectStore("settings-backbone");

    const importedSettings = content.settings;
    if (importedSettings) {
        settings.clear();
        for (let i = 0, j = importedSettings.length; i < j; i++) {
            handleReq(settings.add(importedSettings[i]));
            if (i % 10 === 0) {
                postMessage({
                    action: "message-settings",
                    value: "Settings: " + i + "/" + j,
                });
            }
        }
    }
    if (writes === 0) {
        postMessage({ action: "finished-settings" });
    } else {
        postMessage({ action: "message-settings", value: "Writing..." });
    }
}

function startImport() {
    const transaction = db.transaction(
        ["folders-backbone", "sources-backbone", "items-backbone"],
        "readwrite"
    );
    const folders = transaction.objectStore("folders-backbone");
    const sources = transaction.objectStore("sources-backbone");
    const items = transaction.objectStore("items-backbone");

    const importedFolders = content.folders;
    const importedSources = content.sources;
    const importedItems = content.items;

    if (importedFolders) {
        folders.clear();
        for (let i = 0, j = importedFolders.length; i < j; i++) {
            handleReq(folders.add(importedFolders[i]));
            if (i % 10 === 0) {
                postMessage({
                    action: "message",
                    value: "Folders: " + i + "/" + j,
                });
            }
        }
    }

    if (importedSources) {
        sources.clear();
        for (let i = 0, j = importedSources.length; i < j; i++) {
            handleReq(sources.add(importedSources[i]));
            if (i % 10 === 0) {
                postMessage({
                    action: "message",
                    value: "Feeds: " + i + "/" + j,
                });
            }
        }
    }

    if (importedItems) {
        items.clear();
        for (let i = 0, j = importedItems.length; i < j; i++) {
            handleReq(items.add(importedItems[i]));
            if (i % 10 === 0) {
                postMessage({
                    action: "message",
                    value: "Articles: " + i + "/" + j,
                });
            }
        }
    }

    if (writes === 0) {
        postMessage({ action: "finished" });
    } else {
        postMessage({ action: "message", value: "Writing..." });
    }
}
