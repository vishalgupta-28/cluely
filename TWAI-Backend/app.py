import time
from pydantic import BaseModel
from CleanedTest.help_with_ai import HELP_WITH_AI , HELP_WITH_AI_text
from CleanedTest.fact_checking import FACT_CHECKING_HELP , FACT_CHECKING_HELP_text
from CleanedTest.summary_maker import summarize_conversation

from typing import Literal, Optional
from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Header, Depends
from CleanedTest.talk_to_jamie import CHAT_WITH_JAMIE
from CleanedTest.upload_pdf import ADD_EMBEDDINGS_FROM_AZURE
from CleanedTest.delete_embeddings import DELETE_EMBEDDINGS
import json
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# from regenerate import regenerate_response
from CleanedTest.regenerate_talk_to_jamie import Reg_result_jamie, Reg_expand_jamie
from CleanedTest.regenerate_help_with_ai import Reg_AI_HELP_Query , Reg_AI_HELP_Result , Reg_AI_HELP_Expand
from CleanedTest.regenerate_fact_check import FACT_CHECKING_HELP_Query, FACT_CHECKING_HELP_Result, FACT_CHECKING_HELP_Expand
from CleanedTest.explain_like_5_year_old import EXPLAIN_SIMPLY,EXPLAIN_SIMPLY_text
from CleanedTest.create_action_plan import CREATE_ACTION_PLAN,CREATE_ACTION_PLAN_text
from CleanedTest.help_with_image import HELP_WITH_IMAGE
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
BACKEND_SECRET = os.getenv("BACKEND_SECRET")
if not BACKEND_SECRET:
    raise ValueError("BACKEND_SECRET environment variable is not set")

# Initialize FastAPI app
app = FastAPI()

# Security dependency to check for backend secret
async def verify_backend_secret(
    x_backend_secret: str = Header(None, alias="X-Backend-Secret"), 
    backend_secret: str = Header(None, alias="BACKEND-SECRET")
):
    # Check both header variants
    secret = x_backend_secret or backend_secret
    
    # if not secret or secret != BACKEND_SECRET:
    #     raise HTTPException(
    #         status_code=401, 
    #         detail="Invalid or missing backend secret"
    #     )
    return secret

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for AI Help request data
class AIHelpRequest(BaseModel):
    raw_conversation: list
    use_web: bool
    userId : str
    useHighlightedText : Optional[bool] = False  #ADDED THESE 2 PARAMS YOU CAN TEST AND USE THEM
    highlightedText : Optional[str] = ""
    meetingTemplate : Optional[str] = "{}" #THIS COMES IN STRING JSON FORMAT DONT FORGET TO CONVERT IT TO JSON
    useRag : Optional[bool] = False
    documents : Optional[list] = []

# Pydantic model for AI Summary request data
class AISummaryRequest(BaseModel):
    raw_conversation: list
    useHighlightedText : Optional[bool] = False
    highlightedText : Optional[str] = ""
    meetingTemplate : Optional[str] = "{}"  #THIS COMES IN STRING JSON FORMAT DONT FORGET TO CONVERT IT TO JSON
    useRag : Optional[bool] = False

@app.post("/process-ai-help")
def process_ai_help_endpoint(request: AIHelpRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI help processing via POST API."""
    print(request.raw_conversation)
    try:
        if request.useHighlightedText:
            if request.highlightedText == " " :

                return StreamingResponse(HELP_WITH_AI(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")
            else:
                return StreamingResponse(HELP_WITH_AI_text(request.raw_conversation, request.use_web,request.userId,request.highlightedText,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")

        else:
            return StreamingResponse(HELP_WITH_AI(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

@app.post("/AI-Fact-Check")
def process_ai_factcheck_endpoint(request: AIHelpRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI fact-checking processing via POST API."""
    try:
        if request.useHighlightedText:
            if request.highlightedText == " " :
                return StreamingResponse(FACT_CHECKING_HELP(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate, documents=request.documents), media_type="application/json")
            else:
                return StreamingResponse(FACT_CHECKING_HELP_text(request.raw_conversation, request.use_web,request.userId,request.highlightedText,useRag=request.useRag,meetingTemplate=request.meetingTemplate, documents=request.documents), media_type="application/json")
        else:
            return StreamingResponse(FACT_CHECKING_HELP(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate, documents=request.documents), media_type="application/json")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

@app.post("/AI-Summary")
async def process_ai_summary_endpoint(request: AISummaryRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI summary processing via POST API."""
    try:
        return StreamingResponse(summarize_conversation(request.raw_conversation,meetingTemplate=request.meetingTemplate),media_type="application/json")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

# Define request structure for chat endpoint
class ChatRequest(BaseModel):
    user_input: str
    use_web: Optional[bool] = False
    use_graph: Optional[bool] = False
    raw_Conversation: Optional[list] = []
    uploaded_file: Optional[str] = None

@app.post("/Ask-Ai")
async def chat_with_jamie(
    user_input: str = Form(...),  
    use_web: Optional[bool] = Form(...),  
    use_graph: Optional[bool] = Form(...),  
    uploaded_file: Optional[UploadFile] = File(None),  
    raw_Conversation: Optional[str] = Form(''),
    chat_Conversation: Optional[str] = Form(''),
    userId : str = Form(...),
    meetingTemplate : Optional[str] = Form('{}'),  #THIS COMES IN STRING JSON FORMAT DONT FORGET TO CONVERT IT TO JSON
    useRag : Optional[bool] = Form(False),
    x_backend_secret: str = Depends(verify_backend_secret)
):
    """Handles chat processing with Jamie via POST API."""
    try:
        
    
        # Parse raw conversation if provided
        conversation = json.loads(raw_Conversation) if raw_Conversation else []
        chatConversation = json.loads(chat_Conversation) if chat_Conversation else []

        # Process chat request

        return StreamingResponse(CHAT_WITH_JAMIE(
            user_input=user_input,
            chatConversation=chatConversation,
            use_web=use_web,
            use_graph=use_graph,
            uploaded_file=uploaded_file,
            raw_conversation=conversation,
            userId=userId,
            useRag=useRag,
            meetingTemplate=meetingTemplate,
            documents=documents
        ), media_type="application/json")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

class AddEmbeddings(BaseModel):
    azureUrl: str

    userId:str

@app.post("/add_embeddings")
async def add_embeddings(request: AddEmbeddings, x_backend_secret: str = Depends(verify_backend_secret)):
    try:
        return ADD_EMBEDDINGS_FROM_AZURE(request.azureUrl,request.userId)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")
    


class DeleteEmbeddings(BaseModel):
    pdf_url: str
    userId:str

@app.post("/delete_embeddings")
async def delete_embeddings(request: DeleteEmbeddings, x_backend_secret: str = Depends(verify_backend_secret)):
    print(request)
    try:
        return DELETE_EMBEDDINGS(request.pdf_url,request.userId)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")
    


class RegenerateResponseRequest(BaseModel):
    raw_conversation: list
    use_web: bool = True
    userId: str
    useHighlightedText: Optional[bool] = False
    highlightedText: Optional[str] = ""
    meetingTemplate: Optional[str] = "{}"  # JSON string, should be converted
    useRag: Optional[bool] = False
    prevQuery: Optional[str] = None
    action: Literal["help", "factcheck", "chat_Jamie_AI"]
    prevAnswer: Optional[str] = None
    regenerate_Query_or_Result_or_expandquestion: Literal["Query", "Result","expandquestion"]

@app.post("/Regenerate-Response")
def regenerate(request: RegenerateResponseRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles AI query regeneration via POST API."""
    try:
      
      
        payload = {
            "raw_conversation": request.raw_conversation,
            "use_web": request.use_web,
            "userId": request.userId,
            "useHighlightedText": request.useHighlightedText,
            "highlightedText": request.highlightedText,
            "meetingTemplate": json.loads(request.meetingTemplate),  # Convert JSON string to dict
            "useRag": request.useRag,
            "prevQuery": request.prevQuery,
            "action": request.action ,
            "prevAnswer": request.prevAnswer,
            "regenerate_Query_or_Result_or_expandquestion": request.regenerate_Query_or_Result_or_expandquestion
        }
        prevAnswer = payload.get("prevAnswer", "")
        prevQuery = payload.get("prevQuery", "")
        userId = payload.get("userId", "")
        raw_Conversation = payload.get("raw_conversation", [])
        use_web = payload.get("use_web", False)
        useRag = payload.get("useRag", False)
        highlightedText=payload.get("highlightedText",False)


        # Determine the type of regeneration
        regen_type = payload['regenerate_Query_or_Result_or_expandquestion']
        action = payload['action']

        if action == 'chat_Jamie_AI':
            
            if regen_type=="Result":
                return StreamingResponse(Reg_result_jamie(
            prevAnswer=prevAnswer,
            prevQuery=prevQuery,
            userId=userId,
            use_web=use_web,
            use_graph=False,  # Assuming this is not provided in payload
            raw_Conversation=raw_Conversation,
            useRag=useRag
        ), media_type="application/json")
            
            elif regen_type=="expandquestion":
                return StreamingResponse(Reg_expand_jamie(
            prevAnswer=prevAnswer,
            prevQuery=prevQuery,
            userId=userId,
            use_web=use_web,
            use_graph=False,  # Assuming this is not provided in payload
            raw_Conversation=raw_Conversation,
            useRag=useRag
        ), media_type="application/json")

            
        if action == 'help':
            if regen_type == "Query":
                print("i am inside the loop")
                return StreamingResponse(Reg_AI_HELP_Query(
                  prevAnswer=prevAnswer,
                  prevQuery=prevQuery,
                  userId=userId,
                  use_web=use_web,
                  raw_Conversation=raw_Conversation,
                  highlightedText=highlightedText,
                  useRag=useRag,
                  useHighlightedText=payload["useHighlightedText"]
                ),media_type="application/json")
            
            elif regen_type=="Result":
                return StreamingResponse(Reg_AI_HELP_Result(
                  prevAnswer=prevAnswer,
                  prevQuery=prevQuery,
                  userId=userId,
                  use_web=use_web,
                  raw_Conversation=raw_Conversation,
                  highlightedText=highlightedText,
                  useRag=useRag,
                  useHighlightedText=payload["useHighlightedText"]

                ),media_type="application/json")
            
            elif regen_type=="expandquestion":
                return StreamingResponse(Reg_AI_HELP_Expand(
                  prevAnswer=prevAnswer,
                  prevQuery=prevQuery,
                  userId=userId,
                  use_web=use_web,
                  raw_Conversation=raw_Conversation,
                  highlightedText=highlightedText,
                  useRag=useRag,
                  useHighlightedText=payload["useHighlightedText"]

                ),media_type="application/json")

        if action=='factcheck':
            pass
            # if regen_type=="Query":
            #     return StreamingResponse(FACT_CHECKING_HELP_Query(
            #       prevAnswer=prevAnswer,
            #       prevQuery=prevQuery,
            #       userId=userId,
            #       use_web=use_web,
            #       raw_Conversation=raw_Conversation,
            #       highlightedText=highlightedText,
            #       useRag=useRag,
            #       useHighlightedText=payload["useHighlightedText"]
            #     ),media_type="application/json")
            
            # elif regen_type=="Result":
            #     return StreamingResponse(FACT_CHECKING_HELP_Result(
            #       prevAnswer=prevAnswer,
            #       prevQuery=prevQuery,
            #       userId=userId,
            #       use_web=use_web,
            #       raw_Conversation=raw_Conversation,
            #       highlightedText=highlightedText,
            #       useRag=useRag,
            #       useHighlightedText=payload["useHighlightedText"]
            #     ),media_type="application/json")
            

            # if regen_type=="expandquestion":
            #     return StreamingResponse(FACT_CHECKING_HELP_Expand(
            #       prevAnswer=prevAnswer,
            #       prevQuery=prevQuery,
            #       userId=userId,
            #       use_web=use_web,
            #       raw_Conversation=raw_Conversation,
            #       highlightedText=highlightedText,
            #       useRag=useRag,
            #       useHighlightedText=payload["useHighlightedText"]
            #     ),media_type="application/json")

        

    except Exception as e:
        print("🚨 Regeneration request encountered an error!")
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    


@app.post("/explain-like-5-year-old")
def process_explain_like_5_year_old(request: AIHelpRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI help processing via POST API."""
    try:
        if request.useHighlightedText:
            if request.highlightedText == " " :

                return StreamingResponse(EXPLAIN_SIMPLY(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate , documents=request.documents), media_type="application/json")
            else:
                return StreamingResponse(EXPLAIN_SIMPLY_text(request.raw_conversation, request.use_web,request.userId,request.highlightedText,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")

        else:
            return StreamingResponse(EXPLAIN_SIMPLY(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")
    

@app.post("/create-action-plan")
def process_create_action_plan(request: AIHelpRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI help processing via POST API."""
    try:
        if request.useHighlightedText:
            if request.highlightedText == " " :

                return StreamingResponse(CREATE_ACTION_PLAN(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")
            else:
                return StreamingResponse(CREATE_ACTION_PLAN_text(request.raw_conversation, request.use_web,request.userId,request.highlightedText,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")

        else:
            return StreamingResponse(CREATE_ACTION_PLAN(request.raw_conversation, request.use_web,request.userId,useRag=request.useRag,meetingTemplate=request.meetingTemplate,documents=request.documents), media_type="application/json")
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")

class HelpWithImageRequest(BaseModel):
   image : str
   userInput : str
   web : bool
   userId : str
   useRag : bool
   documents : Optional[list] = []


@app.post("/help-with-image")
def process_help_with_image(request: HelpWithImageRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    """Handles the AI help processing via POST API."""
    print(request.userInput)
    try:
        if request.image:
          return StreamingResponse(HELP_WITH_IMAGE(request.image, request.userInput,request.web,request.userId,request.useRag,request.documents), media_type="application/json")   

        
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")


class GenerateQuestionsRequest(BaseModel):
    preparationId: str
    userId: str
    meetingTemplate: Optional[dict] = None
    additionalDetails: Optional[str] = None
    documentUrl: Optional[str] = None
    count: int = 10

@app.post("/generate-questions")
def process_generate_questions(request: GenerateQuestionsRequest, x_backend_secret: str = Depends(verify_backend_secret)):
    try:
        from CleanedTest.generate_question import GENERATE_QUESTIONS
        
        result = GENERATE_QUESTIONS(
            preparation_id=request.preparationId,
            user_id=request.userId,
            meeting_template=request.meetingTemplate,
            additional_details=request.additionalDetails,
            document_url=request.documentUrl,
            count=request.count
        )
        
        return result
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=f"An error occurred: {str(e)}")