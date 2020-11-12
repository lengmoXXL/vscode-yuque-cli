import * as vscode from 'vscode';
import * as Yuque from '@yuque/sdk';
import * as path from 'path';
import * as fs from 'fs';

export async function yuqueClone() {
    let token = vscode.workspace.getConfiguration('yuqueCli').get('APIToken');
    let sdkClient = new Yuque({token: token});
    let user = await sdkClient.users.get();
    let repos: {name: string, namespace: string} [] = await sdkClient.repos.list({user: user.login, data: {}});
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

    const repoInfo = await sdkClient.repos.get({namespace: choice.namespace, data: {}});
    // console.log(repoInfo);
    let folders = vscode.workspace.workspaceFolders;
    if (folders.length === 1) {
        let folderPath = folders[0].uri.fsPath;
        let tocPath = path.join(folderPath, 'TOC.yaml');
        fs.writeFile(tocPath, repoInfo.toc_yml, {}, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log('success');
            }
        });
    }
    console.log(vscode.workspace.workspaceFolders);
    
}