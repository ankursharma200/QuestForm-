    import React, { useState, useEffect } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
    import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
    import { CSS } from '@dnd-kit/utilities';
    import { v4 as uuidv4 } from 'uuid';
    import axios from 'axios';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

 
    const Button = ({ onClick, children, className = '', type = 'button' }) => (
        <button onClick={onClick} type={type} className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 ${className}`}>
            {children}
        </button>
    );

    const Input = ({ value, onChange, placeholder, className = '' }) => (
        <input type="text" value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${className}`} />
    );

    const Textarea = ({ value, onChange, placeholder, className = '' }) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className={`w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${className}`} rows="4" />
    );

    const CategorizeEditor = ({ question, updateQuestion }) => {
        const handleCategoryChange = (index, value) => {
            const newCategories = [...question.categories];
            newCategories[index] = value;
            updateQuestion({ ...question, categories: newCategories });
        };

        const addCategory = () => updateQuestion({ ...question, categories: [...question.categories, ''] });

        const handleItemChange = (index, field, value) => {
            const newItems = [...question.items];
            newItems[index] = { ...newItems[index], [field]: value };
            updateQuestion({ ...question, items: newItems });
        };

        const addItem = () => updateQuestion({ ...question, items: [...question.items, { text: '', category: question.categories[0] || '' }] });

        return (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <div>
                    <h4 className="font-semibold mb-2 text-gray-700">Categories</h4>
                    {question.categories.map((cat, index) => (
                        <Input key={index} value={cat} onChange={(e) => handleCategoryChange(index, e.target.value)} placeholder={`Category ${index + 1}`} className="mb-2" />
                    ))}
                    <Button onClick={addCategory}>+ Add Category</Button>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-gray-700">Items & Correct Assignment</h4>
                    {question.items.map((item, index) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                            <Input value={item.text} onChange={(e) => handleItemChange(index, 'text', e.target.value)} placeholder="Item Name" />
                            <select value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} className="p-3 border border-gray-300 rounded-lg">
                                <option value="">Select Category</option>
                                {question.categories.filter(c => c.trim() !== '').map((cat, catIndex) => (
                                    <option key={catIndex} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                    <Button onClick={addItem}>+ Add Item</Button>
                </div>
            </div>
        );
    };

    const ClozeEditor = ({ question, updateQuestion }) => (
        <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            <Textarea value={question.sentence} onChange={(e) => updateQuestion({ ...question, sentence: e.target.value })} placeholder="Type sentence. Use __ (two underscores) for each blank." />
            <div>
                <h4 className="font-semibold mb-2 text-gray-700">Options (will appear below the sentence)</h4>
                {question.options.map((opt, index) => (
                    <Input key={index} value={opt} onChange={(e) => { const newOptions = [...question.options]; newOptions[index] = e.target.value; updateQuestion({ ...question, options: newOptions }); }} placeholder={`Option ${index + 1}`} className="mb-2" />
                ))}
                <Button onClick={() => updateQuestion({ ...question, options: [...question.options, ''] })}>+ Add Option</Button>
            </div>
        </div>
    );

    const ComprehensionEditor = ({ question, updateQuestion }) => {
        const handleMcqChange = (mcqIndex, field, value) => {
            const newMcqs = [...question.mcqs];
            newMcqs[mcqIndex] = { ...newMcqs[mcqIndex], [field]: value };
            updateQuestion({ ...question, mcqs: newMcqs });
        };
        const handleMcqOptionChange = (mcqIndex, optionIndex, value) => {
            const newMcqs = [...question.mcqs];
            newMcqs[mcqIndex].options[optionIndex] = value;
            updateQuestion({ ...question, mcqs: newMcqs });
        };
        const addMcq = () => updateQuestion({ ...question, mcqs: [...question.mcqs, { question: '', options: ['', ''], correctAnswer: '' }] });

        return (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                <Textarea value={question.passage} onChange={(e) => updateQuestion({ ...question, passage: e.target.value })} placeholder="Enter the comprehension passage here." />
                <h4 className="font-semibold mt-4 text-gray-700">Multiple Choice Questions</h4>
                {question.mcqs.map((mcq, mcqIndex) => (
                    <div key={mcqIndex} className="p-4 border rounded-lg bg-white space-y-2">
                        <Input value={mcq.question} onChange={(e) => handleMcqChange(mcqIndex, 'question', e.target.value)} placeholder={`MCQ ${mcqIndex + 1}`} />
                        {mcq.options.map((opt, optIndex) => (
                            <Input key={optIndex} value={opt} onChange={(e) => handleMcqOptionChange(mcqIndex, optIndex, e.target.value)} placeholder={`Option ${optIndex + 1}`} />
                        ))}
                    </div>
                ))}
                <Button onClick={addMcq}>+ Add MCQ</Button>
            </div>
        );
    };

    const SortableQuestion = ({ id, question, updateQuestion, deleteQuestion }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
        const style = { transform: CSS.Transform.toString(transform), transition };

        const renderQuestionEditor = () => {
            const props = { question, updateQuestion };
            switch (question.questionType) {
                case 'Categorize': return <CategorizeEditor {...props} />;
                case 'Cloze': return <ClozeEditor {...props} />;
                case 'Comprehension': return <ComprehensionEditor {...props} />;
                default: return null;
            }
        };

        return (
            <div ref={setNodeRef} style={style} {...attributes} className="mb-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-bold text-lg">{question.questionType}</span>
                    <div>
                        <button {...listeners} className="cursor-move p-2 text-gray-400 hover:text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg></button>
                        <button onClick={() => deleteQuestion(id)} className="p-2 text-red-400 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
                <Input value={question.questionText} onChange={(e) => updateQuestion({ ...question, questionText: e.target.value })} placeholder="Enter your question prompt here (e.g., 'Categorize these items')" className="mb-4 text-xl font-semibold" />
                {renderQuestionEditor()}
            </div>
        );
    };

    export default function FormEditor() {
        const { formId } = useParams(); 
        const navigate = useNavigate();
        const [title, setTitle] = useState('');
        const [headerImageUrl, setHeaderImageUrl] = useState('');
        const [questions, setQuestions] = useState([]);
        const [status, setStatus] = useState({ message: '', type: '' });

        useEffect(() => {
            if (formId) {
                axios.get(`${API_BASE_URL}/api/forms/${formId}`)
                    .then(response => {
                        const { title, headerImageUrl, questions: fetchedQuestions } = response.data;
                        setTitle(title);
                        setHeaderImageUrl(headerImageUrl || '');
                        setQuestions(fetchedQuestions.map(q => ({ ...q, id: uuidv4() })));
                    })
                    .catch(error => {
                        console.error("Error fetching form:", error);
                        setStatus({ message: "Could not load form.", type: 'error' });
                    });
            }
        }, [formId]);


        const sensors = useSensors(useSensor(PointerSensor));

        const addQuestion = (type) => {
            const newQuestion = {
                id: uuidv4(),
                questionText: '',
                questionType: type,
                ...(type === 'Categorize' && { categories: ['Category 1'], items: [] }),
                ...(type === 'Cloze' && { sentence: '', options: [] }),
                ...(type === 'Comprehension' && { passage: '', mcqs: [] }),
            };
            setQuestions([...questions, newQuestion]);
        };

        const updateQuestion = (id, updatedData) => {
            setQuestions(questions.map(q => (q.id === id ? { ...q, ...updatedData } : q)));
        };

        const deleteQuestion = (id) => setQuestions(questions.filter(q => q.id !== id));

        const handleDragEnd = (event) => {
            const { active, over } = event;
            if (active.id !== over.id) {
                setQuestions((items) => {
                    const oldIndex = items.findIndex(item => item.id === active.id);
                    const newIndex = items.findIndex(item => item.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
        };

        const saveForm = async () => {
            if (!title.trim()) {
                setStatus({ message: 'Form title is required.', type: 'error' });
                return;
            }
    
            const formPayload = { title, headerImageUrl, questions: questions.map(({ id, ...rest }) => rest) };

            try {
                const response = formId
                    ? await axios.put(`${API_BASE_URL}/api/forms/${formId}`, formPayload)
                    : await axios.post(`${API_BASE_URL}/api/forms`, formPayload);

                setStatus({ message: response.data.message, type: 'success' });
                if (!formId) {
                    navigate(`/edit/${response.data.formId}`, { replace: true });
                }
            } catch (error) {
                setStatus({ message: 'Failed to save form.', type: 'error' });
            }
        };

        return (
            <div className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Form Editor</h1>
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                        {formId && <a href={`/fill/${formId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Preview Form</a>}
                        <Button onClick={saveForm}>{formId ? 'Update Form' : 'Save Form'}</Button>
                    </div>
                </header>

                {status.message && (
                    <div className={`p-4 mb-4 rounded-md ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {status.message}
                    </div>
                )}

                <div className="bg-white p-8 rounded-xl shadow-md mb-8">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Awesome Form Title" className="text-3xl font-bold border-transparent focus:border-gray-300 p-2 -ml-2" />
                    <Input value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} placeholder="Optional: Paste Header Image URL here" className="mt-4" />
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        {questions.map(q => (
                            <SortableQuestion key={q.id} id={q.id} question={q} updateQuestion={(data) => updateQuestion(q.id, data)} deleteQuestion={deleteQuestion} />
                        ))}
                    </SortableContext>
                </DndContext>

                <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Add New Question</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button onClick={() => addQuestion('Categorize')}>Categorize</Button>
                        <Button onClick={() => addQuestion('Cloze')}>Cloze</Button>
                        <Button onClick={() => addQuestion('Comprehension')}>Comprehension</Button>
                    </div>
                </div>
            </div>
        );
    }
    