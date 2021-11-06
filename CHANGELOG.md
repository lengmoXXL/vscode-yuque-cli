# Change Log

All notable changes to the "vscode-yuque-cli" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

* [ ] Add Automatic Tests for Yuque
* [ ] Test Yuque API
* [ ] Refractor
* [ ] Support Modify TOC

## [0.1.0]

- Add Yuque Clone Command
- Add Yuque Outline View
- Add Yuque Create/Fetch/Open/Update/Delete Command
- Add Yuque UpdateTOC/reloadTOC Command

## [0.1.1]

- Add Settings `yuqueCli.APIToken` introduction in README.md

## [0.1.2]

- Fix Wrong Display Tree View of TOC.yaml where child_uuid field is missing

## [0.1.3]

- Fix update failure but info success

## [0.2.0]

- Change Command Name into `Yuque: XXX`
- Add command short cut in the tree view

## [0.2.1]

- Add Source Control and display QuickDiff

## [0.2.2]

- Fix QuickDiff not supported in windows
- Add ResourceState in SCM

## [0.2.3]

- Fix Bug of not display all the modification in SCM

## [0.2.4]
- Fix the bug of resource not update when update the document
- Add Support for clone group repo
- Add Yuque Open Document In Website Command
- Add Yuque Open TOC Arrange Command

## [0.2.8]

- Add settings of EndPoint to support different Yuque Backend

## [0.3.0]

- Add Support For Multi Root workspace
- Add Yuque Switch Active Folder Command
- Fetch Document When Open not exists Document

## [0.3.1]

- Add CodeLens to display title

## [0.3.4]

- Fix Codelens not display title

## [0.3.5]

- Remove Codelens and change filename format

## [0.3.8]

- Add open diff for click scm state
- Add update document for scm state menu
- Conceal commands that is not used in command paleltte