import { execFile } from 'child_process';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateSlug } from 'random-word-slugs';
import * as vscode from 'vscode';
import { PlaygroundPanel } from './playgroundPanel';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('rust-playground.newPlayground', async () => {
		const tmp = tmpDir();
		await mkdir(tmp, { recursive: true });

		execFile("cargo", ["init", "--bin", "--quiet", "--offline", "--vcs", "none"], {
			cwd: tmp,
		}, async (error, stdout, stderr) => {
			if (!error) {
				const uri = vscode.Uri.file(join(tmp, "src", "main.rs"));
				const doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
				new PlaygroundPanel(tmp);
			} else {
				vscode.window.showErrorMessage("Could not create playground", stderr);
			}
		});
	}));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (event) => {
		if (event.uri.fsPath.startsWith(playgroundDir())) {
			const playground = event.uri.fsPath.replace("/src/main.rs", "");
			PlaygroundPanel.shouldUpdate(playground);
		}
	}));
}

export function deactivate() { }

function playgroundDir(): string {
	return join(tmpdir(), "vscode-rust-playground");
}

function tmpDir(): string {
	return join(playgroundDir(), generateSlug(3, { format: "kebab" }));
}
