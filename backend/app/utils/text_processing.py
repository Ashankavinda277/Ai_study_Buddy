import re

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)          # collapse multiple spaces/newlines
    text = re.sub(r'[^\S\r\n]+', ' ', text)   # normalize whitespace
    return text.strip()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks