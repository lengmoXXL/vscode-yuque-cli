import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

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
        this.workspaceFolder = folders[0];
        for (let folder of folders) {
            let is_active = vscode.workspace.getConfiguration('yuqueCli', folder).get('Active');
            if (is_active) {
                this.workspaceFolder = folder;
            }
        }
        this.workspaceFolderPath = this.workspaceFolder.uri.fsPath;
        this.TOCPath = path.join(this.workspaceFolderPath, 'TOC.yaml');
        this.versionDirectory = path.join(this.workspaceFolderPath, '.yuque');
        if (!fs.existsSync(this.versionDirectory)) {
            fs.mkdirSync(this.versionDirectory, {});
        }
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

    getDocument(id: number): string {
        let docPath = path.join(this.workspaceFolderPath, id.toString() + '.md');
        let body = fs.readFileSync(docPath, 'utf-8');
        return body;
    }

    saveDocument(id: number, doc: string) {
        let docPath = path.join(this.workspaceFolderPath, id.toString() + '.md');
        fs.writeFileSync(docPath, doc, {});
    }

    saveVersionDocument(id: number, doc: string) {
        if (!fs.existsSync(this.versionDirectory)) {
            fs.mkdirSync(this.versionDirectory, {});
        }
        let versionPath = path.join(this.versionDirectory, id.toString() + '.md');
        fs.writeFileSync(versionPath, doc, {});
    }

    deleteDocument(id: number) {
        let docPath = path.join(this.workspaceFolderPath, id.toString() + '.md');
        if (fs.existsSync(docPath)) {
            fs.unlinkSync(docPath);
        }
    }

    deleteVersionDocument(id: number) {
        let versionPath = path.join(this.versionDirectory, id.toString() + '.md');
        if (fs.existsSync(versionPath)) {
            fs.unlinkSync(versionPath);
        }
    }

    getUri(id: number) : vscode.Uri {
        let docPath = path.join(this.workspaceFolderPath, id.toString() + '.md');
        if (fs.existsSync(docPath)) {
            return vscode.Uri.file(docPath);
        } else {
            throw new Error('Document not fetch');
        }
    }
}
