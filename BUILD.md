# Smart-RSS Build System

This document explains the build system for Smart-RSS.

## Overview

The build system has been simplified from a Grunt-based system to a plain Node.js script. The script provides the same functionality as the previous Grunt-based system but with a simpler implementation.

## Requirements

-   Node.js (v12 or higher recommended)
-   npm

## Installation

```bash
npm install
```

## Usage

You can use the build system in two ways:

### 1. Using npm scripts

```bash
# Copy files from src to dist and strip comments
npm run prepare

# Prepare and create zip package
npm run package

# Bump version, commit, prepare, and create zip package (patch version)
npm run release

# Bump minor version, commit, prepare, and create zip package
npm run release:minor

# Bump major version, commit, prepare, and create zip package
npm run release:major

# Watch for changes in src directory
npm run watch

# Bump version number (patch by default)
npm run bump-version
```

### 2. Using the build script directly

```bash
# Copy files from src to dist and strip comments
node build.js prepare

# Prepare and create zip package
node build.js package

# Bump version, commit, prepare, and create zip package
node build.js release [patch|minor|major]

# Watch for changes in src directory
node build.js watch

# Bump version number
node build.js bump-version [patch|minor|major]
```

## Features

-   **prepare**: Copies files from src to dist and strips comments from JS files
-   **package**: Prepares files and creates a zip package
-   **release**: Bumps version, commits changes, prepares files, and creates a zip package
-   **watch**: Watches for changes in the src directory and automatically runs prepare
-   **bump-version**: Bumps the version number in manifest.json

## Migrating from Grunt

The new build system provides the same functionality as the previous Grunt-based system. If you were using Grunt tasks, here's how they map to the new system:

| Grunt Task            | New Command                                              |
| --------------------- | -------------------------------------------------------- |
| `grunt prepare`       | `npm run prepare` or `node build.js prepare`             |
| `grunt package`       | `npm run package` or `node build.js package`             |
| `grunt release`       | `npm run release` or `node build.js release`             |
| `grunt release:minor` | `npm run release:minor` or `node build.js release minor` |
| `grunt release:major` | `npm run release:major` or `node build.js release major` |
| `grunt watch`         | `npm run watch` or `node build.js watch`                 |
| `grunt bump-version`  | `npm run bump-version` or `node build.js bump-version`   |

## Why the Change?

The new build system:

1. Reduces dependencies (no Grunt and related plugins)
2. Simplifies the build process
3. Makes it easier to understand and modify
4. Provides the same functionality in a more straightforward way
