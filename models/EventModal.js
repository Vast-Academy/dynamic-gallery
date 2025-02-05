const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    url: String,
    public_id: String,
    caption: String
});

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    images: [imageSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const eventModal = mongoose.model('Event', eventSchema);

module.exports = eventModal