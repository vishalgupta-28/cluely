"use client"

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { X } from 'lucide-react';

const PreparationHubModal = ({ isOpen, onClose, onSubmit, meetingTemplates, documents }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    meetingTemplateId: '',
    documentId: '',
    additionalDetails: '',
  });

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setFormData({
        name: '',
        meetingTemplateId: meetingTemplates?.length > 0 ? meetingTemplates[0].id : '',
        documentId: 'none',
        additionalDetails: '',
      });
    }
  }, [isOpen, meetingTemplates]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, meetingTemplateId: value }));
  };

  const handleDocumentSelectChange = (value) => {
    setFormData(prev => ({ ...prev, documentId: value === 'none' ? '' : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error creating preparation hub:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Preparation Hub</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Preparation Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Interview Preparation for Google"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="meetingTemplateId">Select Meeting Template</Label>
            {meetingTemplates?.length > 0 ? (
              <Select
                value={formData.meetingTemplateId}
                onValueChange={handleSelectChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a meeting template" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.purpose}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No meeting templates available. Create a template first.
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="documentId">Select Document (Optional)</Label>
            {documents?.length > 0 ? (
              <Select
                value={formData.documentId || 'none'}
                onValueChange={handleDocumentSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a document (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    No document selected
                  </SelectItem>
                  {documents.map(document => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.title || `Document ${document.id.slice(0, 8)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-gray-500 italic">
                No documents available. Upload a document first.
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="additionalDetails">Instructions</Label>
            <Textarea
              id="additionalDetails"
              name="additionalDetails"
              placeholder="Add any specific notes or context for this preparation"
              value={formData.additionalDetails}
              onChange={handleInputChange}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.meetingTemplateId}>
              {isSubmitting ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Creating...
                </>
              ) : (
                'Create Preparation Hub'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PreparationHubModal;
