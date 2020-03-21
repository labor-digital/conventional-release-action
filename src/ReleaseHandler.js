/*
 * Copyright 2020 LABOR.digital
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Last modified: 2020.02.12 at 13:53
 */
const PathFinder = require("./PathFinder");
const path = require("path");
const core = require("@actions/core");
const Git = require("./Git");

let newVersion = null;

module.exports = class ReleaseAction {

	static handle() {

		const releaseElements = PathFinder.findReleaseElements(true);

		// Make changelog path relative
		const rootDirectory = releaseElements.git === null ? releaseElements.config : releaseElements.git;
		const infile = releaseElements.changelogMd;
		const infileRelative = path.relative(releaseElements.config, infile);

		// Prepare git
		const git = new Git();
		git.initialize().then(() => {
			// Apply some fixes and load standard-version
			ReleaseAction._applyAdjustmentsToStandardVersionBump();
			ReleaseAction._applyBugFixForConventionalChangelogNotGettingAVersionWhenNoPackageJson(releaseElements);
			const standardVersion = require("standard-version");

			// Prepare standard version environment
			const environment = {
				path: rootDirectory,
				infile: infileRelative,
				gitTagFallback: true,
				message: "chore(release): %s [SKIP CI]",
				skip: {},
				scripts: {}
			};

			// Check if there are special bump actions to perform
			const filename = path.join(rootDirectory, "after-release.js");
			if (require("fs").existsSync(filename))
				environment.scripts.postbump = "node " + filename + " " + newVersion;

			// Run standard version
			process.chdir(releaseElements.config);
			standardVersion(environment)
				.then(() => {
					// Push the version to the output
					core.info(`New version: ${newVersion}`);
				})
				.then(() => {
					// GIT PUSH
					return new Promise((resolve, reject) => {
						git.push()
							.then(resolve)
							.catch(reject);
					});
				})
				.catch(err => core.setFailed(err));
		})
			.catch(err => core.setFailed(err));


	}

	/**
	 * Wraps the "Bump" class of standard-version to make sure we determine a reliable version,
	 * even if all other methods of version guessing failed
	 * @internal
	 */
	static _applyAdjustmentsToStandardVersionBump() {
		const Bump = require("standard-version/lib/lifecycles/bump");
		const bumpPath = require.resolve("standard-version/lib/lifecycles/bump");
		const gitSemverTags = require("git-semver-tags");
		const semver = require("semver");

		// Create bump wrapper that provides a fallback version number
		const BumpWrapper = function (args, version) {

			// Make sure we always have a valid version number
			return (new Promise((resolve, reject) => {
				gitSemverTags(function (err, tags) {
					if (err !== null) return reject(err);
					let gitVersion = "v0.0.0";
					if (tags.length > 0) gitVersion = tags.shift();
					gitVersion = semver.clean(gitVersion);
					resolve(gitVersion);
				}, {tagPrefix: args.tagPrefix});
			})).then(gitVersion => {
				if (version === null || typeof version === "undefined" || semver.gt(gitVersion, version))
					version = gitVersion;

				// Call the real bump method
				return Bump(args, version).then(version => {
					newVersion = version;
					return Promise.resolve(version);
				});
			});
		};
		BumpWrapper.getUpdatedConfigs = Bump.getUpdatedConfigs;

		// Inject wrapper
		require.cache[bumpPath].exports = BumpWrapper;
	}

	/**
	 * Somehow there is a strange bug in conventional-changelog (used internally by standardVersion to generate the changelog)
	 * that causes the changelog generation to break because when there is no package.json file present.
	 * To circumvent that we will supply it with the version number we extracted from the bump script.
	 * @private
	 */
	static _applyBugFixForConventionalChangelogNotGettingAVersionWhenNoPackageJson(releaseElements) {
		if (releaseElements.packageJson !== null) return;
		const cc = require("conventional-changelog");
		const ccPath = require.resolve("conventional-changelog");

		// Inject wrapper
		require.cache[ccPath].exports = function (options, context, gitRawCommitsOpts, parserOpts, writerOpts) {
			if (typeof context === "object" && typeof context !== "undefined") context.version = newVersion;
			else context = {version: newVersion};
			return cc(options, context, gitRawCommitsOpts, parserOpts, writerOpts);
		};
	}
};