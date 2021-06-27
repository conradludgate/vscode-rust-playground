import { join } from 'path';
import * as vscode from 'vscode';
import { playgroundDir } from './dir';

export class PlaygroundLinkProvider implements vscode.TerminalLinkProvider<PlaygroundLink> {
    /**
     * Provide terminal links for the given context. Note that this can be called multiple times
     * even before previous calls resolve, make sure to not share global objects (eg. `RegExp`)
     * that could have problems when asynchronous usage may overlap.
     * @param context Information about what links are being provided for.
     * @param token A cancellation token.
     * @return A list of terminal links for the given line.
     */
    provideTerminalLinks(context: vscode.TerminalLinkContext, token: vscode.CancellationToken): vscode.ProviderResult<PlaygroundLink[]> {
        let links = [];
        let terminalMatch = context.terminal.creationOptions.name?.match(/Rust Playground \((.+)\) - stderr/);
        if (terminalMatch) {
            let cwd = join(playgroundDir(), terminalMatch[1]);
            let match;

            let errorRe = /error\[(E\d+)\]/g;
            while ((match = errorRe.exec(context.line)) !== null) {
                let startIndex = match.index;
                let length = errorRe.lastIndex - startIndex;
                let error = match[1];
                links.push(<PlaygroundLink>{
                    startIndex,
                    length,
                    error,
                    cwd,
                });
            }

            let fileRe = /--> (src\/main\.rs)\:(\d+)\:(\d+)/g;
            while ((match = fileRe.exec(context.line)) !== null) {
                let startIndex = match.index;
                let length = fileRe.lastIndex - startIndex;
                let file: [string, number, number] = [match[1], +match[2]-1, +match[3]-1];
                links.push(<PlaygroundLink>{
                    startIndex,
                    length,
                    file,
                    cwd,
                });
            }
        }

        return links;
    }

    /**
     * Handle an activated terminal link.
     * @param link The link to handle.
     */
    handleTerminalLink(link: PlaygroundLink): vscode.ProviderResult<void> {
        if (link.error) {
            return vscode.env.openExternal(vscode.Uri.parse(`https://doc.rust-lang.org/stable/error-index.html#${link.error}`, true)).then(() => { });
        } else if (link.file) {
            let [filename, line, col] = link.file;
            let doc = vscode.workspace.textDocuments.find((doc) =>
                doc.uri.fsPath.startsWith(link.cwd) && doc.uri.fsPath.endsWith(filename)
            );
            if (doc) {
                vscode.window.showTextDocument(doc, {
                    selection: new vscode.Range(line, col, line, col),
                });
            }
        }
    }
}

interface PlaygroundLink extends vscode.TerminalLink {
    cwd: string;
    error?: string;
    file?: [string, number, number];
}
