import { join, relative } from 'path';
import { tmpdir } from 'os';

export function playgroundDir(): string {
	return join(tmpdir(), "vscode-rust-playground");
}

export function isPlyrs(fsPath?: string): string | null {
	if (!fsPath) {
		return null;
	}
	let rel = relative(playgroundDir(), fsPath);
	if (!rel.startsWith("..") && rel.endsWith(join("src", "main.rs"))) {
		return join(fsPath, "../..");
	}
	return null;
}
