#!/usr/bin/env node

"use strict";

/**
 * enigma-env v2
 * Breaking change: AES-256-GCM only
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// =========================
// Constants
// =========================

const FORMAT_VERSION = "ENIGMA_ENV_V3";

const unencryptedFilename = ".env";
const encryptedFilename = ".env.enigma";
const keyFilename = ".env.enigma-key";
const keyVarName = "ENIGMA_ENV_KEY";

const KEY_LENGTH = 32; // 256-bit
const IV_LENGTH = 12; // recommended for GCM

// =========================
// Utils
// =========================

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fileExists(file) {
  return fs.existsSync(file);
}

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function writeFileSecure(file, data) {
  fs.writeFileSync(file, data, { encoding: "utf8", mode: 0o600 });
}

// =========================
// Key Handling
// =========================

function makeEncryptKey(force = false) {
  if (!force && fileExists(keyFilename)) {
    throw new Error(
      `Encryption key already exists at ${keyFilename}. Use --force to overwrite.`
    );
  }

  const key = crypto.randomBytes(KEY_LENGTH);
  writeFileSecure(keyFilename, key.toString("base64"));

  return key;
}

function loadEncryptKey() {
  let base64Key;

  if (fileExists(keyFilename)) {
    base64Key = readFile(keyFilename).trim();
  } else if (process.env[keyVarName]) {
    base64Key = process.env[keyVarName].trim();
  } else {
    throw new Error(
      `Encryption key not found. Provide ${keyFilename} or ${keyVarName}.`
    );
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(base64Key)) {
    throw new Error("Encryption key is not valid Base64.");
  }

  const key = Buffer.from(base64Key, "base64");

  assert(
    key.length === KEY_LENGTH,
    "Invalid encryption key length (expected 32 bytes)."
  );

  return key;
}

// =========================
// Encryption (GCM)
// =========================

function encryptEnvFile(force = false) {
  if (!fileExists(unencryptedFilename)) {
    throw new Error(".env file not found.");
  }

  const raw = readFile(unencryptedFilename);

  if (!raw.trim()) {
    throw new Error(".env file is empty, refusing to encrypt.");
  }

  const key = makeEncryptKey(force);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(raw, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  const output = [
    FORMAT_VERSION,
    iv.toString("base64"),
    authTag,
    encrypted,
  ].join("\n");

  writeFileSecure(encryptedFilename, output);

  return {
    encryptedFile: encryptedFilename,
    keyFile: keyFilename,
  };
}

// =========================
// Decryption (GCM only)
// =========================

function decryptEnvFile() {
  if (!fileExists(encryptedFilename)) {
    throw new Error(`${encryptedFilename} not found.`);
  }

  const content = readFile(encryptedFilename);

  const [version, ivB64, tagB64, dataB64] = content.split("\n");

  assert(version === FORMAT_VERSION, "Unsupported file format version.");
  assert(ivB64 && tagB64 && dataB64, "Corrupt encrypted file format.");

  const key = loadEncryptKey();

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encryptedData = Buffer.from(dataB64, "base64");

  assert(iv.length === IV_LENGTH, "Invalid IV length.");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  const parsed = dotenv.parse(decrypted);

  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return parsed;
}

// =========================
// CLI Runner
// =========================

async function run(options = {}) {
  const args = process.argv.slice(2);
  const isEncrypt = args.includes("--encrypt");
  const force = args.includes("--force");
  const verbose = args.includes("--verbose");

  try {
    if (isEncrypt) {
      if (verbose) console.log("Encrypting .env...");

      const result = encryptEnvFile(force);

      if (verbose) {
        console.log("Encrypted:", result.encryptedFile);
        console.log("Key saved:", result.keyFile);
      }

      // always exit program after encryption
      process.exit(0);
    }

    if (verbose) console.log("Decrypting .enigma.env...");

    const env = decryptEnvFile();

    if (verbose) console.log("Loaded environment variables");

    return env;
  } catch (err) {
    console.error("[enigma-env]", err.message);
    throw err;
  }
}

// =========================
// Auto-run CLI only
// =========================

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

// =========================
// Exports
// =========================

module.exports = {
  unencryptedFilename,
  encryptedFilename,
  keyFilename,
  keyVarName,

  FORMAT_VERSION,

  makeEncryptKey,
  loadEncryptKey,
  encryptEnvFile,
  decryptEnvFile,
  run,
};
