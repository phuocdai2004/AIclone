#!/usr/bin/env python3
"""
Cleanup script to remove unwanted clones from MongoDB
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://phuocdai:phuocdai2004@cluster0.lbp6r6d.mongodb.net/aiclone")
MONGO_DB = os.getenv("MONGO_DB", "aiclone_db")

# Connect to MongoDB
client = MongoClient(MONGO_URL)
db = client[MONGO_DB]
clones_collection = db["clones"]

# Remove the 3 clones we don't want
clones_to_remove = ["Albert Einstein", "Sherlock Holmes", "Marie Curie"]

for clone_name in clones_to_remove:
    result = clones_collection.delete_one({"name": clone_name})
    if result.deleted_count > 0:
        print(f"[OK] Removed clone: {clone_name}")
    else:
        print(f"[WARN] Clone not found: {clone_name}")

# Show remaining clones
print("\n[INFO] Remaining clones:")
remaining = clones_collection.find({})
for clone in remaining:
    print(f"  - {clone.get('name', 'Unknown')}")

client.close()
print("\n[OK] Cleanup complete!")
