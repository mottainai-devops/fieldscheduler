#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '../dist/public/index.html');

console.log('Reading:', indexPath);
let html = fs.readFileSync(indexPath, 'utf-8');

const timestamp = Date.now();
console.log('Timestamp:', timestamp);

// Find and replace script tags - include hyphen in character class!
const scriptMatch = html.match(/src="\/assets\/index-[^"]*\.js"/);
if (scriptMatch) {
  console.log('Before:', scriptMatch[0]);
}

html = html.replace(/src="\/assets\/index-([a-zA-Z0-9_-]*)\.js"/g, `src="/assets/index-$1.js?v=${timestamp}"`);
html = html.replace(/href="\/assets\/index-([a-zA-Z0-9_-]*)\.css"/g, `href="/assets/index-$1.css?v=${timestamp}"`);

const scriptMatchAfter = html.match(/src="\/assets\/index-[^"]*\.js"/);
if (scriptMatchAfter) {
  console.log('After:', scriptMatchAfter[0]);
}

fs.writeFileSync(indexPath, html);
console.log(`✅ Cache-buster added: v=${timestamp}`);
