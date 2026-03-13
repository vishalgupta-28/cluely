import json
import os
# import base64  # No longer needed with OpenAI direct image URLs
import requests
import concurrent.futures
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from .citations import extract_used_citations
from .prompts import get_system_instructions
from .commonFunctions import (
    query_ragR,
    useWeb,
    citation_context_text,
    llm_processing,
    get_model_parameters
)

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# Initialize OpenAI client
client = OpenAI(
    api_key=OPENAI_API_KEY
)



def log_time(stage):
    """Logs the timestamp for a given stage."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {stage}")

def run_tasks_concurrently(task_functions):
    """Run RAG and Web Search tasks concurrently using ThreadPoolExecutor."""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(lambda func: func(), task_functions))
    return results

# COMMENTED OUT - OpenAI GPT-4.1 supports direct image URLs, no need for base64 conversion
# def download_image_to_base64(image_url):
#     """
#     Download an image from URL and convert to base64 data URI.
#     Optimized with proper error handling and memory management.
#     
#     Args:
#         image_url (str): URL of the image to download
#         
#     Returns:
#         str: Base64 encoded image with data URI prefix
#     """
#     log_time(f"Downloading image from URL: {image_url[:50]}...")
#     
#     try:
#         # Download with optimized settings
#         response = requests.get(
#             image_url, 
#             timeout=30,
#             headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
#             stream=True  # Stream for large images
#         )
#         response.raise_for_status()
#         
#         # Check content type
#         content_type = response.headers.get('content-type', 'image/jpeg')
#         if not content_type.startswith('image/'):
#             raise ValueError(f"URL does not point to an image. Content-Type: {content_type}")
#         
#         # Read content in chunks to handle large images
#         image_content = b''
#         for chunk in response.iter_content(chunk_size=8192):
#             image_content += chunk
#             
#         # Check file size (limit to ~10MB for performance)
#         if len(image_content) > 10 * 1024 * 1024:
#             log_time(f"Warning: Large image ({len(image_content) // (1024*1024)}MB), may slow processing")
#         
#         # Convert to base64
#         image_base64 = base64.b64encode(image_content).decode('utf-8')
#         data_uri = f"data:{content_type};base64,{image_base64}"
#         
#         log_time(f"Successfully converted image to base64 ({len(image_base64)} chars)")
#         return data_uri
#         
#     except requests.exceptions.RequestException as e:
#         log_time(f"Network error downloading image: {str(e)}")
#         raise
#     except Exception as e:
#         log_time(f"Error processing image: {str(e)}")
#         raise

def handle_help_from_image(custom_instructions, temperature, top_p, token_limit, image_url, user_query):
    """Extract query from image analysis for RAG/Web search using OpenAI GPT-4.1."""
    log_time("Starting Image Query Extraction with OpenAI GPT-4.1")
    
    try:
        # Create a streaming generator with OpenAI
        stream = client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an AI assistant specialized in image analysis. {custom_instructions}"},
                {"role": "user", "content": [
                    {
                        "type": "text",
                        "text": f"Analyze this image and the user's question: '{user_query}'. Generate a precise search query for finding additional information on the web. Return only the search query text without quotes or extra formatting - just the plain search terms."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]}
            ],
            model="gpt-4o-mini",  # Using GPT-4 Vision model
            temperature=temperature,
            n=1, 
            top_p=top_p, 
            stream=True
        )
        
        return stream
    except Exception as e:
        log_time(f"Error in Image Query Extraction: {e}")
        return None

def llm_processing_query(retrieved_docs, query, custom_instructions, top_p, image_url):
    """Process final response with image, context, and user query using OpenAI GPT-4.1."""
    log_time("Starting LLM Processing with Image using OpenAI GPT-4.1")
    
    try:
        # Format context from retrieved documents
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text = "No additional context available from RAG or web search."
        
        # Create comprehensive system prompt
        system_prompt = f"""
        You are Jarwiz, an advanced AI assistant that analyzes images and provides comprehensive answers.
        
        INSTRUCTIONS:
        1. First analyze the provided image thoroughly
        2. Answer the user's specific question about the image
        3. Use any additional context provided from document search or web search to enhance your answer
        4. Format your response in clear markdown
        5. If you reference external information, cite it properly
        
        RESPONSE FORMAT:
        - Use **bold** for important terms
        - Use `code blocks` for code/technical terms
        - Use ### headers for organization
        - Use citations [1], [2] when referencing sources
        
        {custom_instructions}
        
        ADDITIONAL CONTEXT:
        {context_text}
        """
        
        # Create streaming response with OpenAI
        stream = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {
                        "type": "text",
                        "text": f"Please analyze this image and answer: {query}"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]}
            ],
            model="gpt-4o-mini",  # Using GPT-4 Vision for capabilities
            temperature=0,
            top_p=top_p,
            stream=True
        )
        
        # Process streaming response
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
                
    except Exception as e:
        log_time(f"Error in LLM Processing: {e}")
        yield f"Error processing response: {str(e)}"


# This function is replaced by handle_help_from_image above

def HELP_WITH_IMAGE(image_url, user_query, web=False, userId=None, useRag=False, documents=None):
    """Main function for image analysis with RAG and web search support."""
    try:
        log_time("Starting Image Analysis Process")
        
        # Input validation
        if not image_url or not user_query:
            error_data = {
                "result": "❌ Error: Both image URL and user query are required.",
                "error": True
            }
            yield f"{json.dumps(error_data)}\n"
            return
        
        # Get system instructions and model parameters
        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()
        
        instruction = ai_instructions["query_extraction"]
        instruction2 = ai_instructions["answering_query"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        chunk_limit = model_params["chunk_limit"]
        namespace = userId
        
        # Using direct image URL (OpenAI GPT-4.1 supports this)
        log_time(f"Using direct image URL: {image_url[:50]}...")
        
        # Generate search query from image analysis
        query_stream = handle_help_from_image(instruction, temperature, top_p, token_limit, image_url, user_query)
        if not query_stream:
            yield json.dumps({"error": "Failed to generate query"}) + "\n"
            return
        
        # Collect query internally (no streaming to frontend)
        query = ""
        for chunk in query_stream:
            if chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                query += chunk_content
        
        # Clean the query - remove extra quotes and whitespace
        original_query = query
        query = query.strip()
        if query.startswith('"') and query.endswith('"'):
            query = query[1:-1]
        if query.startswith("'") and query.endswith("'"):
            query = query[1:-1]
        query = query.strip()
        
        print(f"🔍 [QUERY DEBUG] Original query: '{original_query}'")
        print(f"🔍 [QUERY DEBUG] Cleaned query: '{query}'")
        
        if not query.strip():
            yield json.dumps({"error": "Empty query generated"}) + "\n"
            return
        
        log_time(f"Generated search query: {query}")
        
        log_time("Starting RAG & Web Search")
        
        # Prepare concurrent tasks
        task_functions = []
        
        if useRag:
            task_functions.append(lambda: query_ragR(query, chunk_limit, namespace, documents))
        
        if web:
            task_functions.append(lambda: useWeb(query))
        
        # Execute tasks in parallel
        results = run_tasks_concurrently(task_functions) if task_functions else []
        
        log_time("Completed RAG & Web Search")
        
        # Collect retrieved documents
        retrieved_docs = []
        i = 0
        
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if web:
            retrieved_docs.extend(results[i])
        
        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        print(f"Retrieved Docs: {retrieved_docs}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT: If no sources are available for citation, use your internal knowledge to analyze the image and answer the question. DO NOT give answers like 'I cannot answer based on provided information'."
        
        # Get the streaming generator for final response
        response_generator = llm_processing_query(retrieved_docs, query, instruction2, top_p, image_url)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend
                yield json.dumps({"result": full_response}) + "\n"
        
        log_time("Completed LLM Response Generation")
        
        # Extract and send citations
        log_time("Extracting Citations")
        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)
        
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Image Analysis Process")
        return {
            "used_citations": used_citations,
            "result": full_response
        }
        
    except Exception as e:
        log_time(f"Error in HELP_WITH_IMAGE: {e}")
        error_data = {
            "result": f"🚨 **Analysis Failed**\n\nError: {str(e)}\n\nPlease check:\n- Image URL is accessible\n- Image format is supported\n- Network connection is stable",
            "error": True
        }
        yield f"{json.dumps(error_data)}\n"



