// makeEncryptKey.test.js:

// load all necessary modules
const { test } = require("node:test");
const assert = require("assert");
const fs = require("fs");
const {
  unencryptedFilename,
  encryptedFilename,
  keyFilename,
  keyVarName,
  makeEncryptKey,
  loadencryptKey,
  encryptEnvFile,
  decryptEnvFile,
  run,
} = require("../index");

test("filenames/envar name", () => {
  assert.strictEqual(unencryptedFilename, ".env");
  assert.strictEqual(encryptedFilename, ".enigma.env");
  assert.strictEqual(keyFilename, "enigma-env-key.txt");
  assert.strictEqual(keyVarName, "ENIGMA_ENV_KEY");
});

test("makeEncryptKey", () => {
  // define variables
  let exists;
  let encryptKey;

  // delete any existing key file
  if (fs.existsSync(keyFilename)) {
    fs.unlinkSync(keyFilename);
    exists = fs.existsSync(keyFilename);
    assert.strictEqual(exists, false);
  }

  encryptKey = makeEncryptKey();
  exists = fs.existsSync(keyFilename);
  assert.strictEqual(encryptKey.length, 32);
  assert.strictEqual(exists, true);
});

test("loadEncryptKey", () => {
  let encryptKey = loadencryptKey();
  assert.strictEqual(encryptKey.length, 32);
});

test("encryptEnvFile", () => {
  encryptEnvFile();
});

test("decryptEnvFile", () => {
  decryptEnvFile();
});

test("run", () => {
  run();
});
