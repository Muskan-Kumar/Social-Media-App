import fs from "fs";
import imageKit from "../configs/imageKit";
import { Story } from "../models/Story";


// Add user story
export const addUserStory = async(req, res) =>{
    try {
        const {userId} = req.auth();
        const {content, media_type, background_color} = req.body;
        const media = req.file;
        let media_url = '';

        // upload media to imageKit
        if(media_type == 'image' || media_type == 'video'){
            const fileBuffer = fs.readFileSync(media.path);
            const response = await imageKit.upload({
                file: fileBuffer,
                fileName: media.originalname,
            })
            media_url = response.url;
        }
        // create story
        const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
        });

        res.json({success: true});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

