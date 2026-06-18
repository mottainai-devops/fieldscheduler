#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/public/index.html');
console.log('Reading:', indexPath);
let html = fs.readFileSync(indexPath, 'utf-8');

const timestamp = Date.now();
console.log('Timestamp:', timestamp);

// Find and replace script tags
const before = html.match(/src="\/assets\/index-[^"]*\.js"/)[0];
console.log('Before:', before);

html = html.replace(/src="\/assets\/index-([a-zA-Z0-9_]*)\.js"/g, `src="/assets/index-$1.js?v=${timestamp}"`);
html = html.replace(/href="\/assets\/index-([a-zA-Z0-9_]*)\.css"/g, `href="/assets/index-$1.css?v=${timestamp}"`);

const after = html.match(/src="\/assets\/index-[^"]*\.js"/)[0];
console.log('After:', after);

fs.writeFileSync(indexPath, html);
console.log(`✅ Cache-buster added: v=${timestamp}`);
