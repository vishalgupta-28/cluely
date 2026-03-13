"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { X, Plus, HelpCircle, MessageSquare, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const QuestionAnswerEditor = ({ isOpen, onClose, preparationId, preparationName, questions, onSave }) => {
  const [questionsData, setQuestionsData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [autoSaved, setAutoSaved] = useState(true);

  useEffect(() => {
    if (questions) {
      const formattedQuestions = questions.map((q, index) => ({
        id: q.id || index, // Use existing ID or index as fallback
        question: q.question || '',
        answer: q.answer || '',
        createdAt: q.createdAt || new Date().toISOString(),
      }));
      setQuestionsData(formattedQuestions);
      if (formattedQuestions.length > 0) {
        setActiveQuestionId(formattedQuestions[0].id);
      }
    }
  }, [questions]);

  // Simulate auto save indication
  useEffect(() => {
    const timer = setTimeout(() => {
      setAutoSaved(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [questionsData]);

  const handleSaveChanges = async () => {
    setIsSubmitting(true);
    try {
      await onSave(preparationId, questionsData);
      onClose();
    } catch (error) {
      console.error("Error saving questions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestionChange = (questionId, value) => {
    setAutoSaved(false);
    setQuestionsData(questionsData.map(q => 
      q.id === questionId 
        ? { ...q, question: value }
        : q
    ));
  };

  const handleAnswerChange = (questionId, value) => {
    setAutoSaved(false);
    setQuestionsData(questionsData.map(q => 
      q.id === questionId 
        ? { ...q, answer: value }
        : q
    ));
  };

  const handleRegenerateAnswer = (questionId) => {
    // In a real implementation, this would call an API to regenerate the answer
    setIsRegenerating(true);
    setTimeout(() => {
      setQuestionsData(questionsData.map(q => 
        q.id === questionId 
          ? { ...q, answer: "This is a regenerated answer for the question. In a real implementation, this would come from an AI model." }
          : q
      ));
      setIsRegenerating(false);
    }, 1000);
  };

  const handleDeleteQuestion = (questionId) => {
    const filteredQuestions = questionsData.filter(q => q.id !== questionId);
    setQuestionsData(filteredQuestions);
    
    // If the deleted question was active, select another question
    if (activeQuestionId === questionId && filteredQuestions.length > 0) {
      setActiveQuestionId(filteredQuestions[0].id);
    } else if (filteredQuestions.length === 0) {
      setActiveQuestionId(null);
    }
  };

  const handleAddNewQuestion = () => {
    const newId = Math.max(...questionsData.map(q => q.id), 0) + 1;
    const newQuestion = {
      id: newId,
      question: 'New question',
      answer: '',
      createdAt: new Date().toISOString(),
    };
    
    const updatedQuestions = [...questionsData, newQuestion];
    setQuestionsData(updatedQuestions);
    setActiveQuestionId(newId);
    setAutoSaved(false);
  };

  const getQuestionCount = () => {
    return questionsData.length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} size="lg">
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Q&A Editor - {preparationName}</span>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddNewQuestion}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
              <span className="text-sm text-gray-500">Total: {getQuestionCount()} QA Pairs</span>
            </div>
            <div className="flex items-center gap-2">
              {autoSaved && (
                <span className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> Auto saved.
                </span>
              )}
              <Button 
                variant="default" 
                onClick={() => onSave(preparationId, questionsData)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Apply To Copilot
              </Button>
            </div>
          </div>
          
          <div className="space-y-6 px-2">
            {questionsData.length > 0 ? (
              questionsData.map((qa) => (
                <div key={qa.id} className="border rounded-md overflow-hidden">
                  {/* Question section */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="font-medium">Question</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteQuestion(qa.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="text-sm mr-1">Delete this Q&A</span>
                      </button>
                    </div>
                    <Textarea
                      value={qa.question}
                      onChange={(e) => handleQuestionChange(qa.id, e.target.value)}
                      rows={3}
                      className="w-full resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter your question here"
                    />
                  </div>
                  
                  {/* Answer section */}
                  <div className="p-4 bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                        <span className="font-medium">Answer</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRegenerateAnswer(qa.id)}
                        disabled={isRegenerating}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-1", isRegenerating && "animate-spin")} />
                        Regenerate
                      </Button>
                    </div>
                    <Textarea
                      value={qa.answer}
                      onChange={(e) => handleAnswerChange(qa.id, e.target.value)}
                      rows={6}
                      className="w-full resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter your answer here"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border rounded-md">
                <p className="text-gray-500">No questions yet. Click &apos;Add Question&apos; to get started.</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                Saving...
              </>
            ) : (
              'Save All Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionAnswerEditor;
