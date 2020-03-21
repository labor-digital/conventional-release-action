#LABOR - Conventional Release Action

A github action that generates a CHANGELOG.md and updates your package.json as well as the composer.json of your project after you pushed a new release.

This library aims to provide with an automatic release cycle based on [Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog) and [angular's commit guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines). Both provide tools to keep the git history readable, generate version numbers and changelogs automatically. 

## Usage
Simply add the action to your pipeline configuration like:
```yaml
name: Create new Release

on:
  push:
    branches:
      - master
    paths-ignore:
      - 'composer.json'
      - 'package.json'
      - 'CHANGELOG.md'
jobs:
  release:
    runs-on: ubuntu-latest
    needs: test
    steps:
      -
        uses: actions/checkout@v1
      -
        name: Create Changelog and bump release version
        uses: labor-digital/conventional-release-action@master
        with:
          github-token: ${{ secrets.github_token }}

```

## After Release action
If your project contains a after-release.js file. The file will be executed after the version has been bumped but before the changes are pushed back to the repository.
