#!/usr/bin/env node
/**
 * Run task validation from the terminal. Uses the operation log by default:
 * reads logs/user_actions.log, replays operations (validate/replay), then
 * runs the selected task validator.
 *
 * Usage:
 *   node run-validate.mjs                     # log -> replay -> validate (default task)
 *   TASK=equilateral-triangle node run-validate.mjs
 *   TASK=parallel-lines node run-validate.mjs
 *   node run-validate.mjs snapshot.json      # validate snapshot file
 *   node run-validate.mjs < snapshot.json    # validate from stdin
 *
 * Tasks: line-and-points (default) | equilateral-triangle | parallel-lines
 * LOG_FILE=path/to.log to override log path.
 * Exit code: 0 = valid, 1 = invalid or error.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DEFAULT_LOG_FILE = resolve(process.cwd(), 'logs', 'user_actions.log');

const replay = require('./validate/replay.js');
const tasks = require('./validate/tasks.js');

function readSnapshotFromFile(path) {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    process.exit(1);
  }
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function readStdin() {
  return new Promise((resolveStdin, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const text = chunks.join('').trim();
      if (!text) {
        reject(new Error('No snapshot provided. Pass a file path or pipe JSON to stdin.'));
        return;
      }
      try {
        resolveStdin(JSON.parse(text));
      } catch (e) {
        reject(new Error('Invalid JSON: ' + e.message));
      }
    });
    process.stdin.on('error', reject);
  });
}

async function main() {
  const fileArg = process.argv[2];
  const taskId = process.env.TASK || 'line-and-points';

  let snapshot;
  if (fileArg) {
    snapshot = readSnapshotFromFile(fileArg);
  } else if (!process.stdin.isTTY) {
    snapshot = await readStdin();
  } else {
    const logPath = process.env.LOG_FILE ? resolve(process.cwd(), process.env.LOG_FILE) : DEFAULT_LOG_FILE;
    try {
      snapshot = replay.replayLogToSnapshot(logPath);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }

  const result = tasks.runTask(taskId, snapshot);

  console.log(result.message);
  process.exit(result.valid ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
