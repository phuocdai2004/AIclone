#!/usr/bin/env python3
from google import genai

API_KEY = "AIzaSyCc--Ukp7CS7S1lPFFAJs_k5FUbv8deMgM"
client = genai.Client(api_key=API_KEY)

print("Available models:")
for model in client.models.list():
    print(f"  - {model.name}")
