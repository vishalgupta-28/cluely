"""
Simple Pinecone Similarity Search Test

Tests the similarity search functionality used in TWAI-Backend RAG system.
"""

import os
from dotenv import load_dotenv
from pinecone.grpc import PineconeGRPC
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Load environment variables
load_dotenv()

def test_similarity_search():
    """Test Pinecone similarity search with OpenAI embeddings."""
    
    # Initialize Pinecone client
    pc = PineconeGRPC(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(name=os.getenv("PINECONE_INDEX_NAME"))
    
    # Initialize OpenAI embeddings
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    # Test query
    query_text = "india gfcf gdp in 2010 ?"
    print(f"Query: {query_text}")
    
    # Generate query embedding
    query_embedding = embeddings.embed_documents([query_text])[0]
    
    # Perform similarity search
    results = index.query(
        vector=query_embedding,
        top_k=5,
        include_metadata=True,
        namespace="demopdf"  
    )
    
    # Display results
    print(f"\nFound {len(results.matches)} results:")
    for i, match in enumerate(results.matches):
        print(f"\n{i+1}. Score: {match.score:.4f}")
        print(f"   ID: {match.id}")
        if match.metadata:
            print(f"   Source: {match.metadata.get('source', 'N/A')}")
            print(f"   Page: {match.metadata.get('page', 'N/A')}")
            text = match.metadata.get('text', 'N/A')
            print(f"   Text: {text}")

if __name__ == "__main__":
    test_similarity_search()