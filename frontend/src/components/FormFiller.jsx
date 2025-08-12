import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const API_BASE_URL = 'http://localhost:5001';

const Button = ({ onClick, children, className = '', type = 'button', disabled = false }) => (
    <button onClick={onClick} type={type} disabled={disabled} className={`bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}>
        {children}
    </button>
);



function Droppable({ id, children, className, title }) {
    const { setNodeRef } = useSortable({ id });
    return (
        <div ref={setNodeRef} className={`p-4 rounded-lg min-h-[200px] flex flex-col ${className}`}>
            <h4 className="font-bold mb-2 text-center">{title}</h4>
            <div className="flex-grow space-y-2">
                {children}
            </div>
        </div>
    );
}

function Draggable({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-3 bg-white rounded-lg shadow cursor-grab">
            {children}
        </div>
    );
}


// --- Question-Specific Filler Components ---

const CategorizeFiller = ({ question, answer, setAnswer }) => {
 
    const initialItems = question.items.map(item => ({ text: item.text, id: item._id }));


    const [containers, setContainers] = useState(() => {
        const initial = { unassigned: initialItems };
        question.categories.forEach(cat => {
            initial[cat] = [];
        });
        return initial;
    });
    
    const [activeId, setActiveId] = useState(null);
    const sensors = useSensors(useSensor(PointerSensor));

    useEffect(() => {
    
        const finalAnswers = {};
        Object.keys(containers).forEach(category => {
            if (category !== 'unassigned') {
                containers[category].forEach(item => {
                    finalAnswers[item.text] = category;
                });
            }
        });
        setAnswer(finalAnswers);
    }, [containers, setAnswer]);

    function findContainer(id) {
        if (id in containers) {
            return id;
        }
        return Object.keys(containers).find((key) => containers[key].some(item => item.id === id));
    }

    function handleDragStart(event) {
        setActiveId(event.active.id);
    }

    function handleDragOver(event) {
        const { active, over, draggingRect } = event;
        const { id } = active;
        const { id: overId } = over;

        const activeContainer = findContainer(id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setContainers((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex(item => item.id === id);
            const overIndex = overItems.findIndex(item => item.id === overId);

            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length;
            } else {
                newIndex = overIndex;
            }
            
            const newContainers = { ...prev };
            newContainers[activeContainer] = activeItems.filter(item => item.id !== active.id);
            newContainers[overContainer] = [
                ...overItems.slice(0, newIndex),
                activeItems[activeIndex],
                ...overItems.slice(newIndex, overItems.length)
            ];
            return newContainers;
        });
    }
    
    function handleDragEnd(event) {
        setActiveId(null);
    }
    
    const activeItem = activeId ? initialItems.find(item => item.id === activeId) : null;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SortableContext items={Object.keys(containers)}>
                
                    <Droppable id="unassigned" title="Items to Categorize" className="bg-gray-100 border-2 border-dashed">
                        <SortableContext items={containers.unassigned.map(i => i.id)}>
                            {containers.unassigned.map(item => <Draggable key={item.id} id={item.id}>{item.text}</Draggable>)}
                        </SortableContext>
                    </Droppable>

                    {question.categories.map(cat => (
                        <Droppable key={cat} id={cat} title={cat} className="bg-blue-50 border-blue-200 border">
                             <SortableContext items={containers[cat].map(i => i.id)}>
                                {containers[cat].map(item => <Draggable key={item.id} id={item.id}>{item.text}</Draggable>)}
                            </SortableContext>
                        </Droppable>
                    ))}
                </SortableContext>
            </div>
             <DragOverlay>
                {activeId ? <div className="p-3 bg-yellow-300 rounded-lg shadow-xl cursor-grabbing">{activeItem?.text}</div> : null}
            </DragOverlay>
        </DndContext>
    );
};

const ClozeFiller = ({ question, answer, setAnswer }) => {
    const sentenceParts = question.sentence.split('__');
    const blanksCount = sentenceParts.length - 1;

    const handleSelectChange = (e, blankIndex) => {
        const newAnswers = [...(answer || Array(blanksCount).fill(''))];
        newAnswers[blankIndex] = e.target.value;
        setAnswer(newAnswers);
    };

    return (
        <div>
            <div className="p-6 bg-gray-100 rounded-lg text-xl leading-loose text-center flex flex-wrap items-center justify-center">
                {sentenceParts.map((part, index) => (
                    <React.Fragment key={index}>
                        <span>{part}</span>
                        {index < blanksCount && (
                            <select
                                className="inline-block border border-gray-300 rounded-md mx-2 p-2"
                                value={(answer || [])[index] || ''}
                                onChange={(e) => handleSelectChange(e, index)}
                            >
                                <option value="" disabled>Select...</option>
                                {question.options.map((opt, optIndex) => (
                                    <option key={optIndex} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};


const ComprehensionFiller = ({ question, answer, setAnswer }) => {
    const handleOptionChange = (mcqIndex, option) => {
        const newAnswers = [...(answer || [])];
        newAnswers[mcqIndex] = option;
        setAnswer(newAnswers);
    };

    return (
        <div>
            <div className="p-6 bg-gray-100 rounded-lg whitespace-pre-wrap mb-6 prose max-w-none">
                {question.passage}
            </div>
            {question.mcqs.map((mcq, index) => (
                <div key={mcq._id} className="mb-4">
                    <p className="font-semibold mb-2">{index + 1}. {mcq.question}</p>
                    <div className="space-y-2">
                        {mcq.options.map((option, optIndex) => (
                            <label key={optIndex} className="flex items-center p-3 bg-white rounded-lg border has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 cursor-pointer transition-colors">
                                <input
                                    type="radio"
                                    name={`mcq-${mcq._id}`}
                                    value={option}
                                    checked={(answer || [])[index] === option}
                                    onChange={() => handleOptionChange(index, option)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="ml-3 text-gray-700">{option}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- Main Form Filler Component ---
export default function FormFiller() {
    const { formId } = useParams();
    const [form, setForm] = useState(null);
    const [answers, setAnswers] = useState({});
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/forms/${formId}`)
            .then(response => {
                setForm(response.data);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error fetching form:", error);
                setStatus({ message: "Form not found or could not be loaded.", type: 'error' });
                setIsLoading(false);
            });
    }, [formId]);

    const setAnswerForQuestion = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const responsePayload = {
            formId,
            answers: Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                answer
            }))
        };

        try {
            await axios.post(`${API_BASE_URL}/api/responses`, responsePayload);
            setStatus({ message: 'Your response has been submitted successfully!', type: 'success' });
        } catch (error) {
            setStatus({ message: 'Failed to submit response. Please try again.', type: 'error' });
        }
    };
    
    if (isLoading) return <div className="text-center p-10 text-xl font-semibold">Loading form...</div>;
    if (!form) return <div className="text-center p-10 text-red-500 text-xl">{status.message}</div>;
    if (status.type === 'success') return <div className="text-center p-10 text-2xl text-green-600 font-bold">{status.message}</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <form onSubmit={handleSubmit}>
                <header className="text-center mb-10">
                    {form.headerImageUrl && <img src={form.headerImageUrl} alt="Form Header" className="max-w-full md:max-w-2xl mx-auto rounded-lg shadow-lg mb-6" />}
                    <h1 className="text-5xl font-bold text-gray-800">{form.title}</h1>
                </header>

                <div className="space-y-12">
                    {form.questions.map((q, index) => (
                        <div key={q._id} className="p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-6">
                                <span className="text-gray-400 mr-2">Question {index + 1}:</span> {q.questionText}
                            </h3>
                            {q.questionType === 'Categorize' && <CategorizeFiller question={q} answer={answers[q._id]} setAnswer={(ans) => setAnswerForQuestion(q._id, ans)} />}
                            {q.questionType === 'Cloze' && <ClozeFiller question={q} answer={answers[q._id]} setAnswer={(ans) => setAnswerForQuestion(q._id, ans)} />}
                            {q.questionType === 'Comprehension' && <ComprehensionFiller question={q} answer={answers[q._id]} setAnswer={(ans) => setAnswerForQuestion(q._id, ans)} />}
                        </div>
                    ))}
                </div>

                {status.message && status.type === 'error' && (
                    <div className="mt-6 p-4 text-center rounded-md bg-red-100 text-red-800">
                        {status.message}
                    </div>
                )}

                <div className="mt-10 text-center">
                    <Button type="submit">Submit Response</Button>
                </div>
            </form>
        </div>
    );
}
