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


def handle_help_from_ai(custom_instructions, temperature, top_p, token_limit, raw_conversation, prevQuery=None):
    log_time("Starting Question Extraction")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."

    if prevQuery!=None:
        messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}"},
                {"role": "user", "content": f"Based on the conversation, generate a query for RAG:\n\n{summarized_text}"},
                {"role": "user", "content": f"Now i had asked you above question before and this is what you responded with \n--{prevQuery}--\n But thats not what the best query is, so try finding any better."}
        ]
    else:
        messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}"},
                {"role": "user", "content": f"Based on the conversation, generate a query for RAG:\n\n{summarized_text}"}
        ]

    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=messages,
            model="gemini-2.5-flash-lite", 
            temperature=temperature,
            n = 1, 
            top_p=top_p, 
            max_tokens=token_limit,
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        log_time(f"Error in Question Extraction: {e}")
        return None

def handle_help_from_ai_text(custom_instructions, temperature, top_p, token_limit, raw_conversation, highlightedText, prevQuery=None):
    log_time("Starting Question Extraction")
    
    relevant_conversation = extract_relevant_conversation(raw_conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."

    if prevQuery!=None:
        messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}"},
                {"role": "user", "content": f"Based on the conversation provided, generate a query for RAG. Here's the main Important conversation snippet:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE GENERATING THE QUERY, ENSURE THAT THE QUERY IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT."},
                {"role": "user", "content": f"Now i had asked you above question before and this is what you responded with \n--{prevQuery}--\n But thats not what the best query is, so try finding any better."}
        ]
    else:
        messages=[
                {"role": "system", "content": f"You are an AI assistant... {custom_instructions}"},
                {"role": "user", "content": f"Based on the conversation provided, generate a query for RAG. Here's the main Important conversation snippet:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE GENERATING THE QUERY, ENSURE THAT THE QUERY IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT."}
        ]
    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=messages,
            model="gemini-2.5-flash-lite", 
            temperature=temperature, 
            top_p=top_p, 
            n = 1,
            max_tokens=token_limit,
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        log_time(f"Error in Question Extraction text: {e}")
        return None

def llm_processing_query(context_text, query, custom_instructions, temperature, top_p, token_limit, raw_conversation=None):
    """
    Process a query through the LLM with streaming responses.
    
    Args:
        context_text (str): Context information with citation markers
        query (str): User's query to be answered
        custom_instructions (str): Custom instructions for the LLM
        temperature (float): Temperature parameter for randomness
        top_p (float): Top-p sampling parameter
        token_limit (int): Maximum tokens to generate
        raw_conversation (list, optional): User's conversation history
        
    Returns:
        generator: A generator that yields response chunks as they arrive
    """
    log_time("Starting LLM Processing")
    
    # Process conversation into summarized text if provided
    conversation_context = ""
    if raw_conversation:
        relevant_conversation = extract_relevant_conversation(raw_conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No conversation context available."
        conversation_context = f"\n\nConversation Context:\n{summarized_text}"
    
    messages = [
        {
            "role": "system",
            "content": f"Important Instruction: {custom_instructions}"
        },
        {
            "role": "user",
            "content": (
                f"""You are a helpful chatbot. Please answer the user's question based on the provided sources.
                    Cite the source number at the end of each sentence or phrase that comes from that source using square brackets like [Number].
                    If the information comes from multiple sources, cite all relevant source numbers.
                    If the answer is not found in the sources, say "I am sorry, but I cannot answer this question based on the provided information."

                    {conversation_context}

                    Sources:
                    {context_text}

                    Question: {query}
                    Answer:"""
            )
        }
    ]
    
    # Return streaming generator directly
    return llm_processing(messages, "gemini-2.5-flash", temperature, top_p, token_limit)

def HELP_WITH_AI(raw_conversation, use_web, userId,useRag):
    try :
        log_time("Starting AI Help Process")

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction = ai_instructions["query_extraction"]
        instruction2 = ai_instructions["answering_query"]
        temperature = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId
        
        query = handle_help_from_ai(instruction, temperature, top_p, token_limit, raw_conversation)
        if not query:
            pass
            # return {"error": "No query generated"}
        
        yield json.dumps({"query": query}) + "\n"
        
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

        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}

        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")

        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        result = llm_processing_query(context_text, query, instruction2, temperature, top_p, token_limit)
        yield json.dumps({"result": result}) + "\n"
        log_time("Completed LLM Response Generation")

        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)

        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")

        log_time("Completed AI Help Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": result
        }

    except Exception as e:
        log_time("Error in AI Help Process")
        print(f"Error in HELP_WITH_AI: {e}")
        return {"error": "An error occurred during AI help processing."}


def Reg_AI_HELP_Query(prevAnswer, prevQuery, raw_Conversation, use_web, userId, highlightedText, useHighlightedText, useRag=False):
    try:
        log_time("Starting AI Help Process Text")
        namespace=userId

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        # Query Regeneration Step
        query = "NO QUERY COULD BE FOUND"  # Start with the previous query as fallback

        if useHighlightedText:
            query_stream = handle_help_from_ai_text(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation, 
                highlightedText,
                prevQuery
            )
        else:
            query_stream = handle_help_from_ai(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation,
                prevQuery
            )
            
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
            query = "NO QUERY COULD BE FOUND"
            

        
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
        # print("Results 0",results[0])
        # print("Results 1",results[1])
        retrieved_docs = []
        i = 0
        # Ensure results has expected elements before accessing them
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if use_web:
            retrieved_docs.extend(results[i]) # Directly assign if useRag is False
        print("Retrieved Docs",retrieved_docs)
        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")


         # Add variation prompt for answer regeneration if previous answer exists
        if prevAnswer:
            variation_prompt = (
                f"\n\nPrevious Context:\n"
                f"Previous Query: {prevQuery}\n"
                f"Previous Answer: {prevAnswer}\n\n"
                "Please generate a comprehensive answer to the NEW query, "
                "ensuring you approach the topic differently from the previous response. "
                "Use the previous context as a guide to avoid repeating the exact same information."
            )
            context_text += variation_prompt

        context_text = query + " " + context_text

        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        
        # Get response streaming generator
        response_generator = llm_processing_query(context_text, query, ai_instructions["answering_query"],model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"],
                raw_Conversation)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "result": full_response}) + "\n"
        
        # Signal completion of response generation
        
        log_time("Completed LLM Response Generation")
        result=full_response
        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed AI Help Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in AI Help Process")
        print(f"Error in HELP_WITH_AI: {e}")
        return {"error": "An error occurred during AI help processing."}
    
def Reg_AI_HELP_Expand(prevAnswer,prevQuery,raw_Conversation, use_web, userId, highlightedText,useHighlightedText,useRag=False):

    try:
        log_time("Starting AI Help Process Text")
        namespace = userId

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        # Query Regeneration Step
        query = "NO QUERY COULD BE FOUND"  # Start with the previous query as fallback

        if useHighlightedText:
            query_stream = handle_help_from_ai_text(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation, 
                highlightedText
            )
        else:
            query_stream = handle_help_from_ai(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation
            )
            
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
                yield json.dumps({"query": query}) + "\n"
        
        if not query.strip():
            yield json.dumps({"error": "Empty query generated"}) + "\n"
            query = "NO QUERY COULD BE FOUND"
            
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
        # ...existing code...
        retrieved_docs = []
        i = 0
        # Ensure results has expected elements before accessing them
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if use_web:
            retrieved_docs.extend(results[i]) # Directly assign if useRag is False
        print("Retrieved Docs",retrieved_docs)
        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")

        # Add variation prompt for answer regeneration if previous answer exists
        if prevAnswer:
            variation_prompt=f"\n\nNOW ONE IMPORTANT THING I WANT TO TELL YOU, BELOW IS THE PREVIOUS ANSWER YOU GAVE FOR SAME QUERY, BUT THE ANSWER WAS TOO SHORT, SO PLEASE TRY AGAIN AND TRY ADDING MORE INFORMATION FROM THE GIVEN SOURCES ONLY \n\nPrevious Answer: {prevAnswer}\n\nPlease provide the same answer in detail in approx. 15-20 lines"
            context_text+=variation_prompt
        
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        
        # Get response streaming generator
        response_generator = llm_processing_query(context_text, query, ai_instructions["answering_query"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"],
                raw_Conversation)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({"result": full_response}) + "\n"
        
        log_time("Completed LLM Response Generation")

        log_time("Extracting Citations")
        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed AI Help Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in AI Help Process")
        print(f"Error in HELP_WITH_AI: {e}")
        return {"error": "An error occurred during AI help processing."}

def Reg_AI_HELP_Result(prevAnswer,prevQuery,raw_Conversation, use_web, userId, highlightedText,useHighlightedText,useRag=False):
    try:
        log_time("Starting AI Help Process Text")
        namespace = userId

        ai_instructions = get_system_instructions()
        model_params = get_model_parameters()

        # Query Regeneration Step
        query = "NO QUERY COULD BE FOUND"  # Start with the previous query as fallback

        if useHighlightedText:
            query_stream = handle_help_from_ai_text(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation, 
                highlightedText
            )
        else:
            query_stream = handle_help_from_ai(
                ai_instructions["query_extraction"], 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation
            )
            
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
                yield json.dumps({"query": query}) + "\n"
        
        if not query.strip():
            yield json.dumps({"error": "Empty query generated"}) + "\n"
            query = "NO QUERY COULD BE FOUND"
            
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
        # ...existing code...
        retrieved_docs = []
        i = 0
        # Ensure results has expected elements before accessing them
        if useRag:
            retrieved_docs.extend(results[i])
            i += 1
        if use_web:
            retrieved_docs.extend(results[i]) # Directly assign if useRag is False
        print("Retrieved Docs",retrieved_docs)
        log_time("Starting Context Processing (Citation) for RAG and Web Search")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}
        log_time("Completed Context Processing (Citation) for RAG and Web Search")

        # Add variation prompt for answer regeneration if previous answer exists
        if prevAnswer:
            variation_prompt=f"\nNOW ONE IMPORTANT THING I WANT TO TELL YOU, BELOW IS THE PREVIOUS ANSWER YOU GAVE FOR SAME QUERY, BUT THE ANSWER WAS NOT SATISFACTORY, SO PLEASE TRY AGAIN\n\nPrevious Answer: {prevAnswer}\n\nPlease provide a new answer that covers the same key points but uses different wording, structure, or perspective to add variety."
            context_text+=variation_prompt
        
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        
        # Get response streaming generator
        response_generator = llm_processing_query(context_text, query, ai_instructions["answering_query"],
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"],
                raw_Conversation)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({"result": full_response}) + "\n"
        
        log_time("Completed LLM Response Generation")

        log_time("Extracting Citations")
        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed AI Help Process")
        return {
            "query": query,
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in AI Help Process")
        print(f"Error in HELP_WITH_AI: {e}")
        return {"error": "An error occurred during AI help processing."}

