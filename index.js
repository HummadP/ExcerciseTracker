const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bodyParser = require('body-parser');
require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

async function main() {
    try {
        await mongoose.connect(process.env.DB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
    }
}

main();

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    exercises: [{
        description: String,
        duration: Number,
        date: Date
    }]
}, { versionKey: false });

const User = mongoose.model('User', userSchema);

const ERROR = { error: "There was an error while processing your request." };

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json(ERROR);
    }
});

app.get('/api/users/:id/logs', async (req, res) => {
    const id = req.params.id;
    const dateFrom = req.query.from ? new Date(req.query.from) : new Date(0);
    const dateTo = req.query.to ? new Date(req.query.to) : new Date();
    const limit = parseInt(req.query.limit, 10) || 0;

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let log = user.exercises.filter(exercise => {
            const exerciseDate = new Date(exercise.date).getTime();
            return exerciseDate >= dateFrom.getTime() && exerciseDate <= dateTo.getTime();
        }).map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: new Date(exercise.date).toDateString()
        }));

        if (limit > 0) log = log.slice(0, limit);

        res.json({
            _id: user._id,
            username: user.username,
            count: log.length,
            log: log
        });
    } catch (err) {
        res.status(500).json(ERROR);
    }
});

app.post('/api/users', async (req, res) => {
    const username = req.body.username;
    try {
        const newUser = await User.create({ username });
        res.json({ _id: newUser._id, username: newUser.username });
    } catch (err) {
        res.status(500).json(ERROR);
    }
});

app.post('/api/users/:id/exercises', async (req, res) => {
    const id = req.params.id;
    let { description, duration, date } = req.body;

    const newExercise = {
        description,
        duration,
        date: date ? new Date(date) : new Date()
    };

    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.exercises.push(newExercise);
        const updatedUser = await user.save();

        const addedExercise = updatedUser.exercises[updatedUser.exercises.length - 1];
        res.json({
            username: updatedUser.username,
            description: addedExercise.description,
            duration: addedExercise.duration,
            date: new Date(addedExercise.date).toDateString(),
            _id: updatedUser._id
        });
    } catch (err) {
        res.status(500).json(ERROR);
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
