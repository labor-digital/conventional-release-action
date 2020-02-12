/*
 * MIT License
 *
 * Copyright (c) 2020 Tycho Bokdam
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This code was stolen from: https://github.com/TriPSs/conventional-changelog-action/blob/master/src/helpers/git.js
 */
const core = require("@actions/core");
const exec = require("@actions/exec");

const {GITHUB_REPOSITORY, GITHUB_REF} = process.env;

const branch = GITHUB_REF.replace("refs/heads/", "");

module.exports = class Git {

	constructor() {
		const githubToken = core.getInput("github-token", {required: true});

		// Make the Github token secret
		core.setSecret(githubToken);

		// Set config
		this.config("user.name", "Conventional Changelog Action");
		this.config("user.email", "conventional.changelog.action@github.com");

		// Update the origin
		this.updateOrigin(`https://x-access-token:${githubToken}@github.com/${GITHUB_REPOSITORY}.git`);

		// Checkout the branch
		this.checkout();
	}

	/**
	 * Executes the git command
	 *
	 * @param command
	 * @return {Promise<>}
	 */
	exec(command) {
		return new Promise(async (resolve, reject) => {
			let myOutput = "";
			let myError = "";

			const options = {
				listeners: {
					stdout: (data) => {
						myOutput += data.toString();
					},
					stderr: (data) => {
						myError += data.toString();
					}
				}
			};

			try {
				await exec.exec(`git ${command}`, null, options);

				resolve(myOutput);

			} catch (e) {
				reject(e);
			}
		});
	};

	/**
	 * Set a git config prop
	 *
	 * @param prop
	 * @param value
	 * @return {Promise<>}
	 */
	config(prop, value) {
		return this.exec(`config ${prop} "${value}"`);
	}

	/**
	 * Push all changes
	 *
	 * @return {Promise<>}
	 */
	push() {
		return this.exec(`push origin ${branch} --follow-tags`);
	}

	/**
	 * Checkout branch
	 *
	 * @return {Promise<>}
	 */
	checkout() {
		return this.exec(`checkout ${branch}`);
	}

	/**
	 * Updates the origin remote
	 *
	 * @param repo
	 * @return {Promise<>}
	 */
	updateOrigin(repo) {
		return this.exec(`remote set-url origin ${repo}`);
	}

};