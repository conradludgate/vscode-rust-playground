import { join } from 'path';
import { tmpdir } from 'os';

export function playgroundDir(): string {
	return join(tmpdir(), "vscode-rust-playground");
}

export function isPlyrs(fsPath?: string): string | null {
	if (!fsPath) {
		return null;
	}
	if (fsPath.startsWith(playgroundDir()) && fsPath.endsWith("/src/main.rs")) {
		return fsPath.replace(/\/src\/main.rs$/, "");
	}
	return null;
}
