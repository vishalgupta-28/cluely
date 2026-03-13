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

def llm_processing_evaluation(context_text, query, Cust_instr, temp, top_p, token_limit, raw_conversation=None):
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
        
    Returns:
        generator: A generator that yields response chunks as they arrive
    """
    log_time("Starting LLM Processing for Evaluation")
    
    # Process conversation into summarized text if provided
    conversation_context = ""
    if raw_conversation:
        relevant_conversation = extract_relevant_conversation(raw_conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No conversation context available."
        conversation_context = f"\n\nConversation Context:\n{summarized_text}"
    
    messages = [
        {"role": "system", "content": f"THIS IS THE MOST IMPORTANT INSTRUCTION:{Cust_instr}"},
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

def llm_processing_FindAnswer(instruction, temp, top_p, token_limit, raw_Conversation):
    log_time("Starting LLM Processing for Answer Extraction")
    relevant_conversation = extract_relevant_conversation(raw_Conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    try:
        chat_completion = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{instruction}"},
                {"role": "user", "content": f"Extract the final exchange:\n\n{summarized_text}\n DO NOT TRY TO ADD, UPDATE OR ENHANCE WHAT EVER IS SAID IN THE CONVERSATION. **STRICTLY ONLY GIVE THE **SUMMARIZED** CONVERSATION AS A SINGLE STATEMENT**."}
            ],
            model="gemini-2.5-flash-lite", 
            temperature=temp, 
            n = 1,
            top_p=top_p, 
            max_tokens=token_limit
        )
        log_time("Completed LLM Processing for Answer Extraction")
        return chat_completion.choices[0].message.content
    except Exception as e:
        log_time("Error in Answer Extraction")
        return None

def llm_processing_FindAnswer_text(instruction, temp, top_p, token_limit, raw_Conversation, highlightedText):
    log_time("Starting LLM Processing for Answer Extraction")
    relevant_conversation = extract_relevant_conversation(raw_Conversation)
    summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available to analyze."
    
    try:
        chat_completion = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{instruction}"},
                {"role": "user", "content": f"Use the following snippet as high importance for extraction:\n\n{highlightedText}\n\nHere's the overall conversation :\n\n{summarized_text}\n\n. WHILE EXTRACTING THE FINAL EXCHANGE, ENSURE THAT THE EXTRACTED TEXT IS MAJORLY BASED ON THE HIGHLIGHTED TEXT WITH THE USE OF THE OVERALL CONVERSATION TO PROVIDE CONTEXT.\n DO NOT TRY TO ADD, UPDATE OR ENHANCE WHAT EVER IS SAID IN THE CONVERSATION.**STRICTLY ONLY GIVE THE **SUMMARIZED** CONVERSATION AS A SINGLE STATEMENT**."}
            ],
            model="gemini-2.5-flash-lite", 
            temperature=temp, 
            n = 1,
            top_p=top_p, 
            max_tokens=token_limit
        )
        log_time("Completed LLM Processing for Answer Extraction")
        return chat_completion.choices[0].message.content
    except Exception as e:
        log_time("Error in Answer Extraction")
        return None

def FACT_CHECKING_HELP(raw_Conversation, use_web, userId,useRag):
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

        query = llm_processing_FindAnswer(instruction2, temp, top_p, token_limit, raw_Conversation)
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
        result = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation
                )
        yield json.dumps({"result": result}) + "\n"
        log_time("Completed LLM Response Generation")
        
        log_time("Extracting Citations")
        if retrieved_docs:
            context_text, citation_map = citation_context_text(retrieved_docs)
        else:
            context_text, citation_map = "", {}

        # Extract citations here
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": result
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}

def FACT_CHECKING_HELP_Query(prevAnswer,prevQuery,raw_Conversation, use_web, userId, highlightedText,useHighlightedText,useRag):
    try :
        log_time("Starting Fact Checking Process")

        query = prevQuery

        instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction =  instructions["fact_checking"]
        instruction2 = instructions["exchange_extraction"]
        temp = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        # Modify query extraction to incorporate previous answer and highlighted text
        query = llm_processing_FindAnswer_text(
            instruction2, 
            temp, 
            top_p, 
            token_limit, 
            raw_Conversation, 
            f"Previous Answer: {prevAnswer}\nHighlighted Text: {highlightedText}"
        )
        
        query = "NO QUERY COULD BE FOUND"  # Start with the previous query as fallback

        if useHighlightedText:
            regenerated_query = llm_processing_FindAnswer_text(
                instruction2,
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation, 
                highlightedText,
                prevQuery
            )
            
            # Use regenerated query only if it's valid
            if regenerated_query:
                query = regenerated_query
        else:
            regenerated_query = llm_processing_FindAnswer(
                instruction2, 
                model_params["temperature"], 
                model_params["top_p"], 
                model_params["token_limit"], 
                raw_Conversation,
                prevQuery
            )
            
            # Use regenerated query only if it's valid
            if regenerated_query:
                query = regenerated_query
        
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

        # Enhance context with the new query and previous context
        context_text += f"\nNew Query: {query}\nPrevious Answer: {prevAnswer}"

        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        result = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation
                )
        yield json.dumps({"result": result}) + "\n"
        log_time("Completed LLM Response Generation")
        
        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": result
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}
    

def FACT_CHECKING_HELP_Expand(prevAnswer,prevQuery,raw_Conversation, use_web, userId, highlightedText,useRag):
    try :
        log_time("Starting Fact Checking Process")

        query = "NO QUERY FOUND"

        instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction =  instructions["fact_checking"]
        instruction2 = instructions["exchange_extraction"]
        temp = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        
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

        # Enhance context with the new query and previous context
        if prevAnswer:
            variation_prompt=f"\n\nPrevious Answer: {prevAnswer}\n\nPlease provide a new answer in detail in approx. 15-20 lines"
            context_text+=variation_prompt

        context_text += query

        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        result = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation
                )
        yield json.dumps({"result": result}) + "\n"
        log_time("Completed LLM Response Generation")
        
        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": result
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}
    
def FACT_CHECKING_HELP_Result(prevAnswer,prevQuery,raw_Conversation, use_web, userId, highlightedText,useRag):
    try :
        log_time("Starting Fact Checking Process")

        query = prevQuery
        user_input = query

        instructions = get_system_instructions()
        model_params = get_model_parameters()

        instruction =  instructions["fact_checking"]
        instruction2 = instructions["exchange_extraction"]
        temp = model_params["temperature"]
        top_p = model_params["top_p"]
        token_limit = model_params["token_limit"]
        namespace = userId

        
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

        # Enhance context with the new query and previous context
        if prevAnswer:
            variation_prompt=f"\n\nPrevious Answer: {prevAnswer}\n\nPlease provide a new answer that covers the same key points but uses different wording, structure, or perspective to add variety."
            context_text+=variation_prompt

        context_text += query

        log_time("Completed Context Processing (Citation) for RAG and Web Search")
        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == "":
            context_text = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
        result = llm_processing_evaluation(
                    context_text, 
                    query, 
                    instruction, 
                    temp, 
                    top_p, 
                    token_limit,
                    raw_Conversation
                )
        yield json.dumps({"result": result}) + "\n"
        log_time("Completed LLM Response Generation")
        
        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield  json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")
        
        log_time("Completed Fact Checking Process")
        return {
            "query": "FACT CHECK:",
            "used_citations": used_citations,
            "result": result
        }
    except Exception as e:
        log_time("Error in Fact Checking Process")
        print(f"Error in Fact Checking Process: {e}")
        return {"error": "An error occurred during AI help processing."}

