const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        imageUrl: {
            type: String,
            required: function() {
                return !this.youtubeUrl; // imageUrl is required if no youtubeUrl
            }
        },
        youtubeUrl: {
            type: String,
            trim: true
        },
        link: {
            type: String,
            trim: true
        },
        position: {
            type: String,
            enum: ['hero', 'flash_sale', 'promo', 'footer'],
            default: 'hero'
        },
        order: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
