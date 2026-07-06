import chromadb

client = chromadb.PersistentClient(path='./chroma_pdf_db')
collections = client.list_collections()

print(f"Total Collections: {len(collections)}")
for col in collections:
    c = client.get_collection(col.name)
    data = c.get()
    docs = data.get('documents', [])
    metas = data.get('metadatas', [])
    
    found = False
    for idx, (doc, meta) in enumerate(zip(docs, metas)):
        if "terraform" in doc.lower():
            print(f"Match in Collection {col.name} - Doc {idx} (Page {meta.get('page', 0)+1}):")
            print(f"  {repr(doc[:300])}\n")
            found = True
    if not found:
        print(f"No match in Collection {col.name}")
