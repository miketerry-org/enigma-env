#!/usr/bin/env node

// load all necessary packages
const crypto = require("crypto");
const fs = require("fs");
const process = require("process");

// filenames and process.env key
/**
 * The filename for the unencrypted environment file.
 * @constant {string}
 */
const unencryptedFilename = ".env";

/**
 * The filename for the encrypted environment file.
 * @constant {string}
 */
const encryptedFilename = ".enigma.env";

/**
 * The filename for the encryption key.
 * @constant {string}
 */
const keyFilename = "enigma-env-key.txt";

/**
 * The environment variable name used to store the encryption key.
 * @constant {string}
 */
const keyVarName = "ENIGMA_ENV_KEY";

/**
 * Generates a 256-bit (32 bytes) encryption key, encodes it in Base64,
 * saves it to a file, and returns the key.
 *
 * @function
 * @returns {Buffer} The 256-bit encryption key as a Buffer.
 */
function makeEncryptKey() {
  // Generate 256-bit (32 bytes) random key
  const encryptKey = crypto.randomBytes(32);

  // Save the key as a base 64 string to a file
  fs.writeFileSync(keyFilename, encryptKey.toString("base64"), "utf8");

  // return the 32-byte encryption key
  return encryptKey;
}

/**
 * Loads the encryption key from a file or environment variable.
 * The key must be a 256-bit (32 bytes) Base64-encoded string.
 *
 * @function
 * @throws {Error} If no encryption key is found in the file or environment variable.
 * @throws {Error} If the encryption key is not 32 bytes in length.
 * @returns {Buffer} The 256-bit encryption key as a binary buffer.
 */
function loadencryptKey() {
  let base64Key;

  try {
    // Try to read the Base64-encoded key from the file
    base64Key = fs.readFileSync(keyFilename, "utf8");
  } catch (err) {
    // If the file doesn't exist, check for the environment variable
    if (process.env[keyVarName]) {
      base64Key = process.env[keyVarName];
    } else {
      // If neither the file nor the environment variable is found, throw an error
      throw new Error(
        `No encryption key found. Please provide the key via "${keyFilename}" or the "${keyVarName}" environment variable.`
      );
    }
  }

  // Decode the Base64 key into a binary buffer (256-bit key for AES-256)
  let encryptKey = Buffer.from(base64Key, "base64");

  // Ensure the encryption key is valid length (32 bytes for AES-256)
  if (encryptKey.length !== 32) {
    throw new Error("The encryption key is invalid!");
  }

  return encryptKey;
}

/**
 * Encrypts the unencrypted environment file (.env) using AES-256-CBC.
 * A new encryption key is generated, and the resulting encrypted data is
 * written to the output file (.enigma.env).
 *
 * @function
 * @returns {null} This function does not return a value.
 */
function encryptEnvFile() {
  // make a new encryption key
  let encryptKey = makeEncryptKey();

  // Read the content of the input .env file (UTF-8)
  const envFileContent = fs.readFileSync(unencryptedFilename, "utf8");

  // Generate a random 16-byte IV for AES encryption
  const iv = crypto.randomBytes(16);

  // Create an AES cipher with AES-256-CBC mode
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptKey, iv);

  // Encrypt the data
  let encryptedData = cipher.update(envFileContent, "utf8", "base64");
  encryptedData += cipher.final("base64");

  // Prepare the final output which includes both the IV and encrypted data
  // IV is usually stored as Base64 along with the encrypted data
  const outputData = `${iv.toString("base64")}:${encryptedData}`;

  // Write the encrypted data (including IV) to the output file
  fs.writeFileSync(encryptedFilename, outputData, "utf8");

  // no function result so return null
  return null;
}

/**
 * Decrypts the encrypted environment file (.encrypted.env) using the encryption key
 * and assigns the resulting environment variables to `process.env`.
 * The encrypted file must contain both the IV and the encrypted data.
 *
 * @function
 * @throws {Error} If the encrypted file format is invalid or decryption fails.
 * @returns {null} This function does not return a value.
 */
function decryptEnvFile() {
  // Load the encryption key (either from file or from the environment variable)
  const encryptKey = loadencryptKey();

  // Ensure the encryption key is 256 bits (32 bytes) for AES-256
  if (encryptKey.length !== 32) {
    throw new Error(
      "The encrypt key must be 256 bits (32 bytes) long for AES-256 encryption."
    );
  }

  // Read the content of the encrypted file (which contains IV + encrypted data)
  const encryptedContent = fs.readFileSync(encryptedFilename, "utf8");

  // Extract the IV and the encrypted data from the file
  const [ivBase64, encryptedDataBase64] = encryptedContent.split(":");

  if (!ivBase64 || !encryptedDataBase64) {
    throw new Error("The encrypted file format is invalid.");
  }

  // Decode the IV and encrypted data from Base64
  const iv = Buffer.from(ivBase64, "base64");
  const encryptedData = Buffer.from(encryptedDataBase64, "base64");

  // Create an AES decipher with AES-256-CBC mode
  const decipher = crypto.createDecipheriv("aes-256-cbc", encryptKey, iv);

  // Decrypt the data
  let decryptedData = decipher.update(encryptedData, "base64", "utf8");
  decryptedData += decipher.final("utf8");

  // Parse the decrypted data as .env format (key=value pairs)
  const envLines = decryptedData.split("\n");

  // Loop through the lines and assign them to process.env
  envLines.forEach((line) => {
    line = line.trim();
    if (line && line.includes("=")) {
      const [key, value] = line.split("=");
      process.env[key] = value; // Assign each key-value pair to process.env
    }
  });
}

/**
 * Determines whether to encrypt or decrypt the environment file based on
 * the command-line arguments. Calls the respective function to perform
 * encryption or decryption, and handles errors accordingly.
 *
 * @function
 * @returns {null} This function does not return a value.
 */
function run() {
  // Check if the --encrypt command line argument is present
  const args = process.argv.slice(2); // Slice to remove the first two default arguments
  if (args.includes("--encrypt")) {
    try {
      // Generate and save a new encryption key
      makeEncryptKey();

      // Encrypt the .env file into a secure file
      encryptEnvFile();

      // Exit the process after encryption is done
      process.exit(0);
    } catch (error) {
      console.error("Error during encryption:", error.message);
      process.exit(1); // Exit with an error if encryption fails
    }
  } else {
    try {
      // Decrypt the encrypted file and assign the environment variables
      decryptEnvFile();
    } catch (error) {
      console.error("Error during decryption:", error.message);
      process.exit(1); // Exit with an error if decryption fails
    }
  }
}

// Export constants and functions for external use
module.exports = {
  unencryptedFilename,
  encryptedFilename,
  keyFilename,
  keyVarName,
  makeEncryptKey,
  loadencryptKey,
  encryptEnvFile,
  decryptEnvFile,
  run,
};
