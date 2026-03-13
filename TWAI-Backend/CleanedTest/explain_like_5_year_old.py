import json
import os
import time  # Import time for timestamps
from datetime import datetime  # Import datetime for readable timestamps
import concurrent.futures 
from openai import OpenAI
from dotenv import load_dotenv
from .citations import extract_used_citations
from .prompts import get_system_instructions
from .commonFunctions import (
    extract_relevant_conversation,
    query_ragR,
    useWeb,
    citation_context_text,
    llm_processing,
    get_model_parameters
)

# Load environment variables
load_dotenv()
GEMINI_API_KEY=os.environ.get('GEMINI_API_KEY')
gemclient = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)
# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def run_tasks_concurrently(task_functions):
    """Run RAG and Web Search tasks concurrently using ThreadPoolExecutor."""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(lambda func: func(), task_functions))
    return results

def log_time(stage):
    """Logs the timestamp for a given stage."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {stage}")


def handle_explain_simply(custom_instructions, temperature, top_p, token_limit, raw_conversation, meetingTemplate=""):
    log_time("Starting Question Extraction for Simple Explanation")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""

    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}{meeting_context}"},
                {"role": "user", "content": f"Based on the conversation, generate a query for RAG, STRICTLY ONLY GENERATE THE QUERY TEXT NO OTHER MESSAGES:\n\n{summarized_text}"}
            ],
            model="gemini-2.5-flash", 
            temperature=temperature,
            n = 1, 
            top_p=top_p, 
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator
        return stream
    except Exception as e:
        log_time(f"Error in Question Extraction: {e}")
        return None


def handle_explain_simply_text(custom_instructions, temperature, top_p, token_limit, raw_conversation, highlightedText, meetingTemplate=""):
    log_time("Starting Question Extraction for Simple Explanation")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""

    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}{meeting_context}"},
                {"role": "user", "content": f"Based on the conversation provided, generate a query for RAG. Here's the main Important conversation snippet:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE GENERATING THE QUERY, ENSURE THAT THE QUERY IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT."}
            ],
            model="gemini-2.5-flash", 
            temperature=temperature, 
            top_p=top_p, 
            n = 1,
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        log_time(f"Error in Question Extraction text: {e}")
        return None


def llm_processing_simple_explanation(retrieved_docs, query, custom_instructions, temperature, top_p, token_limit, raw_conversation=None, meetingTemplate=""):
    """
    Process a query through the LLM with streaming responses for simple explanations.
    
    Args:
        retrieved_docs (list): All retrieved documents
        query (str): User's query to be answered
        custom_instructions (str): Custom instructions for the LLM
        temperature (float): Temperature parameter for randomness
        top_p (float): Top-p sampling parameter
        token_limit (int): Maximum tokens to generate
        raw_conversation (list, optional): User's conversation history
        meetingTemplate (str): JSON string containing meeting information
        
    Returns:
        generator: A generator that yields response chunks as they arrive
    """
    log_time("Starting LLM Processing for Simple Explanation")
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""
    
    # Process conversation into summarized text if provided
    conversation_context = ""
    if raw_conversation:
        relevant_conversation = extract_relevant_conversation(raw_conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No conversation context available."
        conversation_context = f"\n\nConversation Context:\n{summarized_text}"
    
    messages = [
        {
            "role": "system",
            "content": f"Important Instruction: {custom_instructions}{meeting_context}"
        },
        {
            "role": "user",
            "content": (
                f"""You are a helpful chatbot. Please explain the concept in extremely simple terms, as if talking to a 5-year-old child.
                    Use the provided sources but make the explanation very easy to understand with simple words, clear examples, and child-friendly analogies.
                    Cite the source number at the end of each sentence or phrase that comes from that source using square brackets like [Number].
                    If the information comes from multiple sources, cite all relevant source numbers.
                    If the answer is not found in the sources, say "I don't have enough information about this, but I'll try to explain what I know."

                    {conversation_context}

                    Sources:
                    {retrieved_docs}

                    Question: {query}
                    Answer:"""
            )
        }
    ]
    
    # Get streaming generator from llm_processing
    return llm_processing(messages, "gemini-2.5-flash", temperature, top_p, token_limit)


def EXPLAIN_SIMPLY(raw_conversation, use_web, userId, useRag, meetingTemplate, documents):
    try:
        log_time("Starting Simple Explanation Process")

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction = ai_instructions["query_extraction_simple"]
        instruction2 = ai_instructions["answering_simple"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        print("meeting template : ", meetingTemplate)
        
        # Get streaming query generator
        query_stream = handle_explain_simply(instruction, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
        if not query_stream:
            yield json.dumps({"error": "Failed to generate query"}) + "\n"
            return
        
        # Stream query generation to frontend
        query = ""
        for chunk in query_stream:
            if chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                query += chunk_content
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "query": query}) + "\n"
        
        if not query.strip():
            yield json.dumps({"error": "Empty query generated"}) + "\n"
            return
        
        log_time("Starting RAG & Web Search")

        chunk_limit = get_model_parameters()["chunk_limit"]
        task_functions = []

        if useRag:
            task_functions.append(lambda: query_ragR(query, chunk_limit, namespace, documents))

        if use_web:
            task_functions.append(lambda: useWeb(query))

        # Execute tasks in parallel if there are tasks to run
        results = run_tasks_concurrently(task_functions) if task_functions else []

        log_time("Completed RAG & Web Search")

        retrieved_docs = []

        i = 0
        # Ensure results has expected elements before accessing them
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if use_web:
            retrieved_docs.extend(results[i]) # Directly assign if useRag is False

        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")

        log_time("Starting LLM Response Generation for Simple Explanation")
        if context_text == "":
            context_text = "No sources available. Please provide a simple explanation using your own knowledge, focused on making the concept understandable to a 5-year-old. Use simple words, examples, and analogies."
        
        # Get the streaming generator, now passing raw_conversation
        response_generator = llm_processing_simple_explanation(retrieved_docs, query, instruction2, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "result": full_response}) + "\n"
        
        # Signal completion of response generation
                
        log_time("Completed LLM Response Generation")

        log_time("Extracting Citations")
        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)

        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")

        log_time("Completed Simple Explanation Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }

    except Exception as e:
        log_time(f"Error in EXPLAIN_SIMPLY: {e}")
        yield json.dumps({"error": f"An error occurred during simple explanation processing: {str(e)}"}) + "\n"


def EXPLAIN_SIMPLY_text(raw_conversation, use_web, userId, highlightedText, meetingTemplate, useRag=False):
    try:
        log_time("Starting Simple Explanation Process with Text")

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction = ai_instructions["query_extraction_simple"]
        instruction2 = ai_instructions["answering_simple"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId
        
        # Get streaming query generator
        query_stream = handle_explain_simply_text(instruction, temperature, top_p, token_limit, raw_conversation, highlightedText, meetingTemplate)
        if not query_stream:
            yield json.dumps({"error": "Failed to generate query"}) + "\n"
            return
            
        # Stream query generation to frontend
        query = ""
        for chunk in query_stream:
            if chunk.choices[0].delta.content is not None:
                chunk_content = chunk.choices[0].delta.content
                query += chunk_content
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "query": query}) + "\n"
        
        if not query.strip():
            yield json.dumps({"error": "Empty query generated"}) + "\n"
            return
            
        log_time("Starting RAG & Web Search")

        chunk_limit = get_model_parameters()["chunk_limit"]
        task_functions = []

        if useRag:
            task_functions.append(lambda: query_ragR(query, chunk_limit, namespace))

        if use_web:
            task_functions.append(lambda: useWeb(query))

        # Execute tasks in parallel if there are tasks to run
        results = run_tasks_concurrently(task_functions) if task_functions else []

        log_time("Completed RAG & Web Search")
        retrieved_docs = []
        i = 0
        # Ensure results has expected elements before accessing them
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if use_web:
            retrieved_docs.extend(results[i]) # Directly assign if useRag is False
        print("Retrieved Docs", retrieved_docs)
        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation for Simple Explanation")
        if context_text == "":
            context_text = "No sources available. Please provide a simple explanation using your own knowledge, focused on making the concept understandable to a 5-year-old. Use simple words, examples, and analogies."
        
        # Get the streaming generator, now passing raw_conversation
        response_generator = llm_processing_simple_explanation(context_text, query, instruction2, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "result": full_response}) + "\n"
                
        log_time("Completed LLM Response Generation")

        log_time("Extracting Citations")
        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Simple Explanation Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in Simple Explanation Process")
        print(f"Error in EXPLAIN_SIMPLY_text: {e}")
        yield json.dumps({"error": f"An error occurred during simple explanation processing: {str(e)}"}) + "\n"