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
        
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: 'auto' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                
                stream.end(file.buffer);
            });
        });

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

// Delete a single image from an event
router.delete('/images/:eventId/:imageId', async (req, res) => {
    try {
        const { eventId, imageId } = req.params;
        
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Find the image index in the event's images array
        const imageIndex = event.images.findIndex(img => img._id.toString() === imageId);
        
        if (imageIndex === -1) {
            return res.status(404).json({ error: 'Image not found in event' });
        }
        
        // Get image public_id before removing it
        const publicId = event.images[imageIndex].public_id;
        
        // Delete from Cloudinary if public_id exists
        if (publicId) {
            try {
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error('Cloudinary delete error:', cloudinaryError);
                // Continue with database deletion even if Cloudinary fails
            }
        }
        
        // Remove the image from the array
        event.images.splice(imageIndex, 1);
        
        // Save the updated event
        await event.save();
        
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete an entire event with all its images
router.delete('/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        
        // Find the event
        const event = await Event.findById(eventId);
        
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        // Delete all images from Cloudinary
        const deletePromises = event.images.map(image => 
            cloudinary.uploader.destroy(image.public_id)
        );
        
        await Promise.all(deletePromises);
        
        // Delete the event from the database
        await Event.findByIdAndDelete(eventId);
        
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
