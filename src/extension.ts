import { ExecFileOptions } from 'child_process';
import { execFile as execFileSync } from 'child_process';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateSlug } from 'random-word-slugs';
import * as vscode from 'vscode';
import { PlaygroundOutputProvider } from './playgroundPanel';
import { PlaygroundTerminal } from './playgroundTerminal';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('rust-playground.newPlayground', async () => {
		try {
			const slug = generateSlug(3, { format: "kebab" });
			const tmp = join(playgroundDir(), slug);
			await mkdir(tmp, { recursive: true });
			await execFile("cargo", ["init", "--bin", "--quiet", "--offline", "--vcs", "none"], {
				cwd: tmp,
			});
			const uri = vscode.Uri.file(join(tmp, "src", "main.rs"));
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
		} catch (err) {
			vscode.window.showErrorMessage("Could not create playground", err);
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (event) => {
		const path = isPlyrs(event?.document.uri.fsPath);
		if (path) {
			PlaygroundTerminal.show(path);
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(async (event) => {
		const path = isPlyrs(event.uri.fsPath);
		if (path) {
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (event) => {
		const path = isPlyrs(event.uri.fsPath);
		if (path) {
			console.log({path});
			PlaygroundTerminal.onSave(path);
		}
	}));

	// context.subscriptions.push(vscode.commands.registerCommand('rust-playground.stopProcess', async () => {

	// }));

	// const provider = new PlaygroundOutputProvider(context.extensionUri);
	// context.subscriptions.push(vscode.window.registerWebviewViewProvider(PlaygroundOutputProvider.viewType, provider));
}

export function deactivate() { }

function playgroundDir(): string {
	return join(tmpdir(), "vscode-rust-playground");
}

async function execFile(file: string, args: readonly string[] | null | undefined, options: ExecFileOptions): Promise<{ stdout: String, stderr: String }> {
	return new Promise((resolve, reject) => {
		execFileSync(file, args, options, (code, stdout, stderr) => {
			if (code) {
				reject({ code, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

function isPlyrs(fsPath?: string): string | null {
	console.log({fsPath});
	if (!fsPath) {
		return null;
	}
	if (fsPath.startsWith(playgroundDir()) && fsPath.endsWith("/src/main.rs")) {
		return fsPath.replace(/\/src\/main.rs$/, "");
	}
	return null;
}
