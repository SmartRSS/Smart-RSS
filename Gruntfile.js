module.exports = function (grunt) {
    const { join, dirname, relative } = require("path");
    const { readdirSync, lstatSync } = require("fs");

    const commit = function (level = "patch") {
        let { exec } = require("child_process");
        let done = this.async();
        exec("git add *", (err, stdout, stderr) => {
            if (err) {
                console.log(`stderr: ${stderr}`);
                done(false);
                return;
            }
            exec(`git commit -m "auto version bump: ${level}"`, (err) => {
                if (err) {
                    done(false);
                    return;
                }
                done(true);
            });
        });
    };

    const bumpVersion = function (level = "patch") {
        const semver = require("semver");
        const manifestPath = join(__dirname, "src/manifest.json");
        const manifest = grunt.file.readJSON(manifestPath);
        manifest.version = semver.inc(manifest.version, level);
        grunt.file.write(manifestPath, JSON.stringify(manifest, null, 2));
    };

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

    const zip = function () {
        const root = join(__dirname, "dist");
        const manifestPath = join(root, "manifest.json");
        const filesList = scan(root);
        const version = grunt.file.readJSON(manifestPath).version;

        const AdmZip = require("adm-zip");
        const zipFile = new AdmZip();

        filesList.forEach((file) => {
            // Get the directory relative to the root, or empty string if it's at the root
            const relativePath =
                dirname(file) === root ? "" : relative(root, dirname(file));
            zipFile.addLocalFile(file, relativePath);
        });

        zipFile.writeZip(join(__dirname, "dist", `SmartRSS_v${version}.zip`));
    };

    const stripComments = function () {
        const root = join(__dirname, "dist");
        const filesList = scan(root);

        const multilineComment = /^[\t\s]*\/\*\*?[^!][\s\S]*?\*\/[\r\n]/gm;
        const specialComments = /^[\t\s]*\/\*!\*?[^!][\s\S]*?\*\/[\r\n]/gm;
        const singleLineComment = /^[\t\s]*(\/\/)[^\n\r]*[\n\r]/gm;

        filesList.forEach((filePath) => {
            if (!filePath.endsWith(".js")) {
                return;
            }
            const contents = grunt.file
                .read(filePath)
                .replace(multilineComment, "")
                .replace(singleLineComment, "")
                .replace(specialComments, "");

            grunt.file.write(filePath, contents);
        });
    };

    // Project configuration.
    grunt.initConfig({
        watch: {
            scripts: {
                files: ["src/**/*"],
                tasks: ["prepare"],
                options: {
                    spawn: true,
                },
            },
        },
        copy: {
            main: {
                files: [
                    {
                        expand: true,
                        cwd: "./src/",
                        src: ["**/*"],
                        filter: "isFile",
                        dest: "./dist/",
                    },
                ],
            },
        },
    });

    grunt.registerTask("bump-version", "", bumpVersion);
    grunt.registerTask("commit", "", commit);
    grunt.registerTask("strip-comments", "", stripComments);
    grunt.registerTask("zip-package", "", zip);

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.registerTask("prepare", ["copy", "strip-comments"]);
    grunt.registerTask("package", ["prepare", "zip-package"]);

    grunt.registerTask("release", "", function (level = "patch") {
        if (!["major", "minor", "patch"].includes(level)) {
            console.error("Wrong update level, aborting");
            return false;
        }
        grunt.task.run([
            "bump-version:" + level,
            "commit:" + level,
            "copy",
            "strip-comments",
            "zip-package",
        ]);
    });
};
