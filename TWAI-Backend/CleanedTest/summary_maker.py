import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from .commonFunctions import extract_relevant_conversation
from .prompts import get_system_instructions

instruction = get_system_instructions()
instr = instruction["summary"]

# Load environment variables
load_dotenv()

# Initialize OpenAI client
GEMINI_API_KEY=os.environ.get('GEMINI_API_KEY')
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
gemclient = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

def Summary_llm(combined_text, meetingTemplate=""):
    """
    Summarizes the conversation using OpenAI API.
    
    Args:
        combined_text (str): The text of the conversation to summarize
        meetingTemplate (str): JSON string containing meeting information
        
    Returns:
        generator: A generator that yields chunks of the response as they arrive
                  or None if an error occurs
    """
    meeting_context = f"\n\nMeeting Context: {meetingTemplate}" if meetingTemplate else ""
    
    try:
        stream = gemclient.chat.completions.create(
            messages=[
                {"role": "system", "content": f"{instr}{meeting_context}"},
                {"role": "user", "content": f'''Conversation: {combined_text}\n\nSummarize the given conversation of the meet.'''}
            ],
            model="gemini-2.5-flash", 
            temperature=0.7, 
            top_p=0.9, 
            stream=True  # Enable streaming
        )
        
        # Return the streaming generator directly
        return stream
    except Exception as e:
        print(f"Error in Summary_llm: {e}")
        return None


def summarize_conversation(raw_Conversation, meetingTemplate):
    """
    Extracts and summarizes relevant parts of a conversation.
    
    Args:
        raw_Conversation (list): The full conversation history
        meetingTemplate (str): JSON string containing meeting information
        
    Returns:
        generator: A generator that yields chunks of the summary as they arrive
    """
    # Filter relevant conversation based on specific speakers
    relevant_conversation = extract_relevant_conversation(raw_Conversation)
    
    if relevant_conversation:
        # Combine only the text (not speaker labels) into a single string
        combined_text = " ".join([f'{"You" if sender == "User" else sender}:{text}' for sender, text in relevant_conversation]) #Changes User to You for summary only

    else:
        combined_text = "No new conversation available to analyze."
    yield json.dumps({"query": "Summary of conversation so far : "}) + "\n"
    # Get streaming summary generator
    summary_stream = Summary_llm(combined_text, meetingTemplate)
    if not summary_stream:
        yield json.dumps({"error": "Failed to generate summary"}) + "\n"
        return
    
    # Stream summary chunks to frontend
    full_response = ""
    for chunk in summary_stream:
        if chunk.choices[0].delta.content is not None:
            chunk_content = chunk.choices[0].delta.content
            full_response += chunk_content
            # Send each chunk to the frontend
            yield json.dumps({"chunk": chunk_content, "result": full_response}) + "\n"
    
    # Signal completion
    



def SUMMARY_WITH_AI(raw_Conversation, meetingTemplate=""):
    """
    Main function to generate a summary of a conversation.
    
    Args:
        raw_Conversation (list): The full conversation history
        meetingTemplate (str): JSON string containing meeting information
        
    Returns:
        generator: A generator that yields chunks of the summary as they arrive
    """
    return summarize_conversation(raw_Conversation, meetingTemplate)