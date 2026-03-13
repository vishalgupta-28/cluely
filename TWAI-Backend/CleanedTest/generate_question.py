import os
import json
from openai import OpenAI
from typing import Optional, Dict, List, Any

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def GENERATE_QUESTIONS(
    preparation_id: str,
    user_id: str,
    meeting_template: Optional[Dict] = None,
    additional_details: Optional[str] = None,
    document_url: Optional[str] = None,
    count: int = 10
) -> List[Dict[str, str]]:
    """
    Generate interview/preparation questions using OpenAI.
    
    Returns:
        List of question-answer pairs in simple JSON format: [{"question": "", "answer": ""}]
    """
    
    print(f"🔍 Starting question generation for preparation: {preparation_id}")
    print(f"📊 Parameters: count={count}, user_id={user_id}")
    
    # Build context from meeting template
    context = ""
    if meeting_template:
        purpose = meeting_template.get('purpose', '')
        goal = meeting_template.get('goal', '')
        template_info = meeting_template.get('additionalInfo', '')
        
        context += f"Meeting Purpose: {purpose}\n"
        context += f"Meeting Goal: {goal}\n"
        if template_info:
            context += f"Additional Template Info: {template_info}\n"
        
        print(f"📝 Meeting Template Context:")
        print(f"   Purpose: {purpose}")
        print(f"   Goal: {goal}")
        if template_info:
            print(f"   Additional Info: {template_info}")
    
    if additional_details:
        context += f"Additional Instructions: {additional_details}\n"
        print(f"📋 Additional Details: {additional_details}")
    
    # Document URL transparency
    if document_url:
        print(f"📄 DOCUMENT PROVIDED: {document_url}")
        print(f"✅ Will include document content in question generation")
    else:
        print(f"❌ NO DOCUMENT PROVIDED - generating questions from context only")
    
    # Create system prompt for question generation
    system_prompt = f"""
Generate {count} interview/preparation questions and answers based on the context provided.

Context:
{context}

Return ONLY a JSON array with this exact format:
[
  {{"question": "Your question here?", "answer": "Comprehensive answer here"}},
  {{"question": "Another question?", "answer": "Another answer"}}
]

Make questions relevant, professional, and cover different aspects like technical skills, experience, and scenarios.
"""
    
    # Prepare messages for OpenAI
    base_user_message = f"Generate {count} questions and answers."
    
    # Add PDF document context if available
    if document_url:
        base_user_message += f" Also use this document for context: {document_url}"
        print(f"🔗 Document URL added to OpenAI request: {document_url}")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": base_user_message}
    ]
    
    print(f"🤖 Sending request to OpenAI with:")
    print(f"   Model: gpt-4o-mini")
    print(f"   Context length: {len(context)} characters")
    print(f"   Document included: {'YES' if document_url else 'NO'}")
    print(f"   User message: {base_user_message[:100]}{'...' if len(base_user_message) > 100 else ''}")
    
    # Call OpenAI API
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=4000,
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    
    # Parse and return response
    response_content = response.choices[0].message.content
    print(f"🔄 OpenAI Response received ({len(response_content)} characters)")
    
    result = json.loads(response_content)
    print(f"📋 Parsed JSON result:")
    print(result)
    
    # Handle different possible response formats
    if isinstance(result, dict) and 'questions' in result:
        questions = result['questions']
    elif isinstance(result, list):
        questions = result
    else:
        questions = [result]
    
    print(f"✅ Generated {len(questions)} questions for preparation {preparation_id}")
    return questions[:count]
