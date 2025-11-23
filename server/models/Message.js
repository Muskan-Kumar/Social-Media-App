import mongoose from 'mongoose';
import { User } from './User.js';

const messageSchema = new mongoose.Schema({
    from_user_id: {
        type: String,
        ref: User, 
        required: true
    },

    to_user_id: {
        type: String,
        ref: User, 
        required: true
    },

    text: {
        type: String,
        trim: true
    },

    message_type: {
        type: String,
        enum: ['text', 'image']
    },

    media_url: {
        type: String
    },

    seen: {
        type: boolean,
        default: false
    }
}, {timestamps: true, minimize: false});

export const Message = mongoose.model('Message', messageSchema);