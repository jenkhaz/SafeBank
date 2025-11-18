#!/usr/bin/env python3
"""
Generate RSA key pair for JWT signing (RS256)
Run this once to generate keys for production
"""

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import os

def generate_rsa_keys():
    """Generate RSA private and public keys for JWT signing."""
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Serialize private key
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Extract public key
    public_key = private_key.public_key()
    
    # Serialize public key
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return private_pem, public_pem


def main():
    print("Generating RSA key pair for JWT signing...")
    
    # Create keys directory if it doesn't exist
    os.makedirs("keys", exist_ok=True)
    
    # Generate keys
    private_key, public_key = generate_rsa_keys()
    
    # Save private key (only for Auth Service)
    with open("keys/jwt_private_key.pem", "wb") as f:
        f.write(private_key)
    print("✓ Private key saved to: keys/jwt_private_key.pem")
    
    # Save public key (for all services)
    with open("keys/jwt_public_key.pem", "wb") as f:
        f.write(public_key)
    print("✓ Public key saved to: keys/jwt_public_key.pem")
    
    print("\n" + "="*60)
    print("IMPORTANT SECURITY NOTES:")
    print("="*60)
    print("1. Add 'keys/' to .gitignore - NEVER commit keys to git!")
    print("2. Private key should ONLY be accessible to Auth Service")
    print("3. Public key can be shared with all services")
    print("4. Backup private key securely")
    print("5. In production, use proper secret management (AWS Secrets Manager, Vault, etc.)")
    print("="*60)
    
    # Create .gitignore entry
    gitignore_path = ".gitignore"
    gitignore_entry = "\n# JWT Keys - DO NOT COMMIT\nkeys/\n*.pem\n"
    
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r") as f:
            content = f.read()
        if "keys/" not in content:
            with open(gitignore_path, "a") as f:
                f.write(gitignore_entry)
            print("\n✓ Added keys/ to .gitignore")
    else:
        with open(gitignore_path, "w") as f:
            f.write(gitignore_entry)
        print("\n✓ Created .gitignore with keys/ entry")
    
    print("\nKeys generated successfully! ✓")
    print("Next steps:")
    print("1. Update docker-compose.yaml to mount keys as volumes")
    print("2. Update Auth Service to use private key for signing")
    print("3. Update other services to use public key for verification")


if __name__ == "__main__":
    main()
