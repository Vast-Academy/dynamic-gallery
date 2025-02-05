const express = require('express');
const router = express.Router();
const Event = require('../models/EventModal');
const cloudinary = require('../config/cloudinary');
const upload = require('../middleware/upload');
const fs = require('fs');

// Post event
router.post('/', upload.array('images', 10), async (req, res) => {
    try {
        const { title, date } = req.body;
        const eventDate = new Date(date);
        
        const uploadPromises = req.files.map(file => 
            cloudinary.uploader.upload(file.path)
                .then(result => {
                    fs.unlink(file.path, err => {
                        if (err) console.error('Error deleting file:', err);
                    });
                    return result;
                })
        );

        const uploadedImages = await Promise.all(uploadPromises);
        const images = uploadedImages.map((img, index) => ({
            url: img.secure_url,
            public_id: img.public_id,
            caption: req.body.captions?.[index] || ''
        }));

        const event = new Event({
            title,
            date: eventDate,
            month: eventDate.toLocaleString('default', { month: 'long' }),
            year: eventDate.getFullYear(),
            images
        });

        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all events
router.get('/', async (req, res) => {
    try {
        const { type } = req.query;
        const query = type && type !== 'all' ? { title: type } : {};
        const events = await Event.find(query).sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get event types
router.get('/types', async (req, res) => {
    try {
        const events = await Event.distinct('title');
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;