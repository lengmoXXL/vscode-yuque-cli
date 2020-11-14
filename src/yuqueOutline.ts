import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'console';


export class YuqueOutlineProvider implements vscode.TreeDataProvider<string> {

    private repoNamespace: string;
    private documentNodes: any;
    private documentRelations: any;
    private documentRootNodes: string[];

    constructor(private context: vscode.ExtensionContext) {
        this.load();
    }

    getTreeItem(uuid: string): vscode.TreeItem {
        if (uuid in this.documentNodes) {
            let ret = this.documentNodes[uuid];
            if (uuid in this.documentRelations) {
                ret.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            }
            ret.command = {
                command: 'yuqueCli.fetchDocument',
                title: '',
                arguments: [this.repoNamespace, ret.id]
            };
            return ret;
        }

        return null;
    }

    getChildren(uuid?: string): Thenable<string[]> {
        if (uuid in this.documentRelations) {
            return Promise.resolve(this.documentRelations[uuid]);
        }

        return Promise.resolve(this.documentRootNodes);
    }

    load(): void {
        const yaml = require('js-yaml');

        let folders = vscode.workspace.workspaceFolders;
        assert(folders.length === 1);

        let tocPath = path.join(folders[0].uri.fsPath, 'TOC.yaml');
        const items: {
            type: string, // 'META', 'DOC', 
            namespace?: string,
            title?:string,
            id?: string,
            uuid?: string,
            child_uuid?: string,
            parent_uuid?: string
        } [] = yaml.safeLoad(fs.readFileSync(tocPath, 'utf-8'));

        this.documentNodes = {};
        this.documentRelations = {};
        this.documentRootNodes = [];

        assert(items !== null);
        console.log(items);

        for (let i = 0; i < items.length; ++ i) {
            let item = items[i];
            if (item.type === 'META') {
                this.repoNamespace = item.namespace;
                continue;
            }

            if (!('uuid' in item) || !('child_uuid' in item) || !('parent_uuid' in item)) {
                continue;
            }

            this.documentNodes[item.uuid] = {
                label: item.title,
                iconPath: this.icon(),
                id: item.id
            };

            if (item.parent_uuid.length === 0) {
                this.documentRootNodes.push(item.uuid);
            } else {
                if (!(item.parent_uuid in this.documentRelations)) {
                    this.documentRelations[item.parent_uuid] = [];
                }

                this.documentRelations[item.parent_uuid].push(item.uuid);
            }
        }
    }

    namespace(): string {
        return this.repoNamespace;
    }

    private icon(): any {
        return {
            light: this.context.asAbsolutePath(path.join('resources', 'light', 'string.svg')),
            dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'string.svg')) 
        };
    }
}