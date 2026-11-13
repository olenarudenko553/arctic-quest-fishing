#!/usr/bin/env node
/**
 * Build-time asset encryptor.
 *
 * Encrypts image files in an asset directory to .enc files using AES-256-GCM.
 * Wire format: IV(12) | ciphertext | GCM tag(16) — matches SecureAssets.kt.
 *
 * Usage:
 *   node scripts/security/encryptAssets.js <assetDir> <keyHex>
 *
 *   <assetDir>  Directory containing .png/.jpg/.webp assets
 *   <keyHex>    32-byte key as 64 hex chars (derive from your PBKDF2 output)
 *
 * Output: <assetDir>/<name>.enc files ready to copy into android/app/src/main/assets/
 *
 * Runtime decryption: SecureAssets.kt readAndDecrypt(ctx, "name.enc", key)
 */

"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SUPPORTED = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const IV_LEN = 12;

function encryptBuffer(plain, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes (default)
  return Buffer.concat([iv, ct, tag]);
}

function run(assetDir, keyHex) {
  if (keyHex.length !== 64) {
    console.error("Error: keyHex must be 64 hex chars (32 bytes for AES-256).");
    process.exit(1);
  }
  const key = Buffer.from(keyHex, "hex");

  const absDir = path.resolve(assetDir);
  if (!fs.existsSync(absDir)) {
    console.error(`Error: directory not found: ${absDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(absDir).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED.has(ext) && !f.startsWith(".");
  });

  if (files.length === 0) {
    console.log("No supported asset files found.");
    return;
  }

  for (const file of files) {
    const src = path.join(absDir, file);
    const out = src + ".enc";
    const plain = fs.readFileSync(src);
    const enc = encryptBuffer(plain, key);
    fs.writeFileSync(out, enc);
    const ratio = ((enc.length / plain.length) * 100 - 100).toFixed(1);
    console.log(`  encrypted: ${file} → ${path.basename(out)}  (+${ratio}% overhead)`);
  }
  console.log(`Done. ${files.length} file(s) encrypted in ${absDir}`);
}

const [assetDir, keyHex] = process.argv.slice(2);
if (!assetDir || !keyHex) {
  console.error("Usage: node encryptAssets.js <assetDir> <keyHex64>");
  process.exit(1);
}
run(assetDir, keyHex);
