import json
import os
import time
from datetime import datetime
import json
import concurrent.futures 
from openai import OpenAI
from dotenv import load_dotenv
from CleanedTest.citations import extract_used_citations
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

def llm_processing_evaluation(context_text, query, Cust_instr, temp, top_p, token_limit, raw_conversation=None, meetingTemplate=""):
    """
    Process a query through the LLM with streaming responses for evaluation.
    
    Args:
        context_text (str): Context information with citation markers
        query (str): User's query to be answered
        Cust_instr (str): Custom instructions for the LLM
        temp (float): Temperature parameter for randomness
        top_p (float): Top-p sampling parameter
        token_limit (int): Maximum tokens to generate
        raw_conversation (list, optional): User's conversation history
        meetingTemplate (str): JSON string containing meeting information
        
    Returns:
        generator: A generator that yields response chunks as they arrive
    """
    log_time("Starting LLM Processing for Evaluation")
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""
    
    # Process conversation into summarized text if provided
    conversation_context = ""
    if raw_conversation:
        relevant_conversation = extract_relevant_conversation(raw_conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No conversation context available."
        conversation_context = f"\n\nConversation Context:\n{summarized_text}"
    
    messages = [
        {"role": "system", "content": f"THIS IS THE MOST IMPORTANT INSTRUCTION:{Cust_instr}{meeting_context}"},
        {"role": "user", "content": (
            f"Given the extracted answer: {query}, and the retrieved context: {context_text}, evaluate the accuracy and alignment of the answer. "
            "Summarize your findings, highlight any discrepancies, and provide suggestions for refinement if necessary. "
            f"""Cite the source number at the end of each sentence or phrase that comes from that source using square brackets like [Number].
                If the information comes from multiple sources, cite all relevant source numbers.
                If the answer is not found in the sources, say \"I am sorry, but I cannot answer this question based on the provided information.\"

                {conversation_context}

                Sources:
                {context_text}

                Question: {query}
                Answer:"""
            "ENSURE ALL ANSWERS ARE LESS THAN 100 WORDS"
            "THE ANSWER DOES NOT NEED TO BE IN SENTENCE FORMAT, IT CAN ALSO BE IN BULLETED POINTS FORMAT"
        )}
    ]
    
    # Return the streaming generator directly
    return llm_processing(messages, "gemini-2.5-flash", temp, top_p, token_limit)

def llm_processing_FindAnswer(instruction, temp, top_p, token_limit, raw_Conversation, meetingTemplate=""):
    log_time("Starting LLM Processing for Answer Extraction")
    relevant_conversation = extract_relevant_conversation(raw_Conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender, text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""
    
    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{instruction}{meeting_context}"},
                {"role": "user", "content": f"Extract the final few exchange, which represents some fact being exchanged:\n\n{summarized_text}\n DO NOT TRY TO ADD, UPDATE OR ENHANCE WHAT EVER IS SAID IN THE CONVERSATION. **STRICTLY ONLY GIVE THE **SUMMARIZED** CONVERSATION AS A SINGLE STATEMENT**."}
            ],
            model="gemini-2.5-flash-lite", 
            temperature=temp, 
            n = 1,
            top_p=top_p, 
            max_tokens=token_limit,
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        log_time("Error in Answer Extraction")
        return None

def llm_processing_FindAnswer_text(instruction, temp, top_p, token_limit, raw_Conversation, highlightedText, meetingTemplate=""):
    log_time("Starting LLM Processing for Answer Extraction")
    relevant_conversation = extract_relevant_conversation(raw_Conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""
    
    try:
        # Create a streaming generator
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{instruction}{meeting_context}"},
                {"role": "user", "content": f"Use the following snippet as high importance for extraction:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE EXTRACTING THE FINAL EXCHANGE, ENSURE THAT THE EXTRACTED TEXT IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT.\n DO NOT TRY TO ADD, UPDATE OR ENHANCE WHAT EVER IS SAID IN THE CONVERSATION.**STRICTLY ONLY GIVE THE **SUMMARIZED** CONVERSATION AS A SINGLE STATEMENT**."}
            ],
            model="gemini-2.5-flash-lite", 
            temperature=temp, 
            n = 1,
            top_p=top_p, 
            max_tokens=token_limit,
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        log_time("Error in Answer Extraction")
        return None

def FACT_CHECKING_HELP(raw_Conversation, use_web, userId, useRag, meetingTemplate, documents):
    try :
        log_time("Starting Fact Checking Process")

        instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction =  instructions["fact_checking"]
        instruction2 = instructions["exchange_extraction"]
        temp = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        print("meeting template : ", meetingTemplate)
        
        query_stream = llm_processing_FindAnswer(instruction2, temp, top_p, token_limit, raw_Conversation, meetingTemplate)
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
                yield json.dumps({"query": f'Fact Checking for [{query}]'}) + "\n"
        
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
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        
        response_generator = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation,
                    meetingTemplate
                )
                
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
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}

        used_citations = extract_used_citations(full_response, citation_map, retrieved_docs)
        

        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}

def FACT_CHECKING_HELP_text(raw_Conversation, use_web, userId, highlightedText, useRag, meetingTemplate):
    try :
        log_time("Starting Fact Checking Process")

        instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction =  instructions["fact_checking"]
        instruction2 = instructions["exchange_extraction"]
        temp = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        query_stream = llm_processing_FindAnswer_text(instruction2, temp, top_p, token_limit, raw_Conversation, highlightedText, meetingTemplate)
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
                yield json.dumps({ "query": f'Fact Checking for [{query}]'}) + "\n"
        
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
        
        response_generator = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation,
                    meetingTemplate
                )
                
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
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": full_response
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}