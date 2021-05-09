import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { DocumentId } from './outline';
import sanitize = require('sanitize-filename');

export class TOCItem {
    type: string;
    namespace?: string;
    title?:string;
    id?: number;
    url?: string;
    uuid?: string;
    child_uuid?: string;
    parent_uuid?: string;
}

export class YuqueDataProxy {
    private workspaceFolder: vscode.WorkspaceFolder;
    private workspaceFolderPath: string;
    private TOCPath: string;
    private versionDirectory: string;

    constructor() {
        let folders = vscode.workspace.workspaceFolders;
        let activateFolder = folders[0];
        for (let folder of folders) {
            let isActive = vscode.workspace.getConfiguration('yuqueCli', folder).get('Active');
            if (isActive) {
                activateFolder = folder;
            }
        }
        this.activate(activateFolder);
    }

    activate(folder: vscode.WorkspaceFolder) {
        this.workspaceFolder = folder;
        this.workspaceFolderPath = this.workspaceFolder.uri.fsPath;
        this.TOCPath = path.join(this.workspaceFolderPath, 'TOC.yaml');
        this.versionDirectory = path.join(this.workspaceFolderPath, '.yuque');
        if (!fs.existsSync(this.versionDirectory)) {
            fs.mkdirSync(this.versionDirectory, {});
        }
    }

    saveDeactiveForCurrentFolder() {
        vscode.workspace.getConfiguration('yuqueCli', this.workspaceFolder).update('Active', false);
    }

    saveActivateForCurrentFolder() {
        vscode.workspace.getConfiguration('yuqueCli', this.workspaceFolder).update('Active', true);
    }

    getWorkspaceFolder() : vscode.WorkspaceFolder {
        return this.workspaceFolder;
    }

    async getTOC(): Promise<TOCItem[]> {
        if (!fs.existsSync(this.TOCPath)) {
            return Promise.resolve([]);
        }

        return Promise.resolve(yaml.safeLoad(
            fs.readFileSync(this.TOCPath, 'utf-8')));
    }

    saveTOC(newTOC: any) {
        fs.writeFileSync(this.TOCPath, yaml.safeDump(newTOC), {});
    }

    getDocument(docid: DocumentId): string {
        let docPath = this.getDocumentPath(docid);
        let body = fs.readFileSync(docPath, 'utf-8');
        return body;
    }

    saveDocument(docid: DocumentId, doc: string) {
        let docPath = this.getDocumentPath(docid);
        fs.writeFileSync(docPath, doc, {});
    }

    saveVersionDocument(docid: DocumentId, doc: string) {
        if (!fs.existsSync(this.versionDirectory)) {
            fs.mkdirSync(this.versionDirectory, {});
        }
        let versionPath = this.getVersionPath(docid);
        fs.writeFileSync(versionPath, doc, {});
    }

    deleteDocument(docid: DocumentId) {
        let docPath = this.getDocumentPath(docid);
        if (fs.existsSync(docPath)) {
            fs.unlinkSync(docPath);
        }
    }

    deleteVersionDocument(docid: DocumentId) {
        let versionPath = this.getVersionPath(docid);
        if (fs.existsSync(versionPath)) {
            fs.unlinkSync(versionPath);
        }
    }

    getUri(docid: DocumentId) : vscode.Uri {
        let docPath = this.getDocumentPath(docid);
        if (fs.existsSync(docPath)) {
            return vscode.Uri.file(docPath);
        } else {
            throw new Error('Document not fetch');
        }
    }

    getDocumentPath(docid: DocumentId): string {
        return path.join(this.workspaceFolderPath, this.getFileName(docid));
    }

    getVersionPath(docid: DocumentId): string {
        return path.join(this.versionDirectory, this.getFileName(docid));
    }

    getFileName(docid: DocumentId): string {
        return "[" + docid.id.toString() + "]" + sanitize(docid.title) + ".md";
    }

    getVersionUriByUri(uri: vscode.Uri): vscode.Uri {
        return vscode.Uri.file(path.join(this.versionDirectory, path.basename(uri.fsPath)));
    }
}
