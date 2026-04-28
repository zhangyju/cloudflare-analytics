#!/usr/bin/env python3
"""
Cloudflare Resources Setup Script
Creates R2 buckets and KV namespaces
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')
ZONE_ID = os.getenv('CLOUDFLARE_ZONE_ID', '')

if not ACCOUNT_ID or not API_TOKEN:
    print("❌ Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required")
    print("Please check your .env file")
    sys.exit(1)

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}"
HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def print_header(text):
    print(f"\n{'='*50}")
    print(f"🔧 {text}")
    print(f"{'='*50}")

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_info(text):
    print(f"ℹ️  {text}")

def check_r2_bucket(bucket_name):
    """Check if R2 bucket exists"""
    print_info(f"Checking R2 bucket: {bucket_name}")
    
    try:
        response = requests.get(
            f"{BASE_URL}/r2/buckets",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            buckets = response.json().get('result', [])
            for bucket in buckets:
                if bucket.get('name') == bucket_name:
                    print_success(f"R2 bucket '{bucket_name}' already exists")
                    return bucket.get('id')
            return None
        else:
            print_error(f"Failed to list R2 buckets: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error checking R2 bucket: {e}")
        return None

def create_r2_bucket(bucket_name):
    """Create R2 bucket"""
    print_info(f"Creating R2 bucket: {bucket_name}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/r2/buckets",
            headers=HEADERS,
            json={"name": bucket_name}
        )
        
        if response.status_code == 200:
            bucket = response.json().get('result', {})
            bucket_id = bucket.get('id')
            print_success(f"R2 bucket created: {bucket_name}")
            return bucket_id
        elif response.status_code == 400 and 'bucket-exists' in response.text:
            print_success(f"R2 bucket '{bucket_name}' already exists")
            return check_r2_bucket(bucket_name)
        else:
            print_error(f"Failed to create R2 bucket: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating R2 bucket: {e}")
        return None

def check_kv_namespace(namespace_title):
    """Check if KV namespace exists"""
    print_info(f"Checking KV namespace: {namespace_title}")
    
    try:
        response = requests.get(
            f"{BASE_URL}/storage/kv/namespaces",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            namespaces = response.json().get('result', [])
            for ns in namespaces:
                if ns.get('title') == namespace_title:
                    print_success(f"KV namespace '{namespace_title}' already exists")
                    return ns.get('id')
            return None
        else:
            print_error(f"Failed to list KV namespaces: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error checking KV namespace: {e}")
        return None

def create_kv_namespace(namespace_title):
    """Create KV namespace"""
    print_info(f"Creating KV namespace: {namespace_title}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/storage/kv/namespaces",
            headers=HEADERS,
            json={"title": namespace_title}
        )
        
        if response.status_code == 200:
            namespace = response.json().get('result', {})
            namespace_id = namespace.get('id')
            print_success(f"KV namespace created: {namespace_title}")
            return namespace_id
        elif response.status_code == 400 and 'key-namespace-collision' in response.text:
            print_success(f"KV namespace '{namespace_title}' already exists")
            return check_kv_namespace(namespace_title)
        else:
            print_error(f"Failed to create KV namespace: {response.text}")
            return None
    except Exception as e:
        print_error(f"Error creating KV namespace: {e}")
        return None

def update_wrangler_toml(r2_bucket_id, kv_namespace_id):
    """Update wrangler.toml with resource IDs"""
    print_info("Updating wrangler.toml")
    
    try:
        with open('wrangler.toml', 'r') as f:
            content = f.read()
        
        # Update KV ID
        content = content.replace('id = "YOUR_KV_ID"', f'id = "{kv_namespace_id}"')
        
        with open('wrangler.toml', 'w') as f:
            f.write(content)
        
        print_success("wrangler.toml updated")
        return True
    except Exception as e:
        print_error(f"Error updating wrangler.toml: {e}")
        return False

def main():
    print_header("Cloudflare Analytics Setup")
    
    print(f"Account ID: {ACCOUNT_ID}")
    print(f"Zone ID: {ZONE_ID or 'Not configured (optional)'}")
    
    # Setup R2
    print_header("Setting up R2 Storage")
    r2_bucket_id = check_r2_bucket('cf-logs')
    if not r2_bucket_id:
        r2_bucket_id = create_r2_bucket('cf-logs')
    
    if not r2_bucket_id:
        print_error("Failed to setup R2 bucket")
        sys.exit(1)
    
    print_success(f"R2 bucket ready with ID: {r2_bucket_id}")
    
    # Setup KV
    print_header("Setting up KV Namespace")
    kv_namespace_id = check_kv_namespace('CACHE')
    if not kv_namespace_id:
        kv_namespace_id = create_kv_namespace('CACHE')
    
    if not kv_namespace_id:
        print_error("Failed to setup KV namespace")
        sys.exit(1)
    
    print_success(f"KV namespace ready with ID: {kv_namespace_id}")
    
    # Update configuration
    print_header("Updating Configuration")
    if update_wrangler_toml(r2_bucket_id, kv_namespace_id):
        print_success("Configuration files updated")
    else:
        print_error("Failed to update configuration")
        sys.exit(1)
    
    # Print summary
    print_header("Setup Summary")
    print(f"✅ R2 Bucket: cf-logs (ID: {r2_bucket_id})")
    print(f"✅ KV Namespace: CACHE (ID: {kv_namespace_id})")
    print(f"✅ Configuration updated")
    
    print("\n" + "="*50)
    print("📝 Next steps:")
    print("="*50)
    print(f"""
1. Install dependencies:
   npm install

2. Build the project:
   npm run build

3. Deploy to Cloudflare:
   wrangler publish --env production
   wrangler pages deploy dist/pages --project-name cf-analytics

4. Setup Logpush at:
   https://dash.cloudflare.com/?to=/:account/analytics/logpush
   
   Dataset: HTTP Requests
   Destination: R2 bucket 'cf-logs'
   Frequency: Hourly (recommended for cost)
   Filter: (optional)

5. Visit your dashboard once deployed!
""")

if __name__ == '__main__':
    main()
