import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {SDKClient} from './util';
import { assert } from 'console';

export async function yuqueClone() {
    let user = await SDKClient.users.get();
    let repos: {name: string, namespace: string} [] = await SDKClient.repos.list({user: user.login, data: {}});
    let nameOfRepos = [];
    for (let i = 0; i < repos.length; ++ i) {
        nameOfRepos.push(
            {
                label: repos[i].name,
                namespace: repos[i].namespace
            }
        );
    }
    // console.log(nameOfRepos);
    
    const choice = await vscode.window.showQuickPick(nameOfRepos);
    console.log('Clone Repo: ' + JSON.stringify(choice));

    const repoInfo = await SDKClient.repos.get({namespace: choice.namespace, data: {}});
    console.log(repoInfo);
    let folders = vscode.workspace.workspaceFolders;
    if (folders.length === 1) {
        let folderPath = folders[0].uri.fsPath;
        let tocPath = path.join(folderPath, 'TOC.yaml');
        let tocVal = yaml.safeLoad(repoInfo.toc_yml, 'utf-8');
        if (tocVal === null) {
            tocVal = [{type: 'META', namespace: choice.namespace}];
        } else {
            assert(tocVal[0].type === 'META');
            tocVal[0].namespace = choice.namespace;
        }

        console.log(repoInfo.toc_yml);
        fs.writeFile(tocPath, yaml.safeDump(tocVal), {}, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('success');
            }
        });
    }
    console.log(vscode.workspace.workspaceFolders);
}

export async function yuqueFetchDocument(namespace: string, id: number) {
    let document: any = await SDKClient.docs.get({namespace: namespace, slug: id, data: {raw: 1}});
    let documentBody = document.body_draft || document.body;
    let folders = vscode.workspace.workspaceFolders;
    if (folders.length === 1) {
        let docPath = path.join(folders[0].uri.fsPath, id.toString() + '.md');
        fs.writeFile(docPath, documentBody, {}, function(err) {
            console.log(err);
        });
    }
}

// export async function yuqueCreateDocument(namespace: string) {
    // SDKClient.docs.create({
    //     namespace: namespace,
    //     data: {
    //         title: "<Put Your Title Here>",
    //         slug: "owly",
    //         public: 1,
    //         format: "markdown",
    //         body: "<Put Your Body Here>"
    //     }
    // });
//     const res = await SDKClient.repos.getTOC({namespace: namespace});
//     console.log(res);
// }

// export async function yuqueDeleteDocument(namespace: string) {
    // SDKClient.docs.delete({namespace: namespace, id: 15943560});
    // SDKClient.docs.delete({namespace: namespace, id: 15943261});
// }