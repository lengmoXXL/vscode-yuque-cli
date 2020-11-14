# vscode-yuque-cli README

This is the README for your extension "vscode-yuque-cli". After writing up a brief description, we recommend including the following sections.

## Features

* [x] Yuque Clone Command: Clone a yuque repo into a TOC.yaml
* [x] Yuque Outline View: Visualize TOC.yaml into a tree view
* [x] Yuque Create Document Command: Create a document and place it in the workspace
* Download markdown file when click on the item of tree view
* commit update (only support markdown)
* publish a document
* view document on website

## How to Use

**Create New Document**

1. Call `Yuque Create Document` command, which will use yuque API to create a document
2. Visit the website to add the document into TOC
3. Call `Yueue Refresh` command
4. View update on Yuque Outline

**Fetch and Modify Document** 
1. Right Click TreeItem in YuqueOutline and Choose to fetch document
2. Modify with markdown
3. Right Click TreeItem in YuqueOutline and Choose to update document

## Requirements

## Extension Settings

## Known Issues

