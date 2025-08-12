const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));


const mcqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String } 
});


const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    questionType: {
        type: String,
        required: true,
        enum: ['Categorize', 'Cloze', 'Comprehension']
    },
    imageUrl: { type: String }, 
    
  
    categories: [{ type: String }],
    items: [{
        text: String,
        category: String 
    }],

 
    sentence: { type: String },
    options: [{ type: String }],

    
    passage: { type: String },
    mcqs: [mcqSchema]
});


const formSchema = new mongoose.Schema({
    title: { type: String, required: true },
    headerImageUrl: { type: String },
    questions: [questionSchema],
    createdBy: { type: String, default: 'anonymous' },
    createdAt: { type: Date, default: Date.now }
});

const responseSchema = new mongoose.Schema({
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    submittedAt: { type: Date, default: Date.now },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        answer: mongoose.Schema.Types.Mixed 
    }]
});

const Form = mongoose.model('Form', formSchema);
const Response = mongoose.model('Response', responseSchema);

app.post('/api/forms', async (req, res) => {
    try {
        const form = new Form(req.body);
        await form.save();
        res.status(201).json({ message: 'Form created successfully!', formId: form._id });
    } catch (error) {
        res.status(400).json({ message: 'Error creating form', error });
    }
});

app.get('/api/forms/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) {
            return res.status(404).json({ message: 'Form not found' });
        }
        res.status(200).json(form);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching form', error });
    }
});


app.put('/api/forms/:id', async (req, res) => {
    try {
        const updatedForm = await Form.findByIdAndUpdate(req.params.id, req.body, { new: true });
         if (!updatedForm) {
            return res.status(404).json({ message: 'Form not found' });
        }
        res.status(200).json({ message: 'Form updated successfully!', form: updatedForm });
    } catch (error) {
        res.status(400).json({ message: 'Error updating form', error });
    }
});


app.post('/api/responses', async (req, res) => {
    try {
        const formExists = await Form.findById(req.body.formId);
        if (!formExists) {
            return res.status(404).json({ message: 'Cannot submit to a form that does not exist.' });
        }
        const response = new Response(req.body);
        await response.save();
        res.status(201).json({ message: 'Response submitted successfully!' });
    } catch (error) {
        res.status(400).json({ message: 'Error submitting response', error });
    }
});



app.get('/api/responses/form/:formId', async (req, res) => {
    try {
        const responses = await Response.find({ formId: req.params.formId });
        res.status(200).json(responses);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching responses', error });
    }
});



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});