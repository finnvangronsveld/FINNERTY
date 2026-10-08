'use client';
import { useEffect, useRef, useState } from 'react';
import { APPS, AppId, AppProps } from '../apps';
import { basename, getNode, join, list, makeFolder, parent, split, trash, writeFile } from '../fs';
import { getState } from '../store';
import { close, openApp, openFile, play } from '../wm';
import type { SoundName } from '@/lib/sfx';

type Line = { kind: 'in' | 'out' | 'err'; text: string };

const HELP = `Commands:
  ls [dir]          list files
  cd <dir>          change folder (.. goes up, ~ is home)
  pwd               show the current folder
  cat <file>        print a text file
  open <file|app>   open a file, folder or app
  mkdir <name>      make a folder
  touch <name>      make an empty text file
  rm <name>         move to the Trash
  echo <text>       print text (echo hi > note.txt saves it)
  apps              list the apps
  play <sound>      hello, follow, raid, hype, gg, clip, cozy, lurk, brb, oops, thanks, night
  twitch            open the stream
  neofetch          system info
  date, whoami, clear, history, exit`;

function resolve(cwd: string, arg?: string) {
  if (!arg || arg === '~') return '/';
  const base = arg.startsWith('/') ? [] : split(cwd);
  for (const part of split(arg.replace(/^~\/?/, '/'))) {
    if (part === '.') continue;
    if (part === '..') base.pop();
    else base.push(part);
  }
  return '/' + base.join('/');
}

export function Terminal({ win }: AppProps) {
  const [cwd, setCwd] = useState('/');
  const [lines, setLines] = useState<Line[]>([
    { kind: 'out', text: `Last login: ${new Date().toLocaleString('en-GB')} on ttys000` },
    { kind: 'out', text: 'Welcome to FinnOS. Type "help" to see what you can do.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroll.current?.scrollTo(0, scroll.current.scrollHeight);
  }, [lines]);

  const prompt = `finn@finnos ${cwd === '/' ? '~' : basename(cwd)} %`;

  const run = (raw: string) => {
    const out: Line[] = [{ kind: 'in', text: `${prompt} ${raw}` }];
    const say = (text: string) => out.push({ kind: 'out', text });
    const err = (text: string) => out.push({ kind: 'err', text });
    const [cmd, ...args] = raw.trim().split(/\s+/);
    const arg = args.join(' ');

    switch (cmd) {
      case undefined:
      case '':
        break;
      case 'help':
        say(HELP);
        break;
      case 'clear':
        setLines([]);
        return;
      case 'pwd':
        say(cwd === '/' ? '/Users/finn' : `/Users/finn${cwd}`);
        break;
      case 'ls': {
        const p = resolve(cwd, args[0] ?? '.');
        const n = getNode(p);
        if (!n) err(`ls: ${args[0]}: No such file or directory`);
        else if (n.kind !== 'folder') say(n.name);
        else say(list(p).map((x) => (x.kind === 'folder' ? `${x.name}/` : x.name)).join('    ') || '');
        break;
      }
      case 'cd': {
        const p = resolve(cwd, args[0]);
        const n = getNode(p);
        if (!n) err(`cd: no such file or directory: ${args[0]}`);
        else if (n.kind !== 'folder') err(`cd: not a directory: ${args[0]}`);
        else setCwd(p);
        break;
      }
      case 'cat': {
        const n = getNode(resolve(cwd, arg));
        if (!n) err(`cat: ${arg}: No such file or directory`);
        else if (n.kind === 'folder') err(`cat: ${arg}: Is a directory`);
        else if (n.kind === 'text') say(n.content ?? '');
        else say(`[${n.kind}] ${n.kind === 'link' ? n.content : 'binary file'}`);
        break;
      }
      case 'open': {
        const app = Object.values(APPS).find((a) => a.name.toLowerCase() === arg.toLowerCase() || a.id === arg.toLowerCase());
        if (app) {
          openApp(app.id as AppId);
          break;
        }
        const p = resolve(cwd, arg);
        if (getNode(p)) openFile(p);
        else err(`The file ${arg} does not exist.`);
        break;
      }
      case 'mkdir':
        if (!arg) err('usage: mkdir <name>');
        else makeFolder(cwd, arg);
        break;
      case 'touch':
        if (!arg) err('usage: touch <name>');
        else if (!getNode(join(cwd, arg))) writeFile(join(cwd, arg), '');
        break;
      case 'rm': {
        const p = resolve(cwd, arg);
        if (!arg || p === '/' || ['/Desktop', '/Documents', '/Pictures', '/Trash'].includes(p)) err('rm: not allowed here');
        else if (!getNode(p)) err(`rm: ${arg}: No such file or directory`);
        else {
          trash(p);
          play('trash');
        }
        break;
      }
      case 'echo': {
        const m = /^(.*?)\s*>\s*(\S+)$/.exec(arg);
        if (m) {
          const target = resolve(cwd, m[2]);
          if (getNode(parent(target))) writeFile(target, m[1] + '\n');
          else err(`echo: no such directory: ${parent(target)}`);
        } else say(arg);
        break;
      }
      case 'apps':
        say(Object.values(APPS).map((a) => `${a.name.padEnd(20)}${a.blurb}`).join('\n'));
        break;
      case 'play': {
        const name = `sb-${args[0]}` as SoundName;
        const ok = ['hello', 'follow', 'raid', 'hype', 'gg', 'clip', 'cozy', 'lurk', 'brb', 'oops', 'thanks', 'night'].includes(args[0]);
        if (ok) play(name);
        else err('play: unknown sound. Try: play hype');
        break;
      }
      case 'twitch':
        openApp('twitch');
        say('Opening the stream...');
        break;
      case 'date':
        say(new Date().toString());
        break;
      case 'whoami':
        say('finn');
        break;
      case 'history':
        say(history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n'));
        break;
      case 'sudo':
        err('finn is not in the sudoers file. This incident will be reported.');
        break;
      case 'neofetch': {
        const s = getState();
        say(
          [
            '        .:::.          finn@finnos',
            '      .:::::::.        -----------',
            "     :::' ':::::       OS: FinnOS 10.6 Aqua",
            '    :::  F  ::::       Host: finnerty.vercel.app',
            "     :::. .:::::       Shell: zsh (pretend)",
            "      ':::::::'        Windows: " + s.windows.length,
            "        ':::'          Wallpaper: " + s.settings.wallpaper,
            '                       Twitch: ' + (s.live ? 'LIVE' : s.live === false ? 'offline' : 'unknown'),
          ].join('\n'),
        );
        break;
      }
      case 'exit':
        close(win.id);
        return;
      default:
        err(`zsh: command not found: ${cmd}`);
        play('error', { gain: 0.5 });
    }
    setLines((l) => [...l, ...out]);
  };

  return (
    <div className="terminal" ref={scroll} onPointerUp={() => window.getSelection()?.isCollapsed && inputRef.current?.focus()}>
      {lines.map((l, i) => (
        <pre key={i} className={`terminal__line terminal__line--${l.kind}`}>
          {l.text}
        </pre>
      ))}
      <form
        className="terminal__prompt"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) setHistory((h) => [...h, input]);
          setHIdx(-1);
          run(input);
          setInput('');
        }}
      >
        <span>{prompt}</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          spellCheck={false}
          autoComplete="off"
          aria-label="Command"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && history.length) {
              e.preventDefault();
              const i = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
              setHIdx(i);
              setInput(history[i]);
            }
            if (e.key === 'ArrowDown' && hIdx >= 0) {
              e.preventDefault();
              const i = hIdx + 1;
              if (i >= history.length) {
                setHIdx(-1);
                setInput('');
              } else {
                setHIdx(i);
                setInput(history[i]);
              }
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              const parts = input.split(' ');
              const last = parts.pop() ?? '';
              const match = list(cwd).find((n) => n.name.toLowerCase().startsWith(last.toLowerCase()));
              if (match) setInput([...parts, match.name].join(' '));
            }
            if (e.key === 'l' && e.ctrlKey) {
              e.preventDefault();
              setLines([]);
            }
          }}
        />
      </form>
    </div>
  );
}
