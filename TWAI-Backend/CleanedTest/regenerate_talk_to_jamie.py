import json
import os
import base64
import time
import re
import numpy as np
import pandas as pd
import concurrent.futures 
import tempfile
import shutil
import matplotlib.pyplot as plt
import matplotlib
from io import BytesIO
from fastapi import UploadFile
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from CleanedTest.citations import extract_used_citations
from .prompts import get_system_instructions
from CleanedTest.commonFunctions import (
    citation_context_text, extract_relevant_conversation, llm_processing, query_ragR, useWeb, get_model_parameters
)


# Load environment variables
load_dotenv()
GEMINI_API_KEY=os.environ.get('GEMINI_API_KEY')
gemclient = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

instructions = get_system_instructions()

instr1 = instructions["query_extraction_jamie"]
instr2 = instructions["answer_jamie"]

def log_time(stage):
    """Logs the timestamp for a given stage."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {stage}")

def run_tasks_concurrently(task_functions):
    """Run RAG and Web Search tasks concurrently using ThreadPoolExecutor."""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(lambda func: func(), task_functions))
    return results

# Function to encode an image to base64
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

# Function to summarize an uploaded image
async def Image_Summ(file_path: str, content_type: str):
    try:
        log_time("Starting Image Summarization")
        
        # Read the image file
        with open(file_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')

        # Create the data URL
        url = f"data:{content_type};base64,{base64_image}"

        # Send the request
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Summarize the uploaded image in detail"},
                    {"type": "image_url", "image_url": {"url": url}}
                ]
            }]
        )

        log_time("Completed Image Summarization")
        return response.choices[0].message.content

    except Exception as e:
        log_time("Error in Image Summarization")
        print(f"Error in Image_Summ: {e}")
        return None

# Function to refine user query based on conversation context
def llm_processing_query_Jamie(query, raw_Conversation):
    try:
        log_time("Starting Query Refinement")
        relevant_conversation = extract_relevant_conversation(raw_Conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No new conversation available."
        
        chat_completion = gemclient.chat.completions.create(
            model="gemini-2.5-flash-lite",
            n = 1,
            messages=[
                {"role": "system", "content": f"{instr1}"},
                {"role": "user", "content": f"Conversation: {summarized_text}\n\nQuestion: {query}"}
            ],
            temperature=0.7, top_p=0.9, max_tokens=600
        )
        log_time("Completed Query Refinement")
        return chat_completion.choices[0].message.content
    except Exception as e:
        log_time("Error in Query Refinement")
        print(f"Error in llm_processing_query_Jamie: {e}")
        return None

# Function to process user queries and generate structured responses
def llm_processing_Jamie(query: str, context_text: str, raw_conversation=None):
    """
    Process a query through the LLM with streaming responses.
    
    Args:
        query (str): User's query to be answered
        context_text (str): Context information with citation markers
        raw_conversation (list, optional): User's conversation history
        
    Returns:
        generator: A generator that yields response chunks as they arrive
    """
    
    # Process conversation into summarized text if provided
    conversation_context = ""
    if raw_conversation:
        relevant_conversation = extract_relevant_conversation(raw_conversation)
        summarized_text = " ".join(f'{sender}:{text}' for sender,text in relevant_conversation) if relevant_conversation else "No conversation context available."
        conversation_context = f"\n\nConversation Context:\n{summarized_text}"
    
    messages = [
        {"role": "system", "content": f"{instr2}"},
        {"role": "user", "content": f"Sources:\n{context_text}{conversation_context}\n\nQuestion: {query}\nAnswer:"}
    ]
    
    # Return the streaming generator directly
    return llm_processing(messages, "gpt-4o-mini", 0.7, 0.9, 700)

def graph_vis(user_query, user_context, user_response):
    try:
        log_time("Starting Graph Generation")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "I am providing you with the context related to the query, answer to the query, and the query itself.\n"
                        f"Query: {user_query}, Context: {user_context}, Response: {user_response}\n"
                        "If the query requires any graph or chart for better understanding, "
                        "please provide only the corresponding matplotlib Python code to generate the graph or chart.\n"
                        "Respond with just the code, and nothing else.\n"
                    )
                },
                {"role": "user", "content": "Provide only the Python code to support the answer with a graph or chart.\n"}
            ]
        )

        # Extract Python code from response
        input_plot = response.choices[0].message.content

        # Ensure we only extract the code block
        match = re.search(r"```python(.*?)```", input_plot, re.DOTALL)
        if match:
            input_plot = match.group(1).strip()
        else:
            log_time("No valid code detected")
            return None

        # Ensure plt.show() is removed and adjust formatting
        input_plot = input_plot.replace("plt.show()", "")

        print(f"Generated Plot Code:\n{input_plot}")

        # Create a local execution context for security
        local_context = {"plt": plt, "BytesIO": BytesIO, "base64": base64, "np": np, "pd": pd}

        try:
            exec(input_plot, local_context)
        except Exception as exec_error:
            log_time(f"Error executing generated code: {exec_error}")
            return None

        # Retrieve the generated figure
        fig = plt.gcf()
        if not fig.get_axes():
            log_time("Generated graph is empty.")
            return None

        buffer = BytesIO()
        fig.savefig(buffer, format="png", bbox_inches="tight")
        buffer.seek(0)

        base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")
        buffer.close()
        plt.close(fig)  # Close the figure to free memory

        log_time("Completed Graph Generation")
        return base64_image

    except Exception as e:
        log_time(f"Error in Graph Generation: {e}")
        return None


# Main chatbot function to process user input and generate responses

def Reg_result_jamie(prevAnswer,prevQuery,userId,  use_web: bool = False, use_graph: bool = False, raw_Conversation=[],useRag=False):
        # return {"query": "Talk to Jamie", "result": "No user input provided"}
    try:
        log_time("Starting CHAT_WITH_JAMIE")

        
        query=prevQuery
        user_input = query

        if not prevQuery:
            pass
            # return {"query": "Talk to Jamie", "result": "No query generated"}

        
        log_time("Starting RAG & Web Search")

        chunk_limit = get_model_parameters()["chunk_limit"]
        task_functions = []

        if useRag:
            task_functions.append(lambda: query_ragR(query, chunk_limit, namespace=userId))

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
        # Incase we have to pass in image description for answerinng as well --> user input will store it

        if prevAnswer:
            variation_prompt=f"\nNOW ONE IMPORTANT THING I WANT TO TELL YOU, BELOW IS THE PREVIOUS ANSWER YOU GAVE FOR SAME QUERY, BUT THE ANSWER WAS NOT SATISFACTORY, SO PLEASE TRY AGAIN\n\nPrevious Answer: {prevAnswer}\n\nPlease provide a new answer that covers the same key points but uses different wording, structure, or perspective to add variety."
            context_text+=variation_prompt

        context_text = user_input + context_text
        log_time("Completed Context Processing (Citation) for RAG and Web Search")

        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == user_input:
            res = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
            context_text = context_text + res
        
        # Get response streaming generator, now passing raw_conversation
        response_generator = llm_processing_Jamie(query, context_text, raw_Conversation)
        
        # Stream response chunks to frontend
        full_response = ""
        for chunk in response_generator:
            if chunk is not None:
                full_response += chunk
                # Send each chunk to the frontend with a JSON format
                yield json.dumps({ "result": full_response}) + "\n"
        
        # Signal completion of response generation
        result=full_response
        log_time("Completed LLM Response Generation")
        
        log_time("Extracting Citations")
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")

        
        graph_img = graph_vis(query, retrieved_docs, result) if use_graph else None
        yield json.dumps({"graph": graph_img}) + "\n"

        log_time("Completed CHAT_WITH_JAMIE")
        
        # return {"query": query, "result": result, "used_citations": used_citations, "graph": graph_img}
    except Exception as e:
        log_time("Error in CHAT_WITH_JAMIE")
        print(f"Error in CHAT_WITH_JAMIE: {e}")
        # return {"query": "Talk to Jamie", "result": "Error occurred"}


def Reg_expand_jamie(prevAnswer,prevQuery,userId,  use_web: bool = False, use_graph: bool = False, raw_Conversation=[],useRag=False):
        # return {"query": "Talk to Jamie", "result": "No user input provided"}
    try:
        log_time("Starting CHAT_WITH_JAMIE")

        
        query=prevQuery
        user_input = query

        if not prevQuery:
            pass
            # return {"query": "Talk to Jamie", "result": "No query generated"}

        
        log_time("Starting RAG & Web Search")

        chunk_limit = get_model_parameters()["chunk_limit"]
        task_functions = []

        if useRag:
            task_functions.append(lambda: query_ragR(query, chunk_limit, namespace=userId))

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
        # Incase we have to pass in image description for answerinng as well --> user input will store it

        if prevAnswer:
            variation_prompt=f"\n\nNOW ONE IMPORTANT THING I WANT TO TELL YOU, BELOW IS THE PREVIOUS ANSWER YOU GAVE FOR SAME QUERY, BUT THE ANSWER WAS TOO SHORT, SO PLEASE TRY AGAIN AND TRY ADDING MORE INFORMATION FROM THE GIVEN SOURCES ONLY \n\nPrevious Answer: {prevAnswer}\n\nPlease provide the same answer in detail in approx. 15-20 lines"
            context_text+=variation_prompt

        context_text = user_input + context_text
        log_time("Completed Context Processing (Citation) for RAG and Web Search")

        print(f"Context Text: {context_text}")
        print(f"Citation Map: {citation_map}")
        
        log_time("Starting LLM Response Generation")
        if context_text == user_input:
            res = "MOST IMPORTANT : IF No sources is available for citation. Now you have to **STRICTLY** use your own internal knowlege to complete the task at any cost without utilizing citation sources or numbers, ** DO NOT GIVE ANSWERS LIKE : I am sorry, but I cannot answer this question based on the provided information.** FOR QUESTIONS LIKE SHARE PRICE OR YEARS OR CURRENT, RECENT DATA- ALWAYS REMEMBER TO COMPLETE THE ASNWER ANYWAY POSSIBLE EVEN IF THE CONTEXT IS ABSENT****."
            context_text = context_text + res
        
        # Get response streaming generator, now passing raw_conversation
        response_generator = llm_processing_Jamie(query, context_text, raw_Conversation)
        
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
        result=full_response
        used_citations = extract_used_citations(result, citation_map, retrieved_docs)
        yield json.dumps({"used_citations": used_citations}) + "\n"
        log_time("Completed Citation Extraction")

        
        graph_img = graph_vis(query, retrieved_docs, result) if use_graph else None
        yield json.dumps({"graph": graph_img}) + "\n"

        log_time("Completed CHAT_WITH_JAMIE")
        
        # return {"query": query, "result": result, "used_citations": used_citations, "graph": graph_img}
    except Exception as e:
        log_time("Error in CHAT_WITH_JAMIE")
        print(f"Error in CHAT_WITH_JAMIE: {e}")
        # return {"query": "Talk to Jamie", "result": "Error occurred"
