#!/usr/bin/env python3

import sys
sys.path.append('.')

from citations import extract_used_citations

# Mock data that mimics what the system would have
mock_response = "Based on the document analysis [1], we can see important information. Additionally, [2] provides further context."

mock_citation_map = {
    1: "Document 1 - test.pdf page 1",
    2: "Document 2 - example.pdf page 2"
}

mock_retrieved_docs = [
    {
        "page_content": "In its most fundamental form, a Generative AI agent can be defined as an application that attempts to achieve a goal by observing the world and acting upon it using the tools that it has at its disposal. Agents are autonomous and can act independently of human intervention, especially when provided with proper goals or objectives they are meant to achieve. Agents can also be proactive in their approach to reaching their goals. Even in the absence of explicit instruction sets from a human,",
        "metadata": {
            "PDF Path": "https://twai-bucket1.s3.ap-south-1.amazonaws.com/uploads/77386b40-9877-4e16-9a03-2b9e1b044aa9/ab68e79a-14c8-4984-b519-fa671c3af754.pdf",
            "Page Number": 5,
            "Relevance Score": 0.85
        }
    },
    {
        "page_content": "Agents can utilize one of the above reasoning techniques, or many other techniques, to choose the next best action for the given user request. For example, let’s consider an agent that is programmed to use the ReAct framework to choose the correct actions and tools for",
        "metadata": {
            "PDF Path": "https://twai-bucket1.s3.ap-south-1.amazonaws.com/uploads/77386b40-9877-4e16-9a03-2b9e1b044aa9/ab68e79a-14c8-4984-b519-fa671c3af754.pdf", 
            "Page Number": 10,
            "Relevance Score": 0.78
        }
    }
]

print("=== Testing Citation Extraction ===")
print(f"Response: {mock_response}")
print(f"Citation map: {mock_citation_map}")
print(f"Retrieved docs count: {len(mock_retrieved_docs)}")

try:
    result = extract_used_citations(mock_response, mock_citation_map, mock_retrieved_docs)
    print("\n=== RESULT ===")
    print(f"Number of citations extracted: {len(result)}")
    
    for citation_num, details in result.items():
        print(f"\nCitation {citation_num}:")
        print(f"  Source: {details.get('source')}")
        print(f"  Type: {details.get('type')}")
        image_data = details.get('image')
        if image_data:
            print(f"  Image: Yes (base64 length: {len(image_data)} chars)")
        else:
            print(f"  Image: No")
        print(f"  Text preview: {details.get('text_preview', '')[:100]}...")
        
except Exception as e:
    print(f"Error during extraction: {e}")
    import traceback
    traceback.print_exc()
