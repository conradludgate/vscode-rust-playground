import { ExecFileOptions } from 'child_process';
import { execFile as execFileSync } from 'child_process';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { generateSlug } from 'random-word-slugs';
import * as vscode from 'vscode';
import { isPlyrs, playgroundDir } from './dir';
import { PlaygroundLinkProvider } from './playgroundLinkProvider';
import { PlaygroundTerminal } from './playgroundTerminal';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('rust-playground.newPlayground', async () => {
		try {
			const slug = generateSlug(3, { format: "kebab" });
			const dir = playgroundDir();
            const projects_dir = join(dir, "projects/");
			const tmp = join(projects_dir, slug);
			
			await mkdir(tmp, { recursive: true });
			await execFile("cargo", ["init", "--bin", "--quiet", "--offline", "--vcs", "none"], {
				cwd: tmp,
			});
			
			//Edit Cargo.toml of the workspace project
            const cargoToml = join(dir, "Cargo.toml");
            
            const files = await readdir(projects_dir);
            const newCargoTomlContents = "[workspace]\nmembers = [" + 
                files.map((f) => '"projects/' + f + '"').join(",") +
                "]\n";
            
            await writeFile(cargoToml, newCargoTomlContents);
			            
			const uri = vscode.Uri.file(join(tmp, "src", "main.rs"));
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);
		} catch (err) {
			vscode.window.showErrorMessage("Could not create playground", err);
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (event) => {
		const path = isPlyrs(event?.document.uri.fsPath);
		if (path) {
			PlaygroundTerminal.show(path);

			const ra = vscode.extensions.getExtension("matklad.rust-analyzer");
			if (ra !== undefined) {
				if (!ra.isActive) {
					await ra.activate();
				}
			}
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (event) => {
		const path = isPlyrs(event.uri.fsPath);
		if (path) {
			PlaygroundTerminal.onSave(path);
		}
	}));

	context.subscriptions.push(vscode.window.registerTerminalLinkProvider(new PlaygroundLinkProvider));
}

export function deactivate() { }


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
