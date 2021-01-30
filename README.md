# vscode-yuque-cli README

This extension is for VSCode client for [Yuque](https://www.yuque.com).

![tutorial](https://github.com/lengmoXXL/vscode-yuque-cli/raw/main/media/720p.gif)

## Features

* Clone Yuque Repo's TOC
* Create/Fetch/Open/Update/Delete Document
* Can only update the docuemnt which is created by the extension

* Commands:

    * Yuque Clone Command: Clone a yuque repo into a TOC.yaml
    * Yuque Create Document Command: Create a document and reponse a widget to input title and redirect to yuque website for toc arrange
    * Yuque Open Document Command: Open a document of a TreeViewItem
    * Yuque Update Document Command: Update Document
    * Yuque Update TOC Command: Update the Current Repo
    * Yuque Delete Document Command: Delete Document

* Views

    * Yuque Outline View: Visualize TOC.yaml into a tree view

## Settings

* `yuqueCli.APIToken`: the access token of Yuque API, generate [here](https://www.yuque.com/settings/tokens)
* `yuqueCli.EndPoint`: the url of Yuque Backend, the form is `https://<yuque domain name>/api/v2/`, for example, `https://www.yuque.com/api/v2/`
* `yuqueCli.Active`: true or false, specify which folder is active for yuque, for multi root workspace

## TODO

* [x] Yuque Update Document Response
* [x] Change Command Name
* [x] Add shortcup in the TreeView
* [x] Design custom Source Control to display modification
* [x] Fix update document without update stats in SCM
* [x] Support Clone Group Repo
* [x] Add Open in Website Command
* [x] Add Yuque Arrange TOC Command
* [ ] Add Command to Switch Active Folder
* [ ] Add DocumentName in SourceControl
* [ ] Open Document when click item in SourceControl
* [ ] Use DB to store all the things
  * [ ] Display The status of Document - use icons

## How to Use

**Clone a Yuque Repo**

1. open a folder in vscode
2. Call `Yuque Clone Command`, which will create a TOC.yaml file in the workspace

**Create New Document**

1. Call `Yuque Create Document` command, which will use yuque API to create a document
2. Visit the website to add the document into TOC (the vscode will open the url atomatically)
3. Call `Yueue Update TOC` command
4. View update on Yuque Outline

**Fetch and Modify Document** 
1. Right Click TreeItem in YuqueOutline and Choose to fetch document
2. Right Click TreeItem in YuqueOutline and Choose to open document
3. Modify with markdown
4. Right Click TreeItem in YuqueOutline and Choose to update document

## Requirements

## Extension Settings

## Known Issues

