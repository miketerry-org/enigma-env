# enigma-env

`enigma-env` is a simple Node.js package designed to securely encrypt and decrypt your `.env` file using AES-256 encryption. The goal of this package is to allow developers to securely store sensitive environment variables in an encrypted format and only require one environment variable to be set on your deployment server: `ENIGMA_ENV_KEY`. This approach ensures that your `.env` file can be safely encrypted and decrypted without exposing the sensitive information, and the only thing you need to configure, on your deployment server, is a single encryption key.

## Usage

To use this package in your application, simply add the following line to the top of your main entry point script. This might be "index.js", "app.js", "server.js" or any other file.

````js
require("enigma-env").run();
```

##How it works

The run function will look for an encryption key in the "enigma-env-key.txt" file. If the file does not exist, it will check for the key in the environment variable "ENIGMA_ENV_KEY".  If the key cannot be found, the application will display an error and halt.
If the key is found, the ".enigma.env" file will be decrypted and all values will be automatically assigned as properties on the "process.env" global object.

##Encrypting your .env file

To create the encrypted environment variables file, run your application with the --encrypt command line parameter:

```js
node index.js --encrypt
```

or

```js
node app.js --encrypt
```

or

```js
node server.js --encrypt
```

depending on the name of your main source file.

This will generate a new encryption key, save it to the "enigma-env-key.txt" file and halt the process displaying a success message.

##Constants

the following constants are used to manage all functions.

```js
const unencryptedFilename = ".env";
```

The name of the plain text environment variables file.

```js
const encryptedFilename = ".enigma.env";
```

the name of the encrypted variables file.

```js
const keyFilename = "enigma-env-key.txt";
```

The name of the file where the encryption key is stored. This file is intended to be used during development and should never be commited to source control. You should ensure only authorized individuals have access to this file. When deploying to production, the contents of this file needs to be assigned to the environment variable, "ENIGMA_ENV_KEY" on your deployment server.

```js
const keyVarName = "ENIGMA_ENV_KEY";
```

This is the name of the environment variable containing the encryption key stored in the ".enigma.env" file.

##Functions

###function run()

This is the only function exported by this package you should need to call during typical use of this package. It checks for the --encrypt command line parameter to determine whether to encrypt or decrypt the .env file. If --encrypt is provided, it generates a new encryption key and encrypts the .env file before exiting the program with a success message.

If the "--encrypt" command line parameter is not specified, it decrypts the .enigma.env file and loads the environment variables into process.env.

Be sure to place the following line of code at the top of your main source file.  This will ensure all environemt variables are available to all other modules:

```js
require("enigma-env").run();
```

###function makeEncryptKey()

This function generates a new 256-bit (32 bytes) random encryption key, encodes it in Base64, and saves it to the "enigma-env-key.txt" file. It returns the generated encryption key as a Buffer.

In normal use of this package, you should have no need to use this function.

###function loadencryptKey()

This function Loads the encryption key from the "enigma-env-key.txt" file. If the file does not exist, it will try to use the "process.env.ENIGMA_ENV_KEY" environment variable. If the key is not found in either location, it throws an error. If the encryption key is found, it returns the decoded encryption key as a Buffer.

In normal use of this package, you should have no need to use this function.

###function encryptEnvFile()

This function encrypts the ".env", plain text environment variable file, using AES-256-CBC encryption. The encryption key is generated using the "makeEncryptKey" function, and the encrypted data, along with the IV, is saved to the ".enigma.env" file.

This is a text file which is safe to distribute. It should be commited to source control and distributed to deployment servers. Be sure you assign the contents of the "enigma-env-key.txt"file in the environment variable, "ENIGMA_ENV_KEY" on your deployment server.

In normal use of this package, you should have no need to use this function.

###function decryptEnvFile()

This function decrypts the encrypted environment variable file. It uses the encryption key loaded from loadencryptKey(). The decrypted content is parsed and all key-value pairs are added to the "process.env" global object. It throws an error if the decryption or file format is invalid.

In normal use of this package, you should have no need to use this function.
````
