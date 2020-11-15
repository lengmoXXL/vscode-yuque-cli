import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'console';
import { DocumentNode } from './documentNode';


export class YuqueOutlineProvider implements vscode.TreeDataProvider<DocumentNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private repoNamespace: string;
    private nodes: any;
    private rootNodes: DocumentNode[];

    constructor(private context: vscode.ExtensionContext) {
        this.load();
    }

    getTreeItem(node: DocumentNode): vscode.TreeItem {
        return {
            label: node.label,
            collapsibleState: node.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            contextValue: 'document',
            command: {
                command: 'yuqueCli.onDocumentClicked',
                title: '',
                arguments: [node]
            }
        };
    }

    getChildren(node?: DocumentNode): Thenable<DocumentNode[]> {
        if (node) {
            return Promise.resolve(node.children);
        }
        return Promise.resolve(this.rootNodes);
    }

    refresh(): void {
        this.load();
        this._onDidChangeTreeData.fire(undefined);
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
            id?: number,
            uuid?: string,
            child_uuid?: string,
            parent_uuid?: string
        } [] = yaml.safeLoad(fs.readFileSync(tocPath, 'utf-8'));

        this.nodes = {};
        this.rootNodes = [];

        assert(items !== null);
        console.log(items);

        for (let i = 0; i < items.length; ++ i) {
            let item = items[i];
            if (item.type === 'META') {
                this.repoNamespace = item.namespace;
                continue;
            }

            if (!('uuid' in item) || !('id' in item) || !('title' in item)) {
                continue;
            }

            let node = new DocumentNode(item.id, item.title);
            this.nodes[item.uuid] = node;

            if (!('parent_uuid' in item)) {
                this.rootNodes.push(node);
                continue;
            }

            if (item.parent_uuid.length === 0) {
                this.rootNodes.push(node);
            } else {
                let parentNode: DocumentNode = this.nodes[item.parent_uuid];
                parentNode.children.push(node);
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