import os
from langchain_openai import OpenAIEmbeddings
from langchain_community.utilities import GoogleSerperAPIWrapper
from openai import OpenAI
from dotenv import load_dotenv
from pinecone.grpc import PineconeGRPC
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Load environment variables
load_dotenv()
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
pc = PineconeGRPC(api_key=os.getenv("PINECONE_API_KEY"))


GEMINI_API_KEY=os.environ.get('GEMINI_API_KEY')
gemclient = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)



# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_model_parameters():
    """
    Returns default model parameters for LLM interaction.
    
    Returns:
        dict: Dictionary containing temperature, top_p, token limit, and chunk limit
    """
    return {
        "temperature": 0.7,
        "top_p": 0.9,
        "token_limit": 28000,
        "chunk_limit": 5
    }


def extract_relevant_conversation(raw_Conversation):
    """
    Extracts the conversation for Person 1, Person 2, and User after the last separator.
    
    Args:
        raw_Conversation (list): List of conversation dictionaries
        
    Returns:
        list: Formatted list of tuples containing speaker and message
    """
    converted = []
    try:
        for item in raw_Conversation:
            if('user' in item.keys()):
                converted.append(("User", item['user'].capitalize()))
            else:
                try:
                  converted.append(("Other", item['other'].capitalize()))
                                  

                except:
                    pass
        
            # for key, value in item.items():
            #     # Format the speaker name
            #     formatted_key = "User" if key.lower() == "user" else "Person 1"
            #     converted.append((formatted_key, value.capitalize()))
        return converted
    except Exception:
        # Return empty list if conversion fails
        return []

def extract_relevant_chat_conversation(raw_Conversation):
    """
    Extracts the conversation for Person 1, Person 2, and User after the last separator.
    
    Args:
        raw_Conversation (list): List of conversation dictionaries
        
    Returns:
        list: Formatted list of tuples containing speaker and message
    """
    converted = []
    try:
        for item in raw_Conversation:
            if(item["sender"]=='user'):
                converted.append(("User", item['text'].capitalize()))
            else:
                try:
                    converted.append(("AI", item['text'].capitalize()))
                except:
                    pass
        
            # for key, value in item.items():
            #     # Format the speaker name
            #     formatted_key = "User" if key.lower() == "user" else "Person 1"
            #     converted.append((formatted_key, value.capitalize()))
        return converted
    except Exception as e:
        print("Error in extract_relevant_chat_conversation: ", e)
        # Return empty list if conversion fails
        return []


def query_ragR(query_text: str, chunk_size: int, namespace: str, documents: list):
    """
    Query Pinecone index using Gemini embeddings for RAG.

    Args:
        query_text (str): The query to search for
        chunk_size (int): Number of chunks to retrieve
        namespace (str): The namespace for Pinecone retrieval

    Returns:
        list: Retrieved documents with metadata
    """
    def run_async_embedding_search():
        """Helper function to run async embedding operations."""
        try:
            # Create new event loop for this thread
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
                print("query:", query_text)
                query_embedding = embeddings.embed_documents([query_text])[0]
                return query_embedding
            finally:
                loop.close()
                
        except Exception as e:
            print(f"Error in async embedding search: {e}")
            return None
    
    try:
        index = pc.Index(name=INDEX_NAME)
        
        # Get query embedding with async handling
        query_embedding = run_async_embedding_search()
        if query_embedding is None:
            print("Failed to generate query embedding")
            return []

        print("documents:", documents)
        
        # Perform similarity search
        results = index.query(
            vector=query_embedding,
            top_k=5,
            include_metadata=True,
           filter={"source": {"$in": documents}},
            namespace=namespace
        )
        print("results:", results)

        retrieved_documents = []

        for match in results.matches:
            page_content = match.metadata.get("text", "").strip()

            if not page_content:  # Skip empty documents
                continue

            retrieved_documents.append({
                "page_content": page_content,
                "metadata": {
                    "PDF Path": match.metadata.get("source", "Unknown"),
                    "Page Number": match.metadata.get("page", "Unknown"),
                    "Relevance Score": match.score
                }
            })

        print("Found documents: ", len(retrieved_documents))
        return retrieved_documents
        
    except Exception as e:
        print(f"Error querying RAG: {e}")
        return []

# def query_rag(persist_path: str, query_text: str, chunk_size: int):
#     """
#     Generic function to query RAG with Chroma.
    
#     Args:
#         persist_path (str): Path to the persisted Chroma database
#         query_text (str): The query to search for
#         chunk_size (int): Number of chunks to retrieve
        
#     Returns:
#         list: Retrieved documents with metadata and relevance scores
#     """
#     # Initialize Chroma vector database with OpenAI embeddings
#     db = Chroma(persist_directory=persist_path, embedding_function=OpenAIEmbeddings())
    
#     # Perform similarity search with relevance scores
#     results = db.similarity_search_with_relevance_scores(query_text, k=chunk_size)
    
#     # Format the results with metadata
#     return [
#         {
#             "PDF Path": doc.metadata.get("source", "Unknown"),
#             "Page Number": doc.metadata.get("page", "Unknown"),
#             "Text Chunk": doc.metadata.get("text","Unknown"),
#             "Relevance Score": score
#         }
#         for doc, score in results
#     ]


def useWeb(query: str):
    """
    Use Google Serper API to fetch web results.
    
    Args:
        query (str): The search query
        
    Returns:
        list: Web search results formatted as documents
    """
    print(f"🌐 [WEB SEARCH] Starting web search for query: '{query}'")
    
    # Debug: Test with a simple query if the original fails
    if len(query.strip()) == 0:
        print("⚠️ [WEB SEARCH] Empty query received, using test query")
        query = "artificial intelligence"
        print(f"🧪 [WEB SEARCH] Using test query: '{query}'")
    
    # Check if SERPER_API_KEY is available
    serper_key = os.getenv("SERPER_API_KEY")
    if not serper_key:
        print("❌ [WEB SEARCH ERROR] SERPER_API_KEY not found in environment variables")
        return []
    
    print(f"✅ [WEB SEARCH] SERPER_API_KEY found: {serper_key[:10]}...")
    
    try:
        search = GoogleSerperAPIWrapper(serper_api_key=serper_key)
        print(f"🔍 [WEB SEARCH] GoogleSerperAPIWrapper initialized, executing search...")
        
        results = search.results(query=query)
        print(f"📊 [WEB SEARCH] Raw results type: {type(results)}")
        print(f"📊 [WEB SEARCH] Raw results keys: {results.keys() if isinstance(results, dict) else 'Not a dict'}")
        
        # If no organic results, try with a simple test query
        organic_results = results.get("organic", [])
        if len(organic_results) == 0 and query != "python programming":
            print(f"⚠️ [WEB SEARCH] No results for '{query}', testing with simple query...")
            test_results = search.results(query="python programming")
            test_organic = test_results.get("organic", [])
            print(f"🧪 [WEB SEARCH] Test query 'python programming' returned {len(test_organic)} results")
            if len(test_organic) > 0:
                print(f"✅ [WEB SEARCH] Serper API is working, issue is with original query format")
            else:
                print(f"❌ [WEB SEARCH] Serper API issue - even simple queries return no results")
        
        # Extract and format organic search results
        organic_results = results.get("organic", [])
        print(f"🎯 [WEB SEARCH] Found {len(organic_results)} organic results")
        
        web_data = [
            {"page_content": item["snippet"], "metadata": {"PDF Path": item["link"]}}
            for item in organic_results
        ]
        
        print(f"✅ [WEB SEARCH] Successfully formatted {len(web_data)} results")
        for i, data in enumerate(web_data[:3]):  # Show first 3 results
            print(f"📄 [WEB SEARCH] Result {i+1}: {data['metadata']['PDF Path'][:50]}...")
        
        return web_data
        
    except Exception as e:
        print(f"❌ [WEB SEARCH ERROR] Exception occurred: {str(e)}")
        print(f"❌ [WEB SEARCH ERROR] Exception type: {type(e).__name__}")
        import traceback
        print(f"❌ [WEB SEARCH ERROR] Traceback: {traceback.format_exc()}")
        return []


def citation_context_text(all_retrieved_documents):
    """
    Create context text with citation markers for retrieved documents.
    
    Args:
        all_retrieved_documents (list): List of document dictionaries
        
    Returns:
        tuple: (formatted context text, citation map dictionary)
    """
    context_text = ""
    citation_map = {}  # Maps citation number to source description
    citation_count = 1

    # Process each document and add to context with citation markers
    for doc in all_retrieved_documents:
        
        # Correct metadata extraction
        metadata = doc.get("metadata", {})
        source_name = metadata.get("PDF Path", "Unknown Source")
        page_info = f", Page {metadata.get('Page Number', 'Unknown')}" if "Page Number" in metadata else ""
        doc_text = doc.get("page_content", "")

        # Create source description and add to context
        source_description = f"{source_name}{page_info}"
        context_text += f"\n---\nSource {citation_count}: {source_description}\n---\n{doc_text}"
        
        # Update citation map
        citation_map[citation_count] = source_description
        citation_count += 1
        
    return context_text, citation_map

def llm_processing(
    query_context: str, model: str, temp: float, top_p: float, token_limit: int
):
    """
    Process queries with OpenAI's LLM and stream the responses.
    
    Args:
        query_context (str): The formatted query context
        model (str): OpenAI model to use
        temp (float): Temperature parameter
        top_p (float): Top-p sampling parameter
        token_limit (int): Maximum tokens to generate
        
    Returns:
        generator: A generator that yields chunks of the response as they arrive
                  or None if an error occurs
    """
    try:
        # Create chat completion with streaming enabled
        stream = gemclient.chat.completions.create(
            model=model,
            messages=query_context,
            temperature=temp,
            stream=True  # Enable streaming
        )
        
        # Yield each chunk as it arrives
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                full_response += chunk_content
                # Yield each chunk to be sent to the frontend
                yield chunk_content
        
        # Optionally yield a completion signal or the full response at the end
        # yield {"done": True, "full_response": full_response}
    
    except Exception as e:
        print(f"Error processing LLM query: {e}")
        yield None