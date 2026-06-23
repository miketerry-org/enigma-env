# enigma-env

`enigma-env` is a Node.js package designed to securely encrypt and decrypt your `.env` file using **AES-256-GCM authenticated encryption**.

This is a **breaking v2 release** that improves security, adds tamper protection, and uses full `dotenv` compatibility for parsing environment variables.

Instead of distributing raw `.env` files, you can safely commit an encrypted `.enigma.env` file and deploy it using a single secret key:

`ENIGMA_ENV_KEY`

---

## 🔐 Key Improvements in v2

- AES-256-GCM (authenticated encryption)
- Tamper detection (auth tag verification)
- Breaking format change (`ENIGMA_ENV_V2`)
- Uses `dotenv` for full `.env` compatibility
- Secure file permissions (0600)
- `--force` required for key overwrite
- Prevents empty `.env` encryption
- Safer environment variable loading

---

## 📦 Installation

```bash
npm install enigma-env