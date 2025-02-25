#!/usr/bin/env node

const { join, dirname, relative } = require("path");
const {
    readdirSync,
    lstatSync,
    copyFileSync,
    mkdirSync,
    existsSync,
    readFileSync,
    writeFileSync,
} = require("fs");
const { execSync } = require("child_process");
const semver = require("semver");
const AdmZip = require("adm-zip");

// Utility functions
const scan = (dir) => {
    const filesList = [];
    readdirSync(dir).forEach((file) => {
        if (file[0] === ".") {
            return;
        }
        const filePath = join(dir, file);

        if (lstatSync(filePath).isDirectory()) {
            filesList.push(...scan(filePath));
            return;
        }
        filesList.push(filePath);
    });
    return filesList;
};

const ensureDirectoryExists = (dirPath) => {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
};

// Main functions
const bumpVersion = (level = "patch") => {
    console.log(`Bumping version (${level})...`);
    const manifestPath = join(__dirname, "src/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.version = semver.inc(manifest.version, level);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Version bumped to ${manifest.version}`);
    return manifest.version;
};

const commit = (level = "patch") => {
    console.log("Committing changes...");
    try {
        execSync("git add *", { stdio: "inherit" });
        execSync(`git commit -m "auto version bump: ${level}"`, {
            stdio: "inherit",
        });
        console.log("Changes committed");
        return true;
    } catch (error) {
        console.error("Git commit failed:", error.message);
        return false;
    }
};

const copyFiles = () => {
    console.log("Copying files from src to dist...");
    const srcDir = join(__dirname, "src");
    const distDir = join(__dirname, "dist");

    // Ensure dist directory exists
    ensureDirectoryExists(distDir);

    // Get all files from src
    const srcFiles = scan(srcDir);

    // Copy each file to dist, preserving directory structure
    srcFiles.forEach((srcFile) => {
        const relativePath = relative(srcDir, srcFile);
        const destFile = join(distDir, relativePath);
        const destDir = dirname(destFile);

        ensureDirectoryExists(destDir);
        copyFileSync(srcFile, destFile);
    });

    console.log("Files copied");
};

const stripComments = () => {
    console.log("Stripping comments from JS files...");
    const root = join(__dirname, "dist");
    const filesList = scan(root);

    const multilineComment = /^[\t\s]*\/\*\*?[^!][\s\S]*?\*\/[\r\n]/gm;
    const specialComments = /^[\t\s]*\/\*!\*?[^!][\s\S]*?\*\/[\r\n]/gm;
    const singleLineComment = /^[\t\s]*(\/\/)[^\n\r]*[\n\r]/gm;

    filesList.forEach((filePath) => {
        if (!filePath.endsWith(".js")) {
            return;
        }
        const contents = readFileSync(filePath, "utf8")
            .replace(multilineComment, "")
            .replace(singleLineComment, "")
            .replace(specialComments, "");

        writeFileSync(filePath, contents);
    });

    console.log("Comments stripped");
};

const zipPackage = () => {
    console.log("Creating zip package...");
    const root = join(__dirname, "dist");
    const manifestPath = join(root, "manifest.json");
    const filesList = scan(root);
    const version = JSON.parse(readFileSync(manifestPath, "utf8")).version;

    const zipFile = new AdmZip();

    filesList.forEach((file) => {
        // Get the directory relative to the root, or empty string if it's at the root
        const relativePath =
            dirname(file) === root ? "" : relative(root, dirname(file));
        zipFile.addLocalFile(file, relativePath);
    });

    const zipPath = join(__dirname, "dist", `SmartRSS_v${version}.zip`);
    zipFile.writeZip(zipPath);
    console.log(`Zip package created: ${zipPath}`);
};

const watch = () => {
    console.log("Watching for changes in src directory...");
    const chokidar = require("chokidar");

    chokidar
        .watch(join(__dirname, "src"), {
            ignored: /(^|[\/\\])\../,
            persistent: true,
        })
        .on("change", (path) => {
            console.log(`File ${path} has been changed`);
            prepare();
        });

    console.log("Watching for changes. Press Ctrl+C to stop.");
};

// Combined tasks
const prepare = () => {
    copyFiles();
    stripComments();
};

const packageTask = () => {
    prepare();
    zipPackage();
};

const release = (level = "patch") => {
    if (!["major", "minor", "patch"].includes(level)) {
        console.error("Wrong update level, aborting");
        return false;
    }

    bumpVersion(level);
    commit(level);
    copyFiles();
    stripComments();
    zipPackage();
};

// Command line interface
const printUsage = () => {
    console.log(`
Usage: node build.js [command] [options]

Commands:
  prepare             Copy files from src to dist and strip comments
  package             Prepare and create zip package
  release [level]     Bump version, commit, prepare, and create zip package
                      level can be: patch, minor, major (default: patch)
  watch               Watch for changes in src directory
  bump-version [level] Bump version number
                      level can be: patch, minor, major (default: patch)
  
Examples:
  node build.js prepare
  node build.js release minor
  node build.js watch
`);
};

// Main
const args = process.argv.slice(2);
const command = args[0];
const option = args[1];

if (!command) {
    printUsage();
    process.exit(0);
}

switch (command) {
    case "prepare":
        prepare();
        break;
    case "package":
        packageTask();
        break;
    case "release":
        release(option || "patch");
        break;
    case "watch":
        watch();
        break;
    case "bump-version":
        bumpVersion(option || "patch");
        break;
    default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
}
