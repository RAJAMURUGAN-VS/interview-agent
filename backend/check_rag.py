import ast
import sys

# ---- Syntax check ----
with open("app/services/rag_service.py", encoding="utf-8") as f:
    src = f.read()
try:
    ast.parse(src)
    print("SYNTAX: OK")
except SyntaxError as e:
    print("SYNTAX ERROR:", e)
    sys.exit(1)

# ---- Meta-query logic test ----
_META_QUERY_PHRASES = (
    "this pdf", "this document", "the pdf", "the document",
    "topics covered", "what topics", "what are the topics",
    "what is covered", "what does it cover",
    "summarize", "summary", "give me a summary", "give a summary",
    "overview", "what is in this", "what does this contain",
    "table of contents", "list all topics", "what are all",
    "tell me about this", "explain this pdf", "explain this document",
    "what can i learn", "what will i learn",
)

def is_meta(q):
    return any(p in q.lower() for p in _META_QUERY_PHRASES)

cases = [
    ("Who is PM of india?",                              False),
    ("What are all the topics covered in this pdf?",     True),
    ("Summarize this document",                          True),
    ("What is encapsulation?",                           False),
    ("What is in this pdf?",                             True),
    ("overview of the document",                         True),
    ("What is inheritance?",                             False),
    ("Give me a summary",                                True),
    ("What does this pdf contain?",                      True),
    ("What is polymorphism?",                            False),
]

all_ok = True
for q, expected in cases:
    result = is_meta(q)
    status = "PASS" if result == expected else "FAIL"
    if result != expected:
        all_ok = False
    print(f"  [{status}] meta={result} expected={expected}  |  {q!r}")

print()
print("ALL PASS" if all_ok else "SOME TESTS FAILED")

# ---- Model check ----
print()
print("Model check:")
with open("app/services/rag_service.py", encoding="utf-8") as f:
    content = f.read()
if "perplexity:sonar" in content and "r1-1776" not in content:
    print("  [OK] Model is perplexity:sonar (no r1-1776)")
elif "r1-1776" in content:
    print("  [WARN] r1-1776 still present in rag_service.py")
else:
    print("  [?] Could not detect model")

if "_is_meta_query" in content:
    print("  [OK] _is_meta_query function present")
else:
    print("  [FAIL] _is_meta_query NOT found")

if "META-QUERY path" in content:
    print("  [OK] META-QUERY branch present in retrieve_context")
else:
    print("  [FAIL] META-QUERY branch NOT found")

if 'similarity_search_with_score(' in content and 'similarity_search_with_scores(' not in content:
    print("  [OK] Correct method name: similarity_search_with_score (no trailing s)")
else:
    print("  [WARN] Check similarity_search_with_score usage")
