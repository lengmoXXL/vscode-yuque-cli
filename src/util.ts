import * as vscode from 'vscode';
import * as Yuque from '@yuque/sdk';

let token = vscode.workspace.getConfiguration('yuqueCli').get('APIToken');
let SDKClient = new Yuque({token: token});


export {SDKClient};