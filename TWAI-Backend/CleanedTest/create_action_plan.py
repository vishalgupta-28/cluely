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


def handle_create_action_plan(custom_instructions, temperature, top_p, token_limit, raw_conversation, meetingTemplate=""):
    log_time("Starting Query Extraction for Action Plan")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""

    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}{meeting_context}"},
                {"role": "user", "content": f"Based on the conversation, generate a query for RAG that will help create an action plan. STRICTLY ONLY GENERATE THE QUERY TEXT NO OTHER MESSAGES:\n\n{summarized_text}"}
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


def handle_create_action_plan_text(custom_instructions, temperature, top_p, token_limit, raw_conversation, highlightedText, meetingTemplate=""):
    log_time("Starting Query Extraction for Action Plan")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""

    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}{meeting_context}"},
                {"role": "user", "content": f"Based on the conversation provided, generate a query for RAG that will help create an action plan. Here's the main Important conversation snippet:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE GENERATING THE QUERY, ENSURE THAT THE QUERY IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT."}
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


def llm_processing_action_plan(context_text, query, custom_instructions, temperature, top_p, token_limit, raw_conversation=None, meetingTemplate=""):
    """
    Process a query through the LLM with streaming responses for action plan creation.
    
    Args:
        context_text (str): Context information with citation markers
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
    log_time("Starting LLM Processing for Action Plan")
    
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
                f"""You are a helpful chatbot specialized in creating actionable plans. Based on the provided sources and conversation, create a clear, structured action plan with:
                    1. Clear objectives
                    2. Specific tasks with deadlines if possible
                    3. Assigned responsibilities (if participants are mentioned)
                    4. Success metrics where appropriate
                    
                    {conversation_context}
                    
                    Cite the source number at the end of each action item that comes from that source using square brackets like [Number].
                    If the information comes from multiple sources, cite all relevant source numbers.
                    If there's insufficient information to create a complete action plan, create the best plan possible with the available information.

                    Sources:
                    {context_text}

                    Query for Action Plan: {query}
                    Action Plan:"""
            )
        }
    ]
    
    # Get streaming generator from llm_processing
    return llm_processing(messages, "gemini-2.5-flash", temperature, top_p, token_limit)


def CREATE_ACTION_PLAN(raw_conversation, use_web, userId, useRag, meetingTemplate,documents):
    try:
        log_time("Starting Action Plan Creation Process")

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction = ai_instructions["query_extraction_action_plan"]
        instruction2 = ai_instructions["answering_action_plan"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        print("meeting template : ", meetingTemplate)
        
        # Get streaming query generator
        query_stream = handle_create_action_plan(instruction, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
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

        log_time("Starting LLM Response Generation for Action Plan")
        if context_text == "":
            context_text = "No sources available. Please create an action plan using your own knowledge, extracting action items from the conversation."
        
        # Get the streaming generator, now passing raw_conversation
        response_generator = llm_processing_action_plan(context_text, query, instruction2, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
        
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

        log_time("Completed Action Plan Creation Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }

    except Exception as e:
        log_time(f"Error in CREATE_ACTION_PLAN: {e}")
        yield json.dumps({"error": f"An error occurred during action plan creation: {str(e)}"}) + "\n"


def CREATE_ACTION_PLAN_text(raw_conversation, use_web, userId, highlightedText, meetingTemplate, useRag=False):
    try:
        log_time("Starting Action Plan Creation Process with Text")

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction = ai_instructions["query_extraction_action_plan"]
        instruction2 = ai_instructions["answering_action_plan"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId
        
        # Get streaming query generator
        query_stream = handle_create_action_plan_text(instruction, temperature, top_p, token_limit, raw_conversation, highlightedText, meetingTemplate)
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
        
        log_time("Starting LLM Response Generation for Action Plan")
        if context_text == "":
            context_text = "No sources available. Please create an action plan using your own knowledge, extracting action items from the conversation."
        
        # Get the streaming generator, now passing raw_conversation
        response_generator = llm_processing_action_plan(context_text, query, instruction2, temperature, top_p, token_limit, raw_conversation, meetingTemplate)
        
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
        
        log_time("Completed Action Plan Creation Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in Action Plan Creation Process")
        print(f"Error in CREATE_ACTION_PLAN_text: {e}")
        yield json.dumps({"error": f"An error occurred during action plan creation: {str(e)}"}) + "\n"
