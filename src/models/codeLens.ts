import * as vscode from 'vscode';
import { YuqueOutlineProvider, DocumentNode } from './outline';

class YuqueDocumentCodeLens implements vscode.CodeLens {
    public node: DocumentNode;
    public range: vscode.Range;
    public command: vscode.Command;
    public isResolved: boolean;
    constructor(node: DocumentNode, range: vscode.Range) {
        this.node = node;
        this.range = range;
        this.command = {
            title: node.label,
            command: "yuqueCli.openInWebsite",
        };
    }
}

export class HeaderCodelens implements vscode.CodeLensProvider {
    constructor(private _outline: YuqueOutlineProvider) {
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Fixme 
        let splits = document.fileName.split('/');
        let idString = Number(splits.pop().slice(0, -3));
        if (idString) {
            return [new YuqueDocumentCodeLens(this._outline.getNodeById(idString) , document.getWordRangeAtPosition(new vscode.Position(0, 0)))];
        }
        return [];
    }
}