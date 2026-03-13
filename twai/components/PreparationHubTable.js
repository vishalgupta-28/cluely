import { useState } from 'react';
import { Trash, Edit, FilePlus, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { X } from 'lucide-react';

const PreparationHubTable = ({ preparations, onDelete, onEdit, onGenerate, meetingTemplates, documents, onUpdate }) => {
  const [loading, setLoading] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPrep, setEditingPrep] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    documentId: '',
    meetingTemplateId: '',
    additionalDetails: ''
  });

  const handleAction = async (id, action, hasQuestions) => {
    setLoading(id);
    try {
      if (action === 'delete') {
        await onDelete(id);
      } else if (action === 'edit' && hasQuestions) {
        await onEdit(id);
      } else if (action === 'generate' && !hasQuestions) {
        await onGenerate(id);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEditClick = (prep) => {
    setEditingPrep(prep);
    setFormData({
      name: prep.name || '',
      documentId: prep.document?.id || 'none',
      meetingTemplateId: prep.meetingTemplateId || '',
      additionalDetails: prep.additionalDetails || ''
    });
    setEditModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDocumentSelectChange = (value) => {
    setFormData(prev => ({ ...prev, documentId: value === 'none' ? '' : value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const updateData = {
        ...formData,
        documentId: formData.documentId === 'none' ? null : formData.documentId
      };
      
      if (onUpdate) {
        await onUpdate(editingPrep.id, updateData);
      }
      
      setEditModalOpen(false);
      setEditingPrep(null);
    } catch (error) {
      console.error('Error updating preparation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!preparations || preparations.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
          <FilePlus className="h-full w-full" />
        </div>
        <h3 className="mb-1 text-lg font-medium">No preparation hubs available</h3>
        <p className="text-gray-500">Create a preparation hub to get started.</p>
      </div>
    );
  }

  return (
    <>
    <div className="w-full border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[2fr_2fr_2fr_1fr_2fr] gap-4 p-4 text-gray-700 font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <span>Name</span>
        <span>Document</span>
        <span>Purpose</span>
        <span>Created</span>
        <span>Actions</span>
      </div>

      {preparations.map((prep) => (
        <div
          key={prep.id}
          className="grid grid-cols-[2fr_2fr_2fr_1fr_2fr] gap-4 p-4 border-b items-center hover:bg-gray-50 transition-colors"
        >
          {/* Preparation Hub Name */}
          <span className="truncate font-medium text-blue-600">
            {prep.name}
          </span>

          {/* Associated Document */}
          <span className="truncate text-gray-600">
            {prep.document?.title || "No document"}
          </span>

          {/* Meeting Template Purpose */}
          <span className="truncate text-gray-600">
            {prep.meetingTemplate?.purpose || "No template"}
          </span>

          {/* Creation Date */}
          <span className="text-xs text-gray-500">
            {prep.createdAt && formatDistanceToNow(new Date(prep.createdAt), { addSuffix: true })}
          </span>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {loading === prep.id ? (
              <div className="flex items-center">
                <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 border-r-2 rounded-full mr-2"></div>
                <span className="text-sm text-gray-500">Processing...</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleEditClick(prep)}
                  className="rounded-md bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition-colors"
                >
                  <Settings className="h-3 w-3" />
                </button>
                {prep.questionsCount > 0 ? (
                  <button
                    onClick={() => handleAction(prep.id, 'edit', true)}
                    className="rounded-md bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    <span className="flex items-center">
                      <Edit className="mr-1 h-3 w-3" />
                      prep question
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction(prep.id, 'generate', false )}
                    className="rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors"
                  >
                    <span className="flex items-center">
                      <FilePlus className="mr-1 h-3 w-3" />
                      Generate QA Pairs
                    </span>
                  </button>
                )}
                <button
                  onClick={() => handleAction(prep.id, 'delete')}
                  className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  <Trash className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
    
    {/* Edit Dialog */}
    <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Preparation Hub</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div>
            <Label>Document</Label>
            <Select value={formData.documentId || 'none'} onValueChange={handleDocumentSelectChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No document</SelectItem>
                {documents?.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Meeting Template</Label>
            <Select value={formData.meetingTemplateId} onValueChange={(value) => handleSelectChange('meetingTemplateId', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meetingTemplates?.map(template => (
                  <SelectItem key={template.id} value={template.id}>{template.purpose}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="additionalDetails">Instructions</Label>
            <Textarea
              id="additionalDetails"
              name="additionalDetails"
              value={formData.additionalDetails}
              onChange={handleInputChange}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default PreparationHubTable;
